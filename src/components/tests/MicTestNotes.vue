<template>
  <div class="test-container">
    <header class="test-header">
      <div class="title-group">
        <h4 class="tech-font">DIAGNÓSTICO AUTOMÁTICO: SPEAKER & MIC</h4>
        <button class="btn-glass back-neon tech-font" @click="goBack">VOLTAR</button>
      </div>
      <div class="device-mini-info tech-font">
        <span v-if="testInProgress" class="status-blink text-accent">ANALISANDO FREQUÊNCIAS...</span>
        <span v-else class="text-dim">AGUARDANDO START</span>
      </div>
    </header>

    <div class="main-layout">
      <div class="test-content glass-panel">
        
        <div class="viz-section">
          <canvas ref="canvasRef" class="waveform-canvas card-glass" width="600" height="180"></canvas>
          <div class="freq-display tech-font">
            <span class="freq-label">SINAL CAPTADO:</span>
            <span :class="['freq-value', { 'text-active': currentFreq > 0 }]">
              {{ currentFreq > 0 ? currentFreq.toFixed(2) + ' Hz' : '---' }}
            </span>
          </div>
        </div>

        <div class="config-grid">
          <div class="note-box card-glass">
            <label class="tech-font mini-label">FREQUÊNCIA DE TESTE:</label>
            <div class="note-buttons">
              <button 
                v-for="n in notes" 
                :key="n.name"
                :class="['note-btn', { active: selectedNote?.name === n.name }]"
                @click="selectedNote = n"
                :disabled="testInProgress"
              >
                {{ n.name }}<br><small>{{ n.freq }}Hz</small>
              </button>
            </div>
          </div>

          <div class="results-box card-glass">
            <label class="tech-font mini-label">RESULTADO POR CANAL:</label>
            <div class="channel-res">
              <span class="tech-font">ESQUERDO (L):</span>
              <span :class="['res-tag', getStatusClass(capturedFreqs.left)]">
                {{ formatResult(capturedFreqs.left) }}
              </span>
            </div>
            <div class="channel-res">
              <span class="tech-font">DIREITO (R):</span>
              <span :class="['res-tag', getStatusClass(capturedFreqs.right)]">
                {{ formatResult(capturedFreqs.right) }}
              </span>
            </div>
          </div>
        </div>

        <div v-if="finalResult" :class="['final-banner', finalResult.type]">
          <h2 class="tech-font">{{ finalResult.title }}</h2>
          <p>{{ finalResult.msg }}</p>
        </div>
      </div>

      <aside class="decision-sidebar">
        <button class="btn-sidebar start-neon tech-font" @click="startFullTest" :disabled="testInProgress || !selectedNote">
          INICIAR<br>TESTE
        </button>
        <button class="btn-sidebar fail-neon tech-font" @click="endTest('FAIL')">
          FALHA<br>MANUAL
        </button>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';

const emit = defineEmits(['test-completed', 'test-cancelled']);

// Estados e Refs
const canvasRef = ref(null);
const currentFreq = ref(0);
const testInProgress = ref(false);
const selectedNote = ref({ name: 'A4', freq: 440.00 }); // Default
const capturedFreqs = ref({ left: null, right: null });
const finalResult = ref(null);

const notes = [
  { name: 'C4', freq: 261.63 },
  { name: 'A4', freq: 440.00 },
  { name: 'C5', freq: 523.25 },
  { name: 'G5', freq: 783.99 }
];

let audioCtx = null;
let analyser = null;
let stream = null;
let animationId = null;

// Inicializa Áudio Bruto
async function initAudio() {
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    stream = await navigator.mediaDevices.getUserMedia({ 
      audio: { 
        echoCancellation: false, 
        noiseSuppression: false, 
        autoGainControl: false 
      } 
    });
    const source = audioCtx.createMediaStreamSource(stream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 4096; // Alta precisão para frequências
    source.connect(analyser);
    drawSpectrogram();
  } catch (e) {
    console.error("Erro ao acessar hardware de áudio:", e);
  }
}

