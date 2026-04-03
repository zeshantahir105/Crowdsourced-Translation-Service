-- AlterTable
ALTER TABLE "User" ADD COLUMN "passwordResetCodeHash" TEXT;
ALTER TABLE "User" ADD COLUMN "passwordResetExpiresAt" TIMESTAMP(3);
