<script setup>
import { onMounted, ref } from 'vue';
import ProgressBar from './components/ProgressBar01.vue';
import ProgressBar2 from './components/ProgressBar02.vue';
import ProgressBar3 from './components/ProgressBar03.vue';
import ProgressBar4 from './components/ProgressBar4.vue';
import LogoView from '@/components/LogoView.vue'
import TestesView from '@/components/TestesView.vue';
import StepsProgress from '@/components/StepsProgress.vue';
import ConfiguraView from '@/components/ConfiguraView.vue';
import Monitor from '@/components/Monitor.vue';
import { globalState } from './store.js';

// --- ESTADOS DE UI ---
const progress = ref(0);
const fps = ref(0);
const animateCamera = ref(true);
const enableEffects = ref(true);
const leftSidebarExpanded = ref(true);
const rightSidebarVisible = ref(false);
const activeMenu = ref('informacoes');

// --- DADOS DO SISTEMA (REFS) ---
const serialNumber = ref('Carregando...');
const modelName = ref('Carregando...');
const orderNumber = ref('ORD-000000');
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

// --- DADOS DE MONITORAMENTO (TEMPERATURAS) ---
const cpuTemp = ref(0);
const gpuTemp = ref(0);
const batteryLevel = ref(0);

// --- FUNÇÕES DE ATUALIZAÇÃO (PROTEGIDAS CONTRA RECURSIVIDADE) ---

function updatePCInfo(data) {
  if (!data) return;
  // Usamos String() e Spread [...] para desconectar o objeto do C# do Vue
  // Isso mata o erro de "Maximum call stack size exceeded"
  serialNumber.value = String(data.serialNumber || '');
  modelName.value = String(data.model || '');
  card_processador.value = String(data.processador || '');
  card_memoriaTotal.value = String(data.memoria || '');
  
  card_armazenamento.value = Array.isArray(data.armazenamento) ? [...data.armazenamento] : [data.armazenamento];
  card_placaVideo.value = Array.isArray(data.placaVideo) ? [...data.placaVideo] : [data.placaVideo];
  
  card_sistema.value = String(data.sistema || '');
  card_lcd.value = String(data.lcd || '');
  orderNumber.value = "os-123456";
}

function updatePerformance(cpu, memory, disk, realtime = null) {
  // Convertemos para Number para garantir que o Vue trate apenas como valor puro
  cpuUsage.value = Number(cpu) || 0;
  memoryUsage.value = Number(memory) || 0;
  diskValue.value = Number(disk) || 0;

  // Atualiza as temps que o componente Monitor vai ler
  if (realtime) {
    cpuTemp.value = Number(realtime.cpuTemp) || 0;
    gpuTemp.value = Number(realtime.gpuTemp) || 0;
    batteryLevel.value = Math.round(Number(realtime.batteryLevel)) || 0;
  }
}

// --- COMUNICAÇÃO COM O C# ---
onMounted(() => {
  if (window.chrome?.webview) {
    
    const handleWebMessage = (event) => {
      const data = event.data;
      if (!data) return;

      // Verificação no Console do F12
      console.log("Dados recebidos:", data);

      switch (data.type) {
        case "pcInfo":
          updatePCInfo(data);
          break;

        case "performanceData":
          // Extrai os campos exatamente como o C# envia
          updatePerformance(
            data.cpu, 
            data.memory, 
            data.disk, 
            data.realtime || null
          );
          break;

        case "hardwareUpdate": 
          // Caso você use a versão que envia tudo num objeto só
          if (data.info) updatePCInfo(data.info);
          if (data.usage) {
             updatePerformance(
               data.usage.cpu, 
               data.usage.memory, 
               data.usage.disk, 
               data.realtime || null
             );
          }
          break;
      }
    };

window.chrome.webview.addEventListener("message", (event) => {
    try {
        // TRUQUE DE OURO: Isso limpa todas as referências circulares 
        // e transforma o dado em um objeto Javascript puro e simples.
        const cleanData = JSON.parse(JSON.stringify(event.data));

        if (!cleanData || !cleanData.type) return;

        switch (cleanData.type) {
            case "pcInfo":
                updatePCInfo(cleanData);
                break;
            case "performanceData":
                // Passamos apenas os valores, sem o objeto pai
                updatePerformance(
                    cleanData.cpu, 
                    cleanData.memory, 
                    cleanData.disk, 
                    cleanData.realtime
                );
                break;
        }
    } catch (err) {
        console.error("Erro ao processar mensagem do C#:", err);
    }
});

    // Inicialização
    window.chrome.webview.postMessage({ type: "UI_READY" });
    window.chrome.webview.postMessage({ type: "requestPCInfo" });
  }
});

