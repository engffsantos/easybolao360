'use client';

import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { addDoc, collection, doc, getDocs, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { ShieldAlert, Plus, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { calculatePoints } from '@/lib/utils';

export default function AdminPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    if (!authLoading && !isAdmin) {
      if (mounted) router.replace('/');
    }
    return () => { mounted = false; };
  }, [isAdmin, authLoading, router]);

  useEffect(() => {
    let mounted = true;
    if (isAdmin) {
      const q = query(collection(db, 'games'), orderBy('matchDate', 'desc'));
      getDocs(q).then(snap => {
        if (mounted) {
          setGames(snap.docs.map(d => ({ id: d.id, ...d.data() })));
          setLoading(false);
        }
      }).catch(e => {
        console.error(e);
        if (mounted) setLoading(false);
      });
    }
    return () => { mounted = false; };
  }, [isAdmin]);

  const fetchGames = async () => {
    try {
      const q = query(collection(db, 'games'), orderBy('matchDate', 'desc'));
      const snap = await getDocs(q);
      setGames(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateGame = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      await addDoc(collection(db, 'games'), {
        homeTeamId: 'tbd',
        awayTeamId: 'tbd',
        homeTeamName: fd.get('homeTeamName'),
        awayTeamName: fd.get('awayTeamName'),
        homeFlagUrl: fd.get('homeFlagUrl') || 'https://picsum.photos/seed/flag/64/64',
        awayFlagUrl: fd.get('awayFlagUrl') || 'https://picsum.photos/seed/flag/64/64',
        phase: fd.get('phase'),
        matchDate: new Date(fd.get('matchDate') as string).getTime(),
        status: 'scheduled',
        pointsCalculated: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      fetchGames();
      (e.target as HTMLFormElement).reset();
    } catch (e) {
      console.error(e);
      alert('Erro ao criar jogo');
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await updateDoc(doc(db, 'games', id), { status, updatedAt: new Date().toISOString() });
      fetchGames();
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
      // 1. Update game status and official score
      const gameRef = doc(db, 'games', id);
      await updateDoc(gameRef, {
        homeScoreOfficial,
        awayScoreOfficial,
        status: 'finished',
        pointsCalculated: true,
        updatedAt: new Date().toISOString()
      });

      // 2. Fetch all guesses for this game
      const guessesSnap = await getDocs(query(collection(db, 'guesses'), where('gameId', '==', id)));
      
      const userIdsToRecalculate = new Set<string>();

      // 3. Calculate points for each guess
      for (const guessDoc of guessesSnap.docs) {
        const guessData = guessDoc.data();
        const homeScoreGuess = guessData.homeScoreGuess;
        const awayScoreGuess = guessData.awayScoreGuess;
        const userId = guessData.userId;

        const { points, exactScoreHit, resultHit, goalHits } = calculatePoints(
          homeScoreGuess,
          awayScoreGuess,
          homeScoreOfficial,
          awayScoreOfficial
        );

        await updateDoc(doc(db, 'guesses', guessDoc.id), {
          points,
          exactScoreHit,
          resultHit,
          goalHits,
          calculated: true,
          updatedAt: new Date().toISOString()
        });

        userIdsToRecalculate.add(userId);
      }

      // 4. Recalculate stats for each affected user
      for (const userId of userIdsToRecalculate) {
        const userGuessesSnap = await getDocs(
          query(collection(db, 'guesses'), where('userId', '==', userId), where('calculated', '==', true))
        );

        let totalPoints = 0;
        let exactScoreHits = 0;
        let resultHits = 0;
        let goalHitsSum = 0;

        userGuessesSnap.docs.forEach(d => {
          const data = d.data();
          totalPoints += data.points || 0;
          if (data.exactScoreHit) exactScoreHits++;
          if (data.resultHit) resultHits++;
          goalHitsSum += data.goalHits || 0;
        });

        await updateDoc(doc(db, 'users', userId), {
          totalPoints,
          exactScoreHits,
          resultHits,
          goalHits: goalHitsSum,
          updatedAt: new Date().toISOString()
        });
      }

      alert('Resultado salvo e pontuações calculadas com sucesso!');
      fetchGames();
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
          <input name="homeTeamName" placeholder="Mdtte. (ex: Brasil)" required className="border border-slate-300 p-2.5 rounded-lg bg-slate-50 text-sm outline-none focus:border-blue-500 focus:bg-white transition-colors" />
          <input name="awayTeamName" placeholder="Visitante (ex: Alem.)" required className="border border-slate-300 p-2.5 rounded-lg bg-slate-50 text-sm outline-none focus:border-blue-500 focus:bg-white transition-colors" />
          <input name="phase" placeholder="Fase (ex: Final)" required className="border border-slate-300 p-2.5 rounded-lg bg-slate-50 text-sm outline-none focus:border-blue-500 focus:bg-white transition-colors" />
          <input type="datetime-local" name="matchDate" required className="border border-slate-300 p-2.5 rounded-lg bg-slate-50 text-sm outline-none focus:border-blue-500 focus:bg-white transition-colors" />
          <input name="homeFlagUrl" placeholder="URL Bandeira Mdtte. (opcional)" className="border border-slate-300 p-2.5 rounded-lg bg-slate-50 text-sm outline-none focus:border-blue-500 focus:bg-white transition-colors sm:col-span-1 md:col-span-2" />
          <input name="awayFlagUrl" placeholder="URL Bandeira Visitante (opcional)" className="border border-slate-300 p-2.5 rounded-lg bg-slate-50 text-sm outline-none focus:border-blue-500 focus:bg-white transition-colors sm:col-span-1 md:col-span-2" />
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
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider mb-2 inline-block shadow-sm border ${
                  game.status === 'scheduled' ? 'bg-green-50 text-green-700 border-green-200' :
                  game.status === 'blocked' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                  'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
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
                  <button className="px-5 py-2.5 bg-slate-100 text-slate-400 text-xs font-bold rounded-xl cursor-not-allowed uppercase tracking-wider border border-slate-200">
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
