/**
 * Rotas de categorias e itens globais do sistema.
 */
const validateSchema = require("../middlewares/validateSchema");
const { anexarContextoErro } = require("../utils/errorUtils");
const {
  categoriaIdParamSchema,
  itemIdParamSchema,
  categoriaBodySchema,
  itemBodySchema,
} = require("../validators/categoriaItemSchemas");

module.exports = function registerCategoriaItemRoutes(app, deps) {
  const { prisma, exigirAutenticacao, exigirPapel, exigirAdminSistema, normalizarUnidade } = deps;

  app.get("/categorias", async (req, res, next) => {
    try {
      const categorias = await prisma.categoria.findMany({
        orderBy: { id: "asc" },
      });

      res.json(categorias);
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao buscar categorias" }));
    }
  });

  app.get("/categorias/:id", validateSchema({ params: categoriaIdParamSchema }), async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const categoria = await prisma.categoria.findUnique({ where: { id } });

      if (!categoria) {
        return res.status(404).json({ erro: "Categoria não encontrada" });
      }

      res.json(categoria);
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao buscar categoria" }));
    }
  });

  app.post("/categorias", exigirAutenticacao, exigirAdminSistema, validateSchema({ body: categoriaBodySchema }), async (req, res, next) => {
    try {
      const categoria = await prisma.categoria.create({
        data: { nome: req.body.nome.trim() },
      });

      res.status(201).json(categoria);
    } catch (error) {
      if (error.code === "P2002") {
        return res.status(409).json({ erro: "Essa categoria já existe" });
      }

      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao criar categoria" }));
    }
  });

  app.put("/categorias/:id", exigirAutenticacao, exigirAdminSistema, validateSchema({ params: categoriaIdParamSchema, body: categoriaBodySchema }), async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const categoria = await prisma.categoria.update({
        where: { id },
        data: { nome: req.body.nome.trim() },
      });

      res.json(categoria);
    } catch (error) {
      if (error.code === "P2025") {
        return res.status(404).json({ erro: "Categoria não encontrada" });
      }

      if (error.code === "P2002") {
        return res.status(409).json({ erro: "Essa categoria já existe" });
      }

      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao atualizar categoria" }));
    }
  });

  app.delete("/categorias/:id", exigirAutenticacao, exigirAdminSistema, validateSchema({ params: categoriaIdParamSchema }), async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      await prisma.categoria.delete({ where: { id } });
      res.json({ mensagem: "Categoria excluída com sucesso" });
    } catch (error) {
      if (error.code === "P2025") {
        return res.status(404).json({ erro: "Categoria não encontrada" });
      }

      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao excluir categoria" }));
    }
  });

  app.get("/itens", async (req, res, next) => {
    try {
      const itens = await prisma.item.findMany({
        where: { excluidoEm: null },
        orderBy: { id: "asc" },
        include: { categoria: true },
      });

      res.json(itens);
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao buscar itens" }));
    }
  });

  app.get("/itens/:id", validateSchema({ params: itemIdParamSchema }), async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const item = await prisma.item.findFirst({
        where: { id, excluidoEm: null },
        include: { categoria: true },
      });

      if (!item) {
        return res.status(404).json({ erro: "Item não encontrado" });
      }

      res.json(item);
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao buscar item" }));
    }
  });

  app.post("/itens", exigirAutenticacao, exigirAdminSistema, validateSchema({ body: itemBodySchema }), async (req, res, next) => {
    try {
      const item = await prisma.item.create({
        data: {
          nome: req.body.nome.trim(),
          categoriaId: req.body.categoriaId,
          unidadePadrao: normalizarUnidade(req.body.unidadePadrao),
        },
      });

      res.status(201).json(item);
    } catch (error) {
      if (error.code === "P2002") {
        return res.status(409).json({ erro: "Esse item já existe" });
      }

      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao criar item" }));
    }
  });

  app.put("/itens/:id", exigirAutenticacao, exigirAdminSistema, validateSchema({ params: itemIdParamSchema, body: itemBodySchema }), async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const item = await prisma.item.update({
        where: { id },
        data: {
          nome: req.body.nome.trim(),
          categoriaId: req.body.categoriaId,
          unidadePadrao: normalizarUnidade(req.body.unidadePadrao),
        },
      });

      res.json(item);
    } catch (error) {
      if (error.code === "P2025") {
        return res.status(404).json({ erro: "Item não encontrado" });
      }

      if (error.code === "P2002") {
        return res.status(409).json({ erro: "Esse item já existe" });
      }

      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao atualizar item" }));
    }
  });

  app.delete("/itens/:id", exigirAutenticacao, exigirAdminSistema, validateSchema({ params: itemIdParamSchema }), async (req, res, next) => {
    try {
      const id = Number(req.params.id);

      await prisma.item.update({
        where: { id },
        data: {
          desativadoEm: new Date(),
          excluidoEm: new Date(),
        },
      });

      res.json({ mensagem: "Item excluído logicamente com sucesso" });
    } catch (error) {
      if (error.code === "P2025") {
        return res.status(404).json({ erro: "Item não encontrado" });
      }

      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao excluir item" }));
    }
  });
};
