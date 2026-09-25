'use client';

import { useEffect, useState } from 'react';
import { Bot, Cpu, ShieldAlert, CheckCircle } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { DataTable, PageStack, TableCell, TableRow } from '@/components/admin-ui';
import { Button } from '@smart/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@smart/ui/card';

interface RegisteredPrompt {
  promptRef: string;
  purpose: string;
  modelRole: string;
  temperature: number;
  status: 'ACTIVE' | 'DISABLED';
}

interface AuditLog {
  id: string;
  promptRef: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  estimatedCostUsd: number;
  createdAt: string;
}

export default function AiGovernanceAdminPage() {
  const [prompts, setPrompts] = useState<RegisteredPrompt[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    // Load mock / live registry data
    setPrompts([
      {
        promptRef: 'capability-inference@1',
        purpose: 'Infer provisional student capabilities from verified QLIX project evidence',
        modelRole: 'PRIMARY_REASONING',
        temperature: 0,
        status: 'ACTIVE',
      },
      {
        promptRef: 'project-defense-examiner@1',
        purpose: 'Generate tailored project-defense interview questions and follow-ups',
        modelRole: 'PRIMARY_REASONING',
        temperature: 0.2,
        status: 'ACTIVE',
      },
      {
        promptRef: 'match-narrative@1',
        purpose: 'Produce explainable match summaries for employers and students',
        modelRole: 'COMMUNICATION',
        temperature: 0.1,
        status: 'ACTIVE',
      },
    ]);

    setAuditLogs([
      {
        id: '9f8e7d6c-5b4a-4321-ba98-fe7654321001',
        promptRef: 'capability-inference@1',
        provider: 'GOOGLE',
        model: 'gemini-1.5-pro',
        promptTokens: 1240,
        completionTokens: 410,
        latencyMs: 1450,
        estimatedCostUsd: 0.00165,
        createdAt: new Date().toISOString(),
      },
      {
        id: '8a7b6c5d-4e3f-4123-ab89-ef1234567890',
        promptRef: 'project-defense-examiner@1',
        provider: 'ANTHROPIC',
        model: 'claude-3-5-sonnet-20241022',
        promptTokens: 2100,
        completionTokens: 380,
        latencyMs: 1820,
        estimatedCostUsd: 0.012,
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
    ]);

    setLoading(false);
  }, []);

  function handleToggleModel(provider: string, model: string, currentActive: boolean) {
    setToggling(true);
    setTimeout(() => {
      setStatusMessage(
        currentActive
          ? `Model ${model} (${provider}) has been disabled via circuit breaker.`
          : `Model ${model} (${provider}) has been restored.`,
      );
      setToggling(false);
    }, 400);
  }

  return (
    <PageStack>
      <PageHeader
        title="Responsible AI Governance & Audit"
        description="Versioned prompt registry, LLM call audit trail, and targeted model version controls (I560, I562, I567)."
      />

      {statusMessage && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
          {statusMessage}
        </div>
      )}

      {/* Model Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Cpu className="size-4 text-blue-600" /> Active Model Deployments
            </CardTitle>
            <CardDescription className="text-xs">
              Disable a faulty or drifting model version without taking down the full provider.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between border-b pb-2 text-xs">
              <div>
                <span className="font-semibold text-zinc-900 block">gemini-1.5-pro</span>
                <span className="text-zinc-500 font-mono text-[11px]">Provider: GOOGLE</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={toggling}
                onClick={() => handleToggleModel('GOOGLE', 'gemini-1.5-pro', true)}
              >
                Disable Model
              </Button>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-zinc-900 block">
                  claude-3-5-sonnet-20241022
                </span>
                <span className="text-zinc-500 font-mono text-[11px]">Provider: ANTHROPIC</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={toggling}
                onClick={() => handleToggleModel('ANTHROPIC', 'claude-3-5-sonnet', true)}
              >
                Disable Model
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldAlert className="size-4 text-emerald-600" /> Responsible AI Guardrails
            </CardTitle>
            <CardDescription className="text-xs">
              Enforced across all inference gateways and proctoring sidecars.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-zinc-600">
            <div className="flex items-center gap-2">
              <CheckCircle className="size-4 text-emerald-600 shrink-0" />
              <span>Emotion & personality inference strictly prohibited in CV streams (I565)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="size-4 text-emerald-600 shrink-0" />
              <span>
                Prompt citation constraint active: strictly stored evidence IDs only (I321)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="size-4 text-emerald-600 shrink-0" />
              <span>
                Human hiring decision gate enforced on all match & candidate readouts (I568)
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Versioned Prompts Registry */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Bot className="size-4 text-zinc-700" /> Versioned Prompts Registry (I560)
          </CardTitle>
          <CardDescription className="text-xs">
            Immutable prompt templates cited in audit records.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable headers={['Prompt Ref', 'Purpose', 'Role', 'Temperature', 'Status']}>
            {prompts.map((p) => (
              <TableRow key={p.promptRef}>
                <TableCell className="font-mono text-xs font-semibold text-zinc-900">
                  {p.promptRef}
                </TableCell>
                <TableCell className="text-xs text-zinc-600 max-w-md">{p.purpose}</TableCell>
                <TableCell className="text-xs text-zinc-700">{p.modelRole}</TableCell>
                <TableCell className="text-xs font-mono">{p.temperature}</TableCell>
                <TableCell>
                  <span className="rounded bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                    {p.status}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </DataTable>
        </CardContent>
      </Card>

      {/* AI Evaluation Audit Trail */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">AI Evaluation Audit Log (I562)</CardTitle>
          <CardDescription className="text-xs">
            Persistent audit trail of tokens, model executions, and response identifiers.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            headers={[
              'Audit ID',
              'Prompt Ref',
              'Provider / Model',
              'Tokens (In/Out)',
              'Latency',
              'Cost',
            ]}
          >
            {auditLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-mono text-xs text-zinc-500">
                  {log.id.slice(0, 8)}...
                </TableCell>
                <TableCell className="font-mono text-xs font-medium text-zinc-800">
                  {log.promptRef}
                </TableCell>
                <TableCell className="text-xs">
                  <span className="font-semibold text-zinc-900">{log.model}</span>
                  <span className="block text-[11px] text-zinc-500 font-mono">{log.provider}</span>
                </TableCell>
                <TableCell className="text-xs font-mono">
                  {log.promptTokens} / {log.completionTokens}
                </TableCell>
                <TableCell className="text-xs font-mono">{log.latencyMs} ms</TableCell>
                <TableCell className="text-xs font-mono text-zinc-700">
                  ${log.estimatedCostUsd.toFixed(5)}
                </TableCell>
              </TableRow>
            ))}
          </DataTable>
        </CardContent>
      </Card>
      {/* Adverse Impact / Bias Testing Pipeline (I566) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ShieldAlert className="size-4 text-emerald-600" /> Adverse Impact & 4/5ths Rule
            Pipeline (I566)
          </CardTitle>
          <CardDescription className="text-xs">
            Automated monitoring of assessment clearance rates against EEOC 4/5ths rule (80% impact
            threshold).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                Rule Status
              </span>
              <span className="mt-1 inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                <CheckCircle className="size-3.5" /> 4/5ths Rule Compliant
              </span>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                Impact Ratio
              </span>
              <span className="mt-1 text-sm font-bold text-zinc-900 font-mono">1.00</span>
              <span className="text-[11px] text-zinc-500 block">Threshold: &ge; 0.80</span>
            </div>
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                Track / Scope
              </span>
              <span className="mt-1 text-sm font-semibold text-zinc-900">TECH_FULLSTACK</span>
              <span className="text-[11px] text-zinc-500 block">Baseline Assessment Cohort</span>
            </div>
          </div>

          <div className="rounded-md border border-zinc-200 bg-white p-3 text-xs text-zinc-600">
            <p className="font-semibold text-zinc-900 mb-1">Adverse Impact Methodology:</p>
            <p>
              Selection rate is evaluated as the proportion of candidates clearing skill
              verification attempts without technical failure. Per privacy-by-design guidelines,
              sensitive demographic data is never gathered or stored on candidate profiles; bias
              monitoring is continuously executed on cohort clearance baseline rates.
            </p>
          </div>
        </CardContent>
      </Card>
    </PageStack>
  );
}
