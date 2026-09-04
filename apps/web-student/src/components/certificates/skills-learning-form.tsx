'use client';

import { useState } from 'react';
import type { CandidateCertificateDto } from '@smart/contracts';
import { Button } from '@smart/ui';
import { SkillPicker, type CertificateSkillSelection } from './skill-picker';
import { ToolsPicker } from './tools-picker';

interface SkillsLearningFormProps {
  certificate: CandidateCertificateDto;
  onSaveSkills: (skills: CertificateSkillSelection[]) => void;
  savingSkills?: boolean;
  onSaveLearning: (fields: {
    learningDescription: string;
    tools: string[];
    practicalApplied: boolean;
    practicalDescription?: string;
  }) => void;
  savingLearning?: boolean;
}

export function SkillsLearningForm({
  certificate,
  onSaveSkills,
  savingSkills,
  onSaveLearning,
  savingLearning,
}: SkillsLearningFormProps) {
  const [skills, setSkills] = useState<CertificateSkillSelection[]>(() =>
    certificate.skills.map((skill) => ({
      skillCode: skill.skillCode,
      selfAssessedProficiency: skill.selfAssessedProficiency,
    })),
  );
  const [learningDescription, setLearningDescription] = useState(
    certificate.learningDescription ?? '',
  );
  const [tools, setTools] = useState<string[]>(certificate.tools);
  const [practicalApplied, setPracticalApplied] = useState<boolean | null>(
    certificate.practicalApplied,
  );
  const [practicalDescription, setPracticalDescription] = useState(
    certificate.practicalDescription ?? '',
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">Skills you&apos;ll practice</h3>
          <p className="text-xs text-white/45">
            What skills will you practice or demonstrate through this certificate?
          </p>
        </div>
        <SkillPicker selected={skills} onChange={setSkills} disabled={savingSkills} />
        <Button
          type="button"
          variant="outline"
          disabled={savingSkills || skills.length === 0}
          onClick={() => onSaveSkills(skills)}
        >
          {savingSkills ? 'Saving…' : 'Save skills'}
        </Button>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 pt-6">
        <div>
          <h3 className="text-sm font-semibold text-white">What you&apos;ll learn</h3>
          <p className="text-xs text-white/45">What did you learn from this certification?</p>
        </div>
        <textarea
          rows={4}
          value={learningDescription}
          onChange={(event) => setLearningDescription(event.target.value)}
          placeholder="Describe what you learned…"
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:border-[#00fad0]/50 focus:outline-none"
        />
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 pt-6">
        <div>
          <h3 className="text-sm font-semibold text-white">Tools you&apos;ll use</h3>
          <p className="text-xs text-white/45">
            Which tools and technologies did you learn or use?
          </p>
        </div>
        <ToolsPicker tools={tools} onChange={setTools} />
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 pt-6">
        <div>
          <h3 className="text-sm font-semibold text-white">Practical Application</h3>
          <p className="text-xs text-white/45">
            Did you apply these skills in a project or practical task?
          </p>
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-white/80">
            <input
              type="radio"
              name="practicalApplied"
              checked={practicalApplied === true}
              onChange={() => setPracticalApplied(true)}
            />
            Yes
          </label>
          <label className="flex items-center gap-2 text-sm text-white/80">
            <input
              type="radio"
              name="practicalApplied"
              checked={practicalApplied === false}
              onChange={() => setPracticalApplied(false)}
            />
            No
          </label>
        </div>
        {practicalApplied ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-white/45">What did you build or practice?</span>
            <textarea
              rows={3}
              value={practicalDescription}
              onChange={(event) => setPracticalDescription(event.target.value)}
              placeholder="Describe your project or practical experience…"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-600 focus:border-[#00fad0]/50 focus:outline-none"
            />
          </div>
        ) : null}

        <div>
          <Button
            type="button"
            variant="outline"
            disabled={
              savingLearning ||
              learningDescription.trim().length < 10 ||
              practicalApplied === null ||
              (practicalApplied && practicalDescription.trim().length === 0)
            }
            onClick={() =>
              onSaveLearning({
                learningDescription: learningDescription.trim(),
                tools,
                practicalApplied: practicalApplied ?? false,
                practicalDescription: practicalDescription.trim() || undefined,
              })
            }
          >
            {savingLearning ? 'Saving…' : 'Save learning details'}
          </Button>
        </div>
      </div>
    </div>
  );
}