// --- CONTROLES DE INTERFACE ---
const toggleLeftSidebar = () => { leftSidebarExpanded.value = !leftSidebarExpanded.value; };
const toggleRightSidebar = () => { rightSidebarVisible.value = !rightSidebarVisible.value; };
const setActiveMenu = (menu) => { activeMenu.value = menu; };

// Funções para os seus botões de fechar/minimizar
const closeApp = async () => {
    const controls = window.chrome.webview.hostObjects.windowControls;
    await controls.CloseApp();
};

const minimizeApp = async () => {
    const controls = window.chrome.webview.hostObjects.windowControls;
    await controls.MinimizeApp();
};
const dragWindow = () => {
  if (window.chrome?.webview?.hostObjects?.windowControls) {
    window.chrome.webview.hostObjects.windowControls.DragWindow();
  }
};

const maximizeApp = () => {
  window.chrome.webview.hostObjects.windowControls.MaximizeApp();
};
// No Teste de LCD, quando clicar para iniciar:
const startLcdTest = () => {
    const elem = document.documentElement; // ou o container do teste
    if (elem.requestFullscreen) {
        elem.requestFullscreen(); // O C# vai detectar isso e maximizar o Form
    }
};

</script>

<template>
  <div class="app-container">
    <nav class="custom-title-bar">
<div class="drag-region" @mousedown="dragWindow" style="cursor: move;">
  <span class="app-title tech-font">HARDWARE DIAG V2.0</span>
</div>

<div class="topbar-right">
            <StepsProgress />  
        </div>

<div class="window-controls">
  <button @click.prevent="minimizeApp" class="ctrl-btn">─</button>
  <button @click.prevent="maximizeApp" class="ctrl-btn">▢</button> 
  <button @click.prevent="closeApp" class="ctrl-btn close-hover">✕</button>
</div>
</nav>
    <!-- Topbar -->
    <header class="topbar">
      <div class="topbar-content">
        <!--div class="topbar-left">
          <h1 class="topbar-title">Teste de Hardware</h1>
        </!--div-->
                
        <div class="topbar-right">
          <div class="info-item">
            <span class="info-label">Número de Série: </span>
            <span class="info-value">{{serialNumber}}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Ordem: </span>
            <span class="info-value">{{orderNumber}}</span>
          </div>



        </div>
      </div>
    </header>

    <div class="main-layout">
      <!-- Sidebar Esquerda -->
      <aside class="left-sidebar" :class="{ collapsed: !leftSidebarExpanded }">
        <button class="toggle-btn" @click="toggleLeftSidebar">
          <svg v-if="leftSidebarExpanded" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
          <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
        
        <nav class="sidebar-menu">
          <button 
            class="menu-item" 
            :class="{ active: activeMenu === 'informacoes' }"
            @click="setActiveMenu('informacoes')"
          >
            <svg class="menu-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            <span v-if="leftSidebarExpanded" class="menu-text">Informações</span>
          </button>
          
          <button 
            class="menu-item" 
            :class="{ active: activeMenu === 'relatorios' }"
            @click="setActiveMenu('relatorios')"
          >
            <svg class="menu-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            <span v-if="leftSidebarExpanded" class="menu-text">Relatórios</span>
          </button>
          
          <button 
            class="menu-item" 
            :class="{ active: activeMenu === 'GpuLogo' }"
            @click="setActiveMenu('GpuLogo')"
          >
            <svg class="menu-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
            <span v-if="leftSidebarExpanded" class="menu-text">GPU Test</span>
          </button>

          <button 
            class="menu-item" 
            :class="{ active: activeMenu === 'testes' }"
            @click="setActiveMenu('testes')"
          >
            <svg class="menu-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 11l3 3L22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            <span v-if="leftSidebarExpanded" class="menu-text">Testes</span>
          </button>

          <button 
            class="menu-item" 
            :class="{ active: activeMenu === 'monitor' }"
            @click="setActiveMenu('monitor')"
          >
            <svg class="menu-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 11l3 3L22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            <span v-if="leftSidebarExpanded" class="menu-text">Monitor</span>
          </button>


          <button 
            class="menu-item" 
            :class="{ active: activeMenu === 'configurar' }"
            @click="setActiveMenu('configurar')"
          >
            <svg class="menu-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 11l3 3L22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            <span v-if="leftSidebarExpanded" class="menu-text">Configurações</span>
          </button>


          
        </nav>
      </aside>

      <!-- Conteúdo Principal -->
      <main class="main-content">
        <div class="content-wrapper">
          <div v-if="activeMenu === 'informacoes'" class="content-section">
            <h2 class="section-title">{{ modelName }}</h2>


            <div class="info-grid">
              <div class="info-card">
                <h3>Processador</h3>
                <p>{{ card_processador }}</p>
              </div>
              <div class="info-card">
                <h3>Memória RAM</h3>
                <p>{{ card_memoriaTotal }}</p>
              </div>
              <div class="info-card">
                <h3>Armazenamento</h3>
                <p v-for="(item, index) in card_armazenamento" :key="index">{{ item }}</p>
              </div>
                          

              <div class="info-card">
                <h3>Placa de Vídeo</h3>
              <p v-for="(item, index) in card_placaVideo" :key="index">{{ item }}</p>
              </div>
                  <div class="info-card">
                <h3>Sistema</h3>
                <p>{{ card_sistema }}</p>
              </div>
                <div class="info-card">
                <h3>Lcd</h3>
                <p>{{ card_lcd }}</p>
              </div>


            </div>




          
          </div>

