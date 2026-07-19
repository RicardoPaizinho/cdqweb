<template>
  <div class="test-container">
    <header class="test-header">
      <div class="title-group">
        <h4 class="tech-font">TESTE DE TOUCHPAD / MOUSE</h4>
        <button class="btn-glass back-neon tech-font" @click="goBack">VOLTAR</button>
      </div>
      
      <!-- Grupo de Controle Superior Centralizado/Direita -->
      <div class="header-controls">
        <div class="device-mini-info tech-font">
          STATUS: {{ allDone ? 'PRONTO' : 'EXECUTANDO' }}
        </div>
        <div class="decision-group">
          <button 
            class="btn-header pass-neon tech-font" 
            :disabled="!allDone"
            @click="endTest('PASS')"
          >
            PASS
          </button>
          <button class="btn-header fail-neon tech-font" @click="endTest('FAIL')">
            FAIL
          </button>
        </div>
      </div>
    </header>

    <div class="main-layout">
      <div class="test-content glass-panel">
        <div class="interaction-grid">
          
          <div class="trackpad-section">
            <h5 class="tech-font panel-label">Superfície de Rastreamento</h5>
            <div class="trackpad-surface">
              <div class="grid-lines"></div>
              <div 
                class="tracking-dot" 
                :style="{ left: dotPos.x + '%', top: dotPos.y + '%' }"
              ></div>
              <p class="coordinate-display tech-font">X: {{ Math.round(dotPos.x) }} Y: {{ Math.round(dotPos.y) }}</p>
            </div>

            <div class="physical-buttons">
              <div class="btn-hw-neon" :class="{ active: buttons.left }">
                <span class="tech-font">LEFT CLICK</span>
              </div>
              <div class="btn-hw-neon" :class="{ active: buttons.right }">
                <span class="tech-font">RIGHT CLICK</span>
              </div>
            </div>
          </div>

          <div class="tools-section">
            <h5 class="tech-font panel-label">Testes Dinâmicos</h5>
            
            <div class="tools-row">
              <div class="scroll-widget card-glass" :class="{ 'neon-blue': checks.scroll }">
                <div class="scroll-track">
                  <div class="scroll-handle" :style="{ transform: `translateY(${scrollOffset}px)` }"></div>
                </div>
                <span class="tech-font mini-label">SCROLL</span>
              </div>

              <div class="drag-bench card-glass" :class="{ 'neon-purple': checks.drag }">
                <div v-if="!checks.drag" class="drag-item" draggable="true" @dragstart="onDragStart">
                  <div class="drag-icon">📦</div>
                </div>
                <div 
                  class="drop-target" 
                  :class="{ over: isOver, success: checks.drag }" 
                  @dragover.prevent="isOver = true" 
                  @dragleave="isOver = false" 
                  @drop="onDrop"
                >
                  <span v-if="checks.drag" class="success-icon">✅</span>
                  <span v-else class="tech-font">ALVO</span>
                </div>
              </div>
            </div>

            <div class="status-checklist card-glass neon-orange">
               <div v-for="(val, key) in checks" :key="key" class="check-item" :class="{ done: val }">
                  <div class="led"></div>
                  <span class="tech-font label">{{ formatLabel(key) }}</span>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue';

const emit = defineEmits(['test-completed', 'test-cancelled']);

const checks = reactive({
  leftClick: false,
  leftDblClick: false,
  rightClick: false,
  rightDblClick: false,
  scroll: false,
  drag: false
});

const dotPos = reactive({ x: 50, y: 50 });
const buttons = reactive({ left: false, right: false });
const scrollOffset = ref(0);
const isOver = ref(false);
let lastRightClickTime = 0;

const allDone = computed(() => Object.values(checks).every(v => v === true));

