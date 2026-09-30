<template>
  <ion-page>
    <ion-content :fullscreen="true" class="home">
      <main class="home__content">
        <connection-badge />
        <app-brand />

        <section class="actions" aria-label="Ações principais">
          <ion-button expand="block" size="large" router-link="/identificacao">
            Jogar
          </ion-button>
          <ion-button expand="block" size="large" fill="outline" color="light" router-link="/historico">
            Ver histórico
          </ion-button>
        </section>

        <p class="home__hint">De 2 a 6 jogadores · conexão local via Bluetooth</p>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonButton, IonContent, IonPage } from '@ionic/vue';
import AppBrand from '../components/AppBrand.vue';
import ConnectionBadge from '../components/ConnectionBadge.vue';
</script>

<style scoped>
.home {
  --background: radial-gradient(circle at 50% 12%, #327766 0%, #194b3f 38%, #0d2d27 100%);
}

.home__content {
  display: flex;
  width: min(100%, 32rem);
  min-height: 100%;
  margin: 0 auto;
  padding: max(1.25rem, env(safe-area-inset-top)) 1.25rem max(1.5rem, env(safe-area-inset-bottom));
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.actions {
  width: 100%;
  max-width: 24rem;
}

.actions ion-button {
  min-height: 3.5rem;
  margin-top: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.01em;
}

.home__hint {
  margin: 1.5rem 0 0;
  color: rgb(255 255 255 / 62%);
  font-size: 0.78rem;
  text-align: center;
}
</style>
