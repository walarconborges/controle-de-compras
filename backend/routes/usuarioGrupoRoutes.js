/**
 * Rotas administrativas de vínculo usuário-grupo.
 * Exclusão destrutiva foi substituída por exclusão lógica.
 */
const validateSchema = require("../middlewares/validateSchema");
const { anexarContextoErro } = require("../utils/errorUtils");
const { registrarAuditoria } = require("../utils/audit");
const {
  usuarioGrupoIdParamSchema,
  usuarioGrupoBodySchema,
} = require("../validators/usuarioGrupoSchemas");

function normalizarPapelGrupo(papel) {
  const valor = String(papel || "").trim();
  if (valor === "admin") return "adminGrupo";
  if (valor === "adminGrupo") return "adminGrupo";
  return "membro";
}

function parseGrupoId(valor) {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

module.exports = function registerUsuarioGrupoRoutes(app, deps) {
  const { prisma, exigirAutenticacao, exigirPapel, obterGrupoIdSessao, idsSaoIguais } = deps;

  function ehAdminSistema(req) {
    return Boolean(req.session.usuario?.adminSistema);
  }

  function obterGrupoAlvo(req, { obrigatorio = true, preferirBody = false } = {}) {
    if (!ehAdminSistema(req)) {
      return parseGrupoId(obterGrupoIdSessao(req));
    }

    const grupoIdBody = preferirBody ? parseGrupoId(req.body?.grupoId) : null;
    const grupoIdQuery = parseGrupoId(req.query?.grupoId);
    const grupoIdSessao = parseGrupoId(obterGrupoIdSessao(req));
    const grupoId = grupoIdBody || grupoIdQuery || grupoIdSessao || null;

    if (!grupoId && obrigatorio) {
      return null;
    }

    return grupoId;
  }

  app.get("/usuarios-grupos", exigirAutenticacao, exigirPapel("adminGrupo", "adminSistema"), async (req, res, next) => {
    try {
      const grupoId = obterGrupoAlvo(req, { obrigatorio: false });

      const vinculos = await prisma.usuarioGrupo.findMany({
        where: {
          excluidoEm: null,
          ...(grupoId ? { grupoId } : {}),
        },
        orderBy: [{ grupoId: "asc" }, { id: "asc" }],
        include: {
          usuario: {
            select: {
              id: true,
              nome: true,
              sobrenome: true,
              email: true,
              ativo: true,
            },
          },
          grupo: true,
        },
      });

      res.json(vinculos);
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao buscar vínculos" }));
    }
  });

  app.get("/usuarios-grupos/:id", exigirAutenticacao, exigirPapel("adminGrupo", "adminSistema"), validateSchema({ params: usuarioGrupoIdParamSchema }), async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const grupoId = obterGrupoAlvo(req, { obrigatorio: false });

      const vinculo = await prisma.usuarioGrupo.findFirst({
        where: {
          id,
          excluidoEm: null,
          ...(grupoId ? { grupoId } : {}),
        },
        include: {
          usuario: { select: { id: true, nome: true, sobrenome: true, email: true, ativo: true } },
          grupo: true,
        },
      });

      if (!vinculo) {
        return res.status(404).json({ erro: "Vínculo não encontrado" });
      }

      res.json(vinculo);
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao buscar vínculo" }));
    }
  });

  app.post("/usuarios-grupos", exigirAutenticacao, exigirPapel("adminGrupo", "adminSistema"), validateSchema({ body: usuarioGrupoBodySchema }), async (req, res, next) => {
    try {
      const usuarioId = Number(req.body.usuarioId);
      const grupoId = Number(req.body.grupoId);
      const papel = normalizarPapelGrupo(req.body.papel);
      const grupoIdSessao = parseGrupoId(obterGrupoIdSessao(req));

      if (!ehAdminSistema(req) && !idsSaoIguais(grupoId, grupoIdSessao)) {
        return res.status(403).json({ erro: "Não é permitido criar vínculo em outro grupo" });
      }

      const vinculo = await prisma.usuarioGrupo.upsert({
        where: {
          usuarioId_grupoId: {
            usuarioId,
            grupoId,
          },
        },
        update: {
          papel,
          status: "aceito",
          aprovadoEm: new Date(),
          aprovadoPorEmail: req.session.usuario.email,
          removidoEm: null,
          canceladoEm: null,
          excluidoEm: null,
          desativadoEm: null,
        },
        create: {
          usuarioId,
          grupoId,
          papel,
          status: "aceito",
          aprovadoEm: new Date(),
          aprovadoPorEmail: req.session.usuario.email,
        },
        include: {
          usuario: { select: { id: true, nome: true, sobrenome: true, email: true, ativo: true } },
          grupo: true,
        },
      });

      await registrarAuditoria(prisma, req, {
        entidade: "usuario_grupo",
        entidadeId: vinculo.id,
        acao: "vinculo_aprovado",
        descricao: `Vínculo criado e aprovado para ${vinculo.usuario.email}`,
        grupoId: vinculo.grupoId,
        metadados: { aprovadoPorEmail: req.session.usuario.email, papel: vinculo.papel },
      });

      res.status(201).json(vinculo);
    } catch (error) {
      if (error.code === "P2002") {
        return res.status(409).json({ erro: "Esse vínculo já existe" });
      }

      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao criar vínculo" }));
    }
  });

  app.put("/usuarios-grupos/:id", exigirAutenticacao, exigirPapel("adminGrupo", "adminSistema"), validateSchema({ params: usuarioGrupoIdParamSchema, body: usuarioGrupoBodySchema }), async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const usuarioId = Number(req.body.usuarioId);
      const grupoId = Number(req.body.grupoId);
      const papel = normalizarPapelGrupo(req.body.papel);
      const grupoIdSessao = parseGrupoId(obterGrupoIdSessao(req));

      const vinculoExistente = await prisma.usuarioGrupo.findFirst({
        where: {
          id,
          excluidoEm: null,
          ...(!ehAdminSistema(req) ? { grupoId: grupoIdSessao } : {}),
        },
      });

      if (!vinculoExistente) {
        return res.status(404).json({ erro: "Vínculo não encontrado" });
      }

      if (!ehAdminSistema(req) && !idsSaoIguais(grupoId, grupoIdSessao)) {
        return res.status(403).json({ erro: "Não é permitido mover vínculo para outro grupo" });
      }

      const vinculo = await prisma.usuarioGrupo.update({
        where: { id },
        data: { usuarioId, grupoId, papel },
        include: {
          usuario: { select: { id: true, nome: true, sobrenome: true, email: true, ativo: true } },
          grupo: true,
        },
      });

      res.json(vinculo);
    } catch (error) {
      if (error.code === "P2025") {
        return res.status(404).json({ erro: "Vínculo não encontrado" });
      }

      if (error.code === "P2002") {
        return res.status(409).json({ erro: "Esse vínculo já existe" });
      }

      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao atualizar vínculo" }));
    }
  });

  app.delete("/usuarios-grupos/:id", exigirAutenticacao, exigirPapel("adminGrupo", "adminSistema"), validateSchema({ params: usuarioGrupoIdParamSchema }), async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const grupoId = obterGrupoAlvo(req, { obrigatorio: false });

      const vinculo = await prisma.usuarioGrupo.findFirst({
        where: {
          id,
          excluidoEm: null,
          ...(grupoId ? { grupoId } : {}),
        },
      });

      if (!vinculo) {
        return res.status(404).json({ erro: "Vínculo não encontrado" });
      }

      await prisma.usuarioGrupo.update({
        where: { id },
        data: {
          status: "removido",
          removidoEm: new Date(),
          excluidoEm: new Date(),
        },
      });

      res.json({ mensagem: "Vínculo excluído logicamente com sucesso" });
    } catch (error) {
      if (error.code === "P2025") {
        return res.status(404).json({ erro: "Vínculo não encontrado" });
      }

      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao excluir vínculo" }));
    }
  });
};
