-- CreateEnum
CREATE TYPE "HouseholdRole" AS ENUM ('PARENT_ADMIN', 'PARENT');

-- CreateEnum
CREATE TYPE "AgeBand" AS ENUM ('AGE_8_9', 'AGE_10_12');

-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('QUEST_REWARD', 'PARENT_BONUS', 'PARENT_ADJUSTMENT', 'REWARD_PURCHASE', 'REWARD_REFUND', 'SAVINGS_LOCK', 'SAVINGS_UNLOCK', 'SAVINGS_BONUS');

-- CreateEnum
CREATE TYPE "QuestCategory" AS ENUM ('MAISON', 'AUTONOMIE', 'APPRENTISSAGE', 'ENTRAIDE', 'CREATIVITE', 'ECOLE', 'JARDIN', 'ANIMAUX');

-- CreateEnum
CREATE TYPE "QuestDifficulty" AS ENUM ('FACILE', 'MOYENNE', 'IMPORTANTE', 'EXCEPTIONNELLE');

-- CreateEnum
CREATE TYPE "QuestRecurrence" AS ENUM ('UNIQUE', 'QUOTIDIENNE', 'HEBDOMADAIRE');

-- CreateEnum
CREATE TYPE "QuestStatus" AS ENUM ('DISPONIBLE', 'ACCEPTEE', 'EN_COURS', 'DECLAREE_TERMINEE', 'EN_ATTENTE_VALIDATION', 'VALIDEE', 'A_REFAIRE', 'REFUSEE');

-- CreateEnum
CREATE TYPE "QuestCompletionStatus" AS ENUM ('EN_ATTENTE', 'VALIDEE', 'A_REFAIRE', 'REFUSEE');

-- CreateEnum
CREATE TYPE "RewardCategory" AS ENUM ('EXPERIENCE', 'OBJET');

-- CreateEnum
CREATE TYPE "RedemptionStatus" AS ENUM ('DEMANDEE', 'ACCEPTEE', 'A_UTILISER', 'UTILISEE', 'REFUSEE');

-- CreateEnum
CREATE TYPE "XpSourceType" AS ENUM ('QUEST', 'SAVINGS_GOAL', 'LEARNING_MODULE', 'COLLECTION', 'BADGE', 'LEVEL_UP_BONUS');

-- CreateEnum
CREATE TYPE "CardRarity" AS ENUM ('COMMUNE', 'PEU_COMMUNE', 'RARE', 'EPIQUE', 'LEGENDAIRE');

-- CreateEnum
CREATE TYPE "BoosterInstanceStatus" AS ENUM ('NON_OUVERT', 'OUVERT');

-- CreateEnum
CREATE TYPE "LearningAgeBand" AS ENUM ('AGE_8_9', 'AGE_10_12', 'ALL');

-- CreateEnum
CREATE TYPE "LearningProgressStatus" AS ENUM ('NON_COMMENCE', 'EN_COURS', 'TERMINE');

-- CreateEnum
CREATE TYPE "SimulationProfile" AS ENUM ('PRUDENT', 'EQUILIBRE', 'DYNAMIQUE');

-- CreateEnum
CREATE TYPE "NotificationAudience" AS ENUM ('PARENT', 'CHILD');

