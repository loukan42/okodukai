ALTER TYPE "WalletTransactionType" ADD VALUE 'INVEST_LOCK';
ALTER TYPE "WalletTransactionType" ADD VALUE 'INVEST_RETURN';

ALTER TABLE "SimulationRun" ADD COLUMN "fundedAmount" INTEGER;
