<template>
  <div class="test-container">
    <!-- Header Superior -->
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

    <!-- Layout Dividido: Esquerda (Info/Controles) x Direita (Gráfico) -->
    <div class="main-split-layout">
      
      <!-- COLUNA DA ESQUERDA: INFORMAÇÕES E CHECKLIST -->
      <div class="info-sidebar">
        
        <p v-if="loading" class="loading-banner tech-font">CONECTANDO AO AGENTE LOCAL...</p>

        <p v-if="connectionError" class="connection-error tech-font">⚠ {{ connectionError }}</p>

        <!-- Checklist de Carga / Descarga (Movido para o Topo) -->
        <div class="checklist card-glass" :class="{ stale: !!connectionError }">
          <span class="mini-label tech-font">VALIDAÇÃO DE CICLO</span>

          <p v-if="notApplicable" class="no-battery-msg tech-font">
            ⚠ NENHUMA BATERIA DETECTADA NESTE EQUIPAMENTO — CICLO NÃO APLICÁVEL.
          </p>
          <template v-else>
            <div class="check-item" :class="{ 'check-done': hasDetectedCharging }">
              <span class="icon">{{ hasDetectedCharging ? '✔' : '○' }}</span>
              Detectar Carregamento (Fonte Conectada)
            </div>
            <div class="check-item" :class="{ 'check-done': hasDetectedDischarging }">
              <span class="icon">{{ hasDetectedDischarging ? '✔' : '○' }}</span>
              Detectar Descarregamento (Somente Bateria)
            </div>
            <p class="hint tech-font" v-if="!hasDetectedCharging || !hasDetectedDischarging">
              Conecte e desconecte a fonte para habilitar o PASS.
            </p>
          </template>
        </div>

        <!-- Status Principal + Bateria Visual -->
        <div class="status-bar card-glass" :class="{ stale: !!connectionError }">
          <div class="status-info">
            <span class="tech-font mini-label">STATUS:</span>
            <span class="tech-font status-text" :class="isCharging ? 'text-accent' : (isDischarging ? 'text-warning' : '')">
              {{ chargingStatus }}
            </span>
          </div>

          <!-- Bateria Estilizada Liquid -->
          <div class="fancy-battery-container">
            <div class="fancy-battery-body">
              <div class="battery-glass-shine"></div>
              <div
                class="battery-liquid"
                :style="{
                  width: currentCapacityPercent + '%',
                  background: getLiquidGradient()
                }"
              >
                <div class="battery-wave" :class="{ 'animating': isCharging }"></div>
              </div>
            </div>
            <div class="fancy-battery-cap"></div>
          </div>
        </div>

        <!-- Capacidade e Saúde lado a lado -->
        <div class="metrics-section card-glass" :class="{ stale: !!connectionError }">
          <div class="metrics-row">
            <div class="capacity-block">
              <span class="mini-label tech-font">CAPACIDADE ATUAL</span>
              <div class="metric-value tech-font">{{ fmt(currentCapacityPercent, 2) }}%</div>
            </div>

            <!-- Saúde da Bateria (dado mais crítico do diagnóstico -> gauge grande e colorido) -->
            <div class="health-block">
              <div class="health-ring-wrap">
                <svg viewBox="0 0 36 36" class="health-ring">
                  <path class="ring-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  <path
                    class="ring-fill"
                    :style="{ stroke: healthTier.color }"
                    :stroke-dasharray="`${batteryHealthPercent ?? 0}, 100`"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div class="health-ring-center">
                  <span class="tech-font health-ring-value" :style="{ color: healthTier.color }">{{ fmt(batteryHealthPercent, 0) }}%</span>
                </div>
              </div>
              <div class="health-info">
                <span class="mini-label tech-font">CONSERVAÇÃO</span>
                <span class="tech-font health-tier-label" :style="{ color: healthTier.color }">{{ healthTier.label }}</span>
                <span class="tech-font health-exact-value">{{ fmt(batteryHealthPercent, 2) }}%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Tabela Detalhada -->
        <div class="data-table card-glass" :class="{ stale: !!connectionError }">
          <div class="data-row">
            <span class="tech-font label">DISPOSITIVO:</span>
            <span class="tech-font value">{{ deviceName }}</span>
          </div>
          <div class="data-row">
            <span class="tech-font label">FABRICANTE:</span>
            <span class="tech-font value">{{ manufacturerName }}</span>
          </div>
          <div class="data-row">
            <span class="tech-font label">TECNOLOGIA:</span>
            <span class="tech-font value">{{ chemistryType }}</span>
          </div>
          <div class="data-row">
            <span class="tech-font label">SÉRIE:</span>
            <span class="tech-font value">{{ serialNumber }}</span>
          </div>
          <div class="data-row">
            <span class="tech-font label">CAPACIDADE ATUAL:</span>
            <span class="tech-font value">{{ fmt(currentCapacityWh) }} Wh</span>
          </div>
          <div class="data-row">
            <span class="tech-font label">CARGA COMPLETA:</span>
            <span class="tech-font value">{{ fmt(fullChargeCapacityWh) }} Wh</span>
          </div>
          <div class="data-row">
            <span class="tech-font label">PROJETADA (DESIGN):</span>
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

      </div>

      <!-- COLUNA DA DIREITA: GRÁFICO EXPANSIVO -->
      <div class="chart-section card-glass" :class="{ stale: !!connectionError }">
        <div class="chart-header">
          <div class="chart-title-group">
            <span class="tech-font chart-main-title">HISTÓRICO E PROJEÇÃO TEMPORAL</span>
            <span class="tech-font chart-subtext" v-if="isCharging && timeToFullMinutes">
              ESTIMATIVA DE CARGA COMPLETA: ~{{ timeToFullMinutes }} MIN
            </span>
          </div>
          <span class="tech-font chart-points-count">{{ historyData.length }} PONTOS</span>
        </div>

        <div class="svg-container">
          <svg viewBox="0 0 500 280" preserveAspectRatio="none" class="battery-chart">
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--accent, #00ff41)" stop-opacity="0.4" />
                <stop offset="100%" stop-color="var(--accent, #00ff41)" stop-opacity="0.0" />
              </linearGradient>
              <linearGradient id="projectedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--accent, #00ff41)" stop-opacity="0.15" />
                <stop offset="100%" stop-color="var(--accent, #00ff41)" stop-opacity="0.0" />
              </linearGradient>
            </defs>

            <!-- Grade Horizontal de Porcentagem (100% até 0%) -->
            <g class="y-grid">
              <!-- 100% -->
              <line x1="0" y1="20" x2="500" y2="20" stroke="rgba(255,255,255,0.1)" stroke-dasharray="4" />
              <text x="5" y="16" fill="rgba(255,255,255,0.4)" font-size="9" class="tech-font">100%</text>

              <!-- 75% -->
              <line x1="0" y1="80" x2="500" y2="80" stroke="rgba(255,255,255,0.05)" stroke-dasharray="4" />
              <text x="5" y="76" fill="rgba(255,255,255,0.3)" font-size="8" class="tech-font">75%</text>

              <!-- 50% -->
              <line x1="0" y1="140" x2="500" y2="140" stroke="rgba(255,255,255,0.08)" stroke-dasharray="4" />
              <text x="5" y="136" fill="rgba(255,255,255,0.3)" font-size="8" class="tech-font">50%</text>

              <!-- 25% -->
              <line x1="0" y1="200" x2="500" y2="200" stroke="rgba(255,255,255,0.05)" stroke-dasharray="4" />
              <text x="5" y="196" fill="rgba(255,255,255,0.3)" font-size="8" class="tech-font">25%</text>

              <!-- 0% -->
              <line x1="0" y1="260" x2="500" y2="260" stroke="rgba(255,255,255,0.1)" stroke-dasharray="4" />
              <text x="5" y="256" fill="rgba(255,255,255,0.4)" font-size="9" class="tech-font">0%</text>
            </g>

            <!-- Grade Vertical de Tempo (a cada 10 min) -->
            <g class="x-grid">
              <line x1="83.3" y1="0" x2="83.3" y2="260" stroke="rgba(255,255,255,0.06)" stroke-dasharray="2,4" />
              <text x="83.3" y="274" fill="rgba(255,255,255,0.3)" font-size="8" text-anchor="middle" class="tech-font">-20m</text>

              <line x1="166.6" y1="0" x2="166.6" y2="260" stroke="rgba(255,255,255,0.06)" stroke-dasharray="2,4" />
              <text x="166.6" y="274" fill="rgba(255,255,255,0.3)" font-size="8" text-anchor="middle" class="tech-font">-10m</text>

              <!-- Linha Central do Presente -->
              <line x1="250" y1="0" x2="250" y2="260" stroke="rgba(0, 255, 65, 0.4)" stroke-dasharray="3,3" stroke-width="1.5" />
              <text x="250" y="274" fill="rgba(0, 255, 65, 0.9)" font-size="9" text-anchor="middle" class="tech-font">AGORA</text>

              <line x1="333.3" y1="0" x2="333.3" y2="260" stroke="rgba(0,255,65,0.15)" stroke-dasharray="2,4" />
              <text x="333.3" y="274" fill="rgba(0, 255, 65, 0.4)" font-size="8" text-anchor="middle" class="tech-font">+10m</text>

              <line x1="416.6" y1="0" x2="416.6" y2="260" stroke="rgba(0,255,65,0.15)" stroke-dasharray="2,4" />
              <text x="416.6" y="274" fill="rgba(0, 255, 65, 0.4)" font-size="8" text-anchor="middle" class="tech-font">+20m</text>
            </g>

            <!-- Preenchimento e Linha do Histórico (curva suavizada, não segmentos retos) -->
            <path v-if="chartAreaPath" :d="chartAreaPath" fill="url(#chartGradient)" stroke="none" />
            <path v-if="chartLinePath" :d="chartLinePath" fill="none" stroke="var(--accent, #00ff41)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

            <!-- Preenchimento e Linha da Projeção -->
            <path v-if="projectionAreaPath" :d="projectionAreaPath" fill="url(#projectedGradient)" stroke="none" />
            <path v-if="projectionLinePath" :d="projectionLinePath" fill="none" stroke="var(--accent, #00ff41)" stroke-width="2" stroke-dasharray="4,4" stroke-opacity="0.8" />

            <!-- Indicador Ponto Pulsante do Presente -->
            <circle :cx="250" :cy="currentCenterY" r="5" fill="var(--accent, #00ff41)" />
            <circle :cx="250" :cy="currentCenterY" r="10" fill="none" stroke="var(--accent, #00ff41)" stroke-width="1.5" class="pulse-circle" />
          </svg>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { globalState } from '@/store.js';

