<template>
  <div class="brand" aria-label="Burro Bluetooth">
    <div class="brand__cards" aria-hidden="true">
      <span>♣</span><span>♥</span><span>♠</span>
    </div>
    <p class="brand__eyebrow">Jogo de cartas</p>
    <h1>Burro</h1>
    <p class="brand__subtitle">Perto dos amigos. Longe da internet.</p>
  </div>
</template>

<style scoped>
.brand {
  padding: 3.25rem 1.25rem 2rem;
  text-align: center;
}

.brand__cards {
  display: flex;
  justify-content: center;
  margin-bottom: 1.25rem;
}

.brand__cards span {
  display: grid;
  width: 3.5rem;
  height: 4.75rem;
  margin: 0 -0.45rem;
  place-items: center;
  border: 3px solid var(--ion-color-light);
  border-radius: 0.75rem;
  background: #fffdf6;
  color: var(--ion-color-primary);
  font-size: 1.65rem;
  box-shadow: 0 0.65rem 1.5rem rgb(0 0 0 / 18%);
  transform: rotate(-10deg);
}

.brand__cards span:nth-child(2) {
  z-index: 1;
  color: var(--ion-color-danger);
  transform: translateY(-0.4rem);
}

.brand__cards span:nth-child(3) {
  transform: rotate(10deg);
}

.brand__eyebrow {
  margin: 0 0 0.25rem;
  color: rgb(255 255 255 / 72%);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  color: #fff;
  font-size: clamp(3.75rem, 18vw, 5.5rem);
  font-weight: 900;
  letter-spacing: -0.075em;
  line-height: 0.95;
}

.brand__subtitle {
  max-width: 18rem;
  margin: 0.9rem auto 0;
  color: rgb(255 255 255 / 80%);
  font-size: 0.95rem;
}
</style>
