<template>
  <div class="gauge-wrapper">
    <div class="gauge-container" :style="containerStyle">
      <svg viewBox="0 0 340 340" class="gauge-svg">
        <defs>
          <!-- Glow usado no rastro e no ponteiro -->
          <filter :id="glowFilterId" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur1" />
            <feGaussianBlur stdDeviation="2" result="blur2" />
            <feMerge>
              <feMergeNode in="blur1" />
              <feMergeNode in="blur2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <!-- Gradiente do rastro à ESQUERDA da ponta (usado quando o valor sobe) -->
          <linearGradient
            :id="trailGradientLeftId"
            gradientUnits="userSpaceOnUse"
            :x1="trailLeftTail.x" :y1="trailLeftTail.y"
            :x2="trailTipRef.x" :y2="trailTipRef.y"
          >
            <stop offset="0%" :stop-color="currentColor" stop-opacity="0" />
            <stop offset="55%" :stop-color="currentColor" stop-opacity="0.35" />
            <stop offset="100%" :stop-color="currentColor" stop-opacity="1" />
          </linearGradient>

          <!-- Gradiente do rastro à DIREITA da ponta (usado quando o valor desce) -->
          <linearGradient
            :id="trailGradientRightId"
            gradientUnits="userSpaceOnUse"
            :x1="trailRightTail.x" :y1="trailRightTail.y"
            :x2="trailTipRef.x" :y2="trailTipRef.y"
          >
            <stop offset="0%" :stop-color="currentColor" stop-opacity="0" />
            <stop offset="55%" :stop-color="currentColor" stop-opacity="0.35" />
            <stop offset="100%" :stop-color="currentColor" stop-opacity="1" />
          </linearGradient>
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

        <!--
          Grupo do ponteiro + rastro: ambos são desenhados UMA VEZ na posição
          de referência (pct = 0) e depois giram juntos via CSS transform.
          Isso é o que torna a transição suave — o navegador anima o ângulo,
          em vez de recalcularmos pontos novos a cada frame (o que causava o
          "pulo" entre valores).
        -->
        <g class="gauge-needle-group" :style="needleGroupStyle">
          <!-- Rastro (cometa) atrás da ponta. Some quando parado. -->
          <path
            v-if="direction === 'up'"
            :d="trailPathLeft"
            class="gauge-trail"
            :class="{ 'gauge-trail--hidden': !trailVisible }"
            :style="{ stroke: `url(#${trailGradientLeftId})`, filter: `url(#${glowFilterId})` }"
          />
          <path
            v-else
            :d="trailPathRight"
            class="gauge-trail"
            :class="{ 'gauge-trail--hidden': !trailVisible }"
            :style="{ stroke: `url(#${trailGradientRightId})`, filter: `url(#${glowFilterId})` }"
          />

          <!-- Ponteiro — a base começa longe do centro para nunca cobrir o valor -->
          <polygon
            :points="needlePointsRef"
            class="gauge-needle"
            :style="{ fill: currentColor, filter: `url(#${glowFilterId})` }"
          />
          <circle
            :cx="needleBaseRef.x" :cy="needleBaseRef.y" r="5"
            class="gauge-needle-hub"
            :style="{ fill: currentColor }"
          />
        </g>
      </svg>

      <div class="gauge-content">
        <span class="gauge-value">{{ Math.round(displayValue) }}</span>
        <span class="gauge-label">{{ label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue';

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
  },
  // Comprimento do rastro atrás da ponta do ponteiro, em % da escala total
  trailLength: {
    type: Number,
    default: 20
  },
  // Quanto tempo (ms) parado até o rastro sumir
  trailHideDelay: {
    type: Number,
    default: 2000
  }
});

// ID único por instância (evita colisão de <filter>/<linearGradient> quando
// há mais de um gauge na mesma tela)
const uid = `g${Math.random().toString(36).slice(2, 9)}`;
const glowFilterId = `gauge-glow-filter-${uid}`;
const trailGradientLeftId = `gauge-trail-gradient-left-${uid}`;
const trailGradientRightId = `gauge-trail-gradient-right-${uid}`;

// Geometria base
const cx = 170;
const cy = 170;
const r = 145;
const GAP = 90;
const SWEEP = 360 - GAP;
const START_ANGLE = 180 + GAP / 2;

const isCritical = computed(() => props.progressValue / props.maxValue > 0.9);

const currentColor = computed(() =>
  isCritical.value ? 'var(--status-fail, #ef4444)' : 'var(--accent, #00f3ff)'
);

