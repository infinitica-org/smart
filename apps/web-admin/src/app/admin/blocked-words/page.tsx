'use client';

import { useEffect, useState } from 'react';
import type { BlockedWordDto } from '@smart/contracts';
import { isSmartApiError } from '@smart/api-client';
import { ShieldBan, Trash2 } from 'lucide-react';
import { Button } from '@smart/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@smart/ui/card';
import { PageHeader } from '@/components/page-header';
import {
  AdminInput,
  DataTable,
  EmptyState,
  Field,
  InlineAlert,
  PageStack,
  TableCell,
  TableRow,
} from '@/components/admin-ui';
import { api } from '@/lib/api';

export default function BlockedWordsPage() {
  const [words, setWords] = useState<BlockedWordDto[]>([]);
  const [newWord, setNewWord] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const { words } = await api.onboarding.listBlockedWords();
    setWords(words);
  }

  useEffect(() => {
    load().catch(() => setError('Failed to load the blocked-word list.'));
  }, []);

  async function addWord() {
    const word = newWord.trim();
    if (word.length < 2) {
      setError('Enter a word of at least 2 characters.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await api.onboarding.createBlockedWord({ word });
      setNewWord('');
      await load();
    } catch (err) {
      setError(isSmartApiError(err) ? err.message : 'Could not add that word.');
    } finally {
      setSubmitting(false);
    }
  }

  async function removeWord(id: string) {
    try {
      await api.onboarding.removeBlockedWord(id);
      await load();
    } catch (err) {
      setError(isSmartApiError(err) ? err.message : 'Could not remove that word.');
    }
  }

  return (
    <PageStack>
      <PageHeader
        icon={ShieldBan}
        tone="inverse"
        title="Blocked words"
        description="A candidate's username may not contain any word on this list (CN-T09)."
      />
      {error ? <InlineAlert tone="danger" title={error} /> : null}
      <Card>
        <CardHeader>
          <CardTitle>Add a word</CardTitle>
          <CardDescription>
            Stored lowercased; matched as a substring of the username.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-end gap-4">
          <Field label="Word" className="max-w-xs flex-1">
            <AdminInput
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              placeholder="e.g. admin"
            />
          </Field>
          <Button type="button" disabled={submitting} onClick={() => void addWord()}>
            Add
          </Button>
        </CardContent>
      </Card>
      {words.length === 0 ? (
        <EmptyState icon={ShieldBan}>No blocked words yet.</EmptyState>
      ) : (
        <DataTable headers={['Word', 'Added', 'Actions']}>
          {words.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell className="font-medium">{entry.word}</TableCell>
              <TableCell>{new Date(entry.createdAt).toLocaleDateString()}</TableCell>
              <TableCell>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => void removeWord(entry.id)}
                >
                  <Trash2 data-icon="inline-start" />
                  Remove
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
      )}
    </PageStack>
  );
}
