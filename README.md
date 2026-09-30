# Burro Bluetooth

Jogo mobile de cartas Burro para 2 a 6 participantes próximos. O aplicativo usa Vue 3, Ionic, Capacitor e TypeScript para Android, com Bluetooth Low Energy diretamente entre celulares e sem servidor durante a partida.

> Estado da entrega: Parte 4 de 4. Código, testes automatizados, documentação, sincronização Capacitor e APK de depuração foram concluídos. A validação em dois celulares, prints/GIFs reais e vídeo permanecem pendentes porque nenhum aparelho físico está conectado ao ambiente.

## Identificação acadêmica

Preencher antes da entrega:

- **Curso:** Informática
- **Instituição/turma:** Faculdade Senac / 3°
- **Integrante 1:** Enrique
- **Integrante 2:** Miguel
- **Integrante 3:** Kauã

Não substitua esses campos por nomes ou perfis que não correspondam às contribuições reais.

## UCs e indicadores

### UC: Codificar acesso à web services e recursos de sistemas móveis

Indicadores:

- Integra recursos nativos do dispositivo, de acordo com as necessidades do aplicativo e as características do sistema mobile.
- Aplica correções e melhorias a partir da validação e depuração do código de integração dos webservices, conforme necessidades do projeto.

Evidências: plugin Capacitor Android periférico/GATT, plugin BLE central, permissões, tratamento de rádio desligado, recusa de permissão, desconexão, reconexão, fragmentação por MTU e validação do protocolo.

### UC: Codificar aplicações para dispositivos móveis

Indicadores:

- Aplica recursos da biblioteca do sistema mobile de acordo com necessidades do aplicativo.
- Programa persistência local de dados utilizando arquivos e banco de dados portáveis de acordo com as necessidades do sistema.

Evidências: interface Ionic responsiva, navegação mobile, ciclo de vida das páginas, SQLite Android e adaptador web usado nos testes.

## Como jogar

1. Um participante informa o nome, escolhe **Criar partida** e se torna o anfitrião.
2. Os demais informam seus nomes, procuram a partida e solicitam entrada.
3. O anfitrião aceita ou recusa e inicia com pelo menos dois jogadores.
4. Cada pessoa recebe quatro cartas. A ordem da sala forma uma roda.
5. Na sua vez, o jogador seleciona e confirma uma carta.
6. Depois que todos confirmam, o anfitrião executa a troca atômica: cada pessoa envia ao próximo jogador e recebe do anterior.
7. Quem possuir quatro cartas do mesmo valor toca **Completei o quarteto!**.
8. A primeira declaração válida vence. O jogador anterior recebe a próxima letra de **BURRO**.
9. Nesta implementação, a partida termina na primeira penalização, condição alternativa permitida pelo requisito.
10. O resultado é salvo automaticamente e uma nova partida pode ser criada.

Veja [Regras implementadas](docs/REGRAS_IMPLEMENTADAS.md).

## Arquitetura

```text
src/
  bluetooth/   mensagens, validação, frames e transportes BLE
  components/  componentes visuais reutilizáveis
  domain/      modelos, regras e motor autoritativo
  lobby/       coordenação da sala, partida e reconexão
  persistence/ contrato e repositórios do histórico
  router/      rotas
  views/       telas Ionic
android/
  app/src/main/java/br/edu/jogoburro/
    BurroBlePeripheralPlugin.java
docs/
  documentação, validação e roteiros
```

O anfitrião é a autoridade. Ele valida comandos e envia a cada convidado somente o estado público e sua própria mão. O plugin comunitário atua como central/cliente GATT; o plugin Android local implementa o anfitrião como periférico, anunciante e servidor GATT.

## Requisitos do ambiente

- Node.js 22.12 ou superior — verificado com Node 24.12.0;
- npm 11 ou compatível;
- Android Studio compatível com Capacitor 8;
- JDK 21 — verificado com JBR 21.0.8;
- Android SDK Platform 36;
- dois aparelhos Android físicos com BLE para a validação final;
- suporte a múltiplos anúncios BLE no aparelho anfitrião.

O Android usa `minSdkVersion 24`, `compileSdkVersion 36` e `targetSdkVersion 36`.

## Instalação e execução

```bash
npm install
npm run dev
```

O navegador permite revisar interface, regras e histórico web. Ele não valida Bluetooth real nem SQLite Android.

### Verificações

```bash
npm run typecheck
npm test
npm run build
npm run android:sync
```

### Compilação Android

No Windows, se Java e ADB não estiverem no `PATH`:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"

