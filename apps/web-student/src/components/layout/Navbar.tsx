'use client';

import { Bell } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { queryKeys } from '@smart/api-client';
import type { NotificationDto } from '@smart/contracts';
import { cn, useMutation, useQuery, useQueryClient } from '@smart/ui';
import { initialsOf, useCurrentUser } from '@/lib/candidate-identity';
import { api } from '@/lib/api';

const navItems = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Applications', href: '/applications' },
  { name: 'Assessments', href: '/assessments' },
  { name: 'Interviews', href: '/interviews' },
  { name: 'Profile', href: '/profile' },
];

const POLL_MS = 30_000;

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${String(minutes)}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${String(hours)}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${String(days)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: user } = useCurrentUser();
  const initials = initialsOf(user?.fullName);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: queryKeys.myNotifications(),
    queryFn: () => api.notifications.list(),
    refetchInterval: POLL_MS,
  });
  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const markRead = useMutation({
    mutationFn: (notificationId: string) => api.notifications.markRead(notificationId),
    onSuccess: (updated) => {
      queryClient.setQueryData(
        queryKeys.myNotifications(),
        (prev: { notifications: NotificationDto[]; unreadCount: number } | undefined) => {
          if (!prev) return prev;
          return {
            notifications: prev.notifications.map((n) =>
              n.notificationId === updated.notificationId ? updated : n,
            ),
            unreadCount: Math.max(0, prev.unreadCount - (updated.readAt ? 1 : 0)),
          };
        },
      );
    },
  });

  const openNotification = (notification: NotificationDto) => {
    if (!notification.readAt) markRead.mutate(notification.notificationId);
    setNotificationsOpen(false);
    if (notification.linkUrl) {
      const url = new URL(notification.linkUrl);
      router.push(url.pathname + url.search);
    }
  };

  return (
    <header className="relative z-40 flex h-[72px] shrink-0 items-center gap-4 border-b border-white/[0.06] bg-[#0f0f0f] px-4 md:h-24 md:px-8">
      <Link href="/dashboard" className="relative h-10 w-24 shrink-0 md:w-28" aria-label="SMART">
        <Image
          src="/img/Logo/white-logo.png"
          alt="SMART"
          fill
          sizes="112px"
          className="object-contain object-left"
          priority
        />
      </Link>

      <div className="flex min-w-0 flex-1 justify-center">
        <nav
          aria-label="Candidate console"
          className="scrollbar-none flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full border border-white/[0.06] bg-white/[0.03] p-1"
        >
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'shrink-0 rounded-full px-3.5 py-2 text-[14px] font-medium whitespace-nowrap transition-colors md:px-4',
                  active
                    ? 'bg-[#1f1f1f] text-white shadow-sm'
                    : 'text-white/40 hover:text-white/80',
                )}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotificationsOpen((v) => !v)}
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.03] text-white/50 hover:text-white"
            aria-label={
              unreadCount > 0 ? `Notifications, ${String(unreadCount)} unread` : 'Notifications'
            }
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 ? (
              <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-[#00fad0]" />
            ) : null}
          </button>
          {notificationsOpen ? (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 cursor-default"
                aria-label="Close notifications"
                onClick={() => setNotificationsOpen(false)}
              />
              <div className="absolute right-0 z-50 mt-2 w-80 max-h-[70vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#161616] p-2 shadow-xl">
                <p className="px-2 py-2 text-sm font-medium text-white">Notifications</p>
                {notifications.length === 0 ? (
                  <p className="px-2 pb-2 text-xs text-white/40">No notifications yet.</p>
                ) : (
                  <ul className="flex flex-col gap-0.5">
                    {notifications.map((notification) => (
                      <li key={notification.notificationId}>
                        <button
                          type="button"
                          onClick={() => openNotification(notification)}
                          className={cn(
                            'flex w-full flex-col gap-0.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-white/5',
                            !notification.readAt && 'bg-[#00fad0]/[0.06]',
                          )}
                        >
                          <span className="flex items-start justify-between gap-2">
                            <span className="text-[13px] font-medium text-white">
                              {notification.title}
                            </span>
                            {!notification.readAt ? (
                              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#00fad0]" />
                            ) : null}
                          </span>
                          <span className="text-xs text-white/50">{notification.body}</span>
                          <span className="text-[11px] text-white/30">
                            {timeAgo(notification.createdAt)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : null}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-semibold text-black">
          {initials}
        </div>
      </div>
    </header>
  );
}
