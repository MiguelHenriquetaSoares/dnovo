<template>
  <ion-list class="player-list" lines="none">
    <ion-item v-for="jogador in jogadores" :key="jogador.id">
      <div slot="start" class="avatar">{{ iniciais(jogador.nome) }}</div>
      <ion-label>
        <h2>{{ jogador.nome }} <span v-if="jogador.id === jogadorLocalId">(você)</span></h2>
        <p>{{ jogador.papel === 'ANFITRIAO' ? 'Anfitrião' : `Jogador ${jogador.ordem + 1}` }}</p>
      </ion-label>
      <ion-badge :color="jogador.estadoConexao === 'CONECTADO' ? 'success' : 'medium'">
        {{ jogador.estadoConexao === 'CONECTADO' ? 'Conectado' : 'Reconectando' }}
      </ion-badge>
    </ion-item>
  </ion-list>
</template>

<script setup lang="ts">
import { IonBadge, IonItem, IonLabel, IonList } from '@ionic/vue';
import type { Jogador } from '../domain/models';

defineProps<{ jogadores: readonly Jogador[]; jogadorLocalId?: string }>();

function iniciais(nome: string): string {
  return nome
    .split(' ')
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase();
}
</script>

<style scoped>
.player-list { background: transparent; }
.player-list ion-item {
  --background: #fff;
  --padding-start: 0.75rem;
  margin-bottom: 0.55rem;
  border: 1px solid #e0e8e4;
  border-radius: 0.8rem;
}
.avatar {
  display: grid;
  width: 2.5rem;
  height: 2.5rem;
  place-items: center;
  border-radius: 50%;
  background: #e1f1eb;
  color: var(--ion-color-primary);
  font-size: 0.78rem;
  font-weight: 900;
}
h2 span { color: var(--ion-color-primary); font-size: 0.75rem; }
</style>
