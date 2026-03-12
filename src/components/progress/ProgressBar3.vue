<template>
  <div class="gauge-outer-wrapper" :class="{ 'is-critical': tweenedValue > 80 }">
    
    <svg class="svg-hud-frame" viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg">
      <g class="ring-slow">
        <circle cx="220" cy="220" r="110" fill="white" stroke="red" stroke-width="1" stroke-dasharray="2, 10" opacity="0.5" />
        <path d="M250 5 L250 25 M495 250 L475 250 M250 495 L250 475 M5 250 L25 250" stroke="currentColor" stroke-width="5" />
      </g>

      <g class="ring-reverse">
        <circle cx="250" cy="250" r="215" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="80, 40, 10, 40" opacity="0.6" />
        <rect x="245" y="25" width="10" height="10" fill="currentColor" />
        <rect x="245" y="465" width="10" height="10" fill="currentColor" />
      </g>

      <g class="ring-fast">
        <circle cx="250" cy="250" r="192" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="15, 150" stroke-linecap="round" />
        <path d="M160 160 A 130 130 0 0 1 340 160" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.3" />
        <path d="M160 340 A 130 130 0 0 0 340 340" fill="none" stroke="currentColor" stroke-width="0.5" opacity="0.3" />
      </g>
    </svg>

    <div class="gauge-container">
      <div 
        class="flame-mask-container" 
        :style="[compositeMasks, { filter: dynamicFilter }]"
      >
        <div class="progress-clipper" :style="progressMaskStyle">
          <div class="smoke-layer l1" :style="smokeBg"></div>
          <div class="smoke-layer l2" :style="smokeBg"></div>
          <div class="smoke-layer l3" :style="smokeBg"></div>
          <div class="smoke-layer l4" :style="smokeBg"></div>
        </div>
      </div>

      <div class="gauge-center-hub" :class="{ 'is-critical': tweenedValue > 80 }">
        <div class="hub-content">
          <span class="hub-label">{{ label }}</span>
          <span class="hub-value">{{ tweenedValue.toFixed(0) }}</span>
        </div>

        <div class="needle-wrapper" :style="needleStyle">
          <div class="needle-tip"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { gsap } from 'gsap';

const props = defineProps({
  label: { type: String, default: 'CPU%' },
  progressValue: { type: Number, default: 0 },
  alphaMap: { type: String, default: '/texture/speedometerAlpha3.png' },
  fireTexture: { type: String, default: '/texture/firesmoke3.jpg' }
});

const tweenedValue = ref(0);
const currentRotation = ref(-135);

const smokeBg = computed(() => ({ backgroundImage: `url(${props.fireTexture})` }));

const dynamicFilter = computed(() => {
  return tweenedValue.value > 80 
    ? 'sepia(1) saturate(12) hue-rotate(-35deg) brightness(0.8) contrast(1.8)'
    : 'sepia(1) saturate(6) hue-rotate(-15deg) brightness(0.6) contrast(1.2)';
});

const compositeMasks = computed(() => ({
  maskImage: `url(${props.alphaMap}), radial-gradient(circle, transparent 40%, black 70%)`,
  webkitMaskImage: `url(${props.alphaMap}), radial-gradient(circle, transparent 40%, black 70%)`,
  maskComposite: 'source-in, destination-in',
  webkitMaskComposite: 'source-in, source-in',
  maskSize: 'contain, cover',
  webkitMaskSize: 'contain, cover',
  maskRepeat: 'no-repeat'
}));

const progressMaskStyle = computed(() => {
  const deg = (tweenedValue.value / 100) * 270;
  return {
    maskImage: `conic-gradient(white ${deg}deg, transparent ${deg}deg)`,
    webkitMaskImage: `conic-gradient(white ${deg}deg, transparent ${deg}deg)`,
    transform: 'rotate(-135deg)',
    transformOrigin: 'center'
  };
});

const needleStyle = computed(() => ({
  transform: `rotate(${currentRotation.value}deg)`
}));

const sync = (val) => {
  const cleanVal = Math.min(Math.max(val, 0), 100);
  const rotation = -135 + (cleanVal / 100) * 270;
  gsap.to(tweenedValue, { duration: 1, value: cleanVal, ease: "power1.out" });
  gsap.to(currentRotation, { duration: 1.4, value: rotation, ease: "power3.out" });
};

