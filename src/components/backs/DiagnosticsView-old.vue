<script setup>
import { onMounted, onUnmounted, ref, computed, watch } from 'vue';
import ProgressBar1 from './progress/ProgressBar1.vue';
import ProgressBar2 from './progress/ProgressBar2.vue';
import ProgressBar3 from './progress/ProgressBar3.vue';
import ProgressBar4 from './progress/ProgressBar4.vue';
import Icons from './common/Icons.vue';
import TestesView from '@/components/TestesView.vue';
import DiagsView from '@/components/diags/DiagsView.vue';
import Relatorios from '@/components/Relatorios.vue';
import LogoView from './diags/LogoView.vue'; 
import StepsProgress from '@/components/StepsProgress.vue';
import ConfiguraView from '@/components/ConfiguraView.vue';
import Monitor from '@/components/Monitor.vue';
import About from './About.vue';
import { globalState } from '../../store.js';

// --- CONFIGURAÇÃO DAS APIS (LOCAL E PRODUÇÃO) ---
const API_BASE_URL = 'https://localhost:5001/api';
const API_PRODUCAO_URL = 'https://api.cdqweb.com.br';

let performanceInterval = null;
let keyboardInterval = null;

// --- ESTADOS DE AUTENTICAÇÃO ---
const isAuthenticated = ref(false);
const username = ref('');
const password = ref('');
const loginError = ref('');
const isSubmitting = ref(false);
const userLocal = ref('');
const userConfig = ref({ idioma: 'pt', batteryHealth: 80, diskHealth: 80 });

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
  console.log("Tentando mudar para o menu:", menu); 
};

watch(activeMenu, (newMenu) => {
  if (newMenu === 'testes' || newMenu === 'keyboardTest' || newMenu === 'LogoView' || newMenu === 'Diags') {
    leftSidebarExpanded.value = false;
    rightSidebarVisible.value = false;
  }

  // Liga/Desliga o Hook de teclado nativo dependendo da tela ativa (apenas se logado)
  if (isAuthenticated.value) {
    if (newMenu === 'keyboardTest') {
      setKeyboardHookStatus(true);
    } else {
      setKeyboardHookStatus(false);
    }
  }
});

// --- DADOS DO SISTEMA (REFS) ---
const serialNumber = ref(globalState.t('status.waiting')); 
const modelName = ref(globalState.t('status.waiting'));
const orderNumber = ref('ORD-000000');
const fabricante = ref(globalState.t('status.waiting'));
const processador_Name = ref('Carregando...');
const processador_ClockSpeed = ref('...');
const processador_MaxClockSpeed = ref('...');
const processador_NumberOfCores = ref('...');
const processador_NumberOfLogicalProcessors = ref('...');
const processador_SerialNumber = ref('...');

const sistema = ref(' ');
const sistemaKey = ref('...');
const sistemaBuild = ref('...');
const sistemaVersion = ref('...');
const sistemaArquitetura = ref('...');

const card_memoriaTotal = ref('');
const card_armazenamento = ref([]);
const card_placaVideo = ref([]);
const card_sistema = ref('');
const card_lcd = ref('');

// --- DADOS DE PERFORMANCE (REFS) ---
const cpuUsage = ref(0);
const memoryUsage = ref(0);
const diskValue = ref(0);
const diskTemp = ref(0);
const cpuTemp = ref(0);
const gpuTemp = ref(0);
const batteryLevel = ref(0);

const flippedCard = ref(null); 

const toggleFlip = (cardId) => {
  flippedCard.value = flippedCard.value === cardId ? null : cardId;
};

// --- CONTROLE DE MODO GLOBAL (DIAGNÓSTICOS VS PRODUÇÃO) ---
const appMode = ref('diagnostics'); // Modos: 'diagnostics' ou 'production'

// Se quiser que o menu lateral resete ao alternar de modo
const toggleAppMode = (mode) => {
  appMode.value = mode;
  if (mode === 'production') {
    globalState.activeMenu = 'dashboard'; // Menu inicial do modo produção
  } else {
    globalState.activeMenu = 'informacoes'; // Menu inicial do modo testes
  }
};

