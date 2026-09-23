-- Phase 6: company portal representative role (distinct from B2B_PARTNER API keys).
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'COMPANY';
