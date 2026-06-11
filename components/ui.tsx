import { Medal, UserCircle, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Avatar({ src, alt, size = 10 }: { src?: string; alt: string; size?: 10 | 24 }) {
  const sizeClass = size === 24 ? 'w-24 h-24 border-4 border-slate-50' : 'w-10 h-10 border border-slate-200';
  if (src) {
    return <img src={src} alt={alt} className={cn(sizeClass, 'rounded-full object-cover bg-slate-50 shrink-0 shadow-sm')} />;
  }
  return (
    <div className={cn(sizeClass, 'rounded-full bg-slate-100 flex items-center justify-center shrink-0 shadow-sm')}>
      <UserCircle className={cn(size === 24 ? 'w-12 h-12' : 'w-6 h-6', 'text-slate-300')} />
    </div>
  );
}

const MEDAL_COLORS = ['text-amber-500', 'text-slate-400', 'text-amber-700'];

export function RankPosition({ index }: { index: number }) {
  return (
    <div className="w-12 text-center font-bold text-slate-400 shrink-0">
      {index < 3 ? (
        <Medal className={cn('w-6 h-6 mx-auto', MEDAL_COLORS[index])} />
      ) : (
        <span className="text-sm">{index + 1}º</span>
      )}
    </div>
  );
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  photoURL?: string;
  totalPoints: number;
  exactScoreHits: number;
  badge?: string;
}

export function LeaderboardRow({
  entry,
  index,
  highlighted = false,
}: {
  entry: LeaderboardEntry;
  index: number;
  highlighted?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center p-4 sm:p-6 transition-colors hover:bg-slate-50',
        highlighted && 'bg-blue-50/40 hover:bg-blue-50/60'
      )}
    >
      <RankPosition index={index} />

      <div className="flex items-center gap-4 flex-1 px-4 min-w-0">
        <Avatar src={entry.photoURL} alt={entry.name} />
        <div className="min-w-0">
          <p className={cn('font-bold text-slate-900 text-sm tracking-tight truncate', highlighted && 'text-blue-700')}>
            {entry.name}
            {highlighted && (
              <span className="font-normal text-xs text-blue-500 bg-blue-100/70 px-1.5 py-0.5 rounded ml-1">Você</span>
            )}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="px-2 py-0.5 bg-green-50 text-green-700 text-[10px] font-bold rounded uppercase tracking-wider border border-green-100">
              {entry.exactScoreHits || 0} Exatos
            </span>
            {entry.badge && (
              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 border border-slate-200 rounded uppercase tracking-wider">
                {entry.badge}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="text-right pr-4 shrink-0">
        <p className="text-2xl font-light text-slate-900 leading-none">{entry.totalPoints || 0}</p>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">pontos</p>
      </div>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center shadow-sm">
      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
        <Icon size={24} />
      </div>
      <h4 className="text-slate-900 font-bold mb-1 tracking-tight">{title}</h4>
      {description && <p className="text-sm text-slate-500">{description}</p>}
    </div>
  );
}

export function TeamColumn({
  flagUrl,
  name,
  size = 'sm',
}: {
  flagUrl?: string;
  name: string;
  size?: 'sm' | 'lg';
}) {
  return (
    <div className="flex flex-col items-center flex-1">
      <img
        src={flagUrl || 'https://picsum.photos/seed/flag/64/64'}
        alt={name}
        className={cn(
          size === 'lg' ? 'w-16 h-16 md:w-20 md:h-20 mb-4' : 'w-12 h-12 mb-2',
          'rounded-full shadow-sm object-cover border border-slate-200'
        )}
      />
      <span
        className={cn(
          size === 'lg' ? 'text-sm md:text-base' : 'text-xs',
          'font-bold text-slate-900 text-center tracking-tight'
        )}
      >
        {name}
      </span>
    </div>
  );
}

export function PulseSkeleton({ blocks = ['h-48', 'h-48'] }: { blocks?: string[] }) {
  return (
    <div className="animate-pulse flex flex-col gap-6">
      {blocks.map((h, i) => (
        <div key={i} className={cn(h, 'bg-slate-200 rounded-2xl')} />
      ))}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <div className={cn('animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white', className)} />;
}
