const { createTestApp, autenticarSessao } = require("./helpers/testApp");
const {
  criarPrismaMock,
  criarSessaoUsuario,
} = require("./helpers/testData");

describe("Autorização por grupo", () => {
  test("adminGrupo não pode editar conta global de outro usuário", async () => {
    const prisma = criarPrismaMock();
    const { app, request } = createTestApp({
      routes: ["usuarios"],
      prisma,
    });

    const agent = request.agent(app);
    await autenticarSessao(
      agent,
      criarSessaoUsuario({
        papel: "adminGrupo",
        statusGrupo: "aceito",
        grupoId: 10,
        grupoAtivoId: 10,
      })
    );

    const response = await agent
      .put("/usuarios/2")
      .send({
        nome: "Novo Nome",
        email: "novo@example.com",
      })
      .expect(403);

    expect(response.body.erro).toMatch(/não pode editar a conta global/i);
  });

  test("membro não pode listar usuários do grupo", async () => {
    const prisma = criarPrismaMock();
    const { app, request } = createTestApp({
      routes: ["usuarios"],
      prisma,
    });

    const agent = request.agent(app);
    await autenticarSessao(
      agent,
      criarSessaoUsuario({
        papel: "membro",
        statusGrupo: "aceito",
      })
    );

    await agent.get("/usuarios").expect(403);
  });

  test("adminGrupo não pode criar vínculo em grupo diferente do grupo ativo", async () => {
    const prisma = criarPrismaMock();
    const { app, request } = createTestApp({
      routes: ["usuariosGrupos"],
      prisma,
    });

    const agent = request.agent(app);
    await autenticarSessao(
      agent,
      criarSessaoUsuario({
        papel: "adminGrupo",
        statusGrupo: "aceito",
        grupoId: 10,
        grupoAtivoId: 10,
      })
    );

    const response = await agent
      .post("/usuarios-grupos")
      .send({
        usuarioId: 2,
        grupoId: 99,
        papel: "membro",
      })
      .expect(403);

    expect(response.body.erro).toBe("Não é permitido criar vínculo em outro grupo");
  });

  test("usuário sem grupo aceito não acessa rota que exige grupo ativo aceito", async () => {
    const prisma = criarPrismaMock();
    const { app, request } = createTestApp({
      routes: ["usuarios"],
      prisma,
    });

    const agent = request.agent(app);
    await autenticarSessao(
      agent,
      criarSessaoUsuario({
        grupoId: null,
        grupoAtivoId: null,
        papel: null,
        statusGrupo: "pendente",
        temGrupoAceito: false,
      })
    );

    await agent.get("/usuarios").expect(403);
  });

  test("adminGrupo vê apenas logs do próprio grupo em /auditoria-logs", async () => {
    const prisma = criarPrismaMock();
    prisma.auditoriaLog.findMany.mockResolvedValue([]);

    const { app, request } = createTestApp({
      routes: ["system"],
      prisma,
    });

    const agent = request.agent(app);
    await autenticarSessao(
      agent,
      criarSessaoUsuario({
        papel: "adminGrupo",
        statusGrupo: "aceito",
        grupoId: 10,
        grupoAtivoId: 10,
      })
    );

    await agent.get("/auditoria-logs").expect(200);

    expect(prisma.auditoriaLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          grupoId: 10,
        }),
      })
    );
  });
});
