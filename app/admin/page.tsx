'use client';

import { useAuth } from '@/lib/auth-context';
import { createGame, fetchGames, setGameResult, updateGame, updateGameStatus } from '@/lib/firestore';
import { seedTodayGames } from '@/lib/seed-games';
import { brtInputToTimestamp, formatDateTimeBrt, timestampToBrtInput } from '@/lib/utils';
import type { Game, GameStatus } from '@/lib/types';
import { useCallback, useEffect, useState } from 'react';
import { ShieldAlert, Plus, Check, CalendarPlus, Pencil, X, Unlock, ClipboardEdit } from 'lucide-react';
import { useRouter } from 'next/navigation';

const STATUS_BADGE_STYLES: Record<string, string> = {
  scheduled: 'bg-green-50 text-green-700 border-green-200',
  blocked: 'bg-amber-50 text-amber-700 border-amber-200',
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Agendado',
  blocked: 'Bloqueado',
  finished: 'Finalizado',
};

const inputClass = 'border border-slate-300 p-2.5 rounded-lg bg-slate-50 text-sm outline-none focus:border-blue-500 focus:bg-white transition-colors text-slate-900';

function gameInputFromForm(fd: FormData) {
  return {
    homeTeamName: fd.get('homeTeamName') as string,
    awayTeamName: fd.get('awayTeamName') as string,
    homeFlagUrl: fd.get('homeFlagUrl') as string,
    awayFlagUrl: fd.get('awayFlagUrl') as string,
    phase: fd.get('phase') as string,
    matchDate: brtInputToTimestamp(fd.get('matchDate') as string),
  };
}

function ResultForm({ game, onSubmit }: { game: Game; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void }) {
  return (
    <form onSubmit={onSubmit} className="flex items-center gap-2 w-full">
      <input name="homeScore" type="number" min="0" required placeholder="C" defaultValue={game.homeScoreOfficial ?? ''} className="w-14 p-2.5 border border-slate-300 bg-slate-50 rounded-xl text-center font-bold text-slate-900" />
      <span className="text-slate-400 font-bold text-xs uppercase">vs</span>
      <input name="awayScore" type="number" min="0" required placeholder="V" defaultValue={game.awayScoreOfficial ?? ''} className="w-14 p-2.5 border border-slate-300 bg-slate-50 rounded-xl text-center font-bold text-slate-900" />
      <button type="submit" title="Salvar resultado e calcular pontos" className="p-2.5 bg-green-500 text-white rounded-xl hover:bg-green-600 shadow-md shadow-green-200"><Check size={20}/></button>
    </form>
  );
}

