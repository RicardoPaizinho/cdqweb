<template>
  <div class="monitor-container">
    <div class="top-cards">
      <div class="status-card">
        <div class="card-accent cpu-color"></div>
        <div class="info">
          <div class="card-header-row">
            <label>{{ globalState.t('hardware.processador') }}</label>
            <div class="stat-min-max">
              <span>Min: {{ cpuMin }}°</span>
              <span>Max: {{ cpuMax }}°</span>
            </div>
          </div>
          <div class="value-row">
            <span class="value">{{ cpuTemp }}°C</span>
          </div>
        </div>
      </div>

      <div class="status-card">
        <div class="card-accent gpu-color"></div>
        <div class="info">
          <div class="card-header-row">
            <label>{{ globalState.t('hardware.gpu') }}</label>
            <div class="stat-min-max">
              <span>Min: {{ gpuMin }}°</span>
              <span>Max: {{ gpuMax }}°</span>
            </div>
          </div>
          <div class="value-row">
            <span class="value">{{ gpuTemp }}°C</span>
          </div>
        </div>
      </div>

      <div class="status-card">
        <div class="card-accent ssd-color"></div>
        <div class="info">
          <label>{{ globalState.t('hardware.armazenamento') }} (Saúde: {{ storageLife }}%)</label>
          <div class="value">{{ storageTemp }}°C</div>
        </div>
      </div>

      <div class="status-card battery-card">
        <div class="battery-visual">
          <div class="battery-body">
            <div class="battery-liquid" :style="{ height: batteryLevel + '%' }">
              <div class="liquid-wave-wrapper">
                <div class="liquid-wave wave-one"></div>
                <div class="liquid-wave wave-two"></div>
              </div>
            </div>
          </div>
          <div class="battery-tip"></div>
        </div>
        <div class="info">
          <label>{{ globalState.t('hardware.battery') }}</label>
          <div class="value">{{ batteryLevel }}%</div>
          <span class="health-label">Saúde: {{ batteryHealth }}%</span>
        </div>
      </div>
    </div>

    <div class="chart-section neon-border">
      <header class="chart-header">
        <h3 class="tech-font">{{ globalState.t('titles.monitor') }} - HISTÓRICO DE SENSORES</h3>
        <div class="chart-legend">
          <span class="legend-item"><i class="dot cpu-bg"></i> CPU</span>
          <span class="legend-item"><i class="dot gpu-bg"></i> GPU</span>
        </div>
      </header>

      <div class="chart-wrapper">
        <Line :data="chartData" :options="chartOptions" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, shallowReactive } from 'vue';
import { globalState } from '@/store.js';
import { Line } from 'vue-chartjs';
import 'chartjs-adapter-date-fns';
import {
  Chart as ChartJS, Title, Tooltip, Legend, LineElement, LinearScale, PointElement, Filler, TimeScale
} from 'chart.js';

ChartJS.register(Title, Tooltip, Legend, LineElement, LinearScale, PointElement, Filler, TimeScale);

// Estados Reativos
const cpuTemp = ref(0), cpuMin = ref(100), cpuMax = ref(0);
const gpuTemp = ref(0), gpuMin = ref(100), gpuMax = ref(0);
const storageTemp = ref(0), storageLife = ref(0);
const batteryLevel = ref(0), batteryHealth = ref(0);

// Função para criar gradiente dinâmico
const createGradient = (ctx, color1, color2) => {
  const gradient = ctx.createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, color1);
  gradient.addColorStop(1, color2);
  return gradient;
};

