<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-title>Rodada {{ partida?.rodadaAtual ?? '—' }}</ion-title>
        <ion-buttons slot="end"><ion-button color="danger" @click="confirmarSaida = true">Sair</ion-button></ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <main v-if="partida" class="page-shell game">
        <section class="turn-card" :class="{ 'turn-card--mine': lobby.ehMinhaVez.value }">
          <p class="eyebrow">{{ lobby.ehMinhaVez.value ? 'Sua vez' : 'Aguarde' }}</p>
          <h1>{{ textoDaVez }}</h1>
          <p>Você recebe de <strong>{{ anterior?.nome }}</strong> e envia para <strong>{{ proximo?.nome }}</strong>.</p>
        </section>

        <status-banner v-if="erroLocal || lobby.estado.erro" titulo="Jogada não realizada" :mensagem="erroLocal || lobby.estado.erro || ''" tipo="erro" />
        <status-banner v-else-if="pausada" titulo="Partida pausada" mensagem="Aguardando todos os jogadores reconectarem." tipo="alerta" />
        <status-banner v-else-if="lobby.estado.acaoPendente" titulo="Confirmando" mensagem="O anfitrião está validando sua ação." />

        <section class="players-progress" aria-label="Ordem dos jogadores">
          <article
            v-for="jogador in jogadoresOrdenados"
            :key="jogador.id"
            :class="{ active: jogador.id === partida.jogadorDaVezId }"
          >
            <span>{{ jogador.ordem + 1 }}</span>
            <div>
              <strong>{{ jogador.nome }}{{ jogador.id === lobby.estado.jogadorLocal?.id ? ' (você)' : '' }}</strong>
              <small>{{ statusJogador(jogador) }}</small>
            </div>
          </article>
        </section>

        <section class="hand">
          <div class="hand__heading">
            <div><p class="eyebrow">Sua mão</p><h2>Escolha uma carta</h2></div>
            <span>4 cartas</span>
          </div>
          <div class="cards">
            <playing-card
              v-for="carta in lobby.estado.maoLocal"
              :key="carta.id"
              :carta="carta"
              :selecionada="lobby.estado.cartaSelecionadaId === carta.id"
              :desabilitada="!podeSelecionar"
              @selecionar="lobby.selecionarCarta(carta.id)"
            />
          </div>
        </section>

        <ion-button
          expand="block"
          size="large"
          :disabled="!lobby.estado.cartaSelecionadaId || !podeSelecionar"
          @click="confirmar"
        >
          Confirmar carta
        </ion-button>
        <ion-button
          v-if="lobby.podeDeclarar.value"
          expand="block"
          size="large"
          color="warning"
          :disabled="lobby.estado.acaoPendente || pausada"
          @click="declarar"
        >
          Completei o quarteto!
        </ion-button>
        <p class="privacy">Somente sua mão é recebida neste celular. As escolhas ficam ocultas até a troca.</p>

        <ion-alert
          :is-open="confirmarSaida"
          header="Abandonar a partida?"
          message="A partida será registrada como interrompida. Se você for o anfitrião, ela será cancelada para todos."
          :buttons="botoesSaida"
          @did-dismiss="confirmarSaida = false"
        />
      </main>
      <main v-else class="page-shell"><status-banner titulo="Partida indisponível" mensagem="Entre por uma sala para iniciar o jogo." tipo="erro" /></main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { IonAlert, IonButton, IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/vue';
import PlayingCard from '../components/PlayingCard.vue';
import StatusBanner from '../components/StatusBanner.vue';
import type { Jogador } from '../domain/models';
import { useLobbyStore } from '../lobby/lobby-store';

const lobby = useLobbyStore();
const router = useRouter();
const confirmarSaida = ref(false);
const erroLocal = ref('');
const partida = computed(() => lobby.estado.estadoPartida);
const jogadoresOrdenados = computed(() => [...(partida.value?.jogadores ?? [])].sort((a, b) => a.ordem - b.ordem));
const indiceLocal = computed(() => jogadoresOrdenados.value.findIndex((j) => j.id === lobby.estado.jogadorLocal?.id));
const proximo = computed(() => jogadoresOrdenados.value[(indiceLocal.value + 1) % jogadoresOrdenados.value.length]);
const anterior = computed(() => jogadoresOrdenados.value[(indiceLocal.value - 1 + jogadoresOrdenados.value.length) % jogadoresOrdenados.value.length]);
const jogadorDaVez = computed(() => jogadoresOrdenados.value.find((j) => j.id === partida.value?.jogadorDaVezId));
const pausada = computed(() => jogadoresOrdenados.value.some((j) => j.estadoConexao !== 'CONECTADO'));
const podeSelecionar = computed(() => lobby.ehMinhaVez.value && !lobby.estado.acaoPendente && !pausada.value);
const textoDaVez = computed(() => lobby.ehMinhaVez.value ? 'Selecione e confirme uma carta' : `Vez de ${jogadorDaVez.value?.nome ?? 'outro jogador'}`);

const botoesSaida = [
  { text: 'Continuar jogando', role: 'cancel' },
  { text: 'Abandonar', role: 'destructive', handler: () => void sair() },
];

watch(() => lobby.estado.fase, (fase) => {
  if (fase === 'FINALIZADA') void router.replace('/resultado');
});

function statusJogador(jogador: Jogador): string {
  if (jogador.estadoConexao !== 'CONECTADO') return 'Desconectado';
  if (partida.value?.jogadoresQueConfirmaram.includes(jogador.id)) return 'Carta confirmada';
  if (partida.value?.jogadorDaVezId === jogador.id) return 'Jogando agora';
  return 'Aguardando';
}

async function confirmar(): Promise<void> {
  erroLocal.value = '';
  try {
    await lobby.confirmarCarta(lobby.estado.cartaSelecionadaId!);
  } catch (erro) {
    erroLocal.value = erro instanceof Error ? erro.message : 'Não foi possível confirmar a carta.';
  }
}

async function declarar(): Promise<void> {
  erroLocal.value = '';
  try {
    await lobby.declararObjetivo();
  } catch (erro) {
    erroLocal.value = erro instanceof Error ? erro.message : 'Não foi possível declarar o quarteto.';
  }
}

async function sair(): Promise<void> {
  await lobby.sairDaSala();
  await router.replace('/');
}
</script>

<style scoped>
.game { padding-top: 1rem; }
.turn-card { margin-bottom: 1rem; padding: 1rem 1.1rem; border: 1px solid #dce7e4; border-radius: 1rem; background: #f6f9f8; }
.turn-card--mine { border-color: #74b5a5; background: #eaf7f3; }
.turn-card h1 { margin: 0; font-size: 1.35rem; }
.turn-card p:last-child { margin-bottom: 0; color: var(--ion-color-medium); }
.players-progress { display: grid; margin: 1rem 0 1.5rem; gap: 0.45rem; }
.players-progress article { display: flex; padding: 0.6rem 0.75rem; border-radius: 0.75rem; align-items: center; gap: 0.7rem; }
.players-progress article > span { display: grid; width: 1.75rem; height: 1.75rem; border-radius: 50%; background: #e9efed; place-items: center; font-weight: 800; }
.players-progress article.active { background: #fff4d8; }
.players-progress article.active > span { background: var(--ion-color-warning); }
.players-progress strong, .players-progress small { display: block; }
.players-progress small { margin-top: 0.1rem; color: var(--ion-color-medium); }
.hand { margin-bottom: 1rem; }
.hand__heading { display: flex; align-items: end; justify-content: space-between; }
.hand__heading h2 { margin: 0; color: #173f35; font-size: 1.25rem; }
.hand__heading > span { color: var(--ion-color-medium); font-size: 0.75rem; }
.cards { display: flex; margin: 1.1rem -0.2rem 0.6rem; padding: 0.6rem 0.2rem; gap: 0.5rem; overflow-x: auto; }
.privacy { color: var(--ion-color-medium); font-size: 0.72rem; line-height: 1.45; text-align: center; }
</style>
