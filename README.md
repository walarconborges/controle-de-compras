# controle-de-compras

Relatório técnico do sistema “controle-de-compras”

1. Visão geral

O sistema é uma aplicação web full stack de controle de compras, lista de reposição e estoque por grupo. A arquitetura é monolítica no backend e desacoplada no frontend. O cliente é composto por páginas HTML/CSS/JS estáticas servidas pelo próprio servidor. O backend expõe uma API REST em Express. A persistência é feita em PostgreSQL com Prisma ORM. A autenticação é baseada em sessão HTTP persistida no banco.

Em termos funcionais, o sistema resolve quatro problemas principais:

1. cadastro e autenticação de usuários;

2. organização de usuários em grupos;

3. gestão da lista de compras e do estoque do grupo;

4. rastreabilidade por meio de movimentações e logs de auditoria.

5. Arquitetura da solução

A solução está dividida em três camadas principais:

Frontend
Arquivos em public/
Responsável por renderização da interface, coleta de entrada do usuário, chamadas HTTP via fetch e controle de fluxo de navegação.

Backend
Arquivos em backend/
Responsável por regras de negócio, autenticação, autorização, validação, auditoria, logging, integração com banco e exposição de endpoints REST.

Banco de dados
Modelado em prisma/schema.prisma
Responsável por persistir usuários, grupos, vínculos, itens, categorias, estoque, compras, movimentações e auditoria.

Tecnicamente, é um monólito modular. Não há microsserviços. A separação é por responsabilidade de módulo e por arquivo de rota.

3. Stack tecnológica

Backend:

* Node.js
* Express 5
* Prisma ORM
* PostgreSQL
* express-session
* connect-pg-simple
* bcrypt
* zod
* express-rate-limit

Frontend:

* HTML estático
* CSS
* JavaScript modular ES Modules
* Fetch API

Testes:

* Jest
* Supertest

4. Modelo de domínio

O sistema usa um modelo relacional consistente. As entidades centrais são:

Usuario
Representa a conta global do usuário. Armazena nome, sobrenome, email, hash de senha, papel global, status de ativação e grupo ativo.

Grupo
Representa a unidade lógica de trabalho. Cada grupo possui nome e código único.

UsuarioGrupo
É a tabela de vínculo entre usuário e grupo. Define papel dentro do grupo e status do vínculo. Isso implementa controle de acesso contextual por grupo.

Categoria
Representa a classificação global dos itens.

Item
Representa o catálogo global de itens. Um item pertence a uma categoria e possui unidade padrão.

GrupoItem
É a materialização do item dentro de um grupo. Armazena quantidade atual em estoque e flag comprar. Essa tabela é a base real da lista de compras e do estoque do grupo.

Compra
Cabeçalho da operação de compra realizada por um usuário em um grupo.

CompraItem
Itens lançados dentro de uma compra, com quantidade, unidade e valor unitário.

MovimentacaoEstoque
Registro de entrada ou saída de estoque. Hoje o fluxo implementado está centrado em entrada por compra.

AuditoriaLog
Registro transversal de auditoria das operações relevantes do sistema.

5. Conceito central de funcionamento

A lógica do sistema gira em torno de três eixos:

Conta global
O usuário existe uma única vez na base.

Vínculo por grupo
O mesmo usuário pode ter relação com um ou vários grupos, com papel e status próprios em cada vínculo.

Grupo ativo na sessão
Mesmo que o usuário tenha múltiplos vínculos, a sessão opera sobre um grupo ativo. Quase todas as operações de negócio usam esse grupoId da sessão como escopo de isolamento.

Esse desenho evita mistura de dados entre grupos e implementa multi-tenant lógico no nível da aplicação.

6. Fluxo de autenticação e sessão

O fluxo de autenticação é baseado em sessão de servidor, não em JWT.

6.1 Cadastro
Endpoint: POST /cadastro

O usuário informa nome, sobrenome, email, senha e nome do grupo.

Regras:

* a senha é armazenada como hash com bcrypt;
* se o grupo não existir, ele é criado automaticamente;
* quem cria um grupo novo já entra como adminGrupo e com vínculo aceito;
* se o grupo já existir, o usuário entra com vínculo pendente aguardando aprovação;
* após o cadastro, a sessão já é montada.

6.2 Login
Endpoint: POST /login

O backend:

