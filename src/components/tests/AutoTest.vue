<template>
  <div class="diag-container">
    <header class="diag-header">
      <div class="header-content">
        <div class="title-row">
          <h1>SISTEMA DE CHECK-UP AUTOMÁTICO</h1>
          <button class="btn-back" @click="goBack">VOLTAR</button>
        </div>
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
            <p v-if="hasGenericVideoDriver" class="card-warning">⚠ Vídeo com driver genérico — instale o driver do fabricante</p>
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

      <div class="diag-card" :class="statusClass(activationStatus)">
        <div class="card-main">
          <div class="card-icon">🔑</div>
          <div class="card-info">
            <h3>Licença Windows</h3>
            <p v-if="licenseOverride">Não Ativado — uso Linux (ignorado)</p>
            <p v-else>{{ results.activation.status === 'check' ? 'Ativado' : 'Não Ativado' }}</p>
          </div>
        </div>
        <div class="card-actions">
          <button class="btn-action" @click="runCmd('OpenActivationSettings')">LICENÇA</button>
          <button
            v-if="results.activation.status !== 'check' && !licenseOverride"
            class="btn-action btn-linux"
            title="Windows é só para teste — o equipamento sai com Linux e não precisa de ativação"
            @click="markLinuxOverride"
          >
            LINUX
          </button>
        </div>
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

// Ativação do Windows não é sempre um requisito real: muitos equipamentos são
// testados com Windows só pra rodar os diagnósticos e saem de fábrica com Linux
// (sem precisar de licença nenhuma). O botão LINUX no card deixa o técnico
// sinalizar isso manualmente — vira PASS sem exigir ativação de verdade.
const licenseOverride = ref(false);

const activationStatus = computed(() => licenseOverride.value ? 'check' : results.value.activation.status);

// Detecta a entrada sintética que o backend adiciona quando a placa de vídeo
// está usando o "Microsoft Basic Display Adapter" em vez do driver do
// fabricante (ver CheckDrivers() em AutoTests.cs) — pra dar um aviso mais
// específico do que só o "Erro em N disp." genérico.
const hasGenericVideoDriver = computed(() => {
  return (results.value.drivers.details?.devices || []).some((d) => d.code === 'GENERIC_VIDEO_DRIVER');
});

const isAllSystemOk = computed(() => {
  return Object.entries(results.value).every(([key, r]) => {
    if (key === 'activation' && licenseOverride.value) return true;
    return r.status === 'check';
  });
});

const emit = defineEmits(['test-cancelled']);

const goBack = () => emit('test-cancelled');

// O teste automático não tem botão manual de PASS/FAIL — assim que os
// resultados chegam (ou são reexecutados, ou a licença é ignorada via LINUX),
// já reporta pro relatório final: PASS se todos os itens estiverem OK, FAIL se
// qualquer um falhar. Chamamos saveResult() direto (em vez de emitir
// "test-completed") pra não fechar a tela — o técnico continua podendo ver/
// corrigir os itens com os botões de ação antes de sair.
const reportResult = () => {
  globalState.saveResult('auto', isAllSystemOk.value ? 'PASS' : 'FAIL');
};

const markLinuxOverride = () => {
  licenseOverride.value = true;
  reportResult();
};

const applyData = (data) => {
  if (!data || data.error) return;

  // Cada nova rodada de diagnóstico começa neutra — se a licença ainda não
  // estiver ativada, o técnico decide de novo se quer ignorar (LINUX) ou não.
  licenseOverride.value = false;

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

  reportResult();
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

.title-row {
  display: flex;
  align-items: center;
  gap: 18px;
}

.btn-back {
  background: #222;
  border: 1px solid #444;
  color: #ccc;
  cursor: pointer;
  padding: 6px 16px;
  font-size: 0.75rem;
  font-weight: bold;
  border-radius: 4px;
  transition: 0.2s;
}

.btn-back:hover {
  background: #333;
  border-color: #ff8800;
  color: #ff8800;
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

.card-warning {
  color: #ff8800 !important;
  font-weight: bold;
  font-size: 0.78rem !important;
}

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

.card-actions {
  display: flex;
  gap: 10px;
}

.card-actions .btn-action {
  flex: 1;
}

.btn-linux {
  color: #00ff88;
}

.btn-linux:hover {
  background: #00ff88;
  color: #000;
  border-color: #00ff88;
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