'use client';

import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, getDocs, query, where, deleteDoc, updateDoc } from 'firebase/firestore';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Trophy, Medal, UserCircle, ArrowLeft, Copy, Check, LogOut, Trash2, Users } from 'lucide-react';
import Link from 'next/link';

export default function GrupoDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();
  
  const [group, setGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user || !id) return;

    const fetchGroupDetails = async () => {
      try {
        // 1. Fetch Group Info
        const groupRef = doc(db, 'groups', id as string);
        const groupSnap = await getDoc(groupRef);
        if (!groupSnap.exists()) {
          router.replace('/grupos');
          return;
        }
        const groupData = { id: groupSnap.id, ...groupSnap.data() };
        setGroup(groupData);

        // 2. Fetch Members
        const gmRef = collection(db, 'groupMembers');
        const qMembers = query(gmRef, where('groupId', '==', id), where('status', '==', 'active'));
        const membersSnap = await getDocs(qMembers);
        
        const membersList: any[] = [];
        for (const mDoc of membersSnap.docs) {
          const mData = mDoc.data();
          const userRef = doc(db, 'users', mData.userId);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            membersList.push({
              memberDocId: mDoc.id,
              userId: mData.userId,
              role: mData.role,
              joinedAt: mData.joinedAt,
              ...userSnap.data()
            });
          }
        }

        // Sort members by totalPoints desc, then exactScoreHits desc
        membersList.sort((a, b) => {
          if ((b.totalPoints || 0) !== (a.totalPoints || 0)) {
            return (b.totalPoints || 0) - (a.totalPoints || 0);
          }
          return (b.exactScoreHits || 0) - (a.exactScoreHits || 0);
        });

        setMembers(membersList);
      } catch (error) {
        console.error("Error fetching group details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGroupDetails();
  }, [user, id, router]);

  const handleCopyCode = () => {
    if (!group) return;
    navigator.clipboard.writeText(group.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeaveGroup = async () => {
    if (!user || !group) return;
    if (!confirm("Tem certeza que deseja sair deste grupo?")) return;

    setLeaving(true);
    try {
      // Find membership doc
      const gmRef = collection(db, 'groupMembers');
      const q = query(gmRef, where('groupId', '==', group.id), where('userId', '==', user.uid));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        // Update membership status to inactive
        await updateDoc(doc(db, 'groupMembers', snap.docs[0].id), {
          status: 'inactive',
          leftAt: new Date().toISOString()
        });
      }
      router.replace('/grupos');
    } catch (e) {
      console.error(e);
      alert("Erro ao sair do grupo.");
      setLeaving(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!user || !group) return;
    if (!confirm("Tem certeza que deseja deletar este grupo permanentemente? Todos os participantes serão removidos.")) return;

    setDeleting(true);
    try {
      // 1. Delete groupMembers
      const gmRef = collection(db, 'groupMembers');
      const q = query(gmRef, where('groupId', '==', group.id));
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await deleteDoc(doc(db, 'groupMembers', d.id));
      }

      // 2. Delete group doc
      await deleteDoc(doc(db, 'groups', group.id));
      router.replace('/grupos');
    } catch (e) {
      console.error(e);
      alert("Erro ao excluir o grupo.");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto w-full animate-pulse space-y-6">
        <div className="h-10 w-24 bg-slate-200 rounded-xl"></div>
        <div className="h-32 bg-slate-200 rounded-2xl"></div>
        <div className="h-64 bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  const isOwner = group?.ownerId === user?.uid;

  return (
    <div className="max-w-4xl mx-auto w-full space-y-8">
      {/* Back link */}
      <div>
        <Link href="/grupos" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 font-medium text-sm transition-colors group">
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" /> Voltar para Meus Grupos
        </Link>
      </div>

      {/* Header card */}
      <div className="bg-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-sm relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-blue-500 text-[10px] font-bold rounded uppercase tracking-wider">Grupo Privado</span>
            <span className="text-slate-400 text-xs flex items-center gap-1"><Users size={12} /> {members.length} {members.length === 1 ? 'membro' : 'membros'}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">{group?.name}</h1>
          <p className="text-slate-400 text-sm">Criado em {new Date(group?.createdAt).toLocaleDateString('pt-BR')}</p>
        </div>

        <div className="relative z-10 flex flex-wrap gap-3 w-full md:w-auto">
          {/* Invite Code display */}
          <div className="bg-slate-800 rounded-xl p-3 flex items-center justify-between gap-4 border border-slate-700 flex-1 md:flex-none">
            <div>
              <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold mb-0.5">Código de Convite</p>
              <p className="text-lg font-bold tracking-widest text-white uppercase">{group?.inviteCode}</p>
            </div>
            <button 
              onClick={handleCopyCode} 
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 hover:text-white transition-colors"
              title="Copiar código"
            >
              {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
            </button>
          </div>

          {isOwner ? (
            <button
              onClick={handleDeleteGroup}
              disabled={deleting}
              className="px-4 py-3 bg-red-600/20 text-red-400 hover:bg-red-600/35 border border-red-500/20 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 flex-1 md:flex-none disabled:opacity-50"
            >
              <Trash2 size={16} /> {deleting ? 'Excluindo...' : 'Excluir'}
            </button>
          ) : (
            <button
              onClick={handleLeaveGroup}
              disabled={leaving}
              className="px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 flex-1 md:flex-none disabled:opacity-50 text-slate-300"
            >
              <LogOut size={16} /> {leaving ? 'Saindo...' : 'Sair do Grupo'}
            </button>
          )}
        </div>
        
        <Trophy className="absolute -bottom-6 -right-6 w-40 h-40 text-black opacity-25 pointer-events-none hidden md:block" />
      </div>

      {/* Leaderboard Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" /> Tabela de Classificação
          </h2>
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Ranking interno</span>
        </div>

        <div className="divide-y divide-slate-100">
          {members.map((member, index) => {
            const isMe = member.userId === user?.uid;
            return (
              <div key={member.userId} className={`flex items-center p-4 sm:p-6 transition-colors hover:bg-slate-50 ${isMe ? 'bg-blue-50/40 hover:bg-blue-50/60' : ''}`}>
                {/* Position */}
                <div className="w-12 text-center font-bold text-slate-400 shrink-0">
                  {index === 0 ? <Medal className="w-6 h-6 mx-auto text-amber-500" /> : 
                   index === 1 ? <Medal className="w-6 h-6 mx-auto text-slate-400" /> : 
                   index === 2 ? <Medal className="w-6 h-6 mx-auto text-amber-700" /> : 
                   <span className="text-sm">{index + 1}º</span>}
                </div>

                {/* Avatar and Name */}
                <div className="flex items-center gap-4 flex-1 px-4 min-w-0">
                  {member.photoURL ? (
                    <img src={member.photoURL} alt={member.name} className="w-10 h-10 rounded-full object-cover border border-slate-200 bg-slate-50 shrink-0 shadow-sm" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 shrink-0 shadow-sm">
                      <UserCircle className="w-6 h-6 text-slate-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className={`font-bold text-slate-900 text-sm tracking-tight truncate ${isMe ? 'text-blue-700' : ''}`}>
                      {member.name} {isMe && <span className="font-normal text-xs text-blue-500 bg-blue-100/70 px-1.5 py-0.5 rounded ml-1">Você</span>}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold rounded uppercase tracking-wider border border-green-100">{member.exactScoreHits || 0} Exatos</span>
                      {member.role === 'owner' && <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 border border-slate-200 rounded uppercase tracking-wider">Criador</span>}
                    </div>
                  </div>
                </div>

                {/* Points */}
                <div className="text-right pr-4 shrink-0">
                  <p className="text-2xl font-light text-slate-900 leading-none">{member.totalPoints || 0}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">pontos</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
