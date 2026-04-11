/**
 * Este arquivo reúne schemas das rotas de categorias e itens globais.
 * Ele existe para padronizar CRUD dessas entidades.
 */
const { z, textoObrigatorio, idParamSchema } = require("./commonSchemas");

const categoriaBodySchema = z.object({
  nome: textoObrigatorio("nome da categoria", "A"),
});

const itemBodySchema = z.object({
  nome: textoObrigatorio("nome do item", "O"),
  categoriaId: z.coerce.number().int().positive("categoriaId inválido"),
});

module.exports = {
  categoriaIdParamSchema: idParamSchema,
  itemIdParamSchema: idParamSchema,
  categoriaBodySchema,
  itemBodySchema,
};
