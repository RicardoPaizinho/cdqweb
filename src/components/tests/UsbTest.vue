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

const goBack = () => {
  emit('test-cancelled');
};
</script>

<template>
  <div class="usb-test-container">
    <!-- Header Padronizado -->
    <header class="test-header">
      <div class="header-left">
        <h4 class="tech-font">TESTE DE PORTAS USB</h4>
        <button class="btn-glass back-neon tech-font" @click="goBack">VOLTAR</button>
      </div>

      <div class="header-actions">
        <button class="btn-glass pass-neon tech-font" @click="finishTest('PASS')">
          PASS
        </button>
        <button class="btn-glass fail-neon tech-font" @click="finishTest('FAIL')">
          FAIL
        </button>
      </div>
    </header>

    <!-- Indicador de Status do Agente Local -->
    <div class="status-bar card-glass">
      <div class="status-indicator" :class="{ 'pulse': isListening }">
        <span class="dot"></span>
        <span class="tech-font mini-label">
          {{ isListening ? 'MONITORANDO PORTAS USB ATIVAMENTE' : 'INICIALIZANDO AGENTE...' }}
        </span>
      </div>
    </div>

    <p v-if="connectionError" class="connection-error">{{ connectionError }}</p>

    <!-- Conteúdo Principal Dividido -->
    <div class="test-content">
      <!-- Painel Esquerdo: Monitor Visual -->
      <div class="device-monitor card-glass">
        <div v-if="lastDevice" class="device-card" :class="lastDevice.class">
          <div class="usb-icon-box">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22V10M12 10L9 7M12 10L15 7M7 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm10 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4zM12 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/>
            </svg>
          </div>
          <div class="info">
            <span class="action-label tech-font">{{ lastDevice.action }}</span>
            <span class="device-name tech-font">{{ lastDevice.name }}</span>
            <span class="device-time tech-font">{{ lastDevice.time }}</span>
          </div>
        </div>

        <div v-else class="waiting-state">
          <div class="spinner"></div>
          <h3 class="tech-font">Aguardando Periférico</h3>
          <p class="tech-font">Insira um Pendrive ou Mouse em qualquer porta USB para testar a detecção.</p>
        </div>
      </div>

      <!-- Painel Direito: Histórico com Scroll Interno Limitações -->
      <div class="log-panel card-glass">
        <div class="log-title tech-font">HISTÓRICO DE CONEXÃO</div>
        <div class="log-scroll">
          <transition-group name="list">
            <div v-for="log in usbLogs" :key="log.id" class="log-item" :class="log.class">
              <span class="log-time tech-font">{{ log.time }}</span>
              <span class="log-action tech-font">{{ log.action }}</span>
              <span class="log-name tech-font">{{ log.name }}</span>
            </div>
          </transition-group>
          <div v-if="usbLogs.length === 0" class="empty-log tech-font">Nenhum evento registrado.</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.usb-test-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
  color: var(--text-main, #fff);
  padding: 10px;
  height: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.tech-font {
  font-family: var(--font-tech, 'Consolas', monospace);
  letter-spacing: 1px;
}

/* Header Padronizado */
.test-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.1));
  padding-bottom: 10px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.header-left h4 {
  margin: 0;
  color: var(--accent, #00ff41);
  text-transform: uppercase;
  font-weight: bold;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.btn-glass {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-main, #fff);
  padding: 8px 20px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.8rem;
  font-weight: bold;
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

/* Status Bar */
.card-glass {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 12px;
}

.status-bar {
  display: flex;
  align-items: center;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #555;
  transition: 0.3s;
}

.pulse .dot {
  background: var(--accent, #00ff41);
  box-shadow: 0 0 8px var(--accent, #00ff41);
  animation: blink 1.5s infinite;
}

.mini-label {
  font-size: 0.7rem;
  color: var(--text-dim, #aaa);
}

.connection-error {
  background: rgba(255, 71, 71, 0.1);
  border: 1px solid #ff4747;
  color: #ff4747;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 0.7rem;
}

/* Content Grid */
.test-content {
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 15px;
  flex-grow: 1;
  min-height: 0; /* Previne estouro de flexbox */
}

/* Monitor de Dispositivo */
.device-monitor {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.device-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 25px;
  border-radius: 10px;
  width: 85%;
  border-left: 5px solid;
  background: rgba(0, 0, 0, 0.4);
}

.device-card.log-success {
  border-color: var(--text-success, #00ff41);
  color: var(--text-success, #00ff41);
}

.device-card.log-error {
  border-color: #ff4747;
  color: #ff4747;
}

.action-label {
  font-size: 0.7rem;
  font-weight: bold;
  text-transform: uppercase;
  display: block;
}

.device-name {
  display: block;
  font-size: 1.2rem;
  font-weight: bold;
  margin: 4px 0;
  color: #fff;
}

.device-time {
  font-size: 0.75rem;
  opacity: 0.6;
}

.waiting-state {
  text-align: center;
  color: #888;
}

.waiting-state h3 {
  font-size: 1rem;
  color: #ccc;
  margin-bottom: 6px;
}

.waiting-state p {
  font-size: 0.75rem;
}

/* Histórico de Conexão com Scroll Interno */
.log-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden; /* Mantém o border-radius e evita o vazamento */
  padding: 0;
}

.log-title {
  padding: 12px 15px;
  background: rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 0.7rem;
  font-weight: bold;
  color: var(--text-dim, #888);
}

.log-scroll {
  flex-grow: 1;
  overflow-y: auto;
  padding: 10px 15px;
  max-height: 100%;
}

/* Custom Scrollbar para o Histórico */
.log-scroll::-webkit-scrollbar {
  width: 6px;
}

.log-scroll::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
}

.log-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 3px;
}

.log-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 255, 65, 0.4);
}

.log-item {
  display: grid;
  grid-template-columns: 65px 85px 1fr;
  font-size: 0.7rem;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.log-item.log-success .log-action { color: var(--text-success, #00ff41); }
.log-item.log-error .log-action { color: #ff4747; }
.log-time { color: #666; }
.empty-log { color: #555; font-size: 0.75rem; text-align: center; padding: 20px 0; }

/* Animações e Spinners */
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
.list-enter-active, .list-leave-active { transition: all 0.3s ease; }
.list-enter-from { opacity: 0; transform: translateX(-15px); }

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: var(--accent, #00ff41);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 12px;
}

@keyframes spin { to { transform: rotate(360deg); } }
</style>