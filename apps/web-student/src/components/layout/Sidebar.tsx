'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn, SmartLogo } from '@smart/ui';
import { LayoutDashboard, Briefcase, FileText, Video, Search, Lock } from 'lucide-react';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'My Applications', href: '/applications', icon: Briefcase },
  { name: 'Skills', href: '/assessments', icon: FileText },
  { name: 'Interviews', href: '/interviews', icon: Video },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-64 border-r border-white/5 bg-[#111111] flex-col h-screen sticky top-0 left-0 z-40 shrink-0">
      {/* Brand / Logo Area */}
      <div className="h-16 flex items-center px-6 border-b border-white/5 shrink-0">
        <Link href="/dashboard" className="flex items-center gap-3">
          <SmartLogo tone="on-dark" className="h-6 w-auto" />
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group',
                isActive
                  ? 'bg-foreground/10 text-foreground shadow-sm'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white',
              )}
            >
              <item.icon
                className={cn(
                  'w-4 h-4',
                  isActive ? 'text-foreground' : 'text-gray-500 group-hover:text-gray-300',
                )}
              />
              {item.name}
            </Link>
          );
        })}

        {/* Separator */}
        <div className="h-px bg-white/5 my-4 mx-3" />

        {/* Jobs Feed (V2) - Disabled for now */}
        <div className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 bg-white/5 cursor-not-allowed group relative overflow-hidden">
          <div className="flex items-center gap-3">
            <Search className="w-4 h-4 text-gray-600" />
            Jobs Feed
          </div>
          <Lock className="w-3.5 h-3.5 text-gray-700" />

          {/* Tooltip */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-xs text-foreground">Coming Soon (V2)</span>
          </div>
        </div>
      </nav>

      {/* Footer Area - Profile Completion */}
      <div className="p-4 border-t border-white/5 shrink-0">
        <div className="bg-[#161616] rounded-xl p-4 border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-foreground/10 blur-xl -mr-8 -mt-8" />
          <div className="text-xs font-semibold text-white mb-1 relative z-10">
            Profile Strength
          </div>
          <div className="text-[11px] text-gray-400 mb-3 relative z-10">
            Verification in progress
          </div>
          <div className="w-full bg-white/10 rounded-full h-1.5 relative z-10">
            <div className="bg-foreground h-1.5 rounded-full w-[65%] shadow-[0_0_10px_rgba(19,19,19,0.5)]" />
          </div>
        </div>
      </div>
    </aside>
  );
}
