-- DropForeignKey
ALTER TABLE "auditoria_logs" DROP CONSTRAINT "auditoria_logs_grupo_id_fkey";

-- DropForeignKey
ALTER TABLE "auditoria_logs" DROP CONSTRAINT "auditoria_logs_usuario_autor_id_fkey";

-- DropIndex
DROP INDEX "usuarios_nome_key";

-- AlterTable
ALTER TABLE "usuarios_grupos" ALTER COLUMN "papel" SET DEFAULT 'membro';

-- CreateIndex
CREATE INDEX "compra_itens_compra_id_idx" ON "compra_itens"("compra_id");

-- CreateIndex
CREATE INDEX "compra_itens_item_id_idx" ON "compra_itens"("item_id");

-- CreateIndex
CREATE INDEX "compras_grupo_id_idx" ON "compras"("grupo_id");

-- CreateIndex
CREATE INDEX "compras_usuario_id_idx" ON "compras"("usuario_id");

-- CreateIndex
CREATE INDEX "grupo_itens_grupo_id_idx" ON "grupo_itens"("grupo_id");

-- CreateIndex
CREATE INDEX "grupo_itens_item_id_idx" ON "grupo_itens"("item_id");

-- CreateIndex
CREATE INDEX "grupos_codigo_idx" ON "grupos"("codigo");

-- CreateIndex
CREATE INDEX "grupos_excluido_em_idx" ON "grupos"("excluido_em");

-- CreateIndex
CREATE INDEX "itens_categoria_id_idx" ON "itens"("categoria_id");

-- CreateIndex
CREATE INDEX "itens_excluido_em_idx" ON "itens"("excluido_em");

-- CreateIndex
CREATE INDEX "movimentacoes_estoque_grupo_id_idx" ON "movimentacoes_estoque"("grupo_id");

-- CreateIndex
CREATE INDEX "movimentacoes_estoque_item_id_idx" ON "movimentacoes_estoque"("item_id");

-- CreateIndex
CREATE INDEX "movimentacoes_estoque_usuario_id_idx" ON "movimentacoes_estoque"("usuario_id");

-- CreateIndex
CREATE INDEX "movimentacoes_estoque_tipo_idx" ON "movimentacoes_estoque"("tipo");

-- CreateIndex
CREATE INDEX "usuarios_email_idx" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_papel_global_idx" ON "usuarios"("papel_global");

-- CreateIndex
CREATE INDEX "usuarios_grupo_ativo_id_idx" ON "usuarios"("grupo_ativo_id");

-- CreateIndex
CREATE INDEX "usuarios_ativo_idx" ON "usuarios"("ativo");

-- CreateIndex
CREATE INDEX "usuarios_grupos_grupo_id_status_idx" ON "usuarios_grupos"("grupo_id", "status");

-- CreateIndex
CREATE INDEX "usuarios_grupos_usuario_id_status_idx" ON "usuarios_grupos"("usuario_id", "status");

-- CreateIndex
CREATE INDEX "usuarios_grupos_aprovado_por_email_idx" ON "usuarios_grupos"("aprovado_por_email");

-- CreateIndex
CREATE INDEX "usuarios_grupos_excluido_em_idx" ON "usuarios_grupos"("excluido_em");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_grupo_ativo_id_fkey" FOREIGN KEY ("grupo_ativo_id") REFERENCES "grupos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria_logs" ADD CONSTRAINT "auditoria_logs_usuario_autor_id_fkey" FOREIGN KEY ("usuario_autor_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria_logs" ADD CONSTRAINT "auditoria_logs_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "grupos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
