-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "WalletTransactionType" ADD VALUE 'ALLOWANCE';
ALTER TYPE "WalletTransactionType" ADD VALUE 'GIFT';

-- CreateTable
CREATE TABLE "AllowanceSchedule" (
    "childId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "weekday" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AllowanceSchedule_pkey" PRIMARY KEY ("childId")
);

-- AddForeignKey
ALTER TABLE "AllowanceSchedule" ADD CONSTRAINT "AllowanceSchedule_childId_fkey" FOREIGN KEY ("childId") REFERENCES "ChildProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
