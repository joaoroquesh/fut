# PRD — Fut Shalom (Estado Atual)

> Documento de Engenharia Reversa | Versao do codigo: `main` @ 2026-02-26

---

## 1. Visao Geral do Produto

**Nome:** Fut Shalom

**Objetivo:** Aplicacao web mobile-first para organizacao de peladas/rachas de futebol em tempo real. Resolve o problema de gerenciar rodizio de times, fila de espera, cronometragem de partidas e equilibrio competitivo — tarefas normalmente feitas "de cabeca" pelo organizador.

**Contexto de uso:**
- Um organizador abre o app no celular, cadastra todos os jogadores presentes, define tamanho dos times e tempo de jogo
- O app sorteia times equilibrados (distribuindo jogadores "estrela") e monta uma fila de espera
- Durante o jogo: controle de placar, timer com alerta sonoro, e ao final, rotacao automatica dos times (vencedor fica, perdedor vai pra fila)
- Funciona 100% offline via `localStorage` — nao ha backend, autenticacao ou dependencia de rede

**Publico-alvo:** Organizadores de peladas/rachas de futsal ou society.

**Idioma da UI:** Portugues brasileiro.

---

## 2. Arquitetura e Stack Tecnologico

### 2.1 Stack

| Camada | Tecnologia |
|--------|-----------|
| Markup | HTML5 semantico |
| Estilo | CSS3 puro (custom properties, flexbox, @keyframes, media queries) |
| Logica | Vanilla JavaScript (ES6+), nenhum framework ou bundler |
| Persistencia | `localStorage` (chave: `futDaGalera`) |
| Audio | Web Audio API (oscillator para som de apito) |
| Haptics | `navigator.vibrate()` |

### 2.2 Estrutura de Arquivos

```
fut/
|-- index.html          # SPA — todo o markup (195 linhas)
|-- style.css           # Estilos completos (~1200 linhas)
+-- js/
    |-- utils.js        # Funcoes utilitarias puras (35 linhas)
    |-- state.js        # Estado global + persistencia (126 linhas)
    |-- stars.js        # Algoritmo de balanceamento de estrelas (138 linhas)
    |-- setup.js        # Tela de configuracao e sorteio (150 linhas)
    |-- config.js       # Configuracoes editaveis durante o jogo (98 linhas)
    |-- timer.js        # Timer, alerta sonoro e vibracao (103 linhas)
    +-- match.js        # Tela de jogo, resultado e interacoes (670 linhas)
```

### 2.3 Padrao Arquitetural

- **SPA com navegacao por classe CSS:** Telas sao `<div class="screen">`. A ativa recebe `.active` via `showScreen(id)`. Sem rotas, sem hash-routing.
- **Global scope:** Todos os 7 scripts carregam via `<script>` tags sequenciais. Funcoes e variaveis sao globais (nao usa modulos ES).
- **Ordem de carregamento** (critica — dependencias implicitas):
  1. `utils.js` — sem dependencias
  2. `state.js` — depende de `utils.js` (usa `renderPlayerList`, `showScreen`, etc.)
  3. `stars.js` — depende de `state.js` (acessa `starPlayers`, `playerQueue`, `playersPerTeam`)
  4. `setup.js` — depende de `utils.js`, `state.js`, `stars.js`
  5. `config.js` — depende de `state.js`, `stars.js`, `timer.js`
  6. `timer.js` — depende de `state.js`
  7. `match.js` — depende de todos os anteriores
- **Renderizacao imperativa:** Todo o HTML dinamico eh gerado via template strings com `innerHTML`. Nao ha virtual DOM ou diffing.

### 2.4 Persistencia

- **Chave localStorage:** `futDaGalera`
- **Formato:** JSON serializado com `JSON.stringify`
- **Dados persistidos:** `players`, `playersPerTeam`, `gameTimeMinutes`, `playerQueue`, `currentTeamA`, `currentTeamB`, `teamNameA`, `teamNameB`, `draftStarted`, `matchHistory`, `starPlayers`, `currentScreen`
- **Dados NAO persistidos:** `goalsA`, `goalsB`, `timerSeconds`, `timerRunning`, `swapSource`, `pendingResult`, `tempPlayersPerTeam`, `tempGameTime`
- **`saveState()`** eh chamada apos toda mutacao de estado relevante
- **`loadState()`** eh executada no `DOMContentLoaded` e restaura a tela exata onde o usuario estava
- **`clearAll()`** remove ambas as chaves (`futDaGalera` e `futWaiting` legado), reseta tudo para defaults

