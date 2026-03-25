/**
 * Este arquivo registra rotas dos vínculos entre usuários e grupos.
 * Ele existe para separar aprovações, recusas e consultas de vínculo da lógica de usuário puro.
 */
module.exports = function registerUsuarioGrupoRoutes(app, deps) {
  const { prisma, exigirAutenticacao, exigirPapel, obterGrupoIdSessao, idsSaoIguais, atualizarSessaoUsuario } = deps;

app.get("/usuarios-grupos", exigirAutenticacao, exigirPapel("admin"), async (req, res) => {
  try {
    const grupoId = obterGrupoIdSessao(req);

    const vinculos = await prisma.usuarioGrupo.findMany({
      where: {
        grupoId,
      },
      orderBy: { id: "asc" },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            sobrenome: true,
            email: true,
            ativo: true,
          },
        },
        grupo: true,
      },
    });

    res.json(vinculos);
  } catch (error) {
    console.error("Erro ao buscar vínculos:", error);
    res.status(500).json({ erro: "Erro ao buscar vínculos" });
  }
});

app.get("/usuarios-grupos/:id", exigirAutenticacao, exigirPapel("admin"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const grupoId = obterGrupoIdSessao(req);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ erro: "ID inválido" });
    }

    const vinculo = await prisma.usuarioGrupo.findFirst({
      where: {
        id,
        grupoId,
      },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            sobrenome: true,
            email: true,
            ativo: true,
          },
        },
        grupo: true,
      },
    });

    if (!vinculo) {
      return res.status(404).json({ erro: "Vínculo não encontrado no seu grupo" });
    }

    res.json(vinculo);
  } catch (error) {
    console.error("Erro ao buscar vínculo:", error);
    res.status(500).json({ erro: "Erro ao buscar vínculo" });
  }
});

app.post("/usuarios-grupos", exigirAutenticacao, exigirPapel("admin"), async (req, res) => {
  try {
    const { usuarioId, grupoId, papel } = req.body;
    const grupoIdSessao = obterGrupoIdSessao(req);
    const usuarioIdNumero = Number(usuarioId);
    const grupoIdNumero = Number(grupoId);

    if (!Number.isInteger(usuarioIdNumero) || usuarioIdNumero <= 0) {
      return res.status(400).json({ erro: "usuarioId inválido" });
    }

    if (!Number.isInteger(grupoIdNumero) || grupoIdNumero <= 0) {
      return res.status(400).json({ erro: "grupoId inválido" });
    }

    if (!idsSaoIguais(grupoIdNumero, grupoIdSessao)) {
      return res.status(403).json({ erro: "Não é permitido criar vínculo em outro grupo" });
    }

    if (!papel || !papel.trim()) {
      return res.status(400).json({ erro: "O papel é obrigatório" });
    }

    const vinculo = await prisma.usuarioGrupo.create({
      data: {
        usuarioId: usuarioIdNumero,
        grupoId: grupoIdNumero,
        papel: papel.trim(),
        status: "aceito",
        aprovadoEm: new Date(),
      },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            sobrenome: true,
            email: true,
            ativo: true,
          },
        },
        grupo: true,
      },
    });

    res.status(201).json(vinculo);
  } catch (error) {
    console.error("Erro ao criar vínculo:", error);

    if (error.code === "P2002") {
      return res.status(409).json({ erro: "Esse vínculo já existe" });
    }

    res.status(500).json({ erro: "Erro ao criar vínculo" });
  }
});

app.put("/usuarios-grupos/:id", exigirAutenticacao, exigirPapel("admin"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { usuarioId, grupoId, papel } = req.body;
    const grupoIdSessao = obterGrupoIdSessao(req);
    const usuarioIdNumero = Number(usuarioId);
    const grupoIdNumero = Number(grupoId);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ erro: "ID inválido" });
    }

    if (!Number.isInteger(usuarioIdNumero) || usuarioIdNumero <= 0) {
      return res.status(400).json({ erro: "usuarioId inválido" });
    }

    if (!Number.isInteger(grupoIdNumero) || grupoIdNumero <= 0) {
      return res.status(400).json({ erro: "grupoId inválido" });
    }

    if (!idsSaoIguais(grupoIdNumero, grupoIdSessao)) {
      return res.status(403).json({ erro: "Não é permitido mover vínculo para outro grupo" });
    }

    if (!papel || !papel.trim()) {
      return res.status(400).json({ erro: "O papel é obrigatório" });
    }

    const vinculoExistente = await prisma.usuarioGrupo.findFirst({
      where: {
        id,
        grupoId: grupoIdSessao,
      },
    });

    if (!vinculoExistente) {
      return res.status(404).json({ erro: "Vínculo não encontrado no seu grupo" });
    }

    const vinculo = await prisma.usuarioGrupo.update({
      where: { id },
      data: {
        usuarioId: usuarioIdNumero,
        grupoId: grupoIdNumero,
        papel: papel.trim(),
      },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            sobrenome: true,
            email: true,
            ativo: true,
          },
        },
        grupo: true,
      },
    });

    res.json(vinculo);
  } catch (error) {
    console.error("Erro ao atualizar vínculo:", error);

    if (error.code === "P2025") {
      return res.status(404).json({ erro: "Vínculo não encontrado" });
    }

    if (error.code === "P2002") {
      return res.status(409).json({ erro: "Esse vínculo já existe" });
    }

    res.status(500).json({ erro: "Erro ao atualizar vínculo" });
  }
});

app.delete("/usuarios-grupos/:id", exigirAutenticacao, exigirPapel("admin"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const grupoId = obterGrupoIdSessao(req);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ erro: "ID inválido" });
    }

    const vinculo = await prisma.usuarioGrupo.findFirst({
      where: {
        id,
        grupoId,
      },
    });

    if (!vinculo) {
      return res.status(404).json({ erro: "Vínculo não encontrado no seu grupo" });
    }

    await prisma.usuarioGrupo.delete({
      where: { id },
    });

    res.json({ mensagem: "Vínculo excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir vínculo:", error);

    if (error.code === "P2025") {
      return res.status(404).json({ erro: "Vínculo não encontrado" });
    }

    res.status(500).json({ erro: "Erro ao excluir vínculo" });
  }
});

};
