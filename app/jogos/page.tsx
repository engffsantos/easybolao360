'use client';

import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, orderBy, query, setDoc, where } from 'firebase/firestore';
import { FormEvent, useEffect, useState } from 'react';
import { Save, CheckCircle2, Clock, Lock, Trophy } from 'lucide-react';

export default function JogosPage() {
  const { user } = useAuth();
  const [games, setGames] = useState<any[]>([]);
  const [guesses, setGuesses] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      try {
        const gamesRef = collection(db, 'games');
        const qGames = query(gamesRef, orderBy('matchDate', 'asc'));
        const gamesSnap = await getDocs(qGames);
        setGames(gamesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        
        const guessesRef = collection(db, 'guesses');
        const qGuesses = query(guessesRef, where('userId', '==', user.uid));
        const guessesSnap = await getDocs(qGuesses);
        const guessesMap: Record<string, any> = {};
        guessesSnap.docs.forEach(doc => {
          guessesMap[doc.data().gameId] = { id: doc.id, ...doc.data() };
        });
        setGuesses(guessesMap);
      } catch (error) {
        console.error("Error fetching games", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleSaveGuess = async (gameId: string, e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    
    const formData = new FormData(e.currentTarget);
    const homeScore = parseInt(formData.get('homeScore') as string);
    const awayScore = parseInt(formData.get('awayScore') as string);
    
    if (isNaN(homeScore) || isNaN(awayScore) || homeScore < 0 || homeScore > 20 || awayScore < 0 || awayScore > 20) {
      alert("Por favor, insira um placar válido (0-20).");
      return;
    }

    setSaving(gameId);
    
    try {
      const existingGuess = guesses[gameId];
      const guessRef = doc(db, 'guesses', existingGuess ? existingGuess.id : `${user.uid}_${gameId}`);
      
      const payload = {
        userId: user.uid,
        gameId: gameId,
        homeScoreGuess: homeScore,
        awayScoreGuess: awayScore,
        points: 0,
        exactScoreHit: false,
        resultHit: false,
        goalHits: 0,
        calculated: false,
        locked: false,
        updatedAt: new Date().toISOString()
      };

      if (!existingGuess) {
        Object.assign(payload, { createdAt: new Date().toISOString() });
      }

      await setDoc(guessRef, payload, { merge: true });
      
      setGuesses(prev => ({
        ...prev,
        [gameId]: { ...prev[gameId], homeScoreGuess: homeScore, awayScoreGuess: awayScore, id: guessRef.id }
      }));
    } catch (error) {
      console.error("Error saving guess", error);
      alert("Ocorreu um erro ao salvar o palpite.");
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return <div className="animate-pulse flex flex-col gap-6"><div className="h-48 bg-slate-200 rounded-2xl"></div><div className="h-48 bg-slate-200 rounded-2xl"></div></div>;
  }

  return (
    <>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Jogos da Copa</h1>
        <p className="text-slate-500 max-w-xl">Acompanhe do andamento da competição e faça seus palpites antes do início de cada partida.</p>
      </header>

      <div className="flex flex-col gap-6">
        {games.map(game => {
          const guess = guesses[game.id];
          const isBlocked = game.status !== 'scheduled';
          const matchDate = new Date(game.matchDate);
          
          return (
            <div key={game.id} id={`game-${game.id}`} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col scroll-mt-20">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <span>{game.phase}</span>
                <div className="flex gap-2 items-center text-slate-500">
                  <Clock size={14} />
                  <span>{matchDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} • {matchDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
              
              <div className="p-6 md:p-8">
                <form onSubmit={(e) => handleSaveGuess(game.id, e)}>
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex flex-col items-center flex-1">
                      <img src={game.homeFlagUrl || 'https://picsum.photos/seed/flag/64/64'} alt={game.homeTeamName} className="w-16 h-16 md:w-20 md:h-20 rounded-full shadow-sm object-cover border border-slate-200 mb-4" />
                      <span className="text-sm md:text-base font-bold text-slate-900 text-center tracking-tight">{game.homeTeamName}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 md:gap-4 px-2 md:px-6">
                      <input 
                        type="number" 
                        name="homeScore"
                        defaultValue={guess?.homeScoreGuess}
                        disabled={isBlocked}
                        className="w-14 h-16 md:w-20 md:h-20 text-center text-2xl md:text-3xl font-light bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:bg-white transition-all disabled:opacity-50 disabled:bg-slate-100 appearance-none text-slate-900"
                        min="0"
                        max="20"
                        required
                      />
                      <span className="text-slate-400 font-bold text-lg md:text-xl px-1 uppercase text-[10px]">vs</span>
                      <input 
                        type="number" 
                        name="awayScore"
                        defaultValue={guess?.awayScoreGuess}
                        disabled={isBlocked}
                        className="w-14 h-16 md:w-20 md:h-20 text-center text-2xl md:text-3xl font-light bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:bg-white transition-all disabled:opacity-50 disabled:bg-slate-100 appearance-none text-slate-900"
                        min="0"
                        max="20"
                        required
                      />
                    </div>

                    <div className="flex flex-col items-center flex-1">
                      <img src={game.awayFlagUrl || 'https://picsum.photos/seed/flag/64/64'} alt={game.awayTeamName} className="w-16 h-16 md:w-20 md:h-20 rounded-full shadow-sm object-cover border border-slate-200 mb-4" />
                      <span className="text-sm md:text-base font-bold text-slate-900 text-center tracking-tight">{game.awayTeamName}</span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-slate-100 gap-4">
                    {isBlocked ? (
                      <div className="flex items-center gap-2 text-slate-500 bg-slate-100 px-4 py-2 rounded-xl text-sm font-bold w-full sm:w-auto justify-center uppercase tracking-wider text-[10px]">
                        <Lock size={14} /> Palpite Bloqueado
                      </div>
                    ) : (
                      <>
                        <div className="text-xs font-bold uppercase tracking-wider">
                          {guess ? (
                            <span className="flex items-center gap-1.5 text-blue-600 px-3 py-1.5 bg-blue-50 rounded-lg"><CheckCircle2 size={16} /> Salvo</span>
                          ) : (
                            <span className="text-amber-600 px-3 py-1.5 bg-amber-50 rounded-lg">Pendente</span>
                          )}
                        </div>
                        <button 
                          type="submit" 
                          disabled={saving === game.id}
                          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl transition-colors disabled:opacity-70 flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                        >
                          {saving === game.id ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                          ) : (
                            <><Save size={18} /> Salvar Palpite</>
                          )}
                        </button>
                      </>
                    )}
                    
                    {game.status === 'finished' && (
                      <div className="w-full sm:w-auto text-center sm:text-right mt-2 sm:mt-0 bg-slate-50 px-4 py-2 rounded-xl">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Resultado Oficial</p>
                        <p className="font-bold text-slate-900">{game.homeScoreOfficial} <span className="text-slate-400 font-normal px-1">x</span> {game.awayScoreOfficial}</p>
                        {guess?.calculated && (
                          <div className="flex items-center gap-1 justify-center sm:justify-end mt-1">
                            <Trophy size={14} className="text-blue-600" />
                            <p className="text-blue-600 font-bold text-xs">+{guess.points} pts</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </form>
              </div>
            </div>
          );
        })}
        {games.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
            <Trophy className="mx-auto h-16 w-16 text-slate-200 mb-4" />
            <p className="text-slate-500 font-medium">Nenhum jogo cadastrado ainda.</p>
          </div>
        )}
      </div>
    </>
  );
}
