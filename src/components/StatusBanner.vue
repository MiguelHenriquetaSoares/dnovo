<template>
  <div class="status-banner" :class="`status-banner--${tipo}`" role="status">
    <strong>{{ titulo }}</strong>
    <span v-if="mensagem">{{ mensagem }}</span>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    titulo: string;
    mensagem?: string;
    tipo?: 'informacao' | 'sucesso' | 'alerta' | 'erro';
  }>(),
  { mensagem: '', tipo: 'informacao' },
);
</script>

<style scoped>
.status-banner {
  display: grid;
  gap: 0.25rem;
  padding: 0.9rem 1rem;
  border-left: 4px solid var(--ion-color-primary);
  border-radius: 0.65rem;
  background: rgb(var(--ion-color-primary-rgb) / 10%);
  color: #143e34;
  font-size: 0.88rem;
}

.status-banner--sucesso { border-color: #2b9a61; background: #e9f8f0; }
.status-banner--alerta { border-color: var(--ion-color-warning); background: #fff8e9; }
.status-banner--erro { border-color: var(--ion-color-danger); background: #fff0f0; color: #762020; }
.status-banner span { line-height: 1.4; }
</style>
