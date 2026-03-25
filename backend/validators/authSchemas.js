/**
 * Este arquivo reúne schemas das rotas de autenticação, cadastro, login e aprovações do grupo.
 * Ele existe para padronizar entradas dessas ações sensíveis.
 */
const {
  z,
  textoObrigatorio,
  emailSchema,
  senhaObrigatoriaSchema,
  senhaMinimaCadastroSchema,
  nomeGrupoSchema,
  idParamSchema,
} = require("./commonSchemas");

const sugestoesGrupoQuerySchema = z.object({
  termo: z.string().trim().optional().default(""),
});

const cadastroBodySchema = z.object({
  nome: textoObrigatorio("nome"),
  sobrenome: textoObrigatorio("sobrenome"),
  email: emailSchema,
  senha: senhaMinimaCadastroSchema,
  grupoNome: nomeGrupoSchema,
});

const loginBodySchema = z.object({
  email: emailSchema,
  senha: senhaObrigatoriaSchema,
});

module.exports = {
  sugestoesGrupoQuerySchema,
  cadastroBodySchema,
  loginBodySchema,
  solicitacaoIdParamSchema: idParamSchema,
};
