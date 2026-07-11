<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';

const emit = defineEmits(['test-completed', 'test-cancelled']);

// --- CONFIGURAÇÃO DA API LOCAL (agente C#) ---
const API_BASE_URL = 'https://localhost:5001/api';
const POLL_INTERVAL_MS = 1500;

// Estados da bateria (lidos do backend C# via WMI/root\WMI BatteryStatus)
const deviceName = ref('—');
const manufacturerName = ref('—');
const chemistryType = ref('—');
const serialNumber = ref('—');
const chargingStatus = ref('Aguardando leitura...');
const currentCapacityPercent = ref(0);
const currentCapacityWh = ref(null);
const fullChargeCapacityWh = ref(null);
const designedCapacityWh = ref(null);
const batteryHealthPercent = ref(null);
const voltageV = ref(null);
const chargeRateW = ref(null);
const dischargeRateW = ref(null);
const isCharging = ref(false);
const isDischarging = ref(false);

const loading = ref(true);
const connectionError = ref('');
const batteryDetected = ref(false);

// Requisitos de teste: precisa observar pelo menos um ciclo de carga E um de descarga
const hasDetectedCharging = ref(false);
const hasDetectedDischarging = ref(false);

let pollTimer = null;

const canPass = computed(() => {
  return batteryDetected.value && hasDetectedCharging.value && hasDetectedDischarging.value;
});

const getLevelColor = () => {
  const lvl = currentCapacityPercent.value;
  if (lvl > 60) return '#2ecc71';
  if (lvl > 20) return '#f1c40f';
  return '#e74c3c';
};

function fmt(value, digits = 2) {
  return typeof value === 'number' ? value.toFixed(digits) : '—';
}

async function fetchBatteryData() {
  try {
    const response = await fetch(`${API_BASE_URL}/battery`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const list = await response.json();

    if (!Array.isArray(list) || list.length === 0) {
      batteryDetected.value = false;
      chargingStatus.value = 'Nenhuma bateria detectada neste equipamento.';
      connectionError.value = '';
      loading.value = false;
      return;
    }

    // Usa a bateria primária (primeiro item retornado pelo agente C#)
    const bat = list[0];
    batteryDetected.value = true;
    connectionError.value = '';

    deviceName.value = bat.deviceName || '—';
    manufacturerName.value = bat.manufacturerName || '—';
    chemistryType.value = bat.chemistryType || '—';
    serialNumber.value = bat.serialNumber || '—';
    chargingStatus.value = bat.chargingStatus || '—';
    currentCapacityPercent.value = Math.round((bat.currentCapacityPercent ?? 0) * 100) / 100;
    currentCapacityWh.value = bat.currentCapacityWh;
    fullChargeCapacityWh.value = bat.fullChargeCapacityWh;
    designedCapacityWh.value = bat.designedCapacityWh;
    batteryHealthPercent.value = bat.batteryHealthPercent;
    voltageV.value = bat.voltageV;
    chargeRateW.value = bat.chargeRateW;
    dischargeRateW.value = bat.dischargeRateW;
    isCharging.value = !!bat.isCharging;
    isDischarging.value = !!bat.isDischarging;

    // Uma vez detectado um ciclo, mantemos o "check" marcado mesmo que o
    // estado mude no ciclo seguinte (o técnico pode ter plugado/desplugado
    // o cabo rapidamente durante o teste).
    if (isCharging.value) hasDetectedCharging.value = true;
    if (isDischarging.value) hasDetectedDischarging.value = true;
  } catch (err) {
    connectionError.value = 'Não foi possível conectar ao agente local (porta 5001). Verifique se o HardwareTestApp está em execução.';
    console.error('Erro ao buscar dados de bateria:', err);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchBatteryData();
  pollTimer = setInterval(fetchBatteryData, POLL_INTERVAL_MS);
});

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer);
});

const endTest = (res) => emit('test-completed', res);
const goBack = () => emit('test-cancelled');
</script>

