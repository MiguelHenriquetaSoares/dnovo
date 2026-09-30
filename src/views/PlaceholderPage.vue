<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/" text="Voltar" />
        </ion-buttons>
        <ion-title>{{ titulo }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true" class="placeholder">
      <div class="placeholder__content">
        <p class="placeholder__label">Estrutura preparada</p>
        <h1>{{ titulo }}</h1>
        <p>{{ descricao }}</p>
        <ion-button router-link="/" fill="outline">Ir para o início</ion-button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from '@ionic/vue';

defineProps<{
  titulo: string;
  descricao: string;
}>();
</script>

<style scoped>
.placeholder__content {
  max-width: 32rem;
  margin: 0 auto;
  padding: 3.5rem 1.5rem;
}

.placeholder__label {
  margin-bottom: 0.35rem;
  color: var(--ion-color-primary);
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

h1 {
  margin-top: 0;
  font-weight: 850;
}

.placeholder__content > p:not(.placeholder__label) {
  margin-bottom: 2rem;
  color: var(--ion-color-medium);
  line-height: 1.6;
}
</style>
