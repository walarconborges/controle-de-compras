/**
 * Este arquivo registra rotas de compras e movimentações de estoque.
 * Ele existe para concentrar entrada de compras, histórico e reflexos no estoque do grupo.
 */
module.exports = function registerCompraRoutes(app, deps) {
  const { prisma, exigirAutenticacao, obterGrupoIdSessao, normalizarDecimal, normalizarTextoSimples, normalizarUnidade, decimalParaNumero, normalizarCompraResposta } = deps;

app.get("/compras", exigirAutenticacao, async (req, res) => {
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
    console.error("Erro ao buscar compras:", error);
    res.status(500).json({ erro: "Erro ao buscar compras" });
  }
});

app.post("/compras", exigirAutenticacao, async (req, res) => {
  try {
    const grupoId = obterGrupoIdSessao(req);
    const usuarioId = req.session.usuario?.id;
    const itensRecebidos = Array.isArray(req.body?.itens) ? req.body.itens : [];

    if (!Number.isInteger(grupoId) || grupoId <= 0) {
      return res.status(400).json({ erro: "grupoId da sessão inválido" });
    }

    if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
      return res.status(400).json({ erro: "usuarioId da sessão inválido" });
    }

    if (itensRecebidos.length === 0) {
      return res.status(400).json({ erro: "A compra deve ter ao menos um item" });
    }

    const itensNormalizados = itensRecebidos.map((item, indice) => ({
      indice,
      itemId:
        Number.isInteger(Number(item?.itemId)) && Number(item?.itemId) > 0
          ? Number(item.itemId)
          : null,
      nome: normalizarTextoSimples(item?.nome),
      unidade: normalizarUnidade(item?.unidade),
      categoria: normalizarTextoSimples(item?.categoria),
      quantidade: normalizarDecimal(item?.quantidade),
      valorUnitario: normalizarDecimal(item?.valorUnitario),
    }));

    for (const item of itensNormalizados) {
      if (!item.nome) {
        return res.status(400).json({ erro: `nome inválido no item da posição ${item.indice + 1}` });
      }

      if (!item.unidade) {
        return res.status(400).json({ erro: `unidade inválida no item da posição ${item.indice + 1}` });
      }

      if (!item.categoria) {
        return res.status(400).json({ erro: `categoria inválida no item da posição ${item.indice + 1}` });
      }

      if (item.quantidade === null || item.quantidade <= 0) {
        return res.status(400).json({ erro: `quantidade inválida no item da posição ${item.indice + 1}` });
      }

      if (item.valorUnitario === null || item.valorUnitario < 0) {
        return res.status(400).json({ erro: `valorUnitario inválido no item da posição ${item.indice + 1}` });
      }
    }

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
    console.error("Erro ao finalizar compra:", error);
    res.status(500).json({ erro: "Erro ao finalizar compra" });
  }
});

/*
  MOVIMENTAÇÕES DE ESTOQUE
*/

app.get("/movimentacoes-estoque", exigirAutenticacao, async (req, res) => {
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
    console.error("Erro ao buscar movimentações de estoque:", error);
    res.status(500).json({ erro: "Erro ao buscar movimentações de estoque" });
  }
});
};