* normaliza email e senha;
* localiza o usuário;
* compara a senha com bcrypt;
* reconstrói a sessão a partir do banco;
* grava req.session.usuario.

6.3 Sessão
Endpoint: GET /sessao

Retorna o retrato operacional da sessão. Esse objeto contém:

* identidade do usuário;
* papel global;
* grupo ativo;
* papel no grupo;
* status do vínculo;
* indicadores de múltiplos vínculos;
* lista de vínculos relevantes.

6.4 Logout
Endpoint: POST /logout

Encerra a sessão armazenada no PostgreSQL e remove o cookie.

7. Persistência de sessão

A sessão não fica só em memória. Ela é armazenada em tabela PostgreSQL via connect-pg-simple. Isso traz três vantagens:

* continuidade entre reinícios do servidor;
* compatibilidade com deploy real;
* rastreabilidade e controle mais robusto do estado autenticado.

O cookie é configurado com:

* httpOnly
* sameSite=lax
* secure em produção
* maxAge de 24 horas

8. Regra de grupo ativo

Essa é uma das regras mais importantes do sistema.

O backend recalcula o grupo ativo do usuário com base nos vínculos aceitos:

* se o grupo ativo persistido ainda for válido, ele é mantido;
* se houver apenas um vínculo aceito válido, ele é selecionado automaticamente;
* se houver mais de um vínculo aceito e o salvo estiver inválido, o grupo ativo é zerado;
* se não houver vínculo aceito válido, o grupo ativo é nulo.

Isso impede que a sessão opere com um grupo inconsistente ou já removido.

9. Controle de acesso

O sistema implementa autenticação e autorização em middleware.

Principais middlewares:

* exigirAutenticacao
* exigirPapel
* exigirAdminSistema
* exigirGrupoAtivoAceito

Há dois níveis de papel:

Papel global
Exemplo: adminSistema

Papel contextual no grupo
Exemplo: adminGrupo, membro

Na prática:

* adminSistema enxerga e administra o sistema inteiro;
* adminGrupo administra apenas o grupo ativo;
* membro usa funções operacionais do próprio grupo.

O grupoId da sessão é o principal filtro de isolamento de dados.

10. Backend e organização das rotas

As rotas estão modularizadas por domínio.

authRoutes.js
Responsável por:

* cadastro
* login
* sessão
* perfil
* seleção de grupo ativo
* membros do meu grupo
* solicitações
* convites
* aceitar/recusar vínculos
* sair do grupo
* logout

grupoItemRoutes.js
Responsável por:

* listar itens do grupo
* listar itens marcados para compra
* criar item no grupo
* marcar/desmarcar comprar
* atualizar quantidade
* excluir item do grupo

compraRoutes.js
Responsável por:

* listar compras do grupo
* registrar compra
* listar movimentações de estoque

systemRoutes.js
Responsável por:

* healthcheck
* logs de auditoria
* painel do sistema
* resumo administrativo
* pendências
* aprovar/recusar vínculos
* listagens administrativas

usuarioRoutes.js, grupoRoutes.js, usuarioGrupoRoutes.js, categoriaItemRoutes.js
Responsáveis por CRUD administrativo e manutenção das entidades-base.

11. Fluxo funcional por tela

11.1 index.html
Tela de login e cadastro.

Funções principais:

* validação client-side;
* busca de sugestões de grupo;
* login;
* cadastro;
* redirecionamento baseado no estado da sessão.

O frontend chama /login e /cadastro usando api.js.

11.2 homepage.html
É a landing page autenticada. Só é acessível se a sessão tiver grupo aceito e grupo ativo válido.

11.3 perfil.html
É uma tela estratégica do sistema. Ela centraliza:

* dados do usuário;
* vínculos com grupos;
* troca de grupo ativo;
* convites recebidos;
* solicitações pendentes;
* gerenciamento de membros;
* convite de novos usuários;
* saída do grupo.

Essa tela resolve a governança de acesso por grupo.

11.4 lista.html
Opera a lista de compras do grupo. A base usada é grupo_itens.
Cada item pode ser marcado com comprar=true, o que o transforma em candidato a compra futura.

11.5 estoque.html
Opera o estoque do grupo. Também usa grupo_itens.
A diferença entre lista e estoque é a perspectiva funcional da mesma base.

11.6 compra.html
Materializa a compra. Ao concluir:

