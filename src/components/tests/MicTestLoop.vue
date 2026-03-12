<template>
  <div class="test-container">
    <header class="test-header">
      <div class="title-group">
        <h4 class="tech-font">TESTE DE ÁUDIO / MICROFONE</h4>
        <button class="btn-glass back-neon tech-font" @click="goBack">VOLTAR</button>
      </div>
      <div class="device-mini-info tech-font">
        <span :class="['status-tag', isRecording ? 'active' : 'idle']">
          {{ isRecording ? 'CAPTANDO ÁUDIO BRUTO' : 'MICROFONE DESLIGADO' }}
        </span>
      </div>
    </header>

    <div class="main-layout">
      <div class="test-content glass-panel">
        
        <div class="vu-meter-container">
          <div class="vu-labels tech-font">
            <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
          </div>
          <div class="vu-track">
            <div class="vu-bar" :style="{ width: volume + '%' }"></div>
            <div class="vu-peak" :style="{ left: peak + '%' }"></div>
          </div>
        </div>

        <div class="audio-controls card-glass">
          <div class="control-row">
            <label class="tech-font">OUVIR RETORNO (LOOP):</label>
            <input type="checkbox" v-model="loopbackEnabled" @change="toggleLoopback" />
          </div>
          <p class="warning-text tech-font" v-if="loopbackEnabled">
            ⚠️ USE FONES PARA EVITAR MICROFONIA
          </p>
        </div>

        <div class="info-box tech-font">
          <p>Filtros de sistema (AEC/NS) desativados para capturar sinal real.</p>
        </div>
      </div>

      <aside class="decision-sidebar">
        <button class="btn-sidebar pass-neon tech-font" @click="endTest('PASS')">PASS</button>
        <button class="btn-sidebar fail-neon tech-font" @click="endTest('FAIL')">FAIL</button>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';

const emit = defineEmits(['test-completed', 'test-cancelled']);

// Estados
const volume = ref(0);
const peak = ref(0);
const isRecording = ref(false);
const loopbackEnabled = ref(false);

// Web Audio Objects
let audioContext = null;
let analyser = null;
let microphone = null;
let javascriptNode = null;
let stream = null;

async function startAudio() {
  try {
    // Constraints para Áudio Bruto (RAW)
    const constraints = {
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        // Flags específicas para navegadores Chromium (WebView2)
        googEchoCancellation: false,
        googAutoGainControl: false,
        googNoiseSuppression: false,
        googHighpassFilter: false
      }
    };

    stream = await navigator.mediaDevices.getUserMedia(constraints);
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    microphone = audioContext.createMediaStreamSource(stream);
    
    analyser.fftSize = 256;
    microphone.connect(analyser);

    isRecording.value = true;
    renderMeter();
  } catch (err) {
    console.error("Erro ao acessar microfone:", err);
  }
}

function renderMeter() {
  const array = new Uint8Array(analyser.frequencyBinCount);
  
  const update = () => {
    if (!isRecording.value) return;
    
    analyser.getByteFrequencyData(array);
    let values = 0;
    for (let i = 0; i < array.length; i++) {
      values += array[i];
    }
    
    // Calcula média e converte para porcentagem
    const average = values / array.length;
    volume.value = Math.min(Math.round((average / 128) * 100), 100);
    
    if (volume.value > peak.value) {
      peak.value = volume.value;
      setTimeout(() => { peak.value -= 5; if(peak.value < 0) peak.value = 0; }, 1000);
    }
    
    requestAnimationFrame(update);
  };
  update();
}

function toggleLoopback() {
  if (!audioContext) return;
  if (loopbackEnabled.value) {
    analyser.connect(audioContext.destination);
  } else {
    analyser.disconnect(audioContext.destination);
  }
}

const stop = () => {
  isRecording.value = false;
  if (stream) stream.getTracks().forEach(t => t.stop());
  if (audioContext) audioContext.close();
};

const endTest = (res) => { stop(); emit('test-completed', res); };
const goBack = () => { stop(); emit('test-cancelled'); };

onMounted(startAudio);
onBeforeUnmount(stop);
</script>

<style scoped>
.test-container { display: flex; flex-direction: column; gap: 15px; color: #fff; padding: 10px; height: 100%; }
.tech-font { font-family: 'Consolas', monospace; letter-spacing: 1px; font-weight: bold; }

.test-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px; }

.status-tag { padding: 4px 10px; border-radius: 4px; font-size: 0.7rem; }
.status-tag.active { background: rgba(0, 255, 65, 0.2); color: #00ff41; border: 1px solid #00ff41; }
.status-tag.idle { background: rgba(255, 255, 255, 0.05); color: #888; }

.main-layout { display: grid; grid-template-columns: 1fr 120px; gap: 20px; flex-grow: 1; }

.glass-panel {
  background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.1); border-radius: 15px; padding: 40px;
  display: flex; flex-direction: column; justify-content: center; gap: 30px;
}

/* VU METER */
.vu-meter-container { width: 100%; max-width: 600px; margin: 0 auto; }
.vu-labels { display: flex; justify-content: space-between; color: #666; font-size: 0.7rem; margin-bottom: 8px; }
.vu-track { 
  height: 40px; background: #111; border-radius: 4px; position: relative; 
  border: 1px solid #333; overflow: hidden;
}
.vu-bar { 
  height: 100%; background: linear-gradient(90deg, #00ff41 0%, #ffff00 70%, #ff0000 100%);
  transition: width 0.05s ease-out;
}
.vu-peak {
  position: absolute; top: 0; width: 2px; height: 100%; background: #fff;
  transition: left 0.5s ease-out;
}

.audio-controls { padding: 20px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.control-row { display: flex; align-items: center; gap: 15px; }
.warning-text { color: #ff9800; font-size: 0.7rem; }
.info-box { color: #666; font-size: 0.75rem; text-align: center; }

/* SIDEBAR PADRÃO */
.decision-sidebar { display: flex; flex-direction: column; justify-content: center; gap: 20px; }
.btn-sidebar {
  width: 100px; height: 100px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.05); color: #fff; cursor: pointer; transition: 0.3s;
}
.pass-neon:hover { border-color: #00ff41; color: #00ff41; box-shadow: 0 0 20px rgba(0,255,65,0.2); }
.fail-neon:hover { border-color: #ff4d4d; color: #ff4d4d; box-shadow: 0 0 20px rgba(255,77,77,0.2); }
</style>