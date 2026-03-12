<script setup>
import { ref } from 'vue'

// Estado das sidebars
const leftSidebarExpanded = ref(true)
const rightSidebarVisible = ref(true)

// Dados do sistema
const serialNumber = ref('SN-2024-0012345')
const orderNumber = ref('ORD-5678-9012')

// Menu ativo
const activeMenu = ref('informacoes')

// Dados dos progressbars
const progress1 = ref(75)
const progress2 = ref(45)

// Funções de toggle
const toggleLeftSidebar = () => {
  leftSidebarExpanded.value = !leftSidebarExpanded.value
}

const toggleRightSidebar = () => {
  rightSidebarVisible.value = !rightSidebarVisible.value
}

const setActiveMenu = (menu) => {
  activeMenu.value = menu
}
</script>

<template>
  <div class="app-container">
    <!-- Topbar -->
    <header class="topbar">
      <div class="topbar-content">
        <div class="topbar-left">
          <h1 class="topbar-title">Teste de Hardware</h1>
        </div>
        <div class="topbar-right">
          <div class="info-item">
            <span class="info-label">Número de Série:</span>
            <span class="info-value">{{ serialNumber }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Ordem:</span>
            <span class="info-value">{{ orderNumber }}</span>
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
            :class="{ active: activeMenu === 'testes' }"
            @click="setActiveMenu('testes')"
          >
            <svg class="menu-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 11l3 3L22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            <span v-if="leftSidebarExpanded" class="menu-text">Testes</span>
          </button>
        </nav>
      </aside>

      <!-- Conteúdo Principal -->
      <main class="main-content">
        <div class="content-wrapper">
          <div v-if="activeMenu === 'informacoes'" class="content-section">
            <h2 class="section-title">Informações do Sistema</h2>
            <div class="info-grid">
              <div class="info-card">
                <h3>Processador</h3>
                <p>Intel Core i7-12700K</p>
              </div>
              <div class="info-card">
                <h3>Memória RAM</h3>
                <p>32GB DDR4 3200MHz</p>
              </div>
              <div class="info-card">
                <h3>Armazenamento</h3>
                <p>1TB NVMe SSD</p>
              </div>
              <div class="info-card">
                <h3>Placa de Vídeo</h3>
                <p>NVIDIA RTX 3080</p>
              </div>
            </div>
          </div>

          <div v-if="activeMenu === 'relatorios'" class="content-section">
            <h2 class="section-title">Relatórios de Teste</h2>
            <div class="report-list">
              <div class="report-item">
                <div class="report-info">
                  <h3>Teste de CPU - 11/10/2025 14:30</h3>
                  <p>Status: Aprovado</p>
                </div>
                <button class="btn-secondary">Ver Detalhes</button>
              </div>
              <div class="report-item">
                <div class="report-info">
                  <h3>Teste de Memória - 11/10/2025 14:15</h3>
                  <p>Status: Aprovado</p>
                </div>
                <button class="btn-secondary">Ver Detalhes</button>
              </div>
              <div class="report-item">
                <div class="report-info">
                  <h3>Teste de Disco - 11/10/2025 14:00</h3>
                  <p>Status: Aprovado</p>
                </div>
                <button class="btn-secondary">Ver Detalhes</button>
              </div>
            </div>
          </div>

          <div v-if="activeMenu === 'testes'" class="content-section">
            <h2 class="section-title">Executar Testes</h2>
            <div class="test-grid">
              <button class="test-card">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="4" y="4" width="16" height="16" rx="2" ry="2"/>
                  <rect x="9" y="9" width="6" height="6"/>
                  <line x1="9" y1="1" x2="9" y2="4"/>
                  <line x1="15" y1="1" x2="15" y2="4"/>
                  <line x1="9" y1="20" x2="9" y2="23"/>
                  <line x1="15" y1="20" x2="15" y2="23"/>
                  <line x1="20" y1="9" x2="23" y2="9"/>
                  <line x1="20" y1="14" x2="23" y2="14"/>
                  <line x1="1" y1="9" x2="4" y2="9"/>
                  <line x1="1" y1="14" x2="4" y2="14"/>
                </svg>
                <h3>Teste de CPU</h3>
                <p>Verificar desempenho do processador</p>
              </button>
              
              <button class="test-card">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                </svg>
                <h3>Teste de Memória</h3>
                <p>Verificar integridade da RAM</p>
              </button>
              
              <button class="test-card">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                <h3>Teste de Disco</h3>
                <p>Verificar velocidade e saúde do disco</p>
              </button>
              
              <button class="test-card">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                  <line x1="8" y1="21" x2="16" y2="21"/>
                  <line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
                <h3>Teste de GPU</h3>
                <p>Verificar desempenho gráfico</p>
              </button>
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
        
        <div class="progress-section">
          <h3 class="progress-title">Progresso Geral</h3>
          <div class="circular-progress">
            <svg class="progress-ring" width="160" height="160">
              <circle
                class="progress-ring-circle-bg"
                stroke="#2a2d3a"
                stroke-width="12"
                fill="transparent"
                r="70"
                cx="80"
                cy="80"
              />
              <circle
                class="progress-ring-circle"
                stroke="#ff6b35"
                stroke-width="12"
                fill="transparent"
                r="70"
                cx="80"
                cy="80"
                :stroke-dasharray="`${2 * Math.PI * 70}`"
                :stroke-dashoffset="`${2 * Math.PI * 70 * (1 - progress1 / 100)}`"
              />
            </svg>
            <div class="progress-text">
              <span class="progress-value">{{ progress1 }}%</span>
            </div>
          </div>
        </div>

        <div class="progress-section">
          <h3 class="progress-title">Testes Concluídos</h3>
          <div class="circular-progress">
            <svg class="progress-ring" width="160" height="160">
              <circle
                class="progress-ring-circle-bg"
                stroke="#2a2d3a"
                stroke-width="12"
                fill="transparent"
                r="70"
                cx="80"
                cy="80"
              />
              <circle
                class="progress-ring-circle"
                stroke="#4ecdc4"
                stroke-width="12"
                fill="transparent"
                r="70"
                cx="80"
                cy="80"
                :stroke-dasharray="`${2 * Math.PI * 70}`"
                :stroke-dashoffset="`${2 * Math.PI * 70 * (1 - progress2 / 100)}`"
              />
            </svg>
            <div class="progress-text">
              <span class="progress-value">{{ progress2 }}%</span>
            </div>
          </div>
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
  background-color: #1a1d29;
  color: #e4e4e7;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Topbar */
.topbar {
  background-color: #23263a;
  border-bottom: 1px solid #2a2d3a;
  padding: 0 2rem;
  height: 70px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  z-index: 100;
}

.topbar-content {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.topbar-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #ffffff;
}

.topbar-right {
  display: flex;
  gap: 2rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-label {
  font-size: 0.75rem;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.info-value {
  font-size: 1rem;
  font-weight: 600;
  color: #ff6b35;
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
  background-color: #23263a;
  border-right: 1px solid #2a2d3a;
  width: 250px;
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
  background-color: #ff6b35;
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
  background-color: #ff8555;
  transform: scale(1.1);
}

.sidebar-menu {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 3rem 1rem 1rem;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.3s ease;
  text-align: left;
  white-space: nowrap;
}

.menu-item:hover {
  background-color: #2a2d3a;
  color: #ffffff;
}

.menu-item.active {
  background-color: #ff6b35;
  color: #ffffff;
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
  background-color: #1a1d29;
  padding: 2rem;
}

.content-wrapper {
  max-width: 1400px;
  margin: 0 auto;
}

.content-section {
  animation: fadeIn 0.3s ease;
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
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 2rem;
  color: #ffffff;
}

/* Grid de Informações */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.info-card {
  background-color: #23263a;
  border: 1px solid #2a2d3a;
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.3s ease;
}

.info-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
  border-color: #ff6b35;
}

.info-card h3 {
  font-size: 0.875rem;
  color: #9ca3af;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.info-card p {
  font-size: 1.25rem;
  font-weight: 600;
  color: #ffffff;
}

/* Lista de Relatórios */
.report-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.report-item {
  background-color: #23263a;
  border: 1px solid #2a2d3a;
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.3s ease;
}

.report-item:hover {
  border-color: #ff6b35;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.report-info h3 {
  font-size: 1.125rem;
  color: #ffffff;
  margin-bottom: 0.5rem;
}

.report-info p {
  font-size: 0.875rem;
  color: #4ecdc4;
}

.btn-secondary {
  background-color: transparent;
  border: 1px solid #ff6b35;
  color: #ff6b35;
  padding: 0.5rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  background-color: #ff6b35;
  color: #ffffff;
}

/* Grid de Testes */
.test-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.test-card {
  background-color: #23263a;
  border: 1px solid #2a2d3a;
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
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
  border-color: #ff6b35;
  background-color: #2a2d3a;
}

.test-card svg {
  color: #ff6b35;
}

.test-card h3 {
  font-size: 1.25rem;
  color: #ffffff;
  font-weight: 600;
}

.test-card p {
  font-size: 0.875rem;
  color: #9ca3af;
}

/* Sidebar Direita */
.right-sidebar {
  background-color: #23263a;
  border-left: 1px solid #2a2d3a;
  width: 300px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 3rem;
  position: relative;
  animation: slideInRight 0.3s ease;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

.close-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 32px;
  height: 32px;
  background-color: transparent;
  border: 1px solid #2a2d3a;
  border-radius: 6px;
  color: #9ca3af;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.close-btn:hover {
  background-color: #ff6b35;
  border-color: #ff6b35;
  color: #ffffff;
}

.progress-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.progress-title {
  font-size: 1rem;
  font-weight: 600;
  color: #ffffff;
  text-align: center;
}

.circular-progress {
  position: relative;
  width: 160px;
  height: 160px;
}

.progress-ring {
  transform: rotate(-90deg);
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
  color: #ffffff;
}

.show-sidebar-btn {
  position: fixed;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  width: 40px;
  height: 40px;
  background-color: #ff6b35;
  border: none;
  border-radius: 8px;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
  z-index: 50;
}

.show-sidebar-btn:hover {
  background-color: #ff8555;
  transform: translateY(-50%) scale(1.1);
}

/* Scrollbar customizada */
.main-content::-webkit-scrollbar {
  width: 8px;
}

.main-content::-webkit-scrollbar-track {
  background: #1a1d29;
}

.main-content::-webkit-scrollbar-thumb {
  background: #2a2d3a;
  border-radius: 4px;
}

.main-content::-webkit-scrollbar-thumb:hover {
  background: #ff6b35;
}
</style>

