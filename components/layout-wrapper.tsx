'use client';

import { useAuth } from '@/lib/auth-context';
import { Home, Trophy, Users, UserCircle, LogIn, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { motion } from 'motion/react';

const navItems = [
  { name: 'Início', href: '/', icon: Home },
  { name: 'Jogos', href: '/jogos', icon: Trophy },
  { name: 'Grupos', href: '/grupos', icon: Users },
  { name: 'Ranking', href: '/ranking', icon: Trophy },
  { name: 'Perfil', href: '/perfil', icon: UserCircle },
];

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  const pathname = usePathname();

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Error logging in:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Trophy className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">EasyBolão360</h1>
          <p className="text-slate-500 mb-8">Faça login para participar do bolão da Copa do Mundo.</p>
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-200"
          >
            <LogIn size={20} />
            Entrar com Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen pb-20 md:pb-0 bg-slate-50 text-slate-800">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shrink-0 hidden md:flex items-center px-8 h-16 justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Trophy className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-xl tracking-tight text-slate-900">
                  EasyBolão360
                </span>
              </div>
              <nav className="flex gap-6 text-sm font-medium text-slate-500">
                {user && navItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`py-5 transition-colors cursor-pointer ${
                      pathname === item.href
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'hover:text-slate-900 border-b-2 border-transparent'
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
                {isAdmin && (
                  <Link
                    href="/admin"
                    className={`flex items-center gap-1 py-5 transition-colors cursor-pointer ${
                      pathname.startsWith('/admin')
                        ? 'text-purple-600 border-b-2 border-purple-600'
                        : 'hover:text-slate-900 border-b-2 border-transparent'
                    }`}
                  >
                    <LayoutDashboard size={16} /> Admin
                  </Link>
                )}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              {user && (
                <>
                  <div className="text-right mr-2 hidden sm:block">
                    <p className="text-xs font-semibold text-slate-900">{user.displayName}</p>
                    <p className="text-[10px] text-slate-500">{isAdmin ? 'Administrador' : 'Participante'}</p>
                  </div>
                  {user.photoURL ? (
                    <img className="w-10 h-10 rounded-full border border-slate-300 bg-slate-200 object-cover" src={user.photoURL} alt="" />
                  ) : (
                    <UserCircle className="w-10 h-10 text-slate-400" />
                  )}
                </>
              )}
            </div>
      </header>
      
      {/* Mobile Top Header */}
      <div className="md:hidden bg-white px-4 py-3 border-b border-slate-200 sticky top-0 z-30 shadow-sm flex justify-between items-center">
        <span className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
            <Trophy className="h-4 w-4 text-white" />
          </div>
          EasyBolão360
        </span>
        {user && user.photoURL && (
          <img className="h-8 w-8 rounded-full border border-slate-200 object-cover" src={user.photoURL} alt="" />
        )}
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-8">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col gap-8 h-full"
        >
          {children}
        </motion.div>
      </main>

      {/* Bottom Navigation for Mobile */}
      {user && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] pb-safe">
          <div className="flex justify-around items-center h-16 px-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                    isActive ? 'text-blue-600' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  <Icon size={20} className={isActive ? 'stroke-[2.5px]' : ''} />
                  <span className="text-[10px] font-medium">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
