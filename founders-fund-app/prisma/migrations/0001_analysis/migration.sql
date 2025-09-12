CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE "Analysis" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "analysis" JSONB NOT NULL,
  "userId" TEXT,
  CONSTRAINT "Analysis_pkey" PRIMARY KEY ("id")
);
