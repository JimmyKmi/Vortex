/*
  Warnings:

  - You are about to drop the column `createdAt` on the `FileToTransferCode` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `FileToTransferCode` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `FileToTransferCode` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FileToTransferCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileId" TEXT NOT NULL,
    "transferCodeId" TEXT NOT NULL,
    CONSTRAINT "FileToTransferCode_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FileToTransferCode_transferCodeId_fkey" FOREIGN KEY ("transferCodeId") REFERENCES "TransferCode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_FileToTransferCode" ("fileId", "id", "transferCodeId") SELECT "fileId", "id", "transferCodeId" FROM "FileToTransferCode";
DROP TABLE "FileToTransferCode";
ALTER TABLE "new_FileToTransferCode" RENAME TO "FileToTransferCode";
CREATE INDEX "FileToTransferCode_fileId_idx" ON "FileToTransferCode"("fileId");
CREATE INDEX "FileToTransferCode_transferCodeId_idx" ON "FileToTransferCode"("transferCodeId");
CREATE UNIQUE INDEX "FileToTransferCode_fileId_transferCodeId_key" ON "FileToTransferCode"("fileId", "transferCodeId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