* cria a entidade Compra;
* cria os registros CompraItem;
* cria ou atualiza GrupoItem;
* soma a quantidade ao estoque;
* zera a flag comprar daquele item;
* registra MovimentacaoEstoque do tipo entrada_compra.

Esse é o fluxo transacional mais importante do sistema.

11.7 consumo.html
Usa compras e movimentações para análise histórica e cálculo operacional. Pelo código atual, a base está preparada especialmente para leitura de entradas de estoque. O fluxo de saída/consumo ainda parece parcial em termos de backend de negócio.

11.8 painel-sistema.html
Painel restrito ao adminSistema.
Permite visão global de usuários, grupos, pendências e logs.

12. Fluxo de compra e atualização de estoque

Esse é o núcleo do sistema.

Ao enviar POST /compras:

1. o backend obtém grupoId da sessão;
2. identifica usuarioId da sessão;
3. valida os itens recebidos;
4. inicia transação no Prisma;
5. cria o cabeçalho da compra;
6. para cada item:

   * encontra ou cria a categoria;
   * encontra ou cria o item global;
   * cria o compraItem;
   * encontra ou cria o grupoItem;
   * incrementa a quantidade em estoque;
   * define comprar = false;
   * grava movimentação de estoque como entrada_compra;
7. retorna a compra já normalizada para o frontend.

Esse fluxo é corretamente transacional. Se uma etapa falhar, a operação inteira pode ser revertida.

13. Estratégia de dados: catálogo global + estoque por grupo

O sistema separa dois conceitos que muita aplicação mistura de forma incorreta:

Catálogo global
Categoria e Item

Estado operacional por grupo
GrupoItem

Essa separação é tecnicamente boa porque:

* evita duplicação de catálogo;
* permite reuso de itens entre grupos;
* mantém estoque isolado por grupo;
* facilita auditoria e estatística.

14. Validação de dados

A validação é centralizada com Zod e middleware validateSchema.

Isso reduz:

* payload inválido;
* tipagem frouxa;
* inconsistência entre frontend e backend.

Além disso, há normalizadores utilitários para:

* texto
* email
* unidade
* decimal
* boolean
* nomes de grupo
* serialização de resposta

Isso mostra preocupação com higiene de dados.

15. Segurança aplicada

O sistema aplica medidas corretas para o porte atual:

* senha com hash bcrypt;
* sessão HTTP-only;
* rate limit em login e cadastro;
* CORS com lista branca de origens;
* autorização por papel;
* isolamento por grupo ativo;
* validação de payload;
* tratamento centralizado de erro;
* logs de requisição;
* auditoria de ações.

Ponto importante: a aplicação usa sessão stateful no servidor. Isso reduz exposição típica de tokens mal gerenciados no frontend.

16. Observabilidade e auditoria

Há duas frentes distintas:

Request logging
Middleware de log para rastrear requisições.

Auditoria funcional
Tabela auditoria_logs com:

* entidade
* ação
* autor
* grupo
* item
* metadados
* status HTTP
* timestamp

Isso é relevante para trilha de auditoria, suporte e análise de incidente.

17. Tratamento de erros

O projeto possui middleware central de erro e handler de rota não encontrada.
Isso padroniza resposta JSON para falhas e evita espalhar try/catch desorganizado sem critério de retorno.

18. Testes automatizados

Há suíte com Jest e Supertest.

Os testes cobrem pelo menos:

* autenticação;
* autorização por grupo;
* compras;
* movimentações;
* sessão.

Isso é importante porque valida o comportamento crítico do sistema:

* criação de compra;
* atualização do estoque;
* geração de movimentação;
* bloqueio de acesso indevido;
* filtragem por grupo.

19. Qualidade do desenho técnico

Pontos fortes:

* bom modelo de domínio;
* separação correta entre catálogo global e estoque por grupo;
* controle de sessão consistente;
* regra clara de grupo ativo;
* transação nas compras;
* auditoria e logging;
* testes de fluxos críticos;
* backend modular.

20. Limitações e pontos de atenção

Objetivamente, estes são os pontos que ainda merecem evolução:

1. Arquitetura ainda é monolítica
   É adequada ao escopo atual, mas pode crescer em complexidade operacional conforme o volume de regras aumentar.

2. Frontend sem framework
   Funciona, mas a manutenção tende a ficar mais custosa com o aumento da interface e do estado da aplicação.

