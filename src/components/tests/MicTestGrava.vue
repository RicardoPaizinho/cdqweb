<template>
  <div class="test-container">
    <header class="test-header">
      <div class="title-group">
        <h4 class="tech-font">TESTE DE MICROFONE</h4>
        <button class="btn-glass back-neon tech-font" @click="goBack">VOLTAR</button>
      </div>
      <div class="device-mini-info tech-font">
        STATUS: <span :class="isRecording ? 'text-accent' : 'text-dim'">{{ isRecording ? 'RECORDING' : 'READY' }}</span>
      </div>
    </header>

    <div class="main-layout">
      <div class="test-content glass-panel audio-main-area">
        
        <div class="mic-selector-bar">
          <label class="tech-font mini-label">INPUT_DEVICE:</label>
          <select v-model="selectedMicId" class="glass-select tech-font">
            <option v-for="mic in availableMics" :key="mic.id" :value="mic.id">
              {{ mic.name }}
            </option>
          </select>
        </div>

        <div class="visualizer-viewport card-glass">
          <canvas ref="canvasRef" width="450" height="150" class="neon-canvas"></canvas>
          <div v-if="!isAnimating && !audioRecorded" class="visualizer-placeholder tech-font">
            AGUARDANDO ENTRADA DE DADOS...
          </div>
        </div>

        <div class="audio-controls">
          <button 
            @click="isRecording ? stopRecording() : startRecording()"
            :disabled="!devicesDetected || isPlaying"
            class="btn-action tech-font"
            :class="{ 'rec-active': isRecording }"
          >
            <div class="status-dot" v-if="isRecording"></div>
            {{ isRecording ? 'STOP_REC' : 'START_REC' }}
          </button>

          <button 
            @click="playRecordedAudio"
            :disabled="!audioRecorded || isRecording || isPlaying"
            class="btn-action tech-font play-btn"
            :class="{ 'play-active': isPlaying }"
          >
            {{ isPlaying ? 'PLAYBACK_ACTIVE' : 'REPRODUZIR_TESTE' }}
          </button>
        </div>
      </div>

      <aside class="decision-sidebar">
        <button class="btn-sidebar pass-neon tech-font" :disabled="!audioRecorded" @click="handleEnd('PASS')">PASS</button>
        <button class="btn-sidebar fail-neon tech-font" @click="handleEnd('FAIL')">FAIL</button>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, onBeforeUnmount } from 'vue';

const emit = defineEmits(['test-completed', 'test-cancelled']);

const canvasRef = ref(null);
const devicesDetected = ref(false);
const availableMics = ref([]);
const selectedMicId = ref(null);
const isRecording = ref(false);
const isPlaying = ref(false);
const isAnimating = ref(false);
const audioRecorded = ref(null);

let audioContext = null;
let ctx = null;
let analyserNode = null;
let mediaRecorder = null;
let audioChunks = [];
let streamSource = null;
let activeAudioElement = null; // Para controlar a reprodução atual

// Captura as cores do seu theme.css
const getThemeColor = (varName) => {
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || '#3498db';
};

function drawEqualizer(dataArray) {
  if (!ctx || !canvasRef.value) return;
  const canvas = canvasRef.value;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const accentColor = getThemeColor('--accent');
  const barCount = dataArray.length;
  const gap = 4;
  const barWidth = (canvas.width / barCount) - gap;
  
  for (let i = 0; i < barCount; i++) {
    const barHeight = (dataArray[i] / 255) * canvas.height;
    
    ctx.shadowBlur = 12;
    ctx.shadowColor = accentColor;
    
    const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, accentColor);

    ctx.fillStyle = gradient;
    ctx.fillRect(i * (barWidth + gap), canvas.height - barHeight, barWidth, barHeight);
  }
}

function animate() {
  if (!isAnimating.value || !analyserNode) return;
  const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
  analyserNode.getByteFrequencyData(dataArray);
  drawEqualizer(dataArray);
  requestAnimationFrame(animate);
}

// Interrompe TUDO: gravação, reprodução e stream
function stopAll() {
  // Parar Gravação
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  // Parar Reprodução
  if (activeAudioElement) {
    activeAudioElement.pause();
    activeAudioElement.currentTime = 0;
    activeAudioElement = null;
  }
  // Parar Stream do Mic
  if (streamSource && streamSource.mediaStream) {
    streamSource.mediaStream.getTracks().forEach(t => t.stop());
  }
  
  isRecording.value = false;
  isPlaying.value = false;
  isAnimating.value = false;
}

async function startRecording() {
  stopAll(); // Garante que nada esteja rodando antes de começar
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: { deviceId: selectedMicId.value ? { exact: selectedMicId.value } : undefined } 
    });
    streamSource = audioContext.createMediaStreamSource(stream);
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 64;
    streamSource.connect(analyserNode);

    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstop = () => {
      audioRecorded.value = new Blob(audioChunks, { type: 'audio/webm' });
    };
    mediaRecorder.start();
    isRecording.value = true;
    isAnimating.value = true;
    animate();
  } catch (err) { console.error(err); }
}

