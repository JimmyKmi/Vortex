-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TransferCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "disableReason" TEXT,
    "expires" DATETIME,
    "speedLimit" INTEGER,
    "comment" TEXT,
    "sourceTransferCodeId" TEXT,
    "compressStatus" TEXT NOT NULL DEFAULT 'IDLE',
    "compressProgress" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TransferCode_sourceTransferCodeId_fkey" FOREIGN KEY ("sourceTransferCodeId") REFERENCES "TransferCode" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "TransferCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TransferCode" ("code", "comment", "createdAt", "disableReason", "expires", "id", "sourceTransferCodeId", "speedLimit", "type", "updatedAt", "userId") SELECT "code", "comment", "createdAt", "disableReason", "expires", "id", "sourceTransferCodeId", "speedLimit", "type", "updatedAt", "userId" FROM "TransferCode";
DROP TABLE "TransferCode";
ALTER TABLE "new_TransferCode" RENAME TO "TransferCode";
CREATE UNIQUE INDEX "TransferCode_code_key" ON "TransferCode"("code");
CREATE INDEX "TransferCode_code_idx" ON "TransferCode"("code");
CREATE INDEX "TransferCode_userId_idx" ON "TransferCode"("userId");
CREATE INDEX "TransferCode_type_idx" ON "TransferCode"("type");
CREATE INDEX "TransferCode_sourceTransferCodeId_idx" ON "TransferCode"("sourceTransferCodeId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
