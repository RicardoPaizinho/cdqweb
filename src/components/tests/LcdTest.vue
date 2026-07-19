<template>
  <div class="test-container">
    <header class="test-header">
      <div class="title-group">
        <h4 class="tech-font">TESTE DE LCD</h4>
        <button class="btn-glass back-neon tech-font" @click="goBack">VOLTAR</button>
      </div>
      
      <!-- Linha Superior com os botões de Ação Direta -->
      <div class="top-action-bar tech-font">
        <button class="btn-glass header-pass-neon tech-font" @click="endTest('PASS')">PASS</button>
        <button class="btn-glass header-fail-neon tech-font" @click="endTest('FAIL')">FAIL</button>
        <span class="spec-info">{{ realWidth }}x{{ realHeight }} | {{ colorDepth }}BITS</span>
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

      <!-- Lateral com a ação de sequência contínua automática -->
      <aside class="decision-sidebar">
        <button 
          class="btn-glass loop-neon tech-font" 
          :class="{ 'loop-active': isLoopMode }" 
          @click="startLoopTest"
        >
          <div class="loop-icon" :class="{ 'rotating': isLoopMode }">↻</div>
          LOOP (2s)
        </button>
      </aside>
    </div>

    <!-- Tela Cheia de Diagnóstico -->
    <div v-if="isTesting" class="fullscreen-overlay" @click="handleOverlayClick">
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
        {{ currentLabel }} | <span v-if="!isLoopMode">SETAS / CLIQUE PARA NAVEGAR | </span>ESC PARA SAIR
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
const isLoopMode = ref(false); 
let loopInterval = null; // Referência do timer de 2 segundos

// Resolução e Profundidade (Cálculo Real)
const realWidth = computed(() => Math.round(window.screen.width * window.devicePixelRatio));
const realHeight = computed(() => Math.round(window.screen.height * window.devicePixelRatio));
const colorDepth = ref(window.screen.colorDepth);

// Dados do Teste
const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF', '#000000', '#FFFF00', '#FF00FF'];
const gradients = [
  'linear-gradient(180deg, #000000 0%, #FFFFFF 100%)', 
  'linear-gradient(90deg, red, yellow, green, cyan, blue, magenta, red)', 
  'radial-gradient(circle, #888888 0%, #000000 100%)' 
];

const currentLabel = computed(() => {
  const prefix = isLoopMode.value ? '[MODO LOOP AUTOMÁTICO 2s] ' : '[MODO MANUAL] ';
  if (testMode.value === 'colors') return `${prefix}COR SÓLIDA: ${currentIndex.value + 1}/${colors.length}`;
  if (testMode.value === 'gradients') return `${prefix}GRADIENTE: ${currentIndex.value + 1}/${gradients.length}`;
  return `${prefix}PADRÃO DE ALINHAMENTO TÉCNICO`;
});

// Funções de Controle
const startTest = async (mode) => {
  stopInterval(); // Garante a limpeza de qualquer processo residual
  testMode.value = mode;
  currentIndex.value = 0;
  isTesting.value = true;
  await enterFullscreen();
};

// Inicia o Loop Automático
const startLoopTest = async () => {
  isLoopMode.value = true;
  await startTest('colors');
  
  // Cria o timer de 2 segundos
  loopInterval = setInterval(() => {
    nextStep();
  }, 2000);
};

const enterFullscreen = async () => {
  try {
    const elem = document.documentElement;
    if (elem.requestFullscreen && !document.fullscreenElement) {
      await elem.requestFullscreen();
    }
  } catch (err) {
    console.error("Erro ao entrar em tela cheia:", err);
  }
};

const handleOverlayClick = () => {
  // Se estiver em modo loop, desabilitamos o clique para não quebrar a sincronia do timer
  if (!isLoopMode.value) {
    nextStep();
  }
};

const nextStep = () => {
  if (testMode.value === 'colors') {
    if (currentIndex.value < colors.length - 1) {
      currentIndex.value++;
    } else if (isLoopMode.value) {
      testMode.value = 'gradients';
      currentIndex.value = 0;
    } else {
      exitFullscreen();
    }
  } else if (testMode.value === 'gradients') {
    if (currentIndex.value < gradients.length - 1) {
      currentIndex.value++;
    } else if (isLoopMode.value) {
      testMode.value = 'alignment';
      currentIndex.value = 0;
    } else {
      exitFullscreen();
    }
  } else if (testMode.value === 'alignment') {
    if (isLoopMode.value) {
      testMode.value = 'colors';
      currentIndex.value = 0;
    } else {
      exitFullscreen();
    }
  }
};

