/**
 * Este arquivo registra arquivos estáticos e rotas simples de sistema.
 * Ele existe para servir o frontend e expor uma rota básica de health check.
 */
module.exports = function registerSystemRoutes(app, deps) {
  const { path, PUBLIC_PATH, prisma, exigirAutenticacao, exigirPapel, obterGrupoIdSessao } = deps;
  const express = require("express");

  app.use(express.static(PUBLIC_PATH));

  app.get("/", (req, res) => {
    res.sendFile(path.join(PUBLIC_PATH, "index.html"));
  });

  app.get("/health", (req, res) => {
    res.status(200).send("ok");
  });

  app.get("/auditoria-logs", exigirAutenticacao, exigirPapel("admin"), async (req, res, next) => {
    try {
      const { entidade, acao, autorEmail, itemId } = req.query;
      const where = {};
      if (entidade) where.entidade = entidade;
      if (acao) where.acao = acao;
      if (autorEmail) where.autorEmail = { contains: String(autorEmail), mode: "insensitive" };
      if (itemId) where.itemId = Number(itemId);
      const logs = await prisma.auditoriaLog.findMany({ where, orderBy: { criadoEm: "desc" }, take: 200 });
      res.json(logs);
    } catch (error) {
      next(error);
    }
  });

  app.get("/meu-grupo/logs", exigirAutenticacao, exigirPapel("admin"), async (req, res, next) => {
    try {
      const grupoId = obterGrupoIdSessao(req);
      const { entidade, acao, autorEmail, itemId } = req.query;
      const where = { grupoId };
      if (entidade) where.entidade = entidade;
      if (acao) where.acao = acao;
      if (autorEmail) where.autorEmail = { contains: String(autorEmail), mode: "insensitive" };
      if (itemId) where.itemId = Number(itemId);
      const logs = await prisma.auditoriaLog.findMany({ where, orderBy: { criadoEm: "desc" }, take: 200 });
      res.json(logs);
    } catch (error) {
      next(error);
    }
  });
};
