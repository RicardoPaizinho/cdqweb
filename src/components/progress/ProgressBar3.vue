<template>
  <div class="gauge-wrapper">
    <div class="gauge-container" :style="containerStyle">
      <svg viewBox="0 0 340 340" class="gauge-svg">
        <!-- Definição do Filtro Glow de Alta Intensidade -->
        <defs>
          <filter id="gauge-glow-filter" x="-50%" y="-50%" width="200%" height="200%">
            <!-- Camada 1: Desfoque intenso de fundo -->
            <feGaussianBlur stdDeviation="6" result="blur1" />
            <!-- Camada 2: Desfoque mais fechado para o núcleo do brilho -->
            <feGaussianBlur stdDeviation="2" result="blur2" />
            
            <!-- Combina os brilhos com o traço original -->
            <feMerge>
              <feMergeNode in="blur1" />
              <feMergeNode in="blur2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <!-- Trilho de fundo (arco completo, cor apagada) -->
        <path :d="arcPath" class="gauge-track" />

        <!-- Marcações -->
        <g class="gauge-ticks">
          <line
            v-for="tick in ticks"
            :key="tick.value"
            :x1="tick.x1" :y1="tick.y1"
            :x2="tick.x2" :y2="tick.y2"
            :class="['gauge-tick', { 'gauge-tick--lg': tick.isLarge }]"
          />
        </g>

        <!-- Números -->
        <g class="gauge-numbers">
          <text
            v-for="num in numbers"
            :key="num.value"
            :x="num.x" :y="num.y"
            text-anchor="middle"
            dominant-baseline="middle"
            :class="['gauge-number', { 'gauge-number--lit': num.pct <= cleanValue }]"
          >{{ num.value }}</text>
        </g>

        <!-- Halo (brilho largo e borrado) atrás do arco de progresso -->
        <path
          :d="arcPath"
          class="gauge-fill-glow"
          pathLength="100"
          :style="progressStyle"
        />

        <!-- Arco de progresso principal (Com o Filtro Aplicado) -->
        <path
          :d="arcPath"
          class="gauge-fill"
          pathLength="100"
          :style="progressStyle"
        />
      </svg>

      <div class="gauge-content">
        <span class="gauge-value">{{ Math.round(progressValue) }}</span>
        <span class="gauge-label">{{ label }}</span>
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
  },
  maxValue: {
    type: Number,
    default: 100
  }
});

// Geometria base
const cx = 170;
const cy = 170;
const r = 145; 
const GAP = 90; 
const SWEEP = 360 - GAP; 
const START_ANGLE = 180 + GAP / 2; 

const isCritical = computed(() => props.progressValue / props.maxValue > 0.9);

const containerStyle = computed(() => {
  return {
    '--current-color': isCritical.value ? 'var(--status-fail, #ef4444)' : 'var(--accent, #00f3ff)',
    '--current-glow': isCritical.value ? 'rgba(239, 68, 68, 0.6)' : 'var(--accent-glow, rgba(0, 243, 255, 0.4))'
  };
});

const cleanValue = computed(() => {
  const pct = (props.progressValue / props.maxValue) * 100;
  return Math.min(Math.max(pct, 0), 100);
});

function pointOnArc(pct, radius) {
  const angleDeg = START_ANGLE + (pct / 100) * SWEEP;
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + radius * Math.sin(rad),
    y: cy - radius * Math.cos(rad)
  };
}

const arcPath = computed(() => {
  const start = pointOnArc(0, r);
  const end = pointOnArc(100, r);
  return `M ${start.x} ${start.y} A ${r} ${r} 0 1 1 ${end.x} ${end.y}`;
});

const progressStyle = computed(() => {
  return {
    strokeDasharray: `${cleanValue.value} 100`,
    stroke: 'var(--current-color)',
  };
});

const tickInner = 122;
const tickOuterSmall = 130;
const tickOuterLarge = 138;
const tickCount = 51; 

const ticks = computed(() => {
  const arr = [];
  for (let i = 0; i < tickCount; i++) {
    const pct = i * 2;
    const isLarge = i % 5 === 0;
    const inner = pointOnArc(pct, tickInner);
    const outer = pointOnArc(pct, isLarge ? tickOuterLarge : tickOuterSmall);
    arr.push({
      value: pct,
      isLarge,
      x1: inner.x, y1: inner.y,
      x2: outer.x, y2: outer.y
    });
  }
  return arr;
});

const numberRadius = 105;
const numbers = computed(() => {
  const steps = 10;
  const arr = [];
  for (let i = 0; i <= steps; i++) {
    const pct = i * (100 / steps);
    const value = Math.round((props.maxValue / steps) * i);
    const p = pointOnArc(pct, numberRadius);
    arr.push({ value, pct, x: p.x, y: p.y });
  }
  return arr;
});
</script>

<style scoped>
.gauge-wrapper {
  display: table-column;
  justify-content: center;
  align-items: center;
  padding: 0px;
}

.gauge-container {
  position: relative;
  width: 170px;
  height: 170px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.gauge-svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}

.gauge-track {
  fill: none;
  stroke: var(--current-color);
  stroke-width: 10;
  stroke-linecap: round;
  opacity: 0.12;
}

/* O halo traseiro agora usa o filtro combinado */
.gauge-fill-glow {
  fill: none;
  stroke-width: 14;
  stroke-linecap: round;
  opacity: 0.4;
  filter: url(#gauge-glow-filter);
  transition: stroke-dasharray 0.8s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.3s ease;
}

/* Linha principal nítida que fica por cima do glow traseiro */
.gauge-fill {
  fill: none;
  stroke-width: 9;
  stroke-linecap: round;
  filter: drop-shadow(0 0 3px #fff); /* Dá um núcleo "vivo" e brilhante à barra */
  transition: stroke-dasharray 0.8s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.3s ease;
}

.gauge-tick {
  stroke: var(--current-color);
  stroke-width: 1;
  stroke-linecap: round;
  opacity: 0.25;
}

.gauge-tick--lg {
  stroke: var(--current-color);
  stroke-width: 1.5;
  opacity: 0.7;
  filter: drop-shadow(0 0 3px var(--current-glow));
}

.gauge-number {
  font-family: var(--font-main, 'Inter', sans-serif);
  font-size: 13px;
  font-weight: 500;
  fill: var(--text-dim, #666);
  opacity: 0.5;
  transition: fill 0.3s ease, opacity 0.3s ease;
}

.gauge-number--lit {
  fill: var(--current-color);
  opacity: 1;
  filter: drop-shadow(0 0 4px var(--current-glow));
}

.gauge-content {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.gauge-value {
  font-family: 'Orbitron', sans-serif;
  font-size: 2.2rem;
  font-weight: 700;
  color: var(--text-main, #fff);
  line-height: 1;
  text-shadow: 0 0 25px var(--current-glow), 0 0 5px var(--current-color);
  transition: text-shadow 0.5s ease;
}

.gauge-label {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--current-color);
  margin-top: 4px;
  letter-spacing: 1px;
  text-shadow: 0 0 8px var(--current-glow);
  transition: color 0.3s ease, text-shadow 0.3s ease;
}
</style>