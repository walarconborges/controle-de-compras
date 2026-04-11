-- Remove campos de unidade do sistema
ALTER TABLE "itens" DROP COLUMN IF EXISTS "unidade_padrao";
ALTER TABLE "compra_itens" DROP COLUMN IF EXISTS "unidade";
