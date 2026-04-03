-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('CONSUMER', 'TRANSLATOR', 'REVIEWER', 'ADMIN');

-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'PREMIUM');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'REVIEW', 'APPROVED');

-- CreateEnum
CREATE TYPE "TaskRole" AS ENUM ('TRANSLATE', 'REVIEW');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('OPEN', 'ASSIGNED', 'DONE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CONSUMER',
    "planTier" "PlanTier" NOT NULL DEFAULT 'FREE',
    "emailVerified" BOOLEAN NOT NULL DEFAULT true,
    "emailVerificationCodeHash" TEXT,
    "emailVerificationExpiresAt" TIMESTAMP(3),
    "loginOtpCodeHash" TEXT,
    "loginOtpExpiresAt" TIMESTAMP(3),
    "subscriptionExpiresAt" TIMESTAMP(3),
    "googleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranslationRequest" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "inputKind" TEXT NOT NULL DEFAULT 'TEXT',
    "sourceText" TEXT NOT NULL,
    "sourceLang" TEXT NOT NULL,
    "targetLang" TEXT NOT NULL,
    "domain" TEXT NOT NULL DEFAULT 'general',
    "status" "RequestStatus" NOT NULL DEFAULT 'DRAFT',
    "aiDraft" TEXT,
    "attachmentOriginalName" TEXT,
    "attachmentMime" TEXT,
    "attachmentPath" TEXT,
    "extractedCharCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TranslationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TranslationVersion" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "translatorId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TranslationVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QualityScore" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QualityScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reputation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "badges" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reputation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Glossary" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "sourceTerm" TEXT NOT NULL,
    "translatedTerm" TEXT NOT NULL,
    "context" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Glossary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "role" "TaskRole" NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'OPEN',
    "assignedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "QualityScore_versionId_reviewerId_key" ON "QualityScore"("versionId", "reviewerId");

-- CreateIndex
CREATE UNIQUE INDEX "Reputation_userId_key" ON "Reputation"("userId");

-- CreateIndex
CREATE INDEX "Glossary_ownerId_idx" ON "Glossary"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE INDEX "ApiKey_userId_idx" ON "ApiKey"("userId");

-- AddForeignKey
ALTER TABLE "TranslationRequest" ADD CONSTRAINT "TranslationRequest_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranslationVersion" ADD CONSTRAINT "TranslationVersion_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "TranslationRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TranslationVersion" ADD CONSTRAINT "TranslationVersion_translatorId_fkey" FOREIGN KEY ("translatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityScore" ADD CONSTRAINT "QualityScore_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "TranslationVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QualityScore" ADD CONSTRAINT "QualityScore_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reputation" ADD CONSTRAINT "Reputation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Glossary" ADD CONSTRAINT "Glossary_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "TranslationRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
