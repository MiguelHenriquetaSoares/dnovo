# Entrega e contribuições no GitHub

## Publicar o repositório

1. Um integrante cria um repositório público vazio no GitHub.
2. No projeto local, confira que APKs, caches e arquivos locais estão ignorados.
3. Configure o remoto e publique a branch principal:

```bash
git add .
git commit -m "chore: preparar base do jogo Burro"
git branch -M main
git remote add origin URL_DO_REPOSITORIO
git push -u origin main
```

4. Adicione os outros integrantes como colaboradores.
5. Proteja `main`, se disponível, exigindo Pull Request.
6. Substitua no README os campos de curso, nomes e perfis.
7. Entregue a URL pública e confirme em janela anônima que ela abre.

## Disponibilizar o APK

O APK está ignorado pelo Git para evitar versionar artefatos de build. No GitHub:

1. abra **Releases** e escolha **Draft a new release**;
2. crie a tag `v1.0.0` no commit final revisado;
3. anexe `android/app/build/outputs/apk/debug/app-debug.apk`;
4. informe que é um APK de depuração para avaliação;
5. publique também o SHA-256 registrado no relatório;
6. baixe o arquivo da Release e confira o hash antes de enviar o link.

Para uma publicação em loja seria necessário gerar e proteger uma chave de assinatura de produção; isso não deve ser improvisado para esta atividade.

Esses comandos são instruções. Este ambiente não criou repositório remoto, commits ou PRs em nome da equipe.

## Tarefas reais para três integrantes

Adapte conforme o trabalho que cada pessoa realmente executar. Cada frente abaixo inclui código e deve gerar um PR próprio:

- **Integrante 1 — BLE e reconexão:** instrumentar/corrigir transportes ou plugin nativo a partir do teste em dois aparelhos; arquivos candidatos: `src/bluetooth/`, `src/lobby/lobby-store.ts` e `BurroBlePeripheralPlugin.java`.
- **Integrante 2 — SQLite e histórico:** validar reinício, corrigir o repositório/telas se necessário e acrescentar teste; arquivos candidatos: `src/persistence/` e telas de histórico.
- **Integrante 3 — interface e testes do jogo:** validar tamanhos/estados em celular, corrigir componentes e ampliar testes do motor/protocolo; arquivos candidatos: `src/views/`, `src/components/` e arquivos `*.spec.ts`.

Cada tarefa deve gerar alteração real, testes e evidências. Não crie commits vazios apenas para simular participação.

## Fluxo individual

```bash
git switch main
git pull --ff-only
git switch -c test/validacao-bluetooth
# fazer o trabalho real
npm run typecheck
npm test
git add ARQUIVOS_DA_TAREFA
git commit -m "test: registrar validação Bluetooth em dois aparelhos"
git push -u origin test/validacao-bluetooth
```

O próprio integrante abre o PR na própria conta, descreve aparelhos/testes/resultado, pede revisão e responde às observações. Após aprovação, o PR é mesclado sem reescrever a autoria.

## Checklist antes da entrega

- repositório público acessível;
- três perfis corretos no README;
- contribuições reais dos três integrantes;
- PRs mesclados e visíveis;
- APK ou instruções de compilação;
- evidências reais;
- vídeo;
- checklist e relatório atualizados sem resultados inventados.
