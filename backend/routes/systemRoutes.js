/**
 * Este arquivo registra arquivos estáticos e rotas simples de sistema.
 * Ele existe para servir o frontend e expor uma rota básica de health check.
 */
module.exports = function registerSystemRoutes(app, deps) {
  const { path, PUBLIC_PATH } = deps;
  const express = require("express");

  app.use(express.static(PUBLIC_PATH));

  app.get("/", (req, res) => {
    res.sendFile(path.join(PUBLIC_PATH, "index.html"));
  });

  app.get("/health", (req, res) => {
    res.status(200).send("ok");
  });
};
