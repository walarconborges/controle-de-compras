/**
 * Rotas de sistema e do Painel do Sistema.
 * O frontend administrativo conversa com rotas reais e coerentes com as permissões.
 */
const { anexarContextoErro } = require("../utils/errorUtils");
const { registrarAuditoria } = require("../utils/audit");

function construirFiltroLogs(query = {}) {
  const { entidade, acao, autorEmail, itemId, usuarioId } = query;
  const where = {};

  if (entidade) where.entidade = String(entidade);
  if (acao) where.acao = String(acao);
  if (autorEmail) where.autorEmail = { contains: String(autorEmail), mode: "insensitive" };
  if (itemId) where.itemId = Number(itemId);
  if (usuarioId) where.usuarioAutorId = Number(usuarioId);

  return where;
}

module.exports = function registerSystemRoutes(app, deps) {
  const {
    path,
    PUBLIC_PATH,
    prisma,
    exigirAutenticacao,
    exigirPapel,
    exigirAdminSistema,
    obterGrupoIdSessao,
  } = deps;
  const express = require("express");

  app.use(express.static(PUBLIC_PATH));

  app.get("/", (req, res) => {
    res.sendFile(path.join(PUBLIC_PATH, "index.html"));
  });

  app.get("/health", (req, res) => {
    res.status(200).send("ok");
  });

  app.get("/auditoria-logs", exigirAutenticacao, async (req, res, next) => {
    try {
      const where = construirFiltroLogs(req.query);
      const adminSistema = req.session?.usuario?.adminSistema === true;
      const papelGrupo = req.session?.usuario?.papel || null;

      if (!adminSistema) {
        if (papelGrupo !== "adminGrupo") {
          return res.status(403).json({ erro: "Sem permissão para visualizar logs" });
        }

        const grupoId = obterGrupoIdSessao(req);
        if (!grupoId) {
          return res.status(400).json({ erro: "Nenhum grupo ativo selecionado" });
        }

        where.grupoId = grupoId;
      }

      const logs = await prisma.auditoriaLog.findMany({
        where,
        orderBy: { criadoEm: "desc" },
        take: 200,
        include: {
          usuarioAutor: { select: { id: true, nome: true, sobrenome: true, email: true } },
          grupo: { select: { id: true, nome: true, codigo: true } },
          item: { select: { id: true, nome: true } },
        },
      });

      res.json(logs);
    } catch (error) {
      next(anexarContextoErro(error, req, { publicMessage: "Erro ao carregar logs" }));
    }
  });

  app.get("/meu-grupo/logs", exigirAutenticacao, exigirPapel("adminGrupo", "adminSistema"), async (req, res, next) => {
    try {
      const grupoId = obterGrupoIdSessao(req);

      if (!grupoId) {
        return res.status(400).json({ erro: "Nenhum grupo ativo selecionado" });
      }

      const where = {
        ...construirFiltroLogs(req.query),
        grupoId,
      };

      const logs = await prisma.auditoriaLog.findMany({
        where,
        orderBy: { criadoEm: "desc" },
        take: 200,
        include: {
          usuarioAutor: { select: { id: true, nome: true, sobrenome: true, email: true } },
          grupo: { select: { id: true, nome: true, codigo: true } },
          item: { select: { id: true, nome: true } },
        },
      });

      res.json(logs);
    } catch (error) {
      next(anexarContextoErro(error, req, { publicMessage: "Erro ao carregar logs do grupo" }));
    }
  });

  app.get("/painel-sistema/resumo", exigirAutenticacao, exigirAdminSistema, async (req, res, next) => {
    try {
      const [usuarios, grupos, itens, pendencias, logs] = await Promise.all([
        prisma.usuario.count({ where: { excluidoEm: null } }),
        prisma.grupo.count({ where: { excluidoEm: null } }),
        prisma.item.count({ where: { excluidoEm: null } }),
        prisma.usuarioGrupo.count({ where: { excluidoEm: null, status: { in: ["pendente", "convidado"] } } }),
        prisma.auditoriaLog.count(),
      ]);

      res.json({ usuarios, grupos, itens, pendencias, logs });
    } catch (error) {
      next(anexarContextoErro(error, req, { publicMessage: "Erro ao carregar resumo do painel" }));
    }
  });

  app.get("/painel-sistema/pendencias", exigirAutenticacao, exigirAdminSistema, async (req, res, next) => {
    try {
      const pendencias = await prisma.usuarioGrupo.findMany({
        where: {
          excluidoEm: null,
          status: { in: ["pendente", "convidado"] },
        },
        orderBy: { solicitadoEm: "asc" },
        include: {
          usuario: { select: { id: true, nome: true, sobrenome: true, email: true, ativo: true } },
          grupo: { select: { id: true, nome: true, codigo: true } },
        },
      });

      res.json(pendencias);
    } catch (error) {
      next(anexarContextoErro(error, req, { publicMessage: "Erro ao carregar pendências do painel" }));
    }
  });

  app.patch("/painel-sistema/usuarios-grupos/:id/aprovar", exigirAutenticacao, exigirAdminSistema, async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const vinculo = await prisma.usuarioGrupo.findFirst({
        where: { id, excluidoEm: null, status: { in: ["pendente", "convidado"] } },
      });

      if (!vinculo) {
        return res.status(404).json({ erro: "Pendência não encontrada" });
      }

      const atualizado = await prisma.$transaction(async (tx) => {
        const atualizadoVinculo = await tx.usuarioGrupo.update({
          where: { id },
          data: {
            status: "aceito",
            aprovadoEm: new Date(),
            aprovadoPorEmail: req.session.usuario.email,
          },
        });

        const usuario = await tx.usuario.findUnique({
          where: { id: vinculo.usuarioId },
          select: { grupoAtivoId: true },
        });

        if (!usuario?.grupoAtivoId) {
          await tx.usuario.update({
            where: { id: vinculo.usuarioId },
            data: { grupoAtivoId: vinculo.grupoId },
          });
        }

        return atualizadoVinculo;
      });

      await registrarAuditoria(prisma, req, {
        entidade: "usuario_grupo",
        entidadeId: atualizado.id,
        acao: "pendencia_aprovada_sistema",
        descricao: `Pendência aprovada pelo Painel do Sistema para o vínculo ${atualizado.id}`,
        grupoId: vinculo.grupoId,
        metadados: {
          usuarioId: vinculo.usuarioId,
          grupoId: vinculo.grupoId,
          statusAnterior: vinculo.status,
          statusNovo: "aceito",
          aprovadoPorEmail: req.session.usuario.email,
        },
      });

      res.json(atualizado);
    } catch (error) {
      next(anexarContextoErro(error, req, { publicMessage: "Erro ao aprovar pendência no painel" }));
    }
  });

  app.patch("/painel-sistema/usuarios-grupos/:id/recusar", exigirAutenticacao, exigirAdminSistema, async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const vinculo = await prisma.usuarioGrupo.findFirst({
        where: { id, excluidoEm: null, status: { in: ["pendente", "convidado"] } },
      });

      if (!vinculo) {
        return res.status(404).json({ erro: "Pendência não encontrada" });
      }

      const atualizado = await prisma.usuarioGrupo.update({
        where: { id },
        data: {
          status: "recusado",
          canceladoEm: new Date(),
        },
      });

      await registrarAuditoria(prisma, req, {
        entidade: "usuario_grupo",
        entidadeId: atualizado.id,
        acao: "pendencia_recusada_sistema",
        descricao: `Pendência recusada pelo Painel do Sistema para o vínculo ${atualizado.id}`,
        grupoId: vinculo.grupoId,
        metadados: {
          usuarioId: vinculo.usuarioId,
          grupoId: vinculo.grupoId,
          statusAnterior: vinculo.status,
          statusNovo: "recusado",
        },
      });

      res.json(atualizado);
    } catch (error) {
      next(anexarContextoErro(error, req, { publicMessage: "Erro ao recusar pendência no painel" }));
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
          ativo: true,
          desativadoEm: true,
          excluidoEm: true,
        },
      });

      res.json(usuarios);
    } catch (error) {
      next(anexarContextoErro(error, req, { publicMessage: "Erro ao carregar usuários do painel" }));
    }
  });

  app.get("/painel-sistema/grupos", exigirAutenticacao, exigirAdminSistema, async (req, res, next) => {
    try {
      const grupos = await prisma.grupo.findMany({
        orderBy: { id: "asc" },
        select: {
          id: true,
          nome: true,
          codigo: true,
          desativadoEm: true,
          excluidoEm: true,
        },
      });

      res.json(grupos);
    } catch (error) {
      next(anexarContextoErro(error, req, { publicMessage: "Erro ao carregar grupos do painel" }));
    }
  });

  app.get("/painel-sistema/logs", exigirAutenticacao, exigirAdminSistema, async (req, res, next) => {
    try {
      const where = construirFiltroLogs(req.query);

      const logs = await prisma.auditoriaLog.findMany({
        where,
        orderBy: { criadoEm: "desc" },
        take: 200,
        include: {
          usuarioAutor: { select: { id: true, nome: true, sobrenome: true, email: true } },
          grupo: { select: { id: true, nome: true, codigo: true } },
          item: { select: { id: true, nome: true } },
        },
      });

      res.json(logs);
    } catch (error) {
      next(anexarContextoErro(error, req, { publicMessage: "Erro ao carregar logs do painel" }));
    }
  });
};
