'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@smart/ui';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Target,
  Layers,
  FileText,
  Settings,
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Candidates', href: '/students', icon: Users },
  { name: 'Placements', href: '/placements', icon: Briefcase },
  { name: 'Opportunities', href: '/opportunities', icon: Target },
  { name: 'Batches', href: '/batches', icon: Layers },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function TpoSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-64 border-r border-white/5 bg-[#131313] flex-col h-screen sticky top-0 left-0 z-40 shrink-0 font-sans">
      {/* Brand / Logo Area */}
      <div className="h-16 flex items-center px-6 border-b border-white/5 shrink-0">
        <Link href="/" className="flex items-center gap-3">
          <img src="/wordmark-white.svg" alt="SMART" className="w-32 h-8" />
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}`));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-full text-sm font-medium transition-all group',
                isActive
                  ? 'bg-[#004c63]/40 text-[#00fad0] shadow-sm'
                  : 'text-gray-400 hover:bg-white/5 hover:text-white',
              )}
            >
              <item.icon
                className={cn(
                  'w-4 h-4',
                  isActive ? 'text-[#00fad0]' : 'text-gray-500 group-hover:text-gray-300',
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer Area - Plan / User */}
      <div className="p-4 border-t border-white/5 shrink-0">
        <div className="bg-[#161616] rounded-xl p-4 border border-white/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-[#00fad0]/10 blur-xl -mr-8 -mt-8" />
          <div className="text-xs font-semibold text-white mb-1 relative z-10">
            Institution Plan
          </div>
          <div className="text-[11px] text-[#00fad0] mb-1 relative z-10 font-medium">
            Pro Member
          </div>
          <div className="text-[10px] text-gray-500 relative z-10">Verification complete</div>
        </div>
      </div>
    </aside>
  );
}
