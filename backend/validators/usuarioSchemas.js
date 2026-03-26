/**
 * Este arquivo reúne schemas das rotas de usuários.
 * Ele existe para padronizar criação e identificação de usuários.
 * A conta global não pode ser editada por adminGrupo.
 */
const {
  z,
  textoObrigatorio,
  idParamSchema,
  emailSchema,
  senhaObrigatoriaSchema,
  booleanOpcionalSchema,
} = require("./commonSchemas");

const usuarioCreateBodySchema = z.object({
  nome: textoObrigatorio("nome"),
  sobrenome: textoObrigatorio("sobrenome"),
  email: emailSchema,
  senha: senhaObrigatoriaSchema,
  ativo: booleanOpcionalSchema,
});

module.exports = {
  usuarioIdParamSchema: idParamSchema,
  usuarioCreateBodySchema,
};
