/**
 * Este arquivo registra rotas de itens do grupo.
 * Ele existe para concentrar a base real de estoque e lista por grupo.
 */
const { Prisma } = require("@prisma/client");
const validateSchema = require("../middlewares/validateSchema");
const { anexarContextoErro } = require("../utils/errorUtils");
const {
  construirFiltroData,
  construirPaginacao,
  construirMetaPaginacao,
  anexarHeadersPaginacao,
  construirIntervaloDatasQuery,
  obterTextoBuscaQuery,
  obterOrdenacaoQuery,
} = require("../utils/queryFilters");
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
    normalizarUnidade,
  } = deps;

  app.get("/grupo-itens", exigirAutenticacao, async (req, res, next) => {
    try {
      const grupoId = obterGrupoIdSessao(req);
      const { page, limit, skip, take } = construirPaginacao(req.query);
      const busca = obterTextoBuscaQuery(req.query);
      const { de, ate } = construirIntervaloDatasQuery(req.query);
      const { campo, direcao } = obterOrdenacaoQuery(req.query, "categoria", "asc");
      const where = construirWhereGrupoItens({ grupoId, busca, de, ate, comprar: req.query.comprar });
      const orderBy = construirOrderByGrupoItens(campo, direcao);

      const [total, grupoItens] = await prisma.$transaction([
        prisma.grupoItem.count({ where }),
        prisma.grupoItem.findMany({
          where,
          orderBy,
          skip,
          take,
          include: {
            item: {
              include: {
                categoria: true,
              },
            },
            grupo: true,
          },
        }),
      ]);

      anexarHeadersPaginacao(res, construirMetaPaginacao(total, page, limit));
      res.json(grupoItens);
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao buscar itens do grupo" }));
    }
  });

  app.get("/grupo-itens/comprar", exigirAutenticacao, async (req, res, next) => {
    try {
      const grupoId = obterGrupoIdSessao(req);

      const grupoItens = await prisma.grupoItem.findMany({
        where: {
          grupoId,
          comprar: true,
        },
        orderBy: [
          {
            item: {
              categoria: {
                nome: "asc",
              },
            },
          },
          {
            item: {
              nome: "asc",
            },
          },
        ],
        include: {
          item: {
            include: {
              categoria: true,
            },
          },
          grupo: true,
        },
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
        where: {
          id,
          grupoId,
        },
        include: {
          item: {
            include: {
              categoria: true,
            },
          },
          grupo: true,
        },
      });

      if (!grupoItem) {
        return res.status(404).json({ erro: "Item do grupo não encontrado" });
      }

      res.json(grupoItem);
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao buscar item do grupo" }));
    }
  });

  app.post("/grupo-itens", exigirAutenticacao, validateSchema({ body: grupoItemCreateBodySchema }), async (req, res, next) => {
    try {
      const grupoId = obterGrupoIdSessao(req);

      if (!Number.isInteger(grupoId) || grupoId <= 0) {
        return res.status(400).json({ erro: "grupoId da sessão inválido" });
      }

      const itemIdNumero = req.body.itemId ?? null;
      const nome = normalizarTextoSimples(req.body.nome);
      const unidade = normalizarUnidade(req.body.unidade);
      const categoria = normalizarTextoSimples(req.body.categoria);
      const quantidadeNumero = req.body.quantidade;
      const comprarBooleano = req.body.comprar;

      const grupoItem = await prisma.$transaction(async (tx) => {
        const itemGlobal = await encontrarOuCriarItemTx(tx, {
          itemId: itemIdNumero,
          nome,
          unidade,
          categoriaNome: categoria,
        });

        const grupoItemExistente = await tx.grupoItem.findUnique({
          where: {
            grupoId_itemId: {
              grupoId,
              itemId: itemGlobal.id,
            },
          },
          include: {
            item: {
              include: {
                categoria: true,
              },
            },
            grupo: true,
          },
        });

        if (grupoItemExistente) {
          throw new Prisma.PrismaClientKnownRequestError(
            "Esse item já está vinculado ao grupo",
            { code: "P2002", clientVersion: Prisma.prismaVersion.client }
          );
        }

        return tx.grupoItem.create({
          data: {
            grupoId,
            itemId: itemGlobal.id,
            quantidade: quantidadeNumero,
            comprar: comprarBooleano ?? quantidadeNumero <= 0,
          },
          include: {
            item: {
              include: {
                categoria: true,
              },
            },
            grupo: true,
          },
        });
      });

      res.status(201).json(grupoItem);
    } catch (error) {
      if (error.code === "P2002") {
        return res.status(409).json({ erro: "Esse item já está vinculado ao grupo" });
      }

      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao criar item do grupo" }));
    }
  });

  app.put(
    "/grupo-itens/:id",
    exigirAutenticacao,
    validateSchema({ params: grupoItemIdParamSchema, body: grupoItemUpdateBodySchema }),
    async (req, res, next) => {
      try {
        const { id } = req.params;
        const grupoId = obterGrupoIdSessao(req);

        const grupoItemExistente = await prisma.grupoItem.findFirst({
          where: {
            id,
            grupoId,
          },
        });

        if (!grupoItemExistente) {
          return res.status(404).json({ erro: "Item do grupo não encontrado" });
        }

        const dadosAtualizacao = {};

        if (req.body.quantidade !== undefined) {
          dadosAtualizacao.quantidade = req.body.quantidade;
        }

        if (req.body.comprar !== undefined) {
          dadosAtualizacao.comprar = req.body.comprar;
        }

        const grupoItem = await prisma.grupoItem.update({
          where: { id },
          data: dadosAtualizacao,
          include: {
            item: {
              include: {
                categoria: true,
              },
            },
            grupo: true,
          },
        });

        res.json(grupoItem);
      } catch (error) {
        return next(anexarContextoErro(error, req, { publicMessage: "Erro ao atualizar item do grupo" }));
      }
    }
  );

  app.patch(
    "/grupo-itens/:id/comprar",
    exigirAutenticacao,
    validateSchema({ params: grupoItemIdParamSchema, body: grupoItemPatchComprarBodySchema }),
    async (req, res, next) => {
      try {
        const { id } = req.params;
        const grupoId = obterGrupoIdSessao(req);

        const grupoItemExistente = await prisma.grupoItem.findFirst({
          where: {
            id,
            grupoId,
          },
        });

        if (!grupoItemExistente) {
          return res.status(404).json({ erro: "Item do grupo não encontrado" });
        }

        const grupoItem = await prisma.grupoItem.update({
          where: { id },
          data: {
            comprar: req.body.comprar,
          },
          include: {
            item: {
              include: {
                categoria: true,
              },
            },
            grupo: true,
          },
        });

        res.json(grupoItem);
      } catch (error) {
        return next(anexarContextoErro(error, req, { publicMessage: "Erro ao atualizar flag comprar" }));
      }
    }
  );

  app.patch(
    "/grupo-itens/:id/quantidade",
    exigirAutenticacao,
    validateSchema({ params: grupoItemIdParamSchema, body: grupoItemPatchQuantidadeBodySchema }),
    async (req, res, next) => {
      try {
        const { id } = req.params;
        const grupoId = obterGrupoIdSessao(req);

        const grupoItemExistente = await prisma.grupoItem.findFirst({
          where: {
            id,
            grupoId,
          },
        });

        if (!grupoItemExistente) {
          return res.status(404).json({ erro: "Item do grupo não encontrado" });
        }

        const grupoItem = await prisma.grupoItem.update({
          where: { id },
          data: {
            quantidade: req.body.quantidade,
          },
          include: {
            item: {
              include: {
                categoria: true,
              },
            },
            grupo: true,
          },
        });

        res.json(grupoItem);
      } catch (error) {
        return next(anexarContextoErro(error, req, { publicMessage: "Erro ao atualizar quantidade do item do grupo" }));
      }
    }
  );

  app.delete(
    "/grupo-itens/:id",
    exigirAutenticacao,
    validateSchema({ params: grupoItemIdParamSchema }),
    async (req, res, next) => {
      try {
        const { id } = req.params;
        const grupoId = obterGrupoIdSessao(req);

        const grupoItemExistente = await prisma.grupoItem.findFirst({
          where: {
            id,
            grupoId,
          },
        });

        if (!grupoItemExistente) {
          return res.status(404).json({ erro: "Item do grupo não encontrado" });
        }

        await prisma.grupoItem.delete({
          where: { id },
        });

        res.json({ mensagem: "Item removido do grupo com sucesso" });
      } catch (error) {
        return next(anexarContextoErro(error, req, { publicMessage: "Erro ao excluir item do grupo" }));
      }
    }
  );

  function construirWhereGrupoItens({ grupoId, busca, de, ate, comprar }) {
    const where = {
      grupoId,
      ...construirFiltroData({ de, ate, campo: "atualizadoEm" }),
    };

    if (comprar !== undefined) {
      const texto = String(comprar).trim().toLowerCase();
      if (texto === "true") {
        where.comprar = true;
      } else if (texto === "false") {
        where.comprar = false;
      }
    }

    if (busca) {
      where.OR = [
        {
          item: {
            nome: {
              contains: busca,
              mode: "insensitive",
            },
          },
        },
        {
          item: {
            unidadePadrao: {
              contains: busca,
              mode: "insensitive",
            },
          },
        },
        {
          item: {
            categoria: {
              nome: {
                contains: busca,
                mode: "insensitive",
              },
            },
          },
        },
      ];
    }

    return where;
  }

  function construirOrderByGrupoItens(campo, direcao) {
    switch (campo) {
      case "id":
        return { id: direcao };
      case "item":
      case "nome":
        return [{ item: { nome: direcao } }, { atualizadoEm: "desc" }];
      case "categoria":
        return [
          { item: { categoria: { nome: direcao } } },
          { item: { nome: "asc" } },
        ];
      case "quantidade":
        return [{ quantidade: direcao }, { item: { nome: "asc" } }];
      case "comprar":
        return [{ comprar: direcao }, { item: { nome: "asc" } }];
      case "criadoEm":
        return [{ criadoEm: direcao }, { item: { nome: "asc" } }];
      case "atualizadoEm":
      case "data":
      default:
        return [{ atualizadoEm: direcao }, { item: { nome: "asc" } }];
    }
  }

  async function encontrarOuCriarCategoriaTx(tx, nomeCategoria) {
    const nome = normalizarTextoSimples(nomeCategoria);

    let categoria = await tx.categoria.findFirst({
      where: {
        nome: {
          equals: nome,
          mode: "insensitive",
        },
      },
    });

    if (categoria) {
      return categoria;
    }

    try {
      categoria = await tx.categoria.create({
        data: {
          nome,
        },
      });

      return categoria;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        categoria = await tx.categoria.findFirst({
          where: {
            nome: {
              equals: nome,
              mode: "insensitive",
            },
          },
        });

        if (categoria) {
          return categoria;
        }
      }

      throw error;
    }
  }

  async function encontrarOuCriarItemTx(tx, { itemId, nome, unidade, categoriaNome }) {
    const nomeNormalizado = normalizarTextoSimples(nome);
    const unidadeNormalizada = normalizarUnidade(unidade);
    const categoriaNormalizada = normalizarTextoSimples(categoriaNome);

    if (itemId) {
      const itemPorId = await tx.item.findUnique({
        where: { id: itemId },
        include: { categoria: true },
      });

      if (itemPorId) {
        return itemPorId;
      }
    }

    const categoria = await encontrarOuCriarCategoriaTx(tx, categoriaNormalizada);

    let item = await tx.item.findFirst({
      where: {
        nome: {
          equals: nomeNormalizado,
          mode: "insensitive",
        },
        categoriaId: categoria.id,
      },
      include: { categoria: true },
    });

    if (item) {
      return item;
    }

    try {
      item = await tx.item.create({
        data: {
          nome: nomeNormalizado,
          unidadePadrao: unidadeNormalizada,
          categoriaId: categoria.id,
        },
        include: { categoria: true },
      });

      return item;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        item = await tx.item.findFirst({
          where: {
            nome: {
              equals: nomeNormalizado,
              mode: "insensitive",
            },
            categoriaId: categoria.id,
          },
          include: { categoria: true },
        });

        if (item) {
          return item;
        }
      }

      throw error;
    }
  }
};
