-- RenameEnum
ALTER TYPE "NotePayloadMode" RENAME TO "SecretPayloadMode";

-- RenameTable
ALTER TABLE "SecureNote" RENAME TO "SecureSecret";
ALTER TABLE "SecureNoteAttachment" RENAME TO "SecureSecretAttachment";

-- RenameColumn
ALTER TABLE "SecureSecretAttachment" RENAME COLUMN "noteId" TO "secretId";

-- RenameIndex
ALTER INDEX "SecureNote_slug_key" RENAME TO "SecureSecret_slug_key";
ALTER INDEX "SecureNote_slug_idx" RENAME TO "SecureSecret_slug_idx";
ALTER INDEX "SecureNote_expiresAt_idx" RENAME TO "SecureSecret_expiresAt_idx";
ALTER INDEX "SecureNoteAttachment_noteId_idx" RENAME TO "SecureSecretAttachment_secretId_idx";

-- RenameConstraint
ALTER TABLE "SecureSecret" RENAME CONSTRAINT "SecureNote_pkey" TO "SecureSecret_pkey";
ALTER TABLE "SecureSecret" RENAME CONSTRAINT "SecureNote_userId_fkey" TO "SecureSecret_userId_fkey";
ALTER TABLE "SecureSecretAttachment" RENAME CONSTRAINT "SecureNoteAttachment_pkey" TO "SecureSecretAttachment_pkey";
ALTER TABLE "SecureSecretAttachment" RENAME CONSTRAINT "SecureNoteAttachment_noteId_fkey" TO "SecureSecretAttachment_secretId_fkey";
