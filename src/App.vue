<script setup>
import { onMounted, ref, computed, watch } from 'vue';
import ProgressBar1 from './components/progress/ProgressBar1.vue';
import ProgressBar2 from './components/progress/ProgressBar2.vue';
import ProgressBar3 from './components/progress/ProgressBar3.vue';
import ProgressBar4 from './components/progress/ProgressBar4.vue';
import Icons from './components/common/Icons.vue';
import TestesView from '@/components/TestesView.vue';
import DiagsView from '@/components/diags/DiagsView.vue';
import Relatorios from '@/components/Relatorios.vue';
import LogoView from './components/diags/LogoView.vue'; // O novo teste
import StepsProgress from '@/components/StepsProgress.vue';
import ConfiguraView from '@/components/ConfiguraView.vue';
import Monitor from '@/components/Monitor.vue';
import About from './components/About.vue';
import { globalState } from './store.js';


// --- ESTADOS DE UI ---
const progress = ref(0);
const fps = ref(0);
const animateCamera = ref(true);
const enableEffects = ref(true);
const leftSidebarExpanded = ref(true);
const rightSidebarVisible = ref(false);
const activeMenu = computed(() => globalState.activeMenu);
const isAboutOpen = ref(false);

// --- LÓGICA DE NAVEGAÇÃO E RECOLHER SIDEBARS ---
const setActiveMenu = (menu) => { 
  globalState.activeMenu = menu; 
  console.log("Tentando mudar para o menu:", menu); // Se isso não aparecer no console, o evento não chegou aqui
};


watch(activeMenu, (newMenu) => {
  // Fecha as barras automaticamente em telas de teste ou diagnósticos
  if (newMenu === 'testes' || newMenu === 'keyboardTest' || newMenu === 'LogoView' || newMenu === 'Diags') {
    leftSidebarExpanded.value = false;
    rightSidebarVisible.value = false;
  }
});

// --- DADOS DO SISTEMA (REFS) ---
const serialNumber = ref(globalState.t('status.waiting')); 
const modelName = ref(globalState.t('status.waiting'));
const orderNumber = ref('ORD-000000');
const fabricante = ref(globalState.t('status.waiting'));
const card_processador = ref('');
const card_memoriaTotal = ref('');
const card_armazenamento = ref([]);
const card_placaVideo = ref([]);
const card_sistema = ref('');
const card_lcd = ref('');

// --- DADOS DE PERFORMANCE (REFS) ---
const cpuUsage = ref(0);
const memoryUsage = ref(0);
const diskValue = ref(0);
const cpuTemp = ref(0);
const gpuTemp = ref(0);
const batteryLevel = ref(0);

// --- FUNÇÕES DE ATUALIZAÇÃO ---
function updatePCInfo(data) {
  if (!data) return;
  serialNumber.value = String(data.serialNumber || '');
  modelName.value = String(data.model || '');
  card_processador.value = String(data.processador || '');
  card_memoriaTotal.value = String(data.memoria || '');
  card_armazenamento.value = Array.isArray(data.armazenamento) ? [...data.armazenamento] : [data.armazenamento];
  card_placaVideo.value = Array.isArray(data.placaVideo) ? [...data.placaVideo] : [data.placaVideo];
  card_sistema.value = String(data.sistema || '');
  card_lcd.value = String(data.lcd || '');
  orderNumber.value = "os-123456";
  fabricante.value = String(data.systemFamily || '');
}

function updatePerformance(cpu, memory, disk, realtime = null) {
  cpuUsage.value = Number(cpu) || 0;
  memoryUsage.value = Number(memory) || 0;
  diskValue.value = Number(disk) || 0;
  if (realtime) {
    cpuTemp.value = Number(realtime.cpuTemp) || 0;
    gpuTemp.value = Number(realtime.gpuTemp) || 0;
    batteryLevel.value = Math.round(Number(realtime.batteryLevel)) || 0;
  }
}

// --- ESTILO DOS GAUGES ---
const currentStyleId = ref(localStorage.getItem('progress-style') || 'progress-01');
const styleMap = {
  'progress-01': ProgressBar1,
  'progress-02': ProgressBar2,
  'progress-03': ProgressBar3,
  'progress-04': ProgressBar4
};

const activeProgressComponent = computed(() => {
  return styleMap[currentStyleId.value] || ProgressBar4;
});

