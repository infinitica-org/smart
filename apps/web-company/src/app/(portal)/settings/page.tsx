import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@smart/ui/card';

export default function CompanySettingsPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-[#172033]">Settings</h1>
      <Card className="border-border/70 bg-white">
        <CardHeader>
          <CardTitle>Portal settings</CardTitle>
          <CardDescription>
            Notification preferences, billing, and team management are not available in this
            release.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/settings/blocked"
            className="text-sm font-medium text-primary hover:underline"
          >
            Blocked users
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
