-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "sobrenome" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "usuarios_grupos" ADD COLUMN     "aprovado_em" TIMESTAMP(3),
ADD COLUMN     "solicitado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pendente';
