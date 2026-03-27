const { createTestApp, autenticarSessao } = require("./helpers/testApp");
const { criarPrismaMock, criarSessaoUsuario, criarUsuarioSessaoService } = require("./helpers/testData");

describe("Sessão", () => {
  test("retorna 401 ao consultar sessão sem autenticação", async () => {
    const prisma = criarPrismaMock();
    const { app, request } = createTestApp({ routes: ["auth"], prisma });
    await request(app).get("/sessao").expect(401);
  });

  test("recarrega a sessão atual ao consultar /sessao", async () => {
    const prisma = criarPrismaMock();
    prisma.usuario.findUnique.mockResolvedValue(
      criarUsuarioSessaoService({
        id: 1,
        grupoAtivoId: 10,
        papelGlobal: "usuario",
      })
    );

    const { app, request } = createTestApp({ routes: ["auth"], prisma });
    const agent = request.agent(app);
    await autenticarSessao(agent, criarSessaoUsuario());

    const response = await agent.get("/sessao").expect(200);

    expect(prisma.usuario.findUnique).toHaveBeenCalled();
    expect(response.body.usuario.id).toBe(1);
    expect(response.body.usuario.grupoAtivoId).toBe(10);
  });

  test("não mantém grupoAtivoId antigo quando ele não corresponde mais a vínculo aceito válido", async () => {
    const prisma = criarPrismaMock();
    prisma.usuario.findUnique.mockResolvedValue(
      criarUsuarioSessaoService({
        grupoAtivoId: 999,
        usuariosGrupos: [
          {
            id: 100,
            grupoId: 10,
            papel: "adminGrupo",
            status: "aceito",
            solicitadoEm: null,
            aprovadoEm: "2026-03-25T10:00:00.000Z",
            aprovadoPorEmail: "will@example.com",
            removidoEm: null,
            canceladoEm: null,
            criadoEm: "2026-03-25T10:00:00.000Z",
            grupo: {
              id: 10,
              nome: "Grupo Alpha",
              codigo: "ALPHA10",
              desativadoEm: null,
              excluidoEm: null,
            },
          },
          {
            id: 101,
            grupoId: 20,
            papel: "membro",
            status: "aceito",
            solicitadoEm: null,
            aprovadoEm: "2026-03-25T10:00:00.000Z",
            aprovadoPorEmail: "will@example.com",
            removidoEm: null,
            canceladoEm: null,
            criadoEm: "2026-03-25T10:00:00.000Z",
            grupo: {
              id: 20,
              nome: "Grupo Beta",
              codigo: "BETA20",
              desativadoEm: null,
              excluidoEm: null,
            },
          },
        ],
      })
    );

    const { app, request } = createTestApp({ routes: ["auth"], prisma });
    const agent = request.agent(app);
    await autenticarSessao(agent, criarSessaoUsuario());

    const response = await agent.get("/sessao").expect(200);

    expect(response.body.usuario.grupoAtivoId).toBeNull();
    expect(response.body.usuario.precisaSelecionarGrupo).toBe(true);
  });

  test("permite selecionar grupo ativo apenas quando o vínculo é aceito", async () => {
    const prisma = criarPrismaMock();

    prisma.usuarioGrupo.findFirst.mockResolvedValue({
      id: 200,
      usuarioId: 1,
      grupoId: 20,
      papel: "membro",
      status: "aceito",
      excluidoEm: null,
      grupo: {
        id: 20,
        nome: "Grupo Beta",
        codigo: "BETA20",
        excluidoEm: null,
        desativadoEm: null,
      },
    });

    prisma.usuario.update.mockResolvedValue({ id: 1, grupoAtivoId: 20 });
    prisma.usuario.findMany = jest.fn();
    prisma.usuarioGrupo.findMany.mockResolvedValue([
      {
        grupoId: 20,
      },
    ]);

    prisma.usuario.findUnique
      .mockResolvedValueOnce({ grupoAtivoId: 20 })
      .mockResolvedValueOnce(
        criarUsuarioSessaoService({
          grupoAtivoId: 20,
          papelGlobal: "usuario",
          usuariosGrupos: [
            {
              id: 200,
              grupoId: 20,
              papel: "membro",
              status: "aceito",
              solicitadoEm: null,
              aprovadoEm: "2026-03-25T10:00:00.000Z",
              aprovadoPorEmail: "will@example.com",
              removidoEm: null,
              canceladoEm: null,
              criadoEm: "2026-03-25T10:00:00.000Z",
              grupo: {
                id: 20,
                nome: "Grupo Beta",
                codigo: "BETA20",
                desativadoEm: null,
                excluidoEm: null,
              },
            },
          ],
        })
      );

    const { app, request } = createTestApp({ routes: ["auth"], prisma });
    const agent = request.agent(app);
    await autenticarSessao(agent, criarSessaoUsuario());

    const response = await agent
      .post("/meu-perfil/grupo-ativo")
      .send({ grupoId: 20 })
      .expect(200);

    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { grupoAtivoId: 20 },
    });
    expect(response.body.usuario.grupoAtivoId).toBe(20);
  });

  test("bloqueia seleção de grupo ativo quando o vínculo não é aceito", async () => {
    const prisma = criarPrismaMock();
    prisma.usuarioGrupo.findFirst.mockResolvedValue(null);

    const { app, request } = createTestApp({ routes: ["auth"], prisma });
    const agent = request.agent(app);
    await autenticarSessao(agent, criarSessaoUsuario());

    const response = await agent
      .post("/meu-perfil/grupo-ativo")
      .send({ grupoId: 99 })
      .expect(403);

    expect(response.body.erro).toBe("Você só pode selecionar vínculos aceitos");
  });
});
