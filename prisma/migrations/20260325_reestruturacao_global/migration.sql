
ALTER TABLE "usuarios"
  ADD COLUMN IF NOT EXISTS "papel_global" TEXT NOT NULL DEFAULT 'usuario',
  ADD COLUMN IF NOT EXISTS "grupo_ativo_id" INTEGER NULL,
  ADD COLUMN IF NOT EXISTS "desativado_em" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "excluido_em" TIMESTAMP(3);

ALTER TABLE "grupos"
  ADD COLUMN IF NOT EXISTS "desativado_em" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "excluido_em" TIMESTAMP(3);

ALTER TABLE "usuarios_grupos"
  ADD COLUMN IF NOT EXISTS "removido_em" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "cancelado_em" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "desativado_em" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "excluido_em" TIMESTAMP(3);

ALTER TABLE "itens"
  ADD COLUMN IF NOT EXISTS "desativado_em" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "excluido_em" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "auditoria_logs" (
  "id" SERIAL PRIMARY KEY,
  "entidade" TEXT NOT NULL,
  "entidade_id" INTEGER NULL,
  "acao" TEXT NOT NULL,
  "descricao" TEXT NULL,
  "usuario_autor_id" INTEGER NULL REFERENCES "usuarios"("id") ON DELETE SET NULL,
  "grupo_id" INTEGER NULL REFERENCES "grupos"("id") ON DELETE SET NULL,
  "status_http" INTEGER NULL,
  "metadados" JSONB NULL,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
