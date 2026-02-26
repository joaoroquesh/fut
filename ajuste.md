### Importação e Limpeza de Lista de Jogadores

- A funcionalidade de importar lista precisa remover automaticamente diversos elementos indesejados quando uma lista é colada
- Elementos a serem removidos: números no início de cada linha, emojis, traços, espaços antes dos nomes e informações entre parênteses
- Este ajuste facilita a importação de listas formatadas de diferentes fontes

### Contagem e Cálculo de Times

- Implementar exibição da contagem total de jogadores ao lado do campo onde são adicionados
- O sistema deve calcular automaticamente o número de times possíveis com base no número de jogadores por time escolhido
- Quando houver jogadores avulsos (não formam um time completo), mostrar formato "X times + Y pessoas" (ex: "3 times + 2 pessoas")
- Este cálculo deve ser dinâmico e atualizar conforme o número configurado de jogadores por time

### Lógica de Sorteio e Cabeças de Chave

- Os cabeças de chave (pessoas com estrelinha) devem ser distribuídos de forma equilibrada entre os times
- Importante: não precisam necessariamente estar nos primeiros times da lista - podem ser sorteados para qualquer posição
- O objetivo é equilibrar os times, não forçar uma ordem específica
- A distribuição destes jogadores especiais pode ser realmente aleatória, desde que fiquem separados entre si na medida do possível

### Fila de Espera e Gerenciamento de Lista

- A fila de espera deve ser uma lista ordenada completa incluindo tanto quem está jogando quanto quem está aguardando
- Quando jogadores saem do jogo, devem ir automaticamente para o final da fila de espera
- Adicionar divisórias visuais na fila de espera separando por times (baseado no número de jogadores por time)
- Atualmente há destaque apenas para os cinco primeiros (um time), mas precisa mostrar claramente a separação para todos os times subsequentes na fila

### Funcionalidades de Substituição

- Remover as setas que permitem mover pessoas manualmente na ordem da lista
- Implementar modal de confirmação quando for fazer substituição de pessoas, perguntando "Você realmente quer trocar essas duas pessoas de lugar?"
- Isso evita trocas acidentais
- Para jogadores na fila de espera, implementar o mesmo comportamento de substituição que existe para quem está no jogo
- É necessário clicar e segurar no nome da pessoa na fila de espera para aparecer a opção de substituir por outra pessoa

### Visualização de Resultados e Próximo Jogo

- Quando clica em "time venceu" ou "empate", abre modal mostrando o próximo jogo
- Os nomes neste modal precisam ser exibidos um abaixo do outro (formato vertical) ao invés de sequenciais, para melhorar a legibilidade

### Lógica de Empate (Ajuste Crítico)

- A lógica atual de empate está incorreta e precisa ser completamente reformulada
- Comportamento correto: quando há empate, apenas os dois times que jogaram devem ser embaralhados
- Estes dois times embaralhados devem ser colocados no final da lista
- O restante da fila de espera deve subir normalmente, como se fosse uma vitória simples
- Sequência correta: (1) embaralhar os dois times que empataram, (2) colocá-los no final da lista, (3) subir os próximos times da fila de espera
- Se houver dois times na fila de espera, eles entram para jogar; se não houver, continua com os times disponíveis
- O sistema atual está embaralhando todos os times, o que está errado - deve mexer apenas nos dois que jogaram
- Pessoas que acabaram de entrar no final da lista pelo resultado do empate podem estar misturadas na nova ordem