/**
 * Rotas de autenticação, perfil, vínculos pessoais e administração local do grupo.
 */
const validateSchema = require("../middlewares/validateSchema");
const { loginRateLimit, cadastroRateLimit } = require("../middlewares/rateLimitMiddleware");
const { anexarContextoErro } = require("../utils/errorUtils");
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
    exigirGrupoAtivoAceito,
    obterGrupoIdSessao,
  } = deps;

  function usuarioSessao(req) {
    return req.session?.usuario || null;
  }

  function usuarioEhAdminSistema(req) {
    return Boolean(usuarioSessao(req)?.adminSistema);
  }

  function papelGrupoValido(papel) {
    return ["adminGrupo", "membro"].includes(String(papel || ""));
  }

  async function recarregarSessao(req) {
    return atualizarSessaoUsuario(req, req.session.usuario.id);
  }

  async function buscarVinculoAceitoUsuarioNoGrupo(usuarioId, grupoId) {
    return prisma.usuarioGrupo.findFirst({
      where: {
        usuarioId: Number(usuarioId),
        grupoId: Number(grupoId),
        status: "aceito",
        excluidoEm: null,
      },
    });
  }

  app.get("/grupos/sugestoes", validateSchema({ query: sugestoesGrupoQuerySchema }), async (req, res, next) => {
    try {
      const termo = normalizarNomeGrupo(req.query.termo);

      if (!termo) return res.json([]);

      const grupos = await prisma.grupo.findMany({
        where: {
          excluidoEm: null,
          nome: {
            contains: termo,
            mode: "insensitive",
          },
        },
        orderBy: { nome: "asc" },
        take: 8,
        select: { id: true, nome: true, codigo: true },
      });

      res.json(grupos);
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao buscar sugestões de grupos" }));
    }
  });

  app.post("/cadastro", cadastroRateLimit, validateSchema({ body: cadastroBodySchema }), async (req, res, next) => {
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
            papelGlobal: "usuario",
            ativo: true,
          },
          select: {
            id: true,
            nome: true,
            sobrenome: true,
            email: true,
            ativo: true,
            papelGlobal: true,
          },
        });

        const grupoExistente = await tx.grupo.findFirst({
          where: { nome: grupoNome, excluidoEm: null },
        });

        if (!grupoExistente) {
          const grupoCriado = await tx.grupo.create({
            data: { nome: grupoNome, codigo: "TEMP" },
          });

          const grupoAtualizado = await tx.grupo.update({
            where: { id: grupoCriado.id },
            data: { codigo: gerarCodigoGrupo(grupoCriado.nome, grupoCriado.id) },
          });

          await tx.usuarioGrupo.create({
            data: {
              usuarioId: usuario.id,
              grupoId: grupoAtualizado.id,
              papel: "adminGrupo",
              status: "aceito",
              aprovadoEm: new Date(),
            },
          });

          await tx.usuario.update({
            where: { id: usuario.id },
            data: { grupoAtivoId: grupoAtualizado.id },
          });

          return {
            usuarioId: usuario.id,
            mensagem: "Cadastro realizado com sucesso",
          };
        }

        await tx.usuarioGrupo.create({
          data: {
            usuarioId: usuario.id,
            grupoId: grupoExistente.id,
            papel: "membro",
            status: "pendente",
          },
        });

        return {
          usuarioId: usuario.id,
          mensagem: "Cadastro realizado. Aguarde aprovação do administrador do grupo",
        };
      });

      const sessaoUsuario = await atualizarSessaoUsuario(req, resultado.usuarioId);

      res.status(201).json({
        mensagem: resultado.mensagem,
        usuario: sessaoUsuario,
      });
    } catch (error) {
      if (error.code === "P2002") {
        return res.status(409).json({ erro: "Já existe um usuário com esse email" });
      }

      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao realizar cadastro" }));
    }
  });

  app.post("/login", loginRateLimit, validateSchema({ body: loginBodySchema }), async (req, res, next) => {
    try {
      const email = normalizarEmail(req.body.email);
      const senha = normalizarTextoSimples(req.body.senha);

      const usuario = await prisma.usuario.findUnique({
        where: { email },
        select: {
          id: true,
          senhaHash: true,
          ativo: true,
          desativadoEm: true,
          excluidoEm: true,
        },
      });

      if (!usuario) {
        return res.status(401).json({ erro: "Credenciais inválidas" });
      }

      if (!usuario.ativo || usuario.desativadoEm || usuario.excluidoEm) {
        return res.status(403).json({ erro: "Usuário desativado" });
      }

      const senhaCorreta = await bcrypt.compare(senha, usuario.senhaHash);

      if (!senhaCorreta) {
        return res.status(401).json({ erro: "Credenciais inválidas" });
      }

      const sessaoUsuario = await atualizarSessaoUsuario(req, usuario.id);

      if (!sessaoUsuario) {
        return res.status(403).json({ erro: "Não foi possível montar a sessão do usuário" });
      }

      res.json({
        mensagem: "Login realizado com sucesso",
        usuario: sessaoUsuario,
      });
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao fazer login" }));
    }
  });

  app.get("/sessao", exigirAutenticacao, async (req, res, next) => {
    try {
      const sessaoAtualizada = await recarregarSessao(req);
      res.json({ usuario: sessaoAtualizada });
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao carregar sessão" }));
    }
  });

  app.get("/meu-status-grupo", exigirAutenticacao, async (req, res, next) => {
    try {
      const sessaoAtualizada = await recarregarSessao(req);
      res.json({ usuario: sessaoAtualizada });
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao carregar status do grupo" }));
    }
  });

  app.get("/meu-perfil", exigirAutenticacao, async (req, res, next) => {
    try {
      const sessaoAtualizada = await recarregarSessao(req);
      res.json({
        id: sessaoAtualizada.id,
        nome: sessaoAtualizada.nome,
        sobrenome: sessaoAtualizada.sobrenome || "",
        nomeCompleto:
          sessaoAtualizada.nomeCompleto || montarNomeCompleto(sessaoAtualizada.nome, sessaoAtualizada.sobrenome),
        email: sessaoAtualizada.email,
        papelGlobal: sessaoAtualizada.papelGlobal,
        adminSistema: sessaoAtualizada.adminSistema,
        grupoId: sessaoAtualizada.grupoId,
        grupoAtivoId: sessaoAtualizada.grupoAtivoId,
        grupoNome: sessaoAtualizada.grupoNome,
        grupoCodigo: sessaoAtualizada.grupoCodigo,
        papel: sessaoAtualizada.papel,
        statusGrupo: sessaoAtualizada.statusGrupo,
        temGrupoAceito: sessaoAtualizada.temGrupoAceito,
        precisaSelecionarGrupo: sessaoAtualizada.precisaSelecionarGrupo,
        vinculos: sessaoAtualizada.vinculos,
      });
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao carregar perfil" }));
    }
  });

  app.patch("/meu-perfil", exigirAutenticacao, async (req, res, next) => {
    try {
      const usuario = usuarioSessao(req);
      const nome = normalizarTextoSimples(req.body.nome);
      const sobrenome = normalizarTextoSimples(req.body.sobrenome);
      const email = normalizarEmail(req.body.email);
      const senha = normalizarTextoSimples(req.body.senha);

      const data = {};

      if (nome) data.nome = nome;
      if (sobrenome || sobrenome === "") data.sobrenome = sobrenome;
      if (email) data.email = email;
      if (senha) data.senhaHash = await bcrypt.hash(senha, 10);

      const atualizado = await prisma.usuario.update({
        where: { id: usuario.id },
        data,
        select: {
          id: true,
          nome: true,
          sobrenome: true,
          email: true,
          papelGlobal: true,
        },
      });

      const sessaoAtualizada = await recarregarSessao(req);

      res.json({
        mensagem: "Perfil atualizado com sucesso",
        usuario: {
          ...atualizado,
          nomeCompleto: montarNomeCompleto(atualizado.nome, atualizado.sobrenome),
          sessao: sessaoAtualizada,
        },
      });
    } catch (error) {
      if (error.code === "P2002") {
        return res.status(409).json({ erro: "Esse e-mail já está em uso" });
      }

      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao atualizar perfil" }));
    }
  });

  app.post("/meu-perfil/grupo-ativo", exigirAutenticacao, async (req, res, next) => {
    try {
      const usuario = usuarioSessao(req);
      const grupoId = Number(req.body.grupoId);

      const vinculo = await buscarVinculoAceitoUsuarioNoGrupo(usuario.id, grupoId);

      if (!vinculo) {
        return res.status(403).json({ erro: "Você só pode selecionar vínculos aceitos" });
      }

      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { grupoAtivoId: grupoId },
      });

      const sessaoAtualizada = await recarregarSessao(req);
      res.json({ mensagem: "Grupo ativo atualizado com sucesso", usuario: sessaoAtualizada });
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao selecionar grupo ativo" }));
    }
  });

  app.get("/meu-grupo/membros", exigirAutenticacao, exigirGrupoAtivoAceito, async (req, res, next) => {
    try {
      const grupoId = obterGrupoIdSessao(req);

      const vinculos = await prisma.usuarioGrupo.findMany({
        where: {
          grupoId,
          excluidoEm: null,
        },
        orderBy: [{ status: "asc" }, { papel: "asc" }, { id: "asc" }],
        include: {
          usuario: {
            select: {
              id: true,
              nome: true,
              sobrenome: true,
              email: true,
              ativo: true,
              desativadoEm: true,
              excluidoEm: true,
            },
          },
        },
      });

      res.json(vinculos.map((vinculo) => ({ ...vinculo, usuario: normalizarUsuarioResposta(vinculo.usuario) })));
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao carregar membros do grupo" }));
    }
  });

  app.get("/meu-grupo/solicitacoes", exigirAutenticacao, exigirGrupoAtivoAceito, exigirPapel("adminGrupo"), async (req, res, next) => {
    try {
      const grupoId = obterGrupoIdSessao(req);

      const solicitacoes = await prisma.usuarioGrupo.findMany({
        where: {
          grupoId,
          status: { in: ["pendente", "convidado"] },
          excluidoEm: null,
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

      res.json(solicitacoes.map((solicitacao) => ({
        ...solicitacao,
        usuario: normalizarUsuarioResposta(solicitacao.usuario),
      })));
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao carregar solicitações do grupo" }));
    }
  });

  app.patch("/meu-grupo/solicitacoes/:id/aceitar", exigirAutenticacao, exigirGrupoAtivoAceito, exigirPapel("adminGrupo"), validateSchema({ params: solicitacaoIdParamSchema }), async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const grupoId = obterGrupoIdSessao(req);

      const vinculo = await prisma.usuarioGrupo.findFirst({
        where: { id, grupoId, status: { in: ["pendente", "convidado"] }, excluidoEm: null },
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
      });

      res.json({ mensagem: "Vínculo aceito com sucesso", vinculo: atualizado });
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao aceitar solicitação" }));
    }
  });

  app.patch("/meu-grupo/solicitacoes/:id/recusar", exigirAutenticacao, exigirGrupoAtivoAceito, exigirPapel("adminGrupo"), validateSchema({ params: solicitacaoIdParamSchema }), async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const grupoId = obterGrupoIdSessao(req);

      const vinculo = await prisma.usuarioGrupo.findFirst({
        where: { id, grupoId, status: { in: ["pendente", "convidado"] }, excluidoEm: null },
      });

      if (!vinculo) {
        return res.status(404).json({ erro: "Solicitação não encontrada" });
      }

      const atualizado = await prisma.usuarioGrupo.update({
        where: { id },
        data: {
          status: "recusado",
          canceladoEm: new Date(),
        },
      });

      res.json({ mensagem: "Vínculo recusado com sucesso", vinculo: atualizado });
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao recusar solicitação" }));
    }
  });

  app.post("/meu-grupo/convites", exigirAutenticacao, exigirGrupoAtivoAceito, exigirPapel("adminGrupo"), async (req, res, next) => {
    try {
      const grupoId = obterGrupoIdSessao(req);
      const email = normalizarEmail(req.body.email);
      const papel = normalizarTextoSimples(req.body.papel || "membro");

      if (!papelGrupoValido(papel)) {
        return res.status(400).json({ erro: "Papel inválido" });
      }

      const usuario = await prisma.usuario.findUnique({
        where: { email },
        select: { id: true, email: true, desativadoEm: true, excluidoEm: true },
      });

      if (!usuario || usuario.desativadoEm || usuario.excluidoEm) {
        return res.status(404).json({ erro: "Usuário não encontrado para convite" });
      }

      const existente = await prisma.usuarioGrupo.findFirst({
        where: { usuarioId: usuario.id, grupoId, excluidoEm: null },
      });

      if (existente && ["pendente", "convidado", "aceito"].includes(existente.status)) {
        return res.status(409).json({ erro: "Já existe vínculo ativo ou pendente para esse usuário" });
      }

      const vinculo = existente
        ? await prisma.usuarioGrupo.update({
            where: { id: existente.id },
            data: {
              papel,
              status: "convidado",
              solicitadoEm: new Date(),
              aprovadoEm: null,
              removidoEm: null,
              canceladoEm: null,
              excluidoEm: null,
            },
          })
        : await prisma.usuarioGrupo.create({
            data: {
              usuarioId: usuario.id,
              grupoId,
              papel,
              status: "convidado",
            },
          });

      res.status(201).json({ mensagem: "Convite criado com sucesso", vinculo });
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao convidar usuário" }));
    }
  });

  app.post("/meus-convites/:id/aceitar", exigirAutenticacao, validateSchema({ params: solicitacaoIdParamSchema }), async (req, res, next) => {
    try {
      const usuario = usuarioSessao(req);
      const id = Number(req.params.id);

      const vinculo = await prisma.usuarioGrupo.findFirst({
        where: { id, usuarioId: usuario.id, status: "convidado", excluidoEm: null },
      });

      if (!vinculo) {
        return res.status(404).json({ erro: "Convite não encontrado" });
      }

      await prisma.$transaction(async (tx) => {
        await tx.usuarioGrupo.update({
          where: { id },
          data: { status: "aceito", aprovadoEm: new Date() },
        });

        const usuarioAtual = await tx.usuario.findUnique({
          where: { id: usuario.id },
          select: { grupoAtivoId: true },
        });

        if (!usuarioAtual?.grupoAtivoId) {
          await tx.usuario.update({
            where: { id: usuario.id },
            data: { grupoAtivoId: vinculo.grupoId },
          });
        }
      });

      const sessaoAtualizada = await recarregarSessao(req);
      res.json({ mensagem: "Convite aceito com sucesso", usuario: sessaoAtualizada });
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao aceitar convite" }));
    }
  });

  app.post("/meus-convites/:id/recusar", exigirAutenticacao, validateSchema({ params: solicitacaoIdParamSchema }), async (req, res, next) => {
    try {
      const usuario = usuarioSessao(req);
      const id = Number(req.params.id);

      const vinculo = await prisma.usuarioGrupo.findFirst({
        where: { id, usuarioId: usuario.id, status: "convidado", excluidoEm: null },
      });

      if (!vinculo) {
        return res.status(404).json({ erro: "Convite não encontrado" });
      }

      await prisma.usuarioGrupo.update({
        where: { id },
        data: { status: "recusado", canceladoEm: new Date() },
      });

      const sessaoAtualizada = await recarregarSessao(req);
      res.json({ mensagem: "Convite recusado com sucesso", usuario: sessaoAtualizada });
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao recusar convite" }));
    }
  });

  app.post("/meus-vinculos/:id/cancelar-solicitacao", exigirAutenticacao, validateSchema({ params: solicitacaoIdParamSchema }), async (req, res, next) => {
    try {
      const usuario = usuarioSessao(req);
      const id = Number(req.params.id);

      const vinculo = await prisma.usuarioGrupo.findFirst({
        where: { id, usuarioId: usuario.id, status: "pendente", excluidoEm: null },
      });

      if (!vinculo) {
        return res.status(404).json({ erro: "Solicitação pendente não encontrada" });
      }

      await prisma.usuarioGrupo.update({
        where: { id },
        data: { status: "cancelado", canceladoEm: new Date() },
      });

      const sessaoAtualizada = await recarregarSessao(req);
      res.json({ mensagem: "Solicitação cancelada com sucesso", usuario: sessaoAtualizada });
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao cancelar solicitação" }));
    }
  });

  app.post("/meu-grupo/sair", exigirAutenticacao, exigirGrupoAtivoAceito, async (req, res, next) => {
    try {
      const usuario = usuarioSessao(req);
      const grupoId = obterGrupoIdSessao(req);

      const vinculo = await prisma.usuarioGrupo.findFirst({
        where: { usuarioId: usuario.id, grupoId, status: "aceito", excluidoEm: null },
      });

      if (!vinculo) {
        return res.status(404).json({ erro: "Vínculo aceito não encontrado" });
      }

      await prisma.$transaction(async (tx) => {
        await tx.usuarioGrupo.update({
          where: { id: vinculo.id },
          data: { status: "saiu", removidoEm: new Date() },
        });

        const usuarioDb = await tx.usuario.findUnique({
          where: { id: usuario.id },
          select: { grupoAtivoId: true },
        });

        if (Number(usuarioDb?.grupoAtivoId) === Number(grupoId)) {
          await tx.usuario.update({
            where: { id: usuario.id },
            data: { grupoAtivoId: null },
          });
        }
      });

      const sessaoAtualizada = await recarregarSessao(req);
      res.json({ mensagem: "Saída do grupo registrada com sucesso", usuario: sessaoAtualizada });
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao sair do grupo" }));
    }
  });

  app.post("/meu-grupo/membros/:id/remover", exigirAutenticacao, exigirGrupoAtivoAceito, exigirPapel("adminGrupo"), async (req, res, next) => {
    try {
      const grupoId = obterGrupoIdSessao(req);
      const usuarioAtual = usuarioSessao(req);
      const usuarioIdAlvo = Number(req.params.id);

      const vinculo = await prisma.usuarioGrupo.findFirst({
        where: { usuarioId: usuarioIdAlvo, grupoId, status: "aceito", excluidoEm: null },
      });

      if (!vinculo) {
        return res.status(404).json({ erro: "Membro não encontrado no grupo" });
      }

      if (Number(usuarioAtual.id) === usuarioIdAlvo) {
        return res.status(400).json({ erro: "Use a ação de sair do grupo para a própria conta" });
      }

      await prisma.usuarioGrupo.update({
        where: { id: vinculo.id },
        data: { status: "removido", removidoEm: new Date() },
      });

      res.json({ mensagem: "Membro removido do grupo com sucesso" });
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao remover membro" }));
    }
  });

  app.patch("/meu-grupo/membros/:id/papel", exigirAutenticacao, exigirGrupoAtivoAceito, exigirPapel("adminGrupo"), async (req, res, next) => {
    try {
      const grupoId = obterGrupoIdSessao(req);
      const usuarioIdAlvo = Number(req.params.id);
      const papel = normalizarTextoSimples(req.body.papel);

      if (!papelGrupoValido(papel)) {
        return res.status(400).json({ erro: "Papel inválido" });
      }

      const vinculo = await prisma.usuarioGrupo.findFirst({
        where: { usuarioId: usuarioIdAlvo, grupoId, status: "aceito", excluidoEm: null },
      });

      if (!vinculo) {
        return res.status(404).json({ erro: "Membro aceito não encontrado" });
      }

      const atualizado = await prisma.usuarioGrupo.update({
        where: { id: vinculo.id },
        data: { papel },
      });

      res.json({ mensagem: "Papel atualizado com sucesso", vinculo: atualizado });
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao atualizar papel do membro" }));
    }
  });

  app.post("/logout", (req, res, next) => {
    req.session.destroy((error) => {
      if (error) {
        return next(anexarContextoErro(error, req, { publicMessage: "Erro ao fazer logout" }));
      }

      res.clearCookie("connect.sid");
      res.json({ mensagem: "Logout realizado com sucesso" });
    });
  });
};
