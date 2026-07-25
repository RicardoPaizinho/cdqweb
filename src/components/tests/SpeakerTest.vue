<template>
  <div class="test-container">
    <header class="test-header">
      <!-- Lado Esquerdo: Título e Voltar lado a lado -->
      <div class="header-left">
        <h4 class="tech-font">TESTE DE SAÍDA / SPEAKERS</h4>
        <button class="btn-glass back-neon tech-font" @click="goBack">VOLTAR</button>
      </div>

      <!-- Lado Direito: Botões Pass e Fail com transparência e brilho/glow -->
      <div class="header-actions">
        <button class="btn-glass pass-neon tech-font" @click="handleEnd('PASS')">PASS</button>
        <button class="btn-glass fail-neon tech-font" @click="handleEnd('FAIL')">FAIL</button>
      </div>
    </header>

    <div class="main-layout">
      <div class="test-content glass-panel speaker-main-area">
        
        <div class="device-banner card-glass">
          <div class="banner-info">
            <span class="mini-label tech-font">DISPOSITIVO DETECTADO:</span>
            <strong class="tech-font text-accent">{{ audioDeviceName }}</strong>
          </div>
          <div class="device-mini-info tech-font">
            {{ devicesDetected ? 'OUTPUT: ACTIVE' : 'NO DEVICE FOUND' }}
          </div>
        </div>

        <div class="visualizer-viewport card-glass">
          <canvas ref="canvasRef" width="450" height="120" class="neon-canvas"></canvas>
          <div v-if="!isAnimating" class="visualizer-placeholder tech-font">
            SINAL DE SAÍDA VAZIO
          </div>
        </div>

        <div class="stereo-controls">
          <button 
            ref="leftBtnRef" 
            class="btn-stereo tech-font"
            @click="playAudio('left')"
          >
            <div class="speaker-icon">🔊</div>
            CANAL ESQUERDO (L)
          </button>
          
          <button 
            ref="rightBtnRef" 
            class="btn-stereo tech-font"
            @click="playAudio('right')"
          >
            <div class="speaker-icon">🔊</div>
            CANAL DIREITO (R)
          </button>
        </div>

        <div class="manual-section card-glass">
          <span class="mini-label tech-font">TRACK SELECTOR:</span>
          <div class="manual-row">
            <select v-model="selectedTrack" class="glass-select tech-font">
              <option v-for="track in availableTracks" :key="track.file" :value="track.file">
                {{ track.name }}
              </option>
            </select>
            <button 
              @click="toggleManualPlay" 
              class="btn-manual tech-font" 
              :class="{ 'playing-active': isPlayingManual }"
            >
              {{ isPlayingManual ? 'STOP' : 'PLAY' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';

const emit = defineEmits(['test-completed', 'test-cancelled']);

const canvasRef = ref(null);
const leftBtnRef = ref(null);
const rightBtnRef = ref(null);

const isAnimating = ref(false);
const audioDeviceName = ref("Buscando dispositivo...");
const devicesDetected = ref(false);
const isPlayingManual = ref(false);
const selectedTrack = ref("Kakarapo.wav");
const availableTracks = ref([
  { name: 'Kakarapo (Stereo Test)', file: 'Kakarapo.wav' },
  { name: 'System Check (Guns)', file: 'Guns.mp3' },
]);

const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let ctx = null;
let currentSource = null;
let analyserNode = null;
let pannerNode = null;

const getThemeColor = (varName) => getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || '#35a3ff';

function drawBargraph(dataArray) {
  if (!ctx || !canvasRef.value) return;
  const canvas = canvasRef.value;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const accentColor = getThemeColor('--accent');
  const barWidth = (canvas.width / dataArray.length) * 2;
  
  for (let i = 0; i < dataArray.length; i++) {
    const value = dataArray[i];
    const barHeight = (value / 255) * canvas.height;
    
    ctx.shadowBlur = 10;
    ctx.shadowColor = accentColor;
    ctx.fillStyle = accentColor;
    
    ctx.fillRect(i * (barWidth + 2), canvas.height - barHeight, barWidth - 1, barHeight);
  }
}

function animate() {
  if (!isAnimating.value || !analyserNode) return;
  const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
  analyserNode.getByteFrequencyData(dataArray);
  drawBargraph(dataArray);
  requestAnimationFrame(animate);
}

function stopAllAudio() {
  isAnimating.value = false;
  isPlayingManual.value = false;
  if (currentSource) {
    try { currentSource.stop(); } catch (e) {}
    currentSource = null;
  }
  document.querySelectorAll('.btn-stereo').forEach(b => b.classList.remove('playing'));
}

async function playAudio(channel) {
  stopAllAudio();
  const btn = channel === 'left' ? leftBtnRef.value : rightBtnRef.value;
  btn.classList.add('playing');

  try {
    if (audioContext.state === 'suspended') await audioContext.resume();

    const response = await fetch(`/mp3/Kakarapo.wav`);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const source = audioContext.createBufferSource();
    analyserNode = audioContext.createAnalyser();
    pannerNode = audioContext.createStereoPanner();
    
    source.buffer = audioBuffer;
    pannerNode.pan.value = (channel === "left") ? -1 : 1;

    source.connect(analyserNode);
    analyserNode.connect(pannerNode);
    pannerNode.connect(audioContext.destination);

    source.start();
    currentSource = source;
    isAnimating.value = true;
    analyserNode.fftSize = 64;
    animate();

    source.onended = () => { if(currentSource === source) stopAllAudio(); };
  } catch (err) {
    console.error(err);
    btn.classList.remove('playing');
  }
}

async function toggleManualPlay() {
  if (isPlayingManual.value) { stopAllAudio(); return; }
  stopAllAudio();
  isPlayingManual.value = true;
  
  try {
    if (audioContext.state === 'suspended') await audioContext.resume();
    const response = await fetch(`/mp3/${selectedTrack.value}`);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const source = audioContext.createBufferSource();
    analyserNode = audioContext.createAnalyser();
    source.buffer = audioBuffer;
    source.connect(analyserNode);
    analyserNode.connect(audioContext.destination);

    source.start();
    currentSource = source;
    isAnimating.value = true;
    analyserNode.fftSize = 64;
    animate();

    source.onended = () => { if(isPlayingManual.value) stopAllAudio(); };
  } catch (err) { stopAllAudio(); }
}

const handleEnd = (res) => { stopAllAudio(); emit('test-completed', res); };
const goBack = () => { stopAllAudio(); emit('test-cancelled'); };

async function getAudioOutputDevices() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const output = devices.filter(d => d.kind === 'audiooutput');
    if (output.length > 0) {
      devicesDetected.value = true;
      audioDeviceName.value = output[0].label || "Alto-falante Padrão";
    }
  } catch (e) { audioDeviceName.value = "Erro ao detectar hardware"; }
}