<div v-show="activeMenu === 'relatorios'" class="content-section">
    <h2 class="section-title">Relatórios de Teste</h2>
    <div class="report-list">
      
      <div v-if="globalState.testReports.length === 0" class="info-card">
        <p>Nenhum teste realizado até o momento.</p>
      </div>

      <div 
        v-for="report in globalState.testReports" 
        :key="report.id" 
        class="report-item"
      >
        <div class="report-info">
          <h3>{{ report.name }} - {{ report.date }}</h3>
          <p :style="{ color: report.status === 'Aprovado' ? '#4ecdc4' : '#ff4d4d' }">
            Status: {{ report.status }}
          </p>
        </div>
        <button class="btn-secondary">Ver Detalhes</button>
      </div>

    </div>
  </div>

        <div v-show="activeMenu === 'testes'" class="content-section">
            <TestesView />  
         </div>
         <div v-show="activeMenu === 'monitor'" class="content-section">
            <Monitor 
               :cpu-temp="cpuTemp" 
               :gpu-temp="gpuTemp" 
                :battery-level="batteryLevel" 
            />
            
         </div>
          <div v-show="activeMenu === 'configurar'" class="content-section">
            <ConfiguraView />  
         </div>

          <div v-if="activeMenu === 'GpuLogo'" class="content-section">
            <div class="glb-logo">
            <LogoView    />
             </div> 
          </div>
       
        </div>
      </main>

      <!-- Sidebar Direita -->
      <aside v-if="rightSidebarVisible" class="right-sidebar">
        <button class="close-btn" @click="toggleRightSidebar">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        
                  <!-- Adicionando o MeuComponente -->
      <div>
        <!-- <ProgressBar       label="CPU"      :progress-value="cpuUsage"    />
        <ProgressBar       label="MEM"      :progress-value="memoryUsage"    />
        <ProgressBar       label="DISK"      :progress-value="diskValue"    />  -->
         

    </div>

        <div class="progress-section">
        <ProgressBar4       label="CPU%"      :progress-value="cpuUsage"    /> 
        <ProgressBar4       label="MEM%"      :progress-value="memoryUsage"    />
        <ProgressBar4       label="DISK%"      :progress-value="diskValue"     />




          
        </div>

      </aside>

      <!-- Botão para mostrar sidebar direita quando oculta -->
      <button v-if="!rightSidebarVisible" class="show-sidebar-btn" @click="toggleRightSidebar">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M15 18l-6-6 6-6"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.app-container {
  width: 100%;
  height: 100vh;
  background-color: var(--bg-app); /* #1a1d29 */
  color: var(--text-dim); /* #e4e4e7 */
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}



.info-item {
  display: flex;
 /* flex-direction: column;
  gap: 0.25rem; */
}

.info-label {
  font-size: 0.75rem;
  color: var(--text-dim); /* #9ca3af */
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* O NÚMERO DE SÉRIE (Topbar) */
.info-value {
  font-family: var(--font-mono); /* Cara de código/técnico */
  font-size: 0.95rem;
  color: var(--accent);
}

/* Layout Principal */
.main-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
}

