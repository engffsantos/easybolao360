'use client';

import { fetchTopUsers } from '@/lib/firestore';
import type { UserProfile } from '@/lib/types';
import { LeaderboardRow } from '@/components/ui';
import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';

export default function RankingPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        setUsers(await fetchTopUsers(100));
      } catch (error) {
        console.error('Error fetching ranking', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRanking();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-slate-500 animate-pulse">Carregando ranking...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto w-full">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Ranking Global</h1>
          <p className="text-slate-500">Veja quem é o maior craque dos palpites.</p>
        </div>
        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
          <Trophy size={24} />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {users.length === 0 ? (
          <div className="p-10 text-center text-slate-500">Nenhum usuário encontrado com pontos.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {users.map((rankedUser, index) => (
              <LeaderboardRow
                key={rankedUser.uid}
                index={index}
                highlighted={rankedUser.uid === user?.uid}
                entry={{
                  userId: rankedUser.uid,
                  name: rankedUser.name,
                  photoURL: rankedUser.photoURL,
                  totalPoints: rankedUser.totalPoints,
                  exactScoreHits: rankedUser.exactScoreHits,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
