# Regras implementadas

Status: Parte 4 de 4. As regras puras estão cobertas por testes automatizados; a partida Bluetooth completa ainda precisa ser validada em dois ou mais celulares.

## Baralho e objetivo

- Participam de 2 a 6 jogadores.
- O baralho usa tantos valores quanto jogadores. Para cada valor entram os quatro naipes; portanto há exatamente quatro cartas por jogador e todos os quartetos são possíveis.
- O baralho é embaralhado com Fisher–Yates e cada jogador recebe quatro cartas.
- O objetivo é possuir quatro cartas do mesmo valor e declarar o quarteto.

## Rodada e troca

1. A ordem da sala define uma roda fixa. O anfitrião é o primeiro.
2. Na sua vez, o jogador escolhe uma das quatro cartas e confirma.
3. A carta fica comprometida no anfitrião, mas não é revelada aos outros jogadores.
4. Após todos confirmarem, o anfitrião executa uma troca atômica: cada carta vai ao próximo jogador e cada jogador recebe do anterior.
5. Todos continuam com quatro cartas e uma nova rodada começa pelo primeiro jogador.

O anfitrião rejeita carta inexistente, rodada antiga, remetente divergente, mensagem duplicada, jogada repetida ou fora do turno. Uma desconexão pausa novas ações até a reconexão.

## Vitória, penalidade e empate

- A primeira declaração válida que o anfitrião processar vence a partida.
- O jogador anterior ao vencedor na roda é o penalizado, pois foi dele que veio a última carta possível, e recebe a próxima letra de **BURRO**.
- Para manter partidas curtas nesta atividade, foi adotada a condição alternativa de encerramento permitida pelo requisito: a partida termina na primeira penalização. O histórico registra a letra obtida; uma nova partida começa com penalidades zeradas.
- Não há empate: se declarações chegarem próximas, os IDs, sequências e a ordem de processamento do anfitrião determinam uma única primeira declaração válida. As posteriores encontram a partida finalizada e são rejeitadas.
- Se um convidado abandonar, a partida fica `INTERROMPIDA`; se o anfitrião encerrar, fica `CANCELADA`; falha definitiva de reconexão fica `INTERROMPIDA`.

## Privacidade

O anfitrião conserva todas as mãos para validar as regras. Cada mensagem de início, troca ou sincronização é criada individualmente para o destinatário com apenas `maoLocal`. O estado público contém nomes, ordem, turno, rodada e quem já confirmou, mas não contém cartas nem IDs das cartas escolhidas.
