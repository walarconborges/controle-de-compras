/**
 * Este arquivo reúne schemas das rotas de compras.
 * Ele existe para padronizar a entrada dos itens comprados.
 */
const { z, quantidadePositivaSchema, valorCentavosNaoNegativoSchema } = require("./commonSchemas");

const compraItemSchema = z.object({
  itemId: z.union([z.coerce.number().int().positive(), z.null()]).optional(),
  nome: z.string().trim().min(1, "nome inválido no item"),
  categoria: z.string().trim().min(1, "categoria inválida no item"),
  quantidade: quantidadePositivaSchema,
  valorUnitarioCentavos: valorCentavosNaoNegativoSchema,
});

const compraBodySchema = z.object({
  itens: z.array(compraItemSchema).min(1, "A compra deve ter ao menos um item"),
});

module.exports = {
  compraBodySchema,
};
