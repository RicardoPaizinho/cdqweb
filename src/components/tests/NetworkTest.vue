<template>
  <div class="test-container">
    <!-- Header Único -->
    <header class="test-header">
      <div class="header-left">
        <h4 class="tech-font">CONECTIVIDADE E REDE</h4>
        <button class="btn-glass back-neon tech-font" @click="goBack">VOLTAR</button>
      </div>

      <div class="header-actions">
        <button
          class="btn-glass pass-neon tech-font"
          :disabled="!canPass"
          @click="handleResult('PASS')"
        >
          PASS
        </button>
        <button class="btn-glass fail-neon tech-font" @click="handleResult('FAIL')">
          FAIL
        </button>
      </div>
    </header>

    <div class="main-layout">
      <div class="test-content glass-panel">
        
        <!-- Status de Monitor Ativo no topo -->
        <div class="status-bar card-glass">
          <span class="tech-font mini-label">STATUS DO DIAGNÓSTICO:</span>
          <div class="live-tag tech-font">
            <span class="pulse"></span> MONITOR EM TEMPO REAL
          </div>
        </div>

        <div v-if="loading" class="loader-box tech-font">
          <div class="spinner"></div>
          <span>SINCRONIZANDO DRIVERS E INTERFACES...</span>
        </div>

        <p v-else-if="connectionError" class="connection-error tech-font">{{ connectionError }}</p>

        <div v-else class="cards-wrapper">
          <!-- Card Wi-Fi -->
          <div 
            class="card-glass network-card" 
            :class="{ 
              'border-ok': data.WifiOk, 
              'border-fail': data.WifiPresent && !data.WifiOk, 
              'border-muted': !data.WifiPresent 
            }"
          >
            <div class="card-header">
              <div class="icon-label">
                <span class="card-icon">📶</span>
                <span class="tech-font card-title">INTERFACE WI-FI</span>
              </div>
              <span 
                class="tech-font badge-status" 
                :class="data.WifiOk ? 'badge-pass' : (data.WifiPresent ? 'badge-fail' : 'badge-muted')"
              >
                {{ data.WifiPresent ? (data.WifiOk ? 'CONECTADO' : 'DESCONECTADO') : 'NÃO DETECTADO' }}
              </span>
            </div>

            <div class="card-body">
              <p class="adapter-name tech-font">
                {{ data.WifiPresent ? (data.WifiDesc || 'Adaptador Wi-Fi') : 'Nenhum adaptador Wi-Fi detectado' }}
              </p>
              
              <div v-if="data.WifiPresent" class="sub-info tech-font">
                <div class="info-row">
                  <span class="label">REDE:</span> 
                  <span class="value text-accent">{{ data.WifiSsid || '—' }}</span>
                </div>
                <div v-if="data.WifiOk" class="info-row">
                  <span class="label">SINAL:</span> 
                  <span class="value text-pass">{{ data.WifiSignal }}%</span>
                </div>
              </div>

              <p v-if="data.WifiPresent && !data.WifiOk" class="status-hint tech-font text-fail">
                * Conexão obrigatória para aprovar no teste.
              </p>
            </div>
          </div>

          <!-- Card LAN -->
          <div 
            class="card-glass network-card" 
            :class="{ 
              'border-ok': data.LanOk, 
              'border-fail': data.LanPresent && !data.LanOk, 
              'border-muted': !data.LanPresent 
            }"
          >
            <div class="card-header">
              <div class="icon-label">
                <span class="card-icon">🔌</span>
                <span class="tech-font card-title">REDE CABEADA (LAN)</span>
              </div>
              <span 
                class="tech-font badge-status" 
                :class="data.LanOk ? 'badge-pass' : (data.LanPresent ? 'badge-fail' : 'badge-muted')"
              >
                {{ data.LanPresent ? (data.LanOk ? 'CABO CONECTADO' : 'DESCONECTADO') : 'NÃO DETECTADO' }}
              </span>
            </div>

            <div class="card-body">
              <p class="adapter-name tech-font">
                {{ data.LanPresent ? (data.LanDesc || 'Adaptador Ethernet') : 'Nenhum adaptador LAN detectado' }}
              </p>

              <p v-if="data.LanPresent && !data.LanOk" class="status-hint tech-font text-fail">
                * Conexão de cabo obrigatória para aprovar no teste.
              </p>
            </div>
          </div>

          <!-- Card Bluetooth -->
          <div 
            class="card-glass network-card" 
            :class="data.BtOk ? 'border-ok' : 'border-warn'"
          >
            <div class="card-header">
              <div class="icon-label">
                <span class="card-icon">🎧</span>
                <span class="tech-font card-title">
                  BLUETOOTH <span class="optional-tag">(INFORMATIVO)</span>
                </span>
              </div>
            </div>

            <div class="card-body">
              <div v-if="data.BluetoothDevices && data.BluetoothDevices.length > 0" class="device-list">
                <div v-for="dev in data.BluetoothDevices" :key="dev" class="device-item tech-font">
                  <span class="online-indicator"></span> {{ dev }}
                </div>
              </div>
              <p v-else class="status-hint tech-font text-dim">
                Nenhum dispositivo pareado no momento.
              </p>
            </div>
          </div>

          <!-- Barra Status da Internet -->
          <div 
            class="internet-bar tech-font" 
            :class="data.InternetOk ? 'internet-online' : 'internet-offline'"
          >
            <span>STATUS DA INTERNET:</span>
            <strong>{{ data.InternetOk ? 'ACESSO CONFIRMADO' : 'SEM ACESSO À INTERNET' }}</strong>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';

