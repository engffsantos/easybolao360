'use client';

import { useAuth } from '@/lib/auth-context';
import { createGame, fetchGames, setGameResult, updateGameStatus } from '@/lib/firestore';
import type { Game, GameStatus } from '@/lib/types';
import { useCallback, useEffect, useState } from 'react';
import { ShieldAlert, Plus, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';

const STATUS_BADGE_STYLES: Record<string, string> = {
  scheduled: 'bg-green-50 text-green-700 border-green-200',
  blocked: 'bg-amber-50 text-amber-700 border-amber-200',
};

const inputClass = 'border border-slate-300 p-2.5 rounded-lg bg-slate-50 text-sm outline-none focus:border-blue-500 focus:bg-white transition-colors';

export default function AdminPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace('/');
    }
  }, [isAdmin, authLoading, router]);

  const loadGames = useCallback(async () => {
    try {
      setGames(await fetchGames('desc'));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) loadGames();
  }, [isAdmin, loadGames]);

  const handleCreateGame = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    try {
      await createGame({
        homeTeamName: fd.get('homeTeamName') as string,
        awayTeamName: fd.get('awayTeamName') as string,
        homeFlagUrl: fd.get('homeFlagUrl') as string,
        awayFlagUrl: fd.get('awayFlagUrl') as string,
        phase: fd.get('phase') as string,
        matchDate: new Date(fd.get('matchDate') as string).getTime(),
      });
      form.reset();
      loadGames();
    } catch (e) {
      console.error(e);
      alert('Erro ao criar jogo');
    }
  };

  const handleUpdateStatus = async (id: string, status: GameStatus) => {
    try {
      await updateGameStatus(id, status);
      loadGames();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSetResult = async (id: string, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const homeScoreOfficial = parseInt(fd.get('homeScore') as string);
    const awayScoreOfficial = parseInt(fd.get('awayScore') as string);

    if (isNaN(homeScoreOfficial) || isNaN(awayScoreOfficial)) {
      alert('Por favor, preencha os placares.');
      return;
    }

    try {
      await setGameResult(id, homeScoreOfficial, awayScoreOfficial);
      alert('Resultado salvo e pontuações calculadas com sucesso!');
      loadGames();
    } catch (error) {
      console.error('Error calculating points:', error);
      alert('Erro ao salvar resultado e calcular pontos.');
    }
  };

  if (authLoading || loading) return <p className="p-8 text-center text-slate-500 animate-pulse">Carregando admin...</p>;
  if (!isAdmin) return null;

  return (
    <div className="space-y-8 max-w-5xl mx-auto w-full">
      <div className="bg-slate-900 rounded-2xl p-6 md:p-8 text-white flex items-center gap-6 shadow-sm relative overflow-hidden">
        <div className="p-4 bg-white/10 rounded-2xl border border-white/20 relative z-10"><ShieldAlert size={36} className="text-purple-400" /></div>
        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight">Painel Administrativo</h1>
          <p className="text-slate-400 mt-1">Gestão de jogos, resultados e usuários do bolão.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
          <h2 className="font-bold text-slate-900 flex items-center gap-2"><Plus size={18} className="text-blue-600" /> Cadastrar Jogo Oficial</h2>
        </div>
        <form onSubmit={handleCreateGame} className="p-6 grid sm:grid-cols-2 md:grid-cols-4 gap-4 bg-white">
          <input name="homeTeamName" placeholder="Mandante (ex: Brasil)" required className={inputClass} />
          <input name="awayTeamName" placeholder="Visitante (ex: Alemanha)" required className={inputClass} />
          <input name="phase" placeholder="Fase (ex: Final)" required className={inputClass} />
          <input type="datetime-local" name="matchDate" required className={inputClass} />
          <input name="homeFlagUrl" placeholder="URL Bandeira Mandante (opcional)" className={`${inputClass} sm:col-span-1 md:col-span-2`} />
          <input name="awayFlagUrl" placeholder="URL Bandeira Visitante (opcional)" className={`${inputClass} sm:col-span-1 md:col-span-2`} />
          <button type="submit" className="col-span-full md:col-span-4 bg-slate-900 text-white p-3 rounded-lg font-bold hover:bg-black transition-colors shadow-md text-sm">Adicionar Partida ao Sistema</button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-bold text-slate-900">Listagem de Jogos</h2>
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase tracking-wider">{games.length} REGISTROS</span>
        </div>

        <div className="divide-y divide-slate-100 p-4">
          {games.map(game => (
            <div key={game.id} className="p-4 hover:bg-slate-50 transition-colors rounded-xl flex flex-col md:flex-row gap-6 md:items-center">
              <div className="flex-1">
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider mb-2 inline-block shadow-sm border ${STATUS_BADGE_STYLES[game.status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                  {game.status}
                </span>
                <p className="font-bold text-slate-900 tracking-tight text-lg mb-1">{game.homeTeamName} {game.homeScoreOfficial ?? '-'} <span className="text-slate-400 px-1 font-normal text-sm">x</span> {game.awayScoreOfficial ?? '-'} {game.awayTeamName}</p>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                  {new Date(game.matchDate).toLocaleString('pt-BR')} <span className="text-slate-300">•</span> {game.phase}
                </div>
              </div>

              <div className="flex gap-3 md:w-auto w-full">
                {game.status === 'scheduled' && (
                  <button onClick={() => handleUpdateStatus(game.id, 'blocked')} className="flex-1 md:flex-none px-5 py-2.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-xl hover:bg-amber-200 shadow-sm uppercase tracking-wider border border-amber-200">
                    Bloquear Palpites
                  </button>
                )}
                {game.status === 'blocked' && (
                  <form onSubmit={(e) => handleSetResult(game.id, e)} className="flex items-center gap-2 w-full">
                    <input name="homeScore" type="number" required placeholder="C" className="w-14 p-2.5 border border-slate-300 bg-slate-50 rounded-xl text-center font-bold text-slate-900" />
                    <span className="text-slate-400 font-bold text-xs uppercase">vs</span>
                    <input name="awayScore" type="number" required placeholder="V" className="w-14 p-2.5 border border-slate-300 bg-slate-50 rounded-xl text-center font-bold text-slate-900" />
                    <button type="submit" className="p-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 shadow-md shadow-green-200"><Check size={20}/></button>
                  </form>
                )}
                {game.status === 'finished' && (
                  <button className="px-5 py-2.5 bg-slate-100 text-slate-400 text-xs font-bold rounded-xl cursor-not-allowed uppercase tracking-wider border border-slate-200" disabled>
                    Calculado
                  </button>
                )}
              </div>
            </div>
          ))}
          {games.length === 0 && (
            <div className="text-center py-10 text-slate-500">
              Nenhum jogo cadastrado.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
