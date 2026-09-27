-- CreateTable
CREATE TABLE "ShareEvent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "format" TEXT,
    "platform" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShareEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShareEvent_createdAt_idx" ON "ShareEvent"("createdAt");

-- CreateIndex
CREATE INDEX "ShareEvent_name_createdAt_idx" ON "ShareEvent"("name", "createdAt");

-- CreateIndex
CREATE INDEX "ShareEvent_campaignId_createdAt_idx" ON "ShareEvent"("campaignId", "createdAt");
