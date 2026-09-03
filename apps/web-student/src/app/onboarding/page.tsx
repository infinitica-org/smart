import { OnboardingExitGate } from '../../components/layout/OnboardingExitGate';
import OnboardingWizard from '../../components/onboarding/OnboardingWizard';

export default function OnboardingPage() {
  return (
    <OnboardingExitGate>
      <OnboardingWizard />
    </OnboardingExitGate>
  );
}
