<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/partidas" text="Voltar" /></ion-buttons>
        <ion-title>Conexão Bluetooth</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <main class="page-shell">
        <connection-badge
          :texto="carregando ? 'Conectando…' : procurando ? 'Procurando partidas…' : 'Bluetooth pronto'"
          :tom="erro ? 'erro' : procurando || carregando ? 'alerta' : 'sucesso'"
        />
        <h1>Partidas próximas</h1>
        <p class="lead">O anfitrião deve estar com a sala aberta e o aparelho por perto.</p>

        <status-banner v-if="erro" titulo="Bluetooth indisponível" :mensagem="erro" tipo="erro" />

        <div v-if="procurando && !lobby.estado.partidasEncontradas.length" class="empty-state">
          <ion-spinner name="dots" />
          <strong>Procurando…</strong>
          <span>Isso pode levar alguns segundos.</span>
        </div>

        <ion-list v-else class="match-list" lines="none">
          <ion-item v-for="partida in lobby.estado.partidasEncontradas" :key="partida.dispositivoId">
            <ion-label>
              <h2>{{ partida.nome }}</h2>
              <p>Sinal {{ qualidade(partida.intensidadeSinal) }}</p>
            </ion-label>
            <ion-button slot="end" :disabled="carregando" @click="conectar(partida)">Entrar</ion-button>
          </ion-item>
        </ion-list>

        <ion-button v-if="erro.toLowerCase().includes('desligado')" expand="block" @click="ativar">
          Ativar Bluetooth
        </ion-button>
        <ion-button v-if="erro.toLowerCase().includes('permissão')" expand="block" @click="lobby.abrirConfiguracoes">
          Abrir configurações do aplicativo
        </ion-button>
        <ion-button v-if="erro" expand="block" fill="outline" @click="iniciarProcura">Tentar novamente</ion-button>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonItem, IonLabel, IonList, IonPage, IonSpinner, IonTitle, IonToolbar } from '@ionic/vue';
import ConnectionBadge from '../components/ConnectionBadge.vue';
import StatusBanner from '../components/StatusBanner.vue';
import type { PartidaAnunciada } from '../bluetooth/ports';
import { useLobbyStore } from '../lobby/lobby-store';

const lobby = useLobbyStore();
const router = useRouter();
const procurando = ref(false);
const carregando = ref(false);
const erro = ref('');

onMounted(() => void iniciarProcura());
onBeforeUnmount(() => void lobby.pararProcura());

async function iniciarProcura(): Promise<void> {
  procurando.value = true;
  erro.value = '';
  try {
    await lobby.procurarPartidas();
  } catch (falha) {
    procurando.value = false;
    erro.value = falha instanceof Error ? falha.message : 'Falha ao procurar partidas.';
  }
}

async function conectar(partida: PartidaAnunciada): Promise<void> {
  carregando.value = true;
  procurando.value = false;
  erro.value = '';
  try {
    await lobby.conectarPartida(partida);
    await router.push('/sala');
  } catch (falha) {
    erro.value = falha instanceof Error ? falha.message : 'Falha ao conectar.';
    carregando.value = false;
  }
}

async function ativar(): Promise<void> {
  try {
    await lobby.solicitarAtivacaoBluetooth();
    await iniciarProcura();
  } catch (falha) {
    erro.value = falha instanceof Error ? falha.message : 'Não foi possível ativar o Bluetooth.';
  }
}

function qualidade(rssi?: number): string {
  if (rssi === undefined) return 'detectado';
  if (rssi >= -60) return 'forte';
  if (rssi >= -78) return 'médio';
  return 'fraco';
}
</script>

<style scoped>
h1 { margin-top: 1.5rem; }
.empty-state { display: grid; justify-items: center; gap: 0.5rem; padding: 4rem 1rem; color: var(--ion-color-medium); }
.match-list { margin: 1.5rem 0; background: transparent; }
.match-list ion-item { --background: #fff; margin-bottom: 0.6rem; border: 1px solid #dce7e2; border-radius: 0.8rem; }
</style>
