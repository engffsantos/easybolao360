import {
  DocumentSnapshot,
  QueryDocumentSnapshot,
  addDoc,
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import { calculatePoints } from './utils';
import type {
  Game,
  GameStatus,
  GroupMemberProfile,
  GroupRole,
  GroupSummary,
  Group,
  Guess,
  UserProfile,
} from './types';

function snapToData<T>(snap: DocumentSnapshot | QueryDocumentSnapshot): T {
  return { id: snap.id, ...snap.data() } as T;
}

const nowIso = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Jogos
// ---------------------------------------------------------------------------

export async function fetchGames(direction: 'asc' | 'desc' = 'asc', max?: number): Promise<Game[]> {
  const constraints = [orderBy('matchDate', direction), ...(max ? [limit(max)] : [])];
  const snap = await getDocs(query(collection(db, 'games'), ...constraints));
  return snap.docs.map(d => snapToData<Game>(d));
}

export interface NewGameInput {
  homeTeamName: string;
  awayTeamName: string;
  homeFlagUrl?: string;
  awayFlagUrl?: string;
  phase: string;
  matchDate: number;
}

export async function createGame(input: NewGameInput): Promise<void> {
  await addDoc(collection(db, 'games'), {
    homeTeamId: 'tbd',
    awayTeamId: 'tbd',
    homeTeamName: input.homeTeamName,
    awayTeamName: input.awayTeamName,
    homeFlagUrl: input.homeFlagUrl || 'https://picsum.photos/seed/flag/64/64',
    awayFlagUrl: input.awayFlagUrl || 'https://picsum.photos/seed/flag/64/64',
    phase: input.phase,
    matchDate: input.matchDate,
    status: 'scheduled',
    pointsCalculated: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
}

export async function updateGameStatus(gameId: string, status: GameStatus): Promise<void> {
  await updateDoc(doc(db, 'games', gameId), { status, updatedAt: nowIso() });
}

export async function updateGame(gameId: string, input: NewGameInput): Promise<void> {
  await updateDoc(doc(db, 'games', gameId), {
    homeTeamName: input.homeTeamName,
    awayTeamName: input.awayTeamName,
    homeFlagUrl: input.homeFlagUrl || 'https://picsum.photos/seed/flag/64/64',
    awayFlagUrl: input.awayFlagUrl || 'https://picsum.photos/seed/flag/64/64',
    phase: input.phase,
    matchDate: input.matchDate,
    updatedAt: nowIso(),
  });
}

/**
 * Registra o placar oficial de um jogo, calcula os pontos de todos os
 * palpites e recalcula as estatísticas agregadas dos usuários afetados.
 */
export async function setGameResult(
  gameId: string,
  homeScoreOfficial: number,
  awayScoreOfficial: number
): Promise<void> {
  await updateDoc(doc(db, 'games', gameId), {
    homeScoreOfficial,
    awayScoreOfficial,
    status: 'finished',
    pointsCalculated: true,
    updatedAt: nowIso(),
  });

  const guessesSnap = await getDocs(query(collection(db, 'guesses'), where('gameId', '==', gameId)));

  const guessBatch = writeBatch(db);
  const userIds = new Set<string>();

  for (const guessDoc of guessesSnap.docs) {
    const guess = guessDoc.data();
    const result = calculatePoints(
      guess.homeScoreGuess,
      guess.awayScoreGuess,
      homeScoreOfficial,
      awayScoreOfficial
    );
    guessBatch.update(doc(db, 'guesses', guessDoc.id), {
      ...result,
      calculated: true,
      updatedAt: nowIso(),
    });
    userIds.add(guess.userId);
  }
  await guessBatch.commit();

  const statsBatch = writeBatch(db);
  for (const userId of userIds) {
    const userGuessesSnap = await getDocs(
      query(collection(db, 'guesses'), where('userId', '==', userId), where('calculated', '==', true))
    );

    const stats = { totalPoints: 0, exactScoreHits: 0, resultHits: 0, goalHits: 0 };
    userGuessesSnap.docs.forEach(d => {
      const data = d.data();
      stats.totalPoints += data.points || 0;
      if (data.exactScoreHit) stats.exactScoreHits++;
      if (data.resultHit) stats.resultHits++;
      stats.goalHits += data.goalHits || 0;
    });

    statsBatch.update(doc(db, 'users', userId), { ...stats, updatedAt: nowIso() });
  }
  await statsBatch.commit();
}

// ---------------------------------------------------------------------------
// Palpites
// ---------------------------------------------------------------------------

export async function fetchUserGuesses(userId: string): Promise<Record<string, Guess>> {
  const snap = await getDocs(query(collection(db, 'guesses'), where('userId', '==', userId)));
  const map: Record<string, Guess> = {};
  snap.docs.forEach(d => {
    const guess = snapToData<Guess>(d);
    map[guess.gameId] = guess;
  });
  return map;
}

export async function saveGuess(
  userId: string,
  gameId: string,
  homeScoreGuess: number,
  awayScoreGuess: number,
  existingGuessId?: string
): Promise<string> {
  const guessId = existingGuessId ?? `${userId}_${gameId}`;
  const payload: Record<string, unknown> = {
    userId,
    gameId,
    homeScoreGuess,
    awayScoreGuess,
    locked: false,
    updatedAt: nowIso(),
  };

  if (!existingGuessId) {
    Object.assign(payload, {
      points: 0,
      exactScoreHit: false,
      resultHit: false,
      goalHits: 0,
      calculated: false,
      createdAt: nowIso(),
    });
  }

  await setDoc(doc(db, 'guesses', guessId), payload, { merge: true });
  return guessId;
}

// ---------------------------------------------------------------------------
// Usuários / Ranking
// ---------------------------------------------------------------------------

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, 'users', userId));
  return snap.exists() ? snapToData<UserProfile>(snap) : null;
}

