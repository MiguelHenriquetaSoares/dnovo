# Checklist dos requisitos

Atualizado em: 30/09/2026 — Parte 4 de 4.

Legenda:

- ⬜ **Não implementado**
- 🟨 **Implementado e pendente de validação**
- ✅ **Validado**

Um item só recebe ✅ após verificação compatível com sua natureza. Compilação web não valida comportamento Bluetooth ou visual em aparelho.

## 1. Objetivo e jogadores

- 🟨 Jogo multiplayer mobile por Bluetooth sem internet implementado; validação obrigatória em dois celulares e modo avião pendente.
- 🟨 Partida aceita no mínimo 2 jogadores (bloqueio implementado; validação física pendente).
- 🟨 Partida suporta até 6 jogadores (limite implementado; validação com vários aparelhos pendente).
- 🟨 Cada jogador usa um dispositivo e um deles é o anfitrião (fluxo BLE implementado; validação física pendente).

## 2. Regras do jogo

- ✅ Distribuir quatro cartas para cada jogador (motor puro testado para 2 a 6 jogadores).
- ✅ Objetivo: formar quatro cartas do mesmo valor (detecção e rejeição inválida testadas).
- ✅ Em cada rodada, escolher e enviar uma carta ao próximo jogador (troca circular atômica testada).
- ✅ Receber uma carta do jogador anterior (destinos testados).
- ✅ Manter a ordem dos jogadores (ordem circular e turno testados).
- 🟨 Permitir ao jogador indicar que completou o objetivo (integrado; fluxo Bluetooth físico pendente).
- ✅ Identificar vencedor e penalizado conforme regra documentada pelo grupo.
- ✅ Representar a penalidade com letras da palavra BURRO.
- ✅ Encerrar por condição alternativa documentada: primeira penalização.

## 3. Identificação, criação e sala

- 🟨 Exigir nome antes de criar ou entrar em uma partida (interface e validação implementadas; teste em aparelho pendente).
- 🟨 Atribuir ID único ao jogador dentro da partida (UUID persistido e conferido pelo anfitrião; validação física pendente).
- 🟨 Exibir nomes conectados na sala de espera (implementado; validação física pendente).
- 🟨 Criar nova partida e identificar o criador como anfitrião (implementado; anúncio físico pendente).
- 🟨 Procurar partidas disponíveis via Bluetooth (scan central implementado; validação física pendente).
- 🟨 Solicitar entrada na partida (mensagem implementada; validação física pendente).
- 🟨 Anfitrião aceitar ou recusar jogador (implementado; validação física pendente).
- 🟨 Sair da sala antes do início (com confirmação; validação física pendente).
- 🟨 Impedir início com menos de dois jogadores (regra de interface e coordenador implementada; validação do fluxo em aparelhos pendente).
- 🟨 Permitir ao anfitrião iniciar quando houver o mínimo (distribuição e mensagens privadas integradas; validação física pendente).

## 4. Comunicação Bluetooth

- 🟨 Declarar as permissões Android necessárias (Manifest compilado; concessão em aparelho pendente).
- 🟨 Solicitar permissões Bluetooth em tempo de execução e tratar recusa (implementado; validação física pendente).
- 🟨 Procurar partidas/jogadores próximos (implementado; validação física pendente).
- 🟨 Informar conexão estabelecida (implementado; validação física pendente).
- 🟨 Informar desconexão (implementado; validação física pendente).
- ✅ Definir e documentar o formato das mensagens, envelope e frames por MTU.
- ✅ Validar formato, partida, remetente, sequência e duplicidade antes de alterar o estado (testes unitários aprovados).
- ✅ Bloquear jogada fora do turno (cliente e motor autoritativo testados).
- 🟨 Tratar perda de conexão e reconectar quando possível (quatro tentativas implementadas; validação física pendente).
- 🟨 Continuar funcionando sem internet (nenhuma API remota usada; teste em modo avião pendente).
- 🟨 Anfitrião anunciar serviço e aceitar conexões (plugin Android compilado; validação em rádio pendente).
- 🟨 Convidado procurar e conectar ao anfitrião (transporte compilado; validação em rádio pendente).

