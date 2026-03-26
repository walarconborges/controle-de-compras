/**
 * Este arquivo registra rotas de categorias e itens globais do sistema.
 * Ele existe para concentrar operações CRUD dessas entidades sem misturar com autenticação e compras.
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
  const { prisma, exigirAutenticacao, exigirPapel, normalizarUnidade } = deps;

  app.get("/categorias", async (req, res, next) => {
    try {
      const categorias = await prisma.categoria.findMany({ orderBy: { id: "asc" } });
      res.json(categorias);
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao buscar categorias" }));
    }
  });

  app.get("/categorias/:id", validateSchema({ params: categoriaIdParamSchema }), async (req, res, next) => {
    try {
      const { id } = req.params;
      const categoria = await prisma.categoria.findUnique({ where: { id } });
      if (!categoria) return res.status(404).json({ erro: "Categoria não encontrada" });
      res.json(categoria);
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao buscar categoria" }));
    }
  });

  app.post("/categorias", exigirAutenticacao, exigirPapel("admin"), validateSchema({ body: categoriaBodySchema }), async (req, res, next) => {
    try {
      const categoria = await prisma.categoria.create({ data: { nome: req.body.nome.trim() } });
      await registrarAuditoria(prisma, req, {
        entidade: "categoria",
        entidadeId: categoria.id,
        acao: "criacao_categoria",
        descricao: `Categoria ${categoria.nome} criada`,
      });
      res.status(201).json(categoria);
    } catch (error) {
      if (error.code === "P2002") return res.status(409).json({ erro: "Essa categoria já existe" });
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao criar categoria" }));
    }
  });

  app.put("/categorias/:id", exigirAutenticacao, exigirPapel("admin"), validateSchema({ params: categoriaIdParamSchema, body: categoriaBodySchema }), async (req, res, next) => {
    try {
      const { id } = req.params;
      const categoriaAnterior = await prisma.categoria.findUnique({ where: { id } });
      const categoria = await prisma.categoria.update({ where: { id }, data: { nome: req.body.nome.trim() } });
      await registrarAuditoria(prisma, req, {
        entidade: "categoria",
        entidadeId: categoria.id,
        acao: "edicao_categoria",
        descricao: `Categoria ${categoria.nome} alterada`,
        metadados: { nomeAnterior: categoriaAnterior?.nome ?? null, nomeNovo: categoria.nome },
      });
      res.json(categoria);
    } catch (error) {
      if (error.code === "P2025") return res.status(404).json({ erro: "Categoria não encontrada" });
      if (error.code === "P2002") return res.status(409).json({ erro: "Essa categoria já existe" });
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao atualizar categoria" }));
    }
  });

  app.delete("/categorias/:id", exigirAutenticacao, exigirPapel("admin"), validateSchema({ params: categoriaIdParamSchema }), async (req, res, next) => {
    try {
      const { id } = req.params;
      const categoria = await prisma.categoria.findUnique({ where: { id } });
      await prisma.categoria.delete({ where: { id } });
      await registrarAuditoria(prisma, req, {
        entidade: "categoria",
        entidadeId: Number(id),
        acao: "remocao_categoria",
        descricao: `Categoria ${categoria?.nome ?? id} removida`,
      });
      res.json({ mensagem: "Categoria excluída com sucesso" });
    } catch (error) {
      if (error.code === "P2025") return res.status(404).json({ erro: "Categoria não encontrada" });
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao excluir categoria" }));
    }
  });

  app.get("/itens", async (req, res, next) => {
    try {
      const itens = await prisma.item.findMany({ orderBy: { id: "asc" }, include: { categoria: true } });
      res.json(itens);
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao buscar itens" }));
    }
  });

  app.get("/itens/:id", validateSchema({ params: itemIdParamSchema }), async (req, res, next) => {
    try {
      const { id } = req.params;
      const item = await prisma.item.findUnique({ where: { id }, include: { categoria: true } });
      if (!item) return res.status(404).json({ erro: "Item não encontrado" });
      res.json(item);
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao buscar item" }));
    }
  });

  app.post("/itens", exigirAutenticacao, exigirPapel("admin"), validateSchema({ body: itemBodySchema }), async (req, res, next) => {
    try {
      const item = await prisma.item.create({
        data: { nome: req.body.nome.trim(), categoriaId: req.body.categoriaId, unidadePadrao: normalizarUnidade(req.body.unidadePadrao) },
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
      if (error.code === "P2002") return res.status(409).json({ erro: "Esse item já existe" });
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao criar item" }));
    }
  });

  app.put("/itens/:id", exigirAutenticacao, exigirPapel("admin"), validateSchema({ params: itemIdParamSchema, body: itemBodySchema }), async (req, res, next) => {
    try {
      const { id } = req.params;
      const itemAnterior = await prisma.item.findUnique({ where: { id: Number(id) }, include: { categoria: true } });
      const item = await prisma.item.update({
        where: { id },
        data: { nome: req.body.nome.trim(), categoriaId: req.body.categoriaId, unidadePadrao: normalizarUnidade(req.body.unidadePadrao) },
      });
      await registrarAuditoria(prisma, req, {
        entidade: "item",
        entidadeId: item.id,
        itemId: item.id,
        acao: "edicao_item",
        descricao: `Item ${item.nome} alterado`,
        metadados: {
          nomeAnterior: itemAnterior?.nome ?? null,
          nomeNovo: item.nome,
          unidadeAnterior: itemAnterior?.unidadePadrao ?? null,
          unidadeNova: item.unidadePadrao,
        },
      });
      res.json(item);
    } catch (error) {
      if (error.code === "P2025") return res.status(404).json({ erro: "Item não encontrado" });
      if (error.code === "P2002") return res.status(409).json({ erro: "Esse item já existe" });
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao atualizar item" }));
    }
  });

  app.delete("/itens/:id", exigirAutenticacao, exigirPapel("admin"), validateSchema({ params: itemIdParamSchema }), async (req, res, next) => {
    try {
      const { id } = req.params;
      const item = await prisma.item.findUnique({ where: { id: Number(id) } });
      await prisma.item.delete({ where: { id } });
      await registrarAuditoria(prisma, req, {
        entidade: "item",
        entidadeId: Number(id),
        itemId: Number(id),
        acao: "remocao_item",
        descricao: `Item ${item?.nome ?? id} removido`,
      });
      res.json({ mensagem: "Item excluído com sucesso" });
    } catch (error) {
      if (error.code === "P2025") return res.status(404).json({ erro: "Item não encontrado" });
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao excluir item" }));
    }
  });
};