export default function AdminPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingResultId, setEditingResultId] = useState<string | null>(null);

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
    try {
      await createGame(gameInputFromForm(new FormData(form)));
      form.reset();
      loadGames();
    } catch (e) {
      console.error(e);
      alert('Erro ao criar jogo');
    }
  };

  const handleEditGame = async (id: string, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await updateGame(id, gameInputFromForm(new FormData(e.currentTarget)));
      setEditingId(null);
      loadGames();
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar as alterações do jogo.');
    }
  };

  const handleSeedToday = async () => {
    setSeeding(true);
    try {
      const { created, skipped, updated } = await seedTodayGames();
      const parts = [
        created > 0 ? `${created} inserido(s)` : '',
        updated > 0 ? `${updated} corrigido(s)` : '',
        skipped > 0 ? `${skipped} já existia(m)` : '',
      ].filter(Boolean);
      alert(parts.length > 0 && (created > 0 || updated > 0)
        ? `Jogos de hoje: ${parts.join(', ')}.`
        : 'Os jogos de hoje já estavam cadastrados.');
      loadGames();
    } catch (e) {
      console.error(e);
      alert('Erro ao inserir os jogos de hoje.');
    } finally {
      setSeeding(false);
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
      setEditingResultId(null);
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
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center gap-4">
          <h2 className="font-bold text-slate-900 flex items-center gap-2"><Plus size={18} className="text-blue-600" /> Cadastrar Jogo Oficial</h2>
          <button
            onClick={handleSeedToday}
            disabled={seeding}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition-colors disabled:opacity-60 flex items-center gap-2 whitespace-nowrap"
          >
            <CalendarPlus size={16} /> {seeding ? 'Inserindo...' : 'Inserir jogos de hoje'}
          </button>
        </div>
        <form onSubmit={handleCreateGame} className="p-6 grid sm:grid-cols-2 md:grid-cols-4 gap-4 bg-white">
          <input name="homeTeamName" placeholder="Mandante (ex: Brasil)" required className={inputClass} />
          <input name="awayTeamName" placeholder="Visitante (ex: Alemanha)" required className={inputClass} />
          <input name="phase" placeholder="Fase (ex: Final)" required className={inputClass} />
          <input type="datetime-local" name="matchDate" required title="Horário de Brasília" className={inputClass} />
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
            <div key={game.id} className="p-4 hover:bg-slate-50 transition-colors rounded-xl">
              {editingId === game.id ? (
                <form onSubmit={(e) => handleEditGame(game.id, e)} className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <input name="homeTeamName" defaultValue={game.homeTeamName} placeholder="Mandante" required className={inputClass} />
                  <input name="awayTeamName" defaultValue={game.awayTeamName} placeholder="Visitante" required className={inputClass} />
                  <input name="phase" defaultValue={game.phase} placeholder="Fase" required className={inputClass} />
                  <input type="datetime-local" name="matchDate" defaultValue={timestampToBrtInput(game.matchDate)} required title="Horário de Brasília" className={inputClass} />
                  <input name="homeFlagUrl" defaultValue={game.homeFlagUrl} placeholder="URL Bandeira Mandante" className={`${inputClass} md:col-span-2`} />
                  <input name="awayFlagUrl" defaultValue={game.awayFlagUrl} placeholder="URL Bandeira Visitante" className={`${inputClass} md:col-span-2`} />
                  <div className="col-span-full flex gap-3 justify-end">
                    <button type="button" onClick={() => setEditingId(null)} className="px-5 py-2.5 bg-white border border-slate-300 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-50 uppercase tracking-wider flex items-center gap-1.5">
                      <X size={14} /> Cancelar
                    </button>
                    <button type="submit" className="px-5 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-black shadow-md uppercase tracking-wider flex items-center gap-1.5">
                      <Check size={14} /> Salvar Alterações
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col md:flex-row gap-6 md:items-center">
                  <div className="flex-1">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider mb-2 inline-block shadow-sm border ${STATUS_BADGE_STYLES[game.status] ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                      {STATUS_LABELS[game.status] ?? game.status}
                    </span>
                    <p className="font-bold text-slate-900 tracking-tight text-lg mb-1">{game.homeTeamName} {game.homeScoreOfficial ?? '-'} <span className="text-slate-400 px-1 font-normal text-sm">x</span> {game.awayScoreOfficial ?? '-'} {game.awayTeamName}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                      {formatDateTimeBrt(game.matchDate)} <span className="text-slate-300">•</span> {game.phase}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 md:w-auto w-full items-center">
                    {game.status === 'scheduled' && (
                      <button onClick={() => handleUpdateStatus(game.id, 'blocked')} className="flex-1 md:flex-none px-5 py-2.5 bg-amber-100 text-amber-700 text-xs font-bold rounded-xl hover:bg-amber-200 shadow-sm uppercase tracking-wider border border-amber-200">
                        Bloquear Palpites
                      </button>
                    )}

                    {game.status === 'blocked' && (
                      <>
                        <ResultForm game={game} onSubmit={(e) => handleSetResult(game.id, e)} />
                        <button onClick={() => handleUpdateStatus(game.id, 'scheduled')} title="Reabrir palpites" className="px-3 py-2.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-200 border border-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                          <Unlock size={14} /> Reabrir
                        </button>
                      </>
                    )}

                    {game.status === 'finished' && (
                      editingResultId === game.id ? (
                        <>
                          <ResultForm game={game} onSubmit={(e) => handleSetResult(game.id, e)} />
                          <button onClick={() => setEditingResultId(null)} title="Cancelar correção" className="px-3 py-2.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-200 border border-slate-200 flex items-center gap-1.5 uppercase tracking-wider">
                            <X size={14} /> Cancelar
                          </button>
                        </>
                      ) : (
                        <button onClick={() => setEditingResultId(game.id)} className="flex-1 md:flex-none px-5 py-2.5 bg-green-50 text-green-700 text-xs font-bold rounded-xl hover:bg-green-100 border border-green-200 uppercase tracking-wider flex items-center gap-1.5 justify-center">
                          <ClipboardEdit size={14} /> Corrigir Resultado
                        </button>
                      )
                    )}

                    <button onClick={() => setEditingId(game.id)} title="Editar jogo" className="px-3 py-2.5 bg-white text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-100 border border-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                      <Pencil size={14} /> Editar
                    </button>
                  </div>
                </div>
              )}
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
