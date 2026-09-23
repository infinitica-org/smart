'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ProjectDto } from '@smart/contracts';
import { Alert, Button } from '@smart/ui';
import { ArrowLeft } from 'lucide-react';
import { ProjectDefenseOutcomePanel } from '@/components/profile/ProjectDefenseOutcomePanel';
import { ProjectDefensePlayer } from '@/components/profile/ProjectDefensePlayer';
import { api } from '@/lib/api';
import { needsOwnershipInterview } from '@/lib/project-submission';

export default function ProjectDefensePage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const projectId = params.projectId;
  const [project, setProject] = useState<ProjectDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const dto = await api.projects.get(projectId);
        if (cancelled) return;
        if (dto.interviewStatus === 'COMPLETED') {
          setProject(dto);
          return;
        }
        if (!needsOwnershipInterview(dto)) {
          setError('This project does not need an ownership interview right now.');
          setProject(dto);
          return;
        }
        setProject(dto);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load project.');
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const backToProfile = () => {
    router.push('/profile');
  };

  if (error && !project) {
    return (
      <div className="mx-auto w-full max-w-[920px] space-y-6 pb-16">
        <BackLink />
        <Alert tone="danger" title="Interview unavailable">
          {error}
        </Alert>
        <Button type="button" onClick={backToProfile}>
          Back to profile
        </Button>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto w-full max-w-[920px] pb-16">
        <p className="text-sm text-muted-foreground">Loading interview…</p>
      </div>
    );
  }

  if (project.interviewStatus === 'COMPLETED') {
    return (
      <div className="mx-auto w-full max-w-[920px] space-y-6 pb-16">
        <BackLink />
        <Alert tone="success" title="Already complete">
          You have already finished the ownership interview for this project.
        </Alert>
        <ProjectDefenseOutcomePanel projectId={projectId} />
        <Button type="button" onClick={backToProfile}>
          Back to profile
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-[920px] space-y-6 pb-16">
        <BackLink />
        <Alert tone="warning" title="Cannot start">
          {error}
        </Alert>
        <Button type="button" onClick={backToProfile}>
          Back to profile
        </Button>
      </div>
    );
  }

  return (
    <ProjectDefensePlayer
      project={project}
      onClose={backToProfile}
      onComplete={() => {
        void api.projects.get(projectId).then(setProject);
      }}
    />
  );
}

function BackLink() {
  return (
    <Link
      href="/profile"
      className="inline-flex items-center gap-2 text-sm font-medium text-[#00967c] transition hover:text-[#007a65]"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to profile
    </Link>
  );
}
