/**
 * Este arquivo reúne schemas e helpers compartilhados de validação.
 * Ele existe para evitar repetição entre validações de rotas diferentes.
 */
const { z } = require("zod");

function textoObrigatorio(rotulo, artigo = "O") {
  return z
    .string({
      required_error: `${artigo} ${rotulo} é obrigatório`,
      invalid_type_error: `${artigo} ${rotulo} é obrigatório`,
    })
    .trim()
    .min(1, `${artigo} ${rotulo} é obrigatório`);
}

function textoOpcional() {
  return z.string().trim().optional();
}

const idParamSchema = z.object({
  id: z.coerce.number().int().positive("ID inválido"),
});

const emailSchema = z
  .string({
    required_error: "O email é obrigatório",
    invalid_type_error: "O email é obrigatório",
  })
  .trim()
  .min(1, "O email é obrigatório")
  .email("O email informado é inválido")
  .transform((valor) => valor.toLowerCase());

const senhaObrigatoriaSchema = z
  .string({
    required_error: "A senha é obrigatória",
    invalid_type_error: "A senha é obrigatória",
  })
  .trim()
  .min(1, "A senha é obrigatória");

const senhaMinimaCadastroSchema = senhaObrigatoriaSchema.min(6, "A senha deve ter pelo menos 6 caracteres");

const senhaOpcionalSchema = z
  .union([z.string(), z.undefined(), z.null()])
  .transform((valor) => (valor == null ? "" : String(valor).trim()))
  .refine((valor) => valor === "" || valor.length >= 6, {
    message: "A senha deve ter pelo menos 6 caracteres",
  });

const nomeGrupoSchema = z
  .string({
    required_error: "O nome do grupo é obrigatório",
    invalid_type_error: "O nome do grupo é obrigatório",
  })
  .trim()
  .min(1, "O nome do grupo é obrigatório")
  .refine((valor) => !/\s/.test(valor), {
    message: "O nome do grupo deve conter apenas 1 palavra",
  });

const papelSchema = z
  .string({
    required_error: "O papel é obrigatório",
    invalid_type_error: "O papel é obrigatório",
  })
  .trim()
  .min(1, "O papel é obrigatório");

const quantidadeNaoNegativaSchema = z.coerce.number().refine((valor) => Number.isFinite(valor) && valor >= 0, {
  message: "quantidade inválida",
});

const quantidadePositivaSchema = z.coerce.number().refine((valor) => Number.isFinite(valor) && valor > 0, {
  message: "quantidade inválida",
});

const valorNaoNegativoSchema = z.coerce.number().refine((valor) => Number.isFinite(valor) && valor >= 0, {
  message: "valorUnitario inválido",
});

const booleanSchema = z.preprocess((valor) => {
  if (typeof valor === "boolean") {
    return valor;
  }

  if (typeof valor === "string") {
    const normalizado = valor.trim().toLowerCase();

    if (normalizado === "true") {
      return true;
    }

    if (normalizado === "false") {
      return false;
    }
  }

  return valor;
}, z.boolean());

const booleanOpcionalSchema = booleanSchema.optional();

module.exports = {
  z,
  textoObrigatorio,
  textoOpcional,
  idParamSchema,
  emailSchema,
  senhaObrigatoriaSchema,
  senhaMinimaCadastroSchema,
  senhaOpcionalSchema,
  nomeGrupoSchema,
  papelSchema,
  quantidadeNaoNegativaSchema,
  quantidadePositivaSchema,
  valorNaoNegativoSchema,
  booleanSchema,
  booleanOpcionalSchema,
};
