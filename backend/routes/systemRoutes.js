/**
 * Arquivos estáticos e painel do sistema.
 */
module.exports = function registerSystemRoutes(app, deps) {
  const { path, PUBLIC_PATH, prisma, exigirAutenticacao, exigirAdminSistema } = deps;
  const express = require("express");

  app.use(express.static(PUBLIC_PATH));

  app.get("/", (req, res) => {
    res.sendFile(path.join(PUBLIC_PATH, "index.html"));
  });

  app.get("/health", (req, res) => {
    res.status(200).send("ok");
  });

  app.get("/painel-sistema/resumo", exigirAutenticacao, exigirAdminSistema, async (req, res, next) => {
    try {
      const [usuarios, grupos, itens, pendencias, logs] = await Promise.all([
        prisma.usuario.count({ where: { excluidoEm: null } }),
        prisma.grupo.count({ where: { excluidoEm: null } }),
        prisma.item.count({ where: { excluidoEm: null } }),
        prisma.usuarioGrupo.count({ where: { status: { in: ["pendente", "convidado"] }, excluidoEm: null } }),
        prisma.auditoriaLog.count(),
      ]);

      res.json({ usuarios, grupos, itens, pendencias, logs });
    } catch (error) {
      next(error);
    }
  });

  app.get("/painel-sistema/usuarios", exigirAutenticacao, exigirAdminSistema, async (req, res, next) => {
    try {
      const usuarios = await prisma.usuario.findMany({
        where: { excluidoEm: null },
        orderBy: { id: "asc" },
        select: {
          id: true,
          nome: true,
          sobrenome: true,
          email: true,
          papelGlobal: true,
          grupoAtivoId: true,
          ativo: true,
          desativadoEm: true,
          excluidoEm: true,
          criadoEm: true,
          atualizadoEm: true,
        },
      });

      res.json(usuarios);
    } catch (error) {
      next(error);
    }
  });

  app.get("/painel-sistema/grupos", exigirAutenticacao, exigirAdminSistema, async (req, res, next) => {
    try {
      const grupos = await prisma.grupo.findMany({
        where: { excluidoEm: null },
        orderBy: { id: "asc" },
      });

      res.json(grupos);
    } catch (error) {
      next(error);
    }
  });

  app.get("/painel-sistema/itens", exigirAutenticacao, exigirAdminSistema, async (req, res, next) => {
    try {
      const itens = await prisma.item.findMany({
        where: { excluidoEm: null },
        orderBy: { id: "asc" },
        include: { categoria: true },
      });

      res.json(itens);
    } catch (error) {
      next(error);
    }
  });

  app.get("/painel-sistema/pendencias", exigirAutenticacao, exigirAdminSistema, async (req, res, next) => {
    try {
      const pendencias = await prisma.usuarioGrupo.findMany({
        where: {
          status: { in: ["pendente", "convidado"] },
          excluidoEm: null,
        },
        orderBy: [{ criadoEm: "desc" }],
        include: {
          usuario: {
            select: { id: true, nome: true, sobrenome: true, email: true },
          },
          grupo: {
            select: { id: true, nome: true, codigo: true },
          },
        },
      });

      res.json(pendencias);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/painel-sistema/usuarios-grupos/:id/aprovar", exigirAutenticacao, exigirAdminSistema, async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const vinculo = await prisma.usuarioGrupo.update({
        where: { id },
        data: { status: "aceito", aprovadoEm: new Date() },
      });
      res.json({ mensagem: "Pendência aprovada com sucesso", vinculo });
    } catch (error) {
      next(error);
    }
  });

  app.patch("/painel-sistema/usuarios-grupos/:id/recusar", exigirAutenticacao, exigirAdminSistema, async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const vinculo = await prisma.usuarioGrupo.update({
        where: { id },
        data: { status: "recusado", canceladoEm: new Date() },
      });
      res.json({ mensagem: "Pendência recusada com sucesso", vinculo });
    } catch (error) {
      next(error);
    }
  });

  app.patch("/painel-sistema/usuarios/:id", exigirAutenticacao, exigirAdminSistema, async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const acao = String(req.body.acao || "").trim();
      const data = {};

      if (req.body.nome) data.nome = String(req.body.nome).trim();
      if (req.body.sobrenome !== undefined) data.sobrenome = String(req.body.sobrenome || "").trim();
      if (req.body.email) data.email = String(req.body.email).trim().toLowerCase();
      if (req.body.papelGlobal) data.papelGlobal = String(req.body.papelGlobal).trim();

      if (acao === "desativar") {
        data.ativo = false;
        data.desativadoEm = new Date();
      } else if (acao === "reativar") {
        data.ativo = true;
        data.desativadoEm = null;
        data.excluidoEm = null;
      } else if (acao === "excluir") {
        data.ativo = false;
        data.desativadoEm = new Date();
        data.excluidoEm = new Date();
      }

      const usuario = await prisma.usuario.update({ where: { id }, data });
      res.json({ mensagem: "Usuário atualizado com sucesso", usuario });
    } catch (error) {
      next(error);
    }
  });

  app.patch("/painel-sistema/grupos/:id", exigirAutenticacao, exigirAdminSistema, async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const acao = String(req.body.acao || "").trim();
      const data = {};

      if (req.body.nome) data.nome = String(req.body.nome).trim();
      if (acao === "desativar") data.desativadoEm = new Date();
      if (acao === "reativar") {
        data.desativadoEm = null;
        data.excluidoEm = null;
      }
      if (acao === "excluir") {
        data.desativadoEm = new Date();
        data.excluidoEm = new Date();
      }

      const grupo = await prisma.grupo.update({ where: { id }, data });
      res.json({ mensagem: "Grupo atualizado com sucesso", grupo });
    } catch (error) {
      next(error);
    }
  });

  app.patch("/painel-sistema/itens/:id", exigirAutenticacao, exigirAdminSistema, async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const acao = String(req.body.acao || "").trim();
      const data = {};

      if (req.body.nome) data.nome = String(req.body.nome).trim();
      if (req.body.unidadePadrao) data.unidadePadrao = String(req.body.unidadePadrao).trim();
      if (acao === "desativar") data.desativadoEm = new Date();
      if (acao === "reativar") {
        data.desativadoEm = null;
        data.excluidoEm = null;
      }
      if (acao === "excluir") {
        data.desativadoEm = new Date();
        data.excluidoEm = new Date();
      }

      const item = await prisma.item.update({ where: { id }, data });
      res.json({ mensagem: "Item atualizado com sucesso", item });
    } catch (error) {
      next(error);
    }
  });

  app.get("/painel-sistema/logs", exigirAutenticacao, exigirAdminSistema, async (req, res, next) => {
    try {
      const { usuarioId, grupoId, entidade, acao, statusHttp } = req.query;
      const logs = await prisma.auditoriaLog.findMany({
        where: {
          usuarioAutorId: usuarioId ? Number(usuarioId) : undefined,
          grupoId: grupoId ? Number(grupoId) : undefined,
          entidade: entidade ? String(entidade) : undefined,
          acao: acao ? String(acao) : undefined,
          statusHttp: statusHttp ? Number(statusHttp) : undefined,
        },
        orderBy: { criadoEm: "desc" },
        take: 300,
        include: {
          usuarioAutor: {
            select: { id: true, nome: true, sobrenome: true, email: true },
          },
          grupo: {
            select: { id: true, nome: true, codigo: true },
          },
        },
      });

      res.json(logs);
    } catch (error) {
      next(error);
    }
  });
};
