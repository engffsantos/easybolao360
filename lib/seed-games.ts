import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { GameStatus } from './types';

interface SeedGame {
  /** ID determinístico para tornar o seed idempotente */
  id: string;
  homeTeamName: string;
  awayTeamName: string;
  homeFlagUrl: string;
  awayFlagUrl: string;
  phase: string;
  /** Horário UTC da partida */
  matchDateUtc: [year: number, monthIndex: number, day: number, hour: number, minute: number];
  status: GameStatus;
}

// Jogos de 11/06/2026 — abertura da Copa do Mundo 2026.
// México x África do Sul já iniciou (entra bloqueado para palpites).
const GAMES_2026_06_11: SeedGame[] = [
  {
    id: 'wc2026-20260611-mex-rsa',
    homeTeamName: 'México',
    awayTeamName: 'África do Sul',
    homeFlagUrl: 'https://flagcdn.com/w80/mx.png',
    awayFlagUrl: 'https://flagcdn.com/w80/za.png',
    phase: 'Grupo A',
    matchDateUtc: [2026, 5, 11, 19, 0], // 16h de Brasília
    status: 'blocked',
  },
  {
    id: 'wc2026-20260611-kor-cze',
    homeTeamName: 'Coreia do Sul',
    awayTeamName: 'Tchéquia',
    homeFlagUrl: 'https://flagcdn.com/w80/kr.png',
    awayFlagUrl: 'https://flagcdn.com/w80/cz.png',
    phase: 'Grupo A',
    matchDateUtc: [2026, 5, 12, 2, 0], // 23h de Brasília (11/06)
    status: 'scheduled',
  },
];

export interface SeedResult {
  created: number;
  skipped: number;
  updated: number;
}

export async function seedTodayGames(): Promise<SeedResult> {
  const result: SeedResult = { created: 0, skipped: 0, updated: 0 };

  for (const game of GAMES_2026_06_11) {
    const gameRef = doc(db, 'games', game.id);
    const existing = await getDoc(gameRef);
    if (existing.exists()) {
      // Corrige apenas a fase de docs já inseridos com valor antigo,
      // sem tocar em status, placar ou edições do admin.
      if (existing.data().phase !== game.phase) {
        await setDoc(gameRef, { phase: game.phase, updatedAt: new Date().toISOString() }, { merge: true });
        result.updated++;
      } else {
        result.skipped++;
      }
      continue;
    }

    const { id, matchDateUtc, ...data } = game;
    void id;
    await setDoc(gameRef, {
      ...data,
      homeTeamId: 'tbd',
      awayTeamId: 'tbd',
      matchDate: Date.UTC(...matchDateUtc),
      pointsCalculated: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    result.created++;
  }

  return result;
}
