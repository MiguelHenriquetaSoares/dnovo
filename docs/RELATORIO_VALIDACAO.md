# Relatório de validação

Data: 30/09/2026 — Parte 4 de 4.

## Ambiente

- Windows;
- Node.js 24.12.0;
- npm 11.6.2;
- JBR/OpenJDK 21.0.8 do Android Studio;
- Android SDK Platforms 35 e 36;
- nenhum aparelho listado pelo ADB durante a validação.

## Verificações automatizadas

| Comando | Resultado |
|---|---|
| `npm run typecheck` | APROVADO, sem erros |
| `npm test` | APROVADO, 5 arquivos e 27 testes |
| `npm run build` | APROVADO |
| `npx cap sync android` | APROVADO, plugins BLE e SQLite detectados |
| `gradlew testDebugUnitTest assembleDebug` | APROVADO, `BUILD SUCCESSFUL`, 170 tarefas |
| `git diff --check` | APROVADO, sem saída |
| busca por `fetch`, Axios, WebSocket e HTTP no código | nenhuma ocorrência |

APK:

- caminho: `android/app/build/outputs/apk/debug/app-debug.apk`;
- tamanho: 13.861.125 bytes;
- SHA-256: `C56399C803293A791F82FE942C15E8128D95570C9F7E53BD057CE0C9EAE0EC9B`.

Avisos conhecidos e não bloqueantes:

- chunk principal do Ionic maior que 500 kB no build Vite;
- aviso Gradle sobre `flatDir` vindo da estrutura gerada pelo Capacitor.

## Cobertura dos testes obrigatórios

| Cenário | Verificação automatizada | Verificação física |
|---|---|---|
| Criação da partida/anfitrião | regra pura da sala aprovada | pendente |
| Entrada do segundo jogador | regra pura da sala aprovada | pendente |
| Entrada de vários jogadores | 2 a 6 e recusa do sétimo | pendente |
| Recusa | duplicidade e sala cheia | recusa manual pendente |
| Distribuição | 2 a 6 jogadores aprovada | pendente |
| Troca e conservação | troca circular atômica aprovada | pendente |
| Fora do turno/repetida | motor e protocolo aprovados | pendente |
| Quatro cartas iguais | detecção e declaração aprovadas | pendente |
| Encerramento | vitória, cancelamento e interrupção aprovados | pendente |
| Desconexão | pausa lógica aprovada | pendente |
| Reconexão | membro conhecido/desconhecido testado | tentativas BLE pendentes |
| Salvamento | adaptador web/reabertura aprovado | SQLite Android pendente |
| Detalhes | consulta por ID aprovada | interface pendente |
| Exclusão | individual e limpeza aprovadas | confirmações visuais pendentes |
| Sem internet | arquitetura sem serviço remoto | modo avião pendente |

Testes automatizados não substituem a validação Bluetooth real.

## Validação física obrigatória

Status: **pendente**.

Motivo: `adb devices -l` não retornou aparelhos. Consequentemente, não foram validados:

- anúncio, scan e conexão entre dois celulares;
- partida completa com Wi-Fi e dados móveis desligados;
- estabilidade de mensagens pequenas;
- reconexão real;
- persistência SQLite após encerrar e reabrir o aplicativo;
- interface e dimensões de toque em tela física;
- prints, GIFs e vídeo.

O procedimento está em [TESTE_BLUETOOTH_DOIS_CELULARES.md](TESTE_BLUETOOTH_DOIS_CELULARES.md).

## Critério para mudar o checklist

Um item físico só pode mudar de 🟨/⬜ para ✅ depois que a equipe executar o roteiro, registrar aparelhos e versões, anexar evidência real e anotar o resultado neste documento.
