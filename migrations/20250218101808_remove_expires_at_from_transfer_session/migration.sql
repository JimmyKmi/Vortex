/*
  Warnings:

  - You are about to drop the column `expiresAt` on the `TransferSession` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TransferSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transferCodeId" TEXT NOT NULL,
    "linkedTransferCodeId" TEXT,
    "fingerprint" TEXT NOT NULL,
    "lastActivityAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PICKING',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "s3BasePaths" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TransferSession_transferCodeId_fkey" FOREIGN KEY ("transferCodeId") REFERENCES "TransferCode" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TransferSession_linkedTransferCodeId_fkey" FOREIGN KEY ("linkedTransferCodeId") REFERENCES "TransferCode" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TransferSession" ("createdAt", "fingerprint", "id", "ipAddress", "lastActivityAt", "linkedTransferCodeId", "s3BasePaths", "status", "transferCodeId", "updatedAt", "userAgent") SELECT "createdAt", "fingerprint", "id", "ipAddress", "lastActivityAt", "linkedTransferCodeId", "s3BasePaths", "status", "transferCodeId", "updatedAt", "userAgent" FROM "TransferSession";
DROP TABLE "TransferSession";
ALTER TABLE "new_TransferSession" RENAME TO "TransferSession";
CREATE INDEX "TransferSession_transferCodeId_idx" ON "TransferSession"("transferCodeId");
CREATE INDEX "TransferSession_linkedTransferCodeId_idx" ON "TransferSession"("linkedTransferCodeId");
CREATE INDEX "TransferSession_fingerprint_idx" ON "TransferSession"("fingerprint");
CREATE INDEX "TransferSession_status_idx" ON "TransferSession"("status");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