onMounted(() => {
  ctx = canvasRef.value.getContext("2d");
  getAudioOutputDevices();
});

onBeforeUnmount(() => {
  stopAllAudio();
  audioContext.close();
});

watch(selectedTrack, () => stopAllAudio());
</script>

<style scoped>
.test-container { display: flex; flex-direction: column; gap: 15px; color: var(--text-main); padding: 10px; height: 100%; }
.tech-font { font-family: var(--font-tech); letter-spacing: 1px; font-weight: bold; }

/* Header na mesma linha */
.test-header {
  display: flex; justify-content: space-between; align-items: center;
  border-bottom: 1px solid var(--border); padding-bottom: 12px;
}
.header-left { display: flex; align-items: center; gap: 20px; }
.header-left h4 { margin: 0; color: var(--accent); text-transform: uppercase; }

/* Botões com estilo de vidro/transparência */
.header-actions { display: flex; gap: 12px; }

.btn-glass {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-main);
  padding: 8px 20px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.8rem;
}

.back-neon:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
}

.pass-neon:hover {
  border-color: var(--text-success, #00ff41);
  color: var(--text-success, #00ff41);
  background: rgba(0, 255, 65, 0.1);
  box-shadow: 0 0 15px rgba(0, 255, 65, 0.3);
}

.fail-neon:hover {
  border-color: #ff4d4d;
  color: #ff4d4d;
  background: rgba(255, 77, 77, 0.1);
  box-shadow: 0 0 15px rgba(255, 77, 77, 0.3);
}

.main-layout { display: flex; flex-direction: column; flex-grow: 1; }

.glass-panel {
  background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(12px);
  border: 1px solid var(--border); border-radius: 15px; padding: 25px;
  display: flex; flex-direction: column; gap: 20px;
}

/* VISUALIZER */
.visualizer-viewport {
  width: 100%; height: 120px; background: rgba(0,0,0,0.3);
  display: flex; align-items: center; justify-content: center; 
  position: relative; border-radius: 10px; border: 1px solid var(--border);
}
.visualizer-placeholder { font-size: 0.65rem; color: var(--text-dim); }
.neon-canvas { width: 100%; height: 100%; }

/* BANNER & INFO */
.device-banner { 
  width: 100%; padding: 12px; display: flex; justify-content: space-between; 
  align-items: center; background: rgba(0,0,0,0.2); 
}
.banner-info { display: flex; flex-direction: column; gap: 4px; }
.mini-label { font-size: 0.55rem; color: var(--text-dim); }
.text-accent { color: var(--accent); font-size: 0.8rem; }
.device-mini-info { font-size: 0.7rem; color: var(--text-dim); }

/* STEREO BUTTONS */
.stereo-controls { display: flex; gap: 20px; width: 100%; }
.btn-stereo {
  flex: 1; height: 80px; background: rgba(255,255,255,0.05); border: 1px solid var(--border);
  color: var(--text-main); border-radius: 12px; cursor: pointer; transition: 0.3s;
  display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 0.7rem;
}
.btn-stereo:hover { border-color: var(--accent); background: rgba(53, 163, 255, 0.05); }
.btn-stereo.playing { border-color: var(--accent); box-shadow: 0 0 15px var(--accent); animation: pulse 1s infinite; }

/* MANUAL SECTION */
.manual-section { width: 100%; padding: 15px; display: flex; flex-direction: column; gap: 10px; }
.manual-row { display: flex; gap: 10px; }

/* Select ajustado com o menu suspenso escuro */
.glass-select {
  flex: 1;
  background: rgba(0, 0, 0, 0.4); /* Fundo do select fechado */
  border: 1px solid var(--border);
  color: var(--text-main);
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 0.75rem;
  outline: none;
  cursor: pointer;
}

/* Corrige o fundo branco das opções ao abrir o select */
.glass-select option {
  background-color: #0b1114; /* Fundo escuro para a lista suspensa */
  color: var(--text-main, #ffffff);
  padding: 8px;
}

.btn-manual {
  padding: 0 20px;
  background: var(--accent);
  color: #000;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
}
.playing-active { background: #ff4d4d; color: white; }

@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.02); } 100% { transform: scale(1); } }
</style>