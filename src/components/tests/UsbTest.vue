<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const emit = defineEmits(['test-completed', 'test-cancelled']);

// --- CONFIGURAÇÃO DA API LOCAL (agente C#) ---
const API_BASE_URL = 'http://localhost:5000/api';
const POLL_INTERVAL_MS = 1000;

const usbLogs = ref([]);
const lastDevice = ref(null);
const isListening = ref(false);
const connectionError = ref('');

let pollTimer = null;

async function fetchUsbEvents() {
  try {
    const response = await fetch(`${API_BASE_URL}/usb/eventos`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const eventos = await response.json();
    connectionError.value = '';

    eventos.forEach((evt) => {
      const newLog = {
        id: Date.now() + Math.random(),
        time: evt.time || new Date().toLocaleTimeString(),
        action: evt.action === 'connected' ? 'CONECTADO' : 'REMOVIDO',
        name: evt.deviceName || 'Dispositivo USB',
        class: evt.action === 'connected' ? 'log-success' : 'log-error'
      };
      usbLogs.value.unshift(newLog);
      lastDevice.value = newLog;
    });
  } catch (err) {
    connectionError.value = 'Não foi possível conectar ao agente local (porta 5000). Verifique se o HardwareTestApp está em execução.';
    console.error('Erro ao buscar eventos USB:', err);
  }
}

async function startMonitor() {
  try {
    const response = await fetch(`${API_BASE_URL}/usb/monitor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: true })
    });
    const data = await response.json().catch(() => null);
    isListening.value = !!data?.monitoring;
  } catch (err) {
    connectionError.value = 'Não foi possível ativar o monitor de USB no agente local.';
    console.error('Erro ao ativar monitor USB:', err);
  }
}

async function stopMonitor() {
  try {
    await fetch(`${API_BASE_URL}/usb/monitor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: false })
    });
  } catch (err) {
    console.error('Erro ao desativar monitor USB:', err);
  }
}

onMounted(async () => {
  await startMonitor();
  pollTimer = setInterval(fetchUsbEvents, POLL_INTERVAL_MS);
});

onUnmounted(async () => {
  if (pollTimer) clearInterval(pollTimer);
  await stopMonitor();
});

const finishTest = (status) => {
  emit('test-completed', status);
};
</script>