const emit = defineEmits(['test-completed', 'test-cancelled']);

const API_BASE_URL = 'http://localhost:5000/api';
const POLL_INTERVAL_MS = 1500;
const MAX_HISTORIC_POINTS = 30;

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

const historyData = ref([]);
let pollTimer = null;

const canPass = computed(() => {
  return batteryDetected.value && hasDetectedCharging.value && hasDetectedDischarging.value;
});

const getLiquidGradient = () => {
  const lvl = currentCapacityPercent.value;
  if (lvl > 60) return 'linear-gradient(90deg, #00b09b, #96c93d)';
  if (lvl > 20) return 'linear-gradient(90deg, #f8b500, #fceabb)';
  return 'linear-gradient(90deg, #ff416c, #ff4b2b)';
};

// Classificação de saúde da bateria: cor + rótulo, para dar destaque ao dado mais importante do teste
const healthTier = computed(() => {
  const h = batteryHealthPercent.value;
  if (h == null) return { label: '—', color: 'var(--text-dim, #888)' };
  if (h >= 80) return { label: 'SAUDÁVEL', color: 'var(--text-success, #4ecdc4)' };
  if (h >= 50) return { label: 'MODERADA', color: '#f1c40f' };
  return { label: 'CRÍTICA', color: '#e74c3c' };
});