<template>
  <div class="test-container">
    <header class="test-header">
      <div class="title-group">
        <h4 class="tech-font">DIAGNÓSTICO DE ENERGIA</h4>
        <button class="btn-glass back-neon tech-font" @click="goBack">VOLTAR</button>
      </div>
      <div class="device-mini-info tech-font">
        STATUS:
        <span :class="isCharging ? 'text-accent' : (isDischarging ? 'text-warning' : '')">
          {{ chargingStatus }}
        </span>
      </div>
    </header>

    <div class="main-layout">
      <div class="test-content glass-panel">

        <p v-if="connectionError" class="connection-error">{{ connectionError }}</p>

        <div class="metrics-grid">
          <div class="metric-card card-glass">
            <span class="mini-label tech-font">CAPACIDADE ATUAL</span>
            <div class="metric-value tech-font">{{ fmt(currentCapacityPercent, 2) }}%</div>
            <div class="battery-visual-wrapper">
              <div class="battery-body">
                <div class="battery-level-fill" :style="{ width: currentCapacityPercent + '%', backgroundColor: getLevelColor() }"></div>
              </div>
            </div>
          </div>

          <div class="metric-card card-glass">
            <span class="mini-label tech-font">NÍVEL DE CONSERVAÇÃO</span>
            <div class="metric-value tech-font" :class="(batteryHealthPercent ?? 0) < 70 ? 'text-fail' : 'text-pass'">
              {{ fmt(batteryHealthPercent, 2) }}%
            </div>
            <div class="health-bar-bg">
              <div class="health-bar-fill" :style="{ width: (batteryHealthPercent ?? 0) + '%' }"></div>
            </div>
          </div>
        </div>

        <div class="data-table card-glass">
          <div class="data-row">
            <span class="tech-font label">NOME DO DISPOSITIVO:</span>
            <span class="tech-font value">{{ deviceName }}</span>
          </div>
          <div class="data-row">
            <span class="tech-font label">FABRICANTE:</span>
            <span class="tech-font value">{{ manufacturerName }}</span>
          </div>
          <div class="data-row">
            <span class="tech-font label">TIPO:</span>
            <span class="tech-font value">{{ chemistryType }}</span>
          </div>
          <div class="data-row">
            <span class="tech-font label">NÚMERO DE SÉRIE:</span>
            <span class="tech-font value">{{ serialNumber }}</span>
          </div>
          <div class="data-row">
            <span class="tech-font label">CAPACIDADE ATUAL:</span>
            <span class="tech-font value">{{ fmt(currentCapacityWh) }} Wh</span>
          </div>
          <div class="data-row">
            <span class="tech-font label">CAPACIDADE DE CARGA COMPLETA:</span>
            <span class="tech-font value">{{ fmt(fullChargeCapacityWh) }} Wh</span>
          </div>
          <div class="data-row">
            <span class="tech-font label">CAPACIDADE PROJETADA (DESIGN):</span>
            <span class="tech-font value">{{ fmt(designedCapacityWh) }} Wh</span>
          </div>
          <div class="data-row">
            <span class="tech-font label">TENSÃO:</span>
            <span class="tech-font value">{{ fmt(voltageV) }} V</span>
          </div>
          <div class="data-row">
            <span class="tech-font label">TAXA DE CARGA:</span>
            <span class="tech-font value" :class="chargeRateW ? 'text-accent' : ''">
              {{ chargeRateW ? fmt(chargeRateW) + ' W' : '—' }}
            </span>
          </div>
          <div class="data-row">
            <span class="tech-font label">TAXA DE DESCARGA:</span>
            <span class="tech-font value" :class="dischargeRateW ? 'text-warning' : ''">
              {{ dischargeRateW ? fmt(dischargeRateW) + ' W' : '—' }}
            </span>
          </div>
        </div>

        <div class="checklist card-glass">
          <div class="check-item" :class="{ 'check-done': hasDetectedCharging }">
            <span class="icon">{{ hasDetectedCharging ? '✔' : '○' }}</span>
            Detectar Carregamento (cabo conectado)
          </div>
          <div class="check-item" :class="{ 'check-done': hasDetectedDischarging }">
            <span class="icon">{{ hasDetectedDischarging ? '✔' : '○' }}</span>
            Detectar Descarregamento (cabo desconectado)
          </div>
        </div>

        <p class="hint tech-font" v-if="!hasDetectedCharging || !hasDetectedDischarging">
          Conecte e desconecte o cabo de energia ao menos uma vez durante o teste para liberar o PASS.
        </p>

      </div>

      <aside class="decision-sidebar">
        <button
          class="btn-sidebar pass-neon tech-font"
          :disabled="!canPass"
          @click="endTest('PASS')"
        >
          PASS
        </button>
        <button class="btn-sidebar fail-neon tech-font" @click="endTest('FAIL')">
          FAIL
        </button>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.test-container { display: flex; flex-direction: column; gap: 15px; color: var(--text-main); padding: 10px; height: 100%; }
