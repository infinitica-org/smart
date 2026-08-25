import Link from 'next/link';
import {
  Alert,
  Button,
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
  LevelStepper,
} from '@smart/ui';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="mx-auto max-w-2xl py-6 animate-fade-in flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Link href="/" passHref legacyBehavior>
          <Button variant="outline" size="sm">
            ← Return to Search
          </Button>
        </Link>
        <span className="text-xs font-mono text-[var(--text-muted)] bg-[var(--surface)] border border-[var(--surface-border)] px-3 py-1 rounded-md">
          ID: {id}
        </span>
      </div>

      <Alert tone="success" title="Signature Validated">
        This certificate is verified and registered on the SMART platform.
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Harish Kumar</CardTitle>
          <CardDescription>Specialisation Track: MBA Finance</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Level Progression & Status</CardTitle>
          <CardDescription>Highest Level cleared at Bronze or above.</CardDescription>
        </CardHeader>
        <div className="px-6 pb-6">
          <LevelStepper unlockedThrough={3} current={3} />
        </div>
      </Card>
    </div>
  );
}
