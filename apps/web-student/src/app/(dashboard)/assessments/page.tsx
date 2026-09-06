'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, FileText } from 'lucide-react';
import {
  skillFocusOptions,
  type SkillClaimDto,
  type SkillProficiency,
  type TrackCode,
} from '@smart/contracts';
import { api } from '@/lib/api';
import { SkillVerifyRow } from '@/components/assessment/skill-verify-row';
import { isSdeV4Verifiable, skillNameForCode } from '@/lib/skill-declarations';
import {
  clearLastL1AttemptId,
  isResumableSession,
  playerErrorFromUnknown,
  readLastL1AttemptId,
  resolveL1TrackCode,
  startL1Request,
  writeLastL1AttemptId,
} from '@/lib/l1-mcq';
import { cn } from '@smart/ui';

export default function AssessmentsPage() {
  const router = useRouter();
  const [trackCode, setTrackCode] = useState<TrackCode | null>(null);
  const [resumeAttemptId, setResumeAttemptId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [skillClaims, setSkillClaims] = useState<SkillClaimDto[]>([]);
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [foci, setFoci] = useState<Record<string, string>>({});
  const [proficiencies, setProficiencies] = useState<Record<string, SkillProficiency>>({});
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const [me, claims] = await Promise.all([
          api.auth.me(),
          api.assessment.listSkillClaims().catch(() => [] as SkillClaimDto[]),
        ]);
        const enrolled = resolveL1TrackCode(me);
        if (cancelled) return;
        setTrackCode(enrolled);
        setSkillClaims(claims);
        setFoci((prev) => {
          const next = { ...prev };
          for (const claim of claims) {
            const options = skillFocusOptions(claim.skillCode);
            next[claim.skillCode] = prev[claim.skillCode] ?? options[0] ?? '';
          }
          return next;
        });
        setProficiencies((prev) => {
          const next = { ...prev };
          for (const claim of claims) {
            next[claim.skillCode] = prev[claim.skillCode] ?? claim.proficiency;
          }
          return next;
        });
        if (!enrolled) {
          setResumeAttemptId(null);
          return;
        }
        const stored = readLastL1AttemptId();
        if (!stored) {
          setResumeAttemptId(null);
          return;
        }
        try {
          const session = await api.assessment.session(stored);
          if (cancelled) return;
          if (isResumableSession(session)) {
            setResumeAttemptId(session.attemptId);
          } else {
            clearLastL1AttemptId();
            setResumeAttemptId(null);
          }
        } catch {
          if (cancelled) return;
          clearLastL1AttemptId();
          setResumeAttemptId(null);
        }
      } catch (err) {
        if (!cancelled) setError(playerErrorFromUnknown(err).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const startOrResume = async () => {
    if (resumeAttemptId) {
      router.push(`/assessments/${resumeAttemptId}`);
      return;
    }
    if (!trackCode) {
      setError('Enroll in a track before starting Level 1.');
      return;
    }
    setStarting(true);
    setError(null);
    try {
      const session = await api.assessment.start(startL1Request(trackCode));
      writeLastL1AttemptId(session.attemptId);
      router.push(`/assessments/${session.attemptId}`);
    } catch (err) {
      setError(playerErrorFromUnknown(err).message);
    } finally {
      setStarting(false);
    }
  };

  const listedClaims = useMemo(
    () => skillClaims.filter((claim) => isSdeV4Verifiable(claim.skillCode)),
    [skillClaims],
  );

  const verifySkill = (claim: SkillClaimDto) => {
    setError(null);
    setPendingCode(claim.skillCode);
    startTransition(() => {
      void (async () => {
        try {
          let next = claim;
          if (claim.status === 'DECLARED' || claim.status === 'BEGINNER_REATTEMPT') {
            next = await api.assessment.declareSkillClaim({
              skillCode: claim.skillCode,
              proficiency: proficiencies[claim.skillCode] ?? claim.proficiency,
              skillFocus: foci[claim.skillCode] || undefined,
            });
          }
          router.push(`/assessments/skills/${next.claimId}`);
        } catch (err) {
          setError(err instanceof Error ? err.message : playerErrorFromUnknown(err).message);
        } finally {
          setPendingCode(null);
        }
      })();
    });
  };

  const title = trackCode ? `${trackCode.replaceAll('_', ' ')} · Level 1 MCQ` : 'Level 1 MCQ';

  return (
    <div className="mx-auto w-full max-w-[920px] space-y-8 pb-16">
      <div>
        <h1 className="font-display text-4xl font-medium tracking-tight text-white">Assessments</h1>
        <p className="mt-2 text-sm text-white/40">
          Start or resume the L1 MCQ for your enrolled track. The server owns the clock. Scores are
          not shown here.
        </p>
        {error ? <p className="mt-3 text-sm text-amber-300">{error}</p> : null}
      </div>

      {loading ? (
        <p className="text-sm text-white/50" aria-live="polite">
          Loading enrollment…
        </p>
      ) : null}

      {!loading && !trackCode ? (
        <section className="rounded-[28px] border border-white/10 bg-[#141414] p-5">
          <h2 className="text-base font-medium text-white">No enrolled track</h2>
          <p className="mt-2 text-sm text-white/40">
            Level 1 cannot start until you enroll in a primary track. A catalog fallback is not
            used.
          </p>
          <Link
            href="/enroll"
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#00fad0] px-5 py-2.5 text-sm font-semibold text-black"
          >
            Enroll in a track <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      ) : null}

      {!loading && trackCode ? (
        <section className="space-y-3">
          <p className="text-[11px] font-semibold tracking-wider text-white/35 uppercase">
            Enrolled track
          </p>
          <div className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-[#141414] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#00fad0]/10 text-[#00fad0]">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-medium text-white">{title}</h3>
                <p className="mt-1 text-xs text-white/35">
                  {resumeAttemptId
                    ? 'An in-progress attempt is on the server. Resume to continue.'
                    : 'Starts Level 1. If an attempt is already open, the server returns it.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={starting}
              onClick={() => void startOrResume()}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full bg-[#00fad0] px-5 py-2.5 text-sm font-semibold text-black',
                starting && 'opacity-70',
              )}
            >
              {starting ? 'Starting…' : resumeAttemptId ? 'Resume' : 'Start'}{' '}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      ) : null}

      {!loading ? (
        <section className="space-y-3">
          <p className="text-[11px] font-semibold tracking-wider text-white/35 uppercase">
            Skill verification
          </p>
          {listedClaims.length === 0 ? (
            <p className="text-sm text-white/40">
              Declare a mapped Software &amp; IT skill on Profile, then start it here. Opens the
              proctored player — not Level 1.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {listedClaims.map((claim) => {
                const options = skillFocusOptions(claim.skillCode);
                const busy = pendingCode === claim.skillCode;
                return (
                  <SkillVerifyRow
                    key={claim.claimId}
                    skillCode={claim.skillCode}
                    skillName={skillNameForCode(claim.skillCode)}
                    claim={claim}
                    proficiency={proficiencies[claim.skillCode] ?? claim.proficiency}
                    focus={foci[claim.skillCode] ?? options[0] ?? ''}
                    pending={busy || isPending}
                    onProficiency={(value) =>
                      setProficiencies((prev) => ({ ...prev, [claim.skillCode]: value }))
                    }
                    onFocus={(value) => setFoci((prev) => ({ ...prev, [claim.skillCode]: value }))}
                    onVerify={() => verifySkill(claim)}
                  />
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      <p className="text-center text-xs text-white/25">
        <Link href="/dashboard" className="text-[#00fad0] hover:underline">
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}
