/**
 * Este arquivo registra rotas de compras e movimentações de estoque.
 * Ele existe para concentrar entrada de compras, histórico e reflexos no estoque do grupo.
 */
const { Prisma } = require("@prisma/client");
const validateSchema = require("../middlewares/validateSchema");
const { compraBodySchema } = require("../validators/compraSchemas");
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

module.exports = function registerCompraRoutes(app, deps) {
  const {
    prisma,
    exigirAutenticacao,
    obterGrupoIdSessao,
    normalizarTextoSimples,
    normalizarUnidade,
    decimalParaNumero,
    normalizarCompraResposta,
  } = deps;

  app.get("/compras", exigirAutenticacao, async (req, res, next) => {
    try {
      const grupoId = obterGrupoIdSessao(req);
      const { page, limit, skip, take } = construirPaginacao(req.query);
      const busca = obterTextoBuscaQuery(req.query);
      const { de, ate } = construirIntervaloDatasQuery(req.query);
      const { campo, direcao } = obterOrdenacaoQuery(req.query, "criadoEm", "desc");
      const where = construirWhereCompras({ grupoId, busca, de, ate });
      const orderBy = construirOrderByCompras(campo, direcao);

      const [total, compras] = await prisma.$transaction([
        prisma.compra.count({ where }),
        prisma.compra.findMany({
          where,
          orderBy,
          skip,
          take,
          include: {
            usuario: {
              select: {
                id: true,
                nome: true,
                sobrenome: true,
                email: true,
              },
            },
            compraItens: {
              include: {
                item: {
                  include: {
                    categoria: true,
                  },
                },
              },
            },
          },
        }),
      ]);

      anexarHeadersPaginacao(res, construirMetaPaginacao(total, page, limit));
      res.json(compras.map(normalizarCompraResposta));
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao buscar compras" }));
    }
  });

  app.post("/compras", exigirAutenticacao, validateSchema({ body: compraBodySchema }), async (req, res, next) => {
    try {
      const grupoId = obterGrupoIdSessao(req);
      const usuarioId = req.session.usuario?.id;

      if (!Number.isInteger(grupoId) || grupoId <= 0) {
        return res.status(400).json({ erro: "grupoId da sessão inválido" });
      }

      if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
        return res.status(400).json({ erro: "usuarioId da sessão inválido" });
      }

      const itensNormalizados = req.body.itens.map((item) => ({
        itemId: item.itemId ?? null,
        nome: normalizarTextoSimples(item.nome),
        unidade: normalizarUnidade(item.unidade),
        categoria: normalizarTextoSimples(item.categoria),
        quantidade: item.quantidade,
        valorUnitario: item.valorUnitario,
      }));

      const resultado = await prisma.$transaction(async (tx) => {
        const compra = await tx.compra.create({
          data: {
            grupoId,
            usuarioId,
          },
        });

        for (const item of itensNormalizados) {
          const itemGlobal = await encontrarOuCriarItemTx(tx, {
            itemId: item.itemId,
            nome: item.nome,
            unidade: item.unidade,
            categoriaNome: item.categoria,
          });

          await tx.compraItem.create({
            data: {
              compraId: compra.id,
              itemId: itemGlobal.id,
              nomeItem: itemGlobal.nome,
              quantidade: item.quantidade,
              unidade: item.unidade,
              valorUnitario: item.valorUnitario,
            },
          });

          const grupoItemExistente = await tx.grupoItem.findUnique({
            where: {
              grupoId_itemId: {
                grupoId,
                itemId: itemGlobal.id,
              },
            },
          });

          if (grupoItemExistente) {
            await tx.grupoItem.update({
              where: {
                id: grupoItemExistente.id,
              },
              data: {
                quantidade: Number(grupoItemExistente.quantidade) + Number(item.quantidade),
                comprar: false,
              },
            });
          } else {
            await tx.grupoItem.create({
              data: {
                grupoId,
                itemId: itemGlobal.id,
                quantidade: item.quantidade,
                comprar: false,
              },
            });
          }

          await tx.movimentacaoEstoque.create({
            data: {
              grupoId,
              itemId: itemGlobal.id,
              usuarioId,
              tipo: "entrada_compra",
              quantidade: item.quantidade,
              motivo: `Compra #${compra.id}`,
            },
          });
        }

        const compraCompleta = await tx.compra.findUnique({
          where: {
            id: compra.id,
          },
          include: {
            usuario: {
              select: {
                id: true,
                nome: true,
                email: true,
              },
            },
            compraItens: {
              include: {
                item: {
                  include: {
                    categoria: true,
                  },
                },
              },
            },
          },
        });

        return normalizarCompraResposta(compraCompleta);
      });

      res.status(201).json(resultado);
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao finalizar compra" }));
    }
  });

  app.get("/movimentacoes-estoque", exigirAutenticacao, async (req, res, next) => {
    try {
      const grupoId = obterGrupoIdSessao(req);
      const { page, limit, skip, take } = construirPaginacao(req.query);
      const busca = obterTextoBuscaQuery(req.query);
      const { de, ate } = construirIntervaloDatasQuery(req.query);
      const { campo, direcao } = obterOrdenacaoQuery(req.query, "criadoEm", "desc");
      const where = construirWhereMovimentacoes({ grupoId, busca, de, ate, tipo: req.query.tipo });
      const orderBy = construirOrderByMovimentacoes(campo, direcao);

      const [total, movimentacoes] = await prisma.$transaction([
        prisma.movimentacaoEstoque.count({ where }),
        prisma.movimentacaoEstoque.findMany({
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
            usuario: {
              select: {
                id: true,
                nome: true,
                sobrenome: true,
                email: true,
              },
            },
            grupo: true,
          },
        }),
      ]);

      anexarHeadersPaginacao(res, construirMetaPaginacao(total, page, limit));

      const movimentacoesNormalizadas = movimentacoes.map((movimentacao) => ({
        ...movimentacao,
        quantidade: decimalParaNumero(movimentacao.quantidade),
      }));

      res.json(movimentacoesNormalizadas);
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao buscar movimentações de estoque" }));
    }
  });

  function construirWhereCompras({ grupoId, busca, de, ate }) {
    const where = {
      grupoId,
      ...construirFiltroData({ de, ate, campo: "criadoEm" }),
    };

    if (busca) {
      where.OR = [
        {
          usuario: {
            nome: {
              contains: busca,
              mode: "insensitive",
            },
          },
        },
        {
          usuario: {
            sobrenome: {
              contains: busca,
              mode: "insensitive",
            },
          },
        },
        {
          usuario: {
            email: {
              contains: busca,
              mode: "insensitive",
            },
          },
        },
        {
          compraItens: {
            some: {
              nomeItem: {
                contains: busca,
                mode: "insensitive",
              },
            },
          },
        },
        {
          compraItens: {
            some: {
              unidade: {
                contains: busca,
                mode: "insensitive",
              },
            },
          },
        },
        {
          compraItens: {
            some: {
              item: {
                categoria: {
                  nome: {
                    contains: busca,
                    mode: "insensitive",
                  },
                },
              },
            },
          },
        },
      ];
    }

    return where;
  }

  function construirWhereMovimentacoes({ grupoId, busca, de, ate, tipo }) {
    const where = {
      grupoId,
      ...construirFiltroData({ de, ate, campo: "criadoEm" }),
    };

    if (tipo) {
      where.tipo = {
        equals: String(tipo).trim(),
        mode: "insensitive",
      };
    }

    if (busca) {
      where.OR = [
        {
          tipo: {
            contains: busca,
            mode: "insensitive",
          },
        },
        {
          motivo: {
            contains: busca,
            mode: "insensitive",
          },
        },
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
            categoria: {
              nome: {
                contains: busca,
                mode: "insensitive",
              },
            },
          },
        },
        {
          usuario: {
            nome: {
              contains: busca,
              mode: "insensitive",
            },
          },
        },
        {
          usuario: {
            sobrenome: {
              contains: busca,
              mode: "insensitive",
            },
          },
        },
        {
          usuario: {
            email: {
              contains: busca,
              mode: "insensitive",
            },
          },
        },
      ];
    }

    return where;
  }

  function construirOrderByCompras(campo, direcao) {
    switch (campo) {
      case "id":
        return { id: direcao };
      case "usuario":
      case "nomeUsuario":
        return [{ usuario: { nome: direcao } }, { criadoEm: "desc" }];
      case "email":
        return [{ usuario: { email: direcao } }, { criadoEm: "desc" }];
      case "criadoEm":
      case "data":
      default:
        return { criadoEm: direcao };
    }
  }

  function construirOrderByMovimentacoes(campo, direcao) {
    switch (campo) {
      case "id":
        return { id: direcao };
      case "tipo":
        return [{ tipo: direcao }, { criadoEm: "desc" }];
      case "motivo":
        return [{ motivo: direcao }, { criadoEm: "desc" }];
      case "item":
      case "nomeItem":
        return [{ item: { nome: direcao } }, { criadoEm: "desc" }];
      case "categoria":
        return [{ item: { categoria: { nome: direcao } } }, { criadoEm: "desc" }];
      case "usuario":
      case "nomeUsuario":
        return [{ usuario: { nome: direcao } }, { criadoEm: "desc" }];
      case "quantidade":
        return [{ quantidade: direcao }, { criadoEm: "desc" }];
      case "criadoEm":
      case "data":
      default:
        return { criadoEm: direcao };
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
        data: { nome },
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
