'use client';

import { useAuth } from '@/lib/auth-context';
import { fetchGames, fetchRankingPosition, fetchUserProfile } from '@/lib/firestore';
import type { Game } from '@/lib/types';
import { EmptyState, TeamColumn } from '@/components/ui';
import { Trophy, CalendarClock, AlertCircle, Users } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalPoints: 0, position: 0 });
  const [nextGames, setNextGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchDashboard = async () => {
      try {
        const profile = await fetchUserProfile(user.uid);
        const totalPoints = profile?.totalPoints || 0;
        const [position, games] = await Promise.all([
          fetchRankingPosition(totalPoints),
          fetchGames('asc', 5),
        ]);
        setStats({ totalPoints, position });
        setNextGames(games);
      } catch (error) {
        console.error('Dashboard fetch error', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [user]);

  if (loading) {
    return (
      <div className="flex animate-pulse space-x-4">
        <div className="flex-1 space-y-6 py-1">
          <div className="h-24 bg-slate-200 rounded-2xl"></div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="h-32 bg-slate-200 rounded-2xl"></div>
              <div className="h-32 bg-slate-200 rounded-2xl"></div>
            </div>
            <div className="h-40 bg-slate-200 rounded-2xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-sm relative overflow-hidden flex flex-col md:flex-row justify-between shrink-0">
        <div className="relative z-10 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase tracking-wider">Bem-vindo</span>
            <span className="text-slate-400 text-sm">• Atualizado agora</span>
          </div>
          <h1 className="text-3xl font-bold mb-1 tracking-tight">Olá, {user?.displayName?.split(' ')[0]}</h1>
          <p className="text-slate-400 mb-6 max-w-xl">Pronto para acompanhar a rodada? Mantenha seus palpites atualizados para subir no ranking.</p>

          <div className="flex gap-4 max-w-md">
            <div className="bg-slate-800 rounded-xl p-4 flex-1 border border-slate-700">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Seus Pontos</p>
              <p className="text-3xl font-bold tracking-tight text-white">{stats.totalPoints}</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-4 flex-1 border border-slate-700">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1">Posição Geral</p>
              <p className="text-3xl font-bold tracking-tight text-white">{stats.position}º</p>
            </div>
          </div>
        </div>

        <Trophy className="absolute -bottom-4 -right-4 w-48 h-48 text-black opacity-20 pointer-events-none hidden md:block" />
      </div>

      <div className="flex items-center justify-between mt-4">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 tracking-tight">
          <CalendarClock className="w-5 h-5 text-blue-600" /> Próximos Jogos
        </h3>
        <Link href="/jogos" className="text-sm font-bold text-blue-600 hover:text-blue-700 underline">Ver Todos</Link>
      </div>

      {nextGames.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Nenhum jogo próximo"
          description="Os jogos aparecerão aqui assim que forem adicionados pelo administrador."
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 shrink-0">
          {nextGames.map((game) => (
            <div key={game.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-[10px] font-bold text-slate-400 text-center mb-4 tracking-widest uppercase">
                {game.phase}
              </div>
              <div className="flex items-center justify-between mb-6">
                <TeamColumn flagUrl={game.homeFlagUrl} name={game.homeTeamName} />
                <div className="px-4 text-center">
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 flex items-center justify-center rounded-full border border-slate-100 ring-1 ring-slate-100 uppercase">vs</span>
                </div>
                <TeamColumn flagUrl={game.awayFlagUrl} name={game.awayTeamName} />
              </div>
              <Link
                href={`/jogos#game-${game.id}`}
                className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm border border-slate-200 shadow-sm"
              >
                {game.status === 'scheduled' ? 'Fazer Palpite' : 'Ver Detalhes'}
              </Link>
            </div>
          ))}
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-6 mt-4">
        <Link href="/jogos" className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow group">
          <div className="p-3 bg-red-50 rounded-xl border border-red-100 text-red-600 transition-colors">
            <AlertCircle size={24} />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 mb-1 tracking-tight">Palpites Pendentes</h4>
            <p className="text-xs text-slate-500">Veja os jogos que você ainda não palpitou antes que bloqueiem.</p>
          </div>
        </Link>
        <Link href="/grupos" className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow group">
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-blue-600 transition-colors flex items-center justify-center h-12 w-12 shrink-0">
            <Users size={24} />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 mb-1 tracking-tight">Meus Grupos</h4>
            <p className="text-xs text-slate-500">Acompanhe o ranking dentro dos seus grupos particulares.</p>
          </div>
        </Link>
      </div>
    </>
  );
}
