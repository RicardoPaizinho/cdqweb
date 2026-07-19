<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, nextTick } from 'vue';

const emit = defineEmits(['test-completed', 'test-cancelled']);

const testedKeys = ref(new Set());
const activeKeys = ref(new Set());
const historyArray = ref([]);
const historyRef = ref(null);
const currentKey = reactive({ code: '' });

const canPass = computed(() => testedKeys.value.size >= 74);

// Layouts ABNT2 - Organizados por Seções
const layoutMain = [
  [{code:'Escape', label:'Esc'},{code:'F1', label:'F1'},{code:'F2', label:'F2'},{code:'F3', label:'F3'},{code:'F4', label:'F4'},{code:'F5', label:'F5'},{code:'F6', label:'F6'},{code:'F7', label:'F7'},{code:'F8', label:'F8'},{code:'F9', label:'F9'},{code:'F10', label:'F10'},{code:'F11', label:'F11'},{code:'F12', label:'F12'}],
  [{code:'Backquote', label:'\''},{code:'Digit1', label:'1'},{code:'Digit2', label:'2'},{code:'Digit3', label:'3'},{code:'Digit4', label:'4'},{code:'Digit5', label:'5'},{code:'Digit6', label:'6'},{code:'Digit7', label:'7'},{code:'Digit8', label:'8'},{code:'Digit9', label:'9'},{code:'Digit0', label:'0'},{code:'Minus', label:'-'},{code:'Equal', label:'='},{code:'Backspace', label:'←', class:'w-backspace'}],
  [{code:'Tab', label:'Tab', class:'w-tab'},{code:'KeyQ', label:'Q'},{code:'KeyW', label:'W'},{code:'KeyE', label:'E'},{code:'KeyR', label:'R'},{code:'KeyT', label:'T'},{code:'KeyY', label:'Y'},{code:'KeyU', label:'U'},{code:'KeyI', label:'I'},{code:'KeyO', label:'O'},{code:'KeyP', label:'P'},{code:'BracketLeft', label:'´'},{code:'BracketRight', label:'['},{code:'Enter', label:'Ent', class:'w-enter'}],
  [{code:'CapsLock', label:'Caps', class:'w-caps'},{code:'KeyA', label:'A'},{code:'KeyS', label:'S'},{code:'KeyD', label:'D'},{code:'KeyF', label:'F'},{code:'KeyG', label:'G'},{code:'KeyH', label:'H'},{code:'KeyJ', label:'J'},{code:'KeyK', label:'K'},{code:'KeyL', label:'L'},{code:'Semicolon', label:'Ç'},{code:'Quote', label:'~'},{code:'Backslash', label:']'}],
  [{code:'ShiftLeft', label:'Shift', class:'w-shift-l'},{code:'IntlBackslash', label:'\\'},{code:'KeyZ', label:'Z'},{code:'KeyX', label:'X'},{code:'KeyC', label:'C'},{code:'KeyV', label:'V'},{code:'KeyB', label:'B'},{code:'KeyN', label:'N'},{code:'KeyM', label:'M'},{code:'Comma', label:','},{code:'Period', label:'.'},{code:'Slash', label:';'},{code:'IntlRo', label:'/'},{code:'ShiftRight', label:'Shift', class:'w-shift-r'}],
  [{code:'ControlLeft', label:'Ctrl', class:'w-ctrl'},{code:'MetaLeft', label:'Win'},{code:'AltLeft', label:'Alt'},{code:'Space', label:'Space', class:'w-space'},{code:'AltRight', label:'AltGr'},{code:'MetaRight', label:'Win'},{code:'ContextMenu', label:'Menu'},{code:'ControlRight', label:'Ctrl', class:'w-ctrl'}]
];

const layoutMid = [
  [{code:'PrintScreen', label:'PrtSc'},{code:'ScrollLock', label:'ScrLk'},{code:'Pause', label:'Paus'}],
  [{code:'Insert', label:'Ins'},{code:'Home', label:'Hm'},{code:'PageUp', label:'PgU'}],
  [{code:'Delete', label:'Del'},{code:'End', label:'End'},{code:'PageDown', label:'PgD'}],
  ['EMPTY'], 
  ['EMPTY_ARROW', {code:'ArrowUp', label:'▲'}, 'EMPTY_ARROW'], 
  [{code:'ArrowLeft', label:'◄'},{code:'ArrowDown', label:'▼'},{code:'ArrowRight', label:'►'}]
];

const layoutNum = [
  [{code:'NumLock', label:'Num'},{code:'NumpadDivide', label:'/'},{code:'NumpadMultiply', label:'*'},{code:'NumpadSubtract', label:'-'}],
  [{code:'Numpad7', label:'7'},{code:'Numpad8', label:'8'},{code:'Numpad9', label:'9'},{code:'NumpadAdd', label:'+', class:'h-2'}],
  [{code:'Numpad4', label:'4'},{code:'Numpad5', label:'5'},{code:'Numpad6', label:'6'},'EMPTY'],
  [{code:'Numpad1', label:'1'},{code:'Numpad2', label:'2'},{code:'Numpad3', label:'3'},{code:'NumpadEnter', label:'Ent', class:'h-2'}],
  [{code:'Numpad0', label:'0', class:'w-n0'},'EMPTY',{code:'NumpadDecimal', label:','},'EMPTY']
];