/* Sidebar Esquerda */
.left-sidebar {
  background-color: var(--bg-panel); /* #23263a */
  border-right: 1px solid var(--border); /* #2a2d3a */
  width: 230px;
  transition: width 0.3s ease;
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
  background-color: var(--accent); /* #ff6b35 */
  border: none;
  border-radius: 50%;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: all 0.3s ease;
}

.toggle-btn:hover {
  background-color: var(--accent-hover); /* #ff8555 */
  transform: scale(1.1);
}

.sidebar-menu {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 3rem 1rem 1rem;
}

.menu-item {
   font-family: var(--font-mono); /* Cara de código/técnico */
  font-size: 2.95rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: transparent;
  border: none;
  color: var(--text-dim); /* #9ca3af */
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.3s ease;
  text-align: left;
  white-space: nowrap;
}

.menu-item:hover {
  background-color: var(--bg-hover); /* #2a2d3a */
  color: var(--text-main); /* #ffffff */
}

.menu-item.active {
  background-color: var(--accent);
  color: #ffffff;
  /* O segredo: uma sombra preta suave para destacar a letra branca do fundo vibrante */
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.445);
  font-weight: 700; /* Deixa o texto mais "corpo" no estado ativo */
  box-shadow: 0 4px 12px var(--accent-glow); /* Adiciona um brilho externo no botão inteiro */
}

/* Se você quiser que o ícone também ganhe um destaque */
.menu-item.active svg {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));
}

.menu-icon {
  min-width: 24px;
  min-height: 24px;
}

.menu-text {
  font-size: 1rem;
  font-weight: 500;
}

.left-sidebar.collapsed .menu-item {
  justify-content: center;
  padding: 1rem 0.5rem;
}

/* Conteúdo Principal */
.main-content {
  flex: 1;
  overflow-y: auto;
  background-color: var(--bg-app); /* #1a1d29 */
  padding: 2rem;
}

.content-wrapper {
  max-width: 1400px;
  margin: 0 auto;
}

.content-section {
  animation: fadeIn 0.6s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.section-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 2rem;
  color: var(--text-main); /* #ffffff */
}

/* Grid de Informações */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 1.5rem;
}

.info-card-gpu {
  background-color: var(--bg-panel); /* #23263a */
  border: 1px solid var(--border); /* #2a2d3a */
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.5s ease;
  flex: 1;
  overflow-y: auto;
  margin-top: 15px;
}

.glb-logo {
  max-height: 600px;
  max-width: 900px;
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.5s ease;
  margin-top: 5px;
}

.info-card {
  background-color: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.2rem;
  font-family: var(--font-main); /* Base do card */
}

.info-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 32px var(--accent-glow); /* rgba(223, 132, 28, 0.39) */
  border-color: var(--accent); /* #ff6b35 */
}

/* O LABEL (Ex: PROCESSADOR) */
.info-card h3 {
  font-family: var(--font-main);
  font-size: 0.7rem;      /* Menor que o valor */
  font-weight: 600;       /* Mais grosso para compensar o tamanho */
  color: var(--text-dim);
  opacity: 0.6;           /* Menos destaque visual */
  text-transform: uppercase;
  letter-spacing: 1.2px;  /* Mais espaço para um look moderno */
  margin-bottom: 0.4rem;
}

/* O VALOR (Ex: Intel Core i5...) */
.info-card p {
  font-family: var(--font-tech); /* Fonte industrial para o dado */
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-main);
  letter-spacing: 0.3px;
}

/* Lista de Relatórios */
.report-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.report-item {
  background-color: var(--bg-panel); /* #23263a */
  border: 1px solid var(--border); /* #2a2d3a */
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.3s ease;
}

.report-item:hover {
  border-color: var(--accent); /* #ff6b35 */
  box-shadow: 0 4px 12px var(--shadow-color);
}

.report-info h3 {
  font-size: 1.125rem;
  color: var(--text-main); /* #ffffff */
  margin-bottom: 0.5rem;
}

.report-info p {
  font-size: 0.785rem;
  color: var(--text-success); /* #4ecdc4 */
}

.btn-secondary {
  background-color: transparent;
  border: 1px solid var(--accent); /* #ff6b35 */
  color: var(--accent); /* #ff6b35 */
  padding: 0.5rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  background-color: var(--accent);
  color: #ffffff;
}

/* Grid de Testes */
.test-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.test-card {
  background-color: var(--bg-panel); /* #23263a */
  border: 1px solid var(--border); /* #2a2d3a */
  border-radius: 12px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
}

.test-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px var(--shadow-color);
  border-color: var(--accent);
  background-color: var(--bg-hover); /* #2a2d3a */
}

