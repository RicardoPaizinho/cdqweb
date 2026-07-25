<template>
  <div class="test-container">
    <!-- Header Único -->
    <header class="test-header">
      <div class="header-left">
        <h4 class="tech-font">DIAGNÓSTICO DE ENERGIA</h4>
        <button class="btn-glass back-neon tech-font" @click="goBack">VOLTAR</button>
      </div>

      <div class="header-actions">
        <button
          class="btn-glass pass-neon tech-font"
          :disabled="!canPass"
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
      <div class="test-content glass-panel">
        
        <!-- Status de Leitura no topo do painel -->
        <div class="status-bar card-glass">
          <span class="tech-font mini-label">STATUS DA BATERIA:</span>
          <span class="tech-font status-text" :class="isCharging ? 'text-accent' : (isDischarging ? 'text-warning' : '')">
            {{ chargingStatus }}
          </span>
        </div>

        <p v-if="connectionError" class="connection-error">{{ connectionError }}</p>

        <!-- Métricas Principais -->
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

        <!-- GRÁFICO DE CARGA AO LONGO DO TEMPO -->
        <div class="chart-section card-glass">
          <div class="chart-header">
            <span class="tech-font mini-label">HISTÓRICO DE CARGA EM TEMPO REAL (%)</span>
            <span class="tech-font chart-points-count">{{ historyData.length }} PONTOS REGISTRADOS</span>
          </div>

          <div class="svg-container">
            <svg viewBox="0 0 500 120" class="battery-chart">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="var(--accent, #00ff41)" stop-opacity="0.4" />
                  <stop offset="100%" stop-color="var(--accent, #00ff41)" stop-opacity="0.0" />
                </linearGradient>
              </defs>

              <!-- Linhas de grade horizontais (100%, 50%, 0%) -->
              <line x1="0" y1="10" x2="500" y2="10" stroke="rgba(255,255,255,0.05)" stroke-dasharray="4" />
              <line x1="0" y1="60" x2="500" y2="60" stroke="rgba(255,255,255,0.05)" stroke-dasharray="4" />
              <line x1="0" y1="110" x2="500" y2="110" stroke="rgba(255,255,255,0.05)" stroke-dasharray="4" />

              <!-- Área Preenchida abaixo da Linha -->
              <polygon v-if="chartAreaPath" :points="chartAreaPath" fill="url(#chartGradient)" />

              <!-- Linha do Gráfico -->
              <polyline v-if="chartLinePoints" :points="chartLinePoints" fill="none" stroke="var(--accent, #00ff41)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
        </div>

        <!-- Tabela de Detalhes -->
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

        <!-- Checklist de Liberação -->
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
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';

const emit = defineEmits(['test-completed', 'test-cancelled']);

const API_BASE_URL = 'http://localhost:5000/api';
const POLL_INTERVAL_MS = 1500;
const MAX_HISTORIC_POINTS = 40; // Limite de pontos exibidos no gráfico SVG

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

const hasDetectedCharging = ref(false);
const hasDetectedDischarging = ref(false);

// Histórico para o Gráfico SVG
const historyData = ref([]);

let pollTimer = null;

const canPass = computed(() => {
  return batteryDetected.value && hasDetectedCharging.value && hasDetectedDischarging.value;
});

const getLevelColor = () => {
  const lvl = currentCapacityPercent.value;
  if (lvl > 60) return '#00ff41';
  if (lvl > 20) return '#f1c40f';
  return '#e74c3c';
};

function fmt(value, digits = 2) {
  return typeof value === 'number' ? value.toFixed(digits) : '—';
}

