/**
 * Este arquivo registra rotas de itens do grupo.
 * Ele existe para concentrar a base real de estoque e lista por grupo.
 */
const { Prisma } = require("@prisma/client");
const validateSchema = require("../middlewares/validateSchema");
const { anexarContextoErro } = require("../utils/errorUtils");
const { registrarAuditoria } = require("../utils/audit");
const {
  grupoItemIdParamSchema,
  grupoItemCreateBodySchema,
  grupoItemUpdateBodySchema,
  grupoItemPatchComprarBodySchema,
  grupoItemPatchQuantidadeBodySchema,
} = require("../validators/grupoItemSchemas");

module.exports = function registerGrupoItemRoutes(app, deps) {
  const {
    prisma,
    exigirAutenticacao,
    obterGrupoIdSessao,
    normalizarTextoSimples,
  } = deps;

  app.get("/grupo-itens", exigirAutenticacao, async (req, res, next) => {
    try {
      const grupoId = obterGrupoIdSessao(req);
      const grupoItens = await prisma.grupoItem.findMany({
        where: { grupoId },
        orderBy: [{ item: { categoria: { nome: "asc" } } }, { item: { nome: "asc" } }],
        include: { item: { include: { categoria: true } }, grupo: true },
      });
      res.json(grupoItens);
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao buscar itens do grupo" }));
    }
  });

  app.get("/grupo-itens/comprar", exigirAutenticacao, async (req, res, next) => {
    try {
      const grupoId = obterGrupoIdSessao(req);
      const grupoItens = await prisma.grupoItem.findMany({
        where: { grupoId, comprar: true },
        orderBy: [{ item: { categoria: { nome: "asc" } } }, { item: { nome: "asc" } }],
        include: { item: { include: { categoria: true } }, grupo: true },
      });
      res.json(grupoItens);
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao buscar itens marcados para comprar" }));
    }
  });

  app.get("/grupo-itens/:id", exigirAutenticacao, validateSchema({ params: grupoItemIdParamSchema }), async (req, res, next) => {
    try {
      const { id } = req.params;
      const grupoId = obterGrupoIdSessao(req);
      const grupoItem = await prisma.grupoItem.findFirst({
        where: { id, grupoId },
        include: { item: { include: { categoria: true } }, grupo: true },
      });
      if (!grupoItem) return res.status(404).json({ erro: "Item do grupo não encontrado" });
      res.json(grupoItem);
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao buscar item do grupo" }));
    }
  });

  app.post("/grupo-itens", exigirAutenticacao, validateSchema({ body: grupoItemCreateBodySchema }), async (req, res, next) => {
    try {
      const grupoId = obterGrupoIdSessao(req);
      if (!Number.isInteger(grupoId) || grupoId <= 0) return res.status(400).json({ erro: "grupoId da sessão inválido" });

      const itemIdNumero = req.body.itemId ?? null;
      const nome = normalizarTextoSimples(req.body.nome);
      const categoria = normalizarTextoSimples(req.body.categoria);
      const quantidadeNumero = req.body.quantidade;
      const comprarBooleano = req.body.comprar;

      const grupoItem = await prisma.$transaction(async (tx) => {
        const itemGlobal = await encontrarOuCriarItemTx(tx, { itemId: itemIdNumero, nome, categoriaNome: categoria });
        const grupoItemExistente = await tx.grupoItem.findUnique({
          where: { grupoId_itemId: { grupoId, itemId: itemGlobal.id } },
          include: { item: { include: { categoria: true } }, grupo: true },
        });
        if (grupoItemExistente) {
          throw new Prisma.PrismaClientKnownRequestError("Esse item já está vinculado ao grupo", { code: "P2002", clientVersion: Prisma.prismaVersion.client });
        }
        return tx.grupoItem.create({
          data: { grupoId, itemId: itemGlobal.id, quantidade: quantidadeNumero, comprar: comprarBooleano ?? quantidadeNumero <= 0 },
          include: { item: { include: { categoria: true } }, grupo: true },
        });
      });

      await registrarAuditoria(prisma, req, {
        entidade: "grupo_item",
        entidadeId: grupoItem.id,
        acao: "criacao_item_grupo",
        descricao: `Item ${grupoItem.item.nome} vinculado ao grupo`,
        grupoId,
        itemId: grupoItem.itemId,
        metadados: { quantidade: String(grupoItem.quantidade), comprar: grupoItem.comprar },
      });

      res.status(201).json(grupoItem);
    } catch (error) {
      if (error.code === "P2002") return res.status(409).json({ erro: "Esse item já está vinculado ao grupo" });
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao criar item do grupo" }));
    }
  });

  app.put("/grupo-itens/:id", exigirAutenticacao, validateSchema({ params: grupoItemIdParamSchema, body: grupoItemUpdateBodySchema }), async (req, res, next) => {
    try {
      const { id } = req.params;
      const grupoId = obterGrupoIdSessao(req);
      const grupoItemExistente = await prisma.grupoItem.findFirst({ where: { id, grupoId }, include: { item: true } });
      if (!grupoItemExistente) return res.status(404).json({ erro: "Item do grupo não encontrado" });

      const dadosAtualizacao = {};
      if (req.body.quantidade !== undefined) dadosAtualizacao.quantidade = req.body.quantidade;
      if (req.body.comprar !== undefined) dadosAtualizacao.comprar = req.body.comprar;

      const grupoItem = await prisma.grupoItem.update({
        where: { id },
        data: dadosAtualizacao,
        include: { item: { include: { categoria: true } }, grupo: true },
      });

      await registrarAuditoria(prisma, req, {
        entidade: "grupo_item",
        entidadeId: grupoItem.id,
        acao: "edicao_item_grupo",
        descricao: `Item ${grupoItem.item.nome} alterado no grupo`,
        grupoId,
        itemId: grupoItem.itemId,
        metadados: {
          quantidadeAnterior: String(grupoItemExistente.quantidade),
          quantidadeNova: String(grupoItem.quantidade),
          comprarAnterior: grupoItemExistente.comprar,
          comprarNovo: grupoItem.comprar,
        },
      });

      res.json(grupoItem);
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao atualizar item do grupo" }));
    }
  });

  app.patch("/grupo-itens/:id/comprar", exigirAutenticacao, validateSchema({ params: grupoItemIdParamSchema, body: grupoItemPatchComprarBodySchema }), async (req, res, next) => {
    try {
      const { id } = req.params;
      const grupoId = obterGrupoIdSessao(req);
      const grupoItemExistente = await prisma.grupoItem.findFirst({ where: { id, grupoId }, include: { item: true } });
      if (!grupoItemExistente) return res.status(404).json({ erro: "Item do grupo não encontrado" });

      const grupoItem = await prisma.grupoItem.update({
        where: { id },
        data: { comprar: req.body.comprar },
        include: { item: { include: { categoria: true } }, grupo: true },
      });

      await registrarAuditoria(prisma, req, {
        entidade: "grupo_item",
        entidadeId: grupoItem.id,
        acao: "alteracao_flag_comprar",
        descricao: `Flag comprar alterada para ${grupoItem.item.nome}`,
        grupoId,
        itemId: grupoItem.itemId,
        metadados: { comprarAnterior: grupoItemExistente.comprar, comprarNovo: grupoItem.comprar },
      });

      res.json(grupoItem);
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao atualizar flag comprar" }));
    }
  });

  app.patch("/grupo-itens/:id/quantidade", exigirAutenticacao, validateSchema({ params: grupoItemIdParamSchema, body: grupoItemPatchQuantidadeBodySchema }), async (req, res, next) => {
    try {
      const { id } = req.params;
      const grupoId = obterGrupoIdSessao(req);
      const grupoItemExistente = await prisma.grupoItem.findFirst({ where: { id, grupoId }, include: { item: true } });
      if (!grupoItemExistente) return res.status(404).json({ erro: "Item do grupo não encontrado" });

      const quantidadeAnterior = Number(grupoItemExistente.quantidade);
      const quantidadeNova = Number(req.body.quantidade);
      const diferenca = Math.abs(quantidadeNova - quantidadeAnterior);
      const houveReducao = quantidadeNova < quantidadeAnterior;
      const houveAumento = quantidadeNova > quantidadeAnterior;

      const grupoItem = await prisma.$transaction(async (tx) => {
        const atualizado = await tx.grupoItem.update({
          where: { id },
          data: { quantidade: req.body.quantidade },
          include: { item: { include: { categoria: true } }, grupo: true },
        });

        if (diferenca > 0) {
          await tx.movimentacaoEstoque.create({
            data: {
              grupoId,
              itemId: atualizado.itemId,
              usuarioId: req.session.usuario.id,
              tipo: houveReducao ? "consumo_manual" : "entrada_ajuste",
              quantidade: diferenca,
              motivo: houveReducao
                ? `Consumo automático ao reduzir a quantidade de ${atualizado.item.nome}`
                : `Entrada automática ao aumentar a quantidade de ${atualizado.item.nome}`,
            },
          });
        }

        return atualizado;
      });

      await registrarAuditoria(prisma, req, {
        entidade: "grupo_item",
        entidadeId: grupoItem.id,
        acao: "ajuste_manual_quantidade",
        descricao: `Quantidade ajustada manualmente para ${grupoItem.item.nome}`,
        grupoId,
        itemId: grupoItem.itemId,
        metadados: {
          quantidadeAnterior: String(grupoItemExistente.quantidade),
          quantidadeNova: String(grupoItem.quantidade),
          diferenca: String(diferenca),
          tipoMovimentacaoGerada: diferenca > 0 ? (houveReducao ? "consumo_manual" : "entrada_ajuste") : "nenhuma",
          autorEmail: req.session.usuario.email,
          rota: req.originalUrl,
        },
      });

      res.json(grupoItem);
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao atualizar quantidade do item do grupo" }));
    }
  });

  app.delete("/grupo-itens/:id", exigirAutenticacao, validateSchema({ params: grupoItemIdParamSchema }), async (req, res, next) => {
    try {
      const { id } = req.params;
      const grupoId = obterGrupoIdSessao(req);
      const grupoItemExistente = await prisma.grupoItem.findFirst({ where: { id, grupoId }, include: { item: true } });
      if (!grupoItemExistente) return res.status(404).json({ erro: "Item do grupo não encontrado" });

      await prisma.grupoItem.delete({ where: { id } });
      await registrarAuditoria(prisma, req, {
        entidade: "grupo_item",
        entidadeId: grupoItemExistente.id,
        acao: "remocao_item_grupo",
        descricao: `Item ${grupoItemExistente.item.nome} removido do grupo`,
        grupoId,
        itemId: grupoItemExistente.itemId,
      });

      res.json({ mensagem: "Item removido do grupo com sucesso" });
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao excluir item do grupo" }));
    }
  });

  async function encontrarOuCriarCategoriaTx(tx, nomeCategoria) {
    const nome = normalizarTextoSimples(nomeCategoria);
    let categoria = await tx.categoria.findFirst({ where: { nome: { equals: nome, mode: "insensitive" } } });
    if (categoria) return categoria;
    try {
      return await tx.categoria.create({ data: { nome } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        categoria = await tx.categoria.findFirst({ where: { nome: { equals: nome, mode: "insensitive" } } });
        if (categoria) return categoria;
      }
      throw error;
    }
  }

  async function encontrarOuCriarItemTx(tx, { itemId, nome, categoriaNome }) {
    const nomeNormalizado = normalizarTextoSimples(nome);
    const categoriaNormalizada = normalizarTextoSimples(categoriaNome);

    if (itemId) {
      const itemPorId = await tx.item.findUnique({ where: { id: itemId }, include: { categoria: true } });
      if (itemPorId) return itemPorId;
    }

    const categoria = await encontrarOuCriarCategoriaTx(tx, categoriaNormalizada);
    let item = await tx.item.findFirst({
      where: { nome: { equals: nomeNormalizado, mode: "insensitive" }, categoriaId: categoria.id },
      include: { categoria: true },
    });
    if (item) return item;

    try {
      return await tx.item.create({
        data: { nome: nomeNormalizado, categoriaId: categoria.id },
        include: { categoria: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        item = await tx.item.findFirst({
          where: { nome: { equals: nomeNormalizado, mode: "insensitive" }, categoriaId: categoria.id },
          include: { categoria: true },
        });
        if (item) return item;
      }
      throw error;
    }
  }
};
