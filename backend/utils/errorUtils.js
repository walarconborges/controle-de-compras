/**
 * Este arquivo concentra utilitários de erro reutilizáveis.
 * Ele existe para padronizar criação, enriquecimento de contexto e encapsulamento de falhas da aplicação.
 */
class AppError extends Error {
  constructor(statusCode, message, options = {}) {
    super(message);
    this.name = "AppError";
    this.statusCode = Number(statusCode) || 500;
    this.publicMessage = options.publicMessage || message || "Erro interno do servidor";
    this.details = options.details || null;
    this.code = options.code || null;
    this.expose = typeof options.expose === "boolean" ? options.expose : this.statusCode < 500;
    this.context = options.context || {};
    this.cause = options.cause;
  }
}

function criarContextoRequest(req) {
  return {
    method: req?.method || null,
    originalUrl: req?.originalUrl || null,
    ip: req?.ip || null,
    requestId: req?.requestId || null,
    usuarioId: req?.session?.usuario?.id || null,
    grupoId: req?.session?.usuario?.grupoId || null,
    grupoAtivoId: req?.session?.usuario?.grupoAtivoId || null,
  };
}

function anexarContextoErro(error, req, extra = {}) {
  const contextoBase = criarContextoRequest(req);
  const contextoExtra = extra.context || {};
  const context = { ...contextoBase, ...contextoExtra };

  if (error instanceof AppError) {
    error.context = { ...(error.context || {}), ...context };
    if (extra.publicMessage) {
      error.publicMessage = extra.publicMessage;
    }
    if (extra.details) {
      error.details = extra.details;
    }
    return error;
  }

  if (error && typeof error === "object") {
    error.context = { ...(error.context || {}), ...context };
    if (extra.publicMessage && !error.publicMessage) {
      error.publicMessage = extra.publicMessage;
    }
    if (extra.details && !error.details) {
      error.details = extra.details;
    }
  }

  return error;
}

function asyncHandler(handler) {
  return function wrappedHandler(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch((error) => next(anexarContextoErro(error, req)));
  };
}

module.exports = {
  AppError,
  asyncHandler,
  criarContextoRequest,
  anexarContextoErro,
};
