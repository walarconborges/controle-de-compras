/**
 * Este arquivo registra rotas de usuários.
 * Ele existe para concentrar o CRUD administrativo de usuários do grupo atual.
 */
module.exports = function registerUsuarioRoutes(app, deps) {
  const { prisma, exigirAutenticacao, exigirPapel, obterGrupoIdSessao, normalizarUsuarioResposta, normalizarEmail, bcrypt } = deps;

app.get("/usuarios", exigirAutenticacao, exigirPapel("admin"), async (req, res) => {
  try {
    const grupoId = obterGrupoIdSessao(req);

    const vinculos = await prisma.usuarioGrupo.findMany({
      where: {
        grupoId,
      },
      orderBy: {
        id: "asc",
      },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            sobrenome: true,
            email: true,
            ativo: true,
            criadoEm: true,
            atualizadoEm: true,
          },
        },
      },
    });

    const usuarios = vinculos.map((vinculo) => vinculo.usuario);

    res.json(usuarios);
  } catch (error) {
    console.error("Erro ao buscar usuários:", error);
    res.status(500).json({ erro: "Erro ao buscar usuários" });
  }
});

app.get("/usuarios/:id", exigirAutenticacao, exigirPapel("admin"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const grupoId = obterGrupoIdSessao(req);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ erro: "ID inválido" });
    }

    const vinculo = await prisma.usuarioGrupo.findFirst({
      where: {
        grupoId,
        usuarioId: id,
      },
      include: {
        usuario: {
          select: {
            id: true,
            nome: true,
            sobrenome: true,
            email: true,
            ativo: true,
            criadoEm: true,
            atualizadoEm: true,
          },
        },
      },
    });

    if (!vinculo || !vinculo.usuario) {
      return res.status(404).json({ erro: "Usuário não encontrado no seu grupo" });
    }

    res.json(normalizarUsuarioResposta(vinculo.usuario));
  } catch (error) {
    console.error("Erro ao buscar usuário:", error);
    res.status(500).json({ erro: "Erro ao buscar usuário" });
  }
});

app.post("/usuarios", exigirAutenticacao, exigirPapel("admin"), async (req, res) => {
  try {
    const nome = normalizarTextoSimples(req.body?.nome);
    const sobrenome = normalizarTextoSimples(req.body?.sobrenome);
    const email = normalizarEmail(req.body?.email);
    const senha = normalizarTextoSimples(req.body?.senha);
    const ativo = req.body?.ativo;

    if (!nome) {
      return res.status(400).json({ erro: "O nome é obrigatório" });
    }

    if (!sobrenome) {
      return res.status(400).json({ erro: "O sobrenome é obrigatório" });
    }

    if (!email) {
      return res.status(400).json({ erro: "O email é obrigatório" });
    }

    if (!senha) {
      return res.status(400).json({ erro: "A senha é obrigatória" });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const usuario = await prisma.usuario.create({
      data: {
        nome,
        sobrenome,
        email,
        senhaHash,
        ativo: typeof ativo === "boolean" ? ativo : true,
      },
      select: {
        id: true,
        nome: true,
        sobrenome: true,
        email: true,
        ativo: true,
        criadoEm: true,
        atualizadoEm: true,
      },
    });

    res.status(201).json(normalizarUsuarioResposta(usuario));
  } catch (error) {
    console.error("Erro ao criar usuário:", error);

    if (error.code === "P2002") {
      return res.status(409).json({ erro: "Nome ou email já cadastrado" });
    }

    res.status(500).json({ erro: "Erro ao criar usuário" });
  }
});

app.put("/usuarios/:id", exigirAutenticacao, exigirPapel("admin"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const grupoId = obterGrupoIdSessao(req);
    const nome = normalizarTextoSimples(req.body?.nome);
    const sobrenome = normalizarTextoSimples(req.body?.sobrenome);
    const email = normalizarEmail(req.body?.email);
    const senha = normalizarTextoSimples(req.body?.senha);
    const ativo = req.body?.ativo;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ erro: "ID inválido" });
    }

    if (!nome) {
      return res.status(400).json({ erro: "O nome é obrigatório" });
    }

    if (!sobrenome) {
      return res.status(400).json({ erro: "O sobrenome é obrigatório" });
    }

    if (!email) {
      return res.status(400).json({ erro: "O email é obrigatório" });
    }

    const vinculo = await prisma.usuarioGrupo.findFirst({
      where: {
        grupoId,
        usuarioId: id,
      },
    });

    if (!vinculo) {
      return res.status(404).json({ erro: "Usuário não encontrado no seu grupo" });
    }

    const dadosAtualizacao = {
      nome,
      sobrenome,
      email,
      ativo: typeof ativo === "boolean" ? ativo : true,
    };

    if (senha) {
      dadosAtualizacao.senhaHash = await bcrypt.hash(senha, 10);
    }

    const usuario = await prisma.usuario.update({
      where: { id },
      data: dadosAtualizacao,
      select: {
        id: true,
        nome: true,
        sobrenome: true,
        email: true,
        ativo: true,
        criadoEm: true,
        atualizadoEm: true,
      },
    });

    res.json(normalizarUsuarioResposta(usuario));
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);

    if (error.code === "P2025") {
      return res.status(404).json({ erro: "Usuário não encontrado" });
    }

    if (error.code === "P2002") {
      return res.status(409).json({ erro: "Nome ou email já cadastrado" });
    }

    res.status(500).json({ erro: "Erro ao atualizar usuário" });
  }
});

app.delete("/usuarios/:id", exigirAutenticacao, exigirPapel("admin"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const grupoId = obterGrupoIdSessao(req);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ erro: "ID inválido" });
    }

    const vinculo = await prisma.usuarioGrupo.findFirst({
      where: {
        grupoId,
        usuarioId: id,
      },
    });

    if (!vinculo) {
      return res.status(404).json({ erro: "Usuário não encontrado no seu grupo" });
    }

    await prisma.usuario.delete({
      where: { id },
    });

    res.json({ mensagem: "Usuário excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir usuário:", error);

    if (error.code === "P2025") {
      return res.status(404).json({ erro: "Usuário não encontrado" });
    }

    res.status(500).json({ erro: "Erro ao excluir usuário" });
  }
});

};
