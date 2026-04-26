/**
 * Bootstrap do servidor Express.
 */

const path = require("path");
const dotenv = require("dotenv");
dotenv.config({ path: path.resolve(__dirname, "../.env") });
const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const session = require("express-session");
const connectPgSimple = require("connect-pg-simple");
const { Pool } = require("pg");

const {
  exigirAutenticacao,
  exigirPapel,
  exigirAdminSistema,
  exigirGrupoAtivoAceito,
  obterGrupoIdSessao,
  idsSaoIguais,
} = require("./middlewares/authMiddleware");
const {
  converterBoolean,
  normalizarDecimal,
  normalizarTextoSimples,
  normalizarEmail,
  normalizarNomeGrupo,
  nomeGrupoEhValido,
  gerarCodigoGrupo,
  decimalParaNumero,
  normalizarCompraItemResposta,
  normalizarCompraResposta,
} = require("./utils/normalizers");
const { createSessionService } = require("./services/sessionService");
const { criarMiddlewareAuditoria } = require("./utils/audit");
const { logger } = require("./utils/logger");
const { criarRequestLoggerMiddleware } = require("./middlewares/requestLoggerMiddleware");

const registerDiagnosticRoutes = require("./routes/diagnosticRoutes");
const registerCategoriaItemRoutes = require("./routes/categoriaItemRoutes");
const registerGrupoRoutes = require("./routes/grupoRoutes");
const registerUsuarioRoutes = require("./routes/usuarioRoutes");
const registerAuthRoutes = require("./routes/authRoutes");
const registerUsuarioGrupoRoutes = require("./routes/usuarioGrupoRoutes");
const registerGrupoItemRoutes = require("./routes/grupoItemRoutes");
const registerCompraRoutes = require("./routes/compraRoutes");
const registerSystemRoutes = require("./routes/systemRoutes");
const { notFoundHandler, errorHandler } = require("./middlewares/errorMiddleware");

const app = express();
app.set("trust proxy", 1);

const DATABASE_URL = process.env.DATABASE_URL;
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!DATABASE_URL) throw new Error("A variável de ambiente DATABASE_URL é obrigatória.");
if (!SESSION_SECRET) throw new Error("A variável de ambiente SESSION_SECRET é obrigatória.");

const PUBLIC_PATH = path.resolve(__dirname, "../public");
const PgSession = connectPgSimple(session);
const sessionPool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

const adapter = new PrismaPg({ connectionString: DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const ORIGENS_PERMITIDAS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:5501",
  "http://127.0.0.1:5501",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://controle-de-compras.onrender.com",
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || ORIGENS_PERMITIDAS.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Origem não permitida pelo CORS"));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(
  session({
    store: new PgSession({
      pool: sessionPool,
      tableName: "user_sessions",
      createTableIfMissing: true,
    }),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

app.use(criarRequestLoggerMiddleware());
app.use(criarMiddlewareAuditoria(prisma));

const sessionService = createSessionService(prisma);
app.locals.logger = logger;

const deps = {
  app,
  path,
  prisma,
  PUBLIC_PATH,
  exigirAutenticacao,
  exigirPapel,
  exigirAdminSistema,
  exigirGrupoAtivoAceito,
  obterGrupoIdSessao,
  idsSaoIguais,
  converterBoolean,
  normalizarDecimal,
  normalizarTextoSimples,
  normalizarEmail,
  normalizarNomeGrupo,
  nomeGrupoEhValido,
  gerarCodigoGrupo,
  decimalParaNumero,
  normalizarCompraItemResposta,
  normalizarCompraResposta,
  ...sessionService,
  bcrypt: require("bcrypt"),
};

registerDiagnosticRoutes(app, deps);
registerCategoriaItemRoutes(app, deps);
registerGrupoRoutes(app, deps);
registerUsuarioRoutes(app, deps);
registerAuthRoutes(app, deps);
registerUsuarioGrupoRoutes(app, deps);
registerGrupoItemRoutes(app, deps);
registerCompraRoutes(app, deps);
registerSystemRoutes(app, deps);

/**
 * Servir frontend pela mesma origem do Express.
 * Isso evita que o navegador tente chamar /login, /sessao, /itens etc.
 * em outro servidor/porta quando o projeto for aberto sem o backend.
 */
app.use(express.static(PUBLIC_PATH));

/**
 * Página inicial servida pelo próprio Express.
 * Ajuste para login.html se esse for o seu ponto de entrada preferido.
 */
app.get("/", (req, res) => {
  res.sendFile(path.join(PUBLIC_PATH, "login.html"));
});

app.use(notFoundHandler);
app.use(errorHandler);

const PORTA = Number(process.env.PORT) || 3001;
const HOST = "0.0.0.0";

const servidor = app.listen(PORTA, HOST, () => {
  logger.info("Servidor iniciado", { host: HOST, porta: PORTA });
});

async function encerrarServidor(sinal) {
  logger.info("Encerrando servidor", { sinal });

  servidor.close(async () => {
    try {
      await prisma.$disconnect();
      await sessionPool.end();
      logger.info("Conexões encerradas com sucesso", { sinal });
      process.exit(0);
    } catch (error) {
      logger.error("Erro ao encerrar recursos do servidor", { sinal, error });
      process.exit(1);
    }
  });
}

process.on("SIGINT", () => encerrarServidor("SIGINT"));
process.on("SIGTERM", () => encerrarServidor("SIGTERM"));
process.on("unhandledRejection", (reason) => {
  logger.error("Promise rejeitada sem tratamento", { reason });
});
process.on("uncaughtException", (error) => {
  logger.error("Exceção não capturada", { error });
});