## 5. Funcionamento da partida

- ✅ Embaralhar e distribuir automaticamente (Fisher–Yates e distribuição testados).
- 🟨 Mostrar a cada jogador somente as próprias cartas (estado público sem mãos testado; tráfego físico pendente).
- 🟨 Indicar o jogador da vez (interface e estado implementados; validação visual pendente).
- 🟨 Informar de quem recebe e para quem envia (interface implementada; validação visual pendente).
- 🟨 Selecionar e confirmar uma carta (interface integrada; validação em aparelho pendente).
- ✅ Validar a jogada no cliente e no anfitrião/recebimento (turno, rodada, posse, duplicidade e remetente cobertos).
- ✅ Atualizar as mãos após cada troca (troca e conservação testadas).
- 🟨 Sincronizar o estado entre dispositivos (mensagens individualizadas implementadas; validação BLE pendente).
- ✅ Detectar quatro cartas de mesmo valor (integrado e testado no motor).
- 🟨 Exibir o resultado final (tela implementada; validação visual pendente).
- 🟨 Permitir nova partida após encerramento (retorno ao fluxo de criação implementado; aparelho pendente).

## 6. Histórico e persistência

- 🟨 Salvar automaticamente partidas finalizadas (implementado; SQLite em aparelho pendente).
- 🟨 Registrar partidas canceladas/interrompidas com o status correto (implementado; fluxo físico pendente).
- 🟨 Persistir histórico após fechar/reabrir (reabertura do adaptador web testada; reinício Android pendente).
- 🟨 Listar status, data/hora, quantidade e nomes dos jogadores, vencedor, penalizado e resultado local (implementado; validação visual pendente).
- 🟨 Abrir detalhes da partida (implementado; validação visual pendente).
- 🟨 Detalhar início, fim, participantes, ordem, vencedor, penalizado, rodadas, resultado e motivo (implementado; validação visual pendente).
- 🟨 Excluir uma partida com confirmação (repositório testado; confirmação visual pendente).
- 🟨 Limpar todo o histórico com confirmação (repositório testado; confirmação visual pendente).
- 🟨 Usar SQLite local no Android (repositório concreto implementado e compilado; persistência física pendente).

## 7. Telas obrigatórias

- 🟨 Tela inicial responsiva em português (pendente de validação visual em celular).
- 🟨 Tela de identificação do jogador (implementada; validação visual em aparelho pendente).
- 🟨 Tela para criar ou procurar partida (implementada; validação visual em aparelho pendente).
- 🟨 Tela de conexão Bluetooth (implementada; validação visual em aparelho pendente).
- 🟨 Sala de espera (implementada; validação visual e física pendente).
- 🟨 Tela principal do jogo (implementada; validação visual em celular pendente).
- 🟨 Tela de resultado (implementada; validação visual em celular pendente).
- 🟨 Tela de histórico (implementada; validação visual em celular pendente).
- 🟨 Tela de detalhes da partida (implementada; validação visual em celular pendente).
- ✅ Navegação para identificação, opções, conexão, sala, jogo, resultado, histórico e detalhes.

## 8. Requisitos técnicos

- ✅ Usar Vue 3, Ionic Framework, Capacitor e TypeScript (tipagem, build web e build Android concluídos).
- ✅ Adicionar Android como plataforma inicial (sincronização e `assembleDebug` concluídos).
- 🟨 Usar plugin Bluetooth compatível (central comunitário e periférico nativo compilam; validação física pendente).
- ✅ Separar lógica do jogo dos componentes de interface.
- ✅ Definir tipos TypeScript para jogadores, cartas, partidas, resultados e mensagens Bluetooth.
- ✅ Validar jogadas no anfitrião e no recebimento de mensagens.
- 🟨 Usar SQLite ou solução local para histórico (SQLite Android implementado e compilado; teste de reinício físico pendente).
- ✅ Documentar as permissões Android necessárias.

## 9. Interface e usabilidade

