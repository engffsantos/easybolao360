import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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

