'use client';

import { useState } from 'react';
import type { BlockedUser } from '@smart/contracts';
import { UserX } from 'lucide-react';
import { useMutation, useQuery, useQueryClient, useSmartApi } from '../api-provider';
import { Button } from '../components/button';
import { ConfirmDialog } from '../components/confirm-dialog';
import { EmptyState, ErrorState, LoadingState } from '../components/common-states';
import { ParticipantAvatar } from './participant-avatar';
import { messageErrorText } from './messaging-utils';

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

/** Th6-427 — the people I blocked, each with an Unblock button behind a confirm dialog. */
export function BlockedUsersList() {
  const api = useSmartApi();
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<BlockedUser | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const blocks = useQuery({
    queryKey: ['messaging', 'blocks'],
    queryFn: () => api.messaging.listBlocks(),
    retry: false,
  });
  const unblock = useMutation({
    mutationFn: (userId: string) => api.messaging.unblock(userId),
    onSuccess: (_result, userId) => {
      const name = target?.userId === userId ? target.name : 'this person';
      setTarget(null);
      setNotice(`${name} was unblocked.`);
      void queryClient.invalidateQueries({ queryKey: ['messaging'] });
    },
  });

  if (blocks.isLoading) return <LoadingState message="Loading blocked users…" />;
  if (blocks.error) {
    return (
      <ErrorState
        title="Could not load blocked users"
        message={messageErrorText(blocks.error)}
        onRetry={() => void blocks.refetch()}
      />
    );
  }
  const list = blocks.data?.blocks ?? [];

  return (
    <div className="space-y-3">
      {notice ? (
        <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
          {notice}
        </p>
      ) : null}
      {list.length === 0 ? (
        <EmptyState
          icon={UserX}
          title="You haven't blocked anyone"
          description="People you block can't message you, and you can't message them. You can block someone from a conversation."
        />
      ) : (
        <ul
          aria-label="Blocked users"
          className="divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800"
        >
          {list.map((person) => (
            <li key={person.userId} className="flex items-center gap-3 px-4 py-3">
              <ParticipantAvatar name={person.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{person.name}</p>
                <p className="text-xs text-neutral-500">
                  Blocked {dateFormat.format(new Date(person.blockedAt))}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  unblock.reset();
                  setNotice(null);
                  setTarget(person);
                }}
                aria-label={`Unblock ${person.name}`}
              >
                Unblock
              </Button>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={target !== null}
        onClose={() => setTarget(null)}
        onConfirm={() => {
          if (target) unblock.mutate(target.userId);
        }}
        title={`Unblock ${target?.name ?? 'this person'}?`}
        description="You will both be able to message each other again. Earlier conversations stay hidden until someone writes."
        confirmText="Unblock"
        variant="primary"
        isLoading={unblock.isPending}
        error={unblock.error ? messageErrorText(unblock.error) : null}
      />
    </div>
  );
}
