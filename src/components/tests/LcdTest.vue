<template>
  <div class="test-container">
    <header class="test-header">
      <div class="title-group">
        <h4 class="tech-font">TESTE DE LCD</h4>
        <button class="btn-glass back-neon tech-font" @click="goBack">VOLTAR</button>
      </div>
      <div class="device-mini-info tech-font">
        {{ realWidth }}x{{ realHeight }} | {{ colorDepth }}BITS
      </div>
    </header>

    <div class="main-layout">
      <div class="test-content glass-panel">
        <div class="test-grid">
          <button @click="startTest('colors')" class="card-glass neon-blue">
            <span class="card-label tech-font">CORES SÓLIDAS</span>
          </button>
          <button @click="startTest('gradients')" class="card-glass neon-purple">
            <span class="card-label tech-font">GRADIENTES</span>
          </button>
          <button @click="startTest('alignment')" class="card-glass neon-orange">
            <span class="card-label tech-font">ALINHAMENTO</span>
          </button>
        </div>
      </div>

      <aside class="decision-sidebar">
        <button class="btn-glass pass-neon tech-font" @click="endTest('PASS')">PASS</button>
        <button class="btn-glass fail-neon tech-font" @click="endTest('FAIL')">FAIL</button>
      </aside>
    </div>

    <div v-if="isTesting" class="fullscreen-overlay" @click="nextStep">
      <div v-if="testMode === 'colors'" :style="{ backgroundColor: colors[currentIndex] }" class="full-screen"></div>
      
      <div v-if="testMode === 'gradients'" :style="{ background: gradients[currentIndex] }" class="full-screen"></div>
      
      <div v-if="testMode === 'alignment'" class="alignment-pattern full-screen">
        <div class="grid-lines"></div>
        <div class="safe-area-rect"></div>
        <div class="circle-center"></div>
        
        <div class="corner-box top-left"></div>
        <div class="corner-box top-right"></div>
        <div class="corner-box bot-left"></div>
        <div class="corner-box bot-right"></div>
        
        <div class="center-cross"></div>
      </div>

      <div class="test-hint tech-font">
        {{ currentLabel }} | CLIQUE PARA AVANÇAR | ESC PARA SAIR
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

const emit = defineEmits(['test-completed', 'test-cancelled']);

// Estados
const isTesting = ref(false);
const testMode = ref('');
const currentIndex = ref(0);

// Resolução e Profundidade (Cálculo Real)
const realWidth = computed(() => Math.round(window.screen.width * window.devicePixelRatio));
const realHeight = computed(() => Math.round(window.screen.height * window.devicePixelRatio));
const colorDepth = ref(window.screen.colorDepth);

// Dados do Teste
const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF', '#000000', '#FFFF00', '#FF00FF'];
const gradients = [
  'linear-gradient(180deg, #000000 0%, #FFFFFF 100%)', // Preto e Branco
  'linear-gradient(90deg, red, yellow, green, cyan, blue, magenta, red)', // Espectro
  'radial-gradient(circle, #888888 0%, #000000 100%)' // Radial Foco
];

const currentLabel = computed(() => {
  if (testMode.value === 'colors') return `COR SÓLIDA: ${currentIndex.value + 1}/${colors.length}`;
  if (testMode.value === 'gradients') return `GRADIENTE: ${currentIndex.value + 1}/${gradients.length}`;
  return 'PADRÃO DE ALINHAMENTO TÉCNICO';
});

// Funções de Controle
const startTest = async (mode) => {
  testMode.value = mode;
  currentIndex.value = 0;
  isTesting.value = true;
  try {
    const elem = document.documentElement;
    if (elem.requestFullscreen) await elem.requestFullscreen();
  } catch (err) {
    console.error("Erro ao entrar em tela cheia:", err);
  }
};

const nextStep = () => {
  if (testMode.value === 'colors' && currentIndex.value < colors.length - 1) {
    currentIndex.value++;
  } else if (testMode.value === 'gradients' && currentIndex.value < gradients.length - 1) {
    currentIndex.value++;
  } else {
    exitFullscreen();
  }
};

const exitFullscreen = () => {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  }
  isTesting.value = false;
};

const endTest = (result) => emit('test-completed', result);
const goBack = () => emit('test-cancelled');

// Listener para tecla ESC e mudanças de tela cheia
const handleFullscreenChange = () => {
  if (!document.fullscreenElement) {
    isTesting.value = false;
  }
};

onMounted(() => {
  document.addEventListener('fullscreenchange', handleFullscreenChange);
});

