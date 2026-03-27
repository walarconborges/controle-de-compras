/**
 * Rotas de usuários do grupo.
 * Conta global e vínculo por grupo não podem mais ser confundidos.
 */
const validateSchema = require("../middlewares/validateSchema");
const { anexarContextoErro } = require("../utils/errorUtils");
const { registrarAuditoria } = require("../utils/audit");
const {
  usuarioIdParamSchema,
  usuarioCreateBodySchema,
  usuarioUpdateBodySchema,
} = require("../validators/usuarioSchemas");

module.exports = function registerUsuarioRoutes(app, deps) {
  const {
    prisma,
    exigirAutenticacao,
    exigirPapel,
    obterGrupoIdSessao,
    normalizarUsuarioResposta,
    normalizarTextoSimples,
    normalizarEmail,
    bcrypt,
  } = deps;

  app.get("/usuarios", exigirAutenticacao, exigirPapel("adminGrupo", "adminSistema"), async (req, res, next) => {
    try {
      const grupoId = obterGrupoIdSessao(req);

      const vinculos = await prisma.usuarioGrupo.findMany({
        where: {
          grupoId,
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
              criadoEm: true,
              atualizadoEm: true,
            },
          },
        },
      });

      res.json(
        vinculos
          .filter((vinculo) => vinculo.usuario)
          .map((vinculo) => ({
            ...normalizarUsuarioResposta(vinculo.usuario),
            papel: vinculo.papel,
            status: vinculo.status,
          }))
      );
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao buscar usuários" }));
    }
  });

  app.get("/usuarios/:id", exigirAutenticacao, exigirPapel("adminGrupo", "adminSistema"), validateSchema({ params: usuarioIdParamSchema }), async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const grupoId = obterGrupoIdSessao(req);

      const vinculo = await prisma.usuarioGrupo.findFirst({
        where: {
          grupoId,
          usuarioId: id,
          excluidoEm: null,
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

      res.json({
        ...normalizarUsuarioResposta(vinculo.usuario),
        papel: vinculo.papel,
        status: vinculo.status,
      });
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao buscar usuário" }));
    }
  });

  app.post("/usuarios", exigirAutenticacao, exigirPapel("adminGrupo", "adminSistema"), validateSchema({ body: usuarioCreateBodySchema }), async (req, res, next) => {
    try {
      const grupoId = obterGrupoIdSessao(req);
      const nome = normalizarTextoSimples(req.body.nome);
      const sobrenome = normalizarTextoSimples(req.body.sobrenome);
      const email = normalizarEmail(req.body.email);
      const senha = normalizarTextoSimples(req.body.senha);
      const ativo = req.body.ativo;

      const senhaHash = await bcrypt.hash(senha, 10);

      const usuario = await prisma.usuario.create({
        data: {
          nome,
          sobrenome,
          email,
          senhaHash,
          papelGlobal: "usuario",
          ativo: typeof ativo === "boolean" ? ativo : true,
          usuariosGrupos: {
            create: {
              grupoId,
              papel: "membro",
              status: "aceito",
              aprovadoEm: new Date(),
              aprovadoPorEmail: req.session.usuario.email,
            },
          },
          grupoAtivoId: grupoId,
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

      await registrarAuditoria(prisma, req, {
        entidade: "usuario",
        entidadeId: usuario.id,
        acao: "criacao_usuario_aprovado",
        descricao: `Usuário ${usuario.email} criado administrativamente`,
        grupoId,
        metadados: { aprovadoPorEmail: req.session.usuario.email },
      });

      res.status(201).json(normalizarUsuarioResposta(usuario));
    } catch (error) {
      if (error.code === "P2002") {
        return res.status(409).json({ erro: "E-mail já cadastrado" });
      }

      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao criar usuário" }));
    }
  });

  app.put("/usuarios/:id", exigirAutenticacao, exigirPapel("adminGrupo", "adminSistema"), validateSchema({ params: usuarioIdParamSchema, body: usuarioUpdateBodySchema }), async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const ehAdminSistema = Boolean(req.session.usuario?.adminSistema);

      if (!ehAdminSistema && id !== Number(req.session.usuario.id)) {
        return res.status(403).json({ erro: "adminGrupo não pode editar a conta global de outro usuário" });
      }

      const nome = normalizarTextoSimples(req.body.nome);
      const sobrenome = normalizarTextoSimples(req.body.sobrenome);
      const email = normalizarEmail(req.body.email);
      const senha = normalizarTextoSimples(req.body.senha);
      const ativo = req.body.ativo;

      const dadosAtualizacao = { nome, sobrenome, email };

      if (ehAdminSistema && typeof ativo === "boolean") {
        dadosAtualizacao.ativo = ativo;
      }

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
      if (error.code === "P2025") {
        return res.status(404).json({ erro: "Usuário não encontrado" });
      }

      if (error.code === "P2002") {
        return res.status(409).json({ erro: "E-mail já cadastrado" });
      }

      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao atualizar usuário" }));
    }
  });

  app.delete("/usuarios/:id", exigirAutenticacao, exigirPapel("adminGrupo", "adminSistema"), validateSchema({ params: usuarioIdParamSchema }), async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const grupoId = obterGrupoIdSessao(req);

      const vinculo = await prisma.usuarioGrupo.findFirst({
        where: {
          grupoId,
          usuarioId: id,
          excluidoEm: null,
        },
      });

      if (!vinculo) {
        return res.status(404).json({ erro: "Usuário não encontrado no seu grupo" });
      }

      await prisma.usuarioGrupo.update({
        where: { id: vinculo.id },
        data: {
          status: "removido",
          removidoEm: new Date(),
          excluidoEm: new Date(),
        },
      });

      res.json({ mensagem: "Vínculo removido com sucesso" });
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao remover vínculo do usuário" }));
    }
  });
};