const prevStep = () => {
  if (testMode.value === 'alignment') {
    testMode.value = 'gradients';
    currentIndex.value = gradients.length - 1;
  } else if (testMode.value === 'gradients') {
    if (currentIndex.value > 0) {
      currentIndex.value--;
    } else {
      testMode.value = 'colors';
      currentIndex.value = colors.length - 1;
    }
  } else if (testMode.value === 'colors') {
    if (currentIndex.value > 0) {
      currentIndex.value--;
    }
  }
};

const stopInterval = () => {
  if (loopInterval) {
    clearInterval(loopInterval);
    loopInterval = null;
  }
};

const exitFullscreen = () => {
  stopInterval();
  if (document.fullscreenElement) {
    document.exitFullscreen();
  }
  isTesting.value = false;
  isLoopMode.value = false;
};

const endTest = (result) => emit('test-completed', result);
const goBack = () => emit('test-cancelled');

// Escuta eventos de teclado (Setas e ESC)
const handleKeyDown = (event) => {
  if (!isTesting.value) return;

  // Tecla ESC para Cancelar/Sair
  if (event.key === 'Escape' || event.keyCode === 27) {
    exitFullscreen();
    return;
  }

  // Se estiver em modo loop automático, bloqueia as setas para não misturar os fluxos
  if (isLoopMode.value) return;

  // Comandos de navegação manual por setas
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    nextStep();
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    prevStep();
  }
};

const handleFullscreenChange = () => {
  if (!document.fullscreenElement) {
    exitFullscreen();
  }
};

onMounted(() => {
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  stopInterval();
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
  window.removeEventListener('keydown', handleKeyDown);
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

/* LINHA SUPERIOR DE AÇÕES (PASS / FAIL) */
.top-action-bar {
  display: flex;
  align-items: center;
  gap: 15px;
}

.spec-info {
  font-size: 0.8rem;
  color: var(--text-dim);
  font-weight: bold;
  margin-left: 5px;
}

/* LAYOUT PRINCIPAL */
.main-layout {
  display: grid;
  grid-template-columns: 1fr 120px;
  gap: 20px;
  flex-grow: 1;
}

/* PAINEL GLASS */
.test-content {
  flex-grow: 1;
}

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

/* BOTÕES GLOBAIS ESTILO GLASS */
.btn-glass {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.4s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* BOTÕES DO HEADER */
.header-pass-neon {
  padding: 8px 24px;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: bold;
}
.header-pass-neon:hover {
  background: rgba(78, 205, 196, 0.15);
  box-shadow: 0 0 15px var(--status-pass-glow);
  color: var(--text-success);
  border-color: var(--text-success);
}

.header-fail-neon {
  padding: 8px 24px;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: bold;
}
.header-fail-neon:hover {
  background: rgba(231, 76, 60, 0.15);
  box-shadow: 0 0 15px var(--status-fail-glow);
  color: #ff4d4d;
  border-color: #ff4d4d;
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

/* LATERAL COM BOTÃO LOOP */
.decision-sidebar { 
  display: flex; 
  flex-direction: column; 
}

.loop-neon {
  height: 140px;
  border-radius: 12px;
  font-size: 0.95rem;
  flex-direction: column;
  gap: 8px;
  border-color: rgba(234, 179, 8, 0.3);
  color: rgba(234, 179, 8, 0.8);
}
.loop-neon .loop-icon {
  font-size: 1.6rem;
}

/* Animação CSS para rodar continuamente em modo ativo */
.rotating {
  animation: spin 2s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loop-neon:hover, .loop-active {
  background: rgba(234, 179, 8, 0.08);
  box-shadow: 0 0 20px rgba(234, 179, 8, 0.3);
  color: #facc15;
  border-color: #facc15;
}
.loop-neon:hover .loop-icon {
  transform: rotate(180deg);
  transition: transform 0.4s ease;
}

/* CARDS DE SELEÇÃO */
.card-glass {
  height: 140px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.02);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-label { font-size: 0.95rem; color: var(--text-dim); }
.card-glass:hover .card-label { color: var(--text-main); }

.neon-blue:hover { border-color: #00d2ff; box-shadow: 0 0 20px rgba(0, 210, 255, 0.3); }
.neon-purple:hover { border-color: #a855f7; box-shadow: 0 0 20px rgba(168, 85, 247, 0.3); }
.neon-orange:hover { border-color: var(--accent); box-shadow: 0 0 20px var(--accent-glow); }

/* PADRÃO DE ALINHAMENTO */
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
.fullscreen-overlay { position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; }
.full-screen { width: 100%; height: 100%; }

.test-hint {
  position: absolute; bottom: 30px; 
  background: rgba(0,0,0,0.85); padding: 12px 35px; 
  border: 1px solid var(--accent); color: var(--accent); 
  font-size: 0.85rem; border-radius: 4px;
  pointer-events: none; /* Ignora o clique do mouse na label */
}
</style>