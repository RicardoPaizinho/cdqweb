<script setup>
import { ref } from 'vue';
import { globalState } from '@/store.js';

// Componentes de Estresse (Crie estes arquivos conforme avançar)
//import CpuStress from '@/components/diag/CpuStress.vue';
//import RamStress from '@/components/diag/RamStress.vue';
//import DiskTest from '@/components/diag/DiskTest.vue';
import GpuTests from '@/components/diags/GpuTests.vue'; // Seu LogoView/Unity vai aqui
import EventLogAnalyzer from '@/components/diags/EventLogAnalyzer.vue';

const currentDiag = ref(null);

const startDiag = (key) => {
  currentDiag.value = key;
};

const closeDiag = () => {
  currentDiag.value = null;
};

// Mapeamento dos Testes de Estresse
const diagButtons = [
  { key: 'cpu', title: 'CPU Stress', desc: 'Teste de instabilidade de núcleos-' },
  { key: 'memoria', title: 'RAM Stress', desc: 'Verificação de endereçamento e escrita--' },
  { key: 'gpu', title: 'GPU Stress', desc: 'Benchmark 3D e Estabilidade Térmica' },
  { key: 'ssd', title: 'Disk I/O', desc: 'Velocidade de leitura e escrita sequencial' },
  { key: 'events', title: 'Event Log', desc: 'Analisador de erros e BSOD (Event Viewer)' },
];

const getResultClass = (key) => {
  const res = globalState.testResults[key]?.result;
  return res === 'PASS' ? 'result-pass' : res === 'FAIL' ? 'result-fail' : '';
};
</script>

<template>
  <div class="diagnostic-container">
    
    <div v-if="currentDiag === null">
      <div class="header-diag">
        <h2 class="section-title">System Diagnostic</h2>
        <p class="subtitle">Módulos de estresse de hardware e análise de erros do kernel.</p>
      </div>

      <div class="diag-grid">
        <button v-for="item in diagButtons" 
          :key="item.key" 
          class="diag-card" 
          :class="getResultClass(item.key)"
          @click="startDiag(item.key)"
        >
          <div class="icon-wrapper">
            <svg v-if="item.key === 'cpu'" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 4V2M15 4V2M9 22v-2M15 22v-2M20 9h2M20 15h2M2 9h2M2 15h2"/><path d="M8 8h8v8H8z"/>
            </svg>
            <svg v-else-if="item.key === 'gpu'" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
            </svg>
            <svg v-else-if="item.key === 'memoria'" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M6 19V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14M6 7h12M6 11h12M6 15h12"/>
            </svg>
            <svg v-else-if="item.key === 'ssd'" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M22 12L2 12M5 4.5h14a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2z"/>
            </svg>
            <svg v-else-if="item.key === 'events'" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>

          <div class="card-info">
            <h3>{{ item.title }}</h3>
            <p>{{ item.desc }}</p>
          </div>

          <div class="card-footer">
             <span class="status-text">{{ globalState.testResults[item.key]?.result || 'READY' }}</span>
          </div>
        </button>
      </div>
    </div>

    <div v-else class="diag-active-test">
      <button class="btn-back" @click="closeDiag">← VOLTAR AO DIAGNÓSTICO</button>
      
      <CpuStress v-if="currentDiag === 'cpu'" @completed="closeDiag" />
      <RamStress v-else-if="currentDiag === 'memoria'" @completed="closeDiag" />
      <DiskTest v-else-if="currentDiag === 'ssd'" @completed="closeDiag" />
      <GpuTests v-else-if="currentDiag === 'gpu'" @completed="closeDiag" />
      <EventLogAnalyzer v-else-if="currentDiag === 'events'" @completed="closeDiag" />
    </div>

  </div>
</template>

<style scoped>
.diagnostic-container { padding: 2rem; color: #fff; }

.header-diag { margin-bottom: 2.5rem; }
.subtitle { color: var(--text-dim); font-size: 0.9rem; }

.diag-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.diag-card {
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  text-align: left;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.diag-card:hover {
  border-color: var(--accent);
  background: var(--bg-hover);
  transform: translateY(-5px);
}

.icon-wrapper { color: var(--accent); margin-bottom: 1rem; }

.card-info h3 { font-size: 1.1rem; margin-bottom: 0.5rem; letter-spacing: 0.5px; }
.card-info p { font-size: 0.8rem; color: var(--text-dim); line-height: 1.4; }

.card-footer {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(255,255,255,0.05);
  font-size: 0.75rem;
  font-weight: bold;
  letter-spacing: 1px;
}

.btn-back {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-dim);
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 2rem;
}

.btn-back:hover { color: #fff; border-color: #fff; }

/* Status Classes */
.result-pass { border-left: 4px solid var(--status-pass); }
.result-fail { border-left: 4px solid var(--status-fail); }
</style>