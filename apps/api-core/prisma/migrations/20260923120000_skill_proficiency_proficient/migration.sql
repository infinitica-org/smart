-- Add PROFICIENT between INTERMEDIATE and ADVANCED on catalog skill claims.
ALTER TYPE "SkillProficiency" ADD VALUE IF NOT EXISTS 'PROFICIENT';
