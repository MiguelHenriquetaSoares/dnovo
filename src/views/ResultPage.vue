<template>
  <ion-page>
    <ion-header><ion-toolbar><ion-title>Resultado</ion-title></ion-toolbar></ion-header>
    <ion-content :fullscreen="true">
      <main v-if="partida?.resultado" class="page-shell result">
        <div class="result__icon" aria-hidden="true">{{ icone }}</div>
        <p class="eyebrow">Partida encerrada</p>
        <h1>{{ titulo }}</h1>
        <p class="lead">{{ descricao }}</p>

        <section class="summary">
          <div><span>Status</span><strong>{{ status }}</strong></div>
          <div><span>Vencedor</span><strong>{{ nome(partida.resultado.vencedorId) }}</strong></div>
          <div><span>Penalizado</span><strong>{{ nome(partida.resultado.jogadorPenalizadoId) }}</strong></div>
          <div><span>Rodadas concluídas</span><strong>{{ Math.max(0, partida.rodadaAtual - 1) }}</strong></div>
        </section>

        <status-banner
          v-if="lobby.estado.aviso"
          titulo="Aviso do histórico"
          :mensagem="lobby.estado.aviso"
          tipo="alerta"
        />

        <ion-button expand="block" size="large" @click="novaPartida">Jogar nova partida</ion-button>
        <ion-button expand="block" fill="outline" router-link="/historico">Ver histórico</ion-button>
      </main>
      <main v-else class="page-shell">
        <status-banner titulo="Resultado indisponível" mensagem="Nenhuma partida encerrada está aberta neste aparelho." tipo="erro" />
        <ion-button expand="block" router-link="/">Voltar ao início</ion-button>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { IonButton, IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/vue';
import StatusBanner from '../components/StatusBanner.vue';
import { useLobbyStore } from '../lobby/lobby-store';
import type { StatusPartida } from '../domain/models';

const lobby = useLobbyStore();
const router = useRouter();
const partida = computed(() => lobby.estado.estadoPartida);
const resultadoLocal = computed(() => partida.value?.resultado?.resultadoJogadorLocal);
const icone = computed(() => resultadoLocal.value === 'VENCEDOR' ? '🏆' : resultadoLocal.value === 'PENALIZADO' ? 'B' : '✓');
const titulo = computed(() => {
  if (resultadoLocal.value === 'VENCEDOR') return 'Você venceu!';
  if (resultadoLocal.value === 'PENALIZADO') return 'Você recebeu uma letra';
  if (resultadoLocal.value === 'PARTICIPANTE') return 'Quarteto declarado';
  return 'Partida não concluída';
});
const descricao = computed(() => {
  if (partida.value?.resultado?.motivo === 'ABANDONO') return 'Um jogador abandonou e a partida foi interrompida.';
  if (partida.value?.resultado?.motivo === 'DESCONEXAO') return 'A reconexão não foi possível.';
  if (partida.value?.resultado?.motivo === 'CANCELAMENTO') return 'O anfitrião cancelou a partida.';
  return 'A primeira declaração válida de quatro cartas iguais encerrou a partida.';
});
const status = computed(() => {
  const rotulos: Record<StatusPartida, string> = {
    SALA_DE_ESPERA: 'Sala de espera',
    EM_ANDAMENTO: 'Em andamento',
    FINALIZADA: 'Finalizada',
    CANCELADA: 'Cancelada',
    INTERROMPIDA: 'Interrompida',
  };
  return partida.value ? rotulos[partida.value.status] : 'Encerrada';
});

function nome(id: string | null): string {
  if (!id) return '—';
  return partida.value?.jogadores.find((jogador) => jogador.id === id)?.nome ?? 'Jogador';
}

async function novaPartida(): Promise<void> {
  await lobby.sairDaSala();
  await router.replace('/partidas');
}
</script>

<style scoped>
.result { padding-top: 2.5rem; text-align: center; }
.result__icon { display: grid; width: 5rem; height: 5rem; margin: 0 auto 1rem; border-radius: 50%; background: #e7f5f1; color: var(--ion-color-primary); font-size: 2.5rem; font-weight: 900; place-items: center; }
.result h1 { margin: 0.15rem 0 0.5rem; }
.summary { margin: 1.8rem 0; padding: 0.3rem 1rem; border: 1px solid #dce7e4; border-radius: 1rem; background: #fff; text-align: left; }
.summary div { display: flex; padding: 0.8rem 0; border-bottom: 1px solid #edf2f0; justify-content: space-between; gap: 1rem; }
.summary div:last-child { border-bottom: 0; }
.summary span { color: var(--ion-color-medium); }
</style>
