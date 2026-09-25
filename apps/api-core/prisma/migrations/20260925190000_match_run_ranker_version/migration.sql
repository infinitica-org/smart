-- I375: freeze the ranker version used to produce a match run snapshot.

-- AlterTable
ALTER TABLE "match_runs" ADD COLUMN "ranker_version" TEXT;