// --- COMUNICAÇÃO COM O C# ---
onMounted(() => {
  if (window.chrome?.webview) {
    window.chrome.webview.addEventListener("message", (event) => {
      try {
        const cleanData = event.data;
        if (!cleanData || !cleanData.type) return;

        switch (cleanData.type) {
          case "pcInfo":
            updatePCInfo(cleanData);
            break;
          case "performanceData":
            updatePerformance(cleanData.cpu, cleanData.memory, cleanData.disk, cleanData.realtime);
            break;
        }
      } catch (err) {
        console.error("Erro ao processar mensagem do C#:", err);
      }
    });

    window.chrome.webview.postMessage({ type: "UI_READY" });
    window.chrome.webview.postMessage({ type: "requestPCInfo" });
  }
});

// --- CONTROLES DE INTERFACE ---
const toggleLeftSidebar = () => { leftSidebarExpanded.value = !leftSidebarExpanded.value; };
const toggleRightSidebar = () => { rightSidebarVisible.value = !rightSidebarVisible.value; };

const closeApp = () => window.chrome.webview.hostObjects.windowControls.CloseApp();
const minimizeApp = () => window.chrome.webview.hostObjects.windowControls.MinimizeApp();
const maximizeApp = () => window.chrome.webview.hostObjects.windowControls.MaximizeApp();
const dragApp = () => window.chrome.webview.hostObjects.windowControls.DragWindow();

window.addEventListener('progress-style-changed', (event) => {
  currentStyleId.value = event.detail;
});
</script>

