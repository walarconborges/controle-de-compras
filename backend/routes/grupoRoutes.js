/**
 * Este arquivo registra rotas de grupos.
 * Ele existe para concentrar criação, leitura, atualização e exclusão dos grupos do sistema.
 */
module.exports = function registerGrupoRoutes(app, deps) {
  const { prisma, exigirAutenticacao, exigirPapel, obterGrupoIdSessao, idsSaoIguais, normalizarNomeGrupo, nomeGrupoEhValido, gerarCodigoGrupo } = deps;

app.get("/grupos", exigirAutenticacao, async (req, res) => {
  try {
    const grupoId = obterGrupoIdSessao(req);

    const grupos = await prisma.grupo.findMany({
      where: { id: grupoId },
      orderBy: { id: "asc" },
    });

    res.json(grupos);
  } catch (error) {
    console.error("Erro ao buscar grupos:", error);
    res.status(500).json({ erro: "Erro ao buscar grupos" });
  }
});

app.get("/grupos/:id", exigirAutenticacao, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const grupoIdSessao = obterGrupoIdSessao(req);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ erro: "ID inválido" });
    }

    if (!idsSaoIguais(id, grupoIdSessao)) {
      return res.status(403).json({ erro: "Acesso negado a outro grupo" });
    }

    const grupo = await prisma.grupo.findUnique({
      where: { id },
    });

    if (!grupo) {
      return res.status(404).json({ erro: "Grupo não encontrado" });
    }

    res.json(grupo);
  } catch (error) {
    console.error("Erro ao buscar grupo:", error);
    res.status(500).json({ erro: "Erro ao buscar grupo" });
  }
});

app.post("/grupos", exigirAutenticacao, exigirPapel("admin"), async (req, res) => {
  try {
    const nome = normalizarNomeGrupo(req.body?.nome);

    if (!nome) {
      return res.status(400).json({ erro: "O nome do grupo é obrigatório" });
    }

    if (!nomeGrupoEhValido(nome)) {
      return res.status(400).json({ erro: "O nome do grupo deve conter apenas 1 palavra" });
    }

    const grupoCriado = await prisma.grupo.create({
      data: { nome, codigo: "TEMP" },
    });

    const grupo = await prisma.grupo.update({
      where: { id: grupoCriado.id },
      data: { codigo: gerarCodigoGrupo(grupoCriado.nome, grupoCriado.id) },
    });

    res.status(201).json(grupo);
  } catch (error) {
    console.error("Erro ao criar grupo:", error);

    if (error.code === "P2002") {
      return res.status(409).json({ erro: "Esse grupo já existe" });
    }

    res.status(500).json({ erro: "Erro ao criar grupo" });
  }
});

app.put("/grupos/:id", exigirAutenticacao, exigirPapel("admin"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const grupoIdSessao = obterGrupoIdSessao(req);
    const { nome } = req.body;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ erro: "ID inválido" });
    }

    if (!idsSaoIguais(id, grupoIdSessao)) {
      return res.status(403).json({ erro: "Acesso negado a outro grupo" });
    }

    if (!nome || !nome.trim()) {
      return res.status(400).json({ erro: "O nome do grupo é obrigatório" });
    }

    const grupo = await prisma.grupo.update({
      where: { id },
      data: { nome: nome.trim() },
    });

    res.json(grupo);
  } catch (error) {
    console.error("Erro ao atualizar grupo:", error);

    if (error.code === "P2025") {
      return res.status(404).json({ erro: "Grupo não encontrado" });
    }

    if (error.code === "P2002") {
      return res.status(409).json({ erro: "Esse grupo já existe" });
    }

    res.status(500).json({ erro: "Erro ao atualizar grupo" });
  }
});

app.delete("/grupos/:id", exigirAutenticacao, exigirPapel("admin"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const grupoIdSessao = obterGrupoIdSessao(req);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ erro: "ID inválido" });
    }

    if (!idsSaoIguais(id, grupoIdSessao)) {
      return res.status(403).json({ erro: "Acesso negado a outro grupo" });
    }

    await prisma.grupo.delete({
      where: { id },
    });

    res.json({ mensagem: "Grupo excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir grupo:", error);

    if (error.code === "P2025") {
      return res.status(404).json({ erro: "Grupo não encontrado" });
    }

    res.status(500).json({ erro: "Erro ao excluir grupo" });
  }
});
};
