# Guia para apresentação oral individual

## Estrutura do projeto

“A interface está em `views` e `components`. As regras puras e os tipos ficam em `domain`. O protocolo e os transportes ficam em `bluetooth`. A coordenação da sala está em `lobby`, e o histórico em `persistence`. Essa separação permite testar as regras sem depender do celular.”

## Criação da sala

“O anfitrião cria um ID de partida, abre um servidor GATT e anuncia o UUID do serviço. Ele mantém a lista de jogadores e é a única autoridade para alterar o estado.”

## Conexão

“O convidado usa o plugin comunitário como central BLE: procura o serviço, conecta, lê a apresentação, assina notificações e envia uma solicitação. O anfitrião aceita ou recusa e vincula o dispositivo ao ID do jogador.”

## Distribuição

“O baralho tem quatro cartas por jogador, formado por quartetos completos. O anfitrião embaralha com Fisher–Yates, distribui quatro para cada pessoa e cria uma mensagem individual. Nenhuma mensagem pública contém as mãos adversárias.”

## Jogadas

“Na sua vez, o jogador envia o ID da carta e a rodada. O anfitrião valida remetente, partida, sequência, duplicidade, turno e posse. Depois da confirmação de todos, as cartas giram simultaneamente e cada um continua com quatro.”

## Sincronização

“O estado público informa rodada, vez e jogadores que já confirmaram. A mão local é enviada apenas ao destinatário. Mensagens maiores que o MTU são fragmentadas, remontadas e validadas.”

## Resultado

“A primeira declaração válida de quatro cartas iguais vence. O jogador anterior é penalizado com a próxima letra de BURRO. A condição documentada encerra a partida na primeira penalização.”

## Persistência

“Finalizações, cancelamentos e interrupções viram registros. No Android usamos SQLite; no navegador há um adaptador local apenas para desenvolvimento. O histórico mostra datas, participantes, ordem, vencedor, penalizado, rodadas, resultado local e motivo.”

## Limitações a declarar

“A reconexão é em primeiro plano, o anfitrião precisa suportar anúncio BLE e a partida não é restaurada se o processo do anfitrião morrer. A validação física só deve ser afirmada depois do teste em dois aparelhos.”

## Perguntas prováveis

- **Por que dois plugins?** O plugin comunitário implementa central, mas não o periférico/servidor exigido para o anfitrião.
- **Como evitam jogadas duplicadas?** ID único de mensagem, sequência crescente e registro no anfitrião.
- **Como protegem as mãos?** Estado público sem mãos e mensagens personalizadas por destinatário.
- **Como funciona offline?** BLE e SQLite são locais; não há chamada a servidor durante o jogo.