3. Consumo/saída de estoque ainda parece incompleto
   O backend está muito bem preparado para entrada por compra. O fluxo simétrico de saída ainda não aparece com a mesma robustez transacional.

4. Categoria e item globais exigem governança
   Como são compartilhados por todos os grupos, é preciso controlar bem nomenclatura e lifecycle para evitar catálogo poluído.

5. Algumas permissões merecem revisão fina
   Exemplo: em categoriaItemRoutes há uso de exigirPapel("admin"), enquanto o restante do projeto trabalha com adminGrupo e adminSistema. Isso pode ser apenas compatibilidade intencional, mas é um ponto que exige checagem para evitar inconsistência semântica.

----------------------------------------------------

Sim. Segue a reformulação nas condições definidas.

Tutorial técnico-didático para criar um sistema web de controle de compras, estoque e grupos

1. Ponto de partida

O projeto é uma aplicação web full stack para controle de compras, estoque e organização por grupos. A estrutura central não é a tela. A estrutura central é a regra de negócio. O sistema precisa saber quem acessa, em qual grupo a pessoa está operando, quais itens pertencem ao grupo, o que precisa ser comprado, o que já foi comprado e como o estoque foi alterado.

A construção correta parte desta sequência: levantamento dos requisitos, definição da arquitetura, modelagem do banco, criação do backend, criação do frontend, integração, testes e ajuste final. Essa ordem reduz retrabalho e evita falhas de estrutura.

2. Etapa inicial: definição dos requisitos

Antes do primeiro arquivo, é necessário definir o que o sistema faz e como ele deve se comportar.

Requisitos funcionais essenciais:

* cadastrar usuário;
* autenticar usuário com login e senha;
* criar grupo ou solicitar entrada em grupo existente;
* manter um grupo ativo por sessão;
* cadastrar categorias e itens;
* associar item ao grupo;
* marcar item para compra;
* registrar compra;
* atualizar estoque;
* listar compras;
* listar movimentações de estoque;
* gerenciar membros e convites;
* restringir acesso conforme papel.

Requisitos não funcionais essenciais:

* autenticação segura com senha criptografada;
* sessão persistida no servidor;
* isolamento de dados por grupo;
* validação de entrada de dados;
* integridade transacional no registro de compras;
* auditoria de ações relevantes;
* organização modular do código;
* facilidade de manutenção;
* cobertura mínima de testes dos fluxos críticos.

Sem essa definição, a implementação tende a produzir páginas funcionais, mas um sistema inconsistente.

3. Escolha da arquitetura

A arquitetura adequada para este projeto é monolítica modular. Isso significa uma única aplicação com divisão interna por responsabilidade. Não há necessidade de microsserviços neste escopo.

A composição fica assim:

* frontend estático em HTML, CSS e JavaScript;
* backend em Node.js com Express;
* banco de dados relacional PostgreSQL;
* ORM Prisma;
* autenticação com sessão;
* API REST para comunicação entre frontend e backend.

Esse desenho atende ao projeto quase fielmente e é suficiente para uso real.

4. Escolha das tecnologias

Tecnologias principais:

* Node.js para execução do backend;
* Express para criação da API e serviço HTTP;
* PostgreSQL para persistência relacional;
* Prisma para acesso ao banco e migrações;
* express-session para autenticação stateful;
* connect-pg-simple para armazenar sessão no PostgreSQL;
* bcrypt para hash de senha;
* Zod para validação;
* Jest e Supertest para testes.

Essas escolhas fazem sentido porque o sistema possui relacionamento entre entidades, autenticação real, operações multiusuário, necessidade de rastreabilidade e fluxo transacional.

5. Qual banco de dados usar

O banco adequado é PostgreSQL.

Justificativa técnica:

* suporta relacionamentos complexos com integridade referencial;
* trabalha bem com Prisma;
* lida corretamente com tabelas como usuários, grupos, itens, compras e movimentações;
* é mais adequado que armazenamento local, arquivos JSON ou planilhas quando há múltiplos usuários e regras de acesso.

O banco não deve ser substituído por localStorage. LocalStorage serve apenas para prototipação simples de interface e não para persistência de negócio.

6. O que criar primeiro

A primeira construção real deve ser o modelo de dados. A segunda, o backend mínimo com sessão. A terceira, as regras de autorização. Só depois vêm as telas.

Ordem recomendada:

