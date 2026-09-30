# Decisões técnicas

## DT-001 — Base do aplicativo

**Decisão:** Vue 3.5, Ionic Vue 9, Capacitor 8 e TypeScript 5.9, com Vite 8 e Android como primeira plataforma.

**Motivo:** versões atuais e compatíveis entre si em 30/09/2026. O projeto exige Node 22.12 ou superior por causa do Vite; o ambiente possui Node 24.12.0.

## DT-002 — Arquitetura por responsabilidades

**Decisão:** separar `components`/`views` (interface), `domain` (modelos e regras puras), `bluetooth` (contratos e protocolo) e `persistence` (contrato e esquema local).

**Motivo:** a regra do jogo fica testável sem Ionic, Bluetooth ou banco de dados, e as integrações nativas podem ser substituídas por simuladores em testes.

## DT-003 — Topologia Bluetooth

**Decisão:** comunicação BLE em estrela, com anfitrião como periférico/servidor GATT e convidados como centrais/clientes GATT. Usar `@capacitor-community/bluetooth-le` 8.x no papel central e um plugin Capacitor Android local no papel periférico.

**Motivo:** o plugin indicado suporta somente o papel central e não anuncia serviço nem aceita conexões como servidor. O antigo `cordova-plugin-ble-peripheral` oferece essas operações, mas será evitado como dependência principal por não expor uma linha de compatibilidade explícita com Capacitor 8. Uma integração nativa pequena reduz a superfície e mantém controle sobre Android 12+.

**Consequência:** a criação de partida só poderá ser validada em aparelhos Android com suporte a múltiplos anúncios BLE. O plugin nativo foi implementado na Parte 2 e compilado no APK, mas ainda requer validação em dois aparelhos.

## DT-007 — Fragmentação e deduplicação BLE

**Decisão:** fragmentar JSON UTF-8 em frames binários compatíveis com o MTU mínimo, expirar transferências incompletas e aceitar cada mensagem somente uma vez por ID e sequência crescente.

**Motivo:** mensagens de sala podem ultrapassar os 20 bytes úteis do MTU BLE mínimo; IDs e sequência evitam reaplicar mensagens após retransmissão ou reconexão.

## DT-008 — Reconexão da sala

**Decisão:** realizar quatro tentativas em primeiro plano (1, 2, 4 e 8 segundos) e restaurar somente IDs que já pertenciam à sala e retornem pelo identificador BLE originalmente aceito.

**Motivo:** oferece recuperação curta sem manter serviço em segundo plano nem aceitar identidades desconhecidas.

## DT-004 — Estado autoritativo

**Decisão:** o anfitrião mantém o estado canônico, valida comandos e publica eventos/instantâneos. Mensagens possuem versão, ID e sequência.

**Motivo:** reduz divergências, bloqueia jogadas fora do turno no ponto central e permite ignorar mensagens duplicadas ou antigas.

## DT-005 — Persistência

**Decisão:** SQLite local por meio de `@capacitor-community/sqlite` 8.x. Dados compostos da partida ficam serializados como JSON, com colunas indexadas para status e datas.

**Motivo:** atende funcionamento offline, persistência após reinício e exclusões transacionais. Na Parte 3 o repositório Android foi implementado com `INSERT OR REPLACE`, consulta, exclusão individual e limpeza. No navegador, um adaptador `localStorage` permite desenvolvimento e testes sem fingir que ele valida o SQLite nativo.

## DT-006 — Privacidade das mãos

**Decisão:** o anfitrião envia a cada participante somente sua mão e informações públicas. Um instantâneo de reconexão também é personalizado por destinatário.

**Motivo:** evita expor cartas dos adversários no tráfego normal ou na interface.

## DT-009 — Troca circular atômica

**Decisão:** cada jogador confirma uma carta na ordem; as mãos só são alteradas depois da última confirmação da rodada, quando todas as cartas selecionadas giram simultaneamente.

**Motivo:** preserva exatamente quatro cartas por jogador durante toda a partida, mantém o total do baralho e torna claro o momento de envio e recebimento.

## DT-010 — Encerramento curto e penalidade

**Decisão:** a primeira declaração válida de quarteto vence. O jogador anterior na roda recebe a próxima letra de `BURRO`, e a partida termina nessa primeira penalização.

**Motivo:** é a condição alternativa de encerramento simples admitida pelo requisito, elimina ambiguidades de reação presencial e mantém a demonstração Bluetooth curta. Declarações concorrentes são desempatatadas pela ordem autoritativa do anfitrião.

## DT-011 — Ciclo de vida do histórico

**Decisão:** recarregar lista e detalhe com `onIonViewWillEnter`, e não somente no `mounted` do Vue.

**Motivo:** o `IonRouterOutlet` pode manter páginas em cache. A recarga a cada entrada garante que novas partidas e exclusões apareçam sem reiniciar a interface.

## DT-012 — Evidência física separada

**Decisão:** distinguir teste automatizado, compilação e validação física no checklist e no relatório.

**Motivo:** testes de regras e simulações não comprovam anúncio, rádio, permissões de fabricante, modo avião, dimensões de toque ou persistência SQLite após reinício. Esses itens permanecem pendentes até a equipe usar aparelhos reais.
