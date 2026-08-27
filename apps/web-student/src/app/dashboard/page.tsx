'use client';

import { useEffect, useState } from 'react';
import {
  AppShell,
  Alert,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  LevelStepper,
  TierBadge,
} from '@smart/ui';
import { api } from '../../lib/api';
import type { AuthenticatedUser } from '@smart/contracts';

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
        <Card>
          <CardHeader>
            <CardTitle>Certification model</CardTitle>
            <CardDescription>
              Gold / Silver / Bronze is criterion-referenced, never a curve.
            </CardDescription>
          </CardHeader>
          <div className="p-6 pt-0 flex flex-wrap gap-2">
            <TierBadge tier="GOLD" showLabel />
            <TierBadge tier="SILVER" showLabel />
            <TierBadge tier="BRONZE" showLabel />
          </div>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Level progression</CardTitle>
            <CardDescription>
              A level unlocks only at Bronze or above on the level below.
            </CardDescription>
          </CardHeader>
          <div className="p-6 pt-0">
            <LevelStepper unlockedThrough={1} current={1} />
          </div>
        </Card>
        <Button onClick={() => window.alert('Start assessment coming in Sprint 2')}>
          Start Level 1
        </Button>
      </div>
    </AppShell>
  );
}
