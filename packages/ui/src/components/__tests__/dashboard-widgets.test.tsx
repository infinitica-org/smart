import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Briefcase } from 'lucide-react';
import { FunnelPipeline, ProgressList } from '../dashboard/funnel-pipeline';

class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}

globalThis.IntersectionObserver =
  MockIntersectionObserver as unknown as typeof IntersectionObserver;

describe('FunnelPipeline', () => {
  it('renders the pipeline title and step labels', () => {
    render(
      <FunnelPipeline
        title="Placement pipeline"
        steps={[{ id: 'jd', label: 'JD Received', value: 24, icon: Briefcase }]}
      />,
    );

    expect(screen.getByText('Placement pipeline')).toBeDefined();
    expect(screen.getByText('JD Received')).toBeDefined();
  });
});

describe('ProgressList', () => {
  it('renders readiness bars as a percent of max', () => {
    render(
      <ProgressList
        title="Batch readiness"
        items={[{ id: 'cse', label: 'CSE', value: 74, max: 100 }]}
      />,
    );

    expect(screen.getByText('Batch readiness')).toBeDefined();
    expect(screen.getByText('CSE')).toBeDefined();
    expect(screen.getByText('74%')).toBeDefined();
  });
});
