-- Ancien simulateur « clic pour avancer », remplacé par le moteur finsim (SimulationRun,
-- SimulationOperation, SimulationSnapshot). Plus lu ni écrit par l'API : voir docs/DATA_MODEL.md.

-- DropForeignKey
ALTER TABLE "SimulationPortfolio" DROP CONSTRAINT "SimulationPortfolio_childId_fkey";

-- DropForeignKey
ALTER TABLE "SimulationPortfolio" DROP CONSTRAINT "SimulationPortfolio_scenarioId_fkey";

-- DropForeignKey
ALTER TABLE "SimulationTransaction" DROP CONSTRAINT "SimulationTransaction_portfolioId_fkey";

-- DropTable
DROP TABLE "SimulationPortfolio";

-- DropTable
DROP TABLE "SimulationScenario";

-- DropTable
DROP TABLE "SimulationTransaction";

-- DropEnum
DROP TYPE "SimulationProfile";

