'use client';

import { useAuth } from '@/lib/auth-context';
import { createGroup, fetchUserGroups, joinGroupByCode } from '@/lib/firestore';
import type { GroupSummary } from '@/lib/types';
import { useCallback, useEffect, useState } from 'react';
import { Users, Plus, KeyRound } from 'lucide-react';
import Link from 'next/link';

export default function GruposPage() {
  const { user } = useAuth();
  const [myGroups, setMyGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGroups = useCallback(async () => {
    if (!user) return;
    try {
      setMyGroups(await fetchUserGroups(user.uid));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const handleCreateGroup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const form = e.currentTarget;
    const name = new FormData(form).get('name') as string;

    try {
      await createGroup(user.uid, name);
      form.reset();
      await loadGroups();
    } catch (e) {
      console.error(e);
      alert('Erro ao criar grupo');
    }
  };

  const handleJoinGroup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const form = e.currentTarget;
    const code = (new FormData(form).get('inviteCode') as string).toUpperCase();

    try {
      const result = await joinGroupByCode(user.uid, code);
      if (result === 'not-found') {
        alert('Código inválido ou grupo não encontrado.');
        return;
      }
      if (result === 'already-member') {
        alert('Você já está neste grupo.');
        return;
      }
      form.reset();
      await loadGroups();
    } catch (e) {
      console.error(e);
      alert('Erro ao entrar no grupo');
    }
  };

  if (loading) return <div className="text-center p-8 text-slate-500 animate-pulse">Carregando grupos...</div>;

  return (
    <>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Meus Grupos</h1>
        <p className="text-slate-500 max-w-xl">Crie ou participe de bolões com seus amigos, colegas de trabalho e familiares.</p>
      </header>

      <div className="grid lg:grid-cols-2 gap-8 mb-8 shrink-0">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-2 tracking-tight">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <Plus size={16} />
              </div>
              Criar Novo Grupo
            </h2>
            <p className="text-sm text-slate-500 mb-6">Inicie sua própria competição e convide seus amigos.</p>
          </div>
          <form onSubmit={handleCreateGroup} className="flex gap-3">
            <input name="name" placeholder="Nome do grupo..." required className="flex-1 border border-slate-300 p-3 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none text-sm transition-colors text-slate-900" />
            <button type="submit" className="bg-slate-900 hover:bg-black text-white font-bold px-6 py-3 rounded-xl shadow-md transition-colors whitespace-nowrap text-sm">Criar Grupo</button>
          </form>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-2 tracking-tight">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                <KeyRound size={16} />
              </div>
              Entrar com Código
            </h2>
            <p className="text-sm text-slate-500 mb-6">Caso alguém já tenha criado um bolão, cole o código de acesso.</p>
          </div>
          <form onSubmit={handleJoinGroup} className="flex gap-3">
            <input name="inviteCode" placeholder="Ex: COPA12" required className="flex-1 border border-slate-300 p-3 rounded-xl bg-slate-50 focus:ring-2 focus:ring-slate-600 focus:border-slate-600 outline-none uppercase text-sm transition-colors tracking-widest text-slate-900" />
            <button type="submit" className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-900 font-bold px-6 py-3 rounded-xl shadow-sm transition-colors whitespace-nowrap text-sm">Validar</button>
          </form>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
          <h2 className="font-bold text-slate-900">Seus Grupos Ativos</h2>
        </div>
        <div className="p-6 space-y-4">
          {myGroups.map(g => (
            <Link key={g.id} href={`/grupos/${g.id}`} className="bg-white p-5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors flex items-center justify-between group cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-100 group-hover:bg-white rounded-full border border-slate-200 flex items-center justify-center text-slate-400">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 mb-1">{g.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500 px-2 py-0.5 bg-slate-100 rounded border border-slate-200 uppercase tracking-widest">Código: {g.inviteCode}</span>
                    {g.myRole === 'owner' && <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-700 rounded uppercase tracking-wider">Administrador</span>}
                  </div>
                </div>
              </div>
            </Link>
          ))}
          {myGroups.length === 0 && (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-slate-200 mb-4" />
              <p className="text-slate-500 font-medium">Você ainda não participa de nenhum grupo.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
