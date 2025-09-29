-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."LegType" AS ENUM ('seed', 'investor_contribution', 'founders_entry_fee', 'founders_mgmt_fee', 'moonbag_founders', 'moonbag_investor', 'draw');

-- CreateTable
CREATE TABLE "public"."Portfolio" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "totalValue" DECIMAL(18,2),
    "targetReturn" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Contribution" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "public"."LegType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "ts" TIMESTAMPTZ(6) NOT NULL,
    "earnsDollarDaysThisWindow" BOOLEAN NOT NULL,

    CONSTRAINT "Contribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Snapshot" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "timestamp" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "windowStart" TIMESTAMPTZ(6) NOT NULL,
    "windowEnd" TIMESTAMPTZ(6) NOT NULL,
    "profitTotal" DECIMAL(18,2) NOT NULL,
    "realizedProfit" DECIMAL(18,2) NOT NULL,
    "unrealizedPnl" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "Snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Portfolio_name_idx" ON "public"."Portfolio"("name");

-- CreateIndex
CREATE INDEX "Contribution_portfolioId_idx" ON "public"."Contribution"("portfolioId");

-- CreateIndex
CREATE INDEX "Contribution_ts_idx" ON "public"."Contribution"("ts");

-- CreateIndex
CREATE INDEX "Contribution_owner_type_idx" ON "public"."Contribution"("owner", "type");

-- CreateIndex
CREATE INDEX "Snapshot_portfolioId_idx" ON "public"."Snapshot"("portfolioId");

-- CreateIndex
CREATE INDEX "Snapshot_timestamp_idx" ON "public"."Snapshot"("timestamp");

-- AddForeignKey
ALTER TABLE "public"."Contribution" ADD CONSTRAINT "Contribution_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "public"."Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Snapshot" ADD CONSTRAINT "Snapshot_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "public"."Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

