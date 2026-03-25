/**
 * Este arquivo registra rotas de categorias e itens globais do sistema.
 * Ele existe para concentrar operações CRUD dessas entidades sem misturar com autenticação e compras.
 */
const validateSchema = require("../middlewares/validateSchema");
const {
  categoriaIdParamSchema,
  itemIdParamSchema,
  categoriaBodySchema,
  itemBodySchema,
} = require("../validators/categoriaItemSchemas");

module.exports = function registerCategoriaItemRoutes(app, deps) {
  const { prisma, exigirAutenticacao, exigirPapel, normalizarUnidade } = deps;

  app.get("/categorias", async (req, res) => {
    try {
      const categorias = await prisma.categoria.findMany({
        orderBy: { id: "asc" },
      });

      res.json(categorias);
    } catch (error) {
      console.error("Erro ao buscar categorias:", error);
      res.status(500).json({ erro: "Erro ao buscar categorias" });
    }
  });

  app.get("/categorias/:id", validateSchema({ params: categoriaIdParamSchema }), async (req, res) => {
    try {
      const { id } = req.params;

      const categoria = await prisma.categoria.findUnique({
        where: { id },
      });

      if (!categoria) {
        return res.status(404).json({ erro: "Categoria não encontrada" });
      }

      res.json(categoria);
    } catch (error) {
      console.error("Erro ao buscar categoria:", error);
      res.status(500).json({ erro: "Erro ao buscar categoria" });
    }
  });

  app.post("/categorias", exigirAutenticacao, exigirPapel("admin"), validateSchema({ body: categoriaBodySchema }), async (req, res) => {
    try {
      const categoria = await prisma.categoria.create({
        data: { nome: req.body.nome.trim() },
      });

      res.status(201).json(categoria);
    } catch (error) {
      console.error("Erro ao criar categoria:", error);

      if (error.code === "P2002") {
        return res.status(409).json({ erro: "Essa categoria já existe" });
      }

      res.status(500).json({ erro: "Erro ao criar categoria" });
    }
  });

  app.put(
    "/categorias/:id",
    exigirAutenticacao,
    exigirPapel("admin"),
    validateSchema({ params: categoriaIdParamSchema, body: categoriaBodySchema }),
    async (req, res) => {
      try {
        const { id } = req.params;

        const categoria = await prisma.categoria.update({
          where: { id },
          data: { nome: req.body.nome.trim() },
        });

        res.json(categoria);
      } catch (error) {
        console.error("Erro ao atualizar categoria:", error);

        if (error.code === "P2025") {
          return res.status(404).json({ erro: "Categoria não encontrada" });
        }

        if (error.code === "P2002") {
          return res.status(409).json({ erro: "Essa categoria já existe" });
        }

        res.status(500).json({ erro: "Erro ao atualizar categoria" });
      }
    }
  );

  app.delete(
    "/categorias/:id",
    exigirAutenticacao,
    exigirPapel("admin"),
    validateSchema({ params: categoriaIdParamSchema }),
    async (req, res) => {
      try {
        const { id } = req.params;

        await prisma.categoria.delete({
          where: { id },
        });

        res.json({ mensagem: "Categoria excluída com sucesso" });
      } catch (error) {
        console.error("Erro ao excluir categoria:", error);

        if (error.code === "P2025") {
          return res.status(404).json({ erro: "Categoria não encontrada" });
        }

        res.status(500).json({ erro: "Erro ao excluir categoria" });
      }
    }
  );

  app.get("/itens", async (req, res) => {
    try {
      const itens = await prisma.item.findMany({
        orderBy: { id: "asc" },
        include: {
          categoria: true,
        },
      });

      res.json(itens);
    } catch (error) {
      console.error("Erro ao buscar itens:", error);
      res.status(500).json({ erro: "Erro ao buscar itens" });
    }
  });

  app.get("/itens/:id", validateSchema({ params: itemIdParamSchema }), async (req, res) => {
    try {
      const { id } = req.params;

      const item = await prisma.item.findUnique({
        where: { id },
        include: {
          categoria: true,
        },
      });

      if (!item) {
        return res.status(404).json({ erro: "Item não encontrado" });
      }

      res.json(item);
    } catch (error) {
      console.error("Erro ao buscar item:", error);
      res.status(500).json({ erro: "Erro ao buscar item" });
    }
  });

  app.post("/itens", exigirAutenticacao, exigirPapel("admin"), validateSchema({ body: itemBodySchema }), async (req, res) => {
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
      console.error("Erro ao criar item:", error);

      if (error.code === "P2002") {
        return res.status(409).json({ erro: "Esse item já existe" });
      }

      res.status(500).json({ erro: "Erro ao criar item" });
    }
  });

  app.put(
    "/itens/:id",
    exigirAutenticacao,
    exigirPapel("admin"),
    validateSchema({ params: itemIdParamSchema, body: itemBodySchema }),
    async (req, res) => {
      try {
        const { id } = req.params;

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
        console.error("Erro ao atualizar item:", error);

        if (error.code === "P2025") {
          return res.status(404).json({ erro: "Item não encontrado" });
        }

        if (error.code === "P2002") {
          return res.status(409).json({ erro: "Esse item já existe" });
        }

        res.status(500).json({ erro: "Erro ao atualizar item" });
      }
    }
  );

  app.delete("/itens/:id", exigirAutenticacao, exigirPapel("admin"), validateSchema({ params: itemIdParamSchema }), async (req, res) => {
    try {
      const { id } = req.params;

      await prisma.item.delete({
        where: { id },
      });

      res.json({ mensagem: "Item excluído com sucesso" });
    } catch (error) {
      console.error("Erro ao excluir item:", error);

      if (error.code === "P2025") {
        return res.status(404).json({ erro: "Item não encontrado" });
      }

      res.status(500).json({ erro: "Erro ao excluir item" });
    }
  });
};