<template>
  <div class="app-container">
    <nav class="custom-title-bar">
      <div class="drag-region" @mousedown="dragApp">
        <span class="app-title tech-font">HARDWARE DIAG V2.0</span>
      </div>
      <div class="topbar-center" @mousedown.stop>
        <StepsProgress />
      </div>
      <div class="window-controls" @mousedown.stop>
        <button @click.prevent="minimizeApp" class="ctrl-btn">─</button>
        <button @click.prevent="maximizeApp" class="ctrl-btn">▢</button>
        <button @click.prevent="closeApp" class="ctrl-btn close-hover">✕</button>
      </div>
    </nav>

    <header class="topbar">
      <div class="topbar-content">
        <div class="info-item"><span class="info-label">{{ fabricante }}</span></div>
        <div class="info-item"><span class="info-label">S/N:</span><span class="info-value">{{ serialNumber }}</span></div>
        <div class="info-item"><span class="info-label">O.S:</span><span class="info-value">{{ orderNumber }}</span></div>
      </div>
    </header>

    <div class="main-layout">
      <aside class="left-sidebar" :class="{ collapsed: !leftSidebarExpanded }">
        <button class="toggle-btn" @click="toggleLeftSidebar">
          <Icons :name="leftSidebarExpanded ? 'chevron-left' : 'chevron-right'" />
        </button>

        <nav class="sidebar-menu">
          <button class="menu-item" :class="{ active: activeMenu === 'informacoes' }" @click="setActiveMenu('informacoes')">
            <Icons name="info" size="32" class="menu-icon" />
            <span v-if="leftSidebarExpanded" class="menu-text">{{globalState.t('titles.informacoes')}}</span>
          </button>

          <button class="menu-item" :class="{ active: activeMenu === 'relatorios' }" @click="setActiveMenu('relatorios')">
            <Icons name="save" size="32" class="menu-icon" />
            <span v-if="leftSidebarExpanded" class="menu-text">{{globalState.t('titles.reports')}}</span>
          </button>

          <button class="menu-item" :class="{ active: activeMenu === 'testes' || activeMenu === 'LogoView' }" @click="setActiveMenu('testes')">
            <Icons name="test-list" size="32" class="menu-icon" />
            <span v-if="leftSidebarExpanded" class="menu-text">{{globalState.t('titles.peripherals')}}</span>
          </button>

          <button class="menu-item" :class="{ active: activeMenu === 'Diags' }" @click="setActiveMenu('Diags')">
            <Icons name="stress" size="32" class="menu-icon" />
            <span v-if="leftSidebarExpanded" class="menu-text">{{globalState.t('titles.diagnosticos')}}</span>
          </button>

          <button class="menu-item" :class="{ active: activeMenu === 'monitor' }" @click="setActiveMenu('monitor')">
            <Icons name="monitor" size="32" class="menu-icon" />
            <span v-if="leftSidebarExpanded" class="menu-text">{{globalState.t('titles.monitor')}}</span>
          </button>

          <button class="menu-item" :class="{ active: activeMenu === 'configurar' }" @click="setActiveMenu('configurar')">
            <Icons name="settings" size="32" class="menu-icon" />
            <span v-if="leftSidebarExpanded" class="menu-text">{{globalState.t('titles.settings')}}</span>
          </button>

          <button class="menu-item" :class="{ active: isAboutOpen }" @click="isAboutOpen = true">
            <Icons name="about" size="32" />
            <span v-if="leftSidebarExpanded" class="menu-text">{{globalState.t('titles.about')}}</span>
          </button>
        </nav>
      </aside>

      <main class="main-content">
        <div class="content-wrapper">
          
          <div v-if="activeMenu === 'informacoes'" class="content-section">
            <h2 class="section-title">{{ modelName }}</h2>
            <div class="info-grid">
              <div class="info-card"><h3>{{ globalState.t('hardware.processador') }}</h3><p>{{ card_processador }}</p></div>
              <div class="info-card"><h3>{{ globalState.t('hardware.memoria') }}</h3><p>{{ card_memoriaTotal }}</p></div>
              <div class="info-card"><h3>{{ globalState.t('hardware.armazenamento') }}</h3><p v-for="item in card_armazenamento" :key="item">{{ item }}</p></div>
              <div class="info-card"><h3>{{ globalState.t('hardware.gpu') }}</h3><p v-for="item in card_placaVideo" :key="item">{{ item }}</p></div>
              <div class="info-card"><h3>{{ globalState.t('hardware.sistema') }}</h3><p>{{ card_sistema }}</p></div>
              <div class="info-card"><h3>{{ globalState.t('hardware.lcd') }}</h3><p>{{ card_lcd }}</p></div>
            </div>
          </div>

          <div v-show="activeMenu === 'relatorios'" class="content-section">
            <Relatorios @change-view="setActiveMenu" />
          </div>

          <div v-if="activeMenu === 'testes'" class="content-section">
            <TestesView @change-view="setActiveMenu" />
          </div>

          <div v-if="activeMenu === 'LogoView'" class="content-section">
            <LogoView />
            <button class="btn-secondary" @click="setActiveMenu('testes')" style="margin-top: 20px;">VOLTAR</button>
          </div>

          <div v-show="activeMenu === 'Diags'" class="content-section"><DiagsView /></div>
          <div v-show="activeMenu === 'monitor'" class="content-section">
            <Monitor :cpu-temp="cpuTemp" :gpu-temp="gpuTemp" :battery-level="batteryLevel" />
          </div>
          <div v-show="activeMenu === 'configurar'" class="content-section"><ConfiguraView /></div>
        </div>
        
        <About :isOpen="isAboutOpen" @close="isAboutOpen = false" />
      </main>

      <aside v-if="rightSidebarVisible" class="right-sidebar">
        <button class="close-btn" @click="toggleRightSidebar">✕</button>
        <div class="progress-section">
          <component :is="activeProgressComponent" label="CPU%" :progress-value="cpuUsage" />
          <component :is="activeProgressComponent" label="MEM%" :progress-value="memoryUsage" />
          <component :is="activeProgressComponent" label="DISK%" :progress-value="diskValue" />
        </div>
      </aside>

      <button v-if="!rightSidebarVisible && activeMenu !== 'testes' && activeMenu !== 'LogoView'" 
              class="show-sidebar-btn" @click="toggleRightSidebar">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* 1. RESET & BASE */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.app-container {
  width: 100%;
  height: 100vh;
  color: var(--text-dim);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  /* --- O NOVO FUNDO TÉCNICO --- */
/* CAMADAS DE FUNDO (A técnica de transparência) */
  background-image: 
    /* 1. Camada do Circuito: Carregamos a imagem original */
    url('@/assets/circuito.png'),
    /* 2. Camada de Cor: Usamos o gradiente que já tínhamos (luz no canto) */
    radial-gradient(circle at bottom right, var(--bg-app) 40%, rgba(0, 0, 0, 0.7) 100%);

  /* CONFIGURAÇÕES DO CIRCUITO */
  background-position: bottom right, center; /* Posiciona o circuito no canto */
  background-repeat: no-repeat, repeat;
  background-size: 600px auto, 100% 100%; /* Ajuste o 600px para o tamanho desejado */

   }

.content-area {
  flex: 1;
  padding: 20px;
  overflow-y: auto; /* Permite scroll apenas no conteúdo, mantendo o fundo fixo */
}

/* 2. CUSTOM TITLE BAR (Linha 1) */
.custom-title-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 38px;
  background: var(--bg-secondary, #121212);
  border-bottom: 1px solid var(--border-color, #333);
  user-select: none;
  position: relative;
  z-index: 9999;
}

.drag-region {
  flex-grow: 1;
  display: flex;
  align-items: center;
  padding-left: 15px;
  height: 100%;
  cursor: move;
}

.app-title {
  font-size: 0.75rem;
  letter-spacing: 2px;
  color: var(--text-dim);
  font-weight: 800;
}

.topbar-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  height: 100%;
}

.window-controls {
  display: flex;
  height: 100%;
  z-index: 10;
}

