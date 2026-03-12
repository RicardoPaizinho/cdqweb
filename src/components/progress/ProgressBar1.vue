<template>
  <div class="gauge-wrapper">
    <div class="gauge-container">
      <svg viewBox="0 0 100 100" class="gauge-svg">
        <circle
          cx="50" cy="50" r="45"
          class="gauge-track"
        />
        <circle
          cx="50" cy="50" r="45"
          class="gauge-fill"
          :style="progressStyle"
        />
      </svg>

      <div class="gauge-content">
        <span class="gauge-label">{{ label }}</span>
        <span class="gauge-value">{{ Math.round(progressValue) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  label: {
    type: String,
    default: 'VAL'
  },
  progressValue: {
    type: Number,
    default: 0
  }
});

// Lógica para calcular o preenchimento do círculo (Stroke-dasharray)
const progressStyle = computed(() => {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  // Limita o valor entre 0 e 100
  const cleanValue = Math.min(Math.max(props.progressValue, 0), 100);
  const offset = circumference - (cleanValue / 100) * circumference;

  return {
    strokeDasharray: circumference,
    strokeDashoffset: offset,
    // Dinâmica de cor: se passar de 90%, fica mais "quente"
    stroke: props.progressValue > 90 ? 'var(--status-fail)' : 'var(--accent)'
  };
});
</script>

<style scoped>
.gauge-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px;
}

.gauge-container {
  position: relative;
  width: 140px; /* Ajuste conforme o espaço na sua sidebar */
  height: 140px;
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(8px);
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  transition: transform 0.3s ease;
}

.gauge-container:hover {
  transform: scale(1.05);
  border-color: rgba(255, 255, 255, 0.1);
}

.gauge-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg); /* Faz o progresso começar no topo */
}

.gauge-track {
  fill: none;
  stroke: var(--bg-hover); /* Fundo do arco vindo do theme.css */
  stroke-width: 6;
}

.gauge-fill {
  fill: none;
  stroke-width: 7;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.3s ease;
  /* Efeito Glow Neon */
  filter: drop-shadow(0 0 5px var(--accent-glow));
}

.gauge-content {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}



/* Adiciona um "%" pequeno ao lado do valor */
.gauge-value::after {
  content: ''; /* Se quiser o símbolo fixo, use '%' aqui */
  font-size: 0.8rem;
  margin-left: 2px;
}
.gauge-label {
  font-family: var(--font-main); /* Inter para clareza */
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--text-dim);
  text-transform: uppercase;
}

.gauge-value {
  font-family: 'Orbitron', sans-serif; /* Rajdhani para o look industrial */
  font-size: 2.3rem;            /* Rajdhani costuma ser mais estreita, pode aumentar o tamanho */
  font-weight: 600;
  color: var(--text-main);
  line-height: 1;
  text-shadow: 0 0 10px var(--accent-glow); /* Brilho suave no número */
}
</style>