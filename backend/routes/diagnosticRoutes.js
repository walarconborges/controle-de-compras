/**
 * Este arquivo registra rotas técnicas de diagnóstico.
 * Ele existe para testar conexão, disponibilidade da API e saúde básica do backend.
 */
module.exports = function registerDiagnosticRoutes(app, deps) {
  const { prisma } = deps;

app.get("/api", async (req, res) => {
  try {
    await prisma.$connect();
    res.send("API rodando");
  } catch (error) {
    console.error("Erro ao conectar com o banco:", error);
    res.status(500).send("Erro ao conectar com o banco");
  }
});

app.get("/teste-banco", async (req, res) => {
  try {
    await prisma.$connect();
    res.send("Conexão com o banco funcionando");
  } catch (error) {
    console.error("Erro no teste com o banco:", error);
    res.status(500).send("Erro ao conectar com o banco");
  }
});

};