const emit = defineEmits(['test-completed', 'test-cancelled']);

const API_BASE_URL = 'http://localhost:5000/api';
const POLL_INTERVAL_MS = 3000;

const data = ref(null);
const loading = ref(true);
const connectionError = ref('');
let timer = null;

const updateData = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/network`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    data.value = await response.json();
    connectionError.value = '';
  } catch (err) {
    connectionError.value = 'Não foi possível conectar ao agente local (porta 5000). Verifique se o HardwareTestApp está em execução.';
    console.error('Falha na atualização de rede:', err);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  updateData();
  timer = setInterval(updateData, POLL_INTERVAL_MS);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});

const canPass = computed(() => {
  if (!data.value) return false;
  const lanOk = !data.value.LanPresent || data.value.LanOk;
  const wifiOk = !data.value.WifiPresent || data.value.WifiOk;
  return lanOk && wifiOk;
});

const handleResult = (status) => emit('test-completed', status);
const goBack = () => emit('test-cancelled');
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
.main-layout { display: flex; flex-direction: column; flex-grow: 1; overflow: hidden; }

.glass-panel {
  background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(12px);
  border: 1px solid var(--border, rgba(255,255,255,0.1)); border-radius: 15px; padding: 20px;
  display: flex; flex-direction: column; gap: 15px; overflow-y: auto;
}

/* Status Bar */
.status-bar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 15px; background: rgba(0,0,0,0.2); border-radius: 8px;
}
.mini-label { font-size: 0.65rem; color: var(--text-dim, #777); }

.live-tag {
  font-size: 0.7rem; color: var(--text-main, #fff); display: flex; align-items: center; gap: 8px;
}

.pulse {
  width: 8px; height: 8px; background: var(--accent, #00ff41);
  border-radius: 50%; animation: blink 1.2s infinite;
  box-shadow: 0 0 8px var(--accent, #00ff41);
}

/* Cards Wrapper */
.cards-wrapper { display: flex; flex-direction: column; gap: 12px; }

.network-card {
  padding: 15px; background: rgba(0,0,0,0.2); border-radius: 8px;
  border-left: 4px solid rgba(255,255,255,0.1); transition: all 0.3s ease;
}

.border-ok { border-left-color: var(--text-success, #00ff41); }
.border-fail { border-left-color: #ff4d4d; }
.border-warn { border-left-color: #f1c40f; }
.border-muted { border-left-color: #555; opacity: 0.6; }

.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.icon-label { display: flex; align-items: center; gap: 10px; }
.card-icon { font-size: 1.2rem; }
.card-title { font-size: 0.8rem; color: var(--text-main, #fff); }
.optional-tag { font-size: 0.65rem; color: var(--text-dim, #777); font-weight: normal; }

.badge-status {
  padding: 3px 8px; border-radius: 4px; font-size: 0.65rem; font-weight: bold;
}
.badge-pass { background: rgba(0,255,65,0.15); color: var(--text-success, #00ff41); border: 1px solid rgba(0,255,65,0.3); }
.badge-fail { background: rgba(255,77,77,0.15); color: #ff4d4d; border: 1px solid rgba(255,77,77,0.3); }
.badge-muted { background: rgba(255,255,255,0.05); color: #777; border: 1px solid rgba(255,255,255,0.1); }

.card-body { display: flex; flex-direction: column; gap: 8px; }
.adapter-name { font-size: 0.75rem; color: var(--text-main, #fff); margin: 0; }

.sub-info { display: flex; gap: 20px; font-size: 0.7rem; }
.info-row { display: flex; gap: 6px; }
.info-row .label { color: var(--text-dim, #888); }

.status-hint { font-size: 0.65rem; margin: 0; }

.device-list { display: flex; flex-direction: column; gap: 6px; }
.device-item {
  background: rgba(255,255,255,0.04); padding: 6px 10px; border-radius: 4px;
  font-size: 0.7rem; display: flex; align-items: center; gap: 8px;
}
.online-indicator { width: 6px; height: 6px; background: var(--text-success, #00ff41); border-radius: 50%; }

/* Barra de Internet */
.internet-bar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 15px; border-radius: 8px; font-size: 0.75rem;
}
.internet-online {
  background: rgba(0, 255, 65, 0.1); border: 1px solid rgba(0, 255, 65, 0.3); color: var(--text-success, #00ff41);
}
.internet-offline {
  background: rgba(255, 77, 77, 0.1); border: 1px solid rgba(255, 77, 77, 0.3); color: #ff4d4d;
}

/* Loader / Erros */
.loader-box {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 40px; gap: 15px; font-size: 0.75rem; color: var(--text-dim, #888);
}
.spinner {
  width: 28px; height: 28px; border: 3px solid rgba(0,255,65,0.1);
  border-top-color: var(--accent, #00ff41); border-radius: 50%; animation: spin 0.8s linear infinite;
}

.connection-error {
  background: rgba(231, 76, 60, 0.1); border: 1px solid #e74c3c;
  color: #e74c3c; padding: 10px 14px; border-radius: 8px; font-size: 0.75rem;
}

.text-accent { color: var(--accent, #00ff41); }
.text-pass { color: var(--text-success, #00ff41); }
.text-fail { color: #ff4d4d; }
.text-dim { color: var(--text-dim, #777); }

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes blink { 0% { opacity: 0.3; } 50% { opacity: 1; } 100% { opacity: 0.3; } }
</style>