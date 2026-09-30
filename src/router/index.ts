import { createRouter, createWebHistory } from '@ionic/vue-router';
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'inicio',
    component: () => import('../views/HomePage.vue'),
  },
  {
    path: '/identificacao',
    name: 'identificacao',
    component: () => import('../views/IdentificationPage.vue'),
  },
  {
    path: '/partidas',
    name: 'partidas',
    component: () => import('../views/MatchOptionsPage.vue'),
  },
  {
    path: '/conexao',
    name: 'conexao',
    component: () => import('../views/BluetoothConnectionPage.vue'),
  },
  {
    path: '/sala',
    name: 'sala',
    component: () => import('../views/LobbyPage.vue'),
  },
  {
    path: '/jogo',
    name: 'jogo',
    component: () => import('../views/GamePage.vue'),
  },
  {
    path: '/resultado',
    name: 'resultado',
    component: () => import('../views/ResultPage.vue'),
  },
  {
    path: '/historico',
    name: 'historico',
    component: () => import('../views/HistoryPage.vue'),
  },
  {
    path: '/historico/:id',
    name: 'detalhes-historico',
    component: () => import('../views/HistoryDetailPage.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
];

export default createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});
