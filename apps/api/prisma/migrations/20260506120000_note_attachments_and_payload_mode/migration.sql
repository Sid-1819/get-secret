-- CreateEnum
CREATE TYPE "NotePayloadMode" AS ENUM ('SERVER_ENCRYPTED', 'CLIENT_CIPHERTEXT');

-- AlterTable
ALTER TABLE "SecureNote" ADD COLUMN     "payloadMode" "NotePayloadMode" NOT NULL DEFAULT 'SERVER_ENCRYPTED',
ADD COLUMN     "hasAttachments" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "SecureNoteAttachment" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecureNoteAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SecureNoteAttachment_noteId_idx" ON "SecureNoteAttachment"("noteId");

-- AddForeignKey
ALTER TABLE "SecureNoteAttachment" ADD CONSTRAINT "SecureNoteAttachment_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "SecureNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;
