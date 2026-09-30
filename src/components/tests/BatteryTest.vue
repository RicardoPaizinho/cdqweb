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

            <!-- Saúde da Bateria (dado mais crítico do diagnóstico -> coração com
            preenchimento líquido, em vez do gauge circular de antes) -->
            <div class="health-block">
              <div class="health-heart-wrap">
                <svg viewBox="0 0 24 24" class="health-heart">
                  <defs>
                    <clipPath :id="`heartClip-${uid}`">
                      <path :d="HEART_PATH" />
                    </clipPath>
                  </defs>

                  <!-- coração "vazio" (contorno de fundo, sempre visível) -->
                  <path class="heart-bg" :d="HEART_PATH" />

                  <!-- líquido recortado no formato do coração -->
                  <g :clip-path="`url(#heartClip-${uid})`">
                    <rect class="heart-liquid" x="-4" :y="heartFillY" width="32" height="26" :style="{ fill: healthTier.color }" />

                    <g :style="{ transform: `translateY(${heartFillY}px)` }">
                      <g class="heart-wave-drift wave-back">
                        <path
                          class="heart-wave"
                          d="M -24,0 Q -22,-1.9 -20,0 T -12,0 T -4,0 T 4,0 T 12,0 T 20,0 T 28,0 T 36,0 T 44,0 T 52,0 V 24 H -24 Z"
                          :style="{ fill: healthTier.color }"
                          opacity="0.45"
                        />
                      </g>
                      <g class="heart-wave-drift wave-front">
                        <path
                          class="heart-wave"
                          d="M -24,0 Q -22,-1.3 -20,0 T -12,0 T -4,0 T 4,0 T 12,0 T 20,0 T 28,0 T 36,0 T 44,0 T 52,0 V 24 H -24 Z"
                          :style="{ fill: healthTier.color }"
                          opacity="0.85"
                        />
                      </g>
                    </g>
                  </g>

                  <!-- contorno por cima, nítido em qualquer nível de preenchimento -->
                  <path class="heart-outline" :style="{ stroke: healthTier.color }" :d="HEART_PATH" />
                </svg>
                <div class="heart-center-value tech-font">{{ fmt(batteryHealthPercent, 0) }}%</div>
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
            <span class="tech-font chart-main-title">HISTÓRICO E PROJEÇÃO DE CARGA</span>
            <span class="tech-font chart-subtext" v-if="isCharging && timeToFullMinutes != null">
              ESTIMATIVA DE CARGA COMPLETA: ~{{ timeToFullMinutes }} MIN
            </span>
            <span class="tech-font chart-subtext" v-else-if="isDischarging && timeToEmptyMinutes != null">
              ESTIMATIVA DE DESCARGA TOTAL: ~{{ timeToEmptyMinutes }} MIN
            </span>
          </div>
          <span class="tech-font chart-points-count">{{ chartData.datasets[0].data.length }} PONTOS</span>
        </div>

        <div class="chart-wrapper">
          <Line ref="chartRef" :data="chartData" :options="chartOptions" />
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, shallowReactive, nextTick } from 'vue';
import { globalState } from '@/store.js';
import { Line } from 'vue-chartjs';
import 'chartjs-adapter-date-fns';
import {
  Chart as ChartJS, Title, Tooltip, Legend, LineElement, LinearScale, PointElement, Filler, TimeScale
} from 'chart.js';

ChartJS.register(Title, Tooltip, Legend, LineElement, LinearScale, PointElement, Filler, TimeScale);

const emit = defineEmits(['test-completed', 'test-cancelled']);

const API_BASE_URL = 'http://localhost:5000/api';
const POLL_INTERVAL_MS = 1500;

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

let pollTimer = null;
const chartRef = ref(null);

const canPass = computed(() => {
  return batteryDetected.value && hasDetectedCharging.value && hasDetectedDischarging.value;
});

const getLiquidGradient = () => {
  const lvl = currentCapacityPercent.value;
  if (lvl > 60) return 'linear-gradient(90deg, #00b09b, #96c93d)';
  if (lvl > 20) return 'linear-gradient(90deg, #f8b500, #fceabb)';
  return 'linear-gradient(90deg, #ff416c, #ff4b2b)';
};

// ID único da instância — evita colisão de <clipPath> se por acaso houver mais
// de um BatteryTest montado ao mesmo tempo (não deveria, mas é barato evitar).
const uid = `h${Math.random().toString(36).slice(2, 9)}`;

// Ícone de coração (mesmo path do Material Symbols "favorite", viewBox 24x24) —
// usado tanto pro contorno quanto pro clipPath do líquido.
const HEART_PATH = 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';

