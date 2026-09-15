-- S6-VV-64 Integrity Queue severity/escalate — adds an ESCALATED terminal state to the
-- integrity flag enum. Reachable only through the admin integrity queue's Escalate
-- action; every transition into it is paired with an audit_logs row (actor, reason, time).

ALTER TYPE "IntegrityFlag" ADD VALUE 'ESCALATED';
