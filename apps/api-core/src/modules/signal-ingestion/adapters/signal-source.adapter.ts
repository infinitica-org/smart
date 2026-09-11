import type {
  ConnectSignalSourceRequest,
  ConnectableSignalSourceId,
  RawSignalEnvelope,
} from '@smart/contracts';

export interface EncryptedCredentialsRef {
  readonly refId: string;
}

export interface AdapterFetchContext {
  readonly userId: string;
  readonly externalAccountId: string;
  readonly consentScope: string;
  readonly credentials?: EncryptedCredentialsRef;
  /** Source-specific metadata persisted at connect time (repo names, skill tags, …). */
  readonly metadata?: Record<string, unknown>;
}

export interface ConnectValidationResult {
  readonly externalAccountId: string;
  readonly consentScope: string;
  readonly metadata?: Record<string, unknown>;
}

/**
 * Passive signal source adapter contract (S6-VB-01).
 *
 * Owner: Vishal Bharath R.
 */
export interface SignalSourceAdapter {
  readonly sourceId: ConnectableSignalSourceId;
  readonly supportedConsentScopes: readonly string[];

  validateConnectInput(input: ConnectSignalSourceRequest): Promise<ConnectValidationResult>;

  fetchRaw(ctx: AdapterFetchContext): Promise<RawSignalEnvelope>;

  checkHealth?(): Promise<{ reachable: boolean; latencyMs: number }>;
}
