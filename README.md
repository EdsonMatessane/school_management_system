# Cacoin

Sistema de gestão escolar para instituições em Moçambique: cursos e inscrições, estudantes e
funcionários, finanças e pagamentos (incluindo M-Pesa), presenças, notas e pautas, exames e testes,
despesas, pastas de documentos, portais do estudante e do professor, auditoria e repartição do
sistema por várias instituições.

## Funcionalidades

- **Académico**: cursos, categorias, níveis, modalidades, módulos e disciplinas; inscrição de
  estudantes; testes, exames, registo de notas, pautas, graduações e suspensões.
- **Pessoas**: estudantes e funcionários (RH, documentos, presenças, licenças); contas de utilizador
  com política de palavra-passe, bloqueio por tentativas e horário de acesso.
- **Finanças**: mensalidades, taxas, multas por atraso, pagamentos, salários, despesas, despesas
  internas, fardamento e recibos numerados.
- **Mobile Money**: pagamentos por M-Pesa (cobrança real, com consulta de estado) e por depósito
  bancário. e-Mola e mKesh ainda não têm ligação ao operador.
- **Comunicação**: notificações, tarefas e aulas online.
- **Portais**: estudante, professor e funcionário, cada um limitado aos seus dados; pesquisa de
  estudante.
- **Documentos**: Pastas com carregamento, pesquisa de ficheiros e exportação em `.zip`.
- **Administração**: auditoria, estados do sistema, dados e cabeçalho da escola (com website) e
  repartição do sistema em instituições independentes.
- **Página inicial**: com o website definido em Definições › Geral, é a primeira página, antes do
  login, com o botão **Prosseguir**.

## Stack

- Backend: Java 21, Spring Boot 3.5, Spring Data JPA e PostgreSQL.
- Frontend: React 19, Vite, Material UI, Axios e jsPDF.

## Arranque rápido (desenvolvimento)

Requisitos: Java 21, Maven, Node.js 20+ e Docker (ou um PostgreSQL instalado).

```bash
# 1. Base de dados (PostgreSQL em localhost:5432)
cd backend
docker compose up -d

# 2. Backend: API em http://localhost:8080/api
mvn spring-boot:run

# 3. Frontend (noutro terminal): http://localhost:5173
cd ../frontend
npm install
npm run dev
```

Numa instalação nova, sem utilizadores, a aplicação pede a criação do **primeiro administrador**
(código `ADM0001` e uma palavra-passe temporária, que tem de ser trocada no primeiro acesso).

## Configuração

O backend lê variáveis de ambiente (valores por omissão em `backend/src/main/resources/application.yml`):

| Variável | Para que serve | Por omissão |
| --- | --- | --- |
| `CACOIN_DB_URL` | Endereço JDBC do PostgreSQL | `jdbc:postgresql://localhost:5432/cacoin_db` |
| `CACOIN_DB_USER` / `CACOIN_DB_PASSWORD` | Utilizador e palavra-passe da base de dados | `postgres` / `123456` (só para desenvolvimento) |
| `SERVER_PORT` | Porta do backend | `8080` |
| `CACOIN_AUTH_SECRET` | Segredo que assina as sessões | gerado e guardado em `CACOIN_AUTH_SECRET_FILE` |
| `CACOIN_AUTH_SECRET_FILE` | Onde guardar o segredo gerado | `./data/auth-secret.key` |
| `CACOIN_AUTH_TOKEN_HOURS` | Duração da sessão | `12` |
| `CACOIN_AUTH_ENFORCE` | `false` desliga a exigência de sessão (só desenvolvimento) | `true` |
| `CACOIN_CORS_ORIGINS` | Endereços do frontend autorizados, separados por vírgulas | `http://localhost:5173,http://127.0.0.1:5173` |
| `CACOIN_PARTITION_PASSWORD` | Palavra-passe para repartir o sistema e repor o acesso de uma repartição | valor do código: **mude-o** |
| `CACOIN_MOBILE_MONEY_MODE` | `simulated` aprova pagamentos sem cobrar (só desenvolvimento) | `live` |
| `CACOIN_MOBILE_MONEY_TIMEOUT` | Segundos até um pagamento pendente falhar | `180` |
| `CACOIN_FOLDER_ROOT`, `CACOIN_STAFF_STORAGE_ROOT`, `CACOIN_REQUEST_STORAGE_ROOT` | Pastas dos ficheiros enviados | `./data/...` |
| `CACOIN_PARTITIONS_ROOT` / `CACOIN_PARTITIONS_AUTOSTART` | Pasta das repartições e arranque automático | `./partitions` / `true` |
| `VITE_API_URL` (frontend) | Endereço da API, fixado na compilação | `http://localhost:8080/api` |

