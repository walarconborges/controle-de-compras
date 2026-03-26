/**
 * Este arquivo registra rotas de compras e movimentações de estoque.
 * Ele existe para concentrar entrada de compras, histórico e reflexos no estoque do grupo.
 */
const validateSchema = require("../middlewares/validateSchema");
const { centsToDecimalString } = require("../utils/money");
const { compraBodySchema } = require("../validators/compraSchemas");
const { anexarContextoErro } = require("../utils/errorUtils");

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

      const compras = await prisma.compra.findMany({
        where: {
          grupoId,
        },
        orderBy: {
          criadoEm: "desc",
        },
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
      });

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
        valorUnitarioCentavos: item.valorUnitarioCentavos,
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
              valorUnitario: centsToDecimalString(item.valorUnitarioCentavos),
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
                quantidade: grupoItemExistente.quantidade.plus(item.quantidade),
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

      const movimentacoes = await prisma.movimentacaoEstoque.findMany({
        where: {
          grupoId,
        },
        orderBy: {
          criadoEm: "desc",
        },
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
      });

      const movimentacoesNormalizadas = movimentacoes.map((movimentacao) => ({
        ...movimentacao,
        quantidade: decimalParaNumero(movimentacao.quantidade),
      }));

      res.json(movimentacoesNormalizadas);
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao buscar movimentações de estoque" }));
    }
  });

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