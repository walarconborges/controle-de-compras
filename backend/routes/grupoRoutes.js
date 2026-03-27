/**
 * Rotas de grupos com papéis consistentes e exclusão lógica.
 */
const validateSchema = require("../middlewares/validateSchema");
const { grupoIdParamSchema, grupoBodySchema } = require("../validators/grupoSchemas");
const { anexarContextoErro } = require("../utils/errorUtils");

module.exports = function registerGrupoRoutes(app, deps) {
  const {
    prisma,
    exigirAutenticacao,
    exigirPapel,
    exigirAdminSistema,
    obterGrupoIdSessao,
    idsSaoIguais,
    normalizarNomeGrupo,
    gerarCodigoGrupo,
  } = deps;

  function ehAdminSistema(req) {
    return Boolean(req.session.usuario?.adminSistema);
  }

  app.get("/grupos", exigirAutenticacao, async (req, res, next) => {
    try {
      if (ehAdminSistema(req)) {
        const grupos = await prisma.grupo.findMany({
          where: { excluidoEm: null },
          orderBy: { id: "asc" },
        });
        return res.json(grupos);
      }

      const grupoId = obterGrupoIdSessao(req);
      if (!grupoId) return res.json([]);

      const grupos = await prisma.grupo.findMany({
        where: { id: grupoId, excluidoEm: null },
        orderBy: { id: "asc" },
      });

      res.json(grupos);
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao buscar grupos" }));
    }
  });

  app.get("/grupos/:id", exigirAutenticacao, validateSchema({ params: grupoIdParamSchema }), async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const grupoIdSessao = obterGrupoIdSessao(req);

      if (!idsSaoIguais(id, grupoIdSessao) && !ehAdminSistema(req)) {
        return res.status(403).json({ erro: "Acesso negado a outro grupo" });
      }

      const grupo = await prisma.grupo.findFirst({
        where: { id, excluidoEm: null },
      });

      if (!grupo) {
        return res.status(404).json({ erro: "Grupo não encontrado" });
      }

      res.json(grupo);
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao buscar grupo" }));
    }
  });

  app.post("/grupos", exigirAutenticacao, exigirAdminSistema, validateSchema({ body: grupoBodySchema }), async (req, res, next) => {
    try {
      const nome = normalizarNomeGrupo(req.body.nome);

      const grupoCriado = await prisma.grupo.create({
        data: { nome, codigo: "TEMP" },
      });

      const grupo = await prisma.grupo.update({
        where: { id: grupoCriado.id },
        data: { codigo: gerarCodigoGrupo(grupoCriado.nome, grupoCriado.id) },
      });

      res.status(201).json(grupo);
    } catch (error) {
      if (error.code === "P2002") {
        return res.status(409).json({ erro: "Esse grupo já existe" });
      }

      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao criar grupo" }));
    }
  });

  app.put("/grupos/:id", exigirAutenticacao, validateSchema({ params: grupoIdParamSchema, body: grupoBodySchema }), async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const grupoIdSessao = obterGrupoIdSessao(req);

      if (!ehAdminSistema(req)) {
        if (!req.session.usuario?.temGrupoAceito || req.session.usuario?.papel !== "adminGrupo") {
          return res.status(403).json({ erro: "Acesso negado" });
        }

        if (!idsSaoIguais(id, grupoIdSessao)) {
          return res.status(403).json({ erro: "Acesso negado a outro grupo" });
        }
      }

      const grupo = await prisma.grupo.update({
        where: { id },
        data: { nome: normalizarNomeGrupo(req.body.nome) },
      });

      res.json(grupo);
    } catch (error) {
      if (error.code === "P2025") {
        return res.status(404).json({ erro: "Grupo não encontrado" });
      }

      if (error.code === "P2002") {
        return res.status(409).json({ erro: "Esse grupo já existe" });
      }

      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao atualizar grupo" }));
    }
  });

  app.delete("/grupos/:id", exigirAutenticacao, exigirAdminSistema, validateSchema({ params: grupoIdParamSchema }), async (req, res, next) => {
    try {
      const id = Number(req.params.id);

      await prisma.grupo.update({
        where: { id },
        data: {
          desativadoEm: new Date(),
          excluidoEm: new Date(),
        },
      });

      res.json({ mensagem: "Grupo excluído logicamente com sucesso" });
    } catch (error) {
      if (error.code === "P2025") {
        return res.status(404).json({ erro: "Grupo não encontrado" });
      }

      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao excluir grupo" }));
    }
  });
};