---

## 3. Mapeamento de Telas e Fluxos (UX/UI)

### 3.1 Tela de Configuracao (`#screen-setup`)

**Visibilidade:** Tela inicial. Sempre visivel quando `draftStarted === false`.

**Elementos:**
- **Titulo:** "Fut Shalom" (`<h1>`, cor laranja)
- **Jogadores por time:** Controle numerico `-`/`+` (range: 1-11, default: 6)
- **Tempo por jogo:** Controle numerico `-`/`+` em minutos (range: 1-60, default: 7)
- **Campo de adicao de jogador:** Input + botao `+`. Suporta Enter para adicionar.
- **Link "Importar lista":** Expande textarea para bulk import (um nome por linha)
- **Contador de jogadores:** Ex: "12 jogadores" (atualiza dinamicamente)
- **Tooltip de estrela:** Texto explicativo italizado em cinza
- **Lista de jogadores:** Tags clicaveis com `x` para remover. Clique no tag = toggle estrela.
  - Tag normal: fundo `#2A2A2A`, borda `#333`
  - Tag estrela: borda dourada `#FFD700`, fundo `rgba(255, 215, 0, 0.1)`, prefixo estrela
- **Botao "Sortear Times":** Primary (laranja), valida minimo de `playersPerTeam x 2` jogadores
- **Botao "Limpar Tudo":** Danger (vermelho), reseta toda a aplicacao

**Fluxo:**
1. Usuario adiciona jogadores (manual ou bulk)
2. Marca estrelas se desejar (toque no tag)
3. Configura tamanho do time e tempo
4. Clica "Sortear Times" -> vai para Tela 2

### 3.2 Tela de Times Sorteados (`#screen-teams`)

**Visibilidade:** Apos o sorteio, antes de iniciar o jogo.

**Elementos:**
- **Titulo:** "Times Sorteados"
- **Cards de time:** Dois cards empilhados verticalmente, borda-esquerda laranja. Cada card mostra nome do time e lista de jogadores (com prefixo estrela para star players).
- **Fila de espera:** Lista numerada. Os primeiros `playersPerTeam` jogadores sao destacados com borda-esquerda laranja e cor branca (indicam o proximo time). Estrelas tambem sao indicadas.
- **Botao "Voltar":** Secondary, volta para Tela 1 (`draftStarted = false`)
- **Botao "Iniciar Jogo":** Primary, vai para Tela 3

### 3.3 Tela de Jogo (`#screen-match`)

Tela mais complexa. Possui **duas views** controladas por tabs.

#### 3.3.1 Tab "Jogo" (`#matchGameView`)

**Elementos de cima para baixo:**

1. **Tabs de navegacao:** "Jogo" (ativa) | "Historico"

2. **Cards dos times lado a lado:**
   - Nome do time editavel (clique -> `prompt()`, sufixo icone de edicao)
   - Lista vertical de jogadores
   - Cada jogador eh clicavel (selecao para swap) e suporta long-press (500ms -> modal de acoes)
   - Jogador selecionado para swap: fundo laranja

3. **Secao de placar:**
   - Nome do time como label
   - Controles `-`/`+` para cada time
   - Placar grande no centro (`font-size: 2.2rem`)
   - Separador "x" entre os placares

4. **Timer:**
   - Display grande (`4rem`, `font-variant-numeric: tabular-nums`)
   - Formato: `MM:SS`
   - Animacao de pulso (`opacity`) quando rodando
   - Quando termina: cor laranja, texto "Fim!"
   - Botoes: "Iniciar"/"Pausar"/"Continuar" + "Reiniciar"

5. **Secao de resultado:**
   - Titulo "Resultado"
   - 3 botoes: `[Time A Venceu]` `[Empate]` `[Time B Venceu]`
   - Todos cinza por default. O botao sugerido pelo placar recebe destaque laranja (`.suggested`)
   - Clique -> abre modal de confirmacao (nao aplica diretamente)

6. **Fila de espera interativa:**
   - Lista numerada com setas para reordenacao (cima/baixo)
   - Cada jogador eh clicavel para swap
   - Primeiros `playersPerTeam` jogadores destacados; primeiro tem badge "proximo time"
   - Estrelas exibidas com indicador visual

7. **Adicionar jogador na fila:**
   - Checkbox estrela + input de nome + botao `+`
   - Duplicata -> flash vermelho com shake no input
   - Jogador eh adicionado tanto em `playerQueue` quanto em `players` (lista mestre)

