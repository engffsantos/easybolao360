import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Todas as datas do app são exibidas no horário de Brasília,
// independentemente do fuso do navegador.
export const BRT_TIME_ZONE = 'America/Sao_Paulo';

export function formatMatchDate(timestamp: number): string {
  const date = new Date(timestamp);
  const day = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: BRT_TIME_ZONE });
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: BRT_TIME_ZONE });
  return `${day} • ${time}`;
}

export function formatDateTimeBrt(timestamp: number): string {
  return new Date(timestamp).toLocaleString('pt-BR', { timeZone: BRT_TIME_ZONE });
}

export function formatDateBrt(date: string | number): string {
  return new Date(date).toLocaleDateString('pt-BR', { timeZone: BRT_TIME_ZONE });
}

/**
 * Converte o valor de um input datetime-local (YYYY-MM-DDTHH:mm),
 * interpretado como horário de Brasília, em timestamp UTC (ms).
 * O Brasil não adota horário de verão desde 2019, então o offset -03:00 é fixo.
 */
export function brtInputToTimestamp(value: string): number {
  return new Date(`${value}:00-03:00`).getTime();
}

export interface GuessCalculationResult {
  points: number;
  exactScoreHit: boolean;
  resultHit: boolean;
  goalHits: number;
}

export function calculatePoints(
  homeScoreGuess: number,
  awayScoreGuess: number,
  homeScoreOfficial: number,
  awayScoreOfficial: number
): GuessCalculationResult {
  const exactScoreHit = homeScoreGuess === homeScoreOfficial && awayScoreGuess === awayScoreOfficial;

  const guessOutcome = homeScoreGuess > awayScoreGuess ? 'home' : homeScoreGuess < awayScoreGuess ? 'away' : 'draw';
  const officialOutcome = homeScoreOfficial > awayScoreOfficial ? 'home' : homeScoreOfficial < awayScoreOfficial ? 'away' : 'draw';
  const resultHit = guessOutcome === officialOutcome;

  const homeGoalHit = homeScoreGuess === homeScoreOfficial;
  const awayGoalHit = awayScoreGuess === awayScoreOfficial;
  
  let goalHits = 0;
  if (homeGoalHit) goalHits++;
  if (awayGoalHit) goalHits++;

  let points = 0;
  if (exactScoreHit) {
    points = 25;
  } else if (resultHit) {
    if (homeGoalHit || awayGoalHit) {
      points = 18;
    } else {
      points = 10;
    }
  } else {
    if (homeGoalHit || awayGoalHit) {
      points = 4;
    } else {
      points = 0;
    }
  }

  return {
    points,
    exactScoreHit,
    resultHit,
    goalHits
  };
}