const chartData = shallowReactive({
  datasets: [
    {
      label: 'CPU',
      data: [],
      borderColor: '#ff4b2b',
      borderWidth: 3,
      tension: 0.4,
      pointRadius: 0,
      fill: true,
      backgroundColor: (context) => {
        const { ctx, chartArea } = context.chart;
        if (!chartArea) return;
        return createGradient(ctx, 'rgba(255, 75, 43, 0.2)', 'rgba(255, 75, 43, 0)');
      },
    },
    {
      label: 'GPU',
      data: [],
      borderColor: '#00d2ff',
      borderWidth: 3,
      tension: 0.4,
      pointRadius: 0,
      fill: true,
      backgroundColor: (context) => {
        const { ctx, chartArea } = context.chart;
        if (!chartArea) return;
        return createGradient(ctx, 'rgba(0, 210, 255, 0.2)', 'rgba(0, 210, 255, 0)');
      },
    }
  ]
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: true,
  animation: { duration: 800 }, // '0' para performance em tempo real, ou '800' para suavidade
  scales: {
    y: { 
      min: 0, max: 100,
      grid: { color: 'rgba(255, 255, 255, 0.05)', drawBorder: false },
      ticks: { color: '#666', font: { size: 10, family: 'Orbitron' } }
    },
    x: {
      type: 'time',
      time: {
        unit: 'minute',
        stepSize: 5,
        displayFormats: { minute: 'HH:mm' }
      },
      grid: { display: false },
      ticks: { color: '#666', font: { size: 10 } }
    }
  },
  plugins: { legend: { display: false } }
};

const updateUI = (data) => {
  const r = data.realtime; 
  if (!r) return;

  const now = new Date();

  cpuTemp.value = Math.round(r.cpuTemp);
  gpuTemp.value = Math.round(r.gpuTemp);
  storageTemp.value = Math.round(r.storageTemp);
  storageLife.value = Math.round(r.storageLife);
  batteryLevel.value = Math.round(r.batteryLevel);
  batteryHealth.value = Math.round(r.batteryHealth);

  // Lógica de Min/Max
  if (cpuTemp.value > 0) {
    cpuMin.value = Math.min(cpuMin.value === 0 ? 100 : cpuMin.value, cpuTemp.value);
    cpuMax.value = Math.max(cpuMax.value, cpuTemp.value);
  }
  if (gpuTemp.value > 0) {
    gpuMin.value = Math.min(gpuMin.value === 0 ? 100 : gpuMin.value, gpuTemp.value);
    gpuMax.value = Math.max(gpuMax.value, gpuTemp.value);
  }

  // Push para o gráfico (Time-series)
  chartData.datasets[0].data.push({ x: now, y: cpuTemp.value });
  chartData.datasets[1].data.push({ x: now, y: gpuTemp.value });

  // Mantém os últimos 100 pontos para histórico
  if (chartData.datasets[0].data.length > 100) {
    chartData.datasets[0].data.shift();
    chartData.datasets[1].data.shift();
  }
  
  chartData.datasets = [...chartData.datasets];
};

const handleMessage = (event) => {
  try {
    const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
    if (data.type === "performanceData") updateUI(data);
  } catch (e) { console.error("Erro no processamento de dados performance", e); }
};

onMounted(() => {
  if (window.chrome?.webview) {
    window.chrome.webview.addEventListener('message', handleMessage);
  }
});
</script>

<style scoped>
.monitor-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
  height: 100%;
  padding: 10px;
}

.top-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.status-card {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 15px;
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
  overflow: hidden;
}

.card-accent { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; }
.cpu-color { background: #ff4b2b; box-shadow: 0 0 10px #ff4b2b; }
.gpu-color { background: #00d2ff; box-shadow: 0 0 10px #00d2ff; }
.ssd-color { background: #ffca28; }

.card-header-row { display: flex; justify-content: space-between; align-items: flex-start; width: 100%; }
.stat-min-max { font-size: 0.65rem; color: #888; display: flex; flex-direction: column; text-align: right; }

.info label { font-size: 0.7rem; color: #aaa; text-transform: uppercase; letter-spacing: 1px; }
.info .value { font-size: 1.8rem; font-weight: bold; color: #fff; font-family: 'Orbitron', sans-serif; }

/* BATERIA VISUAL */
.battery-visual { position: relative; width: 28px; height: 45px; }
.battery-body { 
  width: 100%; height: 100%; border: 2px solid rgba(255,255,255,0.2); 
  border-radius: 4px; overflow: hidden; position: relative;
}
.battery-liquid {
  position: absolute; bottom: 0; width: 100%;
  background: linear-gradient(to top, #00ff88, #00d2ff);
  transition: height 0.5s ease;
}
.battery-tip { 
  position: absolute; top: -4px; left: 50%; transform: translateX(-50%); 
  width: 10px; height: 4px; background: rgba(255,255,255,0.3); border-radius: 2px;
}

/* GRÁFICO */
.chart-section { 
  background: rgba(0, 0, 0, 0.2); 
  border: 1px solid rgba(255,255,255,0.05); 
  border-radius: 12px; 
  padding: 20px; 
  flex-grow: 1; 
}
.neon-border { box-shadow: inset 0 0 20px rgba(0, 210, 255, 0.02); }
.chart-header { display: flex; justify-content: space-between; margin-bottom: 15px; }
.tech-font { color: var(--accent, #00d2ff); font-size: 0.8rem; letter-spacing: 1px; }
.dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 5px; }
.cpu-bg { background: #ff4b2b; }
.gpu-bg { background: #00d2ff; }

.chart-wrapper { height: 260px; width: 100%; filter: drop-shadow(0 0 5px rgba(0,0,0,0.5)); }

.health-label { font-size: 0.65rem; color: #666; margin-top: 4px; display: block; }
</style>