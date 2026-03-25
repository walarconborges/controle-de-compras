/**
 * Este arquivo guarda o middleware global de erro.
 * Ele existe para padronizar respostas, esconder detalhes internos, registrar contexto e mapear erros do Prisma e do Zod.
 */
const { Prisma } = require("@prisma/client");
const { ZodError } = require("zod");
const { AppError } = require("../utils/errorUtils");

function extrairMensagemZod(error) {
  if (!(error instanceof ZodError) || !Array.isArray(error.issues) || error.issues.length === 0) {
    return "Dados inválidos";
  }

  return error.issues[0].message || "Dados inválidos";
}

function mapearErro(error) {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      publicMessage: error.publicMessage || error.message || "Erro interno do servidor",
      details: error.details || null,
      expose: error.expose,
      code: error.code || null,
    };
  }

  if (error instanceof ZodError) {
    return {
      statusCode: 400,
      publicMessage: extrairMensagemZod(error),
      details: error.issues.map((issue) => ({
        caminho: Array.isArray(issue.path) ? issue.path.join(".") : "",
        mensagem: issue.message,
      })),
      expose: true,
      code: "VALIDATION_ERROR",
    };
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return {
        statusCode: 409,
        publicMessage: error.publicMessage || "Registro duplicado",
        details: null,
        expose: true,
        code: error.code,
      };
    }

    if (error.code === "P2025") {
      return {
        statusCode: 404,
        publicMessage: error.publicMessage || "Registro não encontrado",
        details: null,
        expose: true,
        code: error.code,
      };
    }

    if (error.code === "P2003") {
      return {
        statusCode: 409,
        publicMessage: error.publicMessage || "Operação bloqueada por relacionamento existente",
        details: null,
        expose: true,
        code: error.code,
      };
    }

    return {
      statusCode: 400,
      publicMessage: error.publicMessage || "Erro de persistência de dados",
      details: null,
      expose: true,
      code: error.code,
    };
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      statusCode: 400,
      publicMessage: error.publicMessage || "Dados inválidos para persistência",
      details: null,
      expose: true,
      code: "PRISMA_VALIDATION_ERROR",
    };
  }

  return {
    statusCode: 500,
    publicMessage: error?.publicMessage || "Erro interno do servidor",
    details: null,
    expose: false,
    code: error?.code || "INTERNAL_SERVER_ERROR",
  };
}

function logarErro(error, req, mapped) {
  const payload = {
    statusCode: mapped.statusCode,
    code: mapped.code,
    message: error?.message || mapped.publicMessage,
    publicMessage: mapped.publicMessage,
    method: req?.method || error?.context?.method || null,
    originalUrl: req?.originalUrl || error?.context?.originalUrl || null,
    ip: req?.ip || error?.context?.ip || null,
    usuarioId: req?.session?.usuario?.id || error?.context?.usuarioId || null,
    grupoId: req?.session?.usuario?.grupoId || error?.context?.grupoId || null,
    stack: mapped.statusCode >= 500 ? error?.stack || null : null,
  };

  console.error("[ERROR]", payload);
}

function notFoundHandler(req, res, next) {
  next(new AppError(404, "Rota não encontrada"));
}

function errorHandler(error, req, res, next) {
  const mapped = mapearErro(error);
  logarErro(error, req, mapped);

  if (res.headersSent) {
    return next(error);
  }

  const response = {
    erro: mapped.publicMessage,
  };

  if (mapped.details) {
    response.detalhes = mapped.details;
  }

  if (process.env.NODE_ENV !== "production" && mapped.statusCode >= 500) {
    response.debug = {
      code: mapped.code,
      message: error?.message || null,
    };
  }

  return res.status(mapped.statusCode).json(response);
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