const formatLabel = (key) => {
  const map = {
    leftClick: 'CLIQUE ESQ.',
    leftDblClick: 'DUPLO ESQ.',
    rightClick: 'CLIQUE DIR.',
    rightDblClick: 'DUPLO DIR.',
    scroll: 'SCROLL',
    drag: 'DRAG & DROP'
  };
  return map[key];
};

const onGlobalMouseMove = (e) => {
  dotPos.x = (e.clientX / window.innerWidth) * 100;
  dotPos.y = (e.clientY / window.innerHeight) * 100;
};

const onGlobalMouseDown = (e) => {
  if (e.button === 0) { buttons.left = true; checks.leftClick = true; }
  if (e.button === 2) { buttons.right = true; checks.rightClick = true; }
};

const onGlobalMouseUp = (e) => {
  if (e.button === 0) buttons.left = false;
  if (e.button === 2) buttons.right = false;
};

const onGlobalDblClick = (e) => { if (e.button === 0) checks.leftDblClick = true; };

const onContextMenu = (e) => {
  e.preventDefault();
  const now = Date.now();
  if (now - lastRightClickTime < 350) checks.rightDblClick = true;
  lastRightClickTime = now;
};

const onWheel = (e) => {
  scrollOffset.value = Math.max(-20, Math.min(20, e.deltaY));
  checks.scroll = true;
  setTimeout(() => { scrollOffset.value = 0; }, 200);
};

const onDragStart = (e) => e.dataTransfer.setData("text", "ok");
const onDrop = () => { isOver.value = false; checks.drag = true; };

const endTest = (res) => emit('test-completed', res);
const goBack = () => emit('test-cancelled');

onMounted(() => {
  window.addEventListener('mousemove', onGlobalMouseMove);
  window.addEventListener('mousedown', onGlobalMouseDown);
  window.addEventListener('mouseup', onGlobalMouseUp);
  window.addEventListener('dblclick', onGlobalDblClick);
  window.addEventListener('contextmenu', onContextMenu);
  window.addEventListener('wheel', onWheel);
});

onUnmounted(() => {
  window.removeEventListener('mousemove', onGlobalMouseMove);
  window.removeEventListener('mousedown', onGlobalMouseDown);
  window.removeEventListener('mouseup', onGlobalMouseUp);
  window.removeEventListener('dblclick', onGlobalDblClick);
  window.removeEventListener('contextmenu', onContextMenu);
  window.removeEventListener('wheel', onWheel);
});
</script>

<style scoped>
/* CONFIGURAÇÃO BASE */
.test-container { display: flex; flex-direction: column; gap: 15px; color: var(--text-main); padding: 10px; height: 100%; }
.tech-font { font-family: var(--font-tech); letter-spacing: 2px; font-weight: bold; }

/* HEADER */
.test-header {
  display: flex; justify-content: space-between; align-items: center;
  border-bottom: 1px solid var(--border); padding-bottom: 12px;
}
.title-group { display: flex; align-items: center; gap: 20px; }
.title-group h4 { margin: 0; color: var(--accent); text-transform: uppercase; }

.header-controls { display: flex; align-items: center; gap: 20px; }
.decision-group { display: flex; gap: 10px; }

/* LAYOUT PRINCIPAL (Ocupa largura total agora) */
.main-layout { display: grid; grid-template-columns: 1fr; gap: 20px; flex-grow: 1; }

/* PAINEL GLASS */
.glass-panel {
  background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(12px);
  border: 1px solid var(--border); border-radius: 15px; padding: 25px;
}
.interaction-grid { display: grid; grid-template-columns: 1.4fr 1.1fr; gap: 25px; }
.panel-label { font-size: 0.75rem; color: var(--accent); margin-bottom: 15px; }