// Mapeia 0-100% para a coordenada Y (viewBox 0 0 24 24) onde a superfície do
// líquido deve ficar — usa a extensão vertical real do coração (topo ~2,
// ponta inferior ~21.35), não o viewBox inteiro, senão sobra uma faixa vazia
// no fundo em 0% e uma sobra no topo em 100%.
const HEART_TOP_Y = 2;
const HEART_BOTTOM_Y = 21.35;
const heartFillY = computed(() => {
  const pct = Math.max(0, Math.min(100, batteryHealthPercent.value ?? 0));
  return HEART_BOTTOM_Y - (HEART_BOTTOM_Y - HEART_TOP_Y) * (pct / 100);
});

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

const timeToFullMinutes = computed(() => {
  if (!isCharging.value || !chargeRateW.value || chargeRateW.value <= 0) return null;
  if (!fullChargeCapacityWh.value || !currentCapacityWh.value) return null;

  const remainingWh = fullChargeCapacityWh.value - currentCapacityWh.value;
  if (remainingWh <= 0) return 0;

  const hours = remainingWh / chargeRateW.value;
  return Math.round(hours * 60);
});

// Simétrico ao de cima, pro sentido de descarga — antes só existia a
// estimativa de carga completa, e a projeção do gráfico era uma curva
// sintética (sem relação com a taxa real medida) esticada num período fixo de
// ±20 minutos. Agora as duas usam a taxa real (W) pra saber até quando
// projetar de verdade, tanto pra carregar quanto pra descarregar.
const timeToEmptyMinutes = computed(() => {
  if (!isDischarging.value || !dischargeRateW.value || dischargeRateW.value <= 0) return null;
  if (!currentCapacityWh.value) return null;

  const hours = currentCapacityWh.value / dischargeRateW.value;
  return Math.round(hours * 60);
});

