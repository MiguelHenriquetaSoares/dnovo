<template>
  <button
    type="button"
    class="card"
    :class="{ 'card--selected': selecionada, 'card--red': vermelha }"
    :aria-pressed="selecionada"
    :aria-label="`${valorExibido} de ${naipeExibido}`"
    :disabled="desabilitada"
    @click="$emit('selecionar')"
  >
    <span class="card__value">{{ valorExibido }}</span>
    <span class="card__suit" aria-hidden="true">{{ simbolo }}</span>
    <span class="card__name">{{ naipeExibido }}</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Carta } from '../domain/models';

const props = defineProps<{ carta: Carta; selecionada?: boolean; desabilitada?: boolean }>();
defineEmits<{ selecionar: [] }>();

const simbolos = { PAUS: '♣', COPAS: '♥', ESPADAS: '♠', OUROS: '♦' } as const;
const nomes = { PAUS: 'paus', COPAS: 'copas', ESPADAS: 'espadas', OUROS: 'ouros' } as const;
const valores = { AS: 'A', VALETE: 'J', DAMA: 'Q', REI: 'K' } as const;
const simbolo = computed(() => simbolos[props.carta.naipe]);
const naipeExibido = computed(() => nomes[props.carta.naipe]);
const valorExibido = computed(() => valores[props.carta.valor as keyof typeof valores] ?? props.carta.valor);
const vermelha = computed(() => props.carta.naipe === 'COPAS' || props.carta.naipe === 'OUROS');
</script>

<style scoped>
.card {
  display: flex;
  min-width: 4.5rem;
  min-height: 7rem;
  padding: 0.55rem;
  border: 2px solid #d5dfdc;
  border-radius: 0.85rem;
  background: #fff;
  box-shadow: 0 0.3rem 0.8rem rgb(15 47 39 / 12%);
  color: #17211e;
  flex: 1 0 4.5rem;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  transition: transform 150ms ease, border-color 150ms ease;
}
.card:disabled { opacity: 0.58; }
.card--selected { border-color: var(--ion-color-primary); transform: translateY(-0.55rem); box-shadow: 0 0.6rem 1rem rgb(29 107 88 / 22%); }
.card--red { color: #ad2f38; }
.card__value { align-self: flex-start; font-size: 1.2rem; font-weight: 900; }
.card__suit { font-size: 2.2rem; line-height: 1; }
.card__name { font-size: 0.63rem; font-weight: 750; text-transform: uppercase; }
</style>