const getKeyStatus = (code) => {
  if (activeKeys.value.has(code)) return 'active';
  if (testedKeys.value.has(code)) return 'tested';
  return '';
};

const handleNativeKey = (event) => {
  const vkCode = event.detail; 
  let code = '';
  
  if (vkCode === 91) code = 'MetaLeft';
  if (vkCode === 92) code = 'MetaRight';
  if (vkCode === 95) code = 'Sleep';

  if (code) {
    activeKeys.value.add(code);
    testedKeys.value.add(code);
    currentKey.code = code;
    if (!historyArray.value.includes(code)) historyArray.value.push(code);
    
    setTimeout(() => activeKeys.value.delete(code), 250);
    nextTick(() => { if(historyRef.value) historyRef.value.scrollLeft = historyRef.value.scrollWidth; });
  }
};

const handleKeyDown = (e) => {
  e.preventDefault();
  currentKey.code = e.code;
  activeKeys.value.add(e.code);
  if (!historyArray.value.includes(e.code)) historyArray.value.push(e.code);
  nextTick(() => { if(historyRef.value) historyRef.value.scrollLeft = historyRef.value.scrollWidth; });
};

const handleKeyUp = (e) => {
  activeKeys.value.delete(e.code);
  testedKeys.value.add(e.code);
};

const resetTest = () => { testedKeys.value.clear(); historyArray.value = []; };
const handlePass = () => emit('test-completed', 'PASS');
const handleFail = () => emit('test-completed', 'FAIL');
const goBack = () => emit('test-cancelled');

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  window.addEventListener('native-key-pressed', handleNativeKey);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
  window.removeEventListener('native-key-pressed', handleNativeKey);
});
</script>

<template>
  <div class="test-container">
    <header class="test-header">
      <div class="title-group">
        <h4 class="tech-font">DIAGNÓSTICO: <span class="text-accent">TECLADO ABNT2</span></h4>
        <button class="btn-glass back-neon tech-font" @click="goBack">SAIR DO TESTE</button>
      </div>
      
      <!-- Controles Superiores Unificados -->
      <div class="header-controls">
        <div class="stats-group tech-font">
          TECLAS: <span :class="{ 'text-success': canPass }">{{ testedKeys.size }}</span> / 74
          <span class="divider">|</span>
          LAST: <span class="text-accent">{{ currentKey.code || '---' }}</span>
        </div>
        <div class="decision-group">
          <button 
            class="btn-header pass-neon tech-font" 
            :disabled="!canPass" 
            @click="handlePass"
          >
            PASS
          </button>
          <button class="btn-header fail-neon tech-font" @click="handleFail">
            FAIL
          </button>
        </div>
      </div>
    </header>

    <main class="keyboard-main-content">
      <div class="history-bar card-glass">
        <div class="history-label tech-font">LOG:</div>
        <div ref="historyRef" class="history-stream tech-font">
          <span v-for="(key, idx) in historyArray" :key="idx" class="log-tag">{{ key }}</span>
        </div>
        <button @click="resetTest" class="btn-mini-reset tech-font">LIMPAR</button>
      </div>

      <div class="keyboard-viewport">
        <div class="keyboard-wrapper">
          
          <div class="keyboard-section">
            <div v-for="(row, rIdx) in layoutMain" :key="'main-'+rIdx" class="row">
              <div 
                v-for="key in row" 
                :key="key.code" 
                class="key-cap"
                :class="[key.class, getKeyStatus(key.code)]"
              >
                <span class="key-label">{{ key.label }}</span>
              </div>
            </div>
          </div>
          
          <div class="keyboard-section middle-block">
            <div v-for="(row, rIdx) in layoutMid" :key="'mid-'+rIdx" class="row">
              <template v-for="key in row">
                <div v-if="key === 'EMPTY'" class="key-spacer"></div>
                <div v-else-if="key === 'EMPTY_ARROW'" class="key-spacer-arrow"></div>
                <div v-else class="key-cap" :class="getKeyStatus(key.code)">
                  <span class="key-label">{{ key.label }}</span>
                </div>
              </template>
            </div>
          </div>

          <div class="keyboard-section">
            <div v-for="(row, rIdx) in layoutNum" :key="'num-'+rIdx" class="row">
              <template v-for="key in row">
                <div v-if="key === 'EMPTY'" class="key-spacer"></div>
                <div v-else class="key-cap" :class="[key.class, getKeyStatus(key.code)]">
                  <span class="key-label">{{ key.label }}</span>
                </div>
              </template>
            </div>
          </div>

        </div>
      </div>
    </main>

    <footer class="keyboard-footer">
      <p class="instruction tech-font">Mínimo 74 teclas para aprovação. Windows Key e Sleep são testados via Hook.</p>
    </footer>
  </div>
