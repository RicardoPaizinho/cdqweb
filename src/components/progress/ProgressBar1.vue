<template>
  <div class="gauge-wrapper">
    <div class="gauge-container" :style="containerStyle">
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
        <!-- Adicionado o sufixo % direto no template para melhor controle de layout -->
        <span class="gauge-value">
          {{ Math.round(progressValue) }}<span class="gauge-percent">%</span>
        </span>
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

// Determina se o gauge entrou em estado crítico (ex: temperatura alta ou bateria muito degradada)
const isCritical = computed(() => props.progressValue > 90);

// Sincroniza as variáveis de cor e sombra do container dependendo do estado
const containerStyle = computed(() => {
  return {
    '--current-color': isCritical.value ? 'var(--status-fail)' : 'var(--accent)',
    '--current-glow': isCritical.value ? 'rgba(239, 68, 68, 0.4)' : 'var(--accent-glow)' // Ajuste para o vermelho se falhar
  };
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
    stroke: 'var(--current-color)',
    filter: `drop-shadow(0 0 6px var(--current-glow))` // Atualiza o brilho do arco dinamicamente!
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
  width: 140px;
  height: 140px;
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(8px);
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  transition: transform 0.3s ease, border-color 0.3s ease;
}

.gauge-container:hover {
  transform: scale(1.05);
  border-color: rgba(255, 255, 255, 0.15);
}

.gauge-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg); /* Faz o progresso começar no topo */
}

.gauge-track {
  fill: none;
  stroke: var(--bg-hover);
  stroke-width: 6;
}

.gauge-fill {
  fill: none;
  stroke-width: 7;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.3s ease, filter 0.3s ease;
}

.gauge-content {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none; /* Evita interferência de mouse hover interno */
}

.gauge-label {
  font-family: var(--font-main, 'Inter', sans-serif);
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 2px;
}

.gauge-value {
  font-family: 'Orbitron', 'Rajdhani', sans-serif;
  font-size: 2.1rem; /* Reduzido levemente para acomodar o % sem quebrar linha */
  font-weight: 600;
  color: var(--text-main);
  line-height: 1;
  display: flex;
  align-items: baseline;
  text-shadow: 0 0 10px var(--current-glow); /* O número também brilha na cor certa */
  transition: text-shadow 0.3s ease;
}

.gauge-percent {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-dim);
  margin-left: 1px;
}
</style>