-- CreateEnum
CREATE TYPE "PedagogyLevel" AS ENUM ('AUTO', 'DECOUVERTE', 'APPROFONDI');

-- CreateEnum
CREATE TYPE "FinanceNotionState" AS ENUM ('RENCONTREE', 'EXPLIQUEE', 'VERIFIEE');

-- AlterTable
ALTER TABLE "ChildProfile" ADD COLUMN     "pedagogyLevel" "PedagogyLevel" NOT NULL DEFAULT 'AUTO';

-- CreateTable
CREATE TABLE "FinanceNotionProgress" (
    "childId" TEXT NOT NULL,
    "notionCode" TEXT NOT NULL,
    "state" "FinanceNotionState" NOT NULL DEFAULT 'RENCONTREE',
    "encounteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "explainedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "anchor" TEXT,

    CONSTRAINT "FinanceNotionProgress_pkey" PRIMARY KEY ("childId","notionCode")
);

-- CreateTable
CREATE TABLE "FinanceTipLog" (
    "childId" TEXT NOT NULL,
    "tipCode" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "title" TEXT,
    "message" TEXT NOT NULL,
    "shownAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinanceTipLog_pkey" PRIMARY KEY ("childId","tipCode")
);

-- AddForeignKey
ALTER TABLE "FinanceNotionProgress" ADD CONSTRAINT "FinanceNotionProgress_childId_fkey" FOREIGN KEY ("childId") REFERENCES "ChildProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinanceTipLog" ADD CONSTRAINT "FinanceTipLog_childId_fkey" FOREIGN KEY ("childId") REFERENCES "ChildProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
