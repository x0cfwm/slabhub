-- DropIndex
DROP INDEX "WorkflowStatus_userId_systemId_key";

-- CreateIndex
CREATE INDEX "WorkflowStatus_userId_systemId_idx" ON "WorkflowStatus"("userId", "systemId");
