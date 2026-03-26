/**
 * Este arquivo centraliza os rate limits das rotas sensíveis de autenticação.
 * Ele existe para reduzir tentativas abusivas de login e cadastro sem poluir as rotas.
 */
const rateLimit = require("express-rate-limit");

function criarRespostaRateLimit(mensagem) {
  return {
    erro: mensagem,
  };
}

function criarRateLimitAuth({
  windowMs,
  max,
  message,
  skipSuccessfulRequests = false,
}) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    message: criarRespostaRateLimit(message),
    handler(req, res, _next, options) {
      return res.status(options.statusCode).json(options.message);
    },
  });
}

const loginRateLimit = criarRateLimitAuth({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: "Muitas tentativas de login. Tente novamente em 15 minutos.",
});

const cadastroRateLimit = criarRateLimitAuth({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: "Muitas tentativas de cadastro. Tente novamente em 1 hora.",
});

module.exports = {
  loginRateLimit,
  cadastroRateLimit,
};
