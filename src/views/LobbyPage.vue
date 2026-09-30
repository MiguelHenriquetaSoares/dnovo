<template>
  <ion-page>
    <ion-header>
      <ion-toolbar><ion-title>Sala de espera</ion-title></ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <main class="page-shell lobby-page">
        <div class="lobby-heading">
          <connection-badge :texto="statusTexto" :tom="statusTom" />
          <p v-if="lobby.estado.partidaId" class="room-code">Sala {{ lobby.estado.partidaId.toUpperCase() }}</p>
        </div>

        <status-banner v-if="lobby.estado.erro" titulo="Atenção" :mensagem="lobby.estado.erro" tipo="erro" />
        <status-banner v-else-if="lobby.estado.aviso" titulo="Aviso da conexão" :mensagem="lobby.estado.aviso" tipo="alerta" />
        <status-banner
          v-else-if="lobby.estado.fase === 'AGUARDANDO_ACEITE'"
          titulo="Solicitação enviada"
          mensagem="Aguarde o anfitrião aceitar sua entrada."
        />

        <section v-if="lobby.estado.papel === 'ANFITRIAO' && lobby.estado.solicitacoes.length" class="requests">
          <p class="eyebrow">Pedidos de entrada</p>
          <article v-for="pedido in lobby.estado.solicitacoes" :key="pedido.jogador.id" class="request-card">
            <strong>{{ pedido.jogador.nome }}</strong>
            <div>
              <ion-button size="small" color="danger" fill="clear" @click="lobby.recusarSolicitacao(pedido)">Recusar</ion-button>
              <ion-button size="small" @click="lobby.aceitarSolicitacao(pedido)">Aceitar</ion-button>
            </div>
          </article>
        </section>

        <section class="players">
          <div class="section-title">
            <div>
              <p class="eyebrow">Jogadores</p>
              <h1>{{ lobby.estado.jogadores.length }} de 6</h1>
            </div>
            <span v-if="lobby.estado.papel === 'ANFITRIAO'" class="advertising">Anunciando</span>
          </div>
          <player-list :jogadores="lobby.estado.jogadores" :jogador-local-id="lobby.estado.jogadorLocal?.id" />
        </section>

        <div class="lobby-actions">
          <ion-button
            v-if="lobby.estado.papel === 'ANFITRIAO'"
            expand="block"
            size="large"
            :disabled="!lobby.podeIniciar.value || iniciando"
            @click="iniciar"
          >
            {{ iniciando ? 'Iniciando…' : 'Iniciar partida' }}
          </ion-button>
          <p v-if="lobby.estado.papel === 'ANFITRIAO' && !lobby.podeIniciar.value" class="minimum-note">
            Aguarde pelo menos mais um jogador conectado.
          </p>
          <ion-button expand="block" fill="outline" color="danger" @click="confirmarSaida = true">Sair da sala</ion-button>
        </div>

        <ion-alert
          :is-open="confirmarSaida"
          header="Sair da sala?"
          :message="lobby.estado.papel === 'ANFITRIAO' ? 'A sala será encerrada para todos.' : 'Sua conexão com a partida será encerrada.'"
          :buttons="botoesSaida"
          @did-dismiss="confirmarSaida = false"
        />
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { IonAlert, IonButton, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/vue';
import ConnectionBadge from '../components/ConnectionBadge.vue';
import PlayerList from '../components/PlayerList.vue';
import StatusBanner from '../components/StatusBanner.vue';
import { useLobbyStore } from '../lobby/lobby-store';

const lobby = useLobbyStore();
const router = useRouter();
const confirmarSaida = ref(false);
const iniciando = ref(false);

const statusTexto = computed(() => {
  if (lobby.estado.fase === 'RECONECTANDO') return `Reconectando (${lobby.estado.tentativasReconexao}/4)…`;
  if (lobby.estado.fase === 'AGUARDANDO_ACEITE') return 'Aguardando o anfitrião';
  if (lobby.estado.fase === 'ERRO') return 'Conexão interrompida';
  return 'Bluetooth conectado';
});
const statusTom = computed(() => lobby.estado.fase === 'ERRO' ? 'erro' : lobby.estado.fase === 'RECONECTANDO' ? 'alerta' : 'sucesso');

const botoesSaida = [
  { text: 'Cancelar', role: 'cancel' },
  { text: 'Sair', role: 'destructive', handler: () => void sair() },
];

watch(
  () => lobby.estado.fase,
  (fase) => {
    if (fase === 'EM_ANDAMENTO') void router.replace('/jogo');
    if (fase === 'FINALIZADA') void router.replace('/resultado');
  },
);

async function iniciar(): Promise<void> {
  iniciando.value = true;
  try {
    await lobby.iniciarPartida();
  } finally {
    iniciando.value = false;
  }
}

async function sair(): Promise<void> {
  await lobby.sairDaSala();
  await router.replace('/partidas');
}
</script>

<style scoped>
.lobby-page { padding-bottom: 2rem; }
.lobby-heading { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
.room-code { margin: 0; color: var(--ion-color-medium); font-family: ui-monospace, monospace; font-size: 0.78rem; }
.requests { margin: 1.5rem 0; }
.request-card { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.8rem 1rem; border: 1px solid #efd38d; border-radius: 0.8rem; background: #fff8e8; }
.section-title { display: flex; align-items: end; justify-content: space-between; }
.section-title h1 { margin: 0.1rem 0 0.75rem; font-size: 1.65rem; }
.advertising { margin-bottom: 0.8rem; color: var(--ion-color-primary); font-size: 0.75rem; font-weight: 800; }
.advertising::before { content: ''; display: inline-block; width: 0.45rem; height: 0.45rem; margin-right: 0.4rem; border-radius: 50%; background: #43bd7a; }
.lobby-actions { margin-top: 2rem; }
.minimum-note { color: var(--ion-color-medium); font-size: 0.78rem; text-align: center; }
</style>
