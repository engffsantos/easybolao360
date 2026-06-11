'use client';

import { db } from '@/lib/firebase';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Trophy, Medal, UserCircle } from 'lucide-react';

export default function RankingPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        const q = query(collection(db, 'users'), orderBy('totalPoints', 'desc'), limit(100));
        const snap = await getDocs(q);
        setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (error) {
        console.error("Error fetching ranking", error);
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
          <div className="p-10 text-center text-slate-500">Nenhum usuário encontado com pontos.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {users.map((user, index) => (
              <div key={user.id} className="flex items-center p-4 sm:p-6 hover:bg-slate-50 transition-colors">
                <div className="w-12 text-center font-bold text-slate-400">
                  {index === 0 ? <Medal className="w-6 h-6 mx-auto text-amber-500" /> : 
                   index === 1 ? <Medal className="w-6 h-6 mx-auto text-slate-400" /> : 
                   index === 2 ? <Medal className="w-6 h-6 mx-auto text-amber-700" /> : 
                   <span className="text-sm">{index + 1}º</span>}
                </div>
                
                <div className="flex items-center gap-4 flex-1 px-4">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.name} className="w-10 h-10 rounded-full object-cover border border-slate-200 bg-slate-50" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                      <UserCircle className="w-6 h-6 text-slate-400" />
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-slate-900 text-sm tracking-tight">{user.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold rounded uppercase tracking-wider">{user.exactScoreHits} Exatos</span>
                    </div>
                  </div>
                </div>

                <div className="text-right pr-4">
                  <p className="text-2xl font-light text-slate-900">{user.totalPoints}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">pontos</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
