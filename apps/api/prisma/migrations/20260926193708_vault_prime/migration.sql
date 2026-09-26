-- AlterEnum
ALTER TYPE "WalletTransactionType" ADD VALUE 'VAULT_PRIME';

-- CreateTable
CREATE TABLE "VaultPrime" (
    "childId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "step" INTEGER NOT NULL DEFAULT 10,
    "weeklyCap" INTEGER NOT NULL DEFAULT 10,
    "since" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedUntil" TIMESTAMP(3),
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VaultPrime_pkey" PRIMARY KEY ("childId")
);

-- AddForeignKey
ALTER TABLE "VaultPrime" ADD CONSTRAINT "VaultPrime_childId_fkey" FOREIGN KEY ("childId") REFERENCES "ChildProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
