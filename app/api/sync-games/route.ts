import { NextRequest, NextResponse } from 'next/server';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { Firestore, getFirestore } from 'firebase-admin/firestore';
import { calculatePoints } from '@/lib/utils';
import jsonConfig from '../../../firebase-applet-config.json';

export const dynamic = 'force-dynamic';

// Tempo após o kickoff a partir do qual tentamos buscar o resultado final
// (90min + intervalo + acréscimos, com folga).
const MATCH_END_GRACE_MS = 150 * 60 * 1000;

// Nomes em português (como cadastrados no app) → nomes usados pela football-data.org.
const TEAM_NAMES_EN: Record<string, string[]> = {
  'mexico': ['mexico'],
  'africa do sul': ['south africa'],
  'coreia do sul': ['south korea', 'korea republic'],
  'tchequia': ['czechia', 'czech republic'],
  'republica tcheca': ['czechia', 'czech republic'],
  'eua': ['united states', 'usa', 'united states of america'],
  'iraque': ['iraq'],
  'rd congo': ['dr congo', 'congo dr', 'democratic republic of the congo'],
  'bosnia e herzegovina': ['bosnia and herzegovina', 'bosnia-herzegovina', 'bosnia'],
  'brasil': ['brazil'],
  'alemanha': ['germany'],
  'argentina': ['argentina'],
  'franca': ['france'],
  'inglaterra': ['england'],
  'espanha': ['spain'],
  'portugal': ['portugal'],
  'italia': ['italy'],
  'holanda': ['netherlands'],
  'paises baixos': ['netherlands'],
  'belgica': ['belgium'],
  'croacia': ['croatia'],
  'uruguai': ['uruguay'],
  'colombia': ['colombia'],
  'equador': ['ecuador'],
  'paraguai': ['paraguay'],
  'chile': ['chile'],
  'peru': ['peru'],
  'estados unidos': ['united states', 'usa'],
  'canada': ['canada'],
  'japao': ['japan'],
  'australia': ['australia'],
  'ira': ['iran', 'ir iran'],
  'arabia saudita': ['saudi arabia'],
  'catar': ['qatar'],
  'marrocos': ['morocco'],
  'senegal': ['senegal'],
  'gana': ['ghana'],
  'camaroes': ['cameroon'],
  'nigeria': ['nigeria'],
  'egito': ['egypt'],
  'argelia': ['algeria'],
  'tunisia': ['tunisia'],
  'suica': ['switzerland'],
  'austria': ['austria'],
  'polonia': ['poland'],
  'dinamarca': ['denmark'],
  'noruega': ['norway'],
  'suecia': ['sweden'],
  'escocia': ['scotland'],
  'pais de gales': ['wales'],
  'irlanda': ['ireland', 'republic of ireland'],
  'servia': ['serbia'],
  'ucrania': ['ukraine'],
  'turquia': ['turkiye', 'turkey'],
  'grecia': ['greece'],
  'panama': ['panama'],
  'costa rica': ['costa rica'],
  'honduras': ['honduras'],
  'jamaica': ['jamaica'],
  'haiti': ['haiti'],
  'curacao': ['curacao'],
  'nova zelandia': ['new zealand'],
  'uzbequistao': ['uzbekistan'],
  'jordania': ['jordan'],
  'cabo verde': ['cape verde', 'cabo verde'],
  'costa do marfim': ['ivory coast', 'cote d’ivoire', 'cote divoire'],
};

interface GameDoc {
  id: string;
  homeTeamName: string;
  awayTeamName: string;
  matchDate: number;
  status: string;
}

interface ApiMatch {
  status: string;
  homeTeam: { name?: string; shortName?: string };
  awayTeam: { name?: string; shortName?: string };
  score: { fullTime: { home: number | null; away: number | null } };
}

function normalize(name: string): string {
  // Remove acentos (marcas diacríticas) e normaliza para minúsculas.
  return name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();
}

function teamCandidates(ptName: string): string[] {
  const norm = normalize(ptName);
  return [norm, ...(TEAM_NAMES_EN[norm] ?? [])];
}

function apiTeamMatches(apiTeam: ApiMatch['homeTeam'], ptName: string): boolean {
  const apiNames = [apiTeam.name, apiTeam.shortName].filter(Boolean).map(n => normalize(n as string));
  return teamCandidates(ptName).some(c => apiNames.includes(c));
}

function getDb(): Firestore {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccount) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY não configurada nas variáveis de ambiente.');
  }
  const app = getApps()[0] ?? initializeApp({ credential: cert(JSON.parse(serviceAccount)) });
  const databaseId = process.env.NEXT_PUBLIC_FIRESTORE_DATABASE_ID || jsonConfig.firestoreDatabaseId;
  return databaseId ? getFirestore(app, databaseId) : getFirestore(app);
}