8. **Link "Configuracoes":**
   - Expande painel com controles de jogadores por time e tempo
   - Usa valores temporarios (`tempPlayersPerTeam`, `tempGameTime`) — alteracoes NAO sao imediatas
   - Botao "Salvar" aplica: adapta tamanhos dos times, rebalanceia estrelas, reseta timer

9. **Botao "Voltar ao Sorteio":** Retorna para Tela 2

#### 3.3.2 Tab "Historico" (`#matchHistoryView`)

**Elementos:**
- Lista de cards em ordem decrescente (jogo mais recente primeiro)
- Cada card contem:
  - Numero do jogo ("Jogo 1", "Jogo 2", etc.)
  - Badge de resultado: "Empate" (cinza) ou "[Time] venceu" (laranja)
  - Placar: `[Time A] goalsA x goalsB [Time B]`
  - Lista de jogadores de cada time separada por "vs"
- Se vazio: mensagem "Nenhum jogo registrado ainda."

### 3.4 Modais

#### 3.4.1 Modal de Acoes do Jogador (`#playerActionModal`)

**Trigger:** Long-press (500ms) em jogador dos times na tela de jogo.

**Conteudo:**
- Header com nome do jogador + botao `x` para fechar
- Opcao "Renomear" -> `prompt()` para novo nome. Atualiza em `currentTeam`, `players` e `starPlayers`.
- Se ha jogadores na fila: divider + subtitle "Substituir por:" + lista de jogadores da fila como botoes (mostrando estrelas). Clicar faz swap direto do jogador do time com o jogador escolhido da fila.
- Fechar: clique no `x`, clique fora do modal (overlay)

#### 3.4.2 Modal de Confirmacao de Resultado (`#resultConfirmModal`)

**Trigger:** Clique em qualquer botao de resultado.

**Conteudo:**
- Header "Confirmar Resultado" + `x`
- Texto do resultado em laranja ("Empate" ou "[Time] Venceu")
- Placar formatado: `Time A goalsA x goalsB Time B`
- Divider
- "Proximo jogo:" com preview dos dois novos times (incluindo indicadores de estrela)
- Footer: "Cancelar" (secondary) + "Confirmar" (primary)

**Comportamento critico:** O proximo estado eh **pre-calculado** (`computeNextState`) e armazenado em `pendingResult` NO MOMENTO da abertura do modal. Ao confirmar, aplica-se exatamente o estado pre-calculado (nao recalcula). Isso garante que o que o usuario ve no modal eh identico ao que sera aplicado.

---

## 4. Funcionalidades Principais

### 4.1 Gestao de Jogadores

| Feature | Descricao |
|---------|-----------|
| Adicao manual | Input de texto + Enter ou botao `+`. Valida nome vazio e duplicatas. |
| Importacao em lote | Textarea para colar lista de nomes (um por linha). Ignora duplicatas silenciosamente. |
| Remocao | Botao `x` na tag. Remove de `players` e `starPlayers`. |
| Marcacao como estrela | Toque na tag do jogador alterna status estrela. Visual: borda dourada + indicador. |
| Contagem dinamica | Exibe "N jogadores" (ou "N jogador" no singular). |
| Renomeacao | Via long-press na tela de jogo -> modal -> "Renomear". Atualiza em `players`, `currentTeam` e `starPlayers`. |
| Adicao a fila durante jogo | Input na tela de match com checkbox de estrela. Verifica duplicata contra times e fila. Feedback visual em erro (borda vermelha + shake). |

### 4.2 Sorteio e Balanceamento

| Feature | Descricao |
|---------|-----------|
| Sorteio balanceado | `balancedDistribute()` distribui estrelas em round-robin por TODOS os times (nao apenas os 2 primeiros). |
| Validacao minima | Requer pelo menos `playersPerTeam x 2` jogadores para sortear. |
| Fila com sobras | Jogadores que nao cabem em times completos vao para `playerQueue`. |

### 4.3 Timer e Alertas

| Feature | Descricao |
|---------|-----------|
| Contagem regressiva | Baseada em `gameTimeMinutes`, decrementa `timerSeconds` a cada 1s via `setInterval`. |
| Estados | Iniciar / Pausar / Continuar / Fim |
| Alerta sonoro | Web Audio API: 3 tons de apito (800Hz->600Hz) com delays de 0, 0.4s, 0.8s. Cada tom dura 0.35s, frequencia desce linearmente de 800 para 600Hz, ganho de 0.4 com decay exponencial. |
| Vibracao | Padrao `[300, 100, 300, 100, 300]` ms via `navigator.vibrate()`. |
| Alerta visual | Classe `.timer-ended-glow` aplica `box-shadow: inset` pulsante laranja no `#screen-match`. Animacao `border-glow` 2s ease-in-out infinite. |
| Animacao em execucao | Classe `.timer-running` aplica pulsacao de opacidade (0.5 a 1) no display do timer. |
| Reset | "Reiniciar" reseta timer E placar (ambos via `resetGoals()`). |

