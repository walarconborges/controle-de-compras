/**
 * Este arquivo registra rotas de sugestões de grupo, cadastro, login, sessão e perfil.
 * Ele existe para concentrar fluxos de entrada do usuário e atualização da sessão autenticada.
 */
const validateSchema = require("../middlewares/validateSchema");
const {
  sugestoesGrupoQuerySchema,
  cadastroBodySchema,
  loginBodySchema,
  solicitacaoIdParamSchema,
} = require("../validators/authSchemas");

module.exports = function registerAuthRoutes(app, deps) {
  const {
    prisma,
    normalizarNomeGrupo,
    normalizarTextoSimples,
    normalizarEmail,
    gerarCodigoGrupo,
    montarNomeCompleto,
    normalizarUsuarioResposta,
    bcrypt,
    atualizarSessaoUsuario,
    exigirAutenticacao,
    exigirPapel,
    obterGrupoIdSessao,
  } = deps;

  app.get("/grupos/sugestoes", validateSchema({ query: sugestoesGrupoQuerySchema }), async (req, res) => {
    try {
      const termo = normalizarNomeGrupo(req.query.termo);

      if (!termo) {
        return res.json([]);
      }

      const grupos = await prisma.grupo.findMany({
        where: {
          nome: {
            contains: termo,
            mode: "insensitive",
          },
        },
        orderBy: {
          nome: "asc",
        },
        take: 8,
        select: {
          id: true,
          nome: true,
          codigo: true,
        },
      });

      res.json(grupos);
    } catch (error) {
      console.error("Erro ao buscar sugestões de grupos:", error);
      res.status(500).json({ erro: "Erro ao buscar sugestões de grupos" });
    }
  });

  app.post("/cadastro", validateSchema({ body: cadastroBodySchema }), async (req, res) => {
    try {
      const nome = normalizarTextoSimples(req.body.nome);
      const sobrenome = normalizarTextoSimples(req.body.sobrenome);
      const email = normalizarEmail(req.body.email);
      const senha = normalizarTextoSimples(req.body.senha);
      const grupoNome = normalizarNomeGrupo(req.body.grupoNome);

      const senhaHash = await bcrypt.hash(senha, 10);

      const resultado = await prisma.$transaction(async (tx) => {
        const usuario = await tx.usuario.create({
          data: {
            nome,
            sobrenome,
            email,
            senhaHash,
            ativo: true,
          },
          select: {
            id: true,
            nome: true,
            sobrenome: true,
            email: true,
            ativo: true,
          },
        });

        const grupoExistente = await tx.grupo.findUnique({
          where: { nome: grupoNome },
        });

        if (!grupoExistente) {
          const grupoCriado = await tx.grupo.create({
            data: {
              nome: grupoNome,
              codigo: "TEMP",
            },
          });

          const grupoAtualizado = await tx.grupo.update({
            where: { id: grupoCriado.id },
            data: {
              codigo: gerarCodigoGrupo(grupoCriado.nome, grupoCriado.id),
            },
          });

          const vinculo = await tx.usuarioGrupo.create({
            data: {
              usuarioId: usuario.id,
              grupoId: grupoAtualizado.id,
              papel: "admin",
              status: "aceito",
              aprovadoEm: new Date(),
            },
          });

          return {
            usuario,
            grupo: grupoAtualizado,
            vinculo,
            mensagem: "Cadastro realizado com sucesso",
          };
        }

        const vinculo = await tx.usuarioGrupo.create({
          data: {
            usuarioId: usuario.id,
            grupoId: grupoExistente.id,
            papel: "membro",
            status: "pendente",
          },
        });

        return {
          usuario,
          grupo: grupoExistente,
          vinculo,
          mensagem: "Cadastro realizado. Aguarde aprovação do administrador do grupo",
        };
      });

      const sessaoUsuario = await atualizarSessaoUsuario(req, resultado.usuario.id);

      res.status(201).json({
        mensagem: resultado.mensagem,
        usuario: sessaoUsuario,
      });
    } catch (error) {
      console.error("Erro ao realizar cadastro:", error);

      if (error.code === "P2002") {
        return res.status(409).json({ erro: "Já existe um usuário com esse nome ou email" });
      }

      res.status(500).json({ erro: "Erro ao realizar cadastro" });
    }
  });

  app.post("/login", validateSchema({ body: loginBodySchema }), async (req, res) => {
    try {
      const email = normalizarEmail(req.body.email);
      const senha = normalizarTextoSimples(req.body.senha);

      const usuario = await prisma.usuario.findUnique({
        where: { email },
        select: {
          id: true,
          nome: true,
          sobrenome: true,
          email: true,
          senhaHash: true,
          ativo: true,
        },
      });

      if (!usuario) {
        return res.status(401).json({ erro: "Credenciais inválidas" });
      }

      if (!usuario.ativo) {
        return res.status(403).json({ erro: "Usuário inativo" });
      }

      const senhaCorreta = await bcrypt.compare(senha, usuario.senhaHash);

      if (!senhaCorreta) {
        return res.status(401).json({ erro: "Credenciais inválidas" });
      }

      const sessaoUsuario = await atualizarSessaoUsuario(req, usuario.id);

      if (!sessaoUsuario) {
        return res.status(403).json({ erro: "Usuário sem vínculo com grupo" });
      }

      res.json({
        mensagem: "Login realizado com sucesso",
        usuario: sessaoUsuario,
      });
    } catch (error) {
      console.error("Erro ao fazer login:", error);
      res.status(500).json({ erro: "Erro ao fazer login" });
    }
  });

  app.get("/sessao", exigirAutenticacao, async (req, res) => {
    try {
      const sessaoAtualizada = await atualizarSessaoUsuario(req, req.session.usuario.id);
      res.json({ usuario: sessaoAtualizada });
    } catch (error) {
      console.error("Erro ao carregar sessão:", error);
      res.status(500).json({ erro: "Erro ao carregar sessão" });
    }
  });

  app.get("/meu-status-grupo", exigirAutenticacao, async (req, res) => {
    try {
      const sessaoAtualizada = await atualizarSessaoUsuario(req, req.session.usuario.id);
      res.json({
        status: sessaoAtualizada?.statusGrupo || null,
        papel: sessaoAtualizada?.papel || null,
        grupoId: sessaoAtualizada?.grupoId || null,
        grupoNome: sessaoAtualizada?.grupoNome || null,
        grupoCodigo: sessaoAtualizada?.grupoCodigo || null,
      });
    } catch (error) {
      console.error("Erro ao carregar status do grupo:", error);
      res.status(500).json({ erro: "Erro ao carregar status do grupo" });
    }
  });

  app.get("/meu-perfil", exigirAutenticacao, async (req, res) => {
    try {
      const sessaoAtualizada = await atualizarSessaoUsuario(req, req.session.usuario.id);
      const vinculo = await prisma.usuarioGrupo.findFirst({
        where: {
          usuarioId: sessaoAtualizada.id,
          grupoId: sessaoAtualizada.grupoId,
        },
        include: {
          grupo: true,
        },
      });

      res.json({
        id: sessaoAtualizada.id,
        nome: sessaoAtualizada.nome,
        sobrenome: sessaoAtualizada.sobrenome || "",
        nomeCompleto:
          sessaoAtualizada.nomeCompleto || montarNomeCompleto(sessaoAtualizada.nome, sessaoAtualizada.sobrenome),
        email: sessaoAtualizada.email,
        papel: sessaoAtualizada.papel,
        statusGrupo: sessaoAtualizada.statusGrupo,
        grupoId: sessaoAtualizada.grupoId,
        grupoNome: sessaoAtualizada.grupoNome,
        grupoCodigo: sessaoAtualizada.grupoCodigo,
        solicitadoEm: vinculo?.solicitadoEm || null,
        aprovadoEm: vinculo?.aprovadoEm || null,
      });
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
      res.status(500).json({ erro: "Erro ao carregar perfil" });
    }
  });

  app.get("/meu-grupo/membros", exigirAutenticacao, async (req, res) => {
    try {
      const grupoId = obterGrupoIdSessao(req);

      const vinculos = await prisma.usuarioGrupo.findMany({
        where: { grupoId },
        orderBy: [{ status: "asc" }, { papel: "asc" }, { id: "asc" }],
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
        },
      });

      res.json(vinculos.map((vinculo) => ({ ...vinculo, usuario: normalizarUsuarioResposta(vinculo.usuario) })));
    } catch (error) {
      console.error("Erro ao carregar membros do grupo:", error);
      res.status(500).json({ erro: "Erro ao carregar membros do grupo" });
    }
  });

  app.get("/meu-grupo/solicitacoes", exigirAutenticacao, exigirPapel("admin"), async (req, res) => {
    try {
      const grupoId = obterGrupoIdSessao(req);

      const solicitacoes = await prisma.usuarioGrupo.findMany({
        where: {
          grupoId,
          status: "pendente",
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
        },
      });

      res.json(
        solicitacoes.map((solicitacao) => ({
          ...solicitacao,
          usuario: normalizarUsuarioResposta(solicitacao.usuario),
        }))
      );
    } catch (error) {
      console.error("Erro ao carregar solicitações do grupo:", error);
      res.status(500).json({ erro: "Erro ao carregar solicitações do grupo" });
    }
  });

  app.patch(
    "/meu-grupo/solicitacoes/:id/aceitar",
    exigirAutenticacao,
    exigirPapel("admin"),
    validateSchema({ params: solicitacaoIdParamSchema }),
    async (req, res) => {
      try {
        const { id } = req.params;
        const grupoId = obterGrupoIdSessao(req);

        const vinculo = await prisma.usuarioGrupo.findFirst({
          where: {
            id,
            grupoId,
          },
        });

        if (!vinculo) {
          return res.status(404).json({ erro: "Solicitação não encontrada" });
        }

        const atualizado = await prisma.usuarioGrupo.update({
          where: { id },
          data: {
            status: "aceito",
            aprovadoEm: new Date(),
          },
          include: {
            usuario: {
              select: { id: true, nome: true, email: true, ativo: true },
            },
          },
        });

        res.json({ ...atualizado, usuario: normalizarUsuarioResposta(atualizado.usuario) });
      } catch (error) {
        console.error("Erro ao aceitar solicitação:", error);
        res.status(500).json({ erro: "Erro ao aceitar solicitação" });
      }
    }
  );

  app.patch(
    "/meu-grupo/solicitacoes/:id/recusar",
    exigirAutenticacao,
    exigirPapel("admin"),
    validateSchema({ params: solicitacaoIdParamSchema }),
    async (req, res) => {
      try {
        const { id } = req.params;
        const grupoId = obterGrupoIdSessao(req);

        const vinculo = await prisma.usuarioGrupo.findFirst({
          where: {
            id,
            grupoId,
          },
        });

        if (!vinculo) {
          return res.status(404).json({ erro: "Solicitação não encontrada" });
        }

        const atualizado = await prisma.usuarioGrupo.update({
          where: { id },
          data: {
            status: "recusado",
          },
          include: {
            usuario: {
              select: { id: true, nome: true, email: true, ativo: true },
            },
          },
        });

        res.json({ ...atualizado, usuario: normalizarUsuarioResposta(atualizado.usuario) });
      } catch (error) {
        console.error("Erro ao recusar solicitação:", error);
        res.status(500).json({ erro: "Erro ao recusar solicitação" });
      }
    }
  );

  app.post("/logout", (req, res) => {
    req.session.destroy((error) => {
      if (error) {
        console.error("Erro ao fazer logout:", error);
        return res.status(500).json({ erro: "Erro ao fazer logout" });
      }

      res.clearCookie("connect.sid");
      res.json({ mensagem: "Logout realizado com sucesso" });
    });
  });
};
