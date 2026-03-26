const { createTestApp, autenticarSessao } = require("./helpers/testApp");
const {
  criarPrismaMock,
  criarSessaoUsuario,
  decimalFake,
} = require("./helpers/testData");

describe("Compras", () => {
  test("cria compra, item de compra, estoque do grupo e movimentação", async () => {
    const prisma = criarPrismaMock();

    prisma.$transaction.mockImplementation(async (callback) => {
      const tx = {
        compra: {
          create: jest.fn().mockResolvedValue({ id: 123, grupoId: 10, usuarioId: 1 }),
          findUnique: jest.fn().mockResolvedValue({
            id: 123,
            grupoId: 10,
            usuarioId: 1,
            usuario: {
              id: 1,
              nome: "Will",
              email: "will@example.com",
            },
            compraItens: [
              {
                id: 500,
                compraId: 123,
                itemId: 30,
                nomeItem: "Arroz",
                quantidade: decimalFake(2),
                unidade: "un",
                valorUnitario: "10.37",
                item: {
                  id: 30,
                  nome: "Arroz",
                  unidadePadrao: "un",
                  categoria: {
                    id: 7,
                    nome: "Mercearia",
                  },
                },
              },
            ],
          }),
        },
        categoria: {
          findFirst: jest.fn().mockResolvedValue({ id: 7, nome: "Mercearia" }),
          create: jest.fn(),
        },
        item: {
          findUnique: jest.fn().mockResolvedValue(null),
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({
            id: 30,
            nome: "Arroz",
            unidadePadrao: "un",
            categoria: {
              id: 7,
              nome: "Mercearia",
            },
          }),
        },
        compraItem: {
          create: jest.fn().mockResolvedValue({ id: 500 }),
        },
        grupoItem: {
          findUnique: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({
            id: 700,
            grupoId: 10,
            itemId: 30,
            quantidade: decimalFake(2),
            comprar: false,
          }),
          update: jest.fn(),
        },
        movimentacaoEstoque: {
          create: jest.fn().mockResolvedValue({ id: 900 }),
        },
      };

      const resultado = await callback(tx);

      expect(tx.compra.create).toHaveBeenCalled();
      expect(tx.compraItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            compraId: 123,
            itemId: 30,
            valorUnitario: "10.37",
          }),
        })
      );
      expect(tx.grupoItem.create).toHaveBeenCalled();
      expect(tx.movimentacaoEstoque.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            grupoId: 10,
            usuarioId: 1,
            tipo: "entrada_compra",
          }),
        })
      );

      return resultado;
    });

    const { app, request } = createTestApp({
      routes: ["compras"],
      prisma,
    });

    const agent = request.agent(app);
    await autenticarSessao(agent, criarSessaoUsuario());

    const response = await agent
      .post("/compras")
      .send({
        itens: [
          {
            itemId: null,
            nome: "Arroz",
            unidade: "un",
            categoria: "Mercearia",
            quantidade: 2,
            valorUnitarioCentavos: 1037,
          },
        ],
      })
      .expect(201);

    expect(response.body.id).toBe(123);
    expect(response.body.compraItens).toHaveLength(1);
    expect(response.body.compraItens[0].valorUnitario).toBe("10.37");
    expect(response.body.compraItens[0].valorUnitarioCentavos).toBe(1037);
    expect(response.body.compraItens[0].subtotalCentavos).toBe(2074);
  });

  test("bloqueia criação de compra quando a sessão não tem grupo ativo válido", async () => {
    const prisma = criarPrismaMock();

    const { app, request } = createTestApp({
      routes: ["compras"],
      prisma,
    });

    const agent = request.agent(app);
    await autenticarSessao(
      agent,
      criarSessaoUsuario({
        grupoId: null,
        grupoAtivoId: null,
      })
    );

    const response = await agent
      .post("/compras")
      .send({
        itens: [
          {
            itemId: null,
            nome: "Arroz",
            unidade: "un",
            categoria: "Mercearia",
            quantidade: 1,
            valorUnitarioCentavos: 500,
          },
        ],
      })
      .expect(400);

    expect(response.body.erro).toBe("grupoId da sessão inválido");
  });
});
