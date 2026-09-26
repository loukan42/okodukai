-- AlterTable
ALTER TABLE "InvestSettings" ADD COLUMN     "contributionCap" INTEGER NOT NULL DEFAULT 300,
ADD COLUMN     "contributionsEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "InvestPause" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "to" TIMESTAMP(3),
    "createdById" TEXT,

    CONSTRAINT "InvestPause_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvestPause_childId_idx" ON "InvestPause"("childId");

-- AddForeignKey
ALTER TABLE "InvestPause" ADD CONSTRAINT "InvestPause_childId_fkey" FOREIGN KEY ("childId") REFERENCES "ChildProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