<template>
  <div class="usb-test-container">
    <div class="test-header">
      <div class="status-indicator" :class="{ 'pulse': isListening }">
        <span class="dot"></span>
        {{ isListening ? 'MONITORANDO PORTAS USB ATIVAMENTE' : 'INICIALIZANDO AGENTE...' }}
      </div>
      <button class="btn-close" @click="emit('test-cancelled')">✕</button>
    </div>

    <p v-if="connectionError" class="connection-error">{{ connectionError }}</p>

    <div class="test-content">
      <div class="device-monitor">
        <div v-if="lastDevice" class="device-card" :class="lastDevice.class">
          <div class="usb-icon-box">
             <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22V10M12 10L9 7M12 10L15 7M7 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm10 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4zM12 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/>
             </svg>
          </div>
          <div class="info">
            <span class="action-label">{{ lastDevice.action }}</span>
            <span class="device-name">{{ lastDevice.name }}</span>
            <span class="device-time">{{ lastDevice.time }}</span>
          </div>
        </div>

        <div v-else class="waiting-state">
          <div class="spinner"></div>
          <h3>Aguardando Periférico</h3>
          <p>Insira um Pendrive ou Mouse em qualquer porta USB para testar a detecção.</p>
        </div>
      </div>

      <div class="log-panel">
        <div class="log-title">HISTÓRICO DE CONEXÃO</div>
        <div class="log-scroll">
          <transition-group name="list">
            <div v-for="log in usbLogs" :key="log.id" class="log-item" :class="log.class">
              <span class="log-time">{{ log.time }}</span>
              <span class="log-action">{{ log.action }}</span>
              <span class="log-name">{{ log.name }}</span>
            </div>
          </transition-group>
          <div v-if="usbLogs.length === 0" class="empty-log">Nenhum evento registrado.</div>
        </div>
      </div>
    </div>

    <div class="test-footer">
      <div class="instruction">As portas USB estão respondendo corretamente?</div>
      <div class="button-group">
        <button class="btn btn-fail" @click="finishTest('FAIL')">FALHA NA PORTA</button>
        <button class="btn btn-pass" @click="finishTest('PASS')">TUDO OK</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.usb-test-container {
  background: #0d0e14;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 25px;
  color: #e0e0e0;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* Header & Status */
.test-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.status-indicator { font-size: 0.75rem; font-weight: bold; letter-spacing: 1px; color: #666; display: flex; align-items: center; gap: 10px; }
.dot { width: 10px; height: 10px; border-radius: 50%; background: #333; transition: 0.3s; }
.pulse .dot { background: #00ffa2; box-shadow: 0 0 10px #00ffa2; animation: blink 1.5s infinite; }
.btn-close { background: transparent; border: none; color: #666; font-size: 1.2rem; cursor: pointer; }

.connection-error {
  background: rgba(255, 71, 71, 0.1);
  border: 1px solid #ff4747;
  color: #ff4747;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 0.75rem;
  margin-bottom: 15px;
}

/* Grid Layout */
.test-content { display: grid; grid-template-columns: 1fr 380px; gap: 20px; flex-grow: 1; min-height: 0; }

/* Device Card */
.device-monitor {
  background: #14161f;
  border: 1px solid #1f222d;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.device-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 30px;
  border-radius: 10px;
  width: 80%;
  border-left: 5px solid;
}
.device-card.log-success { background: rgba(0, 255, 162, 0.05); border-color: #00ffa2; color: #00ffa2; }
.device-card.log-error { background: rgba(255, 71, 71, 0.05); border-color: #ff4747; color: #ff4747; }

.action-label { font-size: 0.7rem; font-weight: 900; text-transform: uppercase; }
.device-name { display: block; font-size: 1.4rem; font-weight: bold; margin: 4px 0; }
.device-time { font-size: 0.8rem; opacity: 0.6; }

/* Log Panel */
.log-panel { background: #08090d; border: 1px solid #1f222d; border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; }
.log-title { padding: 12px; background: #14161f; font-size: 0.7rem; font-weight: bold; color: #555; }
.log-scroll { flex-grow: 1; overflow-y: auto; padding: 15px; }

.log-item {
  display: grid;
  grid-template-columns: 70px 90px 1fr;
  font-size: 0.75rem;
  padding: 10px 0;
  border-bottom: 1px solid #14161f;
}
.log-item.log-success .log-action { color: #00ffa2; }
.log-item.log-error .log-action { color: #ff4747; }
.log-time { color: #444; font-family: monospace; }
.empty-log { color: #444; font-size: 0.8rem; text-align: center; padding: 20px 0; }

/* Footer */
.test-footer { margin-top: 20px; text-align: center; border-top: 1px solid #1f222d; padding-top: 20px; }
.instruction { font-size: 0.9rem; color: #888; margin-bottom: 20px; }
.button-group { display: flex; gap: 15px; justify-content: center; }

.btn { padding: 12px 35px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.3s; border: none; }
.btn-pass { background: #00ffa2; color: #050505; }
.btn-fail { background: #1f222d; color: #ff4747; border: 1px solid #ff4747; }
.btn-pass:hover { background: #00db8b; transform: translateY(-2px); }

/* Animations */
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
.list-enter-active, .list-leave-active { transition: all 0.4s ease; }
.list-enter-from { opacity: 0; transform: translateX(-20px); }

.spinner {
  width: 40px; height: 40px;
  border: 3px solid #1f222d;
  border-top-color: #00ffa2;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 15px;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
