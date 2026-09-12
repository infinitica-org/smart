'use client';

import { AlertTriangle, Info, CheckCircle2, XCircle } from 'lucide-react';

export function CertificateGuidelinesBanner() {
  return (
    <div className="rounded-2xl border border-warning/30 bg-warning/5 p-5 text-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-warning/10 text-warning">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground">Certification Upload Guidelines</h4>
            <span className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
              <Info className="h-3 w-3" /> Proof Standard
            </span>
          </div>

          <p className="text-xs text-foreground/80 leading-relaxed">
            Please ensure you upload an officially issued completion certificate or supply a
            verifiable credential URL (Credly, AWS CertMetrics, Coursera, etc.).
          </p>

          <div className="mt-1 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div className="flex items-start gap-2 rounded-xl border border-success/20 bg-success/5 p-2.5">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <div>
                <p className="text-xs font-medium text-foreground">Accepted Documents</p>
                <p className="text-[11px] text-muted-foreground">
                  Official Completion Certificate, Credly Digital Badge, Professional License,
                  Credential ID with verification URL.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-danger/20 bg-danger/5 p-2.5">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
              <div>
                <p className="text-xs font-medium text-foreground">
                  Not Accepted (Will Be Rejected)
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Offer letters, appointment letters, internship completion letters, course
                  enrollments, or salary slips.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