### 4.4 Placar e Resultado

| Feature | Descricao |
|---------|-----------|
| Controle de gols | `-`/`+` por time, minimo 0. |
| Highlight automatico | Botao de resultado sugerido pelo placar recebe `.suggested` (glow laranja). Reavaliado a cada mudanca de gol. |
| Confirmacao antes de aplicar | Clique no resultado abre modal com preview dos proximos times. |
| Feedback visual | Apos confirmar, botao recebe `.selected` (fundo laranja solido) por 400ms antes da transicao. |

### 4.5 Swap e Substituicao

| Feature | Descricao |
|---------|-----------|
| Swap por clique | Clique em jogador -> seleciona (destaque laranja). Clique em outro -> troca. Funciona entre times, dentro do mesmo time, e entre time e fila. |
| Desselecionar | Clicar no mesmo jogador selecionado cancela a selecao. |
| Substituicao via long-press | Long-press -> modal com lista de jogadores da fila para substituicao direta. |
| Prevencao de conflito | Flag `longPressTriggered` impede que o click handler dispare apos um long-press. |

### 4.6 Fila de Espera

| Feature | Descricao |
|---------|-----------|
| Fila plana individual | Array de strings (`string[]`), nao agrupado em times. |
| Reordenacao | Setas cima/baixo para mover jogadores na fila. |
| Indicacao visual | Primeiros `playersPerTeam` destacados com borda laranja. Primeiro da lista tem badge "proximo time". |
| Exibicao de estrelas | Indicador visual prefixado no nome de jogadores estrela na fila. |

### 4.7 Configuracao em Tempo de Jogo

| Feature | Descricao |
|---------|-----------|
| Painel expansivel | Link "Configuracoes" expande/colapsa o painel. |
| Valores temporarios | `+`/`-` modificam `tempPlayersPerTeam`/`tempGameTime`, NAO o estado real. |
| Botao "Salvar" | Aplica as mudancas: adapta times, rebalanceia estrelas, reseta timer se tempo mudou. Fecha o painel. |
| Adaptacao de times | `adaptTeamsToNewSize()`: aumento -> puxa da fila; diminuicao -> devolve pra fila. |
| Sincronizacao | Apos salvar, atualiza tambem os controles da tela de setup. |

### 4.8 Historico

| Feature | Descricao |
|---------|-----------|
| Registro automatico | Cada resultado confirmado eh adicionado a `matchHistory`. |
| Dados por partida | Nome dos times, gols, resultado ('A', 'B', 'draw'), snapshot dos jogadores. |
| Persistencia | Salvo no `localStorage` junto com todo o estado. |
| Ordenacao | Exibido do mais recente para o mais antigo. |

### 4.9 Nomes de Time Editaveis

| Feature | Descricao |
|---------|-----------|
| Edicao | Clique no nome do time (com icone de edicao) -> `prompt()` com nome atual. |
| Propagacao | Atualiza labels de placar, botoes de resultado, e modal de confirmacao. |
| Reset | Novos times recebem nome "Novo Time". Times iniciais sao "Time A" / "Time B". |

---

## 5. Regras de Negocio

### 5.1 Sorteio Inicial (`startDraft` em `js/setup.js`)

**Pre-condicao:** `players.length >= playersPerTeam * 2`

**Algoritmo — `balancedDistribute(allPlayers, stars, teamSize)` em `js/stars.js`:**
1. Calcula `numTeams = floor(allPlayers.length / teamSize)`
2. Separa jogadores em duas listas: `starList` (estrelas presentes em allPlayers) e `nonStarList` (demais)
3. Embaralha ambas as listas com Fisher-Yates (`shuffleArray` em `js/utils.js`)
4. Cria `numTeams` arrays vazios
5. **Distribuicao de estrelas (round-robin):** Para cada estrela no indice `i`, coloca no time `i % numTeams`. Se o time estiver cheio, busca o proximo com vaga (loop circular).
6. **Preenchimento:** Preenche vagas restantes de cada time com nao-estrelas na ordem embaralhada.
7. Retorna `{ teams: string[][], remaining: string[] }`

