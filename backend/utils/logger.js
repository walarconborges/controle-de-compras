const crypto = require("crypto");

const LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function obterNivelConfigurado() {
  const raw = String(process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug")).toLowerCase();
  return LEVELS[raw] ? raw : "info";
}

function deveLogar(level) {
  const atual = LEVELS[obterNivelConfigurado()] || LEVELS.info;
  const desejado = LEVELS[level] || LEVELS.info;
  return desejado >= atual;
}

function serializarErro(error) {
  if (!error) return null;

  return {
    name: error.name || "Error",
    message: error.message || "Erro sem mensagem",
    code: error.code || null,
    statusCode: error.statusCode || null,
    stack: error.stack || null,
    context: error.context || null,
  };
}

function sanitizarValor(value, visited = new WeakSet()) {
  if (value === null || value === undefined) return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) return serializarErro(value);
  if (typeof value === "bigint") return String(value);

  if (Array.isArray(value)) {
    return value.map((item) => sanitizarValor(item, visited));
  }

  if (typeof value === "object") {
    if (visited.has(value)) return "[Circular]";
    visited.add(value);

    const output = {};
    for (const [key, item] of Object.entries(value)) {
      if (typeof item === "function") continue;
      output[key] = sanitizarValor(item, visited);
    }
    visited.delete(value);
    return output;
  }

  return String(value);
}

function escrever(level, payload) {
  const linha = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    service: "controle-de-compras-backend",
    environment: process.env.NODE_ENV || "development",
    ...sanitizarValor(payload),
  });

  if (level === "error") {
    process.stderr.write(`${linha}\n`);
    return;
  }

  process.stdout.write(`${linha}\n`);
}

function criarLogger(contextoBase = {}) {
  const contexto = sanitizarValor(contextoBase);

  function log(level, message, extra = {}) {
    if (!deveLogar(level)) return;

    escrever(level, {
      message,
      ...contexto,
      ...sanitizarValor(extra),
    });
  }

  return {
    child(extra = {}) {
      return criarLogger({ ...contexto, ...sanitizarValor(extra) });
    },
    debug(message, extra) {
      log("debug", message, extra);
    },
    info(message, extra) {
      log("info", message, extra);
    },
    warn(message, extra) {
      log("warn", message, extra);
    },
    error(message, extra) {
      log("error", message, extra);
    },
  };
}

function gerarRequestId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const logger = criarLogger();

module.exports = {
  logger,
  criarLogger,
  gerarRequestId,
  serializarErro,
  sanitizarValor,
};
