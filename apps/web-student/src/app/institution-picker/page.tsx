'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  AppShell,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  Alert,
  Input,
} from '@smart/ui';
import { Search, MapPin } from 'lucide-react';
import { smartFetch } from '../../lib/api';

interface Institution {
  id: string;
  name: string;
  location: string;
  type: string;
}

export default function InstitutionPickerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch mock institutions
    const fetchInstitutions = async () => {
      try {
        const res = await smartFetch(
          (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000') + '/institutions',
        );
        if (res.ok) {
          const data = await res.json();
          setInstitutions(data);
        }
      } catch (err) {
        console.error('Failed to fetch institutions', err);
      }
    };
    fetchInstitutions();
  }, []);

  const filteredInstitutions = institutions.filter(
    (inst) =>
      inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.location.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleSelect = async () => {
    if (!selectedId) return;

    setLoading(true);
    setError(null);
    try {
      // Typically, you'd call an endpoint to set the active institution
      await new Promise((resolve) => setTimeout(resolve, 500));
      router.push('/enroll');
    } catch (err: unknown) {
      console.error(err);
      setError('Failed to select institution. Please try again.');
      setLoading(false);
    }
  };

  return (
    <AppShell
      productName="SMART"
      title="Select Institution"
      subtitle="You belong to multiple institutions"
    >
      <div className="mx-auto mt-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Pick your institution</CardTitle>
            <CardDescription>
              Choose the institution to proceed with for this session.
            </CardDescription>
          </CardHeader>
          <div className="p-6 pt-0 flex flex-col gap-6">
            {error && (
              <Alert tone="danger" title="Error">
                {error}
              </Alert>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Search institution by name or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  startIcon={<Search className="h-4 w-4" />}
                />
              </div>
              <Button variant="outline" className="shrink-0 text-sm">
                Filter ▼
              </Button>
            </div>

            <div className="flex flex-col gap-3 min-h-[300px]">
              {institutions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-[var(--text-muted)] space-y-2 border rounded-lg bg-[var(--surface-muted)]">
                  <div className="animate-pulse flex flex-col items-center gap-2">
                    <div className="h-4 w-32 bg-[var(--surface-border)] rounded"></div>
                    <div className="h-3 w-48 bg-[var(--surface-border)] rounded"></div>
                  </div>
                </div>
              ) : filteredInstitutions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-[var(--text-muted)] border border-dashed rounded-lg">
                  <p>No institutions found</p>
                  <p className="text-sm">Try adjusting your search terms</p>
                </div>
              ) : (
                filteredInstitutions.map((inst) => {
                  const isSelected = selectedId === inst.id;
                  return (
                    <div
                      key={inst.id}
                      onClick={() => setSelectedId(inst.id)}
                      className={`
                        relative flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all
                        ${
                          isSelected
                            ? 'border-[var(--brand)] bg-[var(--brand)]/5 ring-1 ring-[var(--brand)]'
                            : 'border-[var(--surface-border)] hover:border-[var(--brand)]/50 hover:bg-[var(--surface-muted)]'
                        }
                      `}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`
                            flex h-10 w-10 shrink-0 items-center justify-center rounded-full border
                            ${isSelected ? 'text-white border-transparent' : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'}
                          `}
                          style={isSelected ? { backgroundColor: 'var(--brand)' } : {}}
                        >
                          {inst.name.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm text-[var(--text-primary)]">
                            {inst.name}
                          </span>
                          <span className="text-xs text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" />
                            {inst.location}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="hidden sm:inline-flex items-center rounded-md bg-[var(--surface-muted)] px-2 py-1 text-xs font-medium text-[var(--text-muted)] ring-1 ring-inset ring-[var(--surface-border)]">
                          {inst.type}
                        </span>
                        <div
                          className={`
                          flex h-5 w-5 items-center justify-center rounded-full border
                          ${isSelected ? 'border-[var(--brand)]' : 'border-[var(--text-muted)] opacity-50'}
                        `}
                        >
                          {isSelected && (
                            <div
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: 'var(--brand)' }}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-[var(--surface-border)]">
              <Button
                variant="primary"
                onClick={handleSelect}
                disabled={!selectedId || loading}
                className="w-full sm:w-auto min-w-[140px]"
              >
                {loading ? 'Continuing...' : 'Continue →'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
