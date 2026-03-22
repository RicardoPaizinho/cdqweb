<template>
  <div class="diag-container">
    <header class="diag-header">
      <div class="header-content">
        <h1>SISTEMA DE CHECK-UP AUTOMÁTICO</h1>
        <p>Monitoramento de integridade de hardware e software</p>
      </div>
      <div class="header-status" :class="{ 'all-ok': isAllSystemOk }">
        <span class="status-dot"></span>
        {{ isAllSystemOk ? 'SISTEMA ÍNTEGRO' : 'ATENÇÃO REQUERIDA' }}
      </div>
    </header>

    <div class="diag-grid">
      <div class="diag-card" :class="statusClass(results.drivers.status)">
        <div class="card-main">
          <div class="card-icon">📟</div>
          <div class="card-info">
            <h3>Gerenciador de Dispositivos</h3>
            <p v-if="results.drivers.status === 'loading'">Aguardando C#...</p>
            <p v-else>
              {{ results.drivers.status === 'check' ? 'Drivers OK' : `Erro em ${results.drivers.details?.errorCount || 0} disp.` }}
            </p>
          </div>
        </div>
        <button class="btn-action" @click="runCmd('OpenDevMgmt')">ABRIR</button>
      </div>

      <div class="diag-card" :class="statusClass(results.bitlocker.status)">
        <div class="card-main">
          <div class="card-icon">🔐</div>
          <div class="card-info">
            <h3>Criptografia BitLocker</h3>
            <p>{{ results.bitlocker.status === 'check' ? 'Desativado (OK)' : 'Ativo / Protegido' }}</p>
          </div>
        </div>
        <button class="btn-action" @click="runCmd('OpenBitlockerSettings')">AJUSTAR</button>
      </div>

      <div class="diag-card" :class="statusClass(results.partition.status)">
        <div class="card-main">
          <div class="card-icon">💽</div>
          <div class="card-info">
            <h3>Partições de Disco</h3>
            <p v-if="results.partition.status === 'alert'">
              {{ results.partition.details?.unallocatedGB }}GB Não Alocados
            </p>
            <p v-else>Espaço OK</p>
          </div>
        </div>
        <button class="btn-action" @click="runCmd('OpenDiskMgmt')">DISCOS</button>
      </div>

      <div class="diag-card" :class="statusClass(results.activation.status)">
        <div class="card-main">
          <div class="card-icon">🔑</div>
          <div class="card-info">
            <h3>Licença Windows</h3>
            <p>{{ results.activation.status === 'check' ? 'Ativado' : 'Não Ativado' }}</p>
          </div>
        </div>
        <button class="btn-action" @click="runCmd('OpenActivationSettings')">LICENÇA</button>
      </div>

      <div class="diag-card" :class="statusClass(results.smart.status)">
        <div class="card-main">
          <div class="card-icon">🛡️</div>
          <div class="card-info">
            <h3>Saúde do Disco (S.M.A.R.T)</h3>
            <p v-if="results.smart.status === 'loading'">Verificando...</p>
            <p v-else>Vida útil: {{ results.smart.details?.health }}% | Temp: {{ results.smart.details?.temp }}°C</p>
          </div>
        </div>
        <button class="btn-action" @click="runCmd('OpenHDSentinel')">SENTINEL</button>
      </div>
    </div>

    <div class="debug-footer">
      <strong>STATUS DA PONTE:</strong> 
      <span :style="{ color: bridgeReady ? '#00ff88' : '#ff4444' }">
        {{ bridgeReady ? 'CONECTADO AO C#' : 'AGUARDANDO PONTE...' }}
      </span>
      <span v-if="lastUpdate" class="update-time"> | Último teste: {{ lastUpdate }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onBeforeMount, computed, onMounted } from 'vue';

const bridgeReady = ref(false);
const lastUpdate = ref('');
const results = ref({
  drivers: { status: 'loading', details: {} },
  bitlocker: { status: 'loading', details: {} },
  partition: { status: 'loading', details: {} },
  activation: { status: 'loading', details: {} },
  smart: { status: 'loading', details: {} }
});

const isAllSystemOk = computed(() => {
  return Object.values(results.value).every(r => r.status === 'check');
});

// FUNÇÃO GLOBAL - DEFINA UMA VEZ SÓ
window.receiveAutoTestResults = (data) => {
  console.log("%c[C# -> VUE] DADOS CHEGARAM!", "color: #00ff88; font-weight: bold;", data);
  if (data) {
    results.value = data;
    lastUpdate.value = new Date().toLocaleTimeString();
    bridgeReady.value = true;
  }
};

onMounted(() => {
  // Verifica a ponte
  if (window.chrome?.webview?.hostObjects?.nativeBridge) {
    bridgeReady.value = true;
    // Solicita os dados que ficaram no cache do C# caso o Vue tenha demorado a abrir
    window.chrome.webview.hostObjects.nativeBridge.RequestAutoTestData();
  }
});

const statusClass = (status) => ({
  'is-loading': status === 'loading',
  'is-ok': status === 'check',
  'is-alert': status === 'alert'
});

const runCmd = async (methodName) => {
  try {
    const bridge = window.chrome?.webview?.hostObjects?.nativeBridge;
    if (bridge && bridge[methodName]) {
      await bridge[methodName]();
    }
  } catch (err) {
    console.error("Erro ao chamar C#:", err);
  }
};
</script>

<style scoped>
.diag-container {
  background: #0d0d0d;
  color: #fff;
  padding: 20px;
  min-height: 100vh;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.diag-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  border-bottom: 1px solid #333;
  padding-bottom: 15px;
}

.diag-header h1 {
  color: #ff8800;
  font-size: 1.4rem;
  margin: 0;
  letter-spacing: 1px;
}

.header-content p {
  color: #888;
  margin: 5px 0 0;
  font-size: 0.9rem;
}

.header-status {
  padding: 8px 15px;
  border-radius: 20px;
  background: #222;
  font-size: 0.8rem;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid #444;
}

.status-dot {
  width: 10px;
  height: 10px;
  background: #ff4444;
  border-radius: 50%;
  box-shadow: 0 0 8px #ff4444;
}

.all-ok .status-dot {
  background: #00ff88;
  box-shadow: 0 0 8px #00ff88;
}

.diag-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.diag-card {
  background: #161616;
  border: 1px solid #333;
  padding: 20px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s;
}

.diag-card:hover {
  border-color: #555;
  background: #1c1c1c;
}

.is-ok { border-left: 4px solid #00ff88; }
.is-alert { border-left: 4px solid #ff4444; }
.is-loading { border-left: 4px solid #ff8800; opacity: 0.7; }

.card-main { display: flex; gap: 15px; align-items: center; }
.card-icon { font-size: 2rem; }
.card-info h3 { font-size: 1rem; margin: 0; color: #eee; }
.card-info p { font-size: 0.85rem; color: #aaa; margin: 5px 0 0; }

.btn-action {
  margin-top: 20px;
  background: #222;
  border: 1px solid #444;
  color: #ff8800;
  cursor: pointer;
  padding: 8px;
  font-size: 0.75rem;
  font-weight: bold;
  border-radius: 4px;
  transition: 0.2s;
}

.btn-action:hover {
  background: #ff8800;
  color: #000;
  border-color: #ff8800;
}

.debug-footer {
  margin-top: 40px;
  font-size: 0.75rem;
  padding: 15px;
  background: #050505;
  border-radius: 5px;
  color: #666;
}

.update-time {
  margin-left: 10px;
  font-style: italic;
}
</style>