function stopRecording() {
  if (mediaRecorder) mediaRecorder.stop();
  isRecording.value = false;
  isAnimating.value = false;
  if (streamSource) streamSource.mediaStream.getTracks().forEach(t => t.stop());
}

function playRecordedAudio() {
  if (!audioRecorded.value) return;
  
  const audioUrl = URL.createObjectURL(audioRecorded.value);
  activeAudioElement = new Audio(audioUrl);
  isPlaying.value = true;
  
  activeAudioElement.onended = () => {
    isPlaying.value = false;
    URL.revokeObjectURL(audioUrl);
    activeAudioElement = null;
  };
  
  activeAudioElement.play();
}

const handleEnd = (result) => {
  stopAll();
  emit('test-completed', result);
};

const goBack = () => {
  stopAll();
  emit('test-cancelled');
};

async function getMics() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const devices = await navigator.mediaDevices.enumerateDevices();
    availableMics.value = devices.filter(d => d.kind === 'audioinput').map(d => ({ id: d.deviceId, name: d.label }));
    stream.getTracks().forEach(t => t.stop());
    if (availableMics.value.length > 0) {
      devicesDetected.value = true;
      selectedMicId.value = availableMics.value[0].id;
    }
  } catch (e) { devicesDetected.value = false; }
}

onMounted(() => {
  if (canvasRef.value) ctx = canvasRef.value.getContext("2d");
  getMics();
});

onBeforeUnmount(() => stopAll());
</script>

<style scoped>
/* Estilos permanecem os mesmos, utilizando as variáveis do seu theme.css */
.test-container { display: flex; flex-direction: column; gap: 15px; color: var(--text-main); padding: 10px; height: 100%; }
.tech-font { font-family: var(--font-tech); letter-spacing: 1px; font-weight: bold; font-size: 0.75rem; }

.test-header {
  display: flex; justify-content: space-between; align-items: center;
  border-bottom: 1px solid var(--border); padding-bottom: 12px;
}
.title-group { display: flex; align-items: center; gap: 20px; }
.title-group h4 { margin: 0; color: var(--accent); text-transform: uppercase; }

.main-layout { display: grid; grid-template-columns: 1fr 100px; gap: 20px; flex-grow: 1; }

.glass-panel {
  background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(12px);
  border: 1px solid var(--border); border-radius: 15px; padding: 25px;
  display: flex; flex-direction: column; align-items: center; gap: 20px;
}

.visualizer-viewport {
  width: 100%; height: 160px; background: rgba(0,0,0,0.3);
  display: flex; align-items: center; justify-content: center; 
  position: relative; border-radius: 10px; border: 1px solid var(--border);
}
.visualizer-placeholder { position: absolute; font-size: 0.65rem; color: var(--text-dim); }
.neon-canvas { width: 100%; height: 100%; }

.mic-selector-bar {
  width: 100%; display: flex; align-items: center; gap: 15px;
  padding: 10px 15px; background: rgba(0,0,0,0.2); border-radius: 8px;
}
.mini-label { font-size: 0.6rem; color: var(--accent); }
.glass-select {
  background: transparent; border: 1px solid var(--border); color: var(--text-main);
  padding: 4px 10px; border-radius: 4px; font-size: 0.7rem; flex: 1; outline: none;
}

.audio-controls { display: flex; gap: 15px; width: 100%; }
.btn-action {
  flex: 1; height: 55px; background: rgba(255,255,255,0.05); border: 1px solid var(--border);
  color: var(--text-main); border-radius: 8px; cursor: pointer; transition: 0.3s;
  display: flex; align-items: center; justify-content: center; gap: 10px;
}

.rec-active { border-color: #ff4d4d; color: #ff4d4d; background: rgba(255,77,77,0.05); box-shadow: 0 0 15px rgba(255,77,77,0.2); }
.play-active { border-color: var(--text-success); color: var(--text-success); }
.status-dot { width: 8px; height: 8px; background: #ff4d4d; border-radius: 50%; animation: pulse 1s infinite; }

@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }

.decision-sidebar { display: flex; flex-direction: column; gap: 15px; }
.btn-sidebar {
  width: 100px; height: 100px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.05); color: var(--text-main); cursor: pointer; transition: 0.3s;
}
.pass-neon:disabled { opacity: 0.1; cursor: not-allowed; }
.pass-neon:hover:not(:disabled) { border-color: var(--text-success); color: var(--text-success); box-shadow: 0 0 20px var(--status-pass-glow); }
.fail-neon:hover { border-color: #ff4d4d; color: #ff4d4d; box-shadow: 0 0 20px var(--status-fail-glow); }

.back-neon { 
  padding: 6px 18px; border-radius: 4px; background: rgba(255,255,255,0.05); 
  border: 1px solid rgba(255,255,255,0.1); color: var(--text-main); cursor: pointer;
}
.back-neon:hover { border-color: var(--accent); color: var(--accent); }
</style>