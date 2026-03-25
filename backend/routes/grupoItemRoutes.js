/**
 * Este arquivo registra rotas de itens do grupo.
 * Ele existe para concentrar a base real de estoque e lista por grupo.
 */
module.exports = function registerGrupoItemRoutes(app, deps) {
  const { prisma, exigirAutenticacao, obterGrupoIdSessao, converterBoolean, normalizarDecimal, normalizarTextoSimples, normalizarUnidade } = deps;

app.get("/grupo-itens", exigirAutenticacao, async (req, res) => {
  try {
    const grupoId = obterGrupoIdSessao(req);

    const grupoItens = await prisma.grupoItem.findMany({
      where: {
        grupoId,
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
    console.error("Erro ao buscar itens do grupo:", error);
    res.status(500).json({ erro: "Erro ao buscar itens do grupo" });
  }
});

app.get("/grupo-itens/comprar", exigirAutenticacao, async (req, res) => {
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
    console.error("Erro ao buscar itens marcados para comprar:", error);
    res.status(500).json({ erro: "Erro ao buscar itens marcados para comprar" });
  }
});

app.get("/grupo-itens/:id", exigirAutenticacao, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const grupoId = obterGrupoIdSessao(req);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ erro: "ID inválido" });
    }

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
    console.error("Erro ao buscar item do grupo:", error);
    res.status(500).json({ erro: "Erro ao buscar item do grupo" });
  }
});

app.post("/grupo-itens", exigirAutenticacao, async (req, res) => {
  try {
    const grupoId = obterGrupoIdSessao(req);
    const itemIdNumero = Number.isInteger(Number(req.body?.itemId)) && Number(req.body?.itemId) > 0
      ? Number(req.body.itemId)
      : null;
    const nome = normalizarTextoSimples(req.body?.nome);
    const unidade = normalizarUnidade(req.body?.unidade);
    const categoria = normalizarTextoSimples(req.body?.categoria);
    const quantidadeNumero = normalizarDecimal(req.body?.quantidade);
    const comprarBooleano = converterBoolean(req.body?.comprar);

    if (!Number.isInteger(grupoId) || grupoId <= 0) {
      return res.status(400).json({ erro: "grupoId da sessão inválido" });
    }

    if (quantidadeNumero === null || quantidadeNumero < 0) {
      return res.status(400).json({ erro: "quantidade inválida" });
    }

    if (itemIdNumero === null) {
      if (!nome) {
        return res.status(400).json({ erro: "nome inválido" });
      }

      if (!unidade) {
        return res.status(400).json({ erro: "unidade inválida" });
      }

      if (!categoria) {
        return res.status(400).json({ erro: "categoria inválida" });
      }
    }

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
    console.error("Erro ao criar item do grupo:", error);

    if (error.code === "P2002") {
      return res.status(409).json({ erro: "Esse item já está vinculado ao grupo" });
    }

    res.status(500).json({ erro: "Erro ao criar item do grupo" });
  }
});

app.put("/grupo-itens/:id", exigirAutenticacao, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const grupoId = obterGrupoIdSessao(req);
    const { quantidade, comprar } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ erro: "ID inválido" });
    }

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

    if (quantidade !== undefined) {
      const quantidadeNumero = normalizarDecimal(quantidade);

      if (quantidadeNumero === null || quantidadeNumero < 0) {
        return res.status(400).json({ erro: "quantidade inválida" });
      }

      dadosAtualizacao.quantidade = quantidadeNumero;
    }

    if (comprar !== undefined) {
      const comprarBooleano = converterBoolean(comprar);

      if (comprarBooleano === null) {
        return res.status(400).json({ erro: "comprar inválido" });
      }

      dadosAtualizacao.comprar = comprarBooleano;
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
    console.error("Erro ao atualizar item do grupo:", error);
    res.status(500).json({ erro: "Erro ao atualizar item do grupo" });
  }
});

app.patch("/grupo-itens/:id/comprar", exigirAutenticacao, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const grupoId = obterGrupoIdSessao(req);
    const comprarBooleano = converterBoolean(req.body.comprar);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ erro: "ID inválido" });
    }

    if (comprarBooleano === null) {
      return res.status(400).json({ erro: "comprar inválido" });
    }

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
        comprar: comprarBooleano,
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
    console.error("Erro ao atualizar flag comprar:", error);
    res.status(500).json({ erro: "Erro ao atualizar flag comprar" });
  }
});

app.patch("/grupo-itens/:id/quantidade", exigirAutenticacao, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const grupoId = obterGrupoIdSessao(req);
    const quantidadeNumero = normalizarDecimal(req.body.quantidade);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ erro: "ID inválido" });
    }

    if (quantidadeNumero === null || quantidadeNumero < 0) {
      return res.status(400).json({ erro: "quantidade inválida" });
    }

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
        quantidade: quantidadeNumero,
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
    console.error("Erro ao atualizar quantidade do item do grupo:", error);
    res.status(500).json({ erro: "Erro ao atualizar quantidade do item do grupo" });
  }
});

app.delete("/grupo-itens/:id", exigirAutenticacao, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const grupoId = obterGrupoIdSessao(req);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ erro: "ID inválido" });
    }

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
    console.error("Erro ao excluir item do grupo:", error);
    res.status(500).json({ erro: "Erro ao excluir item do grupo" });
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