-- CreateTable
CREATE TABLE "Household" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currencyName" TEXT NOT NULL DEFAULT 'Pièces',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseholdMembership" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "HouseholdRole" NOT NULL DEFAULT 'PARENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HouseholdMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChildProfile" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "ageBand" "AgeBand" NOT NULL,
    "avatarId" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "currentXp" INTEGER NOT NULL DEFAULT 0,
    "currentLevel" INTEGER NOT NULL DEFAULT 1,
    "activeGoalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChildProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "direction" TEXT,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "actorId" TEXT NOT NULL,
    "reason" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quest" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "QuestCategory" NOT NULL,
    "difficulty" "QuestDifficulty" NOT NULL DEFAULT 'FACILE',
    "rewardCoins" INTEGER NOT NULL DEFAULT 0,
    "rewardXp" INTEGER NOT NULL DEFAULT 0,
    "boosterDefinitionId" TEXT,
    "recurrence" "QuestRecurrence" NOT NULL DEFAULT 'UNIQUE',
    "dueAt" TIMESTAMP(3),
    "validationRequired" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "status" "QuestStatus" NOT NULL DEFAULT 'DISPONIBLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestCompletion" (
    "id" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "declaredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "status" "QuestCompletionStatus" NOT NULL DEFAULT 'EN_ATTENTE',
    "note" TEXT,

    CONSTRAINT "QuestCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reward" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "category" "RewardCategory" NOT NULL,
    "priceCoins" INTEGER NOT NULL,
    "allowedChildIds" TEXT[],
    "quantityAvailable" INTEGER,
    "cooldownHours" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardRedemption" (
    "id" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "priceCoinsAtPurchase" INTEGER NOT NULL,
    "status" "RedemptionStatus" NOT NULL DEFAULT 'DEMANDEE',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "RewardRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavingsGoal" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "targetCoins" INTEGER NOT NULL,
    "rewardId" TEXT,
    "achievedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavingsGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XpTransaction" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "sourceType" "XpSourceType" NOT NULL,
    "sourceId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XpTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "iconUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChildBadge" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChildBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Universe" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverImageUrl" TEXT,
    "isLicensed" BOOLEAN NOT NULL DEFAULT false,
    "licensor" TEXT,
    "licenseId" TEXT,
    "licenseStartsAt" TIMESTAMP(3),
    "licenseEndsAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Universe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseholdUniverse" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "universeId" TEXT NOT NULL,
    "enabledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HouseholdUniverse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionSeries" (
    "id" TEXT NOT NULL,
    "universeId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CollectionSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "universeId" TEXT NOT NULL,
    "seriesId" TEXT,
    "cardNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "rarity" "CardRarity" NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "educationalFact" TEXT,
    "artworkUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChildCard" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "firstObtainedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastObtainedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChildCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoosterDefinition" (
    "id" TEXT NOT NULL,
    "universeId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "cardCount" INTEGER NOT NULL DEFAULT 5,
    "rngVersion" TEXT NOT NULL DEFAULT 'v1',
    "slotConfig" JSONB NOT NULL,

    CONSTRAINT "BoosterDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoosterInstance" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT,
    "status" "BoosterInstanceStatus" NOT NULL DEFAULT 'NON_OUVERT',
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedAt" TIMESTAMP(3),

    CONSTRAINT "BoosterInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoosterOpening" (
    "id" TEXT NOT NULL,
    "boosterInstanceId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "rngVersion" TEXT NOT NULL,
    "rngSeed" TEXT NOT NULL,
    "resultCardIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BoosterOpening_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningModule" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL,
    "ageBand" "LearningAgeBand" NOT NULL DEFAULT 'ALL',
    "content" JSONB NOT NULL,
    "rewardXp" INTEGER NOT NULL DEFAULT 20,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "LearningModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningProgress" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "status" "LearningProgressStatus" NOT NULL DEFAULT 'NON_COMMENCE',
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "LearningProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationScenario" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "returnSeries" JSONB NOT NULL,

    CONSTRAINT "SimulationScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationPortfolio" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "profile" "SimulationProfile" NOT NULL,
    "scenarioId" TEXT,
    "startingUnits" INTEGER NOT NULL,
    "currentUnits" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimulationPortfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationTransaction" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "periodIndex" INTEGER NOT NULL,
    "unitsBefore" DOUBLE PRECISION NOT NULL,
    "unitsAfter" DOUBLE PRECISION NOT NULL,
    "returnPct" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimulationTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "audience" "NotificationAudience" NOT NULL,
    "childId" TEXT,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdMembership_householdId_userId_key" ON "HouseholdMembership"("householdId", "userId");

-- CreateIndex
CREATE INDEX "ChildProfile_householdId_idx" ON "ChildProfile"("householdId");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_childId_key" ON "Wallet"("childId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletTransaction_idempotencyKey_key" ON "WalletTransaction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "WalletTransaction_walletId_createdAt_idx" ON "WalletTransaction"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "Quest_householdId_idx" ON "Quest"("householdId");

-- CreateIndex
CREATE INDEX "Quest_childId_status_idx" ON "Quest"("childId", "status");

-- CreateIndex
CREATE INDEX "QuestCompletion_questId_idx" ON "QuestCompletion"("questId");

-- CreateIndex
CREATE INDEX "QuestCompletion_childId_status_idx" ON "QuestCompletion"("childId", "status");

-- CreateIndex
CREATE INDEX "Reward_householdId_idx" ON "Reward"("householdId");

-- CreateIndex
CREATE INDEX "RewardRedemption_rewardId_idx" ON "RewardRedemption"("rewardId");

-- CreateIndex
CREATE INDEX "RewardRedemption_childId_status_idx" ON "RewardRedemption"("childId", "status");

-- CreateIndex
CREATE INDEX "SavingsGoal_childId_idx" ON "SavingsGoal"("childId");

-- CreateIndex
CREATE UNIQUE INDEX "XpTransaction_idempotencyKey_key" ON "XpTransaction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "XpTransaction_childId_createdAt_idx" ON "XpTransaction"("childId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_code_key" ON "Badge"("code");

-- CreateIndex
CREATE UNIQUE INDEX "ChildBadge_childId_badgeId_key" ON "ChildBadge"("childId", "badgeId");

-- CreateIndex
CREATE UNIQUE INDEX "Universe_code_key" ON "Universe"("code");

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdUniverse_householdId_universeId_key" ON "HouseholdUniverse"("householdId", "universeId");

-- CreateIndex
CREATE INDEX "Card_universeId_rarity_idx" ON "Card"("universeId", "rarity");

-- CreateIndex
CREATE UNIQUE INDEX "Card_universeId_cardNumber_key" ON "Card"("universeId", "cardNumber");

-- CreateIndex
CREATE INDEX "ChildCard_childId_idx" ON "ChildCard"("childId");

-- CreateIndex
CREATE UNIQUE INDEX "ChildCard_childId_cardId_key" ON "ChildCard"("childId", "cardId");

-- CreateIndex
CREATE UNIQUE INDEX "BoosterDefinition_code_key" ON "BoosterDefinition"("code");

-- CreateIndex
CREATE INDEX "BoosterInstance_childId_status_idx" ON "BoosterInstance"("childId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BoosterOpening_boosterInstanceId_key" ON "BoosterOpening"("boosterInstanceId");

-- CreateIndex
CREATE UNIQUE INDEX "LearningModule_code_key" ON "LearningModule"("code");

-- CreateIndex
CREATE UNIQUE INDEX "LearningProgress_childId_moduleId_key" ON "LearningProgress"("childId", "moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "SimulationScenario_code_key" ON "SimulationScenario"("code");

-- CreateIndex
CREATE INDEX "Notification_householdId_audience_childId_idx" ON "Notification"("householdId", "audience", "childId");

-- CreateIndex
CREATE INDEX "AuditLog_householdId_createdAt_idx" ON "AuditLog"("householdId", "createdAt");

-- AddForeignKey
ALTER TABLE "HouseholdMembership" ADD CONSTRAINT "HouseholdMembership_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdMembership" ADD CONSTRAINT "HouseholdMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChildProfile" ADD CONSTRAINT "ChildProfile_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_childId_fkey" FOREIGN KEY ("childId") REFERENCES "ChildProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_childId_fkey" FOREIGN KEY ("childId") REFERENCES "ChildProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_boosterDefinitionId_fkey" FOREIGN KEY ("boosterDefinitionId") REFERENCES "BoosterDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestCompletion" ADD CONSTRAINT "QuestCompletion_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestCompletion" ADD CONSTRAINT "QuestCompletion_childId_fkey" FOREIGN KEY ("childId") REFERENCES "ChildProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reward" ADD CONSTRAINT "Reward_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardRedemption" ADD CONSTRAINT "RewardRedemption_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "Reward"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardRedemption" ADD CONSTRAINT "RewardRedemption_childId_fkey" FOREIGN KEY ("childId") REFERENCES "ChildProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavingsGoal" ADD CONSTRAINT "SavingsGoal_childId_fkey" FOREIGN KEY ("childId") REFERENCES "ChildProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XpTransaction" ADD CONSTRAINT "XpTransaction_childId_fkey" FOREIGN KEY ("childId") REFERENCES "ChildProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChildBadge" ADD CONSTRAINT "ChildBadge_childId_fkey" FOREIGN KEY ("childId") REFERENCES "ChildProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChildBadge" ADD CONSTRAINT "ChildBadge_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdUniverse" ADD CONSTRAINT "HouseholdUniverse_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdUniverse" ADD CONSTRAINT "HouseholdUniverse_universeId_fkey" FOREIGN KEY ("universeId") REFERENCES "Universe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionSeries" ADD CONSTRAINT "CollectionSeries_universeId_fkey" FOREIGN KEY ("universeId") REFERENCES "Universe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_universeId_fkey" FOREIGN KEY ("universeId") REFERENCES "Universe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "CollectionSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChildCard" ADD CONSTRAINT "ChildCard_childId_fkey" FOREIGN KEY ("childId") REFERENCES "ChildProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChildCard" ADD CONSTRAINT "ChildCard_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoosterDefinition" ADD CONSTRAINT "BoosterDefinition_universeId_fkey" FOREIGN KEY ("universeId") REFERENCES "Universe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoosterInstance" ADD CONSTRAINT "BoosterInstance_childId_fkey" FOREIGN KEY ("childId") REFERENCES "ChildProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoosterInstance" ADD CONSTRAINT "BoosterInstance_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "BoosterDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoosterOpening" ADD CONSTRAINT "BoosterOpening_boosterInstanceId_fkey" FOREIGN KEY ("boosterInstanceId") REFERENCES "BoosterInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningProgress" ADD CONSTRAINT "LearningProgress_childId_fkey" FOREIGN KEY ("childId") REFERENCES "ChildProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningProgress" ADD CONSTRAINT "LearningProgress_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "LearningModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationPortfolio" ADD CONSTRAINT "SimulationPortfolio_childId_fkey" FOREIGN KEY ("childId") REFERENCES "ChildProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationPortfolio" ADD CONSTRAINT "SimulationPortfolio_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "SimulationScenario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationTransaction" ADD CONSTRAINT "SimulationTransaction_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "SimulationPortfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_childId_fkey" FOREIGN KEY ("childId") REFERENCES "ChildProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