- 🟨 Interface inicial adequada a celulares (pendente de validação em dispositivo).
- 🟨 Destacar claramente a vez do jogador (interface implementada; validação visual pendente).
- 🟨 Indicar estado Bluetooth (conectando, conectado, reconectando, desligado e erro implementados; aparelho pendente).
- 🟨 Apresentar erros com mensagens claras (permissão, rádio, anúncio e conexão cobertos; aparelho pendente).
- 🟨 Confirmar saída/abandono, exclusão individual e limpeza do histórico (diálogos implementados; validação visual pendente).
- 🟨 Dimensionar cartas para toque fácil (alvos implementados; validação em celular pendente).
- ✅ Não mostrar cartas dos adversários na interface nem no estado público.
- 🟨 Apresentar estados de carregamento, conexão, desconexão e encerramento (implementado; validação visual pendente).

## 10. Requisitos não funcionais

- 🟨 Funcionar sem internet após instalado (arquitetura local; modo avião em aparelho pendente).
- 🟨 Protocolo para mensagens pequenas, fragmentação e confirmações implementados; estabilidade de rádio pendente.
- ✅ Evitar alterações inconsistentes no motor (autoridade, troca atômica, conservação, validação e deduplicação testadas; transporte físico ainda pendente).
- ✅ Organizar o código por responsabilidade e inicializar versionamento Git.
- ✅ Incluir instruções de instalação, execução e teste.
- 🟨 Tratar permissão negada e Bluetooth desligado (mensagens e ações implementadas; teste físico pendente).
- 🟨 Informar quando desconexão impedir continuação (reconexão e erro final implementados; teste físico pendente).

## 11. Testes obrigatórios

- 🟨 Criação de partida (regra de anfitrião testada; anúncio em aparelho pendente).
- 🟨 Entrada do segundo jogador (aceite e início lógico testados; dois aparelhos pendentes).
- 🟨 Entrada de vários jogadores (limite 2–6 e recusa do sétimo testados; vários aparelhos pendentes).
- 🟨 Recusa de jogador (duplicidade e lotação testadas; recusa manual via BLE pendente).
- ✅ Distribuição das cartas.
- ✅ Troca de cartas e conservação.
- ✅ Bloqueio fora do turno e de mensagens repetidas/inválidas.
- ✅ Formação de quatro cartas iguais e declaração validada.
- ✅ Finalização, vencedor e penalizado no motor.
- 🟨 Desconexão (pausa lógica testada; evento físico pendente).
- 🟨 Reconexão em primeiro plano (elegibilidade de membro testada; quatro tentativas BLE pendentes).
- ✅ Salvamento, substituição idempotente e reabertura do histórico web.
- ✅ Consulta dos detalhes pelo repositório.
- ✅ Exclusão individual e limpeza do histórico.
- 🟨 Funcionamento sem internet (nenhum serviço remoto usado; modo avião em dois celulares pendente).

## 12. Entregáveis e aceitação

- ⬜ Código-fonte em repositório público do GitHub.
- ✅ Instruções de compilação criadas e confirmadas no ambiente local.
- ✅ Documento das regras implementadas.
- ✅ Diagrama e protocolo da comunicação atualizados conforme a implementação.
- ✅ Documento de decisões técnicas completo para o escopo implementado.
- ✅ Testes automatizados de sala, regras, distribuição, conservação, turnos, encerramentos, mensagens, privacidade e persistência (5 arquivos e 27 testes aprovados).
- ⬜ Demonstração com dois dispositivos Bluetooth.
- ⬜ Demonstração do histórico.
- ⬜ Vídeo de uma partida completa.
- ⬜ Dois celulares conectam e entram na mesma partida.
- ⬜ Cartas são distribuídas corretamente e privadas.
- ⬜ Jogada aparece corretamente nos demais aparelhos.
- ⬜ Jogada fora do turno é impedida.
- ⬜ Vencedor e penalizado são identificados corretamente.
- ⬜ Partida finalizada aparece no histórico e seus detalhes abrem.
- ⬜ Histórico sobrevive ao reinício do aplicativo.
- ⬜ Jogo funciona sem internet.
