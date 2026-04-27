<template>
  <div class="gauge-wrapper" :style="{ width: size + 'px' }">
    <span class="gauge-label">{{ label }}</span>

    <div class="gauge-relative">
      <svg :viewBox="`0 0 ${viewSize} ${viewSize}`" class="progress-svg">
        <defs>
          <filter id="p-glow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="1.8" result="blur1" />
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g class="track-group">
          <rect 
            v-for="i in steps" :key="'bg-'+i"
            :x="centerX - rectW/2" :y="10" :width="rectW" :height="rectH"
            fill="rgba(255,255,255,0.05)"
            :transform="`rotate(${(i-1) * (360/steps)}, ${centerX}, ${centerY})`"
            rx="2"
          />
        </g>

        <g class="active-group">
          <rect 
            v-for="i in steps" v-show="i <= Math.floor(tweenedSteps)" :key="'act-'+i"
            :x="centerX - rectW/2" :y="10" :width="rectW" :height="rectH"
            :fill="accentColor"
            :transform="`rotate(${(i-1) * (360/steps)}, ${centerX}, ${centerY})`"
            rx="2"
          />
        </g>

        <g ref="particlesGroup" filter="url(#p-glow)" class="particles-layer"></g>
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
 // accentColor: { type: String, default: '#00d2ff' } // Fallback para ciano neon
});

const steps = 50; 
const viewSize = 200;
const centerX = 100;
const centerY = 100;
const rectW = 4; 
const rectH = 14;

const displayValue = ref(0);
const tweenedSteps = ref(0);
const particlesGroup = ref(null);

const createSparks = (step) => {
  if (!particlesGroup.value || step <= 0) return;

  // Criação de 3 fragmentos por atualização de passo
  for (let i = 0; i < 3; i++) {
    const spark = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    
    const angle = (step * (360/steps)) - 90;
    const rad = angle * (Math.PI / 180);
    
    // Posicionamento levemente externo ao aro
    const r = 88; 
    const x = centerX + r * Math.cos(rad);
    const y = centerY + r * Math.sin(rad);
    
    const size = gsap.utils.random(1.2, 3.2);

    gsap.set(spark, { 
      attr: { cx: x, cy: y, r: size, fill: props.accentColor },
      style: `mix-blend-mode: screen; filter: drop-shadow(0 0 3px ${props.accentColor});`
    });

    particlesGroup.value.appendChild(spark);

    // Física: Explosão radial + Gravidade
    gsap.to(spark, {
      duration: gsap.utils.random(0.7, 1.4),
      x: Math.cos(rad) * gsap.utils.random(25, 50), // Direção da explosão
      y: Math.sin(rad) * gsap.utils.random(25, 50) + 40, // Queda (gravidade)
      opacity: 0,
      scale: 0,
      ease: "power2.out",
      onComplete: () => spark.remove()
    });
  }
};

watch(() => props.progressValue, (nv) => {
  // Animação do número
  gsap.to(displayValue, { duration: 1.5, value: nv, ease: "power2.out" });
  
  // Animação dos degraus e trigger das faíscas
  gsap.to(tweenedSteps, {
    duration: 1.5,
    value: (nv / 100) * steps,
    ease: "power2.out",
    onUpdate: () => {
      // Só cria faíscas se houver movimento significativo
      if (Math.random() > 0.3) createSparks(tweenedSteps.value);
    }
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
  font-family: 'Orbitron', sans-serif;
  font-size: 0.7rem;
  font-weight: 800;
  color: #666;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 2px;
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
  width: 110%; /* Ligeiramente maior para não cortar brilhos */
  height: 110%;
  overflow: visible !important;
}

.active-group {
  /* Brilho principal da barra ativa */
  filter: drop-shadow(0 0 5px var(--accent, currentColor));
}

.center-content {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: none;
}

.gauge-value {
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1;
  font-family: 'Orbitron', sans-serif;
  /* Efeito de profundidade no texto */
  filter: drop-shadow(0 0 10px currentColor);
  transition: color 0.3s ease;
}

.gauge-value small { 
  font-size: 1rem; 
  margin-left: 2px;
  opacity: 0.6; 
}

.particles-layer {
  pointer-events: none;
}

/* Animação sutil de pulso no centro quando o valor é alto */
@keyframes pulse {
  0% { transform: translate(-50%, -50%) scale(1); }
  100% { transform: translate(-50%, -50%) scale(1.05); }
}
</style>