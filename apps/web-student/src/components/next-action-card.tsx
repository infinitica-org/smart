import { Button, Card, CardDescription, CardHeader, CardTitle } from '@smart/ui';

export interface NextActionCardProps {
  enrolled: boolean;
  completedLevels: number;
}

export function NextActionCard({ enrolled, completedLevels }: NextActionCardProps) {
  if (!enrolled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Welcome to SMART</CardTitle>
          <CardDescription>
            You have not enrolled in any track yet. Complete your enrollment to begin your
            certification journey.
          </CardDescription>
        </CardHeader>
        <div className="p-6 pt-0">
          <Button onClick={() => (window.location.href = '/onboarding')}>
            Complete enrollment
          </Button>
        </div>
      </Card>
    );
  }

  if (completedLevels === 5) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Congratulations!</CardTitle>
          <CardDescription>
            You have successfully completed all levels in this track.
          </CardDescription>
        </CardHeader>
        <div className="p-6 pt-0">
          <Button onClick={() => window.alert('Certificates coming soon')}>
            View Certificates
          </Button>
        </div>
      </Card>
    );
  }

  const nextLevel = completedLevels + 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Next Action</CardTitle>
        <CardDescription>
          {completedLevels === 0
            ? 'Your track is ready. Start your first level to begin your certification.'
            : `You have cleared Level ${completedLevels}. Start Level ${nextLevel} to continue your progression.`}
        </CardDescription>
      </CardHeader>
      <div className="p-6 pt-0">
        <Button onClick={() => window.alert(`Start assessment coming in Sprint 2`)}>
          Start Level {nextLevel}
        </Button>
      </div>
    </Card>
  );
}
