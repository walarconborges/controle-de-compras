const { createTestApp, autenticarSessao } = require("./helpers/testApp");
const { criarPrismaMock, criarSessaoUsuario, criarUsuarioSessaoService } = require("./helpers/testData");

describe("Autenticação", () => {
  test("faz login com credenciais válidas e monta a sessão", async () => {
    const prisma = criarPrismaMock();
    const bcryptMock = {
      compare: jest.fn().mockResolvedValue(true),
      hash: jest.fn(),
    };

    prisma.usuario.findUnique
      .mockResolvedValueOnce({
        id: 1,
        senhaHash: "hash-correta",
        ativo: true,
        desativadoEm: null,
        excluidoEm: null,
      })
      .mockResolvedValueOnce(
        criarUsuarioSessaoService({
          id: 1,
          email: "will@example.com",
          papelGlobal: "usuario",
        })
      );

    const { app, request } = createTestApp({
      routes: ["auth"],
      prisma,
      bcryptMock,
    });

    const response = await request(app)
      .post("/login")
      .send({ email: "will@example.com", senha: "123456" })
      .expect(200);

    expect(bcryptMock.compare).toHaveBeenCalledWith("123456", "hash-correta");
    expect(response.body.mensagem).toBe("Login realizado com sucesso");
    expect(response.body.usuario.email).toBe("will@example.com");
    expect(response.body.usuario.temGrupoAceito).toBe(true);
  });

  test("nega login com senha inválida", async () => {
    const prisma = criarPrismaMock();
    const bcryptMock = { compare: jest.fn().mockResolvedValue(false), hash: jest.fn() };

    prisma.usuario.findUnique.mockResolvedValue({
      id: 1,
      senhaHash: "hash-correta",
      ativo: true,
      desativadoEm: null,
      excluidoEm: null,
    });

    const { app, request } = createTestApp({ routes: ["auth"], prisma, bcryptMock });

    const response = await request(app)
      .post("/login")
      .send({ email: "will@example.com", senha: "errada" })
      .expect(401);

    expect(response.body.erro).toBe("Credenciais inválidas");
  });

  test("nega login de usuário inativo", async () => {
    const prisma = criarPrismaMock();
    const bcryptMock = { compare: jest.fn(), hash: jest.fn() };

    prisma.usuario.findUnique.mockResolvedValue({
      id: 1,
      senhaHash: "qualquer",
      ativo: false,
      desativadoEm: "2026-03-25T10:00:00.000Z",
      excluidoEm: null,
    });

    const { app, request } = createTestApp({ routes: ["auth"], prisma, bcryptMock });

    const response = await request(app)
      .post("/login")
      .send({ email: "will@example.com", senha: "123456" })
      .expect(403);

    expect(response.body.erro).toBe("Usuário inativo");
  });

  test("faz logout e invalida a sessão atual", async () => {
    const prisma = criarPrismaMock();
    prisma.usuario.findUnique.mockResolvedValue(criarUsuarioSessaoService());

    const { app, request } = createTestApp({ routes: ["auth"], prisma });

    const agent = request.agent(app);
    await autenticarSessao(agent, criarSessaoUsuario());

    await agent.get("/sessao").expect(200);
    await agent.post("/logout").expect(200);
    await agent.get("/sessao").expect(401);
  });
});
