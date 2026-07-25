<template>
  <div class="test-container">
    <header class="test-header">
      <!-- Lado Esquerdo: Título e Voltar lado a lado -->
      <div class="header-left">
        <h4 class="tech-font">TESTE DE VÍDEO / WEBCAM</h4>
        <button class="btn-glass back-neon tech-font" @click="goBack">VOLTAR</button>
      </div>

      <!-- Lado Direito: Botões Pass e Fail transparentes -->
      <div class="header-actions">
        <button 
          class="btn-glass pass-neon tech-font" 
          :disabled="!stream"
          @click="endTest('PASS')"
        >
          PASS
        </button>
        <button class="btn-glass fail-neon tech-font" @click="endTest('FAIL')">
          FAIL
        </button>
      </div>
    </header>

    <div class="main-layout">
      <div class="test-content glass-panel camera-main-area">
        
        <div class="camera-selector-bar card-glass">
          <div class="selector-info">
            <label class="tech-font mini-label">FONTE DE VÍDEO:</label>
            <select v-model="selectedCameraId" class="glass-select tech-font">
              <option v-for="cam in availableCameras" :key="cam.id" :value="cam.id">
                {{ cam.name }}
              </option>
            </select>
          </div>
          <div class="device-mini-info tech-font">
            <span v-if="videoSettings" class="res-tag">
              {{ videoSettings.width }} x {{ videoSettings.height }}
            </span>
            <span v-else class="status-blink">AGUARDANDO HARDWARE...</span>
          </div>
        </div>

        <div class="feed-viewport-wrapper">
          <div class="feed-viewport card-glass">
            <video 
              ref="videoRef" 
              autoplay 
              playsinline 
              class="video-element"
              :class="{ 'mirror': isFrontCamera }"
            ></video>
            
            <div v-if="!stream" class="loading-overlay tech-font">
              <div class="spinner"></div>
              <span>INICIALIZANDO SINAL</span>
            </div>
          </div>
        </div>

        <div v-if="videoSettings" class="camera-stats-display tech-font card-glass">
          <div class="stat-row">
            <span class="label">QUALIDADE DETECTADA:</span> 
            <span class="value text-accent">{{ megapixels }}</span>
          </div>
          <div class="stat-row">
            <span class="label">SINAL DE VÍDEO:</span> 
            <span class="value text-success">ATIVO / ESTÁVEL</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';

const emit = defineEmits(['test-completed', 'test-cancelled']);

const videoRef = ref(null);
const availableCameras = ref([]);
const selectedCameraId = ref(null);
const stream = ref(null);
const videoSettings = ref(null);
const isFrontCamera = ref(true);

// Cálculo de Megapixels baseado na resolução real entregue
const megapixels = computed(() => {
  if (!videoSettings.value) return '---';
  const res = videoSettings.value.width * videoSettings.value.height;
  
  if (res <= 307200) return 'VGA (SD)';
  if (res <= 921600) return 'HD (720p)';
  if (res <= 2073600) return 'FULL HD (2M)';
  return (res / 1000000).toFixed(1) + 'M PIXELS';
});

// 1. Busca os dispositivos disponíveis
async function getDevices() {
  try {
    const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
    const devices = await navigator.mediaDevices.enumerateDevices();
    
    availableCameras.value = devices
      .filter(d => d.kind === 'videoinput')
      .map(d => ({ id: d.deviceId, name: d.label || `Câmera ${availableCameras.value.length + 1}` }));
    
    tempStream.getTracks().forEach(t => t.stop());

    if (availableCameras.value.length > 0 && !selectedCameraId.value) {
      selectedCameraId.value = availableCameras.value[0].id;
    }
  } catch (err) {
    console.error("Erro ao listar câmeras:", err);
  }
}

// 2. Inicia o fluxo de vídeo
async function startStream() {
  if (!selectedCameraId.value) return;

  stop();

  try {
    const constraints = { 
      video: { 
        deviceId: { exact: selectedCameraId.value },
        width: { ideal: 1920 }, 
        height: { ideal: 1080 }
      } 
    };
    
    const newStream = await navigator.mediaDevices.getUserMedia(constraints);
    stream.value = newStream;
    
    if (videoRef.value) {
      videoRef.value.srcObject = newStream;
      
      videoRef.value.onloadedmetadata = () => {
        const track = newStream.getVideoTracks()[0];
        videoSettings.value = track.getSettings();
        videoRef.value.play().catch(e => console.warn("Autoplay bloqueado:", e));
      };
    }
  } catch (err) { 
    console.error("Erro ao abrir câmera em HD, tentando modo simples:", err);
    try {
      const fallback = await navigator.mediaDevices.getUserMedia({ 
        video: { deviceId: { exact: selectedCameraId.value } } 
      });
      stream.value = fallback;
      if (videoRef.value) videoRef.value.srcObject = fallback;
    } catch (e) {
      console.error("Falha total ao acessar câmera:", e);
    }
  }
}

