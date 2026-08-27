'use client';

import { useEffect, useState } from 'react';
import {
  AppShell,
  Alert,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  LevelStepper,
  TierTrail,
} from '@smart/ui';
import { api } from '../../lib/api';
import type { AuthenticatedUser } from '@smart/contracts';
import { NextActionCard } from '../../components/next-action-card';

// Isolated mock state for student progression
const mockProgress = {
  completedLevels: 1,
  currentLevel: 2 as const,
  tiers: [{ level: 1, tier: 'SILVER' as const }],
};

export default function DashboardPage() {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const me = await api.auth.me();
        setUser(me);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const enrolled = !!user?.primaryTrack;

  return (
    <AppShell
      productName="SMART · Candidate"
      title="Student Dashboard"
      subtitle={loading ? 'Loading...' : `Welcome back, ${user?.fullName || 'Student'}`}
    >
      <div className="grid gap-6">
        <Alert tone="info" title="Sprint 1 Progress">
          You have successfully completed the authentication and enrollment flow.
        </Alert>

        <NextActionCard enrolled={enrolled} completedLevels={mockProgress.completedLevels} />

        {enrolled && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Level progression</CardTitle>
                <CardDescription>
                  A level unlocks only at Bronze or above on the level below.
                </CardDescription>
              </CardHeader>
              <div className="p-6 pt-0 overflow-x-auto">
                <LevelStepper
                  unlockedThrough={mockProgress.currentLevel}
                  current={mockProgress.currentLevel}
                />
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tier history</CardTitle>
                <CardDescription>
                  Gold / Silver / Bronze is criterion-referenced, never a curve.
                </CardDescription>
              </CardHeader>
              <div className="p-6 pt-0">
                <TierTrail tiers={mockProgress.tiers} />
              </div>
            </Card>
          </>
        )}
      </div>
    </AppShell>
  );
}
