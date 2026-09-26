ALTER TABLE "User" ADD COLUMN "parentPinHash" TEXT;

CREATE TABLE "ChildDeviceInvite" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChildDeviceInvite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChildDeviceInvite_tokenHash_key" ON "ChildDeviceInvite"("tokenHash");
CREATE INDEX "ChildDeviceInvite_childId_expiresAt_idx" ON "ChildDeviceInvite"("childId", "expiresAt");

ALTER TABLE "ChildDeviceInvite" ADD CONSTRAINT "ChildDeviceInvite_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChildDeviceInvite" ADD CONSTRAINT "ChildDeviceInvite_childId_fkey" FOREIGN KEY ("childId") REFERENCES "ChildProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChildDeviceInvite" ADD CONSTRAINT "ChildDeviceInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
