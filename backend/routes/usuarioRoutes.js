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

function parseGrupoId(valor) {
  const numero = Number(valor);
  return Number.isInteger(numero) && numero > 0 ? numero : null;
}

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

  function ehAdminSistema(req) {
    return Boolean(req.session.usuario?.adminSistema);
  }

  function obterGrupoAlvo(req, { obrigatorio = true, preferirBody = false } = {}) {
    if (!ehAdminSistema(req)) {
      const grupoIdSessao = obterGrupoIdSessao(req);
      return parseGrupoId(grupoIdSessao);
    }

    const grupoIdBody = preferirBody ? parseGrupoId(req.body?.grupoId) : null;
    const grupoIdQuery = parseGrupoId(req.query?.grupoId);
    const grupoIdSessao = parseGrupoId(obterGrupoIdSessao(req));

    const grupoId = grupoIdBody || grupoIdQuery || grupoIdSessao || null;

    if (!grupoId && obrigatorio) {
      return null;
    }

    return grupoId;
  }

  app.get("/usuarios", exigirAutenticacao, exigirPapel("adminGrupo", "adminSistema"), async (req, res, next) => {
    try {
      const adminSistema = ehAdminSistema(req);
      const grupoId = obterGrupoAlvo(req, { obrigatorio: false });

      const vinculos = await prisma.usuarioGrupo.findMany({
        where: {
          excluidoEm: null,
          ...(grupoId ? { grupoId } : {}),
        },
        orderBy: [{ grupoId: "asc" }, { id: "asc" }],
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
            grupoId: vinculo.grupoId,
          }))
      );
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao buscar usuários" }));
    }
  });

  app.get("/usuarios/:id", exigirAutenticacao, exigirPapel("adminGrupo", "adminSistema"), validateSchema({ params: usuarioIdParamSchema }), async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      const adminSistema = ehAdminSistema(req);
      const grupoId = obterGrupoAlvo(req, { obrigatorio: false });

      const vinculo = await prisma.usuarioGrupo.findFirst({
        where: {
          usuarioId: id,
          excluidoEm: null,
          ...(grupoId ? { grupoId } : {}),
        },
        orderBy: [{ criadoEm: "desc" }, { id: "desc" }],
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
        const usuario = adminSistema
          ? await prisma.usuario.findUnique({
              where: { id },
              select: {
                id: true,
                nome: true,
                sobrenome: true,
                email: true,
                ativo: true,
                criadoEm: true,
                atualizadoEm: true,
              },
            })
          : null;

        if (!usuario) {
          return res.status(404).json({ erro: "Usuário não encontrado" });
        }

        return res.json(normalizarUsuarioResposta(usuario));
      }

      res.json({
        ...normalizarUsuarioResposta(vinculo.usuario),
        papel: vinculo.papel,
        status: vinculo.status,
        grupoId: vinculo.grupoId,
      });
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao buscar usuário" }));
    }
  });

  app.post("/usuarios", exigirAutenticacao, exigirPapel("adminGrupo", "adminSistema"), validateSchema({ body: usuarioCreateBodySchema }), async (req, res, next) => {
    try {
      const grupoId = obterGrupoAlvo(req, { obrigatorio: true, preferirBody: true });

      if (!grupoId) {
        return res.status(400).json({ erro: "Informe um grupo válido para criar o usuário" });
      }

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
      const adminSistema = ehAdminSistema(req);

      if (!adminSistema && id !== Number(req.session.usuario.id)) {
        return res.status(403).json({ erro: "adminGrupo não pode editar a conta global de outro usuário" });
      }

      const nome = normalizarTextoSimples(req.body.nome);
      const sobrenome = normalizarTextoSimples(req.body.sobrenome);
      const email = normalizarEmail(req.body.email);
      const senha = normalizarTextoSimples(req.body.senha);
      const ativo = req.body.ativo;

      const dadosAtualizacao = { nome, sobrenome, email };

      if (adminSistema && typeof ativo === "boolean") {
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
      const grupoId = obterGrupoAlvo(req, { obrigatorio: false });

      const vinculos = await prisma.usuarioGrupo.findMany({
        where: {
          usuarioId: id,
          excluidoEm: null,
          ...(grupoId ? { grupoId } : {}),
        },
        orderBy: [{ criadoEm: "desc" }, { id: "desc" }],
      });

      if (!vinculos.length) {
        return res.status(404).json({ erro: "Vínculo do usuário não encontrado" });
      }

      if (ehAdminSistema(req) && !grupoId && vinculos.length > 1) {
        return res.status(400).json({ erro: "Informe o grupoId para remover o vínculo correto" });
      }

      const vinculo = vinculos[0];

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