onUnmounted(() => {
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
});
</script>

<style scoped>
/* CONFIGURAÇÃO BASE */
.test-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
  color: var(--text-main);
  padding: 10px;
  height: 100%;
}

.tech-font { font-family: var(--font-tech); letter-spacing: 2px; }

/* HEADER */
.test-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border);
  padding-bottom: 12px;
}

.title-group { display: flex; align-items: center; gap: 20px; }
.title-group h4 { margin: 0; color: var(--accent); text-transform: uppercase; }

.device-mini-info { font-size: 0.8rem; color: var(--text-dim); font-weight: bold; }

/* LAYOUT PRINCIPAL */
.main-layout {
  display: grid;
  grid-template-columns: 1fr 100px;
  gap: 20px;
  flex-grow: 1;
}

/* PAINEL GLASS */
.glass-panel {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  border-radius: 15px;
  padding: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.test-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  width: 100%;
}

/* BOTÕES ESTILO GLASS ON NEON */
.btn-glass {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-main);
  font-family: var(--font-tech);
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* BOTÃO VOLTAR */
.back-neon { 
  padding: 6px 18px; 
  border-radius: 4px; 
  font-size: 0.75rem; 
}
.back-neon:hover { 
  background: rgba(255, 255, 255, 0.1);
  box-shadow: 0 0 15px var(--accent-glow);
  color: var(--accent);
  border-color: var(--accent);
}

/* PASS / FAIL SIDEBAR */
.decision-sidebar { display: flex; flex-direction: column; gap: 15px; }

.pass-neon { 
  height: 50%; border-radius: 10px; font-size: 1.1rem; 
}
.pass-neon:hover { 
  background: rgba(78, 205, 196, 0.15);
  box-shadow: 0 0 25px var(--status-pass-glow);
  color: var(--text-success);
  border-color: var(--text-success);
}

.fail-neon { 
  height: 50%; border-radius: 10px; font-size: 1.1rem;
}
.fail-neon:hover { 
  background: rgba(231, 76, 60, 0.15);
  box-shadow: 0 0 25px var(--status-fail-glow);
  color: #ff4d4d;
  border-color: #ff4d4d;
}

/* CARDS DE SELEÇÃO */
.card-glass {
  height: 140px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.02);
  cursor: pointer;
}

.card-label { font-size: 0.95rem; color: var(--text-dim); }
.card-glass:hover .card-label { color: var(--text-main); }

.neon-blue:hover { border-color: #00d2ff; box-shadow: 0 0 20px rgba(0, 210, 255, 0.3); }
.neon-purple:hover { border-color: #a855f7; box-shadow: 0 0 20px rgba(168, 85, 247, 0.3); }
.neon-orange:hover { border-color: var(--accent); box-shadow: 0 0 20px var(--accent-glow); }

/* PADRÃO DE ALINHAMENTO (CSS DRAWING) */
.alignment-pattern { background: #000; position: relative; }
.grid-lines { 
  position: absolute; inset: 0; 
  background-image: 
    linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px);
  background-size: 50px 50px;
}
.safe-area-rect { position: absolute; width: 96%; height: 94%; border: 1px dashed rgba(255,255,255,0.3); }
.circle-center { position: absolute; width: 500px; height: 500px; border: 1px solid rgba(255,255,255,0.4); border-radius: 50%; }

.center-cross { position: absolute; width: 120px; height: 120px; }
.center-cross::before { content:''; position: absolute; width: 100%; height: 1px; background: var(--accent); top: 50%; }
.center-cross::after { content:''; position: absolute; width: 1px; height: 100%; background: var(--accent); left: 50%; }

.corner-box { position: absolute; width: 100px; height: 100px; border: 2px solid var(--accent); opacity: 0.6; }
.top-left { top: 0; left: 0; border-right: none; border-bottom: none; }
.top-right { top: 0; right: 0; border-left: none; border-bottom: none; }
.bot-left { bottom: 0; left: 0; border-right: none; border-top: none; }
.bot-right { bottom: 0; right: 0; border-left: none; border-top: none; }

/* FULLSCREEN OVERLAY */
.fullscreen-overlay { position: fixed; inset: 0; z-index: 9999; cursor: crosshair; display: flex; align-items: center; justify-content: center; }
.full-screen { width: 100%; height: 100%; }

.test-hint {
  position: absolute; bottom: 30px; 
  background: rgba(0,0,0,0.85); padding: 12px 35px; 
  border: 1px solid var(--accent); color: var(--accent); 
  font-size: 0.85rem; border-radius: 4px;
}
</style>