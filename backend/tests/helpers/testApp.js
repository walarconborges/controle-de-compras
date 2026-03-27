const express = require("express");
const path = require("path");
const session = require("express-session");
const request = require("supertest");
const bcrypt = require("bcrypt");

const { createSessionService } = require("../../services/sessionService");
const authMiddleware = require("../../middlewares/authMiddleware");
const { notFoundHandler, errorHandler } = require("../../middlewares/errorMiddleware");
const normalizers = require("../../utils/normalizers");

const registerAuthRoutes = require("../../routes/authRoutes");
const registerUsuarioRoutes = require("../../routes/usuarioRoutes");
const registerUsuarioGrupoRoutes = require("../../routes/usuarioGrupoRoutes");
const registerGrupoRoutes = require("../../routes/grupoRoutes");
const registerCompraRoutes = require("../../routes/compraRoutes");
const registerSystemRoutes = require("../../routes/systemRoutes");

function criarLoggerSilencioso() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    child() {
      return this;
    },
  };
}

function criarDependenciasBasicas(prisma, bcryptMock) {
  const sessionService = createSessionService(prisma);

  return {
    prisma,
    path,
    PUBLIC_PATH: path.resolve(__dirname, "../../../public"),
    ...authMiddleware,
    ...normalizers,
    ...sessionService,
    bcrypt: bcryptMock,
  };
}

function createTestApp({ routes = [], prisma, bcryptMock } = {}) {
  const app = express();
  const prismaLocal = prisma;
  const bcryptLocal = bcryptMock || {
    hash: jest.fn((valor) => Promise.resolve(`hash:${valor}`)),
    compare: jest.fn((valorInformado, valorPersistido) =>
      Promise.resolve(valorPersistido === `hash:${valorInformado}` || valorPersistido === valorInformado)
    ),
  };

  app.locals.logger = criarLoggerSilencioso();
  app.set("trust proxy", 1);
  app.use(express.json());
  app.use(
    session({
      secret: "teste-seguro",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
      },
    })
  );

  app.post("/__test/session", (req, res) => {
    req.session.usuario = req.body.usuario || null;
    res.json({ ok: true, usuario: req.session.usuario });
  });

  app.post("/__test/clear-session", (req, res, next) => {
    req.session.destroy((error) => {
      if (error) return next(error);
      res.json({ ok: true });
    });
  });

  const deps = criarDependenciasBasicas(prismaLocal, bcryptLocal);

  const registry = {
    auth: registerAuthRoutes,
    usuarios: registerUsuarioRoutes,
    usuariosGrupos: registerUsuarioGrupoRoutes,
    grupos: registerGrupoRoutes,
    compras: registerCompraRoutes,
    system: registerSystemRoutes,
  };

  routes.forEach((routeName) => {
    const register = registry[routeName];
    if (!register) {
      throw new Error(`Rota de teste não suportada: ${routeName}`);
    }
    register(app, deps);
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return {
    app,
    prisma: prismaLocal,
    bcryptMock: bcryptLocal,
    request,
  };
}

async function autenticarSessao(agent, usuario) {
  await agent.post("/__test/session").send({ usuario }).expect(200);
}

module.exports = {
  createTestApp,
  autenticarSessao,
  bcryptReal: bcrypt,
};
