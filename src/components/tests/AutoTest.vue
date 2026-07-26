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
            <p v-if="results.drivers.status === 'loading'">Aguardando agente local...</p>
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
        {{ bridgeReady ? 'CONECTADO AO AGENTE LOCAL' : 'AGUARDANDO AGENTE (porta 5000)...' }}
      </span>
      <span v-if="lastUpdate" class="update-time"> | Último teste: {{ lastUpdate }}</span>
      <button class="btn-refresh" @click="refresh" :disabled="refreshing">
        {{ refreshing ? 'Executando...' : 'Reexecutar diagnóstico' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { globalState } from '@/store.js';

// --- CONFIGURAÇÃO DA API LOCAL (agente C#) ---
const API_BASE_URL = 'http://localhost:5000/api';

const bridgeReady = ref(false);
const lastUpdate = ref('');
const refreshing = ref(false);
const results = ref({
  drivers: { status: 'loading', details: {} },
  bitlocker: { status: 'loading', details: {} },
  partition: { status: 'loading', details: {} },
  activation: { status: 'loading', details: {} },
  smart: { status: 'loading', details: {} }
});

const isAllSystemOk = computed(() => {
  return Object.values(results.value).every((r) => r.status === 'check');
});

const emit = defineEmits(['test-cancelled']);

const applyData = (data) => {
  if (!data || data.error) return;
  results.value = {
    drivers: data.drivers ?? { status: 'alert', details: {} },
    bitlocker: data.bitlocker ?? { status: 'alert', details: {} },
    partition: data.partition ?? { status: 'alert', details: {} },
    activation: data.activation ?? { status: 'alert', details: {} },
    smart: data.smart ?? { status: 'alert', details: {} }
  };
  lastUpdate.value = new Date().toLocaleTimeString();
  bridgeReady.value = true;

  // Guarda modelo/saúde/temperatura do disco pro relatório final salvar no
  // campo "testeAuto" do banco (Relatorios.vue lê isso via globalState).
  globalState.autoTestSmartInfo = {
    modelo: results.value.smart.details?.modelo || '',
    health: results.value.smart.details?.health ?? null,
    temp: results.value.smart.details?.temp ?? null
  };

  // O teste automático não tem botão manual de PASS/FAIL — assim que os
  // resultados chegam (ou são reexecutados), já reporta pro relatório final:
  // PASS se todos os itens estiverem OK, FAIL se qualquer um falhar.
  // Chamamos saveResult() direto (em vez de emitir "test-completed") pra não
  // fechar a tela — o técnico continua podendo ver/corrigir os itens com os
  // botões de ação antes de sair.
  globalState.saveResult('auto', isAllSystemOk.value ? 'PASS' : 'FAIL');
};

const fetchResults = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/auto-diagnostics`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    applyData(data);
  } catch (err) {
    bridgeReady.value = false;
    console.error('Falha ao buscar diagnóstico automático:', err);
  }
};

const refresh = async () => {
  refreshing.value = true;
  try {
    const response = await fetch(`${API_BASE_URL}/auto-diagnostics/refresh`, { method: 'POST' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    applyData(data);
  } catch (err) {
    console.error('Falha ao reexecutar diagnóstico:', err);
  } finally {
    refreshing.value = false;
  }
};

onMounted(() => {
  fetchResults();
});

const statusClass = (status) => ({
  'is-loading': status === 'loading',
  'is-ok': status === 'check',
  'is-alert': status === 'alert'
});

const runCmd = async (action) => {
  try {
    const response = await fetch(`${API_BASE_URL}/auto-diagnostics/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || (data && data.success === false)) {
      console.error('Falha ao executar ação:', data?.message);
    }
  } catch (err) {
    console.error('Erro ao chamar o agente local:', err);
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
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.update-time {
  font-style: italic;
}

.btn-refresh {
  margin-left: auto;
  background: #222;
  border: 1px solid #444;
  color: #ff8800;
  cursor: pointer;
  padding: 6px 14px;
  font-size: 0.75rem;
  font-weight: bold;
  border-radius: 4px;
}

.btn-refresh:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>