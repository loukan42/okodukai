-- CreateEnum
CREATE TYPE "SimRhythm" AS ENUM ('RAPIDE', 'STANDARD', 'LONG');

-- CreateEnum
CREATE TYPE "SimRunStatus" AS ENUM ('EN_COURS', 'TERMINEE', 'ARRETEE');

-- CreateTable
CREATE TABLE "InvestSettings" (
    "childId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "rhythm" "SimRhythm" NOT NULL DEFAULT 'STANDARD',
    "horizonMonths" INTEGER NOT NULL DEFAULT 60,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestSettings_pkey" PRIMARY KEY ("childId")
);

-- CreateTable
CREATE TABLE "SimulationRun" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "engineVersion" TEXT NOT NULL,
    "parametersFingerprint" TEXT NOT NULL,
    "seed" TEXT NOT NULL,
    "scenario" TEXT NOT NULL,
    "horizonMonths" INTEGER NOT NULL,
    "rhythm" "SimRhythm" NOT NULL,
    "timeZone" TEXT NOT NULL DEFAULT 'Europe/Paris',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fees" JSONB NOT NULL,
    "marketPath" JSONB NOT NULL,
    "status" "SimRunStatus" NOT NULL DEFAULT 'EN_COURS',
    "finishedAt" TIMESTAMP(3),
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimulationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationOperation" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "step" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION,
    "amountPerMonth" DOUBLE PRECISION,
    "allocation" JSONB,
    "actorId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimulationOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationSnapshot" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "rendezVousIndex" INTEGER NOT NULL,
    "step" INTEGER NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "valueAtReveal" DOUBLE PRECISION NOT NULL,
    "bySupport" JSONB NOT NULL,
    "contributed" DOUBLE PRECISION NOT NULL,
    "performanceIndex" DOUBLE PRECISION NOT NULL,
    "priceIndex" DOUBLE PRECISION NOT NULL,
    "seenAt" TIMESTAMP(3),
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimulationSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SimulationRun_idempotencyKey_key" ON "SimulationRun"("idempotencyKey");

-- CreateIndex
CREATE INDEX "SimulationRun_childId_status_idx" ON "SimulationRun"("childId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SimulationOperation_idempotencyKey_key" ON "SimulationOperation"("idempotencyKey");

-- CreateIndex
CREATE INDEX "SimulationOperation_runId_step_idx" ON "SimulationOperation"("runId", "step");

-- CreateIndex
CREATE UNIQUE INDEX "SimulationSnapshot_runId_rendezVousIndex_key" ON "SimulationSnapshot"("runId", "rendezVousIndex");

-- AddForeignKey
ALTER TABLE "InvestSettings" ADD CONSTRAINT "InvestSettings_childId_fkey" FOREIGN KEY ("childId") REFERENCES "ChildProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationRun" ADD CONSTRAINT "SimulationRun_childId_fkey" FOREIGN KEY ("childId") REFERENCES "ChildProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationOperation" ADD CONSTRAINT "SimulationOperation_runId_fkey" FOREIGN KEY ("runId") REFERENCES "SimulationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationSnapshot" ADD CONSTRAINT "SimulationSnapshot_runId_fkey" FOREIGN KEY ("runId") REFERENCES "SimulationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
