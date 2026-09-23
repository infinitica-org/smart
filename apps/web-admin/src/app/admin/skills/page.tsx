'use client';

import type { SkillRetakePolicyDto } from '@smart/contracts';
import { isSmartApiError } from '@smart/api-client';
import { RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@smart/ui/button';
import { PageHeader } from '@/components/page-header';
import {
  AdminInput,
  DataTable,
  EmptyState,
  InlineAlert,
  PageStack,
  TableCell,
  TableRow,
} from '@/components/admin-ui';
import { api } from '@/lib/api';

export default function SkillsRetakePolicyPage() {
  const [skills, setSkills] = useState<SkillRetakePolicyDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await api.onboarding.listSkillRetakePolicies();
      setSkills(result.skills);
    } catch (err) {
      setError(isSmartApiError(err) ? err.message : 'Failed to load skill policies.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(skill: SkillRetakePolicyDto) {
    setSubmittingId(skill.skillId);
    setError(null);
    setSuccess(null);
    try {
      await api.onboarding.updateSkillRetakePolicy(skill.skillId, {
        cooldownDays: skill.cooldownDays,
        validityDays: skill.validityDays,
        beginnerPassThreshold: skill.beginnerPassThreshold,
      });
      setSuccess(`Updated ${skill.code}.`);
      await load();
    } catch (err) {
      setError(isSmartApiError(err) ? err.message : 'Could not update policy.');
    } finally {
      setSubmittingId(null);
    }
  }

  return (
    <PageStack>
      <PageHeader
        icon={RefreshCw}
        tone="inverse"
        title="Skill retake policies"
        description="Configure cooldown and validity for skill verification (T19)."
      />
      {error ? <InlineAlert tone="danger" title={error} /> : null}
      {success ? <InlineAlert tone="info" title={success} /> : null}

      {loading ? (
        <EmptyState icon={RefreshCw}>Loading skills…</EmptyState>
      ) : skills.length === 0 ? (
        <EmptyState icon={RefreshCw}>No skills found.</EmptyState>
      ) : (
        <DataTable
          headers={['Code', 'Name', 'Cooldown days', 'Validity days', 'Beginner pass %', 'Actions']}
        >
          {skills.map((skill) => (
            <TableRow key={skill.skillId}>
              <TableCell className="font-medium">{skill.code}</TableCell>
              <TableCell>{skill.name}</TableCell>
              <TableCell>
                <AdminInput
                  type="number"
                  min={1}
                  max={365}
                  value={String(skill.cooldownDays)}
                  onChange={(e) =>
                    setSkills((rows) =>
                      rows.map((row) =>
                        row.skillId === skill.skillId
                          ? { ...row, cooldownDays: Number(e.target.value) }
                          : row,
                      ),
                    )
                  }
                />
              </TableCell>
              <TableCell>
                <AdminInput
                  type="number"
                  min={1}
                  max={730}
                  value={String(skill.validityDays)}
                  onChange={(e) =>
                    setSkills((rows) =>
                      rows.map((row) =>
                        row.skillId === skill.skillId
                          ? { ...row, validityDays: Number(e.target.value) }
                          : row,
                      ),
                    )
                  }
                />
              </TableCell>
              <TableCell>
                <AdminInput
                  type="number"
                  min={0}
                  max={100}
                  value={String(skill.beginnerPassThreshold)}
                  onChange={(e) =>
                    setSkills((rows) =>
                      rows.map((row) =>
                        row.skillId === skill.skillId
                          ? { ...row, beginnerPassThreshold: Number(e.target.value) }
                          : row,
                      ),
                    )
                  }
                />
              </TableCell>
              <TableCell>
                <Button
                  type="button"
                  size="sm"
                  disabled={submittingId === skill.skillId}
                  onClick={() => void save(skill)}
                >
                  Save
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </DataTable>
      )}
    </PageStack>
  );
}
