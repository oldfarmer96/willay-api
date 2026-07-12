/*
  Warnings:

  - You are about to alter the column `passwordHash` on the `users` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.

*/
-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('INFRASTRUCTURE', 'SECURITY', 'HEALTH', 'ENVIRONMENT', 'NOISE', 'TRAFFIC', 'PUBLIC_SERVICES', 'SOCIAL', 'EMERGENCY', 'OTHER');

-- CreateEnum
CREATE TYPE "IncidentCategory" AS ENUM ('FALLEN_UTILITY_POLE', 'WATER_OUTAGE', 'POWER_OUTAGE', 'STREET_FIGHT', 'THEFT', 'TRAFFIC_ACCIDENT', 'GARBAGE_ACCUMULATION', 'POTHOLE', 'FLOOD', 'FIRE', 'EXCESSIVE_NOISE', 'VANDALISM', 'LOOSE_ANIMALS', 'AMBULANCE_REQUIRED', 'POLICE_REQUIRED', 'OTHER');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('RECEIVED', 'IN_REVIEW', 'ACCEPTED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REASSIGNED');

-- CreateEnum
CREATE TYPE "UrgencyLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "Sentiment" AS ENUM ('NEUTRAL', 'WORRIED', 'PANIC', 'ANGRY', 'URGENT');

-- CreateEnum
CREATE TYPE "AiStatus" AS ENUM ('PENDING', 'PROCESSING', 'PROCESSED', 'ERROR', 'REPROCESSING');

-- CreateEnum
CREATE TYPE "AiProvider" AS ENUM ('OPENROUTER', 'CEREBRAS', 'GROQ');

-- CreateEnum
CREATE TYPE "MunicipalAreaStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('PERSON', 'LOCATION', 'ORGANIZATION', 'LANDMARK', 'VEHICLE', 'OBJECT', 'OTHER');