1. estrutura de pastas;

2. package.json e dependências;

3. .env;

4. schema.prisma;

5. migrações;

6. servidor Express;

7. sessão e autenticação;

8. entidades de grupo e vínculo;

9. CRUD de itens do grupo;

10. compras e movimentações;

11. frontend;

12. testes;

13. auditoria e refinamentos.

14. Organização dos arquivos

A organização de pastas deve separar backend, banco, frontend e testes.

Estrutura recomendada, alinhada ao projeto:

```txt
controle-de-compras/
├─ backend/
│  ├─ middlewares/
│  │  ├─ authMiddleware.js
│  │  ├─ errorMiddleware.js
│  │  ├─ rateLimitMiddleware.js
│  │  ├─ requestLoggerMiddleware.js
│  │  └─ validateSchema.js
│  ├─ routes/
│  │  ├─ authRoutes.js
│  │  ├─ categoriaItemRoutes.js
│  │  ├─ compraRoutes.js
│  │  ├─ diagnosticRoutes.js
│  │  ├─ grupoItemRoutes.js
│  │  ├─ grupoRoutes.js
│  │  ├─ systemRoutes.js
│  │  ├─ usuarioGrupoRoutes.js
│  │  └─ usuarioRoutes.js
│  ├─ services/
│  │  └─ sessionService.js
│  ├─ utils/
│  │  ├─ audit.js
│  │  ├─ errorUtils.js
│  │  ├─ logger.js
│  │  ├─ money.js
│  │  ├─ normalizers.js
│  │  └─ queryFilters.js
│  ├─ validators/
│  │  ├─ authSchemas.js
│  │  ├─ categoriaItemSchemas.js
│  │  ├─ commonSchemas.js
│  │  ├─ compraSchemas.js
│  │  ├─ grupoItemSchemas.js
│  │  ├─ grupoSchemas.js
│  │  ├─ usuarioGrupoSchemas.js
│  │  └─ usuarioSchemas.js
│  ├─ tests/
│  │  ├─ helpers/
│  │  ├─ auth.test.js
│  │  ├─ autorizacao-grupo.test.js
│  │  ├─ compras.test.js
│  │  ├─ movimentacoes.test.js
│  │  └─ sessao.test.js
│  └─ server.js
├─ prisma/
│  ├─ migrations/
│  └─ schema.prisma
├─ public/
│  ├─ js/
│  ├─ index.html
│  ├─ homepage.html
│  ├─ lista.html
│  ├─ estoque.html
│  ├─ compra.html
│  ├─ consumo.html
│  ├─ perfil.html
│  └─ painel-sistema.html
├─ package.json
└─ .env
```

Essa estrutura facilita manutenção, separa responsabilidades e acompanha o modelo real do projeto.

8. Inicialização do projeto

Comandos principais:

```bash
npm init -y
npm install express @prisma/client prisma pg bcrypt express-session connect-pg-simple zod cors dotenv express-rate-limit
npm install -D nodemon jest supertest
npx prisma init
```

Scripts mínimos no package.json:

```json
{
  "scripts": {
    "dev": "nodemon backend/server.js",
    "start": "node backend/server.js",
    "test": "jest --runInBand",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev"
  }
}
```

Arquivo .env:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/controle_compras"
SESSION_SECRET="chave_segura"
PORT=3001
NODE_ENV=development
```

9. Modelagem do banco de dados

A modelagem é a base do sistema. As entidades principais são estas:

Usuario
Conta global do sistema. Armazena nome, sobrenome, email, senha, papel global, grupo ativo e status.

Grupo
Unidade lógica de operação. Cada grupo possui nome e código.

UsuarioGrupo
Tabela de vínculo entre usuário e grupo. Define papel no grupo e status do vínculo.

Categoria
Classificação global dos itens.

Item
Catálogo global de itens.

GrupoItem
Representa um item dentro de um grupo específico. Armazena quantidade em estoque e a flag comprar.

Compra
Registro principal de uma compra.

CompraItem
Itens lançados dentro da compra.

MovimentacaoEstoque
Rastreia entrada ou saída de estoque.

AuditoriaLog
Registra ações administrativas ou sensíveis.

Esse desenho tem uma decisão importante: catálogo global separado do estoque por grupo. Isso evita duplicação desnecessária e mantém isolamento operacional.

Trecho sintético do schema:

```prisma
model Usuario {
  id           Int      @id @default(autoincrement())
  nome         String
  sobrenome    String   @default("")
  email        String   @unique
  senhaHash    String   @map("senha_hash")
  papelGlobal  String   @default("usuario") @map("papel_global")
  grupoAtivoId Int?     @map("grupo_ativo_id")
  ativo        Boolean  @default(true)
}

