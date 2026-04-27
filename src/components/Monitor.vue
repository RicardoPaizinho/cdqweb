<template>
  <div class="monitor-container">
    <div class="top-cards">
      <div class="status-card neon-card-cpu">
        <div class="card-accent cpu-color"></div>
        <div class="info">
          <div class="card-header-row">
            <label>{{ globalState.t('hardware.processador') }}</label>
            <div class="stat-min-max">
              <span>MIN: {{ cpuMin }}°</span>
              <span>MAX: {{ cpuMax }}°</span>
            </div>
          </div>
          <div class="value-row">
            <span class="value">{{ cpuTemp }}°C</span>
          </div>
        </div>
      </div>

      <div class="status-card neon-card-gpu">
        <div class="card-accent gpu-color"></div>
        <div class="info">
          <div class="card-header-row">
            <label>{{ globalState.t('hardware.gpu') }}</label>
            <div class="stat-min-max">
              <span>MIN: {{ gpuMin }}°</span>
              <span>MAX: {{ gpuMax }}°</span>
            </div>
          </div>
          <div class="value-row">
            <span class="value">{{ gpuTemp }}°C</span>
          </div>
        </div>
      </div>

      <div class="status-card neon-card-ssd">
        <div class="card-accent ssd-color"></div>
        <div class="info">
          <label>{{ globalState.t('hardware.armazenamento') }}</label>
          <div class="value">{{ storageTemp }}°C</div>
          <span class="health-label neon-text-ssd">VIDA ÚTIL: {{ storageLife }}%</span>
        </div>
      </div>

      <div class="status-card battery-card neon-card-bat">
        <div class="battery-visual">
          <div class="battery-body">
            <div class="battery-liquid" :style="{ height: batteryLevel + '%', background: getBatteryColor() }">
              <div class="liquid-wave-wrapper">
                <div class="liquid-wave wave-one"></div>
              </div>
            </div>
          </div>
          <div class="battery-tip"></div>
        </div>
        <div class="info">
          <label>{{ globalState.t('hardware.battery') }}</label>
          <div class="value">{{ batteryLevel }}%</div>
          <span class="health-label neon-text-bat">SAÚDE: {{ batteryHealth }}%</span>
        </div>
      </div>
    </div>

    <div class="chart-section neon-border-main">
      <header class="chart-header">
        <h3 class="tech-font">{{ globalState.t('titles.monitor') }} - REALTIME TELEMETRY</h3>
        <div class="chart-legend">
          <span class="legend-item"><i class="dot cpu-bg"></i> CPU</span>
          <span class="legend-item"><i class="dot gpu-bg"></i> GPU</span>
          <span class="legend-item"><i class="dot ssd-bg"></i> DISK</span>
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

// Estados
const cpuTemp = ref(0), cpuMin = ref(100), cpuMax = ref(0);
const gpuTemp = ref(0), gpuMin = ref(100), gpuMax = ref(0);
const storageTemp = ref(0), storageLife = ref('---');
const batteryLevel = ref(0), batteryHealth = ref('---');

const getBatteryColor = () => {
  if (batteryLevel.value > 20) return 'linear-gradient(to top, #00ff88, #00d2ff)';
  return 'linear-gradient(to top, #ff4b2b, #ff416c)';
};

// Configuração do Gráfico Neon
const chartData = shallowReactive({
  datasets: [
    {
      label: 'CPU',
      data: [],
      borderColor: '#ff4b2b',
      shadowColor: '#ff4b2b',
      borderWidth: 2,
      tension: 0.4,
      pointRadius: 0,
      fill: true,
      backgroundColor: (context) => {
        const ctx = context.chart.ctx;
        const g = ctx.createLinearGradient(0, 0, 0, 300);
        g.addColorStop(0, 'rgba(255, 75, 43, 0.15)');
        g.addColorStop(1, 'rgba(255, 75, 43, 0)');
        return g;
      }
    },
    {
      label: 'GPU',
      data: [],
      borderColor: '#00d2ff',
      shadowColor: '#00d2ff',
      borderWidth: 2,
      tension: 0.4,
      pointRadius: 0,
      fill: true,
      backgroundColor: (context) => {
        const ctx = context.chart.ctx;
        const g = ctx.createLinearGradient(0, 0, 0, 300);
        g.addColorStop(0, 'rgba(0, 210, 255, 0.15)');
        g.addColorStop(1, 'rgba(0, 210, 255, 0)');
        return g;
      }
    },
    {
      label: 'DISK',
      data: [],
      borderColor: '#ffca28',
      shadowColor: '#ffca28',
      borderWidth: 2,
      tension: 0.4,
      pointRadius: 0,
      fill: true,
      backgroundColor: (context) => {
        const ctx = context.chart.ctx;
        const g = ctx.createLinearGradient(0, 0, 0, 300);
        g.addColorStop(0, 'rgba(255, 202, 40, 0.1)');
        g.addColorStop(1, 'rgba(255, 202, 40, 0)');
        return g;
      }
    }
  ]
});

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  resizeDelay: 50,
  elements: {
    line: {
      borderCapStyle: 'round',
      shadowBlur: 10 // Efeito Neon nas linhas
    }
  },
  scales: {
    y: { 
      min: 20, max: 100, // Focado em temperatura de trabalho
      grid: { color: 'rgba(255, 255, 255, 0.03)' },
      ticks: { color: '#444', font: { family: 'Orbitron', size: 9 } }
    },
    x: {
      type: 'time',
      time: { unit: 'second', displayFormats: { second: 'HH:mm:ss' } },
      grid: { display: false },
      ticks: { display: false } // Limpa o visual
    }
  },
  plugins: { legend: { display: false } }
};