**Aplicacao no `startDraft()`:**
- `teams[0]` -> `currentTeamA`
- `teams[1]` -> `currentTeamB`
- `[...teams[2..N].flat(), ...remaining]` -> `playerQueue`
- Nomes resetados para "Time A" / "Time B"
- `matchHistory` zerado
- `draftStarted = true`

### 5.2 Resultado: Vitoria (Time A ou B vence)

**Fluxo em `computeNextState(result)` (`js/match.js`) para `result === 'A'` ou `'B'`:**

1. Identifica `winner` (time vencedor, copia) e `loser` (time perdedor, copia)
2. Jogadores do `loser` vao para o **final** da fila: `tempQueue = [...playerQueue, ...loser]`
3. Se `tempQueue.length >= playersPerTeam`:
   - Pega os primeiros `playersPerTeam` jogadores da fila como `newTeam`
   - **Balanceamento de estrelas vs vencedor:**
     - Conta estrelas no `winner` e no `newTeam`
     - Se `diff = newTeamStars - winnerStars > 1`: swap estrela do `newTeam` por nao-estrela mais atras na fila (repete `ceil(diff/2)` vezes)
     - Se `diff < -1`: swap nao-estrela do `newTeam` por estrela mais atras na fila (repete `ceil(|diff|/2)` vezes)
   - Resultado: `nextTeamA = winner`, `nextTeamB = newTeam`, `nextQueue = restante da fila`
   - Nomes: `nextNameA = winnerName`, `nextNameB = "Novo Time"`
4. Se `tempQueue.length < playersPerTeam`:
   - Vencedor permanece
   - Se sobram exatamente `playersPerTeam` jogadores -> formam o Time B
   - Senao -> perdedor original volta como Time B (fila esvaziada)

**Principio:** O vencedor SEMPRE fica na quadra. O perdedor SEMPRE vai para o final da fila. O proximo time eh formado com balanceamento de estrelas.

### 5.3 Resultado: Empate

**Fluxo em `computeNextState('draw')` (`js/match.js`):**

1. Junta jogadores de ambos os times: `allPlayers = [...teamA, ...teamB]`
2. Embaralha com Fisher-Yates
3. Coloca todos no final da fila: `tempQueue = [...playerQueue, ...allPlayers]`
4. Chama `balancedDistribute(tempQueue, starPlayers, playersPerTeam)` para formar TODOS os times possiveis com estrelas balanceadas
5. Resultado:
   - `teams[0]` -> `nextTeamA`
   - `teams[1]` -> `nextTeamB`
   - `[...teams[2..N].flat(), ...remaining]` -> `nextQueue`
   - Ambos os nomes: "Novo Time"

**Principio:** Em empate, NENHUM time permanece. Todos voltam a fila e times sao refeitos a partir da frente da fila com distribuicao balanceada de estrelas por TODOS os times (incluindo os "virtuais" na fila).

### 5.4 Formacao Balanceada de Time vs Vencedor (`formBalancedTeamFromQueue` em `js/stars.js`)

> Nota: Esta funcao existe em `stars.js` mas no fluxo atual de resultado a logica eh duplicada inline dentro de `computeNextState`. A funcao standalone eh usada internamente por `rebalanceStars`.

**Algoritmo:**
1. Remove os primeiros `playersPerTeam` da fila como `newTeam`
2. Conta estrelas no `winnerTeam` e no `newTeam`
3. Calcula `diff = newTeamStars - winnerStars`
4. Se `diff > 1`: Troca estrela no `newTeam` por nao-estrela na fila restante (ate `ceil(diff/2)` vezes)
5. Se `diff < -1`: Troca nao-estrela no `newTeam` por estrela na fila restante (ate `ceil(|diff|/2)` vezes)
6. Retorna o `newTeam` (fila eh modificada in-place)

**Tolerancia:** Permite diferenca de ate 1 estrela entre os times. So tenta corrigir quando a diferenca eh maior que 1.

### 5.5 Adaptacao Dinamica de Tamanho dos Times (`adaptTeamsToNewSize` em `js/config.js`)

**Trigger:** Botao "Salvar" no painel de configuracoes da tela de jogo.

**Aumento (newSize > oldSize):**
- Para cada posicao adicional (`needed = newSize - oldSize`):
  - Retira 1 jogador da frente da fila -> adiciona ao Time A
  - Retira 1 jogador da frente da fila -> adiciona ao Time B
