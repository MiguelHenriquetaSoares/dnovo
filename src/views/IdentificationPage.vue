<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/" text="Voltar" /></ion-buttons>
        <ion-title>Identificação</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <main class="page-shell identification">
        <p class="eyebrow">Antes de jogar</p>
        <h1>Como devemos chamar você?</h1>
        <p class="lead">Esse nome será mostrado aos outros jogadores na sala de espera.</p>

        <form @submit.prevent="continuar">
          <ion-item class="name-field" lines="none">
            <ion-input
              v-model="nome"
              label="Seu nome"
              label-placement="stacked"
              placeholder="Ex.: Ana"
              :maxlength="24"
              :counter="true"
              autocomplete="name"
              enterkeyhint="done"
            />
          </ion-item>
          <p v-if="erro" class="form-error" role="alert">{{ erro }}</p>
          <ion-button type="submit" expand="block" size="large" :disabled="nome.trim().length < 2">
            Continuar
          </ion-button>
        </form>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { IonBackButton, IonButton, IonButtons, IonContent, IonHeader, IonInput, IonItem, IonPage, IonTitle, IonToolbar } from '@ionic/vue';
import { useLobbyStore } from '../lobby/lobby-store';

const router = useRouter();
const lobby = useLobbyStore();
const nome = ref(lobby.estado.jogadorLocal?.nome ?? '');
const erro = ref('');

function continuar(): void {
  try {
    lobby.definirJogador(nome.value);
    void router.push('/partidas');
  } catch (falha) {
    erro.value = falha instanceof Error ? falha.message : 'Nome inválido.';
  }
}
</script>

<style scoped>
.identification { padding-top: 3rem; }
.name-field { --background: #fff; --border-radius: 0.8rem; margin: 2rem 0 1.25rem; border: 1px solid #dce7e2; }
.form-error { color: var(--ion-color-danger); font-size: 0.86rem; }
</style>
