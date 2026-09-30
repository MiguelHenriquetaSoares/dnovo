<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/identificacao" text="Voltar" /></ion-buttons>
        <ion-title>Nova partida</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <main class="page-shell">
        <p class="eyebrow">Olá, {{ lobby.estado.jogadorLocal?.nome }}</p>
        <h1>Como você quer jogar?</h1>
        <p class="lead">Fique perto dos outros aparelhos e mantenha o Bluetooth ligado.</p>

        <status-banner v-if="erro" titulo="Não foi possível continuar" :mensagem="erro" tipo="erro" />

        <section class="option-grid">
          <button class="option-card" :disabled="carregando" @click="criar">
            <span class="option-card__icon" aria-hidden="true">＋</span>
            <strong>Criar partida</strong>
            <small>Você será o anfitrião e aceitará os jogadores.</small>
          </button>
          <button class="option-card" :disabled="carregando" @click="procurar">
            <span class="option-card__icon" aria-hidden="true">⌁</span>
            <strong>Procurar partida</strong>
            <small>Encontre um anfitrião próximo via Bluetooth.</small>
          </button>
        </section>

        <ion-spinner v-if="carregando" name="crescent" aria-label="Preparando Bluetooth" />
        <ion-button v-if="erro.toLowerCase().includes('desligado')" fill="outline" expand="block" @click="ativar">
          Ativar Bluetooth
        </ion-button>
        <ion-button v-if="erro.toLowerCase().includes('permissão')" fill="outline" expand="block" @click="lobby.abrirConfiguracoes">
          Abrir configurações do aplicativo
        </ion-button>
        <p class="limit-note">Limite desta versão: 2 a 6 jogadores.</p>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonPage, IonSpinner, IonTitle, IonToolbar } from '@ionic/vue';
import StatusBanner from '../components/StatusBanner.vue';
import { useLobbyStore } from '../lobby/lobby-store';

const router = useRouter();
const lobby = useLobbyStore();
const carregando = ref(false);
const erro = ref('');

async function criar(): Promise<void> {
  carregando.value = true;
  erro.value = '';
  try {
    await lobby.criarPartida();
    await router.push('/sala');
  } catch (falha) {
    erro.value = falha instanceof Error ? falha.message : 'Falha ao criar a partida.';
  } finally {
    carregando.value = false;
  }
}

async function procurar(): Promise<void> {
  await router.push('/conexao');
}

async function ativar(): Promise<void> {
  try {
    await lobby.solicitarAtivacaoBluetooth();
    erro.value = '';
  } catch (falha) {
    erro.value = falha instanceof Error ? falha.message : 'Não foi possível ativar o Bluetooth.';
  }
}
</script>

<style scoped>
.option-grid { display: grid; gap: 1rem; margin: 2rem 0; }
.option-card {
  display: grid;
  min-height: 10rem;
  padding: 1.25rem;
  border: 1px solid #dce7e2;
  border-radius: 1rem;
  background: #fff;
  color: #193d34;
  text-align: left;
  box-shadow: 0 0.5rem 1.5rem rgb(20 60 50 / 7%);
}
.option-card:active { transform: scale(0.99); }
.option-card:disabled { opacity: 0.55; }
.option-card__icon { color: var(--ion-color-primary); font-size: 2rem; font-weight: 300; }
.option-card strong { font-size: 1.15rem; }
.option-card small { color: var(--ion-color-medium); line-height: 1.4; }
.limit-note { color: var(--ion-color-medium); font-size: 0.78rem; text-align: center; }
ion-spinner { display: block; margin: 0 auto 1.5rem; }
</style>
