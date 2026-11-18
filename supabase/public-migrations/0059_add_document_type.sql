CREATE TYPE "public"."document_type" AS ENUM('document', 'permission_slip');
ALTER TABLE "documents" ADD COLUMN "type" "document_type" DEFAULT 'document' NOT NULL;
DROP TYPE "public"."document_status";