// --- FUNÇÕES DE MAPEAMENTO ---
function updatePCInfo(data) {
  if (!data) return;
  serialNumber.value = String(data.serialNumber || '');
  modelName.value = String(data.model || '');
  processador_Name.value = String(data.processador_Name || '');
  processador_ClockSpeed.value = String(data.processador_ClockSpeed || '');
  processador_MaxClockSpeed.value = String(data.processador_MaxClockSpeed || '');
  processador_NumberOfCores.value = String(data.processador_NumberOfCores || '');
  processador_NumberOfLogicalProcessors.value = String(data.processador_NumberOfLogicalProcessors || '');
  processador_SerialNumber.value = String(data.processador_SerialNumber || '');

  sistema.value = String(data.system || '');
  sistemaBuild.value = String(data.systemBuild || '');
  sistemaVersion.value = String(data.systemVersion || '');
  sistemaKey.value = String(data.systemKey || '');
  sistemaArquitetura.value = String(data.systemArchitecture || '');

  card_memoriaTotal.value = String(data.memoria || '');
  card_armazenamento.value = Array.isArray(data.armazenamento) ? [...data.armazenamento] : [data.armazenamento];
  card_placaVideo.value = Array.isArray(data.placaVideo) ? [...data.placaVideo] : [data.placaVideo];
  card_sistema.value = String(data.system || '');
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
    diskTemp.value = Number(realtime.storageTemp) || 0; 
    batteryLevel.value = Math.round(Number(realtime.batteryLevel)) || 0;
  }
}

// --- REQUISIÇÕES HTTP (MÉTODO FETCH) ---