export async function fetchRankingPosition(totalPoints: number): Promise<number> {
  const q = query(collection(db, 'users'), where('totalPoints', '>', totalPoints));
  const countSnap = await getCountFromServer(q);
  return countSnap.data().count + 1;
}

export async function fetchTopUsers(max = 100): Promise<UserProfile[]> {
  const snap = await getDocs(query(collection(db, 'users'), orderBy('totalPoints', 'desc'), limit(max)));
  return snap.docs.map(d => snapToData<UserProfile>(d));
}

// ---------------------------------------------------------------------------
// Grupos
// ---------------------------------------------------------------------------

export async function fetchUserGroups(userId: string): Promise<GroupSummary[]> {
  const snap = await getDocs(
    query(collection(db, 'groupMembers'), where('userId', '==', userId), where('status', '==', 'active'))
  );

  const groups = await Promise.all(
    snap.docs.map(async d => {
      const { groupId, role } = d.data();
      const groupSnap = await getDoc(doc(db, 'groups', groupId));
      if (!groupSnap.exists()) return null;
      return { ...snapToData<Group>(groupSnap), myRole: role as GroupRole };
    })
  );

  return groups.filter((g): g is GroupSummary => g !== null);
}

export async function createGroup(userId: string, name: string): Promise<string> {
  const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

  const groupRef = await addDoc(collection(db, 'groups'), {
    name,
    description: '',
    ownerId: userId,
    inviteCode,
    visibility: 'private',
    maxMembers: 100,
    status: 'active',
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });

  await addDoc(collection(db, 'groupMembers'), {
    groupId: groupRef.id,
    userId,
    role: 'owner',
    status: 'active',
    joinedAt: nowIso(),
  });

  return groupRef.id;
}

export type JoinGroupResult = 'joined' | 'not-found' | 'already-member';

export async function joinGroupByCode(userId: string, inviteCode: string): Promise<JoinGroupResult> {
  const groupSnap = await getDocs(query(collection(db, 'groups'), where('inviteCode', '==', inviteCode)));
  if (groupSnap.empty) return 'not-found';

  const groupId = groupSnap.docs[0].id;

  const memberSnap = await getDocs(
    query(collection(db, 'groupMembers'), where('groupId', '==', groupId), where('userId', '==', userId))
  );
  if (!memberSnap.empty && memberSnap.docs[0].data().status === 'active') return 'already-member';

  await addDoc(collection(db, 'groupMembers'), {
    groupId,
    userId,
    role: 'member',
    status: 'active',
    joinedAt: nowIso(),
  });

  return 'joined';
}

export async function fetchGroup(groupId: string): Promise<Group | null> {
  const snap = await getDoc(doc(db, 'groups', groupId));
  return snap.exists() ? snapToData<Group>(snap) : null;
}

export async function fetchGroupMembers(groupId: string): Promise<GroupMemberProfile[]> {
  const snap = await getDocs(
    query(collection(db, 'groupMembers'), where('groupId', '==', groupId), where('status', '==', 'active'))
  );

  const members = await Promise.all(
    snap.docs.map(async mDoc => {
      const mData = mDoc.data();
      const userSnap = await getDoc(doc(db, 'users', mData.userId));
      if (!userSnap.exists()) return null;
      return {
        ...(userSnap.data() as UserProfile),
        memberDocId: mDoc.id,
        userId: mData.userId,
        groupRole: mData.role as GroupRole,
        joinedAt: mData.joinedAt,
      };
    })
  );

  return members
    .filter((m): m is GroupMemberProfile => m !== null)
    .sort((a, b) =>
      (b.totalPoints || 0) !== (a.totalPoints || 0)
        ? (b.totalPoints || 0) - (a.totalPoints || 0)
        : (b.exactScoreHits || 0) - (a.exactScoreHits || 0)
    );
}

export async function leaveGroup(groupId: string, userId: string): Promise<void> {
  const snap = await getDocs(
    query(collection(db, 'groupMembers'), where('groupId', '==', groupId), where('userId', '==', userId))
  );
  if (!snap.empty) {
    await updateDoc(doc(db, 'groupMembers', snap.docs[0].id), {
      status: 'inactive',
      leftAt: nowIso(),
    });
  }
}

export async function deleteGroup(groupId: string): Promise<void> {
  const membersSnap = await getDocs(query(collection(db, 'groupMembers'), where('groupId', '==', groupId)));
  const batch = writeBatch(db);
  membersSnap.docs.forEach(d => batch.delete(doc(db, 'groupMembers', d.id)));
  batch.delete(doc(db, 'groups', groupId));
  await batch.commit();
}
