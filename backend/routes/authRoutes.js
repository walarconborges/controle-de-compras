/**
 * Rotas de cadastro, autenticação, sessão, perfil e vínculo do próprio usuário.
 * O arquivo precisa alinhar conta global, vínculo por grupo, grupo ativo e ações do Perfil.
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

function normalizarPapelGrupo(papel) {
  const valor = String(papel || "").trim();
  if (valor === "admin") return "adminGrupo";
  if (valor === "adminGrupo") return "adminGrupo";
  return "membro";
}

async function sincronizarGrupoAtivoUsuario(prisma, usuarioId) {
  const usuarioNumero = Number(usuarioId);

  if (!Number.isInteger(usuarioNumero) || usuarioNumero <= 0) {
    return null;
  }

  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioNumero },
    select: { grupoAtivoId: true },
  });

  const vinculosAceitos = await prisma.usuarioGrupo.findMany({
    where: {
      usuarioId: usuarioNumero,
      status: "aceito",
      excluidoEm: null,
      grupo: {
        is: {
          excluidoEm: null,
          desativadoEm: null,
        },
      },
    },
    orderBy: [{ id: "asc" }],
    select: { grupoId: true },
  });

  const grupoAtivoAtual = usuario?.grupoAtivoId ?? null;
  const grupoAtivoPermaneceValido = vinculosAceitos.some(
    (vinculo) => Number(vinculo.grupoId) === Number(grupoAtivoAtual)
  );

  const proximoGrupoAtivo = grupoAtivoPermaneceValido
    ? grupoAtivoAtual
    : vinculosAceitos[0]?.grupoId ?? null;

  if (grupoAtivoAtual !== proximoGrupoAtivo) {
    await prisma.usuario.update({
      where: { id: usuarioNumero },
      data: { grupoAtivoId: proximoGrupoAtivo },
    });
  }

  return proximoGrupoAtivo;
}


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
          excluidoEm: null,
          nome: { contains: termo, mode: "insensitive" },
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
          },
        });

        const grupoExistente = await tx.grupo.findFirst({
          where: { nome: grupoNome, excluidoEm: null },
          select: { id: true, nome: true, codigo: true },
        });

        if (!grupoExistente) {
          const grupoCriado = await tx.grupo.create({
            data: {
              nome: grupoNome,
              codigo: "TEMP",
            },
            select: { id: true, nome: true, codigo: true },
          });

          const grupoAtualizado = await tx.grupo.update({
            where: { id: grupoCriado.id },
            data: {
              codigo: gerarCodigoGrupo(grupoCriado.nome, grupoCriado.id),
            },
            select: { id: true, nome: true, codigo: true },
          });

          await tx.usuarioGrupo.create({
            data: {
              usuarioId: usuario.id,
              grupoId: grupoAtualizado.id,
              papel: "adminGrupo",
              status: "aceito",
              aprovadoEm: new Date(),
              aprovadoPorEmail: email,
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
        return res.status(409).json({ erro: "Já existe um usuário com esse e-mail" });
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
          email: true,
          senhaHash: true,
          ativo: true,
          desativadoEm: true,
          excluidoEm: true,
        },
      });

      if (!usuario || usuario.excluidoEm) {
        return res.status(401).json({ erro: "Credenciais inválidas" });
      }

      if (!usuario.ativo || usuario.desativadoEm) {
        return res.status(403).json({ erro: "Usuário inativo" });
      }

      const senhaCorreta = await bcrypt.compare(senha, usuario.senhaHash);

      if (!senhaCorreta) {
        return res.status(401).json({ erro: "Credenciais inválidas" });
      }

      const sessaoUsuario = await atualizarSessaoUsuario(req, usuario.id);

      if (!sessaoUsuario) {
        return res.status(403).json({ erro: "Usuário sem vínculo disponível" });
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
      const usuario = await atualizarSessaoUsuario(req, req.session.usuario.id);

      if (!usuario) {
        return res.status(401).json({ erro: "Sessão inválida" });
      }

      res.json({ usuario });
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao carregar sessão" }));
    }
  });

  app.get("/meu-status-grupo", exigirAutenticacao, async (req, res, next) => {
    try {
      const usuario = await atualizarSessaoUsuario(req, req.session.usuario.id);

      res.json({
        status: usuario?.statusGrupo || null,
        papel: usuario?.papel || null,
        grupoId: usuario?.grupoId || null,
        grupoNome: usuario?.grupoNome || null,
        grupoCodigo: usuario?.grupoCodigo || null,
      });
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao carregar status do grupo" }));
    }
  });

  app.get("/meu-perfil", exigirAutenticacao, async (req, res, next) => {
    try {
      const usuario = await atualizarSessaoUsuario(req, req.session.usuario.id);

      if (!usuario) {
        return res.status(404).json({ erro: "Usuário não encontrado" });
      }

      res.json({
        id: usuario.id,
        nome: usuario.nome,
        sobrenome: usuario.sobrenome || "",
        nomeCompleto: usuario.nomeCompleto || montarNomeCompleto(usuario.nome, usuario.sobrenome),
        email: usuario.email,
        papelGlobal: usuario.papelGlobal,
        adminSistema: Boolean(usuario.adminSistema),
        papel: usuario.papel,
        statusGrupo: usuario.statusGrupo,
        grupoId: usuario.grupoId,
        grupoAtivoId: usuario.grupoAtivoId,
        grupoNome: usuario.grupoNome,
        grupoCodigo: usuario.grupoCodigo,
        vinculos: Array.isArray(usuario.vinculos) ? usuario.vinculos : [],
      });
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao carregar perfil" }));
    }
  });

  app.patch("/meu-perfil", exigirAutenticacao, validateSchema({ body: atualizarMeuPerfilBodySchema }), async (req, res, next) => {
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

      const data = { nome, sobrenome, email };

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

      const usuario = await atualizarSessaoUsuario(req, usuarioId);

      res.json({
        mensagem: "Perfil atualizado com sucesso",
        usuario,
      });
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao atualizar perfil" }));
    }
  });

  app.post("/meu-perfil/grupo-ativo", exigirAutenticacao, validateSchema({ body: grupoAtivoBodySchema }), async (req, res, next) => {
    try {
      const usuarioId = Number(req.session.usuario.id);
      const grupoId = Number(req.body.grupoId);

      const vinculo = await prisma.usuarioGrupo.findFirst({
        where: {
          usuarioId,
          grupoId,
          status: "aceito",
          excluidoEm: null,
        },
        include: {
          grupo: {
            select: { id: true, nome: true, codigo: true, excluidoEm: true, desativadoEm: true },
          },
        },
      });

      if (!vinculo || vinculo.grupo?.excluidoEm || vinculo.grupo?.desativadoEm) {
        return res.status(403).json({ erro: "Você só pode selecionar vínculos aceitos" });
      }

      await prisma.usuario.update({
        where: { id: usuarioId },
        data: { grupoAtivoId: grupoId },
      });

      await sincronizarGrupoAtivoUsuario(prisma, usuarioId);

      const usuario = await atualizarSessaoUsuario(req, usuarioId);

      res.json({
        mensagem: "Grupo ativo atualizado com sucesso",
        usuario,
      });
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao selecionar grupo ativo" }));
    }
  });

  app.get("/meu-grupo/membros", exigirAutenticacao, async (req, res, next) => {
    try {
      const grupoId = obterGrupoIdSessao(req);

      if (!grupoId) {
        return res.json([]);
      }

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
            },
          },
        },
      });

      res.json(vinculos.map((vinculo) => ({ ...vinculo, usuario: normalizarUsuarioResposta(vinculo.usuario) })));
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao carregar membros do grupo" }));
    }
  });

  app.get("/meu-grupo/solicitacoes", exigirAutenticacao, exigirPapel("adminGrupo", "adminSistema"), async (req, res, next) => {
    try {
      const grupoId = obterGrupoIdSessao(req);

      if (!grupoId) {
        return res.json([]);
      }

      const solicitacoes = await prisma.usuarioGrupo.findMany({
        where: {
          grupoId,
          excluidoEm: null,
          status: { in: ["pendente", "convidado"] },
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

      res.json(solicitacoes.map((item) => ({ ...item, usuario: normalizarUsuarioResposta(item.usuario) })));
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao carregar solicitações do grupo" }));
    }
  });

  app.patch("/meu-grupo/solicitacoes/:id/aceitar", exigirAutenticacao, exigirPapel("adminGrupo", "adminSistema"), validateSchema({ params: solicitacaoIdParamSchema }), async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const grupoId = obterGrupoIdSessao(req);

      const vinculo = await prisma.usuarioGrupo.findFirst({
        where: { id, grupoId, excluidoEm: null, status: { in: ["pendente", "convidado"] } },
        include: { usuario: { select: { id: true, nome: true, email: true, ativo: true } } },
      });

      if (!vinculo) {
        return res.status(404).json({ erro: "Pendência não encontrada" });
      }

      const atualizado = await prisma.usuarioGrupo.update({
        where: { id },
        data: {
          status: "aceito",
          aprovadoEm: new Date(),
          aprovadoPorEmail: req.session.usuario.email,
        },
        include: { usuario: { select: { id: true, nome: true, email: true, ativo: true } } },
      });

      await sincronizarGrupoAtivoUsuario(prisma, atualizado.usuario.id);

      await registrarAuditoria(prisma, req, {
        entidade: "usuario_grupo",
        entidadeId: atualizado.id,
        acao: "pendencia_aceita",
        descricao: `Pendência aceita para ${atualizado.usuario.email}`,
        grupoId,
        metadados: {
          statusAnterior: vinculo.status,
          statusNovo: atualizado.status,
          aprovadoPorEmail: req.session.usuario.email,
        },
      });

      res.json({ ...atualizado, usuario: normalizarUsuarioResposta(atualizado.usuario) });
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao aceitar pendência" }));
    }
  });

  app.patch("/meu-grupo/solicitacoes/:id/recusar", exigirAutenticacao, exigirPapel("adminGrupo", "adminSistema"), validateSchema({ params: solicitacaoIdParamSchema }), async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const grupoId = obterGrupoIdSessao(req);

      const vinculo = await prisma.usuarioGrupo.findFirst({
        where: { id, grupoId, excluidoEm: null, status: { in: ["pendente", "convidado"] } },
        include: { usuario: { select: { id: true, nome: true, email: true, ativo: true } } },
      });

      if (!vinculo) {
        return res.status(404).json({ erro: "Pendência não encontrada" });
      }

      const atualizado = await prisma.usuarioGrupo.update({
        where: { id },
        data: { status: "recusado" },
        include: { usuario: { select: { id: true, nome: true, email: true, ativo: true } } },
      });

      await registrarAuditoria(prisma, req, {
        entidade: "usuario_grupo",
        entidadeId: atualizado.id,
        acao: "pendencia_recusada",
        descricao: `Pendência recusada para ${atualizado.usuario.email}`,
        grupoId,
        metadados: {
          statusAnterior: vinculo.status,
          statusNovo: atualizado.status,
          aprovadoPorEmail: req.session.usuario.email,
        },
      });

      res.json({ ...atualizado, usuario: normalizarUsuarioResposta(atualizado.usuario) });
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao recusar pendência" }));
    }
  });

  app.patch("/meu-grupo/membros/:usuarioId/papel", exigirAutenticacao, exigirPapel("adminGrupo", "adminSistema"), async (req, res, next) => {
    try {
      const grupoId = obterGrupoIdSessao(req);
      const usuarioId = Number(req.params.usuarioId);
      const papel = normalizarPapelGrupo(req.body?.papel);

      const vinculo = await prisma.usuarioGrupo.findFirst({
        where: { grupoId, usuarioId, status: "aceito", excluidoEm: null },
      });

      if (!vinculo) {
        return res.status(404).json({ erro: "Membro não encontrado no grupo" });
      }

      if (usuarioId === Number(req.session.usuario.id) && papel === "membro") {
        return res.status(400).json({ erro: "Use a opção de sair do grupo para deixar a administração" });
      }

      const atualizado = await prisma.usuarioGrupo.update({
        where: { id: vinculo.id },
        data: { papel },
      });

      await registrarAuditoria(prisma, req, {
        entidade: "usuario_grupo",
        entidadeId: atualizado.id,
        acao: "alteracao_papel_vinculo",
        descricao: `Papel do vínculo alterado para ${papel}`,
        grupoId,
        metadados: { usuarioId, papel },
      });

      if (usuarioId === Number(req.session.usuario.id)) {
        await atualizarSessaoUsuario(req, usuarioId);
      }

      res.json(atualizado);
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao atualizar papel do membro" }));
    }
  });

  app.post("/meu-grupo/membros/:usuarioId/remover", exigirAutenticacao, exigirPapel("adminGrupo", "adminSistema"), async (req, res, next) => {
    try {
      const grupoId = obterGrupoIdSessao(req);
      const usuarioId = Number(req.params.usuarioId);

      if (usuarioId === Number(req.session.usuario.id)) {
        return res.status(400).json({ erro: "Use a opção de sair do grupo para remover o próprio vínculo" });
      }

      const vinculo = await prisma.usuarioGrupo.findFirst({
        where: { grupoId, usuarioId, excluidoEm: null },
      });

      if (!vinculo) {
        return res.status(404).json({ erro: "Membro não encontrado no grupo" });
      }

      const atualizado = await prisma.usuarioGrupo.update({
        where: { id: vinculo.id },
        data: {
          status: "removido",
          removidoEm: new Date(),
          excluidoEm: new Date(),
        },
      });

      await sincronizarGrupoAtivoUsuario(prisma, usuarioId);

      await registrarAuditoria(prisma, req, {
        entidade: "usuario_grupo",
        entidadeId: atualizado.id,
        acao: "remocao_membro_grupo",
        descricao: `Membro ${usuarioId} removido do grupo`,
        grupoId,
        metadados: { usuarioId },
      });

      res.json({ mensagem: "Membro removido com sucesso" });
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao remover membro" }));
    }
  });

  app.post("/meu-grupo/sair", exigirAutenticacao, async (req, res, next) => {
    try {
      const grupoId = obterGrupoIdSessao(req);
      const usuarioId = Number(req.session.usuario.id);

      if (!grupoId) {
        return res.status(400).json({ erro: "Nenhum grupo ativo selecionado" });
      }

      const vinculo = await prisma.usuarioGrupo.findFirst({
        where: { grupoId, usuarioId, excluidoEm: null },
      });

      if (!vinculo) {
        return res.status(404).json({ erro: "Vínculo não encontrado" });
      }

      await prisma.usuarioGrupo.update({
        where: { id: vinculo.id },
        data: {
          status: "saiu",
          removidoEm: new Date(),
          excluidoEm: new Date(),
        },
      });

      await sincronizarGrupoAtivoUsuario(prisma, usuarioId);

      await registrarAuditoria(prisma, req, {
        entidade: "usuario_grupo",
        entidadeId: vinculo.id,
        acao: "saida_grupo",
        descricao: `Usuário saiu do grupo ${grupoId}`,
        grupoId,
      });

      const usuario = await atualizarSessaoUsuario(req, usuarioId);

      res.json({
        mensagem: "Saída do grupo registrada com sucesso",
        usuario,
      });
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao sair do grupo" }));
    }
  });

  app.post("/meu-grupo/convites", exigirAutenticacao, exigirPapel("adminGrupo", "adminSistema"), async (req, res, next) => {
    try {
      const grupoId = obterGrupoIdSessao(req);
      const email = normalizarEmail(req.body?.email);
      const papel = normalizarPapelGrupo(req.body?.papel);

      const usuario = await prisma.usuario.findUnique({
        where: { email },
        select: { id: true, email: true, nome: true, sobrenome: true },
      });

      if (!usuario) {
        return res.status(404).json({ erro: "Usuário não encontrado para convite" });
      }

      const existente = await prisma.usuarioGrupo.findFirst({
        where: {
          usuarioId: usuario.id,
          grupoId,
        },
      });

      let vinculo;

      if (existente) {
        vinculo = await prisma.usuarioGrupo.update({
          where: { id: existente.id },
          data: {
            papel,
            status: "convidado",
            canceladoEm: null,
            removidoEm: null,
            excluidoEm: null,
            desativadoEm: null,
          },
        });
      } else {
        vinculo = await prisma.usuarioGrupo.create({
          data: {
            usuarioId: usuario.id,
            grupoId,
            papel,
            status: "convidado",
          },
        });
      }

      await registrarAuditoria(prisma, req, {
        entidade: "usuario_grupo",
        entidadeId: vinculo.id,
        acao: "convite_grupo",
        descricao: `Convite enviado para ${usuario.email}`,
        grupoId,
        metadados: { papel },
      });

      res.status(201).json(vinculo);
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao convidar usuário" }));
    }
  });

  app.post("/meus-convites/:id/aceitar", exigirAutenticacao, validateSchema({ params: solicitacaoIdParamSchema }), async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const usuarioId = Number(req.session.usuario.id);

      const vinculo = await prisma.usuarioGrupo.findFirst({
        where: { id, usuarioId, status: "convidado", excluidoEm: null },
      });

      if (!vinculo) {
        return res.status(404).json({ erro: "Convite não encontrado" });
      }

      await prisma.usuarioGrupo.update({
        where: { id },
        data: {
          status: "aceito",
          aprovadoEm: new Date(),
          aprovadoPorEmail: req.session.usuario.email,
        },
      });

      await sincronizarGrupoAtivoUsuario(prisma, usuarioId);

      await registrarAuditoria(prisma, req, {
        entidade: "usuario_grupo",
        entidadeId: vinculo.id,
        acao: "convite_aceito",
        descricao: `Convite aceito pelo usuário ${req.session.usuario.email}`,
        grupoId: vinculo.grupoId,
      });

      const usuario = await atualizarSessaoUsuario(req, usuarioId);

      res.json({
        mensagem: "Convite aceito com sucesso",
        usuario,
      });
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao aceitar convite" }));
    }
  });

  app.post("/meus-convites/:id/recusar", exigirAutenticacao, validateSchema({ params: solicitacaoIdParamSchema }), async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const usuarioId = Number(req.session.usuario.id);

      const vinculo = await prisma.usuarioGrupo.findFirst({
        where: { id, usuarioId, status: "convidado", excluidoEm: null },
      });

      if (!vinculo) {
        return res.status(404).json({ erro: "Convite não encontrado" });
      }

      await prisma.usuarioGrupo.update({
        where: { id },
        data: { status: "recusado", canceladoEm: new Date() },
      });

      await registrarAuditoria(prisma, req, {
        entidade: "usuario_grupo",
        entidadeId: vinculo.id,
        acao: "convite_recusado",
        descricao: `Convite recusado pelo usuário ${req.session.usuario.email}`,
        grupoId: vinculo.grupoId,
      });

      const usuario = await atualizarSessaoUsuario(req, usuarioId);

      res.json({
        mensagem: "Convite recusado com sucesso",
        usuario,
      });
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao recusar convite" }));
    }
  });

  app.post("/meus-vinculos/:id/cancelar-solicitacao", exigirAutenticacao, validateSchema({ params: solicitacaoIdParamSchema }), async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const usuarioId = Number(req.session.usuario.id);

      const vinculo = await prisma.usuarioGrupo.findFirst({
        where: { id, usuarioId, status: "pendente", excluidoEm: null },
      });

      if (!vinculo) {
        return res.status(404).json({ erro: "Solicitação não encontrada" });
      }

      await prisma.usuarioGrupo.update({
        where: { id },
        data: {
          status: "cancelado",
          canceladoEm: new Date(),
        },
      });

      await registrarAuditoria(prisma, req, {
        entidade: "usuario_grupo",
        entidadeId: vinculo.id,
        acao: "solicitacao_cancelada",
        descricao: `Solicitação cancelada pelo usuário ${req.session.usuario.email}`,
        grupoId: vinculo.grupoId,
      });

      const usuario = await atualizarSessaoUsuario(req, usuarioId);

      res.json({
        mensagem: "Solicitação cancelada com sucesso",
        usuario,
      });
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao cancelar solicitação" }));
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
