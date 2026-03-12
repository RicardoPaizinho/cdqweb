<template>
  <div class="monitor-container">
    <div class="top-cards">
      <div class="status-card">
        <div class="card-accent cpu-color"></div>
        <div class="info">
          <div class="card-header">
            <label>CPU</label>
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
          <div class="card-header">
            <label>GPU</label>
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
          <label>SSD (Saúde: {{ storageLife }}%)</label>
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
          <label>Bateria</label>
          <div class="value">{{ batteryLevel }}%</div>
          <span class="health-label">Saúde: {{ batteryHealth }}%</span>
        </div>
      </div>
    </div>

    <div class="chart-section neon-border">
      <header class="chart-header">
        <h3 class="tech-font">HISTÓRICO DE SENSORES</h3>
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
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS, Title, Tooltip, Legend, LineElement, LinearScale, CategoryScale, PointElement, Filler
} from 'chart.js';

ChartJS.register(Title, Tooltip, Legend, LineElement, LinearScale, CategoryScale, PointElement, Filler);

// Estados Reativos (Usando seus nomes originais do C#)
const cpuTemp = ref(0), cpuMin = ref(100), cpuMax = ref(0);
const gpuTemp = ref(0), gpuMin = ref(100), gpuMax = ref(0);
const storageTemp = ref(0), storageLife = ref(0);
const batteryLevel = ref(30), batteryHealth = ref(0);

// Configuração do Gráfico
const chartData = shallowReactive({
  labels: Array(50).fill(""),
  datasets: [
    {
      label: 'CPU',
      borderColor: '#ff4b2b',
      backgroundColor: 'rgba(255, 75, 43, 0.1)',
      data: Array(50).fill(0),
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      borderWidth: 2
    },
    {
      label: 'GPU',
      borderColor: '#00d2ff',
      backgroundColor: 'rgba(0, 210, 255, 0.1)',
      data: Array(50).fill(0),
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      borderWidth: 2
    }
  ]
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  scales: {
    y: { 
      min: 0, max: 100,
      grid: { color: 'rgba(128, 128, 128, 0.08)' },
      ticks: { color: '#9fa0a1', font: { size: 10 } }
    },
    x: { display: false }
  },
  plugins: { legend: { display: false } }
};

const updateUI = (data) => {
  const r = data.realtime; 
  if (!r) return;

  cpuTemp.value = Math.round(r.cpuTemp);
  gpuTemp.value = Math.round(r.gpuTemp);
  storageTemp.value = Math.round(r.storageTemp);
  storageLife.value = Math.round(r.storageLife);
  batteryLevel.value = Math.round(r.batteryLevel);
  batteryHealth.value = Math.round(r.batteryHealth);

  if (cpuTemp.value > 0) {
    cpuMin.value = Math.min(cpuMin.value === 0 ? 100 : cpuMin.value, cpuTemp.value);
    cpuMax.value = Math.max(cpuMax.value, cpuTemp.value);
  }
  if (gpuTemp.value > 0) {
    gpuMin.value = Math.min(gpuMin.value === 0 ? 100 : gpuMin.value, gpuTemp.value);
    gpuMax.value = Math.max(gpuMax.value, gpuTemp.value);
  }

  chartData.datasets[0].data.push(cpuTemp.value);
  chartData.datasets[1].data.push(gpuTemp.value);

  if (chartData.datasets[0].data.length > 50) {
    chartData.datasets[0].data.shift();
    chartData.datasets[1].data.shift();
  }
  
  chartData.datasets = [...chartData.datasets];
};

const handleMessage = (event) => {
  try {
    const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
    if (data.type === "performanceData") updateUI(data);
  } catch (e) {}
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
}

.top-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.status-card {
  background: var(--bg-panel, #1a1a1a);
  border: 1px solid var(--border, #333);
  border-radius: 8px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  position: relative;
  overflow: hidden;
}

.card-accent { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; }
.cpu-color { background: #ff4b2b; }
.gpu-color { background: #00d2ff; }
.ssd-color { background: #ffca28; }

.card-header { display: flex; justify-content: space-between; width: 100%; }
.stat-min-max { font-size: 0.6rem; color: #888; text-align: right; display: flex; flex-direction: column; }

.info label { display: block; font-size: 0.65rem; color: #9fa0a1; text-transform: uppercase; }
.info .value { font-size: 2.0rem; font-weight: bold; color: #fff; font-family: 'Orbitron', sans-serif; }

/* --- CORREÇÃO DO BATERIA LÍQUIDA --- */
.battery-tip { 
  position: absolute; top: -4px; left: 50%; transform: translateX(-50%); 
  width: 10px; height: 4px; background: rgba(255,255,255,0.2); border-radius: 2px;
}
/* --- CORREÇÃO DEFINITIVA DO EFEITO DE ONDA --- */
.battery-visual { 
  position: relative; 
  width: 30px; 
  height: 45px; 
  margin-right: 5px; 
}

.battery-body { 
  width: 100%; 
  height: 100%; 
  border: 2px solid rgba(255,255,255,0.2); 
  border-radius: 4px; 
  position: relative; 
  overflow: hidden; /* Corta o excesso das ondas gigantes */
  background: rgba(255,255,255,0.03);
}

.battery-liquid {
  position: absolute; 
  bottom: 0; 
  left: 0; 
  width: 100%;
  background: linear-gradient(to top, #00ff88, #00d2ff);
  transition: height 0.6s ease-out; 
  /* Não colocamos overflow hidden aqui para a onda aparecer acima dele */
}

.liquid-wave {
  position: absolute;
  width: 120px;   /* Largura fixa bem maior que a bateria (30px) */
  height: 130px;  /* Altura fixa para manter o círculo perfeito */
  background: rgba(26, 26, 26, 1); /* COR IGUAL AO FUNDO DO CARD PARA "COBRIR" O LÍQUIDO */
  border-radius: 45%; 
  
  /* Posicionamento: O topo do círculo precisa estar no "nível 0" do líquido */
  top: -122px;    /* Ajuste fino: move o círculo para cima do líquido */
  left: -35px;    /* Centraliza o círculo em relação aos 30px da bateria */
  
  transform-origin: center center;
  z-index: 10;
}

/* Primeira Onda */
.wave-one {
  animation: waveRotate 6s infinite linear;
  opacity: 0.9;
}

/* Segunda Onda (Levemente diferente para dar profundidade) */
.wave-two {
  animation: waveRotate 10s infinite linear;
  opacity: 0.6;
  border-radius: 40%;
  background: rgba(40, 40, 40, 0.8); /* Um pouco mais clara */
}

@keyframes waveRotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* GRÁFICO */
.chart-section { background: #1a1a1a; border: 1px solid #333; border-radius: 8px; padding: 15px; flex-grow: 1; }
.neon-border { box-shadow: inset 0 0 15px rgba(0, 210, 255, 0.05); }
.chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.tech-font { color: #00d2ff; font-size: 0.8rem; }
.chart-legend { display: flex; gap: 10px; font-size: 0.7rem; color: #888; }
.dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; margin-right: 4px; }
.cpu-bg { background: #ff4b2b; }
.gpu-bg { background: #00d2ff; }
.chart-wrapper { height: 200px; width: 100%; }

.health-label { font-size: 0.6rem; color: #666; display: block; }
</style>