const handleMessage = (event) => {
  const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
  
  // 1. DADOS ESTÁTICOS (Enviados uma única vez)
  if (data.type === "pcInfo") {
    storageLife.value = data.storageLife;
    batteryHealth.value = data.batteryHealth;
  }

  // 2. DADOS DINÂMICOS
  if (data.type === "performanceData") {
    const r = data.realtime;
    const now = new Date();

    cpuTemp.value = Math.round(r.cpuTemp);
    gpuTemp.value = Math.round(r.gpuTemp);
    storageTemp.value = Math.round(r.storageTemp);
    batteryLevel.value = Math.round(r.batteryLevel);

    // Min/Max
    if (cpuTemp.value > 0) {
      cpuMin.value = Math.min(cpuMin.value === 0 ? 100 : cpuMin.value, cpuTemp.value);
      cpuMax.value = Math.max(cpuMax.value, cpuTemp.value);
    }

    // Atualiza Gráfico
    const updates = [cpuTemp.value, gpuTemp.value, storageTemp.value];
    chartData.datasets.forEach((dataset, i) => {
      dataset.data.push({ x: now, y: updates[i] });
      if (dataset.data.length > 40) dataset.data.shift();
    });
    
    chartData.datasets = [...chartData.datasets];
  }
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
  height: 100vh;
  padding: 15px;
 /* background: radial-gradient(circle at top right, #0a0b1004, #00000009); */
}

.top-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
}

.status-card {
  background: rgba(20, 20, 25, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 18px;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

/* Efeitos Neon Individuais */
.neon-card-cpu:hover { border-color: #ff4b2b; box-shadow: 0 0 20px rgba(255, 75, 43, 0.2); }
.neon-card-gpu:hover { border-color: #00d2ff; box-shadow: 0 0 20px rgba(0, 210, 255, 0.2); }
.neon-card-ssd:hover { border-color: #ffca28; box-shadow: 0 0 20px rgba(255, 202, 40, 0.2); }
.neon-card-bat:hover { border-color: #00ff88; box-shadow: 0 0 20px rgba(0, 255, 136, 0.2); }

.info label {
  font-size: 0.6rem;
  color: #666;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 2px;
}

.info .value {
  font-size: 2.2rem;
  color: #fff;
  font-family: 'Orbitron', sans-serif;
  text-shadow: 0 0 10px rgba(255,255,255,0.2);
}

.health-label {
  font-size: 0.7rem;
  font-weight: bold;
  margin-top: 8px;
  padding: 2px 8px;
  background: rgba(255,255,255,0.03);
  border-radius: 4px;
}

.neon-text-ssd { color: #ffca28; text-shadow: 0 0 5px rgba(255, 202, 40, 0.5); }
.neon-text-bat { color: #00ff88; text-shadow: 0 0 5px rgba(0, 255, 136, 0.5); }

/* Seção do Gráfico */


.neon-border-main {
  box-shadow: 0 10px 30px rgba(0,0,0,0.5), inset 0 0 2px rgba(255,255,255,0.1);
}

.legend-item {
  font-size: 0.7rem;
  color: #888;
  margin-left: 15px;
  font-family: 'Orbitron';
}

.ssd-bg { background: #ffca28; box-shadow: 0 0 10px #ffca28; }
.cpu-bg { background: #ff4b2b; box-shadow: 0 0 10px #ff4b2b; }
.gpu-bg { background: #00d2ff; box-shadow: 0 0 10px #00d2ff; }

.chart-wrapper {
  position: relative; /* Obrigatório para o Chart.js responsivo */
  flex: 1;            /* Faz o gráfico ocupar o espaço restante */
  min-height: 0;      /* Importante: impede que o flex-item cresça além do container */
  height: 100%;       /* Ocupa a altura do pai (.chart-section) */
  width: 100%;
}

.chart-section {
  display: flex;
  flex-direction: column;
  background: #0f101628;
  border-radius: 20px;
  padding: 20px;
    border: 1px solid var(--accent);
  
  
  /* Defina uma altura fixa ou máxima para a seção do gráfico */
  height: 330px; 
  overflow: hidden; /* Garante que nada saia dos limites */
}
</style>