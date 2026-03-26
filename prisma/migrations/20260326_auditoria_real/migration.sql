ALTER TABLE "usuarios_grupos"
ADD COLUMN IF NOT EXISTS "aprovado_por_email" TEXT;

ALTER TABLE "auditoria_logs"
ADD COLUMN IF NOT EXISTS "autor_email" TEXT,
ADD COLUMN IF NOT EXISTS "item_id" INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'auditoria_logs_item_id_fkey'
  ) THEN
    ALTER TABLE "auditoria_logs"
    ADD CONSTRAINT "auditoria_logs_item_id_fkey"
    FOREIGN KEY ("item_id") REFERENCES "itens"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "auditoria_logs_entidade_idx" ON "auditoria_logs"("entidade");
CREATE INDEX IF NOT EXISTS "auditoria_logs_acao_idx" ON "auditoria_logs"("acao");
CREATE INDEX IF NOT EXISTS "auditoria_logs_grupo_id_idx" ON "auditoria_logs"("grupo_id");
CREATE INDEX IF NOT EXISTS "auditoria_logs_item_id_idx" ON "auditoria_logs"("item_id");
CREATE INDEX IF NOT EXISTS "auditoria_logs_autor_email_idx" ON "auditoria_logs"("autor_email");
CREATE INDEX IF NOT EXISTS "auditoria_logs_criado_em_idx" ON "auditoria_logs"("criado_em");
