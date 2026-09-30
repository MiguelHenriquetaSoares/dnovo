<template>
  <div class="badge" :class="`badge--${tom}`" role="status">
    <span class="badge__dot" aria-hidden="true"></span>
    {{ texto }}
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    texto?: string;
    tom?: 'neutro' | 'sucesso' | 'alerta' | 'erro';
  }>(),
  { texto: 'Bluetooth não conectado', tom: 'alerta' },
);
</script>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.5rem 0.75rem;
  border: 1px solid rgb(255 255 255 / 18%);
  border-radius: 999px;
  background: rgb(0 0 0 / 12%);
  color: rgb(255 255 255 / 78%);
  font-size: 0.78rem;
}

.badge__dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 50%;
  background: var(--ion-color-warning);
}

.badge--sucesso .badge__dot { background: #69d59e; }
.badge--erro .badge__dot { background: #ff7373; }
.badge--neutro .badge__dot { background: #aebbb7; }
</style>
