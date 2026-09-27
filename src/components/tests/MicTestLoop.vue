<template>
  <div class="test-container">
    <!-- Título e botão VOLTAR ficam só no MicTest.vue (tela mãe) — evita
    duplicar o cabeçalho quando este submódulo está ativo. -->
    <div class="status-bar-mic tech-font">
      <span :class="['status-tag', isRecording ? 'active' : 'idle']">
        {{ isRecording ? 'CAPTANDO ÁUDIO BRUTO' : 'MICROFONE DESLIGADO' }}
      </span>
    </div>

    <div class="main-layout">
      <div class="test-content glass-panel">

        <div class="mic-selector-bar">
          <label class="tech-font mini-label">INPUT_DEVICE:</label>
          <select v-model="selectedMicId" class="glass-select tech-font">
            <option v-for="mic in availableMics" :key="mic.id" :value="mic.id">
              {{ mic.name }}
            </option>
          </select>
        </div>

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
import { ref, watch, onMounted, onBeforeUnmount } from 'vue';

const emit = defineEmits(['test-completed', 'test-cancelled']);

// Estados
const volume = ref(0);
const peak = ref(0);
const isRecording = ref(false);
const loopbackEnabled = ref(false);
const availableMics = ref([]);
const selectedMicId = ref(null);

// Web Audio Objects
let audioContext = null;
let analyser = null;
let microphone = null;
let javascriptNode = null;
let stream = null;

// Só lista nome/id de verdade depois de já termos permissão (o navegador
// esconde o label dos dispositivos até o primeiro getUserMedia bem-sucedido).
async function refreshMicList() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    availableMics.value = devices
      .filter((d) => d.kind === 'audioinput')
      .map((d) => ({ id: d.deviceId, name: d.label || 'Microfone' }));
  } catch (e) { /* mantém a lista anterior */ }
}

async function startAudio() {
  try {
    // Constraints para Áudio Bruto (RAW)
    const constraints = {
      audio: {
        deviceId: selectedMicId.value ? { exact: selectedMicId.value } : undefined,
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

    // Sincroniza o seletor com o device que o navegador realmente usou (útil
    // na primeira chamada, quando selectedMicId ainda é null / mic padrão).
    await refreshMicList();
    const usedId = stream.getAudioTracks()[0]?.getSettings()?.deviceId;
    if (usedId) selectedMicId.value = usedId;
  } catch (err) {
    console.error("Erro ao acessar microfone:", err);
  }
}

// Troca manual de microfone no seletor: reabre o pipeline de áudio já
// apontando pro device escolhido. Ignora a atribuição inicial (oldId null),
// que é só o startAudio() sincronizando o valor detectado automaticamente.
watch(selectedMicId, (newId, oldId) => {
  if (oldId !== null && newId !== oldId) {
    stop();
    startAudio();
  }
});

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

onMounted(startAudio);
onBeforeUnmount(stop);
</script>

<style scoped>
.test-container { display: flex; flex-direction: column; gap: 15px; color: #fff; padding: 10px; height: 100%; }
.tech-font { font-family: 'Consolas', monospace; letter-spacing: 1px; font-weight: bold; }

.status-bar-mic { display: flex; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 12px; }

.status-tag { padding: 4px 10px; border-radius: 4px; font-size: 0.7rem; }
.status-tag.active { background: rgba(0, 255, 65, 0.2); color: #00ff41; border: 1px solid #00ff41; }
.status-tag.idle { background: rgba(255, 255, 255, 0.05); color: #888; }

.mic-selector-bar {
  width: 100%; display: flex; align-items: center; gap: 15px;
  padding: 10px 15px; background: rgba(0,0,0,0.2); border-radius: 8px;
}
.mini-label { font-size: 0.6rem; color: var(--accent, #00ff41); }
.glass-select {
  background: var(--bg-panel, #1a1a1a); border: 1px solid var(--border, rgba(255,255,255,0.1));
  color: var(--text-main, #fff); padding: 4px 10px; border-radius: 4px; font-size: 0.7rem;
  flex: 1; outline: none;
}
/* Sem isso o popup de opções cai pro branco padrão do SO (Chrome/Edge ignoram
   o background do <select> fechado pra estilizar a lista aberta). */
.glass-select option {
  background: var(--bg-panel, #1a1a1a);
  color: var(--text-main, #fff);
}

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