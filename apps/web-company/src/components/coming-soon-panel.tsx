import { Card, CardDescription, CardHeader, CardTitle } from '@smart/ui/card';

export function ComingSoonPanel({ title, description }: { title: string; description: string }) {
  return (
    <Card className="border-dashed border-border/80 bg-white">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
    </Card>
  );
}
