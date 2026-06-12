// Manutenção do banco via Firebase Admin.
// Requer ./service-account.json (gitignored) na raiz do projeto.
//
// Uso:
//   node scripts/db-maintenance.mjs list
//   node scripts/db-maintenance.mjs delete <gameId> [<gameId> ...]
//   $env:FOOTBALL_DATA_TOKEN="..."; node scripts/db-maintenance.mjs audit
//   $env:FOOTBALL_DATA_TOKEN="..."; node scripts/db-maintenance.mjs fix
import { readFileSync } from 'node:fs';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = JSON.parse(readFileSync(new URL('../service-account.json', import.meta.url), 'utf8'));
const appletConfig = JSON.parse(readFileSync(new URL('../firebase-applet-config.json', import.meta.url), 'utf8'));

const app = initializeApp({ credential: cert(serviceAccount) });
const db = appletConfig.firestoreDatabaseId
  ? getFirestore(app, appletConfig.firestoreDatabaseId)
  : getFirestore(app);

const BRT = 'America/Sao_Paulo';
const fmt = ts => new Date(ts).toLocaleString('pt-BR', { timeZone: BRT });

const [, , command, ...args] = process.argv;

if (command === 'list') {
  const snap = await db.collection('games').orderBy('matchDate', 'asc').get();
  console.log(`${snap.size} jogo(s):\n`);
  for (const d of snap.docs) {
    const g = d.data();
    const score = g.status === 'finished' ? ` | placar: ${g.homeScoreOfficial} x ${g.awayScoreOfficial}` : '';
    console.log(`- [${d.id}]\n  ${g.homeTeamName} x ${g.awayTeamName} | ${g.phase} | ${fmt(g.matchDate)} (BRT) | status: ${g.status}${score}`);
  }
} else if (command === 'delete') {
  if (args.length === 0) {
    console.error('Informe ao menos um gameId.');
    process.exit(1);
  }
  for (const gameId of args) {
    const gameRef = db.collection('games').doc(gameId);
    const gameSnap = await gameRef.get();
    if (!gameSnap.exists) {
      console.log(`- ${gameId}: não encontrado, pulando.`);
      continue;
    }
    const g = gameSnap.data();
    const guesses = await db.collection('guesses').where('gameId', '==', gameId).get();
    const batch = db.batch();
    guesses.docs.forEach(doc => batch.delete(doc.ref));
    batch.delete(gameRef);
    await batch.commit();
    console.log(`- ${gameId}: excluído (${g.homeTeamName} x ${g.awayTeamName}, ${guesses.size} palpite(s) removido(s)).`);
  }
} else if (command === 'audit' || command === 'fix') {
  const applyFixes = command === 'fix';
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) {
    console.error('Defina FOOTBALL_DATA_TOKEN no ambiente.');
    process.exit(1);
  }

  const normalize = s => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
  const PT_EN = {
    'mexico': ['mexico'], 'africa do sul': ['south africa'],
    'coreia do sul': ['south korea', 'korea republic'],
    'tchequia': ['czechia', 'czech republic'], 'republica tcheca': ['czechia', 'czech republic'],
    'canada': ['canada'], 'bosnia e herzegovina': ['bosnia and herzegovina', 'bosnia-herzegovina', 'bosnia'],
    'catar': ['qatar'], 'suica': ['switzerland'], 'brasil': ['brazil'], 'haiti': ['haiti'],
    'marrocos': ['morocco'], 'escocia': ['scotland'], 'eua': ['united states', 'usa', 'united states of america'],
    'estados unidos': ['united states', 'usa'], 'australia': ['australia'], 'paraguai': ['paraguay'],
    'turquia': ['turkiye', 'turkey'], 'alemanha': ['germany'], 'curacao': ['curacao'],
    'equador': ['ecuador'], 'costa do marfim': ['ivory coast', 'cote d’ivoire', 'cote divoire'],
    'holanda': ['netherlands'], 'japao': ['japan'], 'suecia': ['sweden'], 'tunisia': ['tunisia'],
    'belgica': ['belgium'], 'egito': ['egypt'], 'ira': ['iran', 'ir iran'],
    'nova zelandia': ['new zealand'], 'espanha': ['spain'], 'cabo verde': ['cape verde', 'cabo verde'],
    'arabia saudita': ['saudi arabia'], 'uruguai': ['uruguay'], 'franca': ['france'],
    'iraque': ['iraq'], 'noruega': ['norway'], 'senegal': ['senegal'], 'argentina': ['argentina'],
    'argelia': ['algeria'], 'austria': ['austria'], 'jordania': ['jordan'], 'portugal': ['portugal'],
    'colombia': ['colombia'], 'rd congo': ['dr congo', 'congo dr', 'democratic republic of the congo'],
    'uzbequistao': ['uzbekistan'], 'croacia': ['croatia'], 'inglaterra': ['england'],
    'gana': ['ghana'], 'panama': ['panama'],
  };
  const candidates = pt => { const n = normalize(pt); return [n, ...(PT_EN[n] ?? [])]; };
  const matchesTeam = (apiTeam, ptName) => {
    const names = [apiTeam.name, apiTeam.shortName].filter(Boolean).map(normalize);
    return candidates(ptName).some(c => names.includes(c));
  };

  const res = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
    headers: { 'X-Auth-Token': token },
  });
  if (!res.ok) {
    console.error(`football-data.org respondeu ${res.status}: ${await res.text()}`);
    process.exit(1);
  }
  const { matches } = await res.json();
  console.log(`API: ${matches.length} partidas da Copa.\n`);

  const snap = await db.collection('games').orderBy('matchDate', 'asc').get();
  let ok = 0;
  const problems = [];

  for (const d of snap.docs) {
    const g = d.data();
    const label = `${g.homeTeamName} x ${g.awayTeamName} (${g.phase}, ${fmt(g.matchDate)})`;
    const direct = matches.find(m => matchesTeam(m.homeTeam, g.homeTeamName) && matchesTeam(m.awayTeam, g.awayTeamName));
    const swapped = direct ? null : matches.find(m => matchesTeam(m.homeTeam, g.awayTeamName) && matchesTeam(m.awayTeam, g.homeTeamName));
    const m = direct ?? swapped;

    if (!m) {
      problems.push(`NÃO ENCONTRADO na API: ${label} [${d.id}]`);
      continue;
    }
    const apiTs = new Date(m.utcDate).getTime();
    // football-data: group "GROUP_A" + matchday 1..3 → "Grupo A - Rodada 1"
    const officialPhase = m.group && m.matchday
      ? `Grupo ${m.group.replace(/^GROUP[_ ]/i, '')} - Rodada ${m.matchday}`
      : g.phase;

    const issues = [];
    if (swapped) issues.push('mandante/visitante invertidos');
    if (apiTs !== g.matchDate) issues.push(`horário difere — oficial: ${fmt(apiTs)} (BRT)`);
    if (officialPhase !== g.phase) issues.push(`fase oficial: ${officialPhase}`);

    if (issues.length === 0) {
      ok++;
      continue;
    }

    if (!applyFixes) {
      problems.push(`DIVERGENTE: ${label} [${d.id}] → ${issues.join('; ')}`);
      continue;
    }

    const update = { matchDate: apiTs, phase: officialPhase, updatedAt: new Date().toISOString() };
    if (swapped) {
      update.homeTeamName = g.awayTeamName;
      update.awayTeamName = g.homeTeamName;
      update.homeFlagUrl = g.awayFlagUrl ?? '';
      update.awayFlagUrl = g.homeFlagUrl ?? '';
    }
    await d.ref.update(update);
    problems.push(`CORRIGIDO: ${label} [${d.id}] → ${issues.join('; ')}`);
  }

  console.log(`OK: ${ok}/${snap.size}`);
  if (problems.length) {
    console.log(`\n${applyFixes ? 'Corrigidos' : 'Problemas'} (${problems.length}):`);
    problems.forEach(p => console.log(`- ${p}`));
  }
} else {
  console.error('Comando inválido. Use: list | delete <gameId...> | audit');
  process.exit(1);
}