model Grupo {
  id     Int    @id @default(autoincrement())
  nome   String @unique
  codigo String @unique
}

model UsuarioGrupo {
  id        Int    @id @default(autoincrement())
  usuarioId Int    @map("usuario_id")
  grupoId   Int    @map("grupo_id")
  papel     String @default("membro")
  status    String @default("pendente")

  @@unique([usuarioId, grupoId])
}

model GrupoItem {
  id         Int      @id @default(autoincrement())
  grupoId    Int      @map("grupo_id")
  itemId     Int      @map("item_id")
  quantidade Decimal  @default(0) @db.Decimal(10, 2)
  comprar    Boolean  @default(false)

  @@unique([grupoId, itemId])
}
```

Após o schema:

```bash
npx prisma generate
npx prisma migrate dev --name init
```

10. Decisão dos papéis

Os papéis devem ser poucos, claros e diretamente ligados ao fluxo real.

Nível global:

* usuario
* adminSistema

Nível de grupo:

* membro
* adminGrupo

Sentido prático:

* usuario: conta comum;
* adminSistema: administração geral do sistema;
* membro: operação normal no grupo;
* adminGrupo: gestão do grupo, membros e aprovações.

Essa separação resolve quase todo o controle de acesso sem complexidade desnecessária.

11. Criação do backend mínimo

O backend deve começar pelo servidor, leitura das variáveis de ambiente, conexão com o banco e configuração da sessão.

Trecho mínimo:

```js
const express = require("express");
const session = require("express-session");
const connectPgSimple = require("connect-pg-simple");
const { Pool } = require("pg");

const app = express();
const PgSession = connectPgSimple(session);

app.use(express.json());