- Se a fila acabar, os times ficam com tamanhos desiguais (sem erro)

**Diminuicao (newSize < oldSize):**
- Remove os ultimos `excess = oldSize - newSize` jogadores de cada time via `splice(newSize, excess)`
- Os removidos sao inseridos NO INICIO da fila: `[...removidosA, ...removidosB, ...filaAnterior]`

**Apos adaptacao:** `rebalanceStars()` eh chamada para redistribuir estrelas entre todos os times.

### 5.6 Rebalanceamento Global de Estrelas (`rebalanceStars` em `js/stars.js`)

**Trigger:** Apos `adaptTeamsToNewSize` via "Salvar" configuracoes.

**Algoritmo:**
1. Junta todos: `allPlayers = [...currentTeamA, ...currentTeamB, ...playerQueue]`
2. Chama `balancedDistribute(allPlayers, starPlayers, playersPerTeam)`
3. Se `teams.length >= 2`: aplica `teams[0]` -> `teamA`, `teams[1]` -> `teamB`, resto -> `queue`
4. Caso contrario: mantem estado atual (sem modificacao)

### 5.7 Pre-calculo de Resultado (`pendingResult` pattern em `js/match.js`)

**Problema resolvido:** Garantir que o modal de confirmacao mostra exatamente o que sera aplicado (evitar dois calculos com shuffles diferentes).

**Fluxo:**
1. `setResult(result)` -> chama `showResultConfirmationModal(result)`
2. `showResultConfirmationModal` chama `computeNextState(result)` UMA VEZ
3. O resultado eh armazenado em `pendingResult` (variavel global)
4. Modal renderiza a partir de `pendingResult`
5. Se "Confirmar": `confirmResult()` -> delay 400ms -> `applyPendingResult()` aplica `pendingResult` sem recalcular
6. Se "Cancelar": `pendingResult = null`, nada acontece

---

## 6. Estrutura de Estado (State Management)

### 6.1 Estado Persistido (salvos no localStorage)

| Variavel | Tipo | Default | Descricao |
|----------|------|---------|-----------|
| `players` | `string[]` | `[]` | Lista mestre de todos os jogadores cadastrados |
| `playersPerTeam` | `number` | `6` | Quantos jogadores por time |
| `gameTimeMinutes` | `number` | `7` | Duracao da partida em minutos |
| `playerQueue` | `string[]` | `[]` | Fila de espera plana (individual, nao por time) |
| `currentTeamA` | `string[] \| null` | `null` | Jogadores do Time A |
| `currentTeamB` | `string[] \| null` | `null` | Jogadores do Time B |
| `teamNameA` | `string` | `'Time A'` | Nome editavel do Time A |
| `teamNameB` | `string` | `'Time B'` | Nome editavel do Time B |
| `draftStarted` | `boolean` | `false` | Flag: sorteio ja aconteceu? |
| `matchHistory` | `MatchRecord[]` | `[]` | Historico de partidas |
| `starPlayers` | `string[]` | `[]` | Lista de nomes de jogadores marcados como estrela |
| `currentScreen` | `string` | `'screen-setup'` | ID da tela ativa (para restauracao) |

### 6.2 Estado Transiente (nao persistido, resetado ao recarregar)

| Variavel | Tipo | Default | Descricao |
|----------|------|---------|-----------|
| `goalsA` | `number` | `0` | Gols do Time A na partida atual |
| `goalsB` | `number` | `0` | Gols do Time B na partida atual |
| `timerInterval` | `number \| null` | `null` | ID do `setInterval` do timer |
| `timerSeconds` | `number` | `0` | Segundos restantes no timer |
| `timerRunning` | `boolean` | `false` | Timer esta rodando? |
| `swapSource` | `object \| null` | `null` | Jogador selecionado para swap. Formato: `{ team, index }` ou `{ queueIdx }` |
| `longPressTimer` | `number \| null` | `null` | ID do `setTimeout` do long-press |
| `longPressTriggered` | `boolean` | `false` | Long-press foi disparado? (evita click apos long-press) |
| `tempPlayersPerTeam` | `number \| null` | `null` | Valor temporario do config de match (antes de salvar) |
| `tempGameTime` | `number \| null` | `null` | Valor temporario do config de match (antes de salvar) |
| `pendingResult` | `object \| null` | `null` | Estado pre-calculado para confirmacao de resultado |

### 6.3 Formato de `MatchRecord` (cada item de `matchHistory`)

