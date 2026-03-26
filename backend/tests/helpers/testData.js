function decimalFake(valor) {
  const numero = Number(valor);

  return {
    value: numero,
    plus(adicional) {
      return numero + Number(adicional);
    },
    toString() {
      return String(numero);
    },
    valueOf() {
      return numero;
    },
  };
}

function criarSessaoUsuario(overrides = {}) {
  return {
    id: 1,
    nome: "Will",
    sobrenome: "Borges",
    nomeCompleto: "Will Borges",
    email: "will@example.com",
    papelGlobal: "usuario",
    adminSistema: false,
    ativo: true,
    desativadoEm: null,
    excluidoEm: null,
    grupoId: 10,
    grupoAtivoId: 10,
    grupoNome: "Grupo Alpha",
    grupoCodigo: "ALPHA10",
    papel: "adminGrupo",
    statusGrupo: "aceito",
    temGrupoAceito: true,
    quantidadeGruposAceitos: 1,
    quantidadeVinculosRelevantes: 1,
    precisaSelecionarGrupo: false,
    podeAcessarPainelSistema: false,
    vinculos: [
      {
        id: 100,
        grupoId: 10,
        grupoNome: "Grupo Alpha",
        grupoCodigo: "ALPHA10",
        papel: "adminGrupo",
        status: "aceito",
        solicitadoEm: null,
        aprovadoEm: "2026-03-25T10:00:00.000Z",
        removidoEm: null,
        canceladoEm: null,
      },
    ],
    ...overrides,
  };
}

function criarUsuarioSessaoService(overrides = {}) {
  return {
    id: 1,
    nome: "Will",
    sobrenome: "Borges",
    email: "will@example.com",
    papelGlobal: "usuario",
    grupoAtivoId: 10,
    ativo: true,
    desativadoEm: null,
    excluidoEm: null,
    usuariosGrupos: [
      {
        id: 100,
        grupoId: 10,
        papel: "adminGrupo",
        status: "aceito",
        solicitadoEm: null,
        aprovadoEm: "2026-03-25T10:00:00.000Z",
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
    ],
    ...overrides,
  };
}

function criarPrismaMock() {
  return {
    usuario: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    usuarioGrupo: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    grupo: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    item: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
    categoria: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    grupoItem: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    compra: {
      findMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    compraItem: {
      create: jest.fn(),
    },
    movimentacaoEstoque: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    auditoriaLog: {
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
}

module.exports = {
  decimalFake,
  criarSessaoUsuario,
  criarUsuarioSessaoService,
  criarPrismaMock,
};