.ctrl-btn {
  width: 45px;
  height: 100%;
  border: none;
  background: transparent;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.ctrl-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.close-hover:hover {
  background: #e81123 !important;
}

/* 3. INFO BAR (Linha 2) */
.topbar {
  display: flex;
  align-items: center;
  height: 40px;
  background: var(--bg-primary, #0a0a0a);
  padding: 0 15px;
  border-bottom: 1px solid var(--border-color, #222);
}

.topbar-content {
  width: 100%;
  display: flex;
  gap: 40px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.info-label {
  font-size: 0.7rem;
  color: var(--text-dim);
  text-transform: uppercase;
  font-weight: 600;
}

.info-value {
  font-size: 0.85rem;
  font-family: 'Consolas', monospace;
  color: var(--text-bright, #fff);
  background: rgba(0, 255, 65, 0.05);
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid #333;
}

/* 4. LAYOUT PRINCIPAL & SIDEBARS */
.main-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
}

.left-sidebar {
  background-color: var(--bg-panel);
  border-right: 1px solid var(--border);
  width: 230px;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  position: relative;
}

.left-sidebar.collapsed {
  width: 80px;
}

.toggle-btn {
  position: absolute;
  top: 1rem;
  right: -12px;
  width: 24px;
  height: 24px;
  background-color: var(--accent);
  border-radius: 50%;
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
}

.sidebar-menu {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 1.5rem 0.8rem;
  /* Reduzi o padding superior de 3.5rem para 1.5rem */
  flex: 1;
  overflow-y: auto;
  /* Permite rolar se tiver muitos itens */
  overflow-x: hidden;
}

/* Esconde a scrollbar da sidebar para manter o visual limpo */
.sidebar-menu::-webkit-scrollbar {
  width: 0px;
}

.menu-item {
  font-family: var(--font-mono);
  font-size: 1rem;
  /* Corrigido de 2.95rem para 1rem */
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.8rem;
  background: transparent;
  border: none;
  color: var(--text-dim);
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.menu-item.active {
  background-color: var(--accent);
  color: #ffffff;
  font-weight: 700;
  box-shadow: 0 4px 12px var(--accent-glow);
}

.menu-icon {
  min-width: 24px;
  min-height: 24px;
  /* Garante que ícones de linha ou preenchidos herdem a cor do texto do botão */
  color: inherit;
}

.left-sidebar.collapsed .menu-item {
  justify-content: center;
  padding: 0.8rem;
}

/* 5. CONTEÚDO CENTRAL */
.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  scroll-behavior: smooth;
}

.content-wrapper {
  max-width: 1400px;
  margin: 0 auto;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
}

.info-card {
  background-color: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.2rem;
  transition: all 0.3s ease;
}

.info-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px var(--accent-glow);
  border-color: var(--accent);
}

/* Estilo de Texto nos Cards */
.info-card h3 {
  font-size: 0.65rem;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 1.2px;
  margin-bottom: 0.5rem;
  opacity: 0.7;
}

.info-card p {
  font-family: var(--font-tech);
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-main);
}

/* 6. SIDEBAR DIREITA & PROGRESSO */
.right-sidebar {
  background-color: var(--bg-panel);
  border-left: 1px solid var(--border);
  width: 230px;
  display: flex;
  flex-direction: column;
  position: relative;
  animation: slideInRight 0.3s ease-out;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
  }

  to {
    transform: translateX(0);
  }
}

.progress-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  /* Corrigido de -150px para 20px */
  padding: 2rem 0;
}

/* Botão flutuante para abrir sidebar */
.show-sidebar-btn {
  position: fixed;
  right: 1.5rem;
  top: 50%;
  transform: translateY(-50%);
  width: 42px;
  height: 42px;
  background-color: var(--accent);
  border-radius: 10px;
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  z-index: 50;
}

.close-btn {
  position: absolute;
  top: 0.8rem;
  right: 0.8rem;
  width: 28px;
  /* Tamanho menor e fixo */
  height: 28px;
  background-color: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-dim);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  transition: all 0.3s ease;
  z-index: 20;
}

.close-btn:hover {
  background-color: #e74c3c;
  /* Cor de destaque ao passar o mouse */
  border-color: #e74c3c;
  color: white;
  transform: rotate(90deg);
  /* Efeito visual moderno */
}

/* 7. SCROLLBAR CUSTOM */
.main-content::-webkit-scrollbar {
  width: 6px;
}

.main-content::-webkit-scrollbar-track {
  background: transparent;
}

.main-content::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 10px;
}

.main-content::-webkit-scrollbar-thumb:hover {
  background: var(--accent);
}

/* 8. UTILITÁRIOS */
.tech-font {
  font-family: var(--font-mono, 'Consolas', monospace);
}

.section-title {
  margin-bottom: 2rem;
  color: var(--text-main);
  font-weight: 700;
}
</style>