app.use(
  session({
    store: new PgSession({
      pool: new Pool({ connectionString: process.env.DATABASE_URL }),
      tableName: "user_sessions",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

app.listen(process.env.PORT || 3001);
```

Essa configuração já define um ponto essencial: autenticação stateful com sessão persistida no PostgreSQL.

12. Implementação da autenticação

O fluxo deve conter cadastro, login, sessão e logout.

No cadastro:

* validar entrada;
* normalizar email;
* gerar hash da senha com bcrypt;
* criar usuário;
* criar ou associar grupo;
* criar vínculo em usuarios_grupos;
* iniciar a sessão.

No login:

* buscar usuário pelo email;
* comparar senha com bcrypt;
* reconstruir o estado da sessão;
* armazenar os dados essenciais em req.session.

No logout:

* destruir a sessão;
* limpar cookie.

Campos essenciais da sessão:

* id do usuário;
* email;
* papel global;
* grupo ativo;
* papel no grupo;
* status do vínculo.

13. Serviço de sessão

O sistema precisa recalcular a sessão com base no banco. Isso evita inconsistência quando o vínculo muda, o grupo é removido ou o usuário passa a ter mais de um grupo.

A lógica do grupo ativo deve seguir esta regra:

* se o grupo ativo salvo ainda for válido, ele continua;
* se houver apenas um grupo válido, ele pode ser assumido;
* se houver mais de um e o salvo estiver inválido, o grupo ativo deve ser redefinido;
* se não houver vínculo aceito, a operação do grupo deve ser bloqueada.

Essa parte justifica a existência de um service, como sessionService.js.

14. Middlewares obrigatórios

Middlewares essenciais:

* autenticação;
* autorização;
* validação;
* limite de requisições;
* log de requisição;
* tratamento de erros.

Exemplo de autenticação:

```js
function exigirAutenticacao(req, res, next) {
  if (!req.session?.usuario) {
    return res.status(401).json({ erro: "Não autenticado" });
  }
  next();
}
```

Exemplo de grupo ativo:

```js
function exigirGrupoAtivoAceito(req, res, next) {
  const usuario = req.session?.usuario;
  if (!usuario?.grupoAtivoId || usuario?.statusGrupo !== "aceito") {
    return res.status(403).json({ erro: "Grupo ativo inválido" });
  }
  next();
}
```

15. Validação de dados

A validação deve ocorrer antes da regra de negócio. O projeto usa Zod. Essa escolha é adequada porque simplifica schema de entrada e mensagem de erro.

Exemplo:

```js
const { z } = require("zod");

const loginSchema = z.object({
  email: z.email(),
  senha: z.string().min(6),
});
```

Cada domínio deve ter seus próprios schemas:

* authSchemas.js
* grupoItemSchemas.js
* compraSchemas.js
* usuarioSchemas.js
* categoriaItemSchemas.js

16. Normalização dos dados

O sistema precisa de funções utilitárias para:

* normalizar email;
* normalizar texto simples;
* normalizar nome de grupo;
* normalizar unidade;
* converter decimal;
* converter boolean;
* gerar código do grupo;
* preparar resposta da compra.

Essas funções pertencem a utils/normalizers.js. A vantagem é evitar lógica repetida nas rotas e manter consistência nos dados salvos.

17. Criação das rotas

A divisão correta das rotas é por domínio.

authRoutes.js
Cadastro, login, sessão, perfil, seleção de grupo, convites, solicitações, membros do grupo, saída do grupo, logout.

grupoRoutes.js
CRUD ou consulta administrativa de grupos.

usuarioRoutes.js
CRUD ou consulta administrativa de usuários.

usuarioGrupoRoutes.js
Gerenciamento dos vínculos entre usuários e grupos.

categoriaItemRoutes.js
Gerenciamento do catálogo global.

grupoItemRoutes.js
Operação do estoque e lista de compra do grupo.

compraRoutes.js
Registro de compras e movimentações.

systemRoutes.js
Painel sistêmico, resumo administrativo, pendências e logs.

18. Coração do sistema: grupo_itens

A tabela grupo_itens concentra a parte operacional. Ela evita a criação de duas estruturas paralelas para “lista” e “estoque”.

Campos centrais:

* grupoId;
* itemId;
* quantidade;
* comprar.

Interpretação:

* quantidade representa o estoque atual do item naquele grupo;
* comprar indica se aquele item entrou na lista de reposição.

Com isso:

* lista.html opera a necessidade de compra;
* estoque.html opera a quantidade;
* compra.html materializa a entrada e limpa a necessidade.

19. Registro de compra com transação

A compra é a operação mais sensível do sistema. Ela precisa ser atômica. Isso significa que todas as etapas devem ocorrer juntas, ou nenhuma deve ocorrer.

Fluxo da compra:

1. identificar grupo ativo e usuário autenticado;
2. validar os itens recebidos;
3. abrir transação no Prisma;
4. criar a compra;
5. criar os compra_itens;
6. criar ou localizar categoria e item, se necessário;
7. localizar ou criar grupo_item;
8. somar quantidade ao estoque;
9. definir comprar como falso;
10. gravar movimentação de estoque;
11. confirmar a transação.

Exemplo resumido:

```js
const resultado = await prisma.$transaction(async (tx) => {
  const compra = await tx.compra.create({
    data: { grupoId, usuarioId }
  });

  for (const entrada of itens) {
    await tx.compraItem.create({ data: { ...entrada, compraId: compra.id } });

    await tx.grupoItem.update({
      where: { grupoId_itemId: { grupoId, itemId: entrada.itemId } },
      data: {
        quantidade: { increment: entrada.quantidade },
        comprar: false,
      },
    });

    await tx.movimentacaoEstoque.create({
      data: {
        grupoId,
        itemId: entrada.itemId,
        usuarioId,
        tipo: "entrada_compra",
        quantidade: entrada.quantidade,
      },
    });
  }

  return compra;
});
```

20. Auditoria e rastreabilidade

Toda aplicação com autenticação, estoque e gestão de membros deve ter rastreabilidade mínima.

A tabela auditoria_logs registra:

* entidade;
* id da entidade;
* ação;
* autor;
* grupo;
* item;
* status HTTP;
* metadados;
* data.

Esse mecanismo ajuda em suporte, depuração, segurança e controle administrativo.

21. Frontend: estrutura de páginas

As páginas públicas e privadas devem ser separadas por função.

index.html
Tela de entrada com login e cadastro.

homepage.html
Página principal após autenticação.

lista.html
Itens sinalizados para compra.

estoque.html
Itens com quantidade atual.

compra.html
Registro formal de compra.

consumo.html
Leitura analítica de compras e movimentações.

perfil.html
Dados da conta, vínculos, troca de grupo, membros e convites.

painel-sistema.html
Página administrativa global.

aguardando.html
Tela de espera para vínculos pendentes.

22. Frontend: organização dos scripts

Os scripts devem ser modulares.

api.js
Centraliza chamadas HTTP.

auth.js
Funções relacionadas à sessão e proteção de páginas.

index.js
Fluxo de login e cadastro.

homepage.js
Carregamento inicial da página autenticada.

lista.js
Manipulação da lista de compra.

estoque.js
Manipulação do estoque.

compra.js
Registro de compras.

consumo.js
Cálculos e exibição analítica.

perfil.js
Vínculos, convites e membros.

formatters.js
Formatação de valores e textos.

validators.js
Validações leves do frontend.

messages.js
Mensagens padronizadas.

filters.js
Filtros de listagem.

dom.js
Funções utilitárias de manipulação do DOM.

23. Comunicação entre frontend e backend

A comunicação deve usar fetch com credenciais incluídas, porque a autenticação depende de cookie de sessão.

Exemplo mínimo:

```js
export async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.erro || "Erro na requisição");
  }

  return data;
}
```

Esse padrão evita repetição e centraliza o tratamento básico da resposta.

24. Ordem de construção das telas

A criação das páginas deve seguir a ordem da dependência funcional:

1. index.html e index.js;
2. homepage.html e homepage.js;
3. lista.html e lista.js;
4. estoque.html e estoque.js;
5. compra.html e compra.js;
6. perfil.html e perfil.js;
7. consumo.html e consumo.js;
8. painel-sistema.html e painel-sistema.js.

Essa sequência acompanha a maturidade do backend e reduz acoplamento prematuro.

25. Tratamento de erros

O sistema deve ter:

* handler para rota inexistente;
* handler global de erro;
* padronização de resposta JSON;
* mensagens úteis para o frontend.

Isso evita respostas quebradas, facilita manutenção e melhora depuração.

26. Testes mínimos necessários

Testes críticos:

* cadastro e login;
* sessão válida;
* autorização por grupo;
* registro de compra;
* criação de movimentação;
* bloqueio de acesso sem grupo aceito.

Esse conjunto já cobre o núcleo do sistema. Os testes devem ser executados antes de qualquer refatoração relevante.

27. Erros comuns

Erros comuns:

* começar pela interface antes da modelagem;
* usar localStorage como base da aplicação;
* misturar papel global com papel de grupo;
* não criar grupo ativo na sessão;
* duplicar estrutura de lista e estoque sem necessidade;
* registrar compra sem transação;
* atualizar estoque sem movimentação;
* deixar validação apenas no frontend;
* espalhar lógica de negócio em arquivos HTML;
* não modularizar rotas, middlewares e utilitários;
* não registrar logs de auditoria;
* integrar tela antes de testar endpoint isoladamente.

28. Sequência final de implementação

A sequência mais segura e fiel ao projeto é esta:

1. definir requisitos funcionais e não funcionais;

2. definir arquitetura monolítica modular;

3. escolher PostgreSQL, Prisma, Express e sessão;

4. criar a estrutura de pastas;

5. instalar dependências;

6. configurar .env;

7. modelar schema.prisma;

8. gerar migração;

9. criar server.js;

10. configurar CORS, JSON, sessão e arquivos estáticos;

11. criar middlewares;

12. criar utilitários de normalização;

13. criar validators;

14. implementar autenticação;

15. implementar grupos e vínculos;

16. implementar serviço de sessão;

17. implementar catálogo global;

18. implementar grupo_itens;

19. implementar compras e movimentações;

20. implementar auditoria;

21. construir páginas HTML;

22. construir scripts JS por página;

23. integrar fetch com a API;

24. testar fluxos críticos;

25. ajustar permissões, mensagens e consistência.

26. Síntese técnica

Este sistema deve ser construído como aplicação web com backend em Express, banco PostgreSQL, ORM Prisma, autenticação por sessão, catálogo global de itens, estoque isolado por grupo, compras transacionais, movimentações rastreáveis e frontend estático modular. A decisão mais importante da arquitetura é separar catálogo global, estoque por grupo, vínculo de usuário com grupo e grupo ativo na sessão. Essa decisão sustenta quase todo o restante do projeto.