const containerStyle = computed(() => {
  return {
    '--current-color': currentColor.value,
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

function buildArcPath(startPct, endPct, radius) {
  const start = pointOnArc(startPct, radius);
  const end = pointOnArc(endPct, radius);
  const sweepAngle = ((endPct - startPct) / 100) * SWEEP;
  const largeArc = Math.abs(sweepAngle) > 180 ? 1 : 0;
  const sweepFlag = endPct >= startPct ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} ${sweepFlag} ${end.x} ${end.y}`;
}

const arcPath = computed(() => buildArcPath(0, 100, r));

// --- PONTEIRO + ROTAÇÃO -------------------------------------------------
// O triângulo do ponteiro é calculado UMA ÚNICA VEZ na posição de
// referência (pct = 0). O grupo inteiro (ponteiro + rastro) então gira
// via CSS `transform: rotate()`, que o navegador anima suavemente.
const NEEDLE_INNER_R = 76;   // raio onde a base do ponteiro começa (longe do centro)
const NEEDLE_OUTER_R = 138;  // raio da ponta do ponteiro (um pouco maior que antes)
const NEEDLE_BASE_WIDTH = 13;

function needleGeometryAt(pct) {
  const angleDeg = START_ANGLE + (pct / 100) * SWEEP;
  const rad = (angleDeg * Math.PI) / 180;

  const dirX = Math.sin(rad);
  const dirY = -Math.cos(rad);
  const perpX = -dirY;
  const perpY = dirX;

  const base = { x: cx + NEEDLE_INNER_R * dirX, y: cy + NEEDLE_INNER_R * dirY };
  const tip = { x: cx + NEEDLE_OUTER_R * dirX, y: cy + NEEDLE_OUTER_R * dirY };

  const halfW = NEEDLE_BASE_WIDTH / 2;
  const baseLeft = { x: base.x + perpX * halfW, y: base.y + perpY * halfW };
  const baseRight = { x: base.x - perpX * halfW, y: base.y - perpY * halfW };

  return { base, tip, baseLeft, baseRight };
}

// Geometria estática (pct = 0), nunca recalculada a cada valor — só o
// grupo pai gira.
const needleRefGeom = needleGeometryAt(0);
const needleBaseRef = needleRefGeom.base;
const needlePointsRef = `${needleRefGeom.baseLeft.x},${needleRefGeom.baseLeft.y} ${needleRefGeom.tip.x},${needleRefGeom.tip.y} ${needleRefGeom.baseRight.x},${needleRefGeom.baseRight.y}`;
const trailTipRef = pointOnArc(0, r);

// Rastro à esquerda da ponta (referência), usado quando o valor sobe
const trailPathLeft = computed(() => buildArcPath(-props.trailLength, 0, r));
const trailLeftTail = computed(() => pointOnArc(-props.trailLength, r));

// Rastro à direita da ponta (referência), usado quando o valor desce
const trailPathRight = computed(() => buildArcPath(0, props.trailLength, r));
const trailRightTail = computed(() => pointOnArc(props.trailLength, r));

// Ângulo de rotação do grupo (ponteiro + rastro) em relação à referência pct=0
const needleAngleDeg = computed(() => (cleanValue.value / 100) * SWEEP);

const needleGroupStyle = computed(() => ({
  transform: `rotate(${needleAngleDeg.value}deg)`
}));

// --- Direção do movimento + auto-ocultar o rastro quando parado --------
const direction = ref('up'); // 'up' = subindo (rastro à esquerda) | 'down' = descendo (rastro à direita)
const trailVisible = ref(false);
let hideTimer = null;

function markMoved(newVal, oldVal) {
  if (newVal > oldVal) direction.value = 'up';
  else if (newVal < oldVal) direction.value = 'down';

  trailVisible.value = true;

  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    trailVisible.value = false;
  }, props.trailHideDelay);
}

// --- Número central animado (contagem suave em vez de trocar de uma vez) ---
const displayValue = ref(props.progressValue);
const NUMBER_TWEEN_DURATION = 700; // ms — combina com a duração do giro do ponteiro
let rafId = null;

function easeOutExpo(t) {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function animateNumberTo(target) {
  cancelAnimationFrame(rafId);
  const start = displayValue.value;
  const delta = target - start;
  if (delta === 0) return;

  const startTime = performance.now();

  function tick(now) {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / NUMBER_TWEEN_DURATION, 1);
    displayValue.value = start + delta * easeOutExpo(t);

    if (t < 1) {
      rafId = requestAnimationFrame(tick);
    } else {
      displayValue.value = target;
    }
  }

  rafId = requestAnimationFrame(tick);
}

watch(
  () => props.progressValue,
  (newVal, oldVal) => {
    if (newVal === oldVal) return;
    markMoved(newVal, oldVal);
    animateNumberTo(newVal);
  }
);

onMounted(() => {
  if (props.progressValue > 0) {
    markMoved(props.progressValue, 0);
    // Na montagem, contamos a partir de 0 pra dar aquele efeito de "chegada"
    displayValue.value = 0;
    animateNumberTo(props.progressValue);
  }
});

onBeforeUnmount(() => {
  clearTimeout(hideTimer);
  cancelAnimationFrame(rafId);
});

// --- Marcações e números (inalterados) ---------------------------------
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

/* Grupo que gira: ponteiro + rastro juntos, sempre em torno do centro do gauge */
.gauge-needle-group {
  transform-box: view-box;
  transform-origin: 170px 170px;
  transition: transform 0.7s cubic-bezier(0.22, 1, 0.36, 1);
}

/* Rastro (cauda de cometa) que acompanha a ponta do ponteiro */
.gauge-trail {
  fill: none;
  stroke-width: 13;
  stroke-linecap: round;
  opacity: 1;
  transition: opacity 0.6s ease, stroke 0.3s ease;
}

.gauge-trail--hidden {
  opacity: 0;
}

/* Ponteiro — não nasce no centro, então nunca cobre o valor numérico */
.gauge-needle {
  transition: fill 0.3s ease;
}

.gauge-needle-hub {
  filter: drop-shadow(0 0 4px var(--current-glow));
  transition: fill 0.3s ease;
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