/**
 * Este arquivo registra rotas de sugestões de grupo, cadastro, login, sessão e perfil.
 * Ele existe para concentrar fluxos de entrada do usuário e atualização da sessão autenticada.
 */
const validateSchema = require("../middlewares/validateSchema");
const { loginRateLimit, cadastroRateLimit } = require("../middlewares/rateLimitMiddleware");
const { anexarContextoErro } = require("../utils/errorUtils");
const { registrarAuditoria } = require("../utils/audit");
const {
  sugestoesGrupoQuerySchema,
  cadastroBodySchema,
  loginBodySchema,
  atualizarMeuPerfilBodySchema,
  grupoAtivoBodySchema,
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

  app.get("/grupos/sugestoes", validateSchema({ query: sugestoesGrupoQuerySchema }), async (req, res, next) => {
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
              aprovadoPorEmail: email,
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
      

      if (error.code === "P2002") {
        return res.status(409).json({ erro: "Já existe um usuário com esse nome ou email" });
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
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao fazer login" }));
    }
  });

  app.get("/sessao", exigirAutenticacao, async (req, res, next) => {
    try {
      const sessaoAtualizada = await atualizarSessaoUsuario(req, req.session.usuario.id);
      res.json({ usuario: sessaoAtualizada });
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao carregar sessão" }));
    }
  });

  app.get("/meu-status-grupo", exigirAutenticacao, async (req, res, next) => {
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
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao carregar status do grupo" }));
    }
  });

  app.get("/meu-perfil", exigirAutenticacao, async (req, res, next) => {
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
        papelGlobal: sessaoAtualizada.papelGlobal || "usuario",
        adminSistema: Boolean(sessaoAtualizada.adminSistema),
        papel: sessaoAtualizada.papel,
        statusGrupo: sessaoAtualizada.statusGrupo,
        grupoId: sessaoAtualizada.grupoId,
        grupoAtivoId: sessaoAtualizada.grupoAtivoId || sessaoAtualizada.grupoId || null,
        grupoNome: sessaoAtualizada.grupoNome,
        grupoCodigo: sessaoAtualizada.grupoCodigo,
        vinculos: Array.isArray(sessaoAtualizada.vinculos) ? sessaoAtualizada.vinculos : [],
        solicitadoEm: vinculo?.solicitadoEm || null,
        aprovadoEm: vinculo?.aprovadoEm || null,
      });
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao carregar perfil" }));
    }
  });

  app.patch(
    "/meu-perfil",
    exigirAutenticacao,
    validateSchema({ body: atualizarMeuPerfilBodySchema }),
    async (req, res, next) => {
      try {
        const usuarioId = Number(req.session.usuario.id);
        const nome = normalizarTextoSimples(req.body.nome);
        const sobrenome = normalizarTextoSimples(req.body.sobrenome);
        const email = normalizarEmail(req.body.email);
        const senha = normalizarTextoSimples(req.body.senha);

        const usuarioAtual = await prisma.usuario.findUnique({
          where: { id: usuarioId },
          select: { id: true, email: true },
        });

        if (!usuarioAtual) {
          return res.status(404).json({ erro: "Usuário não encontrado" });
        }

        if (email !== usuarioAtual.email) {
          const usuarioComMesmoEmail = await prisma.usuario.findUnique({
            where: { email },
            select: { id: true },
          });

          if (usuarioComMesmoEmail && usuarioComMesmoEmail.id !== usuarioId) {
            return res.status(409).json({ erro: "Já existe um usuário com esse e-mail" });
          }
        }

        const data = {
          nome,
          sobrenome,
          email,
        };

        if (senha) {
          data.senhaHash = await bcrypt.hash(senha, 10);
        }

        await prisma.usuario.update({
          where: { id: usuarioId },
          data,
        });

        await registrarAuditoria(prisma, req, {
          entidade: "usuario",
          entidadeId: usuarioId,
          acao: "atualizacao_perfil",
          descricao: `Perfil atualizado por ${email}`,
          metadados: {
            emailAnterior: usuarioAtual.email,
            emailNovo: email,
            alterouSenha: Boolean(senha),
          },
        });

        const sessaoAtualizada = await atualizarSessaoUsuario(req, usuarioId);

        res.json({
          mensagem: "Perfil atualizado com sucesso",
          usuario: sessaoAtualizada,
        });
      } catch (error) {
        return next(anexarContextoErro(error, req, { publicMessage: "Erro ao atualizar perfil" }));
      }
    }
  );

  app.post(
    "/meu-perfil/grupo-ativo",
    exigirAutenticacao,
    validateSchema({ body: grupoAtivoBodySchema }),
    async (req, res, next) => {
      try {
        const usuarioId = Number(req.session.usuario.id);
        const grupoId = Number(req.body.grupoId);

        const vinculo = await prisma.usuarioGrupo.findFirst({
          where: {
            usuarioId,
            grupoId,
            status: "aceito",
          },
          include: {
            grupo: {
              select: {
                id: true,
                nome: true,
                codigo: true,
              },
            },
          },
        });

        if (!vinculo) {
          return res.status(403).json({ erro: "Você só pode selecionar vínculos aceitos" });
        }

        try {
          await prisma.usuario.update({
            where: { id: usuarioId },
            data: { grupoAtivoId: grupoId },
          });
        } catch (persistError) {
          // Fallback silencioso quando o schema atual ainda não persiste grupo ativo.
        }

        const sessaoAtualizada = await atualizarSessaoUsuario(req, usuarioId);

        req.session.usuario = {
          ...sessaoAtualizada,
          grupoId: vinculo.grupoId,
          grupoAtivoId: vinculo.grupoId,
          grupoNome: vinculo.grupo?.nome || null,
          grupoCodigo: vinculo.grupo?.codigo || null,
          papel: vinculo.papel,
          statusGrupo: vinculo.status,
        };

        res.json({
          mensagem: "Grupo ativo atualizado com sucesso",
          usuario: req.session.usuario,
        });
      } catch (error) {
        return next(anexarContextoErro(error, req, { publicMessage: "Erro ao selecionar grupo ativo" }));
      }
    }
  );

  app.get("/meu-grupo/membros", exigirAutenticacao, async (req, res, next) => {
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
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao carregar membros do grupo" }));
    }
  });

  app.get("/meu-grupo/solicitacoes", exigirAutenticacao, exigirPapel("admin"), async (req, res, next) => {
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
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao carregar solicitações do grupo" }));
    }
  });

  app.patch(
    "/meu-grupo/solicitacoes/:id/aceitar",
    exigirAutenticacao,
    exigirPapel("admin"),
    validateSchema({ params: solicitacaoIdParamSchema }),
    async (req, res, next) => {
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
            aprovadoPorEmail: req.session.usuario.email,
          },
          include: {
            usuario: {
              select: { id: true, nome: true, email: true, ativo: true },
            },
          },
        });

        await registrarAuditoria(prisma, req, {
          entidade: "usuario_grupo",
          entidadeId: atualizado.id,
          acao: "aprovacao_solicitacao",
          descricao: `Solicitação aprovada para ${atualizado.usuario.email}`,
          grupoId,
          metadados: {
            statusAnterior: vinculo.status,
            statusNovo: atualizado.status,
            aprovadoPorEmail: req.session.usuario.email,
          },
        });

        res.json({ ...atualizado, usuario: normalizarUsuarioResposta(atualizado.usuario) });
      } catch (error) {
        return next(anexarContextoErro(error, req, { publicMessage: "Erro ao aceitar solicitação" }));
      }
    }
  );

  app.patch(
    "/meu-grupo/solicitacoes/:id/recusar",
    exigirAutenticacao,
    exigirPapel("admin"),
    validateSchema({ params: solicitacaoIdParamSchema }),
    async (req, res, next) => {
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

        await registrarAuditoria(prisma, req, {
          entidade: "usuario_grupo",
          entidadeId: atualizado.id,
          acao: "aprovacao_solicitacao",
          descricao: `Solicitação aprovada para ${atualizado.usuario.email}`,
          grupoId,
          metadados: {
            statusAnterior: vinculo.status,
            statusNovo: atualizado.status,
            aprovadoPorEmail: req.session.usuario.email,
          },
        });

        res.json({ ...atualizado, usuario: normalizarUsuarioResposta(atualizado.usuario) });
      } catch (error) {
        return next(anexarContextoErro(error, req, { publicMessage: "Erro ao recusar solicitação" }));
      }
    }
  );

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