</template>

<style scoped>
.test-container {
  width: 100%; height: 100%;
  display: flex; flex-direction: column;
  gap: 15px; padding: 15px;
  background: #0b0e14;
}

.test-header {
  display: flex; justify-content: space-between; align-items: center;
  border-bottom: 1px solid #1f2833; padding-bottom: 10px;
}

.header-controls { display: flex; align-items: center; gap: 25px; }
.decision-group { display: flex; gap: 10px; }
.stats-group { display: flex; align-items: center; gap: 8px; color: #8b949e; font-size: 0.85rem; }
.divider { color: #1f2833; margin: 0 4px; }
.text-accent { color: var(--accent); }
.text-success { color: #3fb950; }

.keyboard-main-content {
  flex: 1; display: flex; flex-direction: column;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 12px; padding: 20px;
}

.keyboard-viewport {
  flex: 1; display: flex; align-items: center; justify-content: center;
}

.keyboard-wrapper {
  display: flex;
  flex-direction: row; 
  gap: 20px;
  transform: scale(0.95);
}

.keyboard-section { display: flex; flex-direction: column; gap: 4px; }
.row { display: flex; flex-direction: row; gap: 4px; }

/* ESTILO DAS TECLAS */
.key-cap {
  width: 44px; height: 44px;
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 4px;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.1s;
  cursor: default;
}

.key-label { font-size: 0.6rem; color: #8b949e; font-weight: bold; text-transform: uppercase; }

.key-cap.active {
  background: #238636;
  border-color: #3fb950;
  box-shadow: 0 0 15px rgba(63, 185, 80, 0.5);
  transform: translateY(2px);
}
.key-cap.active .key-label { color: #fff; }

.key-cap.tested {
  border-color: #238636;
  background: rgba(35, 134, 54, 0.15);
}
.key-cap.tested .key-label { color: #3fb950; }

/* LARGURAS ESPECÍFICAS */
.w-backspace { width: 85px; }
.w-tab { width: 65px; }
.w-caps { width: 75px; }
.w-enter { width: 85px; }
.w-shift-l { width: 55px; }
.w-shift-r { width: 105px; }
.w-ctrl { width: 65px; }
.w-space { width: 300px; }
.w-n0 { width: 92px; }
.h-2 { height: 92px; margin-bottom: -48px; z-index: 5; }

/* UTILS */
.key-spacer { width: 44px; }
.key-spacer-arrow { width: 44px; visibility: hidden; }

.history-bar { 
  display: flex; align-items: center; gap: 10px; padding: 10px;
  background: #0d1117; border-radius: 6px; margin-bottom: 15px;
}
.history-stream { flex: 1; display: flex; gap: 5px; overflow-x: auto; }
.log-tag { background: #21262d; color: #c9d1d9; padding: 2px 8px; border-radius: 3px; font-size: 0.7rem; }
.btn-mini-reset {
  background: none; border: 1px solid #30363d; color: #8b949e;
  font-size: 0.65rem; padding: 4px 10px; border-radius: 4px; cursor: pointer;
}

.keyboard-footer { 
  display: flex; justify-content: center; align-items: center; 
  padding-top: 5px; border-top: 1px solid #1f2833;
}
.instruction { font-size: 0.7rem; color: #8b949e; margin: 0; text-align: center; }

/* =========================================================
   ESTILOS PADRONIZADOS (IDÊNTICO AO DE MOUSE)
   ========================================================= */

/* Botão Voltar (Top) */
.btn-glass.back-neon {
  padding: 6px 18px; border-radius: 4px; font-size: 0.75rem;
  background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1);
  color: #c9d1d9; cursor: pointer; transition: 0.3s;
}
.btn-glass.back-neon:hover {
  box-shadow: 0 0 15px rgba(63, 185, 80, 0.3); color: #3fb950; border-color: #238636;
}

/* Botões de controle horizontal no Header */
.btn-header {
  padding: 6px 20px; font-size: 0.8rem;
  border-radius: 6px; border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05); color: #c9d1d9;
  cursor: pointer; transition: 0.3s; display: flex;
  align-items: center; justify-content: center;
}

.pass-neon:disabled { opacity: 0.1; cursor: not-allowed; border-color: transparent; }

.pass-neon:hover:not(:disabled) {
  background: rgba(35, 134, 54, 0.15); color: #3fb950;
  border-color: #238636; box-shadow: 0 0 15px rgba(35, 134, 54, 0.4);
}

.fail-neon:hover {
  background: rgba(248, 81, 73, 0.15); color: #f85149;
  border-color: #f85149; box-shadow: 0 0 15px rgba(248, 81, 73, 0.4);
}

.card-glass { background: rgba(255,255,255,0.02); border: 1px solid #30363d; border-radius: 12px; }
</style>