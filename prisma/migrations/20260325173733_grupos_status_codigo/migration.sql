/*
  Warnings:

  - A unique constraint covering the columns `[codigo]` on the table `grupos` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `codigo` to the `grupos` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "grupos" ADD COLUMN "codigo" TEXT;

UPDATE "grupos"
SET "codigo" = UPPER("nome" || '-' || "id")
WHERE "codigo" IS NULL;

ALTER TABLE "grupos" ALTER COLUMN "codigo" SET NOT NULL;

CREATE UNIQUE INDEX "grupos_codigo_key" ON "grupos"("codigo");
