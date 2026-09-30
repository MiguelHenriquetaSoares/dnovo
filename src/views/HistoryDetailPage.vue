<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/historico" text="Histórico" /></ion-buttons>
        <ion-title>Detalhes</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <main class="page-shell">
        <p v-if="carregando">Carregando detalhes…</p>
        <status-banner v-else-if="erro || !partida" titulo="Partida não encontrada" :mensagem="erro || 'O registro pode ter sido excluído.'" tipo="erro" />
        <template v-else>
          <p class="eyebrow">{{ status(partida.status) }}</p>
          <h1>{{ data(partida.encerradaEm) }}</h1>
          <p class="lead">Sala {{ partida.id.toUpperCase() }} · {{ partida.quantidadeJogadores }} jogadores</p>

          <section class="details">
            <h2>Resumo</h2>
            <dl>
              <div><dt>Início</dt><dd>{{ data(partida.iniciadaEm) }}</dd></div>
              <div><dt>Término</dt><dd>{{ data(partida.encerradaEm) }}</dd></div>
              <div><dt>Rodadas</dt><dd>{{ partida.quantidadeRodadas }}</dd></div>
              <div><dt>Motivo</dt><dd>{{ motivo(partida.resultado.motivo) }}</dd></div>
              <div><dt>Seu resultado</dt><dd>{{ resultadoLocal(partida.resultado.resultadoJogadorLocal) }}</dd></div>
              <div><dt>Vencedor</dt><dd>{{ nome(partida.resultado.vencedorId) }}</dd></div>
              <div><dt>Penalizado</dt><dd>{{ nome(partida.resultado.jogadorPenalizadoId) }}</dd></div>
            </dl>
          </section>

          <section class="details">
            <h2>Participantes e ordem</h2>
            <ol>
              <li v-for="id in partida.ordemJogadores" :key="id">
                <span>{{ nome(id) }}</span>
                <small>{{ jogador(id)?.papel === 'ANFITRIAO' ? 'Anfitrião' : 'Convidado' }} · penalidade {{ jogador(id)?.letrasPenalidade || '—' }}</small>
              </li>
            </ol>
          </section>

          <ion-button expand="block" color="danger" fill="outline" @click="confirmarExclusao = true">Excluir partida</ion-button>
          <ion-alert :is-open="confirmarExclusao" header="Excluir esta partida?" message="Esta ação não pode ser desfeita." :buttons="botoesExclusao" @did-dismiss="confirmarExclusao = false" />
        </template>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { IonAlert, IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar, onIonViewWillEnter } from '@ionic/vue';
import StatusBanner from '../components/StatusBanner.vue';
import type { Jogador, MotivoEncerramento, PartidaHistorico, ResultadoJogadorLocal, StatusPartida } from '../domain/models';
import { obterHistoricoRepository } from '../persistence/history-service';

const route = useRoute();
const router = useRouter();
const partida = ref<PartidaHistorico | null>(null);
const carregando = ref(true);
const erro = ref('');
const confirmarExclusao = ref(false);
const repositorio = obterHistoricoRepository();
const botoesExclusao = [
  { text: 'Cancelar', role: 'cancel' },
  { text: 'Excluir', role: 'destructive', handler: () => void excluir() },
];

onIonViewWillEnter(async () => {
  carregando.value = true;
  erro.value = '';
  try {
    await repositorio.inicializar();
    partida.value = await repositorio.obterPorId(String(route.params.id));
  } catch (falha) {
    erro.value = falha instanceof Error ? falha.message : 'Não foi possível abrir o armazenamento local.';
  } finally {
    carregando.value = false;
  }
});

async function excluir(): Promise<void> {
  if (!partida.value) return;
  await repositorio.excluir(partida.value.id);
  await router.replace('/historico');
}

function jogador(id: string | null): Jogador | undefined {
  return id ? partida.value?.jogadores.find((item) => item.id === id) : undefined;
}
function nome(id: string | null): string { return jogador(id)?.nome ?? '—'; }
function data(valor: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(valor));
}
function status(valor: StatusPartida): string {
  const rotulos: Record<StatusPartida, string> = {
    SALA_DE_ESPERA: 'Sala de espera',
    EM_ANDAMENTO: 'Partida em andamento',
    FINALIZADA: 'Partida finalizada',
    CANCELADA: 'Partida cancelada',
    INTERROMPIDA: 'Partida interrompida',
  };
  return rotulos[valor];
}
function motivo(valor: MotivoEncerramento): string {
  return {
    VITORIA: 'Quarteto declarado',
    PALAVRA_BURRO: 'Penalidade BURRO completa',
    ABANDONO: 'Abandono de jogador',
    DESCONEXAO: 'Falha de reconexão',
    CANCELAMENTO: 'Cancelamento do anfitrião',
  }[valor];
}
function resultadoLocal(valor: ResultadoJogadorLocal): string {
  return { VENCEDOR: 'Vencedor', PENALIZADO: 'Penalizado', PARTICIPANTE: 'Participante', NAO_CONCLUIDO: 'Não concluído' }[valor];
}
</script>

<style scoped>
.details { margin: 1.4rem 0; padding: 1rem; border: 1px solid #dce7e4; border-radius: 1rem; background: #fff; }
.details h2 { margin: 0 0 0.65rem; color: #173f35; font-size: 1.05rem; }
dl { margin: 0; }
dl div { display: flex; padding: 0.65rem 0; border-bottom: 1px solid #edf2f0; justify-content: space-between; gap: 1rem; }
dl div:last-child { border-bottom: 0; }
dt { color: var(--ion-color-medium); }
dd { margin: 0; font-weight: 700; text-align: right; }
ol { margin: 0; padding-left: 1.5rem; }
li { padding: 0.5rem 0.25rem; }
li span, li small { display: block; }
li span { font-weight: 750; }
li small { color: var(--ion-color-medium); }
</style>