// --- GRÁFICO (Chart.js, mesmo padrão do Monitor.vue) ---------------------
// O gráfico anterior era SVG e podia usar var(--accent) direto num atributo
// stroke/fill (CSS resolve isso no DOM). Canvas não funciona assim — precisa
// de uma cor já resolvida —, por isso lemos o valor real da variável uma vez
// aqui (mesmo truque do getThemeColor em MicTestGrava.vue).
function hexToRgb(hex) {
  const clean = (hex || '').replace('#', '').trim();
  const normalized = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const value = parseInt(normalized, 16);
  if (normalized.length !== 6 || Number.isNaN(value)) return { r: 0, g: 255, b: 65 };
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

const accentHex = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#00ff41';
const accentRgb = hexToRgb(accentHex);
const accentRgba = (alpha) => `rgba(${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}, ${alpha})`;

// dataset[0] = histórico real (timestamps de verdade, cresce a sessão toda,
// sem limite de pontos — antes era limitado a 30 e o eixo mostrava rótulos
// fixos de "-20m/+20m" que não tinham nenhuma relação com o tempo real
// coberto pelos pontos). dataset[1] = projeção, calculada a partir da taxa de
// carga/descarga REAL (chargeRateW/dischargeRateW), não mais uma curva
// sintética — vai de "agora" até o instante estimado de 100%/0%, do jeito que
// o BatteryMon mostra.
const chartData = shallowReactive({
  datasets: [
    {
      label: 'Histórico',
      data: [],
      borderColor: accentHex,
      borderWidth: 2.5,
      tension: 0.35,
      pointRadius: 0,
      fill: true,
      backgroundColor: (context) => {
        const ctx = context.chart.ctx;
        const g = ctx.createLinearGradient(0, 0, 0, 260);
        g.addColorStop(0, accentRgba(0.35));
        g.addColorStop(1, accentRgba(0));
        return g;
      }
    },
    {
      label: 'Projeção',
      data: [],
      borderColor: accentRgba(0.7),
      borderWidth: 2,
      borderDash: [6, 4],
      tension: 0,
      pointRadius: 0,
      fill: false
    }
  ]
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  resizeDelay: 50,
  scales: {
    y: {
      min: 0, max: 100,
      grid: { color: 'rgba(255, 255, 255, 0.05)' },
      ticks: { color: 'rgba(255,255,255,0.4)', font: { family: 'Consolas', size: 9 }, callback: (v) => `${v}%` }
    },
    x: {
      type: 'time',
      // Sem "unit" fixo: o Chart.js escolhe a granularidade sozinho conforme a
      // sessão cresce (segundos/minutos no início, podendo chegar a horas).
      time: { displayFormats: { second: 'HH:mm:ss', minute: 'HH:mm', hour: 'HH:mm' } },
      grid: { color: 'rgba(255, 255, 255, 0.03)' },
      ticks: { color: 'rgba(255,255,255,0.4)', font: { family: 'Consolas', size: 8 }, maxRotation: 0 }
    }
  },
  plugins: { legend: { display: false } }
};

// Recalcula a linha pontilhada de projeção a partir do estado atual — sempre
// parte do ponto "agora" (conectando visualmente com o fim do histórico) até
// o instante estimado de 100% (carregando) ou 0% (descarregando). Sem
// carregamento/descarga em andamento, ou sem taxa disponível, fica vazia.
function updateProjection(now, pct) {
  const projection = chartData.datasets[1];

  if (isCharging.value && timeToFullMinutes.value != null) {
    const target = new Date(now.getTime() + timeToFullMinutes.value * 60000);
    projection.data = [{ x: now, y: pct }, { x: target, y: 100 }];
  } else if (isDischarging.value && timeToEmptyMinutes.value != null) {
    const target = new Date(now.getTime() + timeToEmptyMinutes.value * 60000);
    projection.data = [{ x: now, y: pct }, { x: target, y: 0 }];
  } else {
    projection.data = [];
  }
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

    // Histórico sem limite de pontos — cresce a sessão toda (era limitado a 30
    // pontos/45s antes, "rolando" e perdendo o início do teste).
    const now = new Date();
    chartData.datasets[0].data.push({ x: now, y: pct });
    updateProjection(now, pct);
    chartData.datasets = [...chartData.datasets];

    // Força o Chart.js a remedir/redesenhar — o watcher automático do
    // vue-chartjs às vezes não repinta sozinho (mesmo ajuste do Monitor.vue).
    await nextTick();
    const chart = chartRef.value?.chart;
    if (chart) {
      chart.resize();
      chart.update('none');
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
.metrics-section { display: flex; flex-direction: column; gap: 2px; }
.metrics-row { display: flex; align-items: center; gap: -10px; }
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

/* SAÚDE DA BATERIA — coração com preenchimento líquido, ao lado da capacidade,
   com divisória entre os dois */
.health-block { display: flex; align-items: center; gap: -10px; flex: 1; min-width: 0; border-left: 1px solid rgba(255,255,255,0.08); padding-left: 5px; }
.health-heart-wrap { position: relative; width: 56px; height: 56px; flex-shrink: 0; }
.health-heart { width: 100%; height: 100%; overflow: visible; }

.heart-bg { fill: rgba(238, 34, 34, 0.06); }
.heart-outline { fill: none; stroke-width: 1.2; opacity: 0.9; vector-effect: non-scaling-stroke; }

.heart-liquid { transition: y 0.7s ease; }

/* Ondulação da superfície do líquido — dois recortes da mesma "fita" senoidal,
   sobrepostos e derivando em velocidades diferentes, pra dar profundidade em
   vez de uma linha reta simplesmente subindo (efeito "líquido" de verdade). */
.heart-wave-drift { animation: heartWaveDrift linear infinite; }
.wave-back { animation-duration: 4.5s; animation-direction: reverse; }
.wave-front { animation-duration: 2.6s; }

@keyframes heartWaveDrift {
  from { transform: translateX(0); }
  to { transform: translateX(-8px); }
}

.heart-center-value {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  font-size: 0.88rem; font-weight: 800; color: #fff; pointer-events: none;
  /* Contorno escuro simulado com sombras em cruz — mantém o texto legível tanto
     em cima do líquido vermelho (cheio) quanto do fundo cinza-esverdeado (vazio),
     igual à referência (número branco contornado, nunca "sumindo" no fundo). */
  text-shadow:
    -1px -1px 0 rgba(0,0,0,0.85), 1px -1px 0 rgba(0,0,0,0.85),
    -1px 1px 0 rgba(0,0,0,0.85), 1px 1px 0 rgba(0,0,0,0.85),
    0 0 4px rgba(0,0,0,0.5);
}

.health-info { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.health-tier-label { font-size: 0.85rem; }
.health-exact-value { font-size: 0.72rem; color: var(--text-dim, #080000); font-weight: normal; }

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

.chart-wrapper {
  position: relative; /* obrigatório para o Chart.js responsivo */
  flex: 1;
  min-height: 250px;
  width: 100%;
}

.mini-label { font-size: 0.62rem; color: var(--text-dim, #777); }
.text-warning { color: #f1c40f; }
.text-accent { color: var(--accent, #00ff41); }
</style>