/* TRACKPAD & DOTS */
.trackpad-surface {
  height: 240px; background: rgba(0,0,0,0.3); border-radius: 10px;
  position: relative; overflow: hidden; border: 1px solid var(--border);
}
.grid-lines {
  position: absolute; inset: 0;
  background-image: radial-gradient(var(--border) 1px, transparent 1px);
  background-size: 25px 25px;
}
.tracking-dot {
  position: absolute; width: 16px; height: 16px; background: var(--accent);
  border-radius: 50%; box-shadow: 0 0 15px var(--accent-glow);
  transform: translate(-50%, -50%); pointer-events: none;
}
.coordinate-display { position: absolute; bottom: 10px; right: 15px; font-size: 0.7rem; color: var(--text-dim); }

/* BOTÕES HW NEON */
.physical-buttons { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px; }
.btn-hw-neon {
  height: 55px; background: rgba(255,255,255,0.03); border: 1px solid var(--border);
  border-radius: 8px; display: flex; align-items: center; justify-content: center;
  color: var(--text-dim); transition: 0.2s;
}
.btn-hw-neon.active {
  background: var(--accent-glow); border-color: var(--accent);
  color: var(--text-main); box-shadow: 0 0 15px var(--accent-glow);
}

/* FERRAMENTAS DINÂMICAS */
.tools-row { display: flex; gap: 15px; margin-bottom: 20px; }
.scroll-widget { width: 70px; height: 140px; display: flex; flex-direction: column; align-items: center; padding: 8px; gap: 8px; }
.scroll-track { width: 4px; flex-grow: 1; background: rgba(0,0,0,0.5); border-radius: 2px; position: relative; }
.scroll-handle { width: 12px; height: 25px; background: var(--accent); border-radius: 3px; left: -4px; position: absolute; }
.mini-label { font-size: 0.55rem; color: var(--text-dim); }

.drag-bench { flex-grow: 1; height: 140px; display: flex; align-items: center; justify-content: space-around; }
.drag-icon { font-size: 1.8rem; cursor: grab; }
.drop-target { width: 90px; height: 70px; border: 2px dashed var(--border); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: var(--text-dim); font-size: 0.65rem; }
.drop-target.success { border-style: solid; border-color: var(--text-success); color: var(--text-success); }

/* CHECKLIST */
.status-checklist { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding: 12px; }
.check-item { display: flex; align-items: center; gap: 8px; opacity: 0.3; }
.check-item.done { opacity: 1; }
.led { width: 6px; height: 6px; border-radius: 50%; background: #444; }
.done .led { background: var(--text-success); box-shadow: 0 0 8px var(--status-pass-glow); }
.check-item .label { font-size: 0.6rem; color: var(--text-main); }

/* =========================================================
   ESTILOS PADRONIZADOS MODIFICADOS (BOTOES NO HEADER)
   ========================================================= */

/* Botão Voltar (Top) */
.btn-glass.back-neon {
  padding: 6px 18px; border-radius: 4px; font-size: 0.75rem;
  background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-main); cursor: pointer; transition: 0.3s;
}
.btn-glass.back-neon:hover {
  box-shadow: 0 0 15px var(--accent-glow); color: var(--accent); border-color: var(--accent);
}

/* Novos botões de controle horizontal no Header */
.btn-header {
  padding: 6px 20px; font-size: 0.8rem;
  border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05); color: var(--text-main);
  cursor: pointer; transition: 0.3s; display: flex;
  align-items: center; justify-content: center;
}

.pass-neon:disabled { opacity: 0.1; cursor: not-allowed; border-color: transparent; }

.pass-neon:hover:not(:disabled) {
  background: rgba(78, 205, 196, 0.15); color: var(--text-success);
  border-color: var(--text-success); box-shadow: 0 0 15px var(--status-pass-glow);
}

.fail-neon:hover {
  background: rgba(231, 76, 60, 0.15); color: #ff4d4d;
  border-color: #ff4d4d; box-shadow: 0 0 15px var(--status-fail-glow);
}

.card-glass { background: rgba(255,255,255,0.02); border: 1px solid var(--border); border-radius: 12px; }
</style>