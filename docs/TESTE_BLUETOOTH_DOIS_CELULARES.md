# Roteiro de validação Bluetooth em dois celulares

Status: pendente — nenhum aparelho estava conectado ao ADB durante as Partes 2, 3 e 4.

## Pré-condições

1. Dois aparelhos Android com BLE, Android 8 ou superior e Bluetooth ligado.
2. O aparelho anfitrião precisa suportar anúncio BLE (`isMultipleAdvertisementSupported`).
3. Instalar o mesmo `app-debug.apk` nos dois aparelhos.
4. Conceder “Dispositivos próximos” quando solicitado.
5. Desligar Wi-Fi e dados móveis para comprovar independência da internet.

Instalação por ADB, com os dois aparelhos autorizados:

```powershell
adb devices -l
adb -s SERIAL_DO_APARELHO_A install -r android/app/build/outputs/apk/debug/app-debug.apk
adb -s SERIAL_DO_APARELHO_B install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## Entrada aceita e comunicação nos dois sentidos

1. No celular A, informar `Ana`, tocar **Criar partida** e manter a sala aberta.
2. No celular B, informar `Bia`, tocar **Procurar partida** e selecionar o anúncio encontrado.
3. Confirmar que A mostra o pedido de Bia. Isso valida convidado → anfitrião.
4. Em A, tocar **Aceitar**.
5. Confirmar que ambos mostram Ana e Bia conectadas. Isso valida anfitrião → convidado.
6. Confirmar que **Iniciar partida** estava desabilitado com uma pessoa e ficou habilitado com duas.
7. Iniciar e verificar que cada aparelho recebe quatro cartas e chega à tela do jogo.

## Partida completa e privacidade

1. Conferir que os nomes das cartas do outro jogador não aparecem na interface nem no estado público exibido pelo Logcat.
2. Conferir em ambos quem envia e quem recebe.
3. No jogador da vez, selecionar e confirmar uma carta; confirmar que o outro aparelho indica a confirmação sem revelar a carta.
4. Tentar tocar novamente e confirmar o bloqueio de jogada repetida/fora do turno.
5. No segundo aparelho, confirmar uma carta e verificar que a troca ocorre nos dois: continuam quatro cartas e a rodada aumenta.
6. Repetir até formar um quarteto. Tocar **Completei o quarteto!** e conferir vencedor, penalizado e letra **B** nos dois aparelhos.
7. Abrir o histórico nos dois aparelhos, conferir o registro e seus detalhes.
8. Fechar o aplicativo completamente, abrir novamente e confirmar que o registro permanece.
9. Excluir uma partida e, depois, testar **Limpar** com as respectivas confirmações.
10. Repetir o fluxo com Wi-Fi e dados móveis desligados.

## Recusa

1. Recriar a sala e solicitar entrada pelo segundo aparelho.
2. Tocar **Recusar** no anfitrião.
3. Confirmar mensagem de recusa no convidado e ausência dele na lista.

## Saída e reconexão

1. Com ambos aceitos, sair voluntariamente no convidado e confirmar que ele some da sala do anfitrião.
2. Entrar novamente, desligar o Bluetooth do convidado e confirmar o estado desconectado no anfitrião.
3. Reativar o Bluetooth em até 15 segundos.
4. Confirmar o indicador “Reconectando” e o retorno do jogador sem novo aceite.
5. Repetir mantendo o Bluetooth desligado para verificar a mensagem após quatro tentativas.

## Permissões e incompatibilidade

1. Revogar “Dispositivos próximos” e tentar procurar/criar; confirmar erro e botão de configurações.
2. Testar criar em aparelho sem suporte a anúncio, se disponível; confirmar que o app explica que ele só pode entrar como convidado.
3. Registrar fabricante, modelo, versão Android, resultado, horário e logs do Logcat para cada cenário.

## Registro do teste

Preencher sem apagar falhas:

| Campo | Celular A | Celular B |
|---|---|---|
| Fabricante/modelo | PENDENTE | PENDENTE |
| Versão Android | PENDENTE | PENDENTE |
| Número de série usado no ADB | PENDENTE | PENDENTE |
| Papel | anfitrião | convidado |

| Cenário | Data/hora | Resultado | Evidência/observação |
|---|---|---|---|
| Criação e anúncio | PENDENTE | PENDENTE | PENDENTE |
| Entrada e aceite | PENDENTE | PENDENTE | PENDENTE |
| Recusa | PENDENTE | PENDENTE | PENDENTE |
| Partida completa offline | PENDENTE | PENDENTE | PENDENTE |
| Desconexão/reconexão | PENDENTE | PENDENTE | PENDENTE |
| Histórico após reabrir | PENDENTE | PENDENTE | PENDENTE |
| Exclusão/limpeza | PENDENTE | PENDENTE | PENDENTE |
