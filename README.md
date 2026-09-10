# Expense Approval Quality Lab

**Playwright · TypeScript · Quality Engineering**

Um fluxo de aprovação de despesas pequeno e determinístico, testado de ponta a
ponta e na camada de API com Playwright e TypeScript — construído para mostrar
*como* os testes foram decididos, não apenas que eles existem.

## O que é

Um colaborador envia uma despesa; um gestor aprova ou rejeita. Esse é todo o
produto. Ele existe para carregar risco real o suficiente (autorização,
segregação de funções, uma máquina de estados) para justificar uma estratégia
de testes de verdade, sem virar um projeto sobre o próprio produto.

## O problema de qualidade

Qualquer pessoa pode listar Playwright no currículo. Este repositório é a
resposta a uma pergunta mais específica: essa pessoa sabe *por que* uma
verificação específica pertence à camada de API em vez da UI, como manter uma
suíte de browser determinística sobre um backend compartilhado, e como tornar
a evidência de um teste útil quando ele falha — não só como chamar
`page.click()`.

## Sistema sob teste

- Dois papéis: **colaborador** (`employee`) e **gestor** (`manager`).
- Uma despesa percorre exatamente um caminho: `pending → approved` ou
  `pending → rejected`. Uma vez decidida, é imutável.
- Um gestor só pode decidir despesas de colaboradores que se reportam a ele,
  e — independentemente do papel — ninguém pode decidir a própria despesa.
- Quatro contas fixas de seed modelam isso: `manager-a`/`manager-b`, cada uma
  gerenciando `employee-a`/`employee-b`, respectivamente. Ver
  `src/db/seed.ts`.

## Modelo de risco

| Risco | Mitigado por |
|---|---|
| Valor inválido chega ao registro financeiro | Validação no servidor (S2) |
| Um gestor aprova a própria despesa | Regra de segregação de funções (S4) |
| Um não-gestor chama o endpoint de aprovação | Verificação de papel (S5) |
| Um colaborador vê despesas de outro colaborador | Listagem com escopo por papel/time (S7) |
| Uma rejeição não tem motivo | Validação de motivo obrigatório (S6) |
| Uma despesa decidida é editada depois | Proteção da máquina de estados (S8) |

Detalhes completos, incluindo *por que* cada cenário está onde está, em
[`docs/TEST_STRATEGY.md`](docs/TEST_STRATEGY.md).

## Estratégia de testes

8 cenários no total — 4 API, 4 E2E — deliberadamente não mais que isso. Toda
regra que não precisa de um browser para ser observada é testada sem um:

| ID | Cenário | Camada | Prioridade |
|---|---|---|---|
| S1 | Colaborador faz login e envia uma despesa válida | E2E | P0 |
| S2 | Um valor ≤ 0 é rejeitado | API | P0 |
| S3 | Gestor aprova uma despesa pendente | E2E | P0 |
| S4 | Um gestor não pode aprovar a própria despesa | API | P0 |
| S5 | Um colaborador não pode chamar o endpoint de aprovação | API | P1 |
| S6 | Rejeitar sem motivo é bloqueado no formulário | E2E | P1 |
| S7 | Listagem de despesas com escopo por papel/time | API | P1 |
| S8 | Uma despesa decidida não pode ser editada pelo dono | E2E | P2 |

## API vs E2E

Validação e autorização (S2, S4, S5, S7) são comprovadas na camada de API —
mais rápido, e não precisam de um browser para serem verdadeiras. Só o que um
browser precisa observar continua E2E: a jornada completa pela UI real (S1,
S3), um formulário bloqueando um campo obrigatório vazio antes de qualquer
requisição ser disparada (S6), e um controle simplesmente não sendo
renderizado depois que uma transição de estado aconteceu (S8).

## Autenticação e estado

Sessão baseada em cookie. Os testes E2E reutilizam um `storageState` gerado
uma vez por papel por um project `setup` (`tests/setup/auth.setup.ts`), em vez
de fazer login pela UI antes de cada teste — a única exceção é S1, onde o
login *é* a história. Os testes de API autenticam seu próprio
`APIRequestContext` via fixtures em `playwright/fixtures/api.ts`. Os arquivos
de sessão ficam em `playwright/.auth/` e são ignorados pelo Git; nunca são
commitados.

## Como executar localmente

Requisitos: Node.js ≥ 20.

```bash
npm ci
npx playwright install chromium

npm run typecheck
npm run lint
npm run test:api
npm run test:e2e
# ou os dois:
npm test
```

Para navegar manualmente: `npm run seed` uma vez (cria e semeia
`./data/dev.sqlite`), depois `npm run dev`
(`http://localhost:3100` por padrão; `PORT`/`DB_PATH` podem ser
sobrescritas via variáveis de ambiente). Entre com
`employee-a@example.test` / `Test@1234` (ver `src/db/seed.ts` para as quatro
contas e a senha fixa).

## CI

GitHub Actions (`.github/workflows/tests.yml`) roda, como gates
independentes: `typecheck` → `lint` → `test:api` → `test:e2e`. O relatório
HTML do Playwright e qualquer trace/screenshot/video são enviados como
artefato só quando uma execução falha.

## Decisões técnicas

- **`workers: 1`, deliberadamente.** Toda a suíte compartilha um único
  processo Express e um único banco SQLite, iniciados uma vez pelo
  `webServer` do Playwright. Provar isolamento veio primeiro; paralelismo é
  um próximo passo documentado, não um padrão. Ver "Paralelismo" em
  `docs/TEST_STRATEGY.md`.
- **Sem camada de Page Object.** Locators e ações vivem diretamente nos
  quatro arquivos de spec. Quatro specs curtos e independentes ainda não se
  repetem o suficiente para justificar uma abstração; se um quinto cenário
  precisasse da mesma sequência "criar via API, abrir a linha, agir sobre
  ela", esse seria o gatilho para extraí-la — não antes.
- **Contas de seed fixas, despesas por teste.** Usuários não são criados
  dinamicamente — só os registros sob teste são. Ver "Dados de teste" em
  `docs/TEST_STRATEGY.md`.
- **Um project `mobile-critical`, não uma suíte mobile.** Só os dois
  cenários P0 que compõem o caminho crítico rodam de novo em uma viewport
  Pixel 5. Construí-lo revelou um bug real de responsividade (a tabela de
  despesas não tinha tratamento de overflow), corrigido com um contêiner
  com rolagem — não um redesign.

## Evidências de falha

`trace: "on-first-retry"`, `screenshot: "only-on-failure"`,
`video: "retain-on-failure"` — evidência só se acumula quando algo está
realmente errado, não em toda execução verde.

## O que está propositalmente fora de escopo

- **Testes de performance/carga** — já demonstrados em outro lugar do
  portfólio (o perfil k6 do `reino-do-recurso-real-api`).
- **Uma suíte dedicada de acessibilidade** — o HTML semântico e os
  locators baseados em papel/role deste laboratório já são a própria
  evidência de acessibilidade; uma suíte Axe separada já existe no
  `reino-do-recurso-real-api`.
- **Firefox/WebKit** — só Chromium, por decisão; trivial de adicionar como
  mais um `project`, não necessário para provar a estratégia.
- **BDD/Cucumber, regressão visual, testes de segurança** — cada um
  pertence a outro laboratório deste portfólio, não a este.

## Stack

Node.js, TypeScript (`strict: true`), Express, better-sqlite3, Playwright
Test. Versões realmente usadas neste repositório: Node 20+ (desenvolvido em
24.20.0), `@playwright/test` 1.63.0, `typescript` 5.9.3.