// Realiza a autenticação no Servidor Node Externo
async function handleLogin() {
  if (!username.value || !password.value) {
    loginError.value = "Preencha todos os campos.";
    return;
  }

  isSubmitting.value = true;
  loginError.value = '';

  try {
    const response = await fetch(`${API_PRODUCAO_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usuario: username.value,
        senha: password.value
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      // 1. Libera o acesso ao layout principal
      isAuthenticated.value = true;
      
      // 2. Armazena localidade e os parâmetros mínimos de teste vindos do Node
      userLocal.value = data.local;
      userConfig.value = data.config;

      console.log(`Autenticado com sucesso! Região: ${data.local}`);

      // 3. Aplica a internacionalização dinâmica com o idioma retornado
      if (globalState && typeof globalState.changeLanguage === 'function') {
        globalState.changeLanguage(data.config.idioma);
      }

      // 4. Dispara a comunicação com o Agente de Diagnósticos C# Local
      fetchPCInfo();
      performanceInterval = setInterval(fetchPerformanceData, 2000);
      keyboardInterval = setInterval(fetchKeyboardEvents, 150);
    } else {
      loginError.value = data.message || "Usuário ou senha incorretos.";
    }
  } catch (err) {
    console.error("Erro na autenticação remota:", err);
    loginError.value = "Não foi possível conectar ao servidor de autenticação.";
  } finally {
    isSubmitting.value = false;
  }
}

// Busca os dados estáticos do PC uma única vez (Executado após login)
async function fetchPCInfo() {
  try {
    const response = await fetch(`${API_BASE_URL}/pc-info`);
    const data = await response.json();
    updatePCInfo(data);
  } catch (err) {
    console.error("Erro ao buscar dados estáticos do C#:", err);
  }
}

// Busca os dados dinâmicos continuamente (CPU, RAM, Temperaturas)
async function fetchPerformanceData() {
  try {
    const response = await fetch(`${API_BASE_URL}/performance`);
    const data = await response.json();
    if (data) {
      updatePerformance(data.cpu, data.memory, data.disk, data.realtime);
    }
  } catch (err) {
    console.error("Erro ao buscar métricas de performance:", err);
  }
}

// Ativar ou desativar o Hook global de teclado no agente C#
async function setKeyboardHookStatus(active) {
  try {
    await fetch(`${API_BASE_URL}/teclado/status?active=${active}`, { 
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error("Erro ao alterar status do Hook de teclado:", err);
  }
}
 
// Consome os eventos de tecla que ficaram na fila do C#
async function fetchKeyboardEvents() {
  if (activeMenu.value !== 'keyboardTest') return;
  try {
    const response = await fetch(`${API_BASE_URL}/teclado/eventos`);
    const eventos = await response.json();
    
    if (eventos && eventos.length > 0) {
      eventos.forEach(evt => {
        console.log(`Tecla capturada via API nativa: ${evt.code}`);
      });
    }
  } catch (err) {
    console.error("Erro ao buscar eventos de teclado:", err);
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

// --- CICLO DE VIDA (INICIALIZAÇÃO WEB) ---
onMounted(() => {
  // Os loops locais não são mais iniciados aqui. 
  // Eles aguardam a validação da função 'handleLogin'.
});

onUnmounted(() => {
  // Garante a limpeza dos loops se o componente for desmontado
  if (performanceInterval) clearInterval(performanceInterval);
  if (keyboardInterval) clearInterval(keyboardInterval);
});

// --- CONTROLES DE INTERFACE ---
const toggleLeftSidebar = () => { leftSidebarExpanded.value = !leftSidebarExpanded.value; };
const toggleRightSidebar = () => { rightSidebarVisible.value = !rightSidebarVisible.value; };

window.addEventListener('progress-style-changed', (event) => {
  currentStyleId.value = event.detail;
});
</script>

<template>
  <div v-if="!isAuthenticated" class="login-wrapper">
    <div class="login-card">
      <div class="login-header">
        <h2 class="tech-font">HARDWARE DIAG V2.0</h2>
        <span class="database-badge">SERVER DATABASE ACCESS</span>
      </div>
      
      <p class="login-subtitle">Insira suas credenciais para sincronizar as diretrizes e bancos de dados locais e internacionais.</p>
      
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="input-group">
          <label class="tech-label">Usuário de Acesso</label>
          <div class="input-container">
            <input 
              v-model="username" 
              type="text" 
              placeholder="Ex: ricardo.silva" 
              :disabled="isSubmitting"
              required 
            />
          </div>
        </div>

        <div class="input-group">
          <label class="tech-label">Senha de Segurança</label>
          <div class="input-container">
            <input 
              v-model="password" 
              type="password" 
              placeholder="••••••••" 
              :disabled="isSubmitting"
              required 
            />
          </div>
        </div>

        <div v-if="loginError" class="error-box">
          <span class="error-icon">⚠</span>
          <p class="error-msg">{{ loginError }}</p>
        </div>

        <button type="submit" class="btn-login tech-font" :disabled="isSubmitting">
          <span v-if="isSubmitting">AUTENTICANDO NO SERVIDOR...</span>
          <span v-else>CONECTAR SISTEMA</span>
        </button>
      </form>
    </div>
  </div>

  <div v-else class="app-container">
    <nav class="custom-title-bar">
      <div class="drag-region" @mousedown="dragApp">
        <span class="app-title tech-font">HARDWARE DIAG V2.0</span>
        <span class="region-indicator">{{ userLocal }} ACTIVE REGION</span>
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

              <div class="info-card-container" :class="{ 'is-flipped': flippedCard === 'cpu' }" @click="toggleFlip('cpu')">
                <div class="info-card-inner">
                  <div class="info-card-front">
                    <h3>{{ globalState.t('hardware.processador') }}</h3>
                    <p>{{ processador_Name }}</p>
                    <div class="click-hint" style="font-size: 0.5rem; color: #444; margin-top: auto; text-align: right;">DETALHES +</div>
                  </div>
                  <div class="info-card-back">
                    <h3>{{ processador_Name }}</h3>
                    <div class="details-list">
                      <p>CORES: {{  processador_NumberOfCores }}</p>
                      <p>THREADS: {{ processador_NumberOfLogicalProcessors }}</p>
                      <p>CLOCK: {{ processador_ClockSpeed }}GHz</p>
                      <p>Serial: {{ processador_SerialNumber }}</p>
                      <p>MaxClock: {{ processador_MaxClockSpeed }}GHz</p>
                    </div>
                  </div>
                </div>
              </div>

              <div class="info-card-container" :class="{ 'is-flipped': flippedCard === 'system' }" @click="toggleFlip('system')">
                <div class="info-card-inner">
                  <div class="info-card-front">
                    <h3>{{ globalState.t('hardware.sistema') }}</h3>
                    <p>{{ sistema }}</p>
                    <div class="click-hint" style="font-size: 0.5rem; color: #444; margin-top: auto; text-align: right;">DETALHES +</div>
                  </div>
                  <div class="info-card-back">
                    <h3>{{ sistema }}</h3>
                    <div class="details-list">
                      <p>Architecture: {{ sistemaArquitetura }}</p>
                      <p>Build: {{ sistemaBuild }}</p>
                      <p>Key: {{ sistemaKey }}</p>
                      <p>Version: {{ sistemaVersion }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div class="info-card-container" :class="{ 'is-flipped': flippedCard === 'memory' }" @click="toggleFlip('memory')">
                <div class="info-card-inner">
                  <div class="info-card-front">
                    <h3>{{ globalState.t('hardware.memoria') }}</h3>
                    <p>{{ card_memoriaTotal  }}</p>
                    <div class="click-hint" style="font-size: 0.5rem; color: #444; margin-top: auto; text-align: right;">DETALHES +</div>
                  </div>
                  <div class="info-card-back">
                    <h3>{{ globalState.t('hardware.memoria') }}</h3>
                    <div class="details-list">
                      <p>Detalhes: {{ sistemaArquitetura }}</p>
                    </div>
                  </div>
                </div>
              </div>
                   
              <div class="info-card-container" :class="{ 'is-flipped': flippedCard === 'memory' }" @click="toggleFlip('memory')">
                <div class="info-card-inner">
                  <div class="info-card-front">
                    <h3>{{ globalState.t('hardware.memoria') }}</h3>
                    <p>{{ card_memoriaTotal  }}</p>
                    <div class="click-hint" style="font-size: 0.5rem; color: #444; margin-top: auto; text-align: right;">DETALHES +</div>
                  </div>
                  
                </div>
              </div>


              <div class="info-card-container"><h3>{{ globalState.t('hardware.armazenamento') }}</h3><p v-for="item in card_armazenamento" :key="item">{{ item }}</p></div>
              
              
              <div class="info-card"><h3>{{ globalState.t('hardware.gpu') }}</h3><p v-for="item in card_placaVideo" :key="item">{{ item }}</p></div>
              <div class="info-card"><h3>{{ globalState.t('hardware.lcd') }}</h3><p>{{ card_lcd }}</p></div>
              <!--div class="info-card"><h3>Mostrar todos detalhes</h3><p v-for="item in card_placaVideo" :key="item">{{ item }}</p></!--div--> 

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
            <Monitor 
              :cpu-temp="cpuTemp" 
              :gpu-temp="gpuTemp" 
              :battery-level="batteryLevel" 
              :min-battery-health="userConfig.batteryHealth"
              :min-disk-health="userConfig.diskHealth"
            />
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
/* Layout da Grid (Mantido) */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
}

/* Container de Perspectiva */
.info-card-container {
  perspective: 1000px;
  cursor: pointer;
  height: 140px; /* Ajuste para a altura desejada dos seus cards */
}

/* O elemento que rotaciona */
.info-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transform-style: preserve-3d;
}

/* Gatilho da Rotação */
.info-card-container.is-flipped .info-card-inner {
  transform: rotateY(180deg);
}

/* Estilo Base das Faces (Unificando suas propriedades antigas) */
.info-card-front, .info-card-back {
  position: absolute;
  width: 100%;
  height: 100%;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  border-radius: 12px;
  padding: 1.2rem;
  background-color: var(--bg-panel);
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
}

/* Efeito Neon no Hover (Apenas na face frontal quando não virado) */
.info-card-container:not(.is-flipped):hover .info-card-front {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px var(--accent-glow);
  border-color: var(--accent);
}

/* Face Traseira (Verso) */
.info-card-back {
  transform: rotateY(180deg);
  background-color: #121212; /* Um tom mais escuro para o verso */
  border-color: var(--accent);
  box-shadow: inset 0 0 15px var(--accent-glow); /* Brilho neon interno no verso */
}

/* Tipografia (Suas regras originais) */
.info-card-front h3, .info-card-back h3 {
  font-size: 0.75rem;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 1.2px;
  margin-bottom: 0.5rem;
  opacity: 0.7;
}

.info-card-front p {
  font-family: var(--font-tech);
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
}

/* Lista de Detalhes no Verso */
.details-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 5px;
}

.details-list p {
  font-size: 0.75rem !important;
  color: var(--accent) !important;
  font-family: var(--font-tech);
}

/* --- CONTAINER PRINCIPAL DE LOGIN --- */
.login-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100vw;
  height: 100vh;
  background-color: #0b0f19; /* Fundo ultra escuro tech */
  color: #ffffff;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* --- CARD DE LOGIN --- */
.login-card {
  background: #111827; /* Cinza escuro azulado */
  border: 1px solid #1f2937;
  padding: 2.5rem;
  border-radius: 8px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.6);
}

/* --- CABEÇALHO DO CARD --- */
.login-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.login-header h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1.6rem;
  letter-spacing: 1px;
  color: #3b82f6; /* Azul elétrico */
}

.database-badge {
  display: inline-block;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: #60a5fa;
  font-size: 0.7rem;
  font-weight: bold;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.login-subtitle {
  color: #9ca3af;
  font-size: 0.85rem;
  line-height: 1.4;
  text-align: center;
  margin-bottom: 2rem;
}

/* --- FORMULÁRIO E INPUTS --- */
.login-form {
  display: flex;
  flex-direction: column;
}

.input-group {
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
}

.tech-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: #9ca3af;
  margin-bottom: 0.5rem;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.input-container input {
  width: 100%;
  background: #030712; /* Fundo interno dos inputs */
  border: 1px solid #374151;
  padding: 0.8rem 1rem;
  border-radius: 4px;
  color: #ffffff;
  font-size: 0.95rem;
  outline: none;
  box-sizing: border-box;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.input-container input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.input-container input:disabled {
  background: #1f2937;
  color: #6b7280;
  cursor: not-allowed;
}

/* --- CAIXA DE ERRO --- */
.error-box {
  display: flex;
  align-items: center;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  padding: 0.75rem 1rem;
  border-radius: 4px;
  margin-bottom: 1.5rem;
}

.error-icon {
  color: #ef4444;
  font-weight: bold;
  margin-right: 0.5rem;
}

.error-msg {
  color: #f87171;
  font-size: 0.85rem;
  margin: 0;
}

/* --- BOTÃO SUBMIT NÉON/TECH --- */
.btn-login {
  background: #2563eb;
  color: #ffffff;
  border: none;
  padding: 0.9rem;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  transition: background 0.2s ease, transform 0.1s ease;
  margin-top: 0.5rem;
}

.btn-login:hover:not(:disabled) {
  background: #1d4ed8;
  box-shadow: 0 0 12px rgba(37, 99, 235, 0.4);
}

.btn-login:active:not(:disabled) {
  transform: scale(0.98);
}

.btn-login:disabled {
  background: #1f2937;
  color: #4b5563;
  cursor: not-allowed;
  border: 1px solid #374151;
}

/* --- FONTE TECNOLÓGICA (OPCIONAL/FALLBACK) --- */
.tech-font {
  font-family: 'Courier New', Courier, monospace;
  font-weight: bold;
}

/* --- INDICADOR DE REGIÃO NO TOPBAR DO APP --- */
.region-indicator {
  margin-left: 15px;
  font-size: 0.7rem;
  background: #10b981; /* Verde esmeralda indicando conexão ativa */
  color: #042f2e;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: bold;
  vertical-align: middle;
}
</style>