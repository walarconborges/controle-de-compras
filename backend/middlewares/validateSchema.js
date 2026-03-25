/**
 * Este arquivo valida body, params e query com Zod.
 * Ele existe para centralizar validação de entrada e devolver erros previsíveis antes da regra de negócio.
 */
const { ZodError } = require("zod");
const { AppError } = require("../utils/errorUtils");

function extrairMensagemDeErro(error) {
  if (!(error instanceof ZodError) || !Array.isArray(error.issues) || error.issues.length === 0) {
    return "Dados inválidos";
  }

  return error.issues[0].message || "Dados inválidos";
}

function validateSchema(schemas = {}) {
  return (req, res, next) => {
    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }

      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }

      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return next(
          new AppError(400, extrairMensagemDeErro(error), {
            details: error.issues.map((issue) => ({
              caminho: Array.isArray(issue.path) ? issue.path.join(".") : "",
              mensagem: issue.message,
            })),
          })
        );
      }

      next(error);
    }
  };
}

module.exports = validateSchema;
