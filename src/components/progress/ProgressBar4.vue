<template>
  <div class="gauge-wrapper" :style="{ width: size + 'px' }">
    <span class="gauge-label">{{ label }}</span>

    <div class="gauge-relative">
      <svg :viewBox="`0 0 ${viewSize} ${viewSize}`" class="progress-svg">
        <defs>
          <filter id="p-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <g class="track-group">
          <rect 
            v-for="i in steps" :key="'bg-'+i"
            :x="centerX - rectW/2" :y="10" :width="rectW" :height="rectH"
            fill="rgba(255,255,255,0.08)"
            :transform="`rotate(${(i-1) * (360/steps)}, ${centerX}, ${centerY})`"
          />
        </g>

        <g class="active-group">
          <rect 
            v-for="i in steps" v-show="i <= Math.floor(tweenedSteps)" :key="'act-'+i"
            :x="centerX - rectW/2" :y="10" :width="rectW" :height="rectH"
            :fill="accentColor"
            :transform="`rotate(${(i-1) * (360/steps)}, ${centerX}, ${centerY})`"
          />
        </g>

        <g ref="particlesGroup" filter="url(#p-glow)"></g>
      </svg>

      <div class="center-content">
        <span class="gauge-value" :style="{ color: accentColor }">
          {{ Math.round(displayValue) }}<small>%</small>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import { gsap } from 'gsap';

const props = defineProps({
  label: { type: String, default: '' },
  progressValue: { type: Number, default: 0 },
  size: { type: Number, default: 150 },
  accentColor: { type: String, default: 'var(--accent)' }
});

const steps = 50; 
const viewSize = 200;
const centerX = 100;
const centerY = 100;
const rectW = 5; 
const rectH = 15;

const displayValue = ref(0);
const tweenedSteps = ref(0);
const particlesGroup = ref(null);

const createSparks = (step) => {
  if (!particlesGroup.value || step <= 0) return;

  for (let i = 0; i < 4; i++) {
    const spark = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    
    const angle = (step * (360/steps)) - 90;
    const rad = angle * (Math.PI / 180);
    
    // Raio 78 alinha perfeitamente com o rect y=10 e h=15
    const r = 78; 
    const x = centerX + r * Math.cos(rad);
    const y = centerY + r * Math.sin(rad);
    const s = gsap.utils.random(2, 5);

    gsap.set(spark, { 
      attr: { x: x - s/2, y: y - s/2, width: s, height: s, fill: props.accentColor },
      opacity: 1
    });

    particlesGroup.value.appendChild(spark);

    gsap.to(spark, {
      duration: gsap.utils.random(0.7, 1.3),
      x: `+=${Math.cos(rad) * 10 + gsap.utils.random(-15, 15)}`,
      y: `+=${Math.sin(rad) * 10 + gsap.utils.random(30, 60)}`, // Gravidade
      opacity: 0,
      scale: 0,
      ease: "power1.in",
      onComplete: () => spark.remove()
    });
  }
};

watch(() => props.progressValue, (nv) => {
  gsap.to(displayValue, { duration: 1, value: nv, ease: "power2.out" });
  gsap.to(tweenedSteps, {
    duration: 1,
    value: (nv / 100) * steps,
    ease: "power2.out",
    onUpdate: () => createSparks(tweenedSteps.value)
  });
}, { immediate: true });
</script>

<style scoped>
.gauge-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  user-select: none;
}

.gauge-label {
  font-family: var(--font-tech);
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-dim);
  margin-bottom: 5px;
  text-transform: uppercase;
}

.gauge-relative {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}

.center-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -40%); /* Ajuste leve para compensar o label no topo */
  text-align: center;
  pointer-events: none;
}

.gauge-value {
  font-family: var(--font-tech);
  font-size: 2.2rem;
  font-weight: 700;
  line-height: 1;
  filter: drop-shadow(0 0 10px currentColor);
}

.gauge-value small { font-size: 0.9rem; opacity: 0.8; }

.active-group {
  filter: drop-shadow(0 0 6px var(--accent));
}
</style>