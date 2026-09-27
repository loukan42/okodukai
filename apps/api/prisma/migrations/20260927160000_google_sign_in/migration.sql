ALTER TABLE "User" ADD COLUMN "googleSub" TEXT;
ALTER TABLE "User" ADD COLUMN "passwordLoginEnabled" BOOLEAN NOT NULL DEFAULT true;
CREATE UNIQUE INDEX "User_googleSub_key" ON "User"("googleSub");