// Lógica de Renderização do Gráfico SVG (Mapeamento de 0..100% para o SVG 10..110 Y)
const chartLinePoints = computed(() => {
  if (historyData.value.length === 0) return '';
  const svgWidth = 500;
  const svgHeight = 100; // de Y=10 (100%) a Y=110 (0%)
  const count = historyData.value.length;

  return historyData.value.map((val, idx) => {
    const x = count > 1 ? (idx / (count - 1)) * svgWidth : svgWidth;
    // Inverte o eixo Y (100% fica no topo Y=10 e 0% no fundo Y=110)
    const y = 110 - (val / 100) * svgHeight;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
});

const chartAreaPath = computed(() => {
  const linePoints = chartLinePoints.value;
  if (!linePoints) return '';
  const count = historyData.value.length;
  const lastX = count > 1 ? 500 : 500;
  return `0,110 ${linePoints} ${lastX},110`;
});

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

    const bat = list[0];
    batteryDetected.value = true;
    connectionError.value = '';

    deviceName.value = bat.deviceName || '—';
    manufacturerName.value = bat.manufacturerName || '—';
    chemistryType.value = bat.chemistryType || '—';
    serialNumber.value = bat.serialNumber || '—';
    chargingStatus.value = bat.chargingStatus || '—';
    
    const pct = Math.round((bat.currentCapacityPercent ?? 0) * 100) / 100;
    currentCapacityPercent.value = pct;
    
    currentCapacityWh.value = bat.currentCapacityWh;
    fullChargeCapacityWh.value = bat.fullChargeCapacityWh;
    designedCapacityWh.value = bat.designedCapacityWh;
    batteryHealthPercent.value = bat.batteryHealthPercent;
    voltageV.value = bat.voltageV;
    chargeRateW.value = bat.chargeRateW;
    dischargeRateW.value = bat.dischargeRateW;
    isCharging.value = !!bat.isCharging;
    isDischarging.value = !!bat.isDischarging;

    if (isCharging.value) hasDetectedCharging.value = true;
    if (isDischarging.value) hasDetectedDischarging.value = true;

    // Registra Ponto no Histórico do Gráfico
    historyData.value.push(pct);
    if (historyData.value.length > MAX_HISTORIC_POINTS) {
      historyData.value.shift();
    }

  } catch (err) {
    connectionError.value = 'Não foi possível conectar ao agente local (porta 5000). Verifique se o HardwareTestApp está em execução.';
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

<style scoped>
.test-container { display: flex; flex-direction: column; gap: 15px; color: var(--text-main, #fff); padding: 10px; height: 100%; }
.tech-font { font-family: var(--font-tech, 'Consolas', monospace); letter-spacing: 1px; font-weight: bold; }

/* Header Superior Único */
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

.status-bar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 15px; background: rgba(0,0,0,0.2); border-radius: 8px;
}
.status-text { font-size: 0.8rem; }

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
.metric-card { padding: 15px; display: flex; flex-direction: column; align-items: center; gap: 10px; background: rgba(0,0,0,0.2); border-radius: 8px; }
.metric-value { font-size: 2rem; color: var(--accent, #00ff41); text-shadow: 0 0 10px rgba(0,255,65,0.3); }

/* BATERIA VISUAL */
.battery-visual-wrapper { width: 60px; height: 25px; border: 2px solid var(--border, rgba(255,255,255,0.2)); padding: 2px; border-radius: 4px; position: relative; }
.battery-visual-wrapper::after { content: ''; position: absolute; right: -6px; top: 6px; width: 4px; height: 10px; background: var(--border, rgba(255,255,255,0.2)); border-radius: 0 2px 2px 0; }
.battery-level-fill { height: 100%; transition: 0.5s width ease; }

.health-bar-bg { width: 100%; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; }
.health-bar-fill { height: 100%; background: var(--text-success, #00ff41); box-shadow: 0 0 10px var(--text-success, #00ff41); border-radius: 3px; }

/* GRÁFICO SVG */
.chart-section {
  padding: 15px; background: rgba(0,0,0,0.3); border-radius: 8px; border: 1px solid var(--border, rgba(255,255,255,0.05));
  display: flex; flex-direction: column; gap: 10px;
}
.chart-header { display: flex; justify-content: space-between; align-items: center; }
.chart-points-count { font-size: 0.65rem; color: var(--text-dim, #777); }
.svg-container { width: 100%; height: 120px; }
.battery-chart { width: 100%; height: 100%; overflow: visible; }

/* TABELA */
.data-table { width: 100%; padding: 15px; background: rgba(0,0,0,0.2); border-radius: 8px; }
.data-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
.data-row:last-child { border-bottom: none; }
.label { font-size: 0.65rem; color: var(--text-dim, #888); }
.value { font-size: 0.75rem; color: var(--text-main, #fff); }

/* CHECKLIST */
.checklist { width: 100%; padding: 15px; display: flex; flex-direction: column; gap: 8px; background: rgba(0,0,0,0.2); border-radius: 8px; }
.check-item { font-size: 0.7rem; color: var(--text-dim, #777); display: flex; align-items: center; gap: 10px; opacity: 0.5; transition: 0.3s; }
.check-done { opacity: 1; color: var(--text-success, #00ff41); }

.mini-label { font-size: 0.65rem; color: var(--text-dim, #777); }
.text-warning { color: #f1c40f; }
.text-accent { color: var(--accent, #00ff41); }
.text-pass { color: var(--text-success, #00ff41); }
.text-fail { color: #e74c3c; }

.hint { font-size: 0.65rem; color: var(--text-dim, #888); opacity: 0.7; text-align: center; }
</style>