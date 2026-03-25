/**
 * Este arquivo registra rotas técnicas de diagnóstico.
 * Ele existe para testar conexão, disponibilidade da API e saúde básica do backend.
 */
const { anexarContextoErro } = require("../utils/errorUtils");
module.exports = function registerDiagnosticRoutes(app, deps) {
  const { prisma } = deps;

app.get("/api", async (req, res, next) => {
  try {
    await prisma.$connect();
    res.send("API rodando");
  } catch (error) {
    return next(anexarContextoErro(error, req, { publicMessage: "Erro ao conectar com o banco" }));
  }
});

app.get("/teste-banco", async (req, res, next) => {
  try {
    await prisma.$connect();
    res.send("Conexão com o banco funcionando");
  } catch (error) {
    return next(anexarContextoErro(error, req, { publicMessage: "Erro ao conectar com o banco" }));
  }
});

};