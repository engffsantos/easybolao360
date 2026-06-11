'use client';

import { useAuth } from '@/lib/auth-context';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { LogOut, Settings, HelpCircle, ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Avatar } from '@/components/ui';

export default function PerfilPage() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.replace('/');
    } catch (e) {
      console.error(e);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-xl mx-auto space-y-6 w-full">
      <div className="bg-white rounded-2xl p-8 text-center shadow-sm border border-slate-200 flex flex-col items-center">
        <div className="mb-4">
          <Avatar src={user.photoURL || undefined} alt={user.displayName || 'Avatar'} size={24} />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">{user.displayName}</h2>
        <p className="text-slate-500 mb-2">{user.email}</p>
        
        {isAdmin && (
          <div className="flex items-center justify-center mt-2 mb-6">
            <span className="px-3 py-1 bg-purple-100 text-purple-700 text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1"><ShieldAlert size={12} /> Administrador</span>
          </div>
        )}

        <button 
          onClick={handleSignOut}
          className="mt-6 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-6 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm text-sm"
        >
          <LogOut size={16} /> Sair da conta
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
          <h2 className="font-bold text-slate-900 text-sm">Opções</h2>
        </div>
        <div className="p-4 hover:bg-slate-50 border-b border-slate-100 cursor-pointer flex items-center gap-4 transition-colors">
          <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
            <Settings className="text-slate-500" size={20} />
          </div>
          <div>
            <p className="font-bold text-slate-900 text-sm">Configurações da Conta</p>
            <p className="text-xs text-slate-500">Notificações e preferências</p>
          </div>
        </div>
        <div className="p-4 hover:bg-slate-50 border-b border-slate-100 cursor-pointer flex items-center gap-4 transition-colors">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
            <HelpCircle size={20} />
          </div>
          <div>
            <p className="font-bold text-slate-900 text-sm">Central de Ajuda</p>
            <p className="text-xs text-slate-500">Regras e pontuações do bolão</p>
          </div>
        </div>
      </div>
    </div>
  );
}
