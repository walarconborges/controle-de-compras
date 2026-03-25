/**
 * Este arquivo reúne schemas das rotas de vínculos usuário-grupo.
 * Ele existe para padronizar criação, atualização e identificação desses vínculos.
 */
const { z, idParamSchema, papelSchema } = require("./commonSchemas");

const usuarioGrupoBodySchema = z.object({
  usuarioId: z.coerce.number().int().positive("usuarioId inválido"),
  grupoId: z.coerce.number().int().positive("grupoId inválido"),
  papel: papelSchema,
});

module.exports = {
  usuarioGrupoIdParamSchema: idParamSchema,
  usuarioGrupoBodySchema,
};
