<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';

const emit = defineEmits(['test-completed', 'test-cancelled']);

// --- CONFIGURAÇÃO DA API LOCAL (agente C#) ---
const API_BASE_URL = 'https://localhost:5001/api';
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
    connectionError.value = 'Não foi possível conectar ao agente local (porta 5001). Verifique se o HardwareTestApp está em execução.';
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

// --- REGRA DE APROVAÇÃO ---
// Se o adaptador de LAN existe, ele TEM que estar conectado.
// Se o adaptador de Wi-Fi existe, ele TEM que estar conectado.
// Se nenhum dos dois existir, não bloqueia o teste (equipamento pode não ter a interface).
// Bluetooth é apenas informativo — nunca bloqueia o PASS.
const canPass = computed(() => {
  if (!data.value) return false;
  const lanOk = !data.value.LanPresent || data.value.LanOk;
  const wifiOk = !data.value.WifiPresent || data.value.WifiOk;
  return lanOk && wifiOk;
});

const handleResult = (status) => {
  emit('test-completed', status);
};
const goBack = () => emit('test-cancelled');
</script>

<template>
  <div class="network-test-view">
    <div class="header">
      <h2>Hardware: Conectividade</h2>
      <div class="header-actions">
        <div class="live-tag"><span class="pulse"></span> Monitor Ativo</div>
        <button class="back-btn" @click="goBack">Voltar</button>
      </div>
    </div>

    <div v-if="loading" class="loader-box">
      <div class="spinner"></div>
      <p>Sincronizando com drivers...</p>
    </div>

    <p v-else-if="connectionError" class="connection-error">{{ connectionError }}</p>

    <div v-else class="content">
      <div class="card" :class="{ 'card-ok': data.WifiOk, 'card-fail': data.WifiPresent && !data.WifiOk, 'card-muted': !data.WifiPresent }">
        <div class="icon">📶</div>
        <div class="details">
          <label>Interface Wi-Fi</label>
          <p class="adapter-name">{{ data.WifiPresent ? (data.WifiDesc || 'Adaptador Wi-Fi') : 'Nenhum adaptador Wi-Fi detectado' }}</p>
          <div v-if="data.WifiPresent" class="sub-info">
            <span>Rede: <strong>{{ data.WifiSsid || '—' }}</strong></span>
            <span v-if="data.WifiOk">Sinal: <strong>{{ data.WifiSignal }}%</strong></span>
          </div>
          <p v-if="data.WifiPresent" class="status">{{ data.WifiOk ? 'Conectado' : 'Desconectado — obrigatório para aprovar' }}</p>
        </div>
      </div>

      <div class="card" :class="{ 'card-ok': data.LanOk, 'card-fail': data.LanPresent && !data.LanOk, 'card-muted': !data.LanPresent }">
        <div class="icon">🔌</div>
        <div class="details">
          <label>Rede Cabeada (LAN)</label>
          <p class="adapter-name">{{ data.LanPresent ? (data.LanDesc || 'Adaptador Ethernet') : 'Nenhum adaptador LAN detectado' }}</p>
          <p v-if="data.LanPresent" class="status">{{ data.LanOk ? 'Cabo Conectado' : 'Cabo Desconectado — obrigatório para aprovar' }}</p>
        </div>
      </div>

      <div class="card" :class="data.BtOk ? 'card-ok' : 'card-warn'">
        <div class="icon">🎧</div>
        <div class="details">
          <label>Bluetooth <span class="optional-tag">(não obrigatório)</span></label>
          <div v-if="data.BluetoothDevices && data.BluetoothDevices.length > 0" class="device-list">
            <div v-for="dev in data.BluetoothDevices" :key="dev" class="device-item">
              <span class="online-indicator"></span> {{ dev }}
            </div>
          </div>
          <p v-else class="status">Nenhum dispositivo pareado.</p>
        </div>
      </div>

      <div class="internet-bar" :class="data.InternetOk ? 'online' : 'offline'">
        {{ data.InternetOk ? 'INTERNET DISPONÍVEL' : 'SEM ACESSO À INTERNET' }}
      </div>
    </div>

    <div class="footer">
      <button @click="handleResult('PASS')" class="pass-btn" :disabled="!canPass">APROVAR TESTE</button>
      <button @click="handleResult('FAIL')" class="fail-btn">REPROVAR TESTE</button>
    </div>
  </div>
</template>

<style scoped>
.network-test-view {
  padding: 20px;
  max-width: 800px;
  margin: auto;
  font-family: 'Segoe UI', sans-serif;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #eee;
  padding-bottom: 10px;
  margin-bottom: 20px;
}

.header-actions { display: flex; align-items: center; gap: 15px; }

.back-btn {
  background: transparent;
  border: 1px solid #ccc;
  color: #555;
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
}

.live-tag {
  color: #666;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 5px;
}

.pulse {
  width: 8px;
  height: 8px;
  background: #ff4d4d;
  border-radius: 50%;
  animation: blink 1s infinite;
}

.connection-error {
  background: rgba(231, 76, 60, 0.1);
  border: 1px solid #e74c3c;
  color: #e74c3c;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 0.85rem;
  text-align: center;
}

.card {
  display: flex;
  background: #fff;
  border-radius: 10px;
  padding: 15px;
  margin-bottom: 15px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  border-left: 6px solid #ccc;
  transition: all 0.3s;
}

.card-ok { border-left-color: #2ecc71; }
.card-fail { border-left-color: #e74c3c; }
.card-warn { border-left-color: #f1c40f; }
.card-muted { border-left-color: #ccc; opacity: 0.6; }

.icon { font-size: 2rem; margin-right: 15px; }

.adapter-name { font-weight: bold; margin: 0; color: #2c3e50; }

.optional-tag { font-size: 0.7rem; font-weight: normal; color: #999; }

.sub-info { font-size: 0.85rem; color: #7f8c8d; margin-top: 5px; display: flex; gap: 15px; }

.status { font-size: 0.8rem; color: #555; margin-top: 4px; }

.device-item {
  background: #f8f9fa;
  padding: 5px 10px;
  border-radius: 5px;
  margin-top: 5px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.online-indicator {
  width: 6px;
  height: 6px;
  background: #2ecc71;
  border-radius: 50%;
}

.internet-bar {
  text-align: center;
  padding: 10px;
  border-radius: 5px;
  font-weight: bold;
  margin-top: 20px;
}

.online { background: #6a706c; color: #155724; }
.offline { background: #6a706c; color: #721c24; }

.footer {
  display: flex;
  gap: 20px;
  justify-content: center;
  margin-top: 30px;
}

button {
  padding: 12px 40px;
  border: none;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  color: white;
}

.pass-btn { background: #2ecc71; }
.pass-btn:disabled { background: #999; cursor: not-allowed; opacity: 0.5; }
.fail-btn { background: #e74c3c; }

.loader-box { text-align: center; padding: 40px; color: #666; }
.spinner {
  width: 32px; height: 32px; margin: 0 auto 12px;
  border: 3px solid #ddd; border-top-color: #2ecc71; border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes blink { 0% { opacity: 0.2; } 50% { opacity: 1; } 100% { opacity: 0.2; } }
</style>