cd android
.\gradlew.bat testDebugUnitTest assembleDebug
```

APK gerado: `android/app/build/outputs/apk/debug/app-debug.apk`.

Para abrir o projeto nativo:

```bash
npm run android:open
```

## Bluetooth e permissões

No Android 12 ou superior são solicitadas:

- `BLUETOOTH_SCAN`;
- `BLUETOOTH_CONNECT`;
- `BLUETOOTH_ADVERTISE`.

No Android 11 ou anterior são declaradas permissões Bluetooth legadas e localização limitadas à API 30. O scan usa `neverForLocation`; o aplicativo não deriva localização.

Permissão negada gera mensagem e acesso às configurações. Bluetooth desligado gera ação de ativação. Um aparelho sem anúncio BLE pode participar como convidado, mas não hospedar.

Veja [Protocolo Bluetooth](docs/PROTOCOLO_BLUETOOTH.md) e [Decisões técnicas](docs/DECISOES_TECNICAS.md).

## Teste em dois celulares

1. Instale o mesmo APK nos dois aparelhos.
2. Desligue Wi-Fi e dados móveis em ambos.
3. Ative Bluetooth e conceda **Dispositivos próximos**.
4. No celular A, crie a sala. No B, procure, conecte e solicite entrada.
5. Aceite B, inicie e jogue uma partida completa.
6. Confira que cada aparelho exibe somente sua própria mão.
7. Confirme uma troca, finalize por quarteto e confira resultado e histórico.
8. Feche completamente o aplicativo, reabra e confira a permanência do histórico.
9. Teste recusa, desconexão, reconexão, abandono e exclusão.

Registre aparelho, Android, horário, resultado e evidência conforme [Teste Bluetooth em dois celulares](docs/TESTE_BLUETOOTH_DOIS_CELULARES.md).

## Resultado real das verificações

Em 30/09/2026:

- `npm run typecheck`: aprovado, sem erros;
- `npm test`: 5 arquivos e 27 testes aprovados;
- `npm run build`: aprovado; somente aviso não bloqueante de tamanho do chunk Ionic;
- `npx cap sync android`: aprovado; BLE e SQLite detectados;
- `gradlew testDebugUnitTest assembleDebug`: `BUILD SUCCESSFUL`;
- APK: 13.861.125 bytes, SHA-256 `C56399C803293A791F82FE942C15E8128D95570C9F7E53BD057CE0C9EAE0EC9B`;
- busca por chamadas de rede no código de execução: nenhuma ocorrência;
- teste em dois celulares: **pendente**, pois o ADB não listou aparelhos;
- modo avião, SQLite após reinício e evidências visuais: **pendentes** pelo mesmo motivo.

Os resultados finais ficam em [Relatório de validação](docs/RELATORIO_VALIDACAO.md).

## Funcionalidades e validação

| Funcionalidade | Implementação | Validação |
|---|---|---|
| Identificação e ID único | concluída | build/testes; aparelho pendente |
| Criação, procura, aceite e recusa | concluída | regras automatizadas; BLE físico pendente |
| Sala para 2 a 6 jogadores | concluída | limite automatizado; vários celulares pendentes |
| Distribuição de quatro cartas | concluída | teste automatizado |
| Turnos e troca circular | concluída | teste automatizado |
| Bloqueio de jogada inválida | concluída | teste automatizado |
| Privacidade das mãos | concluída | estado/protocolo testados; captura de tráfego pendente |
| Vitória e penalizado | concluída | teste automatizado |
| Desconexão e reconexão | concluída em primeiro plano | aparelho físico pendente |
| Resultado e nova partida | concluída | build; validação visual pendente |
| Histórico, detalhes e exclusão | concluída | adaptador web testado; SQLite físico pendente |
| Funcionamento sem internet | sem dependência remota | modo avião pendente |
| iOS | não desenvolvido | fora do escopo Android inicial |
| Operação em segundo plano | não desenvolvida | fora do escopo |

Consulte o [Checklist dos requisitos](docs/CHECKLIST_REQUISITOS.md).

## Evidências visuais

Não foram criados prints ou GIFs artificiais. A equipe ainda precisa capturar nos aparelhos:

- criação e procura da sala;
- pedido aceito e dois jogadores conectados;
- mãos diferentes nos dois celulares;
- troca e rodada atualizada;
- resultado;
- histórico antes e depois de reabrir.

Veja [Evidências da entrega](docs/EVIDENCIAS.md).

## Contribuição com branches e Pull Requests

A avaliação exige contribuições reais dos três integrantes. Cada pessoa deve usar sua própria conta e produzir seus próprios commits e Pull Requests.

```bash
git clone URL_DO_REPOSITORIO
git switch -c tipo/descricao-curta
# editar e testar
git add arquivos-alterados
git commit -m "tipo: descrição objetiva"
git push -u origin tipo/descricao-curta
```

Abra um Pull Request para `main`, descreva a mudança e os testes, e solicite revisão. Não compartilhem uma conta nem atribuam autoria retroativa.

O plano para os três integrantes e a publicação estão em [Entrega e contribuições no GitHub](docs/ENTREGA_GITHUB.md).

## Limitações reais

- BLE e SQLite Android compilam, mas não foram validados fisicamente neste ambiente.
- Reconexão automática ocorre apenas com o processo ativo e faz quatro tentativas em primeiro plano.
- Identificadores BLE podem mudar após reinício ou conforme o fabricante.
- O anfitrião precisa suportar anúncio BLE; estabilidade e conexões variam por aparelho.
- Se o anfitrião encerrar o processo, a partida em andamento não é retomada.
- Não há suporte a iOS nem funcionamento garantido em segundo plano.
- A partida encerra na primeira penalização; a palavra BURRO não acumula entre partidas.
- O build web mantém aviso não bloqueante de chunk Ionic maior que 500 kB.

## Materiais da entrega e apresentação

- [Regras implementadas](docs/REGRAS_IMPLEMENTADAS.md)
- [Protocolo e diagrama](docs/PROTOCOLO_BLUETOOTH.md)
- [Decisões técnicas](docs/DECISOES_TECNICAS.md)
- [Relatório de validação](docs/RELATORIO_VALIDACAO.md)
- [Roteiro do vídeo](docs/ROTEIRO_VIDEO.md)
- [Guia da apresentação oral](docs/APRESENTACAO_ORAL.md)
- [Checklist](docs/CHECKLIST_REQUISITOS.md)

## Fontes técnicas

- [Capacitor — configuração do ambiente](https://capacitorjs.com/docs/getting-started/environment-setup)
- [Ionic Vue](https://ionicframework.com/docs/vue/overview)
- [capacitor-community/bluetooth-le](https://github.com/capacitor-community/bluetooth-le)
- [Android — visão geral de BLE](https://developer.android.com/develop/connectivity/bluetooth/ble/ble-overview)
- [Android — permissões Bluetooth](https://developer.android.com/develop/connectivity/bluetooth/bt-permissions)