// 3. Para o fluxo de vídeo
const stop = () => {
  if (stream.value) {
    stream.value.getTracks().forEach(track => track.stop());
    stream.value = null;
  }
  
  if (videoRef.value) {
    videoRef.value.pause();
    videoRef.value.srcObject = null;
    videoRef.value.onloadedmetadata = null;
  }
  videoSettings.value = null;
};

const endTest = (res) => { stop(); emit('test-completed', res); };
const goBack = () => { stop(); emit('test-cancelled'); };

watch(selectedCameraId, startStream);
onMounted(getDevices);
onBeforeUnmount(stop);
</script>

<style scoped>
.test-container { display: flex; flex-direction: column; gap: 15px; color: var(--text-main, #fff); padding: 10px; height: 100%; }
.tech-font { font-family: var(--font-tech, 'Consolas', monospace); letter-spacing: 1px; font-weight: bold; }

/* Header Superior */
.test-header {
  display: flex; justify-content: space-between; align-items: center;
  border-bottom: 1px solid var(--border, rgba(255,255,255,0.1)); padding-bottom: 12px;
}
.header-left { display: flex; align-items: center; gap: 20px; }
.header-left h4 { margin: 0; color: var(--accent, #00ff41); text-transform: uppercase; }

/* Botões com efeito Glass / Transparência */
.header-actions { display: flex; gap: 12px; }

.btn-glass {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-main, #fff);
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

.pass-neon:not(:disabled):hover {
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

.pass-neon:disabled {
  opacity: 0.2;
  cursor: not-allowed;
  filter: grayscale(1);
}

/* Layout Principal */
.main-layout { display: flex; flex-direction: column; flex-grow: 1; }

.glass-panel {
  background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(10px);
  border: 1px solid var(--border, rgba(255,255,255,0.1)); border-radius: 15px; padding: 20px;
  display: flex; flex-direction: column; align-items: center; gap: 15px;
}

/* Barra do Seletor e Info */
.camera-selector-bar {
  width: 100%; padding: 12px 15px; display: flex; justify-content: space-between;
  align-items: center; background: rgba(0,0,0,0.2); border-radius: 8px;
}
.selector-info { display: flex; align-items: center; gap: 10px; flex: 1; max-width: 60%; }
.mini-label { font-size: 0.65rem; color: var(--text-dim, #777); }

/* Select Customizado Dark */
.glass-select {
  flex: 1; background: rgba(0, 0, 0, 0.4); border: 1px solid var(--border, rgba(255,255,255,0.1));
  color: var(--text-main, #fff); padding: 8px 12px; border-radius: 4px; font-size: 0.75rem;
  outline: none; cursor: pointer;
}

.glass-select option {
  background-color: #0b1114;
  color: var(--text-main, #ffffff);
  padding: 8px;
}

.device-mini-info .res-tag {
  background: var(--accent, #00ff41); color: #000;
  padding: 4px 10px; border-radius: 4px; font-size: 0.75rem; font-weight: bold;
}
.status-blink { font-size: 0.7rem; color: var(--text-dim, #777); }

/* Viewport de Vídeo */
.feed-viewport-wrapper {
  width: 100%; max-width: 640px; aspect-ratio: 16 / 9;
}

.feed-viewport {
  width: 100%; height: 100%; position: relative; background: #000; 
  overflow: hidden; border-radius: 8px; border: 2px solid rgba(255,255,255,0.1);
}

.video-element { width: 100%; height: 100%; object-fit: contain; background: #000; }
.video-element.mirror { transform: scaleX(-1); }

/* Stats Display */
.camera-stats-display {
  width: 100%; max-width: 640px; padding: 12px 20px;
  background: rgba(0,0,0,0.3); border: 1px solid rgba(0,255,65,0.2); border-radius: 8px;
}

.stat-row { display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 4px; }
.stat-row:last-child { margin-bottom: 0; }
.text-accent { color: var(--accent, #00ff41); }
.text-success { color: var(--text-success, #00ff41); }

.loading-overlay {
  position: absolute; inset: 0; background: #000;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 15px;
}

.spinner {
  width: 30px; height: 30px; border: 3px solid rgba(0,255,65,0.1);
  border-top-color: var(--accent, #00ff41); border-radius: 50%; animation: spin 1s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>