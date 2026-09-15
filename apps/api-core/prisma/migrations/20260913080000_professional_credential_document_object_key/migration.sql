-- Add optional supporting-document object key on professional_credentials (Tier 3 OCR fallback).
ALTER TABLE "professional_credentials" ADD COLUMN "document_object_key" TEXT;
