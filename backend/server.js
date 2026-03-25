/**
 * Este arquivo inicia o servidor Express, configura CORS, JSON, sessão persistente em PostgreSQL,
 * Prisma, arquivos estáticos e registra as rotas separadas por domínio.
 * Ele existe para bootstrap da aplicação. A regra de negócio e as rotas ficaram fora daqui.
 */
require("dotenv").config({ path: "../.env" });

const path = require("path");
const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const session = require("express-session");
const connectPgSimple = require("connect-pg-simple");
const { Pool } = require("pg");

const { exigirAutenticacao, exigirPapel, obterGrupoIdSessao, idsSaoIguais } = require("./middlewares/authMiddleware");
const {
  converterBoolean,
  normalizarDecimal,
  normalizarTextoSimples,
  normalizarUnidade,
  normalizarEmail,
  normalizarNomeGrupo,
  nomeGrupoEhValido,
  gerarCodigoGrupo,
  decimalParaNumero,
  normalizarCompraItemResposta,
  normalizarCompraResposta,
} = require("./utils/normalizers");
const { createSessionService } = require("./services/sessionService");

const registerDiagnosticRoutes = require("./routes/diagnosticRoutes");
const registerCategoriaItemRoutes = require("./routes/categoriaItemRoutes");
const registerGrupoRoutes = require("./routes/grupoRoutes");
const registerUsuarioRoutes = require("./routes/usuarioRoutes");
const registerAuthRoutes = require("./routes/authRoutes");
const registerUsuarioGrupoRoutes = require("./routes/usuarioGrupoRoutes");
const registerGrupoItemRoutes = require("./routes/grupoItemRoutes");
const registerCompraRoutes = require("./routes/compraRoutes");
const registerSystemRoutes = require("./routes/systemRoutes");

const app = express();
app.set("trust proxy", 1);

const DATABASE_URL = process.env.DATABASE_URL;
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!DATABASE_URL) {
  throw new Error("A variável de ambiente DATABASE_URL é obrigatória.");
}

if (!SESSION_SECRET) {
  throw new Error("A variável de ambiente SESSION_SECRET é obrigatória.");
}

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
      if (!origin) {
        return callback(null, true);
      }

      if (ORIGENS_PERMITIDAS.includes(origin)) {
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

const sessionService = createSessionService(prisma);

const deps = {
  app,
  path,
  prisma,
  PUBLIC_PATH,
  exigirAutenticacao,
  exigirPapel,
  obterGrupoIdSessao,
  idsSaoIguais,
  converterBoolean,
  normalizarDecimal,
  normalizarTextoSimples,
  normalizarUnidade,
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

const PORTA = Number(process.env.PORT) || 3001;
const HOST = "0.0.0.0";

const servidor = app.listen(PORTA, HOST, () => {
  console.log(`Servidor rodando em ${HOST}:${PORTA}`);
});

async function encerrarServidor(sinal) {
  console.log(`Encerrando servidor por ${sinal}...`);

  servidor.close(async () => {
    try {
      await prisma.$disconnect();
      await sessionPool.end();
      console.log("Conexões encerradas com sucesso.");
      process.exit(0);
    } catch (error) {
      console.error("Erro ao encerrar recursos do servidor:", error);
      process.exit(1);
    }
  });
}

process.on("SIGINT", () => encerrarServidor("SIGINT"));
process.on("SIGTERM", () => encerrarServidor("SIGTERM"));
