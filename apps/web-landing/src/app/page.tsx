import Hero from '@/components/Hero';
import ByTheNumbers from '@/components/ByTheNumbers';
import Problem from '@/components/Problem';
import Audiences from '@/components/Audiences';
import ClosingCTA from '@/components/ClosingCTA';

export default function LandingPage() {
  return (
    <main>
      <Hero />
      <ByTheNumbers />
      <Problem />
      <Audiences />
      <ClosingCTA />
    </main>
  );
}
