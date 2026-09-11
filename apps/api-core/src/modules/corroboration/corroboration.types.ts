/** Admin actor context for institution-scoped corroboration operations. */
export interface CorroborationAdminActor {
  readonly sub: string;
  readonly role: string;
  readonly inst: string | null;
}
