/**
 * Rotas administrativas de vínculos entre usuários e grupos.
 */
const validateSchema = require("../middlewares/validateSchema");
const { anexarContextoErro } = require("../utils/errorUtils");
const {
  usuarioGrupoIdParamSchema,
  usuarioGrupoBodySchema,
} = require("../validators/usuarioGrupoSchemas");

module.exports = function registerUsuarioGrupoRoutes(app, deps) {
  const { prisma, exigirAutenticacao, exigirPapel, exigirGrupoAtivoAceito, obterGrupoIdSessao, idsSaoIguais } = deps;

  app.get("/usuarios-grupos", exigirAutenticacao, exigirGrupoAtivoAceito, exigirPapel("adminGrupo"), async (req, res, next) => {
    try {
      const grupoId = obterGrupoIdSessao(req);

      const vinculos = await prisma.usuarioGrupo.findMany({
        where: {
          grupoId,
          excluidoEm: null,
        },
        orderBy: { id: "asc" },
        include: {
          usuario: {
            select: { id: true, nome: true, sobrenome: true, email: true, ativo: true },
          },
          grupo: true,
        },
      });

      res.json(vinculos);
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao buscar vínculos" }));
    }
  });

  app.get("/usuarios-grupos/:id", exigirAutenticacao, exigirGrupoAtivoAceito, exigirPapel("adminGrupo"), validateSchema({ params: usuarioGrupoIdParamSchema }), async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const grupoId = obterGrupoIdSessao(req);

      const vinculo = await prisma.usuarioGrupo.findFirst({
        where: { id, grupoId, excluidoEm: null },
        include: {
          usuario: { select: { id: true, nome: true, sobrenome: true, email: true, ativo: true } },
          grupo: true,
        },
      });

      if (!vinculo) {
        return res.status(404).json({ erro: "Vínculo não encontrado no seu grupo" });
      }

      res.json(vinculo);
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao buscar vínculo" }));
    }
  });

  app.post("/usuarios-grupos", exigirAutenticacao, exigirGrupoAtivoAceito, exigirPapel("adminGrupo"), validateSchema({ body: usuarioGrupoBodySchema }), async (req, res, next) => {
    try {
      const { usuarioId, grupoId, papel } = req.body;
      const grupoIdSessao = obterGrupoIdSessao(req);

      if (!idsSaoIguais(grupoId, grupoIdSessao)) {
        return res.status(403).json({ erro: "Não é permitido criar vínculo em outro grupo" });
      }

      const vinculo = await prisma.usuarioGrupo.create({
        data: {
          usuarioId,
          grupoId,
          papel: String(papel || "").trim() || "membro",
          status: "aceito",
          aprovadoEm: new Date(),
        },
        include: {
          usuario: { select: { id: true, nome: true, sobrenome: true, email: true, ativo: true } },
          grupo: true,
        },
      });

      res.status(201).json(vinculo);
    } catch (error) {
      if (error.code === "P2002") {
        return res.status(409).json({ erro: "Esse vínculo já existe" });
      }

      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao criar vínculo" }));
    }
  });

  app.put("/usuarios-grupos/:id", exigirAutenticacao, exigirGrupoAtivoAceito, exigirPapel("adminGrupo"), validateSchema({ params: usuarioGrupoIdParamSchema, body: usuarioGrupoBodySchema }), async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const { usuarioId, grupoId, papel } = req.body;
      const grupoIdSessao = obterGrupoIdSessao(req);

      if (!idsSaoIguais(grupoId, grupoIdSessao)) {
        return res.status(403).json({ erro: "Não é permitido mover vínculo para outro grupo" });
      }

      const vinculoExistente = await prisma.usuarioGrupo.findFirst({
        where: { id, grupoId: grupoIdSessao, excluidoEm: null },
      });

      if (!vinculoExistente) {
        return res.status(404).json({ erro: "Vínculo não encontrado no seu grupo" });
      }

      const vinculo = await prisma.usuarioGrupo.update({
        where: { id },
        data: {
          usuarioId,
          grupoId,
          papel: String(papel || "").trim(),
        },
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

  app.delete("/usuarios-grupos/:id", exigirAutenticacao, exigirGrupoAtivoAceito, exigirPapel("adminGrupo"), validateSchema({ params: usuarioGrupoIdParamSchema }), async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const grupoId = obterGrupoIdSessao(req);

      const vinculo = await prisma.usuarioGrupo.findFirst({
        where: { id, grupoId, excluidoEm: null },
      });

      if (!vinculo) {
        return res.status(404).json({ erro: "Vínculo não encontrado no seu grupo" });
      }

      const atualizado = await prisma.usuarioGrupo.update({
        where: { id },
        data: {
          status: vinculo.status === "aceito" ? "removido" : "cancelado",
          removidoEm: new Date(),
          excluidoEm: new Date(),
        },
      });

      res.json({ mensagem: "Vínculo removido logicamente com sucesso", vinculo: atualizado });
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao remover vínculo" }));
    }
  });
};