.tech-font { font-family: var(--font-tech); letter-spacing: 1px; }

.test-header { display: flex; justify-content: space-between; align-items: center; }
.title-group { display: flex; align-items: center; gap: 15px; }

.main-layout { display: grid; grid-template-columns: 1fr 100px; gap: 20px; flex-grow: 1; overflow: hidden; }

.glass-panel {
  background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(12px);
  border: 1px solid var(--border); border-radius: 15px; padding: 25px;
  display: flex; flex-direction: column; gap: 20px; overflow-y: auto;
}

.connection-error {
  background: rgba(231, 76, 60, 0.1);
  border: 1px solid #e74c3c;
  color: #e74c3c;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 0.75rem;
}

/* MÉTRICAS */
.metrics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; width: 100%; }
.metric-card { padding: 15px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.metric-value { font-size: 2rem; color: var(--accent); text-shadow: 0 0 10px var(--accent); }

/* BATERIA VISUAL */
.battery-visual-wrapper { width: 60px; height: 25px; border: 2px solid var(--border); padding: 2px; border-radius: 4px; position: relative; }
.battery-visual-wrapper::after { content: ''; position: absolute; right: -6px; top: 6px; width: 4px; height: 10px; background: var(--border); border-radius: 0 2px 2px 0; }
.battery-level-fill { height: 100%; transition: 0.5s width ease; }

.health-bar-bg { width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; }
.health-bar-fill { height: 100%; background: var(--text-success); box-shadow: 0 0 10px var(--text-success); border-radius: 3px; }

/* TABELA */
.data-table { width: 100%; padding: 15px; background: rgba(0,0,0,0.2); }
.data-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
.label { font-size: 0.65rem; color: var(--text-dim); }
.value { font-size: 0.75rem; color: var(--text-main); }

/* CHECKLIST */
.checklist { width: 100%; padding: 15px; display: flex; flex-direction: column; gap: 10px; }
.check-item { font-size: 0.7rem; color: var(--text-dim); display: flex; align-items: center; gap: 10px; opacity: 0.5; transition: 0.3s; }
.check-done { opacity: 1; color: var(--text-success); }
.text-warning { color: #f1c40f; }
.text-accent { color: var(--accent); }
.text-pass { color: var(--text-success); }
.text-fail { color: #e74c3c; }

.hint { font-size: 0.65rem; color: var(--text-dim); opacity: 0.7; text-align: center; }

/* SIDEBAR */
.decision-sidebar { display: flex; flex-direction: column; gap: 15px; }
.btn-sidebar {
  width: 100px; height: 100px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.05); color: var(--text-main); cursor: pointer; transition: 0.3s;
}
.pass-neon:disabled { opacity: 0.1; cursor: not-allowed; filter: grayscale(1); }
.pass-neon:hover:not(:disabled) { border-color: var(--text-success); color: var(--text-success); box-shadow: 0 0 20px var(--status-pass-glow); }
.fail-neon:hover { border-color: #ff4d4d; color: #ff4d4d; box-shadow: 0 0 20px var(--status-fail-glow); }
</style>