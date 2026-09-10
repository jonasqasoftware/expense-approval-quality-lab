# Estratégia de Testes

## Contexto

Este laboratório existe para demonstrar julgamento de Quality Engineering com
Playwright e TypeScript, não para construir um sistema de despesas de
produção. O sistema sob teste (SUT) é um fluxo de aprovação de despesas
pequeno e autocontido: um colaborador envia uma despesa, um gestor a decide.
Ele é deliberadamente grande o suficiente, e não mais que isso, para carregar
risco real de autorização e de máquina de estados.

## Modelo de risco

| Risco | Por que importa |
|---|---|
| Valor inválido chega ao registro financeiro | Integridade dos dados financeiros |
| Um gestor aprova a própria despesa | Segregação de funções / controle de fraude |
| Um não-gestor consegue chamar o endpoint de aprovação | Escalação de privilégio |
| Um colaborador vê despesas de outro colaborador | Vazamento de dados entre colegas |
| Uma rejeição não carrega motivo | Sem trilha de auditoria para uma decisão financeira |
| Uma despesa decidida ainda pode ser editada | Corrupção da máquina de estados |

## Escopo

- Autenticação (sessão via cookie, formulário de login).
- Criação, listagem, aprovação, rejeição e edição de despesas — exatamente
  os fluxos por trás dos riscos acima.
- Uma checagem mobile deliberadamente restrita da jornada crítica.

## Fora de escopo

- Testes de performance/carga — já evidenciados em outro lugar do portfólio
  (o perfil k6 do `reino-do-recurso-real-api`).
- Uma suíte dedicada de acessibilidade — este laboratório usa HTML semântico
  e locators baseados em papel/role em toda parte, o que já é a própria
  evidência de acessibilidade; não duplica a suíte Axe já publicada no
  `reino-do-recurso-real-api`.
- Matriz cross-browser (Firefox/WebKit) — só Chromium, por decisão de
  design. Fácil de estender, não necessário para provar a estratégia.
- Regressão visual, BDD/Cucumber — não é o papel deste projeto; ver os
  outros laboratórios do portfólio para esses ângulos.

## Cenários

| ID | Cenário | Risco | Camada | Prioridade | Por que esta camada |
|---|---|---|---|---|---|
| S1 | Colaborador faz login e envia uma despesa válida | Caminho crítico quebrado | E2E | P0 | Só a UI prova que a jornada inteira realmente funciona de ponta a ponta |
| S2 | Um valor igual ou menor que zero é rejeitado | Dado financeiro inválido | API | P0 | Validação pura — mais barata e determinística fora da UI |
| S3 | Gestor aprova uma despesa pendente | Segunda metade do caminho crítico | E2E | P0 | Precisa ser visto funcionando pela interface real |
| S4 | Um gestor não pode aprovar a própria despesa | Segregação de funções | API | P0 | Uma regra de autorização, isolada do ruído da UI |
| S5 | Um colaborador não pode chamar o endpoint de aprovação | Escalação de privilégio | API | P1 | Teste negativo de autorização, barato e determinístico |
| S6 | Rejeitar sem motivo é bloqueado no formulário | Sem trilha de auditoria | E2E | P1 | Só observável no lado cliente — a validação da própria API já é coberta pelas asserções irmãs de S4/S5, e é uma preocupação separada da guarda do próprio formulário |
| S7 | Listagem de despesas com escopo por papel/time | Vazamento de dados | API | P1 | Uma regra de autorização/escopo de leitura, testada com dados preparados via API |
| S8 | Uma despesa decidida não pode ser editada pelo dono | Corrupção da máquina de estados | E2E | P2 | Caminho secundário, barato de automatizar, prova que a UI — não só a API — respeita a máquina de estados |

## API vs E2E

Toda regra que pode ser provada sem um browser é provada sem um: validação
(S2), autorização (S4, S5, S7). As únicas coisas que permanecem E2E são
coisas *só* observáveis na interface: a jornada completa de login até envio
(S1), o botão de aprovação de fato atualizando o que o usuário vê (S3), um
formulário bloqueando um campo obrigatório vazio antes de qualquer
requisição ser enviada (S6), e um controle simplesmente não sendo oferecido
depois que uma transição de estado aconteceu (S8). Nenhum cenário é testado
duas vezes nas duas camadas pelo mesmo motivo.

## Dados de teste

