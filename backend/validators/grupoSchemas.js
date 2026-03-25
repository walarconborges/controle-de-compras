/**
 * Este arquivo reúne schemas das rotas de grupos.
 * Ele existe para padronizar identificação e nome do grupo.
 */
const { z, idParamSchema, nomeGrupoSchema } = require("./commonSchemas");

const grupoBodySchema = z.object({
  nome: nomeGrupoSchema,
});

module.exports = {
  grupoIdParamSchema: idParamSchema,
  grupoBodySchema,
};
