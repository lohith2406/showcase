-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'QUEUED', 'EXPLORING', 'PLANNING', 'GENERATING', 'READY', 'FAILED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "JobStage" AS ENUM ('QUEUED', 'EXPLORING', 'PLANNING', 'GENERATING', 'COMPLETE', 'FAILED');

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "sampleMode" BOOLEAN NOT NULL DEFAULT false,
    "credentialsCiphertext" TEXT,
    "explorationPolicy" JSONB NOT NULL,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExplorationJob" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "stage" "JobStage" NOT NULL DEFAULT 'QUEUED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExplorationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscoveredPage" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "navigationLabel" TEXT,
    "summary" TEXT NOT NULL,
    "screenshotUrl" TEXT NOT NULL,
    "viewportWidth" INTEGER NOT NULL,
    "viewportHeight" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "DiscoveredPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UiElement" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "selector" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "importance" DOUBLE PRECISION NOT NULL,
    "safeToClick" BOOLEAN NOT NULL DEFAULT false,
    "attributes" JSONB,

    CONSTRAINT "UiElement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "importance" DOUBLE PRECISION NOT NULL,
    "pageIds" TEXT[],
    "actionPlan" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chapter" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemoStep" (
    "id" TEXT NOT NULL,
    "chapterId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "selector" TEXT,
    "hotspotX" DOUBLE PRECISION NOT NULL,
    "hotspotY" DOUBLE PRECISION NOT NULL,
    "hotspotWidth" DOUBLE PRECISION,
    "hotspotHeight" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemoStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublishedDemo" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublishedDemo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Project_createdAt_idx" ON "Project"("createdAt");

-- CreateIndex
CREATE INDEX "ExplorationJob_projectId_createdAt_idx" ON "ExplorationJob"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "ExplorationJob_stage_idx" ON "ExplorationJob"("stage");

-- CreateIndex
CREATE INDEX "DiscoveredPage_projectId_order_idx" ON "DiscoveredPage"("projectId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "DiscoveredPage_projectId_url_key" ON "DiscoveredPage"("projectId", "url");

-- CreateIndex
CREATE INDEX "UiElement_pageId_importance_idx" ON "UiElement"("pageId", "importance");

-- CreateIndex
CREATE INDEX "Workflow_projectId_importance_idx" ON "Workflow"("projectId", "importance");

-- CreateIndex
CREATE INDEX "Chapter_projectId_idx" ON "Chapter"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "Chapter_projectId_order_key" ON "Chapter"("projectId", "order");

-- CreateIndex
CREATE INDEX "DemoStep_pageId_idx" ON "DemoStep"("pageId");

-- CreateIndex
CREATE UNIQUE INDEX "DemoStep_chapterId_order_key" ON "DemoStep"("chapterId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "PublishedDemo_projectId_key" ON "PublishedDemo"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "PublishedDemo_slug_key" ON "PublishedDemo"("slug");

-- AddForeignKey
ALTER TABLE "ExplorationJob" ADD CONSTRAINT "ExplorationJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveredPage" ADD CONSTRAINT "DiscoveredPage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UiElement" ADD CONSTRAINT "UiElement_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "DiscoveredPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chapter" ADD CONSTRAINT "Chapter_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemoStep" ADD CONSTRAINT "DemoStep_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemoStep" ADD CONSTRAINT "DemoStep_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "DiscoveredPage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishedDemo" ADD CONSTRAINT "PublishedDemo_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
