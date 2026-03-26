/**
 * Este arquivo registra rotas de usuários do grupo sem destruir a conta global por engano.
 * Admin de grupo pode gerenciar vínculos locais, mas não pode editar dados da conta global.
 */
const validateSchema = require("../middlewares/validateSchema");
const { anexarContextoErro } = require("../utils/errorUtils");
const {
  usuarioIdParamSchema,
  usuarioCreateBodySchema,
} = require("../validators/usuarioSchemas");

module.exports = function registerUsuarioRoutes(app, deps) {
  const {
    prisma,
    exigirAutenticacao,
    exigirPapel,
    exigirGrupoAtivoAceito,
    obterGrupoIdSessao,
    normalizarUsuarioResposta,
    normalizarTextoSimples,
    normalizarEmail,
    bcrypt,
  } = deps;

  app.get("/usuarios", exigirAutenticacao, exigirGrupoAtivoAceito, exigirPapel("adminGrupo"), async (req, res, next) => {
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
              desativadoEm: true,
              excluidoEm: true,
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

  app.get(
    "/usuarios/:id",
    exigirAutenticacao,
    exigirGrupoAtivoAceito,
    exigirPapel("adminGrupo"),
    validateSchema({ params: usuarioIdParamSchema }),
    async (req, res, next) => {
      try {
        const id = Number(req.params.id);
        const grupoId = obterGrupoIdSessao(req);

        const vinculo = await prisma.usuarioGrupo.findFirst({
          where: { grupoId, usuarioId: id, excluidoEm: null },
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
    }
  );

  app.post(
    "/usuarios",
    exigirAutenticacao,
    exigirGrupoAtivoAceito,
    exigirPapel("adminGrupo"),
    validateSchema({ body: usuarioCreateBodySchema }),
    async (req, res, next) => {
      try {
        const grupoId = obterGrupoIdSessao(req);
        const nome = normalizarTextoSimples(req.body.nome);
        const sobrenome = normalizarTextoSimples(req.body.sobrenome);
        const email = normalizarEmail(req.body.email);
        const senha = normalizarTextoSimples(req.body.senha);
        const senhaHash = await bcrypt.hash(senha, 10);

        const usuario = await prisma.usuario.create({
          data: {
            nome,
            sobrenome,
            email,
            senhaHash,
            papelGlobal: "usuario",
            usuariosGrupos: {
              create: {
                grupoId,
                papel: "membro",
                status: "aceito",
                aprovadoEm: new Date(),
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

        res.status(201).json(normalizarUsuarioResposta(usuario));
      } catch (error) {
        if (error.code === "P2002") {
          return res.status(409).json({ erro: "Email já cadastrado" });
        }

        return next(anexarContextoErro(error, req, { publicMessage: "Erro ao criar usuário" }));
      }
    }
  );

  app.put(
    "/usuarios/:id",
    exigirAutenticacao,
    exigirGrupoAtivoAceito,
    exigirPapel("adminGrupo"),
    validateSchema({ params: usuarioIdParamSchema }),
    async (req, res) => {
      return res.status(403).json({
        erro: "Admin do grupo não pode editar a conta global do usuário. Use /meu-perfil para a própria conta, /painel-sistema/usuarios/:id para administração global e as rotas do grupo para alterar vínculo, papel ou status.",
      });
    }
  );

  app.delete(
    "/usuarios/:id",
    exigirAutenticacao,
    exigirGrupoAtivoAceito,
    exigirPapel("adminGrupo"),
    validateSchema({ params: usuarioIdParamSchema }),
    async (req, res, next) => {
      try {
        const id = Number(req.params.id);
        const grupoId = obterGrupoIdSessao(req);

        const vinculo = await prisma.usuarioGrupo.findFirst({
          where: { grupoId, usuarioId: id, excluidoEm: null },
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

        res.json({ mensagem: "Vínculo do usuário removido logicamente do grupo com sucesso" });
      } catch (error) {
        return next(anexarContextoErro(error, req, { publicMessage: "Erro ao remover usuário do grupo" }));
      }
    }
  );
};
