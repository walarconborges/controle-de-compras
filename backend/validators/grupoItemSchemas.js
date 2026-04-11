/**
 * Este arquivo reúne schemas das rotas de itens do grupo.
 * Ele existe para padronizar estoque, lista de compra e alterações pontuais de quantidade e flag comprar.
 */
const {
  z,
  idParamSchema,
  quantidadeNaoNegativaSchema,
  booleanSchema,
  booleanOpcionalSchema,
} = require("./commonSchemas");

const grupoItemCreateBodySchema = z
  .object({
    itemId: z.union([z.coerce.number().int().positive(), z.null()]).optional(),
    nome: z.string().trim().optional().default(""),
    categoria: z.string().trim().optional().default(""),
    quantidade: quantidadeNaoNegativaSchema,
    comprar: booleanOpcionalSchema,
  })
  .superRefine((dados, ctx) => {
    if (dados.itemId == null) {
      if (!dados.nome) {
        ctx.addIssue({ code: "custom", path: ["nome"], message: "nome inválido" });
      }

      if (!dados.categoria) {
        ctx.addIssue({ code: "custom", path: ["categoria"], message: "categoria inválida" });
      }
    }
  });

const grupoItemUpdateBodySchema = z
  .object({
    quantidade: quantidadeNaoNegativaSchema.optional(),
    comprar: booleanOpcionalSchema,
  })
  .refine((dados) => dados.quantidade !== undefined || dados.comprar !== undefined, {
    message: "Informe ao menos um campo para atualização",
  });

const grupoItemPatchComprarBodySchema = z.object({
  comprar: booleanSchema,
});

const grupoItemPatchQuantidadeBodySchema = z.object({
  quantidade: quantidadeNaoNegativaSchema,
});

module.exports = {
  grupoItemIdParamSchema: idParamSchema,
  grupoItemCreateBodySchema,
  grupoItemUpdateBodySchema,
  grupoItemPatchComprarBodySchema,
  grupoItemPatchQuantidadeBodySchema,
};