As credenciais do M-Pesa não são variáveis de ambiente: preenchem-se na aplicação (ver
[Mobile Money (M-Pesa)](#mobile-money-m-pesa)).

## Docker (stack completa)

```bash
cp .env.example .env        # preencher CACOIN_DB_PASSWORD
docker compose up --build
```

Frontend em `http://localhost:8081` e API em `http://localhost:8080/api`. As repartições usam as
portas 8100 a 8199, já mapeadas no `docker-compose.yml`. Se o frontend for servido noutro endereço,
defina `CACOIN_CORS_ORIGINS` e `VITE_API_URL`.

## Testes e qualidade

```bash
cd backend && mvn test                      # testes unitários (Mockito, sem base de dados)
cd frontend && npm run lint && npm run build
```

O fluxo `.github/workflows/ci.yml` corre estes passos em cada `push` e `pull request`. O ESLint
aponta alguns avisos `react-hooks/exhaustive-deps` que são intencionais (efeitos que só devem correr
quando um valor muda).

## Produção: lista de verificação

- Mude `CACOIN_DB_PASSWORD` e `CACOIN_PARTITION_PASSWORD`; o valor por omissão desta última está no
  código-fonte, por isso num repositório público ela fica visível.
- Defina `CACOIN_CORS_ORIGINS` com o endereço real do frontend. O navegador também chama as
  repartições (portas 8100+), que herdam esta configuração.
- Sirva frontend e API em HTTPS. Se o website da página inicial usar `https`, o sistema também deve.
- No M-Pesa, mude o ambiente para `production` só depois de um pagamento de teste em `sandbox`.
- Nunca use `CACOIN_AUTH_ENFORCE=false` nem `CACOIN_MOBILE_MONEY_MODE=simulated` em produção.
- Faça cópias de segurança da base de dados e das pastas `data/` e `partitions/`.

## Estrutura

```text
backend/    API Spring Boot (src/main/java/mz/cacoin/<módulo>, scripts SQL em db/manual)
frontend/   React + Vite (src/pages/<módulo>)
regra-da-estrutura-da-base-de-dados.txt
```

## Pastas

O menu **Pastas** abre num **novo separador** uma janela completa (`/?folders`,
`frontend/src/pages/FolderManagement.jsx`, estilos em `pages/folders/folders.css`) com o
visual de explorador de ficheiros: barra de ícones, árvore de pastas com linhas-guia e contagem
de ficheiros, pastas ilustradas e tabela de ficheiros. A API é `/api/folders`.

- Cada pasta regista **quem a criou e quando** (`createdBy`, `createdByCode`, `createdAt`),
  visível nos cartões, no cabeçalho da pasta e no separador **Criado por** da árvore. Pastas
  criadas antes desta versão aparecem como "Sem registo".
- Cada ficheiro regista **quem o adicionou e quando** (tabela `cacoin_folder_files`); o conteúdo
  fica no disco, dentro da pasta (`data/cacoin-folders/{id}-{NOME}/ficheiro`).
- É possível criar pastas e subpastas, **renomear**, **mover** (arrastando uma pasta para outra
  ou para o aviso "nível principal", ou em "Mover para…"), **comprimir em .zip** (só quando a
  pasta tem conteúdo) e **apagar** (com confirmação; apaga também subpastas e ficheiros).
- Carregar ficheiros: botão "Carregar ficheiros" ou arrastar ficheiros para a tabela (limite de
  50 MB por ficheiro, definido em `application.yml`). PDF, imagens (exceto SVG) e texto simples
  abrem no navegador; os restantes são descarregados.
- Renomear e mover também actualizam o armazenamento no disco.
- **Pesquisar ficheiros**: campo na secção «Ficheiros» de cada pasta. Procura no nome, em quem
  adicionou (nome ou código) e na data, sem distinguir maiúsculas nem acentos, e limpa-se ao mudar
  de pasta.

## Portal do estudante e Pesquisa de estudante (StudentLookUp)

O portal do estudante (`frontend/src/pages/portal/`) é servido por `/api/portal`
e só mostra os dados do estudante que iniciou sessão. Na área **Cursos**, o ícone
de ver abre os separadores **Módulos**, **Disciplinas** e **Professores**; este
último lista apenas os nomes dos professores activos associados ao curso em que
o estudante está inscrito.

O menu **Pesquisa > Estudante** (`pages/lookup/StudentLookUpSearch.jsx`) pede o
código do estudante (por exemplo `CACOIN202601`). Ao carregar em **Enter** ou em
**Pesquisar**, se o estudante existir, a consulta abre num **novo separador**
(`/?lookup=CÓDIGO`); se não existir, é mostrada a mensagem "Estudante não
encontrado." e nada é aberto.

A consulta é o `StudentLookUp` (`frontend/src/pages/lookup/StudentLookUp.jsx` e
as páginas `Lookup*.jsx`): uma réplica completa do portal do estudante, em
**modo de consulta apenas**. Usa os endpoints de leitura `GET /api/lookup/{código}/...`
(`backend/src/main/java/mz/cacoin/lookup/`), que devolvem os mesmos dados do
portal para qualquer estudante e requerem sessão de utilizador do sistema.

**Regra de manutenção:** qualquer alteração feita no portal do estudante deve ser
feita em simultâneo no StudentLookUp (cada `Portal*.jsx` tem o seu `Lookup*.jsx`,
e cada função `getPortal*` de leitura tem a sua `getLookup*` em `services/api.js`).
A única diferença é que no StudentLookUp **não pode existir nenhum botão de
acção** (novo pedido, alterar palavra-passe, tema, terminar sessão, entrar na aula,
marcar notificações como lidas, etc.); só botões e ligações de **ver**.

## Dados da escola

Os dados de **Minha Escola > Escola** são guardados no armazenamento local do
navegador e apresentados em cartões de consulta no frontend.

O **website** é a excepção: guarda-se no servidor (tabela `institution_site`; `GET /api/auth/site`
é público e `PUT /api/settings/website` exige sessão), porque a página inicial aparece antes do
login. Define-se em Definições › Geral e em Cabeçalho do relatório (é o mesmo valor, e sai no
cabeçalho dos PDFs e nos recibos); só existe no sistema principal, não nas repartições. Com website
definido, `main.jsx` mostra `pages/auth/FrontPage.jsx`: o website em ecrã inteiro, numa `iframe`,
com os botões flutuantes **Abrir website** e **Prosseguir** (leva ao login). Sites que proíbem ser
incorporados (`X-Frame-Options` ou `frame-ancestors`) aparecem em branco; use **Abrir website**.
Trocar de instituição no login recarrega a página sem voltar a mostrar a página inicial
(`cacoin.skipFrontPage` em `sessionStorage`).

## Configurações do sistema

As configurações em `/api/settings` mantêm preferências do calendário escolar,
data, hora, idioma, fuso horário e moeda. Os antigos campos de dados da
instituição não fazem parte destas configurações. Numa base de dados existente, aplique
`backend/src/main/resources/db/manual/20261016_remove_institution_settings.sql`
para remover também as respetivas colunas.
As obrigatoriedades dos campos da inscrição de estudantes são configuradas em
**Configurações > Formulário**. Numa base de dados existente, aplique
`backend/src/main/resources/db/manual/20261016_add_required_student_fields.sql`.

## Níveis

Os níveis são disponibilizados em `/api/courses/levels`. A API permite listar,
criar, editar, ativar/desativar e apagar níveis, cada um com nome, descrição e
estado.

## Categorias

As categorias são disponibilizadas em `/api/courses/categories`. A API permite
listar, criar, editar, ativar/desativar e apagar categorias, cada uma com nome,
descrição e estado.

## Cursos

Os cursos são disponibilizados em `/api/courses`. Cada curso liga-se a uma
categoria, nível, modalidade, mensalidade, taxa de inscrição e taxa de manual
ativas. A interface sugere nomes existentes e permite escrever nomes novos.
O nome não tem um limite máximo de caracteres; continua a ser obrigatório e
único. As associações só podem ser apagadas quando não estiverem a ser usadas
por um curso. Um curso que já tenha módulos, disciplinas ou estudantes inscritos
também não pode ser apagado.

## Módulos

Os módulos são disponibilizados em `/api/modules`. Cada registo pertence a um
curso; o número sequencial é atribuído automaticamente na criação. Cada módulo
guarda um nome e detalhes formatados. A página resume o número total de módulos
por curso, permite abrir a lista de módulos desse curso e consultar os detalhes
formatados de cada módulo. Os detalhes completos são obtidos por
`GET /api/modules/{id}`. Antes de iniciar a aplicação numa base existente,
aplique primeiro
`backend/src/main/resources/db/manual/20261016_add_module_name_and_details.sql`
e depois
`backend/src/main/resources/db/manual/20261016_add_course_module_sequence.sql`.
Estas migrações adicionam os campos e preservam os módulos existentes,
continuando a sequência depois do maior número já atribuído.

## Disciplinas

As disciplinas são disponibilizadas em `/api/disciplines`. Cada registo pertence
a um curso; o seu número é atribuído automaticamente e sequencialmente por
curso. Cada registo guarda apenas o nome da disciplina, normalizado para
maiúsculas e sem acentos, único dentro do curso. A página resume o número total
por curso e permite abrir a respetiva lista numerada. Antes de iniciar a
aplicação numa base existente, aplique, por esta ordem:
`backend/src/main/resources/db/manual/20261016_add_module_name_and_details.sql`,
`backend/src/main/resources/db/manual/20261016_add_course_module_sequence.sql`
e
`backend/src/main/resources/db/manual/20261016_add_course_discipline_sequence.sql`.
Estas migrações preservam os registos existentes. Módulos e disciplinas podem
coexistir independentemente no mesmo curso.

## Modalidades

As modalidades são disponibilizadas em `/api/courses/modalities`. A API permite
listar, criar, editar, ativar/desativar e apagar modalidades, cada uma com nome,
descrição e estado.

## Duração dos cursos

Cada curso guarda a duração como um número inteiro de meses (`duration_months`).
O formulário pede o número de meses; a interface apresenta anos e meses (por
exemplo, 12 meses como “1 ano”, 24 meses como “2 anos” e 13 meses como
“1 ano e 1 mês”).
Para cursos existentes, a duração permanece vazia até ser preenchida na edição.
Antes de iniciar a aplicação numa base existente, aplique
`backend/src/main/resources/db/manual/20261016_add_course_duration.sql`.

## Inscrição de estudantes

A inscrição e a gestão estão disponíveis em `/api/students/enrollments` e
`/api/students`; as províncias e os distritos de Moçambique são servidos por
`/api/locations/mozambique`, a partir da lista `MozambiqueLocations`. Cada
submissão cria um estudante com código calculado a partir do identificador no
formato `CACOIN{ano}01`; se um curso for selecionado, também cria o registo de
inscrição com uma cópia dos detalhes e valores do curso. Após guardar, a
interface abre automaticamente a lista **Gerir**. Um curso associado não pode
ser apagado enquanto tiver inscrições.

Todos os campos começam opcionais. Se forem preenchidos, o formulário valida o
formato do BI, NUIT, telefone moçambicano, email e datas. O estudante pode ser
guardado antes de escolher um curso; a inscrição e a cópia dos dados do curso
são criadas quando um curso é selecionado. Numa base existente, aplique
`backend/src/main/resources/db/manual/20261016_create_student_enrollments.sql`
e depois
`backend/src/main/resources/db/manual/20261016_allow_incomplete_student_registration.sql`;
aplique também
`backend/src/main/resources/db/manual/20261016_add_student_status_and_created_at.sql`
para adicionar o estado ativo e a data/hora de inscrição dos estudantes.
O estado pode ser alterado em `/api/students/{id}/activation`.

## Mensalidades

As mensalidades são disponibilizadas em `/api/courses/monthlyfees`. Cada registo
guarda tipo, descrição, valor decimal com duas casas em MZN e estado, com
operações para listar, criar, editar, ativar/desativar e apagar.

## Taxas de inscrição e taxas de manual

As taxas de inscrição e as taxas de manual têm registos e tabelas independentes.
As APIs `/api/courses/enrollmentfees` e `/api/courses/manualfees` permitem listar,
criar, editar, ativar/desativar e apagar registos com tipo, descrição e valor
decimal em MZN.

## Formato de dinheiro

Todos os valores em MZN seguem o formato `3,000.00 MZN` (separador de milhares `,`,
decimais `.`, duas casas e um espaço antes da moeda). No frontend use
`src/components/Money.jsx` para mostrar valores e `formatMoney` de
`src/utils/money.js` quando precisar de texto (recibos, pesquisa e exportações
PDF/Excel/CSV/XML). No backend use `mz.cacoin.common.Money`. Na base de dados os valores
continuam `NUMERIC` com duas casas decimais; aplique
`backend/src/main/resources/db/manual/20261017_add_money_format_function.sql` para
ter a função `format_money(valor)` (por exemplo, `SELECT format_money(3000);` devolve
`3,000.00 MZN`).

## Formato de datas

Em todo o sistema (sistema geral, portal do estudante, portal do professor e Pesquisa de
estudante) **tudo o que é data, seja visualização, campo, tabela, recibo ou exportação
PDF/Excel/CSV/XML, usa o formato `dd/mm/aaaa`** (e `dd/mm/aaaa HH:mm` quando há hora).
Nunca use `type="date"`, `type="datetime-local"` nem `toLocaleDateString`/`toLocaleString`.

- Campos: `src/components/DateField.jsx` (`DateField` para datas e `DateTimeField` para data e
  hora). O valor guardado no estado e enviado à API continua `AAAA-MM-DD`
  (`AAAA-MM-DDTHH:mm`); o utilizador escreve e vê `dd/mm/aaaa`.
- Visualização: `src/components/DateText.jsx` ou, quando precisar de texto, `formatDate`,
  `formatDateTime` e `formatTime` de `src/utils/date.js`.
- Qualquer novo ecrã com datas deve usar estes componentes e funções.

## Logs de utilizadores (auditoria)

A coluna **Registo** mostra um código ou nome legível (por exemplo o código do estudante
`CACOIN202601`, o código do funcionário ou o nome do teste), nunca identificadores numéricos.
Ao **criar** ou **apagar** não há alterações a mostrar: só se indica a acção, a entidade e o
registo. Ao **editar**, a coluna **Alterações** mostra apenas os campos alterados, um por linha:
`Campo: "informação antiga" -> "informação nova"`. O registo guarda-se na coluna
`user_logs.entity_ref`; aplique `backend/src/main/resources/db/manual/20261031_add_user_log_entity_ref.sql`.

## Portal do professor: notificações e tarefas

O portal do professor tem a secção **Notificações** (tarefas atribuídas ou em atraso, pedidos
de saída e documentos a expirar), com contador de novas no menu. O professor **não cria,
edita, arquiva nem apaga tarefas**: só vê as que lhe foram atribuídas, altera o estado e
comenta.

## Registo de notas

Cada registo de notas é independente: tem a sua própria lista de estudantes e nunca inclui
estudantes de registos anteriores do mesmo curso e ano. Em *Notas* cada registo é um separador
(`Registo No.1 - 2026`). Aplique os scripts `20261101_allow_multiple_assessment_sheets.sql` e
`20261101_create_assessment_sheet_students.sql` em `backend/src/main/resources/db/manual/`.

## Pagamentos: Período

Em **Configurações > Pagamentos > Período** (`/api/payments/period`) define-se o dia de
pagamento das mensalidades (igual para todos os estudantes), os dias de tolerância antes de
ficarem em atraso, o ajuste quando a data cai em fim de semana ou feriado (manter, próximo dia
útil ou dia útil anterior, usando os feriados activos de Configurações) e a regra da primeira
mensalidade. A página mostra uma pré-visualização dos próximos meses e o botão **Aplicar às
mensalidades em aberto** recalcula as datas limite das mensalidades ainda não pagas. Os valores
por omissão mantêm o comportamento anterior (dia 10). Numa base existente, aplique
`backend/src/main/resources/db/manual/20261017_create_payment_period_settings.sql`.

## Testes

Em **Estudantes > Testes** (`/api/students/tests`) há Criar, Gerir, Histórico e Pagamentos. Cada
teste pertence a um curso e a um módulo ou a uma disciplina, tem nome e nota máxima (maior que 0 e
até 20, com no máximo duas casas decimais). Em **Gerir** adicionam-se as notas: o estudante é
escolhido por autocomplete entre os activos inscritos no curso do teste, a nota não pode ser
superior à nota máxima e "-" regista o estudante que não fez o teste; há também observações.
Concluir um teste move-o para o **Histórico** (só leitura) e reabri-lo devolve-o a Gerir.
Um módulo, disciplina, curso ou estudante com testes ou notas não pode ser apagado. Numa base
existente, aplique `backend/src/main/resources/db/manual/20261018_create_student_tests.sql`.
Em **Estudantes > Testes > Inscrição**, cada inscrição permite consultar e exportar o recibo e
registar pagamentos parciais. A listagem pode ser exportada em PDF, Excel, CSV ou XML; os recibos
também permitem exportação nesses formatos e incluem o histórico de pagamentos.
As taxas de inscrição em **Configurações > Testes > Definição** são mantidas por tipo, com edição,
activação/desactivação e remoção. Se `test_settings` ainda não existir, aplique
`backend/src/main/resources/db/manual/20261018_create_test_settings.sql`; para uma tabela já
existente, aplique `backend/src/main/resources/db/manual/20261018_add_test_fee_status.sql`.

### Cobrança de taxas em testes e exames

Em **Configurações > Testes > Definição** e **Configurações > Exames > Definição**, cada tipo
(normal, recuperação/recorrência, especial) tem um radiobox: **Sem taxa de cobrança** (valor por
omissão para todos os casos) ou **Cobrar** (com o valor da taxa). Em "Sem taxa de cobrança" a
inscrição é criada sem processo de pagamento (estado `FREE`, valor 0, sem recibo nem pagamentos);
em "Cobrar" mantém-se o processo normal (valor, pagamentos parciais, recibo, Mobile Money).
O botão de apagar passa a **Repor sem taxa**. Numa base existente, aplique
`backend/src/main/resources/db/manual/20261030_tests_exams_optional_fee.sql` (muda os valores
por omissão e permite `amount = 0` nas inscrições).

## Exames

Em **Estudantes > Exames > Exame** (`/api/students/exams`) há Criar, Gerir e Histórico, com a mesma
lógica de **Estudantes > Testes > Avaliações**. Cada exame pertence a um curso e a um módulo ou a uma
disciplina, tem nome e nota máxima (maior que 0 e até 20, com no máximo duas casas decimais). Em
**Gerir** adicionam-se as notas: o estudante é escolhido por autocomplete entre os activos inscritos
no curso do exame, a nota não pode ser superior à nota máxima e "-" regista o estudante que não fez o
exame; há também observações. O lançamento de notas respeita o período definido em **Configurações >
Exames > Períodos**. Concluir um exame move-o para o **Histórico** (só leitura) e reabri-lo devolve-o a
Gerir. Um módulo, disciplina, curso ou estudante com exames ou notas de exames não pode ser apagado.
Numa base existente, aplique `backend/src/main/resources/db/manual/20261018_create_student_exams.sql`.

## Regra da base de dados

Tabelas ligadas a estudante, professor, RH ou staff guardam apenas o ID da pessoa
(`student_id`, `staff_id`, ...), nunca nome, apelido ou outros dados repetidos; esses dados
são lidos da tabela da pessoa pelo ID. Detalhes, exemplos e checklist em
`regra-da-estrutura-da-base-de-dados.txt` (na raiz do projecto).

## Despesas Internas

O módulo isolado de Despesas Internas está disponível na navegação principal e
na API `/api/internal-expenses`. Inclui painel, rascunhos e submissão de
despesas, decisões (aprovar, rejeitar e devolver), histórico de auditoria,
pagamentos parciais e reversões, fornecedores, categorias, orçamentos e
exportação de relatórios em PDF, Excel e CSV. O expansível **Configurações**
permite definir a moeda padrão e as moedas disponíveis, tipos de despesa,
prioridades, métodos de pagamento e percentagem de alerta dos orçamentos;
categorias, fornecedores e orçamentos também são geridos nessa área. Os valores
financeiros são persistidos como `NUMERIC(14,2)` e o registo de pagamento
verifica o saldo sob bloqueio transaccional.

Antes de utilizar uma base existente, execute manualmente
`backend/src/main/resources/db/manual/20261019_create_internal_expenses.sql` e,
em seguida,
`backend/src/main/resources/db/manual/20261019_add_internal_expense_settings.sql`
e, por fim,
`backend/src/main/resources/db/manual/20261031_internal_expense_requester_id.sql`.
O primeiro script cria as tabelas do módulo e as categorias iniciais; o segundo
cria e inicializa as configurações; o terceiro troca o nome do solicitante em
texto pelo ID do membro do staff (`requester_id`) e indica como tratar as
despesas antigas cujo nome não coincida com um único membro do staff.

O solicitante de cada despesa é escolhido na lista de staff activo e só o seu ID
fica guardado; o nome é lido de `staff_members`. O projecto actual não
implementa autenticação/autorização no backend nem mantém cadastros de
departamentos/centros de custo; por isso, operador e departamento
são dados introduzidos no módulo, e as filas ainda não são
restringidas por utilizador. Aprovação multinível configurável, anexos seguros,
reembolsos/fundo de caixa com movimentos próprios e exportação de relatórios
financeiros avançados permanecem por implementar. Não utilizar os nomes de
operador fornecidos pelo frontend como identidade ou controlo de acesso.

---

# Guia para continuar o desenvolvimento (pessoas e assistentes de IA)

Esta parte resume as decisões e as regras acumuladas. Leia-a antes de mexer no projecto. Os
nomes de ficheiros são relativos a `backend/src/main/java/mz/cacoin/` (backend) e
`frontend/src/` (frontend), salvo indicação em contrário.

## Regras de trabalho acordadas com o dono do projecto

- Responder em **português de Moçambique**, curto, sem explicações longas.
- Entregar **só os ficheiros criados ou alterados**, em zip, com os caminhos reais do projecto
  (`School/backend/...`, `School/frontend/...`). Nunca o projecto inteiro.
- Sem textos de ajuda, descrições ou parágrafos explicativos em campos e ecrãs.
- Campos de formulário sempre `size="small"`; para listas usa-se `Autocomplete` com
  `TextField {...params}`.
- Reutilizar componentes (editor de texto formatado `RichTextField`/`RichTextViewer`,
  `StandardTable`, `DataExportMenu`, `StatusBadge`, `DetailList`, ...) em vez de duplicar.
- Dados de **consulta** nunca vão em campos desactivados: usa-se tabela ou linhas
  «**Título:** valor» (`components/DetailList.jsx`). O nome de pessoas é **Nome + Apelido**.
- Antes de entregar: `npx eslint src` e `vite build` no frontend, e compilar o backend com
  `javac` (Lombok como processador de anotações) quando não houver Maven.
- Regra da base de dados: ver `regra-da-estrutura-da-base-de-dados.txt` (só o ID da pessoa).

## Tipos de conta e portais

| Conta | O que abre | Como é decidido |
| --- | --- | --- |
| Administrador | Sistema geral | `UserAccount.kind = ADMIN` |
| Estudante | Portal do estudante (`pages/portal/PortalApp.jsx`) | `kind = STUDENT` |
| Professor | Portal do professor | funcionário `staff_type = teachers` |
| Funcionário «outros» | Portal do funcionário (estrutura do portal do estudante) | `staff_type = other` |
| RH | Sistema geral + área **Meu Perfil** | `staff_type = hr` |

Arranque (`main.jsx`): para contas `STAFF` chama-se `GET /api/teacher/me`; o `staffType` devolvido
decide `teacher` / `other` / `hr`. Os modos ficam em `utils/teacherMode.js`
(`setTeacherMode`, `setPortalKind`, `setPersonalScope`).

### Backend: como o professor/«outros» ficam limitados

- `teacher/TeacherContext.java`: âmbito do pedido (`staffId`, cursos atribuídos, tipo). Só existe
  para professores e «outros»; os restantes utilizadores não são afectados.
- `users/AuthFilter.java`: depois de validar o token calcula o âmbito
  (`TeacherPolicy.scopeOf`) e **recusa com 403 tudo o que não estiver na lista de rotas
  permitidas** (`TeacherPolicy.allows`). Por omissão, rota nova = proibida para o professor.
- `teacher/TeacherPolicy.java`: lista de regras (método + caminho + filtro + guarda).
  - `Filter` COURSE/SELF/TASK: `teacher/TeacherScopeAdvice.java` retira das **listas** devolvidas
    tudo o que não é do professor (por `courseId`, `staffId`/`id` ou tarefas).
  - Guardas (`ownsCourseOf`, `selfPathGuard`, `taskGuard`, `forwardedGuard`) validam ids de
    caminho com JPQL. O parâmetro `other` da regra diz se vale também para «outros»
    (`otherRules = true/false` ao registar; o bloco de cursos, estudantes, notas e aulas online é
    só de professores).
  - Escritas: os serviços chamam `TeacherContext.requireSelf/requireCourse` (ex.: `LeaveService`,
    `AttendanceService`, `AssessmentService`, `PautaService`, `OnlineClassesController`).
- `teacher/TeacherController.java`: `GET /api/teacher/me` (perfil; para RH funciona sem âmbito) e
  `GET /api/teacher/notifications`.
- **Para acrescentar uma rota a um portal pessoal**: registar a regra em `registerRules()` na
  secção certa (professor e «outros» ou só professor), filtrar listas pelo campo certo e validar
  ids de caminho com guarda. Esquecer isto resulta em 403, nunca em fuga de dados.

### RH (sistema geral + Meu Perfil)

- O RH usa o sistema geral inteiro **excepto** Dashboard, Usuários, Pastas e Configurações
  (`Layout.jsx`, `hrHiddenSections`). A área nova é **Meu Perfil** (`teacherNav.js`:
  `hrProfileGroups`, ids `profile-attendances-*` e `profile-leaves-*`, mais `teacher-info` e
  `teacher-documents`).
- Nas páginas de Meu Perfil o `App.jsx` liga (durante o render) `setTeacherMode(true)` e
  `setPersonalScope(true)`; o axios (`services/api.js`) acrescenta o cabeçalho
  `X-Personal-Scope: 1` e o `AuthFilter` passa a tratar o RH como funcionário pessoal
  (`TeacherPolicy.scopeOf(account, true)`). Fora de Meu Perfil o RH vê tudo, como no sistema geral.
- Bloqueio no servidor (`TeacherPolicy.hrBlocks`): `HR_DENIED` (qualquer método:
  `/api/dashboard`, `/api/users`, `/api/folders`, logs de utilizadores, definições de
  utilizadores e de notificações, repartições) e `HR_READ_ONLY` (só leitura: `/api/settings`,
  definições de finanças, cargos, tipos de salário/bónus, catálogo de despesas, definições de aulas
  online, períodos e métodos de pagamento, tipos de documentos, definições das despesas internas).

### Frontend dos portais

- `components/teacherNav.js`: menus do professor (`teacherGroupsByArea`) e dos «outros»
  (`otherGroupsByArea`), mais os grupos de Meu Perfil do RH. Usa `getPortalKind()` **em tempo de
  execução**: nunca avaliar `isTeacherMode()` ao nível do módulo (o modo só é definido depois de os
  módulos serem importados; houve um erro por causa disso).
- `components/Layout.jsx`: o mesmo `Layout` serve o sistema geral (`teacher=false`), o professor
  (`teacher`) e o RH (`hr`). O sino de notificações aparece no cabeçalho para todos.
- `pages/staffportal/StaffShell.jsx` + `staffShell.css`: estrutura do portal do estudante
  (cabeçalho, menu de ícones, separadores por grupo) usada pelo portal dos «outros»;
  `App.jsx` escolhe `StaffShell` quando `getPortalKind() === 'other'`.
- `isTeacherMode()` serve para esconder acções de administrador nas páginas reutilizadas
  (ex.: `StandardTable` sem auditoria; `StaffAttendanceTablesPage readOnly`; páginas de finanças
  sem pesquisa e sem colunas pessoais — `pages/finance/ownReport.js`).
- Páginas próprias: `pages/teacher/` (Informação com palavra-passe e tema, Meus Cursos, Estudantes
  com filtros, Documentos > Expirados, Notificações, diálogo do sino) e
  `pages/staffportal/ForwardedTasksPage.jsx`.

## Notificações

- Professor/«outros»: `teacher/TeacherNotificationService.java` calcula a lista (tarefas, saídas,
  documentos, comentários em tarefas, registos encaminhados). Não há tabela de notificações.
- «Lida» é guardada no navegador (`localStorage`, `cacoin.teacher.seenNotifications`);
  `pages/teacher/TeacherNotificationDialog.jsx` é o diálogo do sino.
- Sistema geral: `GET /api/tasks/notifications` (comentários de outras pessoas nas tarefas que
  criou ou lhe cabem); os ids levam o prefixo `admin:` no frontend para não colidirem.

## Tarefas

- `tasks/TaskService.java`: o estado inicial é sempre «Por fazer» e o criador é o utilizador
  autenticado (`created_by_id` para staff, `created_by_account_id` para administradores); o
  criador nunca muda. O autor de um comentário também é o autenticado (`author_id` /
  `author_account_id`). `GET /api/tasks/me` devolve quem está autenticado.
- O professor vê e altera só as tarefas dele (estado e comentários); não cria tarefas.

## Registo de notas, Histórico e portal do estudante

- `assessments/AssessmentService.java`: cada registo (`AssessmentSheet`) tem a sua lista de
  estudantes (`AssessmentSheetStudent`, com `created_at` e `completed_at`).
- **Concluir** (`POST /sheets/{id}/students/{studentId}/complete`) só aceita quando as 9
  avaliações (T1–T6, Exame1, Exame2, Trabalho) têm nota ou ausência (`-`).
- **Apagar** remove as notas do estudante (desaparecem também no portal dele). O professor só
  nas primeiras 24 horas e nunca depois de concluído; o administrador sem limite. Se o registo
  ficar sem estudantes, é apagado (e a aba desaparece).
- Notas mostra todos com a coluna **Estado** (Em curso / Concluído); **Histórico**
  (`AssessmentGradesPage mode="history"`) só os concluídos, sem acções.
- O portal do estudante lê estas notas em `portal/PortalService.java` (separadores Testes e Exames).

## Formatos e padrões de UI

- **Notas** (`utils/grade.js`): duas casas decimais (`0.00`, `10.00`, `1.05`) excepto o `20`, que
  aparece `20`. Usar sempre `formatGrade`/`displayGrade`, também nos portais e exportações.
- **Curso → categoria, nível e modalidade** (`utils/courseFilters.js`): ao escolher o curso os
  outros três campos preenchem-se sozinhos; mudar um deles passa para o curso do mesmo nome que
  corresponde à combinação. Usar em qualquer filtro com estes quatro campos.
- **Exportações em PDF** (`utils/dataExport.js`): título centrado, linha de separação, `details`
  (`[{label, value}]`, alinhados à esquerda com o título a negrito) e nova linha antes da tabela.
  Passar `details` ao `DataExportMenu`.
- **Quantidade com unidade** (`utils/quantity.js`): `2 - caixa(s)`; vazio mostra `N/A`.
- **Dados de consulta**: `components/DetailList.jsx`; fichas de estudante e de funcionário em
  separadores (Dados Pessoais, Endereço, Detalhes do Curso / Formação).

## Despesas: encaminhamento, compras e devoluções

- `expenses/ForwardableRecord.java` (superclasse de despesas, compras, devoluções e vendas):
  `forwarded_to_id`, `forward_status` (TODO/DONE), `forwarded_at`, `concluded_at`, `notes`.
- O administrador encaminha/reencaminha (`PUT /api/expenses/{kind}/{id}/forward`, kind =
  `requests|purchases|returns|sales`) para um funcionário «outros». O funcionário só vê o que lhe
  foi encaminhado (`GET /api/expenses/forwarded`), escreve anotações (`PUT .../notes`) e conclui
  (`POST .../conclude`). Anotações: coluna com caneta e olho, em diálogos
  (`pages/expenses/RecordNotes.jsx`), no sistema geral e nas Encaminhadas.
- **Compras**: nenhum campo obrigatório; texto vazio fica `N/A`; quantidade tem número e unidade;
  preços e quantidade podem ficar vazios. `expenses/ExpensesSchemaInitializer.java` retira os
  `NOT NULL` antigos ao arrancar.
- **Devoluções**: o formulário (`pages/expenses/ReturnRequestPage.jsx`) tem só o artigo (compra)
  e o **motivo**; os detalhes vêm da compra. Nascem **Pendente**. Menu: Devolução, Pendente,
  Devolvidos. O funcionário marca **Devolvido** ou **Rejeitado** (com *motivo de rejeição*
  obrigatório): `POST /api/expenses/returns/{id}/resolve`.
- Estados de Compras e Vendas ganham «Aprovado» por omissão (`statuses/StatusModules.java`).

## Multas por atraso das mensalidades

- Configurações > Multas > Definição: uma percentagem escrita à mão (0–100, 2 casas):
  `fines/FineSettings*`, API `/api/settings/fines`.
- `students/StudentFeeService.java` (`applyFine`): quando a mensalidade passa o prazo mais os dias
  de tolerância sem estar paga, grava-se **uma vez** `fine_amount = mensalidade × percentagem` e
  `fine_percent`. O saldo (`balance`) passa a ser mensalidade + multa − pago, por isso o portal
  do estudante e o Mobile Money já a incluem. Pagar a horas nunca leva multa.

## Repartição do sistema

- Configurações > Repartição (`pages/settings/partitions/PartitionSettingsManagement.jsx`): pede
  **nome da instituição**, **endereço** e **nome da base de dados** e lista as repartições.
- `partitions/PartitionService.java`: faz `CREATE DATABASE` (nome validado: minúsculas, números e
  `_`), cria na nova base só a tabela `system_instance` com a marca `is_partition = true`, o nome
  e o endereço, e regista a repartição em `system_partitions`. **Não copia nenhum dado nem
  utilizador.** O utilizador da base de dados precisa de permissão `CREATEDB`.
- A repartição é uma instalação independente: base de dados própria, **backend próprio** (processo à
  parte), segredo de autenticação próprio e pastas de ficheiros próprias. Cria as suas tabelas no
  primeiro arranque (`ddl-auto: update`) e, sem utilizadores, mostra o ecrã de criação do primeiro
  administrador. Numa repartição a página de Repartição fica toda desactivada e o servidor recusa
  repartir ou gerir repartições (`system_instance.is_partition = true`).
- **Tudo é automático** (`partitions/PartitionRuntime.java`): o utilizador e a palavra-passe da base
  de dados são os do sistema principal; a porta é a primeira livre a partir de 8100; o segredo é
  derivado (HMAC) do segredo do principal e do nome da base; as pastas ficam em
  `./partitions/<base>/` (configurável com `cacoin.partitions.root`) e o registo do arranque em
  `./partitions/<base>/backend.log`.
- **Arranque e paragem**: ao arrancar, o sistema principal arranca o backend de todas as repartições
  **activas** (`cacoin.partitions.autostart`, por omissão `true`) e pára-os quando ele pára. O
  processo usa o mesmo jar ou as mesmas classes que o principal. Activar/Desactivar na tabela
  arranca/pára o backend dessa repartição (`POST /api/settings/partitions/{id}/activate|deactivate`).
- A tabela mostra o **Estado** (Activo = a responder, A arrancar, Inactivo) e as acções **Ver**,
  **Criar administrador**, **Repor acesso do administrador** e **Activar/Desactivar**.
- **Palavra-passe**: repartir exige uma palavra-passe (`partitions/PartitionPassword.java`, variável
  `CACOIN_PARTITION_PASSWORD`; o valor por omissão está no código). O mesmo vale para repor o
  acesso. A verificação é feita no backend, antes de qualquer alteração.
- **Primeiro administrador**: depois de criar a repartição abre o diálogo «Novo Administrador».
  `POST /api/settings/partitions/{id}/admin` (`PartitionAdminService`) reencaminha o pedido para
  `POST /api/users/admins` do backend da repartição, que só o aceita enquanto não houver
  administrador, e espera pelo arranque dela (até 90 s). Devolve o código e a palavra-passe
  temporária, mostrados uma única vez. A mesma acção existe em cada linha da tabela.
- **Repor acesso** (conta bloqueada ou palavra-passe perdida): `POST
  /api/settings/partitions/{id}/admin/reset` escreve directamente na base de dados da repartição
  (`user_accounts`): nova palavra-passe temporária, conta activa e tentativas a zero. Funciona mesmo
  com a repartição parada.
- **Ecrã de entrada**: `GET /api/auth/institutions` (público) devolve as repartições activas. O
  login (`pages/auth/LoginPage.jsx`) mostra o seletor «Instituição» quando existem repartições. Ao
  escolher uma, o frontend passa a falar com o backend dela (`utils/institution.js`, chave
  `cacoin.apiBase`), limpa a sessão e recarrega. A lista fica guardada no navegador
  (`cacoin.institutions`) para se poder voltar ao principal estando numa repartição. O perfil da
  escola é guardado **por instituição** (`schoolProfileKey()`); usar sempre essa função em vez da
  chave fixa.
- Arranque **manual** (alternativa, por exemplo em produção sem o principal a gerir):

  ```powershell
  $env:CACOIN_DB_URL = "jdbc:postgresql://localhost:5432/<nome_da_base_de_dados>"
  $env:CACOIN_DB_USER = "postgres"
  $env:CACOIN_DB_PASSWORD = "<palavra-passe>"
  $env:SERVER_PORT = "8101"
  $env:CACOIN_AUTH_SECRET = "<segredo_proprio>"
  $env:CACOIN_FOLDER_ROOT = ".\data-<nome>\folders"
  $env:CACOIN_STAFF_STORAGE_ROOT = ".\data-<nome>\staff-documents"
  $env:CACOIN_REQUEST_STORAGE_ROOT = ".\data-<nome>\student-requests"
  mvn spring-boot:run
  ```

- `GET /api/auth/instance` (público) devolve a identidade; o frontend (`main.jsx`) copia o nome e
  o endereço da repartição para o perfil da escola quando este ainda está vazio.

## Apagar estudantes e funcionários

- Só se pode apagar nas **primeiras 24 horas** depois de criado (`common/DeleteWindow.java`). O
  servidor recusa depois disso e as respostas trazem `canDelete`; o botão Apagar só existe enquanto
  `canDelete` for verdadeiro e depois desaparece para sempre.

## Scripts SQL manuais (`backend/src/main/resources/db/manual/`)

O Hibernate (`ddl-auto: update`) cria tabelas e colunas novas, mas **não remove `NOT NULL`**.
Scripts desta série (executar à mão em bases antigas se necessário):

- `20261102_assessment_sheet_students_completion.sql` — datas de entrada e conclusão no registo de notas.
- `20261102_task_account_columns.sql` — conta que criou a tarefa / comentou.
- `20261103_expenses_forwarding.sql` — encaminhamento e anotações nos quatro tipos de despesa.
- `20261104_purchases_optional_fields.sql` — compras e devoluções sem campos obrigatórios.
- `20261105_late_fines.sql` — definição e colunas da multa.
- `20261106_system_partitions.sql` — identidade da instalação e registo de repartições.
- `20261107_add_mobile_money_wallet_credentials.sql` — credenciais do M-Pesa nas carteiras.
- `20261107_create_institution_site.sql` — website da instituição.

## Armadilhas conhecidas

- Ficheiros do projecto têm finais de linha CRLF; ao editar por script, preservar. O
  `.gitattributes` (`* text=auto`) faz o Git guardar tudo com LF no repositório.
- O segredo das sessões (`CACOIN_AUTH_SECRET`) é guardado em `data/auth-secret.key` quando não está
  definido: apagar o ficheiro termina todas as sessões. Cada repartição recebe o seu segredo.
- O login com um código desconhecido sincroniza as contas de estudantes e funcionários (consulta
  todas as pessoas), no máximo uma vez por 15 s (`AuthService.LAZY_SYNC_MILLIS`).
- Erros 5xx inesperados chegam ao ecrã com uma mensagem genérica (`config/SafeErrorAttributes`).
  Para mostrar uma mensagem ao utilizador, lance `ResponseStatusException` com o texto.
- A lista pública de carteiras (`GET /api/mobile-money/wallets`) não inclui a configuração do
  operador; essa só sai em `GET /api/settings/mobile-money`, e as chaves nunca saem do servidor.
- O frontend é um só `App.jsx` com `activeSection` (texto) em vez de rotas: um menu novo precisa de
  (1) o item em `Layout.jsx` ou `teacherNav.js`, (2) o `id` tratado em `App.jsx`.
- Em `Layout.jsx`, um grupo novo de Configurações tem de ser registado em todos os sítios onde
  aparecem os grupos de Configurações (lista de ligações, `isXSettingsSection`, as duas cadeias
  `||` e a lista de grupos). Copiar o padrão de `fineSettingsGroup`.
- Nunca confiar em nomes vindos do frontend como identidade: o servidor usa a conta autenticada
  (`AuditContext`, `TeacherContext`).

## Mobile Money (M-Pesa)

Os pagamentos por M-Pesa são cobranças reais à API aberta da Vodacom (C2B). As credenciais
(portal developer.mpesa.vm.co.mz) preenchem-se na aplicação, em Definições › Mobile Money ›
Carteiras › M-Pesa: ambiente (`sandbox` para testes, `production` para dinheiro real), código do
negócio, chave de API e chave pública. As chaves ficam guardadas na base de dados da instalação
(cada repartição tem as suas) e nunca voltam ao ecrã; para as substituir, cola-se a nova.

Sem credenciais, o pagamento falha com "O M-Pesa não está configurado". Se a resposta do pedido
se perder, o estado é confirmado na M-Pesa (consulta de estado). e-Mola e mKesh ainda não têm
ligação ao operador e falham com mensagem clara (nunca fingem sucesso).

`CACOIN_MOBILE_MONEY_MODE=simulated` (variável de ambiente) liga um simulador só para
desenvolvimento: aprova sem cobrar.