```javascript
{
  teamA: string       // Nome do Time A
  teamB: string       // Nome do Time B
  goalsA: number      // Gols do Time A
  goalsB: number      // Gols do Time B
  result: 'A' | 'B' | 'draw'  // Resultado
  playersA: string[]  // Snapshot dos jogadores do Time A
  playersB: string[]  // Snapshot dos jogadores do Time B
}
```

### 6.4 Formato de `pendingResult` (estado pre-calculado)

```javascript
{
  result: 'A' | 'B' | 'draw'
  goalsA: number
  goalsB: number
  prevTeamA: string         // Nome do time A antes
  prevTeamB: string         // Nome do time B antes
  prevPlayersA: string[]    // Jogadores do time A antes
  prevPlayersB: string[]    // Jogadores do time B antes
  nextTeamA: string[]       // Jogadores do proximo time A
  nextTeamB: string[]       // Jogadores do proximo time B
  nextQueue: string[]       // Fila apos a transicao
  nextNameA: string         // Nome do proximo time A
  nextNameB: string         // Nome do proximo time B
}
```

---

## Apendice A: Mapeamento Completo de Funcoes por Arquivo

### `js/utils.js`
| Funcao | Descricao |
|--------|-----------|
| `escapeHtml(text)` | XSS-safe: cria textNode e retorna innerHTML |
| `escapeJs(text)` | Escapa `\` e `'` para uso em strings inline JS |
| `shuffleArray(arr)` | Fisher-Yates shuffle in-place, retorna o array |
| `showScreen(id)` | Remove `.active` de todas as `.screen`, adiciona no alvo |
| `showError(msg)` | Exibe msg no `#setupError` |
| `clearError()` | Limpa `#setupError` |

### `js/state.js`
| Funcao | Descricao |
|--------|-----------|
| `saveState()` | Serializa estado em JSON e grava no localStorage |
| `loadState()` | Restaura estado do localStorage, renderiza tela correta. Retorna `boolean`. |
| `clearAll()` | Limpa localStorage e reseta todas as variaveis para defaults |

### `js/stars.js`
| Funcao | Descricao |
|--------|-----------|
| `toggleStar(name)` | Alterna estrela, re-renderiza e salva |
| `balancedDistribute(allPlayers, stars, teamSize)` | Distribui estrelas via round-robin em N times |
| `formBalancedTeamFromQueue(winnerTeam)` | Forma time da fila balanceado vs vencedor. Modifica `playerQueue` in-place. |
| `rebalanceStars()` | Reconstroi todos os times com estrelas redistribuidas |

### `js/setup.js`
| Funcao | Descricao |
|--------|-----------|
| `addPlayer()` | Adiciona jogador do input, valida duplicata |
| `removePlayer(name)` | Remove de `players` e `starPlayers` |
| `renderPlayerList()` | Renderiza tags de jogadores com estrelas e contador |
| `toggleBulkImport()` | Expande/colapsa textarea de bulk import |
| `processBulkImport()` | Processa nomes da textarea, ignora duplicatas |
| `startDraft()` | Valida, chama `balancedDistribute`, configura times e fila |
| `renderTeamsScreen()` | Renderiza tela de times sorteados + fila |
| `renderTeamCard(title, teamPlayers)` | Gera HTML de um card de time |

### `js/config.js`
| Funcao | Descricao |
|--------|-----------|
| `adjustNumber(id, delta)` | Controle numerico da tela de setup (aplica imediatamente) |
| `toggleMatchConfig()` | Expande config no match, inicializa temps |
| `adjustMatchConfig(id, delta)` | Altera apenas valores temporarios |
| `applyMatchConfig()` | Aplica temps: adapta times, rebalanceia, reseta timer |
| `adaptTeamsToNewSize(oldSize, newSize)` | Ajusta times adicionando/removendo jogadores da fila |

### `js/timer.js`
| Funcao | Descricao |
|--------|-----------|
| `resetTimerState()` | Reseta timer para `gameTimeMinutes * 60` |
| `toggleTimer()` | Alterna entre iniciar e pausar |
| `startTimer()` | Inicia contagem regressiva com `setInterval` 1s |
| `pauseTimer()` | Pausa timer |
| `resetTimer()` | Reseta timer e placar |
| `updateTimerDisplay()` | Atualiza `MM:SS` no DOM |
| `playTimerEndAlert()` | Dispara som + vibracao + glow |
| `playWhistle(ctx, delay)` | Toca um tom de apito via Web Audio API |
| `removeTimerEndedGlow()` | Remove classe `.timer-ended-glow` |