// Loop de Desenho e Detecção de Frequência
function drawSpectrogram() {
  if (!canvasRef.value) return;
  const ctx = canvasRef.value.getContext('2d');
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  
  const render = () => {
    animationId = requestAnimationFrame(render);
    analyser.getByteFrequencyData(dataArray);
    
    // Limpar Canvas
    ctx.fillStyle = '#10181d';
    ctx.fillRect(0, 0, canvasRef.value.width, canvasRef.value.height);
    
    let maxVal = 0;
    let maxIndex = 0;
    const barWidth = (canvasRef.value.width / bufferLength) * 12;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const val = dataArray[i];
      if (val > maxVal) { maxVal = val; maxIndex = i; }

      if (val > 0) {
        const barHeight = (val / 255) * canvasRef.value.height;
        ctx.fillStyle = `hsl(${180 + val/2}, 100%, 50%)`;
        ctx.fillRect(x, canvasRef.value.height - barHeight, barWidth, barHeight);
      }
      x += barWidth + 1;
    }

    // Filtro de Ruído: Só reconhece frequência se o volume for alto (> 110)
    if (maxVal > 110) {
      currentFreq.value = maxIndex * (audioCtx.sampleRate / analyser.fftSize);
    } else {
      currentFreq.value = 0;
    }
  };
  render();
}

// Reprodução com Pan Estéreo
function playTone(freq, channel) {
  const duration = 3.0; 
  const osc = audioCtx.createOscillator();
  const panner = audioCtx.createStereoPanner();
  const gain = audioCtx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  panner.pan.value = channel === 'left' ? -1 : 1;
  
  gain.gain.setValueAtTime(0, audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0.7, audioCtx.currentTime + 0.2); // Fade In
  gain.gain.setValueAtTime(0.7, audioCtx.currentTime + duration - 0.5); // Sustain
  gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration); // Fade Out

  osc.connect(panner);
  panner.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

// Lógica de Teste Automatizado
async function startFullTest() {
  if (testInProgress.value) return;
  
  testInProgress.value = true;
  capturedFreqs.value = { left: null, right: null };
  finalResult.value = null;

  const runChannel = async (side) => {
    let samples = [];
    playTone(selectedNote.value.freq, side);

    // Monitora a frequência durante o tempo de reprodução
    const checkInterval = setInterval(() => {
      if (currentFreq.value > 0) samples.push(currentFreq.value);
    }, 100);

    return new Promise(resolve => {
      setTimeout(() => {
        clearInterval(checkInterval);
        // Pega a média das capturas para maior precisão
        if (samples.length > 0) {
          const sum = samples.reduce((a, b) => a + b, 0);
          capturedFreqs.value[side] = sum / samples.length;
        } else {
          capturedFreqs.value[side] = 0;
        }
        resolve();
      }, 3200);
    });
  };

  await runChannel('left');
  await new Promise(r => setTimeout(r, 800)); // Pausa entre canais
  await runChannel('right');

  evaluateResult();
  testInProgress.value = false;
}

function evaluateResult() {
  const target = selectedNote.value.freq;
  const margin = target * 0.18; // 18% de tolerância

  const lPass = Math.abs(capturedFreqs.value.left - target) < margin;
  const rPass = Math.abs(capturedFreqs.value.right - target) < margin;

  if (lPass && rPass) {
    finalResult.value = { type: 'pass', title: '✓ PASSOU', msg: 'Speaker Stereo e Microfone validados com sucesso.' };
    setTimeout(() => endTest('PASS'), 3000);
  } else {
    let msg = !lPass ? "L falhou. " : "";
    msg += !rPass ? "R falhou." : "";
    finalResult.value = { type: 'fail', title: '✗ REPROVADO', msg: msg };
  }
}

