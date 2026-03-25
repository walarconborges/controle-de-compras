/**
 * Este arquivo registra rotas de vínculos entre usuários e grupos.
 * Ele existe para concentrar gerenciamento administrativo dessa relação.
 */
const validateSchema = require("../middlewares/validateSchema");
const {
  usuarioGrupoIdParamSchema,
  usuarioGrupoBodySchema,
} = require("../validators/usuarioGrupoSchemas");

module.exports = function registerUsuarioGrupoRoutes(app, deps) {
  const { prisma, exigirAutenticacao, exigirPapel, obterGrupoIdSessao, idsSaoIguais } = deps;

  app.get("/usuarios-grupos", exigirAutenticacao, exigirPapel("admin"), async (req, res) => {
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

  app.get(
    "/usuarios-grupos/:id",
    exigirAutenticacao,
    exigirPapel("admin"),
    validateSchema({ params: usuarioGrupoIdParamSchema }),
    async (req, res) => {
      try {
        const { id } = req.params;
        const grupoId = obterGrupoIdSessao(req);

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
    }
  );

  app.post(
    "/usuarios-grupos",
    exigirAutenticacao,
    exigirPapel("admin"),
    validateSchema({ body: usuarioGrupoBodySchema }),
    async (req, res) => {
      try {
        const { usuarioId, grupoId, papel } = req.body;
        const grupoIdSessao = obterGrupoIdSessao(req);

        if (!idsSaoIguais(grupoId, grupoIdSessao)) {
          return res.status(403).json({ erro: "Não é permitido criar vínculo em outro grupo" });
        }

        const vinculo = await prisma.usuarioGrupo.create({
          data: {
            usuarioId,
            grupoId,
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
    }
  );

  app.put(
    "/usuarios-grupos/:id",
    exigirAutenticacao,
    exigirPapel("admin"),
    validateSchema({ params: usuarioGrupoIdParamSchema, body: usuarioGrupoBodySchema }),
    async (req, res) => {
      try {
        const { id } = req.params;
        const { usuarioId, grupoId, papel } = req.body;
        const grupoIdSessao = obterGrupoIdSessao(req);

        if (!idsSaoIguais(grupoId, grupoIdSessao)) {
          return res.status(403).json({ erro: "Não é permitido mover vínculo para outro grupo" });
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
            usuarioId,
            grupoId,
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
    }
  );

  app.delete(
    "/usuarios-grupos/:id",
    exigirAutenticacao,
    exigirPapel("admin"),
    validateSchema({ params: usuarioGrupoIdParamSchema }),
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
    }
  );
};
