'use client';

import { usePathname } from 'next/navigation';
import { Search, Bell, MenuIcon, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@smart/ui';

function getBreadcrumb(pathname: string) {
  if (pathname === '/' || pathname === '/dashboard') return 'Dashboard';
  const path = pathname.split('/')[1];
  if (!path) return 'Dashboard';
  return path.charAt(0).toUpperCase() + path.slice(1);
}

export function TpoTopbar() {
  const pathname = usePathname();
  const title = getBreadcrumb(pathname);

  return (
    <header className="h-[66px] flex items-center justify-between px-8 bg-[#0a0a0a] border-b border-white/5 text-white shrink-0 font-sans">
      {/* Left side: Breadcrumbs / Title */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-md font-medium text-gray-500">
          <span>SMART</span>
          <ChevronRight className="w-3 h-3" />
          <span>Academia</span>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-300">{title}</span>
        </div>
      </div>

      {/* Right side: Actions */}
      <div className="flex items-center gap-6">
        {/* Search */}
        <div className="hidden md:flex relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-[#00fad0] transition-colors" />
          <input
            type="text"
            placeholder="Search candidates, JDs..."
            className="w-[280px] bg-[#131313] text-white text-sm rounded-full py-2 pl-10 pr-4 border border-white/5 focus:outline-none focus:border-[#00fad0]/50 focus:bg-[#161616] placeholder-gray-600 transition-all"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden lg:flex">
            <span className="text-[10px] text-gray-600 border border-gray-700/50 rounded px-1.5 py-0.5">
              ⌘K
            </span>
          </div>
        </div>

        <div className="w-px h-6 bg-white/10 hidden md:block"></div>

        {/* Notifications */}
        <button className="relative p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/5">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#00fad0] rounded-full border-2 border-[#0a0a0a]"></span>
        </button>

        {/* Profile */}
        <div className="flex items-center gap-3 pl-2 border-l border-white/5">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-medium text-white">Dr. Satheswaran</span>
            <span className="text-xs text-gray-500">Placement Officer</span>
          </div>
          <button className="rounded-full border-2 border-transparent hover:border-white/10 transition-colors focus:outline-none focus:border-[#00fad0]/50">
            <Avatar className="w-9 h-9">
              <AvatarImage src="https://i.pravatar.cc/150?u=a042581f4e29026704d" />
              <AvatarFallback>TPO</AvatarFallback>
            </Avatar>
          </button>
        </div>

        {/* Mobile menu trigger */}
        <button className="lg:hidden p-2 text-gray-400 hover:text-white transition-colors">
          <MenuIcon className="w-6 h-6" />
        </button>
      </div>
    </header>
  );
}