async function fetchFinishedMatches(dates: number[]): Promise<ApiMatch[]> {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) return [];

  const min = Math.min(...dates);
  const max = Math.max(...dates);
  const dateFrom = new Date(min - 24 * 3600 * 1000).toISOString().slice(0, 10);
  const dateTo = new Date(max + 24 * 3600 * 1000).toISOString().slice(0, 10);

  const res = await fetch(
    `https://api.football-data.org/v4/competitions/WC/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`,
    { headers: { 'X-Auth-Token': token }, cache: 'no-store' }
  );
  if (!res.ok) {
    throw new Error(`football-data.org respondeu ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return (data.matches ?? []).filter((m: ApiMatch) => m.status === 'FINISHED');
}

/** Insere o resultado oficial, calcula pontos dos palpites e atualiza estatísticas dos usuários. */
async function finalizeGame(db: Firestore, gameId: string, homeScore: number, awayScore: number) {
  const now = new Date().toISOString();

  await db.collection('games').doc(gameId).update({
    homeScoreOfficial: homeScore,
    awayScoreOfficial: awayScore,
    status: 'finished',
    pointsCalculated: true,
    updatedAt: now,
  });

  const guessesSnap = await db.collection('guesses').where('gameId', '==', gameId).get();
  const userIds = new Set<string>();
  const guessBatch = db.batch();

  guessesSnap.docs.forEach(guessDoc => {
    const guess = guessDoc.data();
    const result = calculatePoints(guess.homeScoreGuess, guess.awayScoreGuess, homeScore, awayScore);
    guessBatch.update(guessDoc.ref, { ...result, calculated: true, updatedAt: now });
    userIds.add(guess.userId);
  });
  await guessBatch.commit();

  const statsBatch = db.batch();
  for (const userId of userIds) {
    const userGuessesSnap = await db
      .collection('guesses')
      .where('userId', '==', userId)
      .where('calculated', '==', true)
      .get();

    const stats = { totalPoints: 0, exactScoreHits: 0, resultHits: 0, goalHits: 0 };
    userGuessesSnap.docs.forEach(d => {
      const data = d.data();
      stats.totalPoints += data.points || 0;
      if (data.exactScoreHit) stats.exactScoreHits++;
      if (data.resultHit) stats.resultHits++;
      stats.goalHits += data.goalHits || 0;
    });

    statsBatch.update(db.collection('users').doc(userId), { ...stats, updatedAt: now });
  }
  await statsBatch.commit();
}

export async function GET(request: NextRequest) {
  // Se CRON_SECRET estiver configurado, exige o token (header do Vercel Cron ou ?key=).
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get('authorization');
    const key = request.nextUrl.searchParams.get('key');
    if (auth !== `Bearer ${secret}` && key !== secret) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    }
  }

  try {
    const db = getDb();
    const now = Date.now();
    const gamesSnap = await db.collection('games').get();
    const games = gamesSnap.docs.map(d => ({ id: d.id, ...d.data() })) as GameDoc[];

    // 1. Bloqueia palpites de jogos cujo horário já chegou.
    const toBlock = games.filter(g => g.status === 'scheduled' && g.matchDate <= now);
    if (toBlock.length > 0) {
      const batch = db.batch();
      toBlock.forEach(g =>
        batch.update(db.collection('games').doc(g.id), { status: 'blocked', updatedAt: new Date().toISOString() })
      );
      await batch.commit();
    }

    // 2. Busca resultados de jogos que provavelmente já terminaram.
    const awaitingResult = games.filter(
      g => g.status !== 'finished' && now >= g.matchDate + MATCH_END_GRACE_MS
    );

    const finalized: string[] = [];
    const pending: string[] = [];
    const apiConfigured = Boolean(process.env.FOOTBALL_DATA_TOKEN);

    if (awaitingResult.length > 0 && apiConfigured) {
      const finishedMatches = await fetchFinishedMatches(awaitingResult.map(g => g.matchDate));

      for (const game of awaitingResult) {
        const label = `${game.homeTeamName} x ${game.awayTeamName}`;
        const direct = finishedMatches.find(
          m => apiTeamMatches(m.homeTeam, game.homeTeamName) && apiTeamMatches(m.awayTeam, game.awayTeamName)
        );
        const inverted = direct
          ? null
          : finishedMatches.find(
              m => apiTeamMatches(m.homeTeam, game.awayTeamName) && apiTeamMatches(m.awayTeam, game.homeTeamName)
            );

        const match = direct ?? inverted;
        const home = direct ? match?.score.fullTime.home : match?.score.fullTime.away;
        const away = direct ? match?.score.fullTime.away : match?.score.fullTime.home;

        if (match && typeof home === 'number' && typeof away === 'number') {
          await finalizeGame(db, game.id, home, away);
          finalized.push(`${label}: ${home} x ${away}`);
        } else {
          pending.push(label);
        }
      }
    } else if (awaitingResult.length > 0) {
      pending.push(...awaitingResult.map(g => `${g.homeTeamName} x ${g.awayTeamName}`));
    }

    return NextResponse.json({
      blocked: toBlock.map(g => `${g.homeTeamName} x ${g.awayTeamName}`),
      finalized,
      pending,
      apiConfigured,
    });
  } catch (error) {
    console.error('sync-games error:', error);
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
