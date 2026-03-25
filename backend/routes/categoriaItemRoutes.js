/**
 * Este arquivo registra rotas de categorias e itens globais do sistema.
 * Ele existe para concentrar operações CRUD dessas entidades sem misturar com autenticação e compras.
 */
module.exports = function registerCategoriaItemRoutes(app, deps) {
  const { prisma, exigirAutenticacao, exigirPapel, normalizarTextoSimples, normalizarUnidade } = deps;

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

app.get("/categorias/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ erro: "ID inválido" });
    }

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

app.post("/categorias", exigirAutenticacao, exigirPapel("admin"), async (req, res) => {
  try {
    const { nome } = req.body;

    if (!nome || !nome.trim()) {
      return res.status(400).json({ erro: "O nome da categoria é obrigatório" });
    }

    const categoria = await prisma.categoria.create({
      data: { nome: nome.trim() },
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

app.put("/categorias/:id", exigirAutenticacao, exigirPapel("admin"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { nome } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ erro: "ID inválido" });
    }

    if (!nome || !nome.trim()) {
      return res.status(400).json({ erro: "O nome da categoria é obrigatório" });
    }

    const categoria = await prisma.categoria.update({
      where: { id },
      data: { nome: nome.trim() },
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
});

app.delete("/categorias/:id", exigirAutenticacao, exigirPapel("admin"), async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ erro: "ID inválido" });
    }

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
});

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

app.get("/itens/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ erro: "ID inválido" });
    }

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

app.post("/itens", exigirAutenticacao, exigirPapel("admin"), async (req, res) => {
  try {
    const { nome, categoriaId, unidadePadrao } = req.body;
    const categoriaIdNumero = Number(categoriaId);

    if (!nome || !nome.trim()) {
      return res.status(400).json({ erro: "O nome do item é obrigatório" });
    }

    if (!Number.isInteger(categoriaIdNumero) || categoriaIdNumero <= 0) {
      return res.status(400).json({ erro: "categoriaId inválido" });
    }

    if (!unidadePadrao || !unidadePadrao.trim()) {
      return res.status(400).json({ erro: "A unidade padrão é obrigatória" });
    }

    const item = await prisma.item.create({
      data: {
        nome: nome.trim(),
        categoriaId: categoriaIdNumero,
        unidadePadrao: normalizarUnidade(unidadePadrao),
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

app.put("/itens/:id", exigirAutenticacao, exigirPapel("admin"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { nome, categoriaId, unidadePadrao } = req.body;
    const categoriaIdNumero = Number(categoriaId);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ erro: "ID inválido" });
    }

    if (!nome || !nome.trim()) {
      return res.status(400).json({ erro: "O nome do item é obrigatório" });
    }

    if (!Number.isInteger(categoriaIdNumero) || categoriaIdNumero <= 0) {
      return res.status(400).json({ erro: "categoriaId inválido" });
    }

    if (!unidadePadrao || !unidadePadrao.trim()) {
      return res.status(400).json({ erro: "A unidade padrão é obrigatória" });
    }

    const item = await prisma.item.update({
      where: { id },
      data: {
        nome: nome.trim(),
        categoriaId: categoriaIdNumero,
        unidadePadrao: normalizarUnidade(unidadePadrao),
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
});

app.delete("/itens/:id", exigirAutenticacao, exigirPapel("admin"), async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ erro: "ID inválido" });
    }

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
