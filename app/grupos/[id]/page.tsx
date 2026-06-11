'use client';

import { useAuth } from '@/lib/auth-context';
import { deleteGroup, fetchGroup, fetchGroupMembers, leaveGroup } from '@/lib/firestore';
import type { Group, GroupMemberProfile } from '@/lib/types';
import { LeaderboardRow, PulseSkeleton } from '@/components/ui';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Trophy, ArrowLeft, Copy, Check, LogOut, Trash2, Users } from 'lucide-react';
import Link from 'next/link';

export default function GrupoDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const router = useRouter();

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMemberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user || !id) return;

    const fetchGroupDetails = async () => {
      try {
        const groupData = await fetchGroup(id as string);
        if (!groupData) {
          router.replace('/grupos');
          return;
        }
        setGroup(groupData);
        setMembers(await fetchGroupMembers(groupData.id));
      } catch (error) {
        console.error('Error fetching group details:', error);
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
    if (!confirm('Tem certeza que deseja sair deste grupo?')) return;

    setLeaving(true);
    try {
      await leaveGroup(group.id, user.uid);
      router.replace('/grupos');
    } catch (e) {
      console.error(e);
      alert('Erro ao sair do grupo.');
      setLeaving(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!user || !group) return;
    if (!confirm('Tem certeza que deseja deletar este grupo permanentemente? Todos os participantes serão removidos.')) return;

    setDeleting(true);
    try {
      await deleteGroup(group.id);
      router.replace('/grupos');
    } catch (e) {
      console.error(e);
      alert('Erro ao excluir o grupo.');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto w-full">
        <PulseSkeleton blocks={['h-10 w-24', 'h-32', 'h-64']} />
      </div>
    );
  }

  const isOwner = group?.ownerId === user?.uid;

  return (
    <div className="max-w-4xl mx-auto w-full space-y-8">
      <div>
        <Link href="/grupos" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 font-medium text-sm transition-colors group">
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" /> Voltar para Meus Grupos
        </Link>
      </div>

      <div className="bg-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-sm relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-blue-500 text-[10px] font-bold rounded uppercase tracking-wider">Grupo Privado</span>
            <span className="text-slate-400 text-xs flex items-center gap-1"><Users size={12} /> {members.length} {members.length === 1 ? 'membro' : 'membros'}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">{group?.name}</h1>
          <p className="text-slate-400 text-sm">Criado em {group ? new Date(group.createdAt).toLocaleDateString('pt-BR') : ''}</p>
        </div>

        <div className="relative z-10 flex flex-wrap gap-3 w-full md:w-auto">
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

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h2 className="font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" /> Tabela de Classificação
          </h2>
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Ranking interno</span>
        </div>

        <div className="divide-y divide-slate-100">
          {members.map((member, index) => (
            <LeaderboardRow
              key={member.userId}
              index={index}
              highlighted={member.userId === user?.uid}
              entry={{
                userId: member.userId,
                name: member.name,
                photoURL: member.photoURL,
                totalPoints: member.totalPoints,
                exactScoreHits: member.exactScoreHits,
                badge: member.groupRole === 'owner' ? 'Criador' : undefined,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
