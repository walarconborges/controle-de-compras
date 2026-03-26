const { logger, gerarRequestId } = require("../utils/logger");

function criarRequestLoggerMiddleware() {
  return function requestLoggerMiddleware(req, res, next) {
    const requestIdHeader = req.headers["x-request-id"];
    const requestId = typeof requestIdHeader === "string" && requestIdHeader.trim() ? requestIdHeader.trim() : gerarRequestId();

    req.requestId = requestId;
    res.setHeader("x-request-id", requestId);

    const inicio = Date.now();

    const baseContext = {
      requestId,
      method: req.method || null,
      route: req.originalUrl || req.url || null,
      path: req.path || null,
      ip: req.ip || null,
    };

    req.log = logger.child(baseContext);
    req.log.info("Requisição iniciada");

    res.on("finish", () => {
      const usuario = req.session?.usuario || {};
      const duracaoMs = Date.now() - inicio;

      req.log.info("Requisição finalizada", {
        statusCode: res.statusCode,
        durationMs: duracaoMs,
        usuarioId: usuario.id || null,
        grupoId: usuario.grupoId || null,
        grupoAtivoId: usuario.grupoAtivoId || null,
      });
    });

    next();
  };
}

module.exports = {
  criarRequestLoggerMiddleware,
};
