-- CreateEnum
CREATE TYPE "VaultRuleMode" AS ENUM ('FREE', 'PARENT_APPROVAL', 'MIN_DAYS', 'GOAL_ONLY');

-- CreateEnum
CREATE TYPE "VaultRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REFUSED');

-- AlterTable
ALTER TABLE "SavingsGoal" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "VaultRule" (
    "childId" TEXT NOT NULL,
    "mode" "VaultRuleMode" NOT NULL DEFAULT 'FREE',
    "minDays" INTEGER,
    "since" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VaultRule_pkey" PRIMARY KEY ("childId")
);

-- CreateTable
CREATE TABLE "VaultWithdrawalRequest" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "VaultRequestStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "decidedById" TEXT,

    CONSTRAINT "VaultWithdrawalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VaultWithdrawalRequest_idempotencyKey_key" ON "VaultWithdrawalRequest"("idempotencyKey");

-- CreateIndex
CREATE INDEX "VaultWithdrawalRequest_childId_status_idx" ON "VaultWithdrawalRequest"("childId", "status");

-- AddForeignKey
ALTER TABLE "VaultRule" ADD CONSTRAINT "VaultRule_childId_fkey" FOREIGN KEY ("childId") REFERENCES "ChildProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VaultWithdrawalRequest" ADD CONSTRAINT "VaultWithdrawalRequest_childId_fkey" FOREIGN KEY ("childId") REFERENCES "ChildProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Objectifs existants : on les remplit dans leur ordre de création.
UPDATE "SavingsGoal" AS g SET "position" = o.rn
FROM (SELECT "id", (ROW_NUMBER() OVER (PARTITION BY "childId" ORDER BY "createdAt") - 1)::int AS rn FROM "SavingsGoal") AS o
WHERE g."id" = o."id";