### `js/match.js`
| Funcao | Descricao |
|--------|-----------|
| `startMatch()` | Reseta gols, swap, glow. Renderiza e mostra tela de jogo |
| `goBack()` | Para timer, volta para tela de times |
| `goBackToSetup()` | Volta para setup (draftStarted = false) |
| `showMatchTab(tab)` | Alterna entre tab Jogo e Historico |
| `renderMatchScreen()` | Renderiza times, placar, fila, config. Maior funcao. |
| `editTeamName(team)` | `prompt()` para editar nome do time |
| `adjustGoals(team, delta)` | Incrementa/decrementa gols |
| `resetGoals()` | Zera ambos os placares |
| `updateResultHighlight()` | Destaca botao de resultado sugerido pelo placar |
| `addPlayerToQueue()` | Adiciona jogador a fila com suporte a estrela e validacao |
| `selectPlayerForSwap(team, index)` | Seleciona ou troca jogador do time |
| `selectQueuePlayerForSwap(queueIdx)` | Seleciona ou troca jogador da fila |
| `performSwap(targetTeam, targetIndex)` | Executa swap entre jogadores de times/fila |
| `performSwapWithQueue(queueIdx)` | Executa swap especificamente com jogador da fila |
| `startLongPress(team, index, event)` | Inicia deteccao de long-press (500ms). `preventDefault` apenas em touch. |
| `cancelLongPress()` | Cancela timeout de long-press |
| `showPlayerActionModal(playerName, team, index)` | Mostra modal com opcoes Renomear e Substituir |
| `closePlayerActionModal()` | Fecha o modal de acoes |
| `renamePlayerAction(team, index)` | Renomeia jogador via prompt |
| `substitutePlayer(team, index, queueIdx)` | Substitui jogador do time por alguem da fila |
| `moveQueuePlayer(fromIdx, direction)` | Move jogador na fila (cima/baixo) |
| `setResult(result)` | Ponto de entrada: abre modal de confirmacao |
| `computeNextState(result)` | Pre-calcula proximos times, fila e nomes |
| `showResultConfirmationModal(result)` | Mostra modal com preview pre-calculado |
| `confirmResult()` | Feedback visual + aplica resultado pre-calculado |
| `applyPendingResult()` | Grava historico e aplica estado de `pendingResult` |
| `cancelResult()` | Fecha modal e limpa `pendingResult` |
| `renderHistory()` | Renderiza cards de historico (mais recente primeiro) |

---

## Apendice B: Design System

### Paleta de Cores (CSS Custom Properties em `:root`)

| Variavel | Valor | Uso |
|----------|-------|-----|
| `--orange` | `#FF6B00` | Cor primaria (CTAs, titulos, destaques) |
| `--orange-dark` | `#E05E00` | Hover em botoes primarios |
| `--black` | `#1A1A1A` | Fundo principal do body |
| `--black-light` | `#2A2A2A` | Cards, inputs, modais, fila |
| `--white` | `#FFFFFF` | Texto principal |
| `--gray` | `#888888` | Labels, texto secundario, bordas |
| `--gray-light` | `#F0F0F0` | (declarado, nao utilizado atualmente) |
| `--gold` | `#FFD700` | Borda de jogador estrela |

### Breakpoints Responsivos

| Media Query | Aplicacao |
|------------|-----------|
| `max-width: 500px` | Mobile: body padding 12px, fontes menores, botoes maiores (48px), resultado empilhado verticalmente, `#screen-match` padding 10px 12px |
| `pointer: coarse` | Touch devices: alvos de toque maiores (48px controles, 8px/14px tags, 32x28px setas fila) |
| `env(safe-area-inset-bottom)` | Notch phones: padding-bottom extra no body |

### Animacoes CSS

| Nome | Keyframes | Aplicacao |
|------|-----------|-----------|
| `border-glow` | `box-shadow: inset 0 0 20px` <-> `40px` rgba laranja | Glow no `#screen-match` quando timer termina (2s ease-in-out infinite) |
| `pulse` | `opacity: 1` <-> `0.5` | Timer em execucao (1.5s ease-in-out infinite) |
| `input-shake` | `translateX: 0` -> `-4px` -> `4px` -> `0` | Input com erro de duplicata na fila (0.4s ease, unica vez) |

### Tipografia

- Font stack: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- Timer: `font-variant-numeric: tabular-nums` (alinhamento de digitos)
- iOS zoom prevention: inputs com `font-size: 16px` no mobile