.test-card svg {
  color: var(--accent);
}

.test-card h3 {
  font-size: 1.25rem;
  color: var(--text-main);
  font-weight: 600;
}

.test-card p {
  font-size: 0.875rem;
  color: var(--text-dim);
}

/* Sidebar Direita */
.right-sidebar {
  background-color: var(--bg-panel); /* #23263a */
  border-left: 1px solid var(--border); /* #2a2d3a */
  width: 230px;
  padding-top: 2rem;
  padding-right: -32px;
  display: flex;
  flex-direction: column;
  gap: -3rem;
  position: relative;
  animation: slideInRight 0.4s ease;
}

@keyframes slideInRight {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.close-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 32px;
  height: 32px;
  background-color: transparent;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-dim);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.4s ease;
}

.close-btn:hover {
  background-color: var(--accent);
  border-color: var(--accent);
  color: #ffffff;
}

.progress-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: -150px; 
}

.progress-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-main);
  text-align: center;
}

.circular-progress {
  position: relative;
  width: 160px;
  height: 160px;
}

.progress-ring-circle {
  transition: stroke-dashoffset 0.5s ease;
  stroke-linecap: round;
}

.progress-text {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
}

.progress-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-main);
}

.show-sidebar-btn {
  position: fixed;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  background-color: var(--accent);
  border: none;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px var(--shadow-color);
  transition: all 0.3s ease;
  z-index: 50;
}

.show-sidebar-btn:hover {
  background-color: var(--accent-hover);
  transform: translateY(-50%) scale(1.1);
}

/* Scrollbar customizada */
.main-content::-webkit-scrollbar {
  width: 8px;
}

.main-content::-webkit-scrollbar-track {
  background: var(--bg-app);
}

.main-content::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 4px;
}

.main-content::-webkit-scrollbar-thumb:hover {
  background: var(--accent);
}


/* Topbar */

.topbar-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-main); /* #ffffff */
}

.topbar-right {
  display: flex;
  gap: 2rem;
  align-items: right;
}


.custom-title-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 42px;
  background: rgba(0, 0, 0, 0.5); /* Semi-transparente para o efeito Glass */
  border-bottom: 1px solid var(--border);
  -webkit-app-region: drag; /* Se estiver usando Electron, mas no WebView2 usamos a lógica do C# */
}

.ctrl-btn {
  background: transparent;
  border: none;
  color: var(--text-dim);
  width: 45px;
  height: 32px;
  transition: 0.2s;
}

.ctrl-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.close-hover:hover {
  background: #e74c3c !important;
  color: white;
}

.title-bar {
    -webkit-app-region: drag; /* Se quiser tentar o padrão */
    cursor: move;
}
.app-title {
  font-size: 0.8rem;
  letter-spacing: 1.5px;
  color: #00ff41; /* Verde Matrix/Neon */
  font-weight: bold;
}
.topbar-center {
  flex: 2; /* Ganha mais espaço central */
  display: flex;
  justify-content: center;
  align-items: center;
}

.drag-region {
  flex: 1; /* Ocupa espaço para ajudar no alinhamento central */
  display: flex;
  align-items: center;
  padding-left: 15px;
  height: 100%;
}

/* Controles de Janela no Canto Direito */
.window-controls {
  flex: 1; /* Ocupa o mesmo que a drag-region para o centro ser real */
  display: flex;
  justify-content: flex-end;
  height: 100%;
}

.ctrl-btn {
  width: 45px;
  height: 100%;
  background: transparent;
  border: none;
  color: #888;
  font-size: 0.7rem;
  transition: all 0.2s;
  cursor: pointer;
}

.ctrl-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.close-hover:hover {
  background: #e81123 !important; /* Vermelho padrão Windows */
}

/* LINHA 2: Barra de Informações do Sistema */
.topbar {
  display: flex;
  align-items: center;
  height: 50px;
  background: #181818;
  padding: 0 20px;
  border-bottom: 1px solid #222;
}
.topbar-content {
  width: 100%;
  display: flex;
  justify-content: flex-end; /* Alinha Serial e Ordem para a direita */
  gap: 30px;
}

.info-item {
  display: flex;
  flex-direction: column; /* Label em cima, Valor embaixo */
  align-items: flex-end;
}

.info-label {
  font-size: 0.65rem;
  color: #666;
  text-transform: uppercase;
}

.info-value {
  font-size: 0.9rem;
  font-family: 'Consolas', monospace; /* Estilo técnico */
  color: #00bfff; /* Azul tech */
}

</style>