// Helpers de UI
const getStatusClass = (val) => {
  if (val === null) return 'wait';
  const margin = selectedNote.value.freq * 0.15;
  return Math.abs(val - selectedNote.value.freq) < margin ? 'pass' : 'fail';
};

const formatResult = (val) => {
  if (val === null) return '---';
  return val > 0 ? val.toFixed(1) + ' Hz' : 'SEM SINAL';
};

const endTest = (res) => { stopAll(); emit('test-completed', res); };
const goBack = () => { stopAll(); emit('test-cancelled'); };

function stopAll() {
  if (animationId) cancelAnimationFrame(animationId);
  if (stream) stream.getTracks().forEach(t => t.stop());
  if (audioCtx) audioCtx.close();
}

onMounted(initAudio);
onBeforeUnmount(stopAll);
</script>

<style scoped>
.test-container { display: flex; flex-direction: column; gap: 15px; color: #fff; height: 100%; padding: 15px; background: #0b1114; }
.tech-font { font-family: 'Consolas', monospace; letter-spacing: 1px; }

.main-layout { display: grid; grid-template-columns: 1fr 120px; gap: 20px; flex-grow: 1; }

.glass-panel {
  background: rgba(255, 255, 255, 0.02); backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.08); border-radius: 15px; padding: 25px;
  display: flex; flex-direction: column; gap: 20px;
}

.waveform-canvas { width: 100%; height: 180px; background: #000; border-radius: 8px; border: 1px solid #222; }

.freq-display { text-align: center; margin-top: 12px; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 8px; }
.freq-value { font-size: 1.8rem; margin-left: 15px; color: #444; transition: 0.3s; }
.text-active { color: #00ff41; text-shadow: 0 0 15px rgba(0,255,65,0.6); }

.config-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

.mini-label { font-size: 0.75rem; color: #888; margin-bottom: 10px; display: block; }
.card-glass { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 15px; border-radius: 10px; }

.note-buttons { display: flex; gap: 8px; }
.note-btn {
  flex: 1; padding: 8px; border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.05); color: #ccc; border-radius: 6px; cursor: pointer; font-size: 0.8rem;
}
.note-btn.active { border-color: #00ff41; background: rgba(0,255,65,0.1); color: #00ff41; }
.note-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.channel-res { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.res-tag { padding: 4px 10px; border-radius: 4px; font-size: 0.85rem; font-weight: bold; min-width: 80px; text-align: center; }
.res-tag.wait { background: #222; color: #555; }
.res-tag.pass { background: rgba(0,255,65,0.15); color: #00ff41; border: 1px solid #00ff41; }
.res-tag.fail { background: rgba(255,77,77,0.15); color: #ff4d4d; border: 1px solid #ff4d4d; }

.final-banner { padding: 20px; border-radius: 8px; text-align: center; border-width: 2px; border-style: solid; }
.final-banner.pass { background: rgba(0,255,65,0.05); border-color: #00ff41; color: #00ff41; }
.final-banner.fail { background: rgba(255,77,77,0.05); border-color: #ff4d4d; color: #ff4d4d; }

/* SIDEBAR PADRÃO */
.decision-sidebar { display: flex; flex-direction: column; gap: 20px; justify-content: center; }
.btn-sidebar {
  width: 100px; height: 100px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.05); color: #fff; cursor: pointer; font-size: 0.75rem; transition: 0.3s;
}
.start-neon:not(:disabled):hover { border-color: #00ff41; color: #00ff41; box-shadow: 0 0 20px rgba(0,255,65,0.3); }
.fail-neon:hover { border-color: #ff4d4d; color: #ff4d4d; box-shadow: 0 0 20px rgba(255,77,77,0.3); }
.btn-sidebar:disabled { opacity: 0.3; filter: grayscale(1); }

.status-blink { animation: blink 1.5s infinite; color: #ff9800; font-size: 0.8rem; }
@keyframes blink { 50% { opacity: 0.3; } }
</style>