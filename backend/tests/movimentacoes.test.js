const { createTestApp, autenticarSessao } = require("./helpers/testApp");
const {
  criarPrismaMock,
  criarSessaoUsuario,
  decimalFake,
} = require("./helpers/testData");

describe("Movimentações de estoque", () => {
  test("lista movimentações do grupo ativo e normaliza quantidade decimal", async () => {
    const prisma = criarPrismaMock();

    prisma.movimentacaoEstoque.findMany.mockResolvedValue([
      {
        id: 1,
        grupoId: 10,
        itemId: 30,
        usuarioId: 1,
        tipo: "entrada_compra",
        quantidade: decimalFake(3),
        motivo: "Compra #123",
        criadoEm: "2026-03-25T10:00:00.000Z",
        item: {
          id: 30,
          nome: "Arroz",
          categoria: { id: 7, nome: "Mercearia" },
        },
        usuario: {
          id: 1,
          nome: "Will",
          sobrenome: "Borges",
          email: "will@example.com",
        },
        grupo: {
          id: 10,
          nome: "Grupo Alpha",
          codigo: "ALPHA10",
        },
      },
    ]);

    const { app, request } = createTestApp({
      routes: ["compras"],
      prisma,
    });

    const agent = request.agent(app);
    await autenticarSessao(agent, criarSessaoUsuario());

    const response = await agent.get("/movimentacoes-estoque").expect(200);

    expect(prisma.movimentacaoEstoque.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { grupoId: 10 },
      })
    );
    expect(response.body).toHaveLength(1);
    expect(response.body[0].quantidade).toBe(3);
    expect(response.body[0].tipo).toBe("entrada_compra");
  });

  test("exige autenticação para consultar movimentações", async () => {
    const prisma = criarPrismaMock();

    const { app, request } = createTestApp({
      routes: ["compras"],
      prisma,
    });

    await request(app).get("/movimentacoes-estoque").expect(401);
  });
});
