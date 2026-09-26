-- CreateEnum
CREATE TYPE "SimMode" AS ENUM ('MIROIR', 'ASSURANCE_VIE');

-- DropIndex
DROP INDEX "SimulationRun_childId_status_idx";

-- AlterTable
ALTER TABLE "SimulationRun" ADD COLUMN     "contributionCap" INTEGER,
ADD COLUMN     "mode" "SimMode" NOT NULL DEFAULT 'MIROIR';

-- CreateIndex
CREATE INDEX "SimulationRun_childId_mode_status_idx" ON "SimulationRun"("childId", "mode", "status");