Quatro contas **fixas e semeadas** (`manager-a`, `manager-b`, `employee-a` →
gerenciada por `manager-a`, `employee-b` → gerenciada por `manager-b`)
existem durante toda a execução — ver `src/db/seed.ts`. Elas não são criadas
por teste. Os testes criam suas próprias **despesas** via API antes de
exercitar uma jornada, usando títulos curtos, descritivos e fixos ("Client
dinner", "Unjustified software license") em vez de dados gerados
aleatoriamente — quem revisa deve conseguir ler um teste e entender
imediatamente o que ele está afirmando, e um nome fixo nunca introduz sua
própria flakiness.

## Autenticação

Usa-se sessão baseada em cookie. Os testes de API autenticam seu próprio
`APIRequestContext` por fixture (`playwright/fixtures/api.ts` —
`employeeApi`, `managerApi`, `otherManagerApi`), cada uma fazendo login uma
vez e reutilizando esse contexto em toda chamada. Os testes E2E evitam
repetir um login pela UI antes de cada teste: um project `setup`
(`tests/setup/auth.setup.ts`) faz login uma vez por papel e salva o
`storageState` em `playwright/.auth/*.json` (ignorado pelo Git — cookies de
sessão nunca devem ser commitados, mesmo para contas sintéticas). S1 é a
exceção deliberada: fazer login pelo formulário real *é* parte da sua
história, então ele não usa `storageState`.

## Isolamento

Todo teste cria os registros específicos de que precisa antes de fazer
asserções sobre eles, e as asserções checam "meu registro se comporta
corretamente" em vez de "a lista tem exatamente N itens" — assim os testes
continuam corretos mesmo quando o banco compartilhado acumula linhas de
outros testes na mesma execução. Nenhum teste depende de outro ter rodado
antes.

## Paralelismo

`workers: 1` para toda a suíte, de propósito. O SUT é um único processo
Express apoiado por um único arquivo SQLite, iniciado uma vez pelo
`webServer` do Playwright para toda a execução — não por project. Ativar
`fullyParallel` antes de provar isolamento arriscaria exatamente o tipo de
flakiness por estado compartilhado que este laboratório deveria demonstrar
*evitar*. Um banco por worker (em memória por worker, ou uma convenção de
schema por worker) é o próximo passo natural se execução paralela for
necessária algum dia — **FUTURE CANDIDATE**, não necessário para provar
esta estratégia.

Uma consequência direta: como o servidor e o banco persistem durante toda a
invocação do `playwright test`, rodar o *mesmo* arquivo de cenário em dois
projects diferentes (ver "Mobile" abaixo) criaria, de outra forma, duas
linhas com título idêntico. `create-expense.spec.ts` e
`approve-expense.spec.ts` evitam isso compondo o título da despesa a partir
de `testInfo.project.name` (ex.: `"Airport taxi — mobile-critical"`), então
a execução do cenário em cada project cria uma linha única por construção —
nenhum locator posicional (`.first()`, `.last()`, `.nth()`) é necessário, e
o princípio de isolamento do parágrafo acima ("todo teste cria o registro
específico de que precisa") vale mesmo entre projects, não só entre testes.

## Mobile

Um project `mobile-critical` (viewport Pixel 5) reexecuta só os dois
cenários E2E P0 que juntos formam o caminho crítico (S1, S3) — não a suíte
inteira. Ele existe para provar que a jornada é utilizável em uma viewport
pequena, não para dobrar a cobertura de testes. Construí-lo revelou um bug
real de responsividade (a tabela de despesas não tinha tratamento de
overflow, então o botão Aprovar ficava inalcançável em uma viewport
estreita) — corrigido envolvendo a tabela em um contêiner com rolagem
horizontal (`src/public/styles.css`, `.table-scroll`).

## Estratégia contra flakiness

Verificado por busca estática (nenhum `waitForTimeout`, nenhum locator de
classe CSS/`nth`/XPath, nenhum teste depende de outro) e empiricamente: a
suíte completa (API + E2E, ambos os projects) rodou três vezes consecutivas
com zero resultados intermitentes antes deste laboratório ser considerado
pronto.

## CI

O GitHub Actions roda, em ordem: `typecheck`, `lint`, `test:api`,
`test:e2e`. Cada gate é independente, então uma falha de CI diz
imediatamente qual camada quebrou, sem precisar abrir o relatório HTML. O
relatório e qualquer trace/screenshot/video são enviados como artefato só
quando uma execução tem falhas.

## Critérios de saída

Os 8 cenários verdes, `typecheck` e `lint` limpos, três execuções locais
completas consecutivas verdes, nenhum anti-pattern encontrado na varredura
estática acima, e nenhum segredo ou credencial (real ou com aparência real)
em qualquer lugar do repositório.
