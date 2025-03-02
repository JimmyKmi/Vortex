-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" DATETIME,
    "image" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "password" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Authenticator" (
    "credentialID" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "credentialPublicKey" TEXT NOT NULL,
    "counter" INTEGER NOT NULL,
    "credentialDeviceType" TEXT NOT NULL,
    "credentialBackedUp" BOOLEAN NOT NULL,
    "transports" TEXT,

    PRIMARY KEY ("userId", "credentialID"),
    CONSTRAINT "Authenticator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SystemSettings" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "TransferCode" (
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

-- CreateTable
CREATE TABLE "FileToTransferCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileId" TEXT NOT NULL,
    "transferCodeId" TEXT NOT NULL,
    CONSTRAINT "FileToTransferCode_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FileToTransferCode_transferCodeId_fkey" FOREIGN KEY ("transferCodeId") REFERENCES "TransferCode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "s3BasePath" TEXT NOT NULL,
    "relativePath" TEXT NOT NULL DEFAULT '',
    "isDirectory" BOOLEAN NOT NULL DEFAULT false,
    "parentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "File_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "File" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TransferCodeUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transferCodeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUCCESS',
    "errorMessage" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TransferCodeUsage_transferCodeId_fkey" FOREIGN KEY ("transferCodeId") REFERENCES "TransferCode" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TransferCodeUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TransferSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transferCodeId" TEXT NOT NULL,
    "linkedTransferCodeId" TEXT,
    "fingerprint" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PICKING',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "s3BasePath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TransferSession_transferCodeId_fkey" FOREIGN KEY ("transferCodeId") REFERENCES "TransferCode" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TransferSession_linkedTransferCodeId_fkey" FOREIGN KEY ("linkedTransferCodeId") REFERENCES "TransferCode" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UploadToken" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "token" TEXT NOT NULL,
    "s3BasePath" TEXT NOT NULL,
    "transferCodeId" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UploadToken_transferCodeId_fkey" FOREIGN KEY ("transferCodeId") REFERENCES "TransferCode" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Authenticator_credentialID_key" ON "Authenticator"("credentialID");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSettings_key_key" ON "SystemSettings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "TransferCode_code_key" ON "TransferCode"("code");

-- CreateIndex
CREATE INDEX "TransferCode_code_idx" ON "TransferCode"("code");

-- CreateIndex
CREATE INDEX "TransferCode_userId_idx" ON "TransferCode"("userId");

-- CreateIndex
CREATE INDEX "TransferCode_type_idx" ON "TransferCode"("type");

-- CreateIndex
CREATE INDEX "TransferCode_sourceTransferCodeId_idx" ON "TransferCode"("sourceTransferCodeId");

-- CreateIndex
CREATE INDEX "FileToTransferCode_fileId_idx" ON "FileToTransferCode"("fileId");

-- CreateIndex
CREATE INDEX "FileToTransferCode_transferCodeId_idx" ON "FileToTransferCode"("transferCodeId");

-- CreateIndex
CREATE UNIQUE INDEX "FileToTransferCode_fileId_transferCodeId_key" ON "FileToTransferCode"("fileId", "transferCodeId");

-- CreateIndex
CREATE INDEX "File_parentId_idx" ON "File"("parentId");

-- CreateIndex
CREATE INDEX "File_relativePath_idx" ON "File"("relativePath");

-- CreateIndex
CREATE INDEX "TransferCodeUsage_transferCodeId_idx" ON "TransferCodeUsage"("transferCodeId");

-- CreateIndex
CREATE INDEX "TransferCodeUsage_userId_idx" ON "TransferCodeUsage"("userId");

-- CreateIndex
CREATE INDEX "TransferCodeUsage_createdAt_idx" ON "TransferCodeUsage"("createdAt");

-- CreateIndex
CREATE INDEX "TransferSession_transferCodeId_idx" ON "TransferSession"("transferCodeId");

-- CreateIndex
CREATE INDEX "TransferSession_linkedTransferCodeId_idx" ON "TransferSession"("linkedTransferCodeId");

-- CreateIndex
CREATE INDEX "TransferSession_fingerprint_idx" ON "TransferSession"("fingerprint");

-- CreateIndex
CREATE INDEX "TransferSession_status_idx" ON "TransferSession"("status");

-- CreateIndex
CREATE UNIQUE INDEX "UploadToken_token_key" ON "UploadToken"("token");

-- CreateIndex
CREATE INDEX "UploadToken_token_idx" ON "UploadToken"("token");

-- CreateIndex
CREATE INDEX "UploadToken_expiresAt_idx" ON "UploadToken"("expiresAt");

-- CreateIndex
CREATE INDEX "UploadToken_transferCodeId_idx" ON "UploadToken"("transferCodeId");