-- DropIndex
DROP INDEX "users_name_status_role_idx";

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "passwordHash" SET DATA TYPE VARCHAR(255);

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientRequestId" VARCHAR(100) NOT NULL,
    "originalMessage" TEXT NOT NULL,
    "type" "IncidentType",
    "category" "IncidentCategory",
    "urgency" "UrgencyLevel",
    "sentiment" "Sentiment",
    "improvedDescription" TEXT,
    "recommendedAction" TEXT,
    "requiresSupervision" BOOLEAN NOT NULL DEFAULT false,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "address" VARCHAR(250),
    "addressReference" TEXT,
    "status" "IncidentStatus" NOT NULL DEFAULT 'RECEIVED',
    "aiStatus" "AiStatus" NOT NULL DEFAULT 'PENDING',
    "aiProvider" "AiProvider",
    "aiModel" VARCHAR(150),
    "aiError" TEXT,
    "aiAttempts" INTEGER NOT NULL DEFAULT 0,
    "aiConfidence" DECIMAL(5,4),
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "totalTokens" INTEGER,
    "reviewedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "assignedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_entities" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "type" "EntityType" NOT NULL,
    "value" VARCHAR(250) NOT NULL,
    "confidence" DECIMAL(5,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_history" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "userId" TEXT,
    "previousStatus" "IncidentStatus",
    "newStatus" "IncidentStatus" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "incident_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "municipal_areas" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "status" "MunicipalAreaStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "municipal_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incident_assignments" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    "operatorId" TEXT,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'ASSIGNED',
    "note" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incident_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_logs" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "provider" "AiProvider" NOT NULL,
    "model" VARCHAR(150) NOT NULL,
    "status" "AiStatus" NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "errorMessage" TEXT,
    "rawResponse" JSONB,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "totalTokens" INTEGER,
    "latencyMs" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "incidents_userId_idx" ON "incidents"("userId");

-- CreateIndex
CREATE INDEX "incidents_status_idx" ON "incidents"("status");

-- CreateIndex
CREATE INDEX "incidents_aiStatus_idx" ON "incidents"("aiStatus");

-- CreateIndex
CREATE INDEX "incidents_type_idx" ON "incidents"("type");

-- CreateIndex
CREATE INDEX "incidents_category_idx" ON "incidents"("category");

-- CreateIndex
CREATE INDEX "incidents_urgency_idx" ON "incidents"("urgency");

-- CreateIndex
CREATE INDEX "incidents_requiresSupervision_idx" ON "incidents"("requiresSupervision");

-- CreateIndex
CREATE INDEX "incidents_createdAt_idx" ON "incidents"("createdAt");

-- CreateIndex
CREATE INDEX "incidents_status_createdAt_idx" ON "incidents"("status", "createdAt");

-- CreateIndex
CREATE INDEX "incidents_urgency_status_idx" ON "incidents"("urgency", "status");

-- CreateIndex
CREATE INDEX "incidents_category_status_idx" ON "incidents"("category", "status");

-- CreateIndex
CREATE INDEX "incidents_type_status_idx" ON "incidents"("type", "status");

-- CreateIndex
CREATE INDEX "incidents_aiStatus_createdAt_idx" ON "incidents"("aiStatus", "createdAt");

-- CreateIndex
CREATE INDEX "incidents_userId_createdAt_idx" ON "incidents"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "incidents_userId_clientRequestId_key" ON "incidents"("userId", "clientRequestId");

-- CreateIndex
CREATE INDEX "incident_entities_incidentId_idx" ON "incident_entities"("incidentId");

-- CreateIndex
CREATE INDEX "incident_entities_type_idx" ON "incident_entities"("type");

-- CreateIndex
CREATE INDEX "incident_entities_incidentId_type_idx" ON "incident_entities"("incidentId", "type");

-- CreateIndex
CREATE INDEX "incident_history_incidentId_idx" ON "incident_history"("incidentId");

-- CreateIndex
CREATE INDEX "incident_history_userId_idx" ON "incident_history"("userId");

-- CreateIndex
CREATE INDEX "incident_history_newStatus_idx" ON "incident_history"("newStatus");

-- CreateIndex
CREATE INDEX "incident_history_createdAt_idx" ON "incident_history"("createdAt");

-- CreateIndex
CREATE INDEX "incident_history_incidentId_createdAt_idx" ON "incident_history"("incidentId", "createdAt");

-- CreateIndex
CREATE INDEX "incident_history_incidentId_newStatus_idx" ON "incident_history"("incidentId", "newStatus");

-- CreateIndex
CREATE UNIQUE INDEX "municipal_areas_name_key" ON "municipal_areas"("name");

-- CreateIndex
CREATE INDEX "municipal_areas_status_idx" ON "municipal_areas"("status");

-- CreateIndex
CREATE INDEX "municipal_areas_createdAt_idx" ON "municipal_areas"("createdAt");

-- CreateIndex
CREATE INDEX "incident_assignments_incidentId_idx" ON "incident_assignments"("incidentId");

-- CreateIndex
CREATE INDEX "incident_assignments_areaId_idx" ON "incident_assignments"("areaId");

-- CreateIndex
CREATE INDEX "incident_assignments_operatorId_idx" ON "incident_assignments"("operatorId");

-- CreateIndex
CREATE INDEX "incident_assignments_status_idx" ON "incident_assignments"("status");

-- CreateIndex
CREATE INDEX "incident_assignments_assignedAt_idx" ON "incident_assignments"("assignedAt");

-- CreateIndex
CREATE INDEX "incident_assignments_areaId_status_idx" ON "incident_assignments"("areaId", "status");

-- CreateIndex
CREATE INDEX "incident_assignments_operatorId_status_idx" ON "incident_assignments"("operatorId", "status");

-- CreateIndex
CREATE INDEX "incident_assignments_incidentId_assignedAt_idx" ON "incident_assignments"("incidentId", "assignedAt");

-- CreateIndex
CREATE INDEX "ai_logs_incidentId_idx" ON "ai_logs"("incidentId");

-- CreateIndex
CREATE INDEX "ai_logs_provider_idx" ON "ai_logs"("provider");

-- CreateIndex
CREATE INDEX "ai_logs_status_idx" ON "ai_logs"("status");

-- CreateIndex
CREATE INDEX "ai_logs_createdAt_idx" ON "ai_logs"("createdAt");

-- CreateIndex
CREATE INDEX "ai_logs_incidentId_createdAt_idx" ON "ai_logs"("incidentId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_logs_provider_status_idx" ON "ai_logs"("provider", "status");

-- CreateIndex
CREATE INDEX "ai_logs_status_createdAt_idx" ON "ai_logs"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ai_logs_incidentId_attemptNumber_key" ON "ai_logs"("incidentId", "attemptNumber");

-- CreateIndex
CREATE INDEX "users_name_idx" ON "users"("name");

-- CreateIndex
CREATE INDEX "users_lastName_idx" ON "users"("lastName");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- CreateIndex
CREATE INDEX "users_createdAt_idx" ON "users"("createdAt");

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_entities" ADD CONSTRAINT "incident_entities_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_history" ADD CONSTRAINT "incident_history_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_history" ADD CONSTRAINT "incident_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_assignments" ADD CONSTRAINT "incident_assignments_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_assignments" ADD CONSTRAINT "incident_assignments_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "municipal_areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incident_assignments" ADD CONSTRAINT "incident_assignments_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_logs" ADD CONSTRAINT "ai_logs_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
