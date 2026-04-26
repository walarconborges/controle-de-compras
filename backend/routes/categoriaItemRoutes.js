/**
 * Este arquivo registra rotas de categorias e itens globais do sistema.
 * Ele existe para concentrar operações CRUD dessas entidades sem misturar com autenticação e estoque do grupo.
 */
const validateSchema = require("../middlewares/validateSchema");
const { anexarContextoErro } = require("../utils/errorUtils");
const { registrarAuditoria } = require("../utils/audit");
const {
  categoriaIdParamSchema,
  itemIdParamSchema,
  categoriaBodySchema,
  itemBodySchema,
} = require("../validators/categoriaItemSchemas");

module.exports = function registerCategoriaItemRoutes(app, deps) {
  const { prisma, exigirAutenticacao, exigirPapel } = deps;

  app.get("/categorias", async (req, res, next) => {
    try {
      const categorias = await prisma.categoria.findMany({
        orderBy: { nome: "asc" },
      });

      res.json(categorias);
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao buscar categorias" }));
    }
  });

  app.get("/categorias/:id", validateSchema({ params: categoriaIdParamSchema }), async (req, res, next) => {
    try {
      const id = Number(req.params.id);

      const categoria = await prisma.categoria.findUnique({
        where: { id },
      });

      if (!categoria) {
        return res.status(404).json({ erro: "Categoria não encontrada" });
      }

      res.json(categoria);
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao buscar categoria" }));
    }
  });

  app.post(
    "/categorias",
    exigirAutenticacao,
    exigirPapel("admin"),
    validateSchema({ body: categoriaBodySchema }),
    async (req, res, next) => {
      try {
        const nome = String(req.body.nome || "").trim();

        const categoria = await prisma.categoria.create({
          data: { nome },
        });

        await registrarAuditoria(prisma, req, {
          entidade: "categoria",
          entidadeId: categoria.id,
          acao: "criacao_categoria",
          descricao: `Categoria ${categoria.nome} criada`,
        });

        res.status(201).json(categoria);
      } catch (error) {
        if (error.code === "P2002") {
          return res.status(409).json({ erro: "Essa categoria já existe" });
        }

        return next(anexarContextoErro(error, req, { publicMessage: "Erro ao criar categoria" }));
      }
    }
  );

  app.put(
    "/categorias/:id",
    exigirAutenticacao,
    exigirPapel("admin"),
    validateSchema({ params: categoriaIdParamSchema, body: categoriaBodySchema }),
    async (req, res, next) => {
      try {
        const id = Number(req.params.id);
        const nome = String(req.body.nome || "").trim();

        const categoriaAnterior = await prisma.categoria.findUnique({
          where: { id },
        });

        if (!categoriaAnterior) {
          return res.status(404).json({ erro: "Categoria não encontrada" });
        }

        const categoria = await prisma.categoria.update({
          where: { id },
          data: { nome },
        });

        await registrarAuditoria(prisma, req, {
          entidade: "categoria",
          entidadeId: categoria.id,
          acao: "edicao_categoria",
          descricao: `Categoria ${categoria.nome} alterada`,
          metadados: {
            nomeAnterior: categoriaAnterior.nome,
            nomeNovo: categoria.nome,
          },
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
    }
  );

  app.delete(
    "/categorias/:id",
    exigirAutenticacao,
    exigirPapel("admin"),
    validateSchema({ params: categoriaIdParamSchema }),
    async (req, res, next) => {
      try {
        const id = Number(req.params.id);

        const categoria = await prisma.categoria.findUnique({
          where: { id },
        });

        if (!categoria) {
          return res.status(404).json({ erro: "Categoria não encontrada" });
        }

        await prisma.categoria.delete({
          where: { id },
        });

        await registrarAuditoria(prisma, req, {
          entidade: "categoria",
          entidadeId: id,
          acao: "remocao_categoria",
          descricao: `Categoria ${categoria.nome} removida`,
        });

        res.json({ mensagem: "Categoria excluída com sucesso" });
      } catch (error) {
        if (error.code === "P2025") {
          return res.status(404).json({ erro: "Categoria não encontrada" });
        }

        return next(anexarContextoErro(error, req, { publicMessage: "Erro ao excluir categoria" }));
      }
    }
  );

  app.get("/itens", async (req, res, next) => {
    try {
      const itens = await prisma.item.findMany({
        orderBy: [{ nome: "asc" }],
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

      const item = await prisma.item.findUnique({
        where: { id },
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

  app.post(
    "/itens",
    exigirAutenticacao,
    exigirPapel("admin"),
    validateSchema({ body: itemBodySchema }),
    async (req, res, next) => {
      try {
        const nome = String(req.body.nome || "").trim();
        const categoriaId = Number(req.body.categoriaId);

        const item = await prisma.item.create({
          data: {
            nome,
            categoriaId,
          },
          include: { categoria: true },
        });

        await registrarAuditoria(prisma, req, {
          entidade: "item",
          entidadeId: item.id,
          itemId: item.id,
          acao: "criacao_item",
          descricao: `Item ${item.nome} criado`,
        });

        res.status(201).json(item);
      } catch (error) {
        if (error.code === "P2002") {
          return res.status(409).json({ erro: "Esse item já existe" });
        }

        return next(anexarContextoErro(error, req, { publicMessage: "Erro ao criar item" }));
      }
    }
  );

  app.put(
    "/itens/:id",
    exigirAutenticacao,
    exigirPapel("admin"),
    validateSchema({ params: itemIdParamSchema, body: itemBodySchema }),
    async (req, res, next) => {
      try {
        const id = Number(req.params.id);
        const nome = String(req.body.nome || "").trim();
        const categoriaId = Number(req.body.categoriaId);

        const itemAnterior = await prisma.item.findUnique({
          where: { id },
          include: { categoria: true },
        });

        if (!itemAnterior) {
          return res.status(404).json({ erro: "Item não encontrado" });
        }

        const item = await prisma.item.update({
          where: { id },
          data: {
            nome,
            categoriaId,
          },
          include: { categoria: true },
        });

        await registrarAuditoria(prisma, req, {
          entidade: "item",
          entidadeId: item.id,
          itemId: item.id,
          acao: "edicao_item",
          descricao: `Item ${item.nome} alterado`,
          metadados: {
            nomeAnterior: itemAnterior.nome,
            nomeNovo: item.nome,
            categoriaAnterior: itemAnterior.categoria?.nome || null,
            categoriaNova: item.categoria?.nome || null,
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
    }
  );

  app.delete(
    "/itens/:id",
    exigirAutenticacao,
    exigirPapel("admin"),
    validateSchema({ params: itemIdParamSchema }),
    async (req, res, next) => {
      try {
        const id = Number(req.params.id);

        const item = await prisma.item.findUnique({
          where: { id },
          include: { categoria: true },
        });

        if (!item) {
          return res.status(404).json({ erro: "Item não encontrado" });
        }

        await prisma.item.delete({
          where: { id },
        });

        await registrarAuditoria(prisma, req, {
          entidade: "item",
          entidadeId: id,
          itemId: id,
          acao: "remocao_item",
          descricao: `Item ${item.nome} removido`,
          metadados: {
            categoria: item.categoria?.nome || null,
          },
        });

        res.json({ mensagem: "Item excluído com sucesso" });
      } catch (error) {
        if (error.code === "P2025") {
          return res.status(404).json({ erro: "Item não encontrado" });
        }

        return next(anexarContextoErro(error, req, { publicMessage: "Erro ao excluir item" }));
      }
    }
  );
};