watch(() => props.progressValue, sync);
onMounted(() => sync(props.progressValue));
</script>

<style scoped>
/* ESTRUTURA DO WRAPPER */
.gauge-outer-wrapper {
  position: relative;
  width: 320px; /* Aumentado para caber o HUD SVG sem cortar */
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 5px;
  color: rgba(255, 255, 255, 0.25); /* Cor padrão dos anéis */
  transition: color 0.5s ease;
}

.hub-label { 
  font-family: 'MinhaFonteLocal', sans-serif; /* ADICIONE ESTA LINHA */
  font-size: 2.85rem; 
  letter-spacing: 2px; 
  opacity: 0.5; 
  text-transform: uppercase; 
}

.hub-value { 
  font-family: 'MinhaFonteLocal', sans-serif; /* ADICIONE ESTA LINHA */
  font-size: 8.2rem; 
  font-weight: 1000; 
  line-height: 1; 
}

.gauge-outer-wrapper.is-critical {
  color: rgba(236, 28, 21, 0.8); /* Cor crítica para anéis e detalhes */
}

/* ESTILIZAÇÃO DO SVG */
.svg-hud-frame {
  position: absolute;
  width: 100%;
  height: 130%;
  pointer-events: none;
  z-index: 1;
  filter: drop-shadow(0 0 8px currentColor);
}

/* ANIMAÇÕES DE ROTAÇÃO (Reutilizando suas keyframes) */
.ring-slow { animation: rotateCW 40s linear infinite; transform-origin: center; }
.ring-reverse { animation: rotateCCW 25s linear infinite; transform-origin: center; }
.ring-fast { animation: rotateCW 10s linear infinite; transform-origin: center; }

@keyframes rotateCW { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes rotateCCW { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }

/* GAUGE CONTAINER (Seu original) */
.gauge-container {
  position: relative;
  width: 160px;
  height: 160px;
  background: radial-gradient(circle, #1a1a1a 0%, #000 80%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 30px rgba(0,0,0,0.8);
  z-index: 5;
}

.flame-mask-container {
  position: absolute;
  width: 100%;
  height: 100%;
  z-index: 1;
  transition: filter 0.6s ease;
}

.progress-clipper { width: 100%; height: 100%; position: relative; }

/* CAMADAS DE FUMAÇA */
.smoke-layer {
  position: absolute;
  top: -60%; left: -60%;
  width: 220%; height: 220%;
  background-size: 40% 40%;
  background-repeat: repeat;
  mix-blend-mode: screen;
}

.l1 { animation: rotateCW 17s linear infinite; opacity: 0.2; }
.l2 { animation: rotateCCW 13s linear infinite; opacity: 0.4; background-size: 50% 50%; }
.l3 { animation: rotateCW 7s linear infinite; opacity: 0.3; filter: brightness(0.7); }
.l4 { animation: rotateCCW 5s linear infinite; opacity: 0.18; filter: blur(4px); }

/* HUB CENTRAL */
.gauge-center-hub {
  position: relative;
  width: 110px;
  height: 110px;
  background: #0a0a0a;
  border-radius: 50%;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #222;
  box-shadow: inset 0 0 20px rgba(0,0,0,0.8), 0 0 15px rgba(255,255,255,0.05);
  transition: all 0.5s ease;
}

.gauge-center-hub.is-critical {
  border-color: #ec1c15;
  box-shadow: inset 0 0 20px rgba(255, 50, 0, 0.2), 0 0 30px rgba(255, 50, 0, 0.4);
}

.hub-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #fff;
  z-index: 12;
}

.hub-label { font-size: 0.65rem; letter-spacing: 2px; opacity: 0.5; text-transform: uppercase; }
.hub-value { font-size: 2.2rem; font-weight: 900; line-height: 1; }

.needle-wrapper {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0; left: 0;
  pointer-events: none;
}

.needle-tip {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  height: 25px;
  background: #fff;
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
  box-shadow: 0 0 10px rgba(255,255,255,0.8);
}

.is-critical .needle-tip {
  background: #ff3300;
  filter: drop-shadow(0 0 5px #ff3300);
}
.is-critical .hub-value, 
.is-critical .hub-label {
  text-shadow: 0 0 10px rgba(236, 28, 21, 0.5);
  color: #fff; /* Garante que o número continue legível */
}
</style>