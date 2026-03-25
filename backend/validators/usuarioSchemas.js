/**
 * Este arquivo reúne schemas das rotas de usuários.
 * Ele existe para padronizar criação, atualização e identificação de usuários.
 */
const {
  z,
  textoObrigatorio,
  idParamSchema,
  emailSchema,
  senhaObrigatoriaSchema,
  senhaOpcionalSchema,
  booleanOpcionalSchema,
} = require("./commonSchemas");

const usuarioCreateBodySchema = z.object({
  nome: textoObrigatorio("nome"),
  sobrenome: textoObrigatorio("sobrenome"),
  email: emailSchema,
  senha: senhaObrigatoriaSchema,
  ativo: booleanOpcionalSchema,
});

const usuarioUpdateBodySchema = z.object({
  nome: textoObrigatorio("nome"),
  sobrenome: textoObrigatorio("sobrenome"),
  email: emailSchema,
  senha: senhaOpcionalSchema,
  ativo: booleanOpcionalSchema,
});

module.exports = {
  usuarioIdParamSchema: idParamSchema,
  usuarioCreateBodySchema,
  usuarioUpdateBodySchema,
};
