<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/" text="Voltar" /></ion-buttons>
        <ion-title>Histórico</ion-title>
        <ion-buttons slot="end"><ion-button v-if="partidas.length" color="danger" @click="confirmarLimpeza = true">Limpar</ion-button></ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <main class="page-shell history">
        <p class="eyebrow">Neste aparelho</p>
        <h1>Partidas anteriores</h1>
        <p class="lead">Os dados ficam armazenados localmente e não precisam de internet.</p>
        <status-banner v-if="erro" titulo="Histórico indisponível" :mensagem="erro" tipo="erro" />
        <p v-else-if="carregando">Carregando histórico…</p>
        <section v-else-if="partidas.length" class="history-list">
          <article v-for="partida in partidas" :key="partida.id">
            <router-link :to="`/historico/${partida.id}`">
              <div>
                <span class="status" :class="`status--${partida.status.toLowerCase()}`">{{ status(partida.status) }}</span>
                <h2>{{ nomes(partida) }}</h2>
                <p>{{ data(partida.encerradaEm) }} · {{ partida.quantidadeJogadores }} jogadores · {{ partida.quantidadeRodadas }} rodadas</p>
              </div>
              <span aria-hidden="true">›</span>
            </router-link>
            <ion-button fill="clear" color="danger" size="small" @click="pedirExclusao(partida.id)">Excluir</ion-button>
          </article>
        </section>
        <section v-else class="empty">
          <span aria-hidden="true">♣</span>
          <h2>Nenhuma partida registrada</h2>
          <p>Partidas finalizadas, canceladas ou interrompidas aparecerão aqui.</p>
          <ion-button router-link="/identificacao">Jogar agora</ion-button>
        </section>

        <ion-alert :is-open="!!idParaExcluir" header="Excluir esta partida?" message="Esta ação não pode ser desfeita." :buttons="botoesExclusao" @did-dismiss="idParaExcluir = null" />
        <ion-alert :is-open="confirmarLimpeza" header="Limpar todo o histórico?" message="Todas as partidas salvas neste aparelho serão removidas." :buttons="botoesLimpeza" @did-dismiss="confirmarLimpeza = false" />
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { IonAlert, IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonPage, IonTitle, IonToolbar, onIonViewWillEnter } from '@ionic/vue';
import StatusBanner from '../components/StatusBanner.vue';
import type { PartidaHistorico, StatusPartida } from '../domain/models';
import { obterHistoricoRepository } from '../persistence/history-service';

const partidas = ref<PartidaHistorico[]>([]);
const carregando = ref(true);
const erro = ref('');
const idParaExcluir = ref<string | null>(null);
const confirmarLimpeza = ref(false);
const repositorio = obterHistoricoRepository();

const botoesExclusao = [
  { text: 'Cancelar', role: 'cancel' },
  { text: 'Excluir', role: 'destructive', handler: () => void excluir() },
];
const botoesLimpeza = [
  { text: 'Cancelar', role: 'cancel' },
  { text: 'Limpar tudo', role: 'destructive', handler: () => void limpar() },
];

onIonViewWillEnter(() => void carregar());

async function carregar(): Promise<void> {
  carregando.value = true;
  erro.value = '';
  try {
    await repositorio.inicializar();
    partidas.value = await repositorio.listar();
  } catch (falha) {
    erro.value = falha instanceof Error ? falha.message : 'Não foi possível abrir o armazenamento local.';
  } finally {
    carregando.value = false;
  }
}

function pedirExclusao(id: string): void {
  idParaExcluir.value = id;
}

async function excluir(): Promise<void> {
  if (!idParaExcluir.value) return;
  await repositorio.excluir(idParaExcluir.value);
  idParaExcluir.value = null;
  await carregar();
}

async function limpar(): Promise<void> {
  await repositorio.limpar();
  confirmarLimpeza.value = false;
  await carregar();
}

function nomes(partida: PartidaHistorico): string {
  return partida.jogadores.map((jogador) => jogador.nome).join(', ');
}

function data(valor: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(valor));
}

function status(valor: StatusPartida): string {
  const rotulos: Record<StatusPartida, string> = {
    SALA_DE_ESPERA: 'Sala de espera',
    EM_ANDAMENTO: 'Em andamento',
    FINALIZADA: 'Finalizada',
    CANCELADA: 'Cancelada',
    INTERROMPIDA: 'Interrompida',
  };
  return rotulos[valor];
}
</script>

<style scoped>
.history h1 { margin-bottom: 0.35rem; }
.history-list { display: grid; margin-top: 1.4rem; gap: 0.75rem; }
.history-list article { position: relative; padding: 0.9rem 0.8rem 0.35rem; border: 1px solid #dce7e4; border-radius: 1rem; background: #fff; }
.history-list a { display: flex; color: inherit; text-decoration: none; align-items: center; justify-content: space-between; gap: 1rem; }
.history-list h2 { margin: 0.35rem 0 0.25rem; font-size: 1rem; }
.history-list p { margin: 0; color: var(--ion-color-medium); font-size: 0.75rem; }
.status { padding: 0.2rem 0.5rem; border-radius: 999px; background: #e7f5f1; color: #17604f; font-size: 0.65rem; font-weight: 850; text-transform: uppercase; }
.status--cancelada, .status--interrompida { background: #fff0dc; color: #87520a; }
.empty { margin-top: 3rem; text-align: center; }
.empty > span { display: block; color: #8fb2a9; font-size: 3rem; }
.empty p { color: var(--ion-color-medium); }
</style>
