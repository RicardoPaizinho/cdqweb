<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const emit = defineEmits(['test-completed', 'test-cancelled']);

const data = ref(null);
const bluetoothDevices = ref([]);
const loading = ref(true);
let timer = null;

const updateData = async () => {
  try {
    const service = window.chrome.webview.hostObjects.networkService;
    
    // Chamadas paralelas para não travar a UI
    const [netJson, btJson] = await Promise.all([
      service.GetNetworkDataJson(),
      service.GetBluetoothDevices()
    ]);

    data.value = JSON.parse(netJson);
    bluetoothDevices.value = JSON.parse(btJson);
  } catch (err) {
    console.error("Falha na atualização:", err);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  updateData();
  // Atualização automática a cada 3 segundos
  timer = setInterval(updateData, 3000);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});

const handleResult = (status) => {
  emit('test-completed', status);
};
</script>

<template>
  <div class="network-test-view">
    <div class="header">
      <h2>Hardware: Conectividade</h2>
      <div class="live-tag"><span class="pulse"></span> Monitor Ativo</div>
    </div>

    <div v-if="loading" class="loader-box">
      <div class="spinner"></div>
      <p>Sincronizando com drivers...</p>
    </div>

    <div v-else class="content">
      <div class="card" :class="{ 'card-ok': data.WifiOk, 'card-fail': !data.WifiOk }">
        <div class="icon">📶</div>
        <div class="details">
          <label>Interface Wi-Fi</label>
          <p class="adapter-name">{{ data.WifiDesc }}</p>
          <div v-if="data.WifiOk" class="sub-info">
            <span>Rede: <strong>{{ data.WifiSsid }}</strong></span>
            <span>Sinal: <strong>{{ data.WifiSignal }}%</strong></span>
          </div>
        </div>
      </div>

      <div class="card" :class="{ 'card-ok': data.LanOk, 'card-fail': !data.LanOk }">
        <div class="icon">🔌</div>
        <div class="details">
          <label>Rede Cabeada (LAN)</label>
          <p class="adapter-name">{{ data.LanDesc }}</p>
          <p class="status">{{ data.LanOk ? 'Cabo Conectado' : 'Cabo Desconectado' }}</p>
        </div>
      </div>

      <div class="card" :class="{ 'card-ok': bluetoothDevices.length > 0, 'card-warn': bluetoothDevices.length === 0 }">
        <div class="icon">🎧</div>
        <div class="details">
          <label>Bluetooth</label>
          <div v-if="bluetoothDevices.length > 0" class="device-list">
            <div v-for="dev in bluetoothDevices" :key="dev" class="device-item">
              <span class="online-indicator"></span> {{ dev }}
            </div>
          </div>
          <p v-else class="status">Aguardando conexão de dispositivo...</p>
        </div>
      </div>

      <div class="internet-bar" :class="data.InternetOk ? 'online' : 'offline'">
        {{ data.InternetOk ? 'INTERNET DISPONÍVEL' : 'SEM ACESSO À INTERNET' }}
      </div>
    </div>

    <div class="footer">
      <button @click="handleResult('PASS')" class="pass-btn">APROVAR TESTE</button>
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
  border-bottom: 2px solid #eee;
  padding-bottom: 10px;
  margin-bottom: 20px;
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

.icon { font-size: 2rem; margin-right: 15px; }

.adapter-name { font-weight: bold; margin: 0; color: #2c3e50; }

.sub-info { font-size: 0.85rem; color: #7f8c8d; margin-top: 5px; }

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
.fail-btn { background: #e74c3c; }

@keyframes blink { 0% { opacity: 0.2; } 50% { opacity: 1; } 100% { opacity: 0.2; } }
</style>