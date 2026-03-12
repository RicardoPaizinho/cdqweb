<template>
  <div class="test-container">
    <header class="test-header">
      <div class="title-group">
        <h4 class="tech-font">DIAGNÓSTICO DE ENERGIA</h4>
        <button class="btn-glass back-neon tech-font" @click="goBack">VOLTAR</button>
      </div>
      <div class="device-mini-info tech-font">
        STATUS: <span :class="isCharging ? 'text-accent' : 'text-warning'">{{ isCharging ? 'CHARGING' : 'DISCHARGING' }}</span>
      </div>
    </header>

    <div class="main-layout">
      <div class="test-content glass-panel">
        
        <div class="metrics-grid">
          <div class="metric-card card-glass">
            <span class="mini-label tech-font">CAPACIDADE ATUAL</span>
            <div class="metric-value tech-font">{{ batteryLevel }}%</div>
            <div class="battery-visual-wrapper">
              <div class="battery-body">
                <div class="battery-level-fill" :style="{ width: batteryLevel + '%', backgroundColor: getLevelColor() }"></div>
              </div>
            </div>
          </div>

          <div class="metric-card card-glass">
            <span class="mini-label tech-font">VIDA ÚTIL (HEALTH)</span>
            <div class="metric-value tech-font" :class="healthStatus < 70 ? 'text-fail' : 'text-pass'">
              {{ healthStatus }}%
            </div>
            <div class="health-bar-bg">
              <div class="health-bar-fill" :style="{ width: healthStatus + '%' }"></div>
            </div>
          </div>
        </div>

        <div class="data-table card-glass">
          <div class="data-row">
            <span class="tech-font label">MODELO/ID:</span>
            <span class="tech-font value">{{ batteryModel }}</span>
          </div>
          <div class="data-row">
            <span class="tech-font label">CAPACIDADE DESIGN:</span>
            <span class="tech-font value">{{ designCapacity }} mWh</span>
          </div>
          <div class="data-row">
            <span class="tech-font label">VOLTAGEM ATUAL:</span>
            <span class="tech-font value">{{ voltage }} V</span>
          </div>
          <div class="data-row">
            <span class="tech-font label">TAXA DE CARGA:</span>
            <span class="tech-font value" :class="chargeRate > 0 ? 'text-accent' : 'text-warning'">
              {{ chargeRate }} W
            </span>
          </div>
        </div>

        <div class="checklist card-glass">
          <div class="check-item" :class="{ 'check-done': hasDetectedCharging }">
            <span class="icon">{{ hasDetectedCharging ? '✔' : '○' }}</span>
            Detectar Carregamento (AC Conectado)
          </div>
          <div class="check-item" :class="{ 'check-done': hasDetectedDischarging }">
            <span class="icon">{{ hasDetectedDischarging ? '✔' : '○' }}</span>
            Detectar Descarregamento (AC Desconectado)
          </div>
          <div class="check-item" :class="{ 'check-done': healthStatus >= 70 }">
            <span class="icon">{{ healthStatus >= 70 ? '✔' : '○' }}</span>
            Vida Útil > 70%
          </div>
        </div>

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

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';

const emit = defineEmits(['test-completed', 'test-cancelled']);

// Estados da Bateria
const batteryLevel = ref(0);
const isCharging = ref(false);
const batteryModel = ref("Bateria de Lítio Padrão");
const designCapacity = ref(45000); // Exemplo em mWh
const healthStatus = ref(85); // Exemplo (No navegador web puro, o Health é limitado, geralmente simulado em apps PWA/Electron)
const voltage = ref(12.4);
const chargeRate = ref(0);

// Requisitos de Teste
const hasDetectedCharging = ref(false);
const hasDetectedDischarging = ref(false);

let batteryManager = null;

const canPass = computed(() => {
  return hasDetectedCharging.value && 
         hasDetectedDischarging.value && 
         healthStatus.value >= 70;
});

const getLevelColor = () => {
  if (batteryLevel.value > 60) return '#2ecc71';
  if (batteryLevel.value > 20) return '#f1c40f';
  return '#e74c3c';
};

const updateBatteryInfo = (batt) => {
  batteryLevel.value = Math.round(batt.level * 100);
  isCharging.value = batt.charging;

  if (isCharging.value) hasDetectedCharging.value = true;
  else hasDetectedDischarging.value = true;

  // Em navegadores, chargeTime e dischargeTime ajudam a calcular a taxa
  chargeRate.value = isCharging.value ? 15.5 : -12.2; // Simulação de taxa baseada em contexto
};

onMounted(async () => {
  if ('getBattery' in navigator) {
    batteryManager = await navigator.getBattery();
    updateBatteryInfo(batteryManager);

    batteryManager.addEventListener('chargingchange', () => updateBatteryInfo(batteryManager));
    batteryManager.addEventListener('levelchange', () => updateBatteryInfo(batteryManager));
  } else {
    alert("API de Bateria não suportada neste navegador.");
  }
});

const endTest = (res) => emit('test-completed', res);
const goBack = () => emit('test-cancelled');
</script>

<style scoped>
.test-container { display: flex; flex-direction: column; gap: 15px; color: var(--text-main); padding: 10px; height: 100%; }
.tech-font { font-family: var(--font-tech); letter-spacing: 1px; }

.main-layout { display: grid; grid-template-columns: 1fr 100px; gap: 20px; flex-grow: 1; }

.glass-panel {
  background: rgba(255, 255, 255, 0.03); backdrop-filter: blur(12px);
  border: 1px solid var(--border); border-radius: 15px; padding: 25px;
  display: flex; flex-direction: column; gap: 20px;
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