function fmt(value, digits = 2) {
  return typeof value === 'number' ? value.toFixed(digits) : '—';
}

// Situação em que não há bateria física para testar (ex: desktop) — o checklist nunca fecharia sozinho
const notApplicable = computed(() => !loading.value && !connectionError.value && !batteryDetected.value);

// Mapeia 0% -> Y=260 e 100% -> Y=20 no SVG ampliado
const currentCenterY = computed(() => {
  const pct = currentCapacityPercent.value || 0;
  return 260 - (pct / 100) * 240;
});

const timeToFullMinutes = computed(() => {
  if (!isCharging.value || !chargeRateW.value || chargeRateW.value <= 0) return null;
  if (!fullChargeCapacityWh.value || !currentCapacityWh.value) return null;

  const remainingWh = fullChargeCapacityWh.value - currentCapacityWh.value;
  if (remainingWh <= 0) return 0;

  const hours = remainingWh / chargeRateW.value;
  return Math.round(hours * 60);
});

// Converte uma lista de pontos {x,y} numa curva suave (Catmull-Rom -> Bézier),
// em vez de segmentos retos entre amostras — evita o efeito "serrote" com poucos pontos.
function smoothPath(points) {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;
  if (points.length === 2) return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`;

  let d = `M ${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return d;
}

// Histórico (X: 0 -> 250)
const chartHistoryPoints = computed(() => {
  if (historyData.value.length === 0) {
    const y = currentCenterY.value;
    return [{ x: 0, y }, { x: 250, y }];
  }
  const count = historyData.value.length;
  return historyData.value.map((val, idx) => {
    const x = count > 1 ? (idx / (count - 1)) * 250 : 250;
    const y = 260 - (val / 100) * 240;
    return { x, y };
  });
});

const chartLinePath = computed(() => smoothPath(chartHistoryPoints.value));

const chartAreaPath = computed(() => {
  const pts = chartHistoryPoints.value;
  if (pts.length === 0) return '';
  const first = pts[0];
  const last = pts[pts.length - 1];
  return `${smoothPath(pts)} L ${last.x},260 L ${first.x},260 Z`;
});

// Projeção (X: 250 -> 500) — mais passos = curva mais fiel à interpolação, não só mais reta
const projectionPointsArray = computed(() => {
  const currentPct = currentCapacityPercent.value || 0;

  let targetPct = currentPct;
  if (isCharging.value) {
    targetPct = 100;
  } else if (isDischarging.value) {
    targetPct = 0;
  }

  const points = [];
  const steps = 24;

  for (let i = 0; i <= steps; i++) {
    const progress = i / steps;
    const x = 250 + progress * 250;

    const factor = isCharging.value ? Math.sin((progress * Math.PI) / 2) : progress;
    const interpolatedPct = currentPct + (targetPct - currentPct) * factor;
    const y = 260 - (interpolatedPct / 100) * 240;

    points.push({ x, y });
  }

  return points;
});

const projectionLinePath = computed(() => smoothPath(projectionPointsArray.value));

const projectionAreaPath = computed(() => {
  const pts = projectionPointsArray.value;
  if (pts.length === 0) return '';
  const first = pts[0];
  const last = pts[pts.length - 1];
  return `${smoothPath(pts)} L ${last.x},260 L ${first.x},260 Z`;
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

const endTest = (res) => {
  // Guarda carga (%) e saúde/vida útil (%) da bateria pro relatório final
  // salvar no campo "testeBateria" do banco (Relatorios.vue lê isso via globalState).
  globalState.batteryTestInfo = {
    charge: currentCapacityPercent.value ?? null,
    health: batteryHealthPercent.value ?? null
  };
  emit('test-completed', res);
};
const goBack = () => emit('test-cancelled');
</script>

<style scoped>
.test-container { display: flex; flex-direction: column; gap: 15px; color: var(--text-main, #fff); padding: 10px; height: 100%; box-sizing: border-box; }
.tech-font { font-family: var(--font-tech, 'Consolas', monospace); letter-spacing: 1px; font-weight: bold; }

/* Header Superior */
.test-header {
  display: flex; justify-content: space-between; align-items: center;
  border-bottom: 1px solid var(--border, rgba(255,255,255,0.1)); padding-bottom: 10px;
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
.back-neon:hover { background: rgba(255, 255, 255, 0.1); border-color: rgba(255, 255, 255, 0.3); }
.pass-neon:not(:disabled):hover { border-color: var(--text-success, #00ff41); color: var(--text-success, #00ff41); background: rgba(0, 255, 65, 0.1); box-shadow: 0 0 15px rgba(0, 255, 65, 0.3); }
.fail-neon:hover { border-color: #ff4d4d; color: #ff4d4d; background: rgba(255, 77, 77, 0.1); box-shadow: 0 0 15px rgba(255, 77, 77, 0.3); }
.pass-neon:disabled { opacity: 0.2; cursor: not-allowed; filter: grayscale(1); }

/* LAYOUT DIVIDIDO (2 COLUNAS ESTILO BATTERYMON) */
.main-split-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 15px;
  flex-grow: 1;
  overflow: hidden;
}

/* COLUNA ESQUERDA (320px) */
.info-sidebar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  padding-right: 4px;
}

.card-glass {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 12px;
}

/* CHECKLIST (NO TOPO) */
.checklist { display: flex; flex-direction: column; gap: 6px; }
.check-item { font-size: 0.7rem; color: var(--text-dim, #777); display: flex; align-items: center; gap: 8px; opacity: 0.5; transition: 0.3s; }
.check-done { opacity: 1; color: var(--text-success, #00ff41); }
.no-battery-msg { font-size: 0.68rem; color: #f1c40f; margin: 4px 0 0 0; line-height: 1.4; }

/* Realce da instrução de como habilitar o PASS (era um texto apagado, fácil de ignorar) */
.hint {
  font-size: 0.68rem; color: #f1c40f; opacity: 1; margin: 4px 0 0 0;
  padding: 6px 10px; border-radius: 6px;
  background: rgba(241, 196, 15, 0.1); border: 1px solid rgba(241, 196, 15, 0.4);
}

/* STATUS BAR */
.status-bar { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.status-info { display: flex; align-items: center; gap: 8px; min-width: 0; }
.status-text { font-size: 0.75rem; }

/* Estado "dados congelados" quando a conexão com o agente local cai:
   os painéis continuam visíveis, mas claramente marcados como não-ao-vivo. */
.stale { opacity: 0.45; filter: grayscale(0.6); pointer-events: none; }

.loading-banner {
  font-size: 0.7rem; color: var(--text-dim, #888); text-align: center;
  padding: 6px; border: 1px dashed rgba(255,255,255,0.15); border-radius: 6px;
}

.connection-error {
  background: rgba(231, 76, 60, 0.15);
  border: 1px solid #e74c3c;
  color: #e74c3c;
  padding: 10px;
  border-radius: 6px;
  font-size: 0.72rem;
  font-weight: bold;
}

/* MÉTRICAS: CAPACIDADE E SAÚDE LADO A LADO */
.metrics-section { display: flex; flex-direction: column; gap: 12px; }
.metrics-row { display: flex; align-items: center; gap: 14px; }
.capacity-block { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.metric-value { font-size: 1.5rem; color: var(--accent, #00ff41); text-shadow: 0 0 10px rgba(0,255,65,0.3); }

/* BATERIA ESTILIZADA LIQUID */
.fancy-battery-container { display: flex; align-items: center; flex-shrink: 0; }
.fancy-battery-body {
  width: 75px; height: 30px;
  border: 2px solid rgba(255, 255, 255, 0.7);
  border-radius: 6px; position: relative; overflow: hidden;
  background: rgba(0, 0, 0, 0.4); padding: 2px;
}
.battery-glass-shine {
  position: absolute; top: 0; left: 0; width: 100%; height: 40%;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0) 100%);
  z-index: 3; pointer-events: none;
}
.battery-liquid { height: 100%; border-radius: 3px; transition: width 0.6s ease; position: relative; overflow: hidden; }
.battery-wave { position: absolute; top: -50%; right: -8px; width: 16px; height: 200%; background: rgba(255, 255, 255, 0.25); border-radius: 40%; }
.battery-wave.animating { animation: waveMotion 2s infinite linear; }
@keyframes waveMotion { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.fancy-battery-cap { width: 4px; height: 14px; background: rgba(255, 255, 255, 0.7); border-radius: 0 3px 3px 0; }

/* SAÚDE DA BATERIA — gauge circular, ao lado da capacidade, com divisória entre os dois */
.health-block { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; border-left: 1px solid rgba(255,255,255,0.08); padding-left: 14px; }
.health-ring-wrap { position: relative; width: 50px; height: 50px; flex-shrink: 0; }
.health-ring { width: 100%; height: 100%; }
.ring-bg { fill: none; stroke: rgba(255,255,255,0.08); stroke-width: 3; }
.ring-fill { fill: none; stroke-width: 3; stroke-linecap: round; transition: stroke-dasharray 0.6s ease; }
.health-ring-center { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.health-ring-value { font-size: 0.68rem; }
.health-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.health-tier-label { font-size: 0.85rem; }
.health-exact-value { font-size: 0.62rem; color: var(--text-dim, #888); font-weight: normal; }

/* TABELA */
.data-table { display: flex; flex-direction: column; }
.data-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.04); }
.data-row:last-child { border-bottom: none; }
.label { font-size: 0.62rem; color: var(--text-dim, #888); }
.value { font-size: 0.7rem; color: var(--text-main, #fff); }

/* COLUNA DIREITA: GRÁFICO GRANDE */
.chart-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
}
.chart-header { display: flex; justify-content: space-between; align-items: center; }
.chart-title-group { display: flex; flex-direction: column; gap: 2px; }
.chart-main-title { font-size: 0.75rem; color: var(--accent, #00ff41); }
.chart-subtext { font-size: 0.65rem; color: rgba(255,255,255,0.7); }
.chart-points-count { font-size: 0.65rem; color: var(--text-dim, #777); }

.svg-container {
  width: 100%;
  flex-grow: 1;
  min-height: 250px;
}
.battery-chart { width: 100%; height: 100%; }

/* Animação do Ponto Pulsante */
.pulse-circle { animation: pulseAnim 1.8s infinite ease-out; transform-origin: center; }
@keyframes pulseAnim { 0% { r: 5px; opacity: 1; } 100% { r: 16px; opacity: 0; } }

.mini-label { font-size: 0.62rem; color: var(--text-dim, #777); }
.text-warning { color: #f1c40f; }
.text-accent { color: var(--accent, #00ff41); }
</style>