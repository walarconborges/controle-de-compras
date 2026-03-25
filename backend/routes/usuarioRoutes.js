/**
 * Este arquivo registra rotas de usuários do grupo.
 * Ele existe para concentrar listagem, leitura, criação, atualização e exclusão de usuários.
 */
const validateSchema = require("../middlewares/validateSchema");
const { anexarContextoErro } = require("../utils/errorUtils");
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

  app.get("/usuarios", exigirAutenticacao, exigirPapel("admin"), async (req, res, next) => {
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

      res.json(
        vinculos
          .filter((vinculo) => vinculo.usuario)
          .map((vinculo) => normalizarUsuarioResposta(vinculo.usuario))
      );
    } catch (error) {
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao buscar usuários" }));
    }
  });

  app.get("/usuarios/:id", exigirAutenticacao, exigirPapel("admin"), validateSchema({ params: usuarioIdParamSchema }), async (req, res, next) => {
    try {
      const { id } = req.params;
      const grupoId = obterGrupoIdSessao(req);

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
      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao buscar usuário" }));
    }
  });

  app.post("/usuarios", exigirAutenticacao, exigirPapel("admin"), validateSchema({ body: usuarioCreateBodySchema }), async (req, res, next) => {
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
          ativo: typeof ativo === "boolean" ? ativo : true,
          usuariosGrupos: {
            create: {
              grupoId,
              papel: "membro",
              status: "aceito",
              aprovadoEm: new Date(),
            },
          },
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
        return res.status(409).json({ erro: "Nome ou email já cadastrado" });
      }

      return next(anexarContextoErro(error, req, { publicMessage: "Erro ao criar usuário" }));
    }
  });

  app.put(
    "/usuarios/:id",
    exigirAutenticacao,
    exigirPapel("admin"),
    validateSchema({ params: usuarioIdParamSchema, body: usuarioUpdateBodySchema }),
    async (req, res, next) => {
      try {
        const { id } = req.params;
        const grupoId = obterGrupoIdSessao(req);
        const nome = normalizarTextoSimples(req.body.nome);
        const sobrenome = normalizarTextoSimples(req.body.sobrenome);
        const email = normalizarEmail(req.body.email);
        const senha = normalizarTextoSimples(req.body.senha);
        const ativo = req.body.ativo;

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
        

        if (error.code === "P2025") {
          return res.status(404).json({ erro: "Usuário não encontrado" });
        }

        if (error.code === "P2002") {
          return res.status(409).json({ erro: "Nome ou email já cadastrado" });
        }

        return next(anexarContextoErro(error, req, { publicMessage: "Erro ao atualizar usuário" }));
      }
    }
  );

  app.delete(
    "/usuarios/:id",
    exigirAutenticacao,
    exigirPapel("admin"),
    validateSchema({ params: usuarioIdParamSchema }),
    async (req, res, next) => {
      try {
        const { id } = req.params;
        const grupoId = obterGrupoIdSessao(req);

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
        

        if (error.code === "P2025") {
          return res.status(404).json({ erro: "Usuário não encontrado" });
        }

        return next(anexarContextoErro(error, req, { publicMessage: "Erro ao excluir usuário" }));
      }
    }
  );
};