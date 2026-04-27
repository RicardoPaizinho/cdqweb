<template>
  <div class="content-section">
    
    <div class="page-header">
      <Icons name="settings" size="28" class="accent-icon" />
      <h2 class="section-title">{{ globalState.t('titles.settings') }}</h2>
    </div>
    
    <div class="settings-card">
      <div class="card-title-row">
        <Icons name="info" size="20" class="card-icon" />
        <h3>{{ globalState.t('titles.language') || 'Idioma / Language' }}</h3>
      </div>
      
      <p class="settings-desc">Selecione o idioma da interface técnica.</p>
      
      <select v-model="globalState.language" class="modern-select">
        <option value="pt">Português (Brasil)</option>
        <option value="en">English (US)</option>
        <option value="es">Español</option>
      </select>
    </div>

    <div class="settings-card mt-4">
      <div class="card-title-row">
        <Icons name="stress" size="20" class="card-icon" />
        <h3>Galeria de Temas</h3>
      </div>

      <div class="theme-grid">
        <button 
          v-for="theme in themes" 
          :key="theme.id"
          class="theme-btn" 
          :class="{ active: currentTheme === theme.id }"
          @click="setTheme(theme.id)"
        >
          <div class="theme-color-icon">
            <span class="color-bg" :style="{ backgroundColor: theme.color1 }"></span>
            <span class="color-acc" :style="{ backgroundColor: theme.color2 }"></span>
          </div>
          <span class="theme-label">{{ theme.name }}</span>
          <div class="check-mark" v-if="currentTheme === theme.id">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        </button>
      </div>
    </div>

    <div class="settings-card mt-4">
      <div class="card-title-row">
        <Icons name="test-list" size="20" class="card-icon" />
        <h3>Estilo dos Indicadores</h3>
      </div>
      
      <p class="settings-desc">Design das barras de progresso e sensores.</p>

      <div class="progress-selector">
        <button 
          v-for="style in progressStyles" 
          :key="style.id"
          class="progress-option" 
          :class="{ active: currentProgressStyle === style.id }"
          @click="setProgressStyle(style.id)"
        >
          {{ style.name }}
        </button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { globalState } from '@/store.js';
import Icons from './common/Icons.vue'; //  Importa o componente de ícones para usar nos botões de configuração

// --- LÓGICA DE TEMAS ---
const currentTheme = ref(localStorage.getItem('theme') || 'dark-orange-mode');

const themes = [
  { id: 'default', name: 'Original', color1: '#1a1a1a', color2: '#ffffff' },
  { id: 'dark-orange-mode', name: 'Dark Orange', color1: '#111', color2: '#ff6b35' },
  { id: 'emerald-cyber', name: 'Emerald Cyber', color1: '#0a0f0d', color2: '#00ff88' },
  { id: 'cyber-punk', name: 'Cyber Pink', color1: '#120458', color2: '#ff00ff' }, // NOVO
  { id: 'deep-ocean', name: 'Deep Ocean', color1: '#001219', color2: '#00b4d8' }, // NOVO
  { id: 'midnight-purple', name: 'Midnight', color1: '#0f0c29', color2: '#9d50bb' },
];

const setTheme = (themeId) => {
  currentTheme.value = themeId;
  document.documentElement.removeAttribute('data-theme');
  if (themeId !== 'default') {
    document.documentElement.setAttribute('data-theme', themeId);
  }
  localStorage.setItem('theme', themeId);
};

// --- LÓGICA DE PROGRESSBAR ---
const currentProgressStyle = ref(localStorage.getItem('progress-style') || 'progress-01');

const progressStyles = [
  { id: 'progress-01', name: 'CLÁSSICO' },
  { id: 'progress-02', name: 'HORIZONTAL' },
  { id: 'progress-03', name: 'FLAME' },
  { id: 'progress-04', name: 'CYBER' },
];

const setProgressStyle = (styleId) => {
  currentProgressStyle.value = styleId;
  localStorage.setItem('progress-style', styleId);
  
  // Opcional: Atributo no root para CSS global
  document.documentElement.setAttribute('data-progress-style', styleId);
  
  // DISPARA EVENTO PARA O APP.VUE
  window.dispatchEvent(new CustomEvent('progress-style-changed', { detail: styleId }));
};

onMounted(() => {
  setTheme(currentTheme.value);
  setProgressStyle(currentProgressStyle.value);
});
</script>

<style scoped>
.content-section {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

/* Título da Página com Ícone */
.page-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 0.5rem;
}

.section-title {
  margin: 0; /* Remove margens padrão que desalinhariam o texto */
  font-size: 1.5rem;
  font-weight: 500;
  color: var(--text-main);
}

.accent-icon {
  color: var(--accent);
}

/* Título dentro dos Cards */
.card-title-row {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 8px;
}

.card-title-row h3 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--text-main);
  font-weight: 400;
}

.card-icon {
  color: var(--text-dim);
}

.settings-card {
  background-color: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.5rem;
  display: flex;
  flex-direction: column;
}

.settings-desc {
  font-size: 0.85rem;
  color: var(--text-dim);
  margin: 0 0 15px 30px; /* Alinhado levemente à direita para começar abaixo do texto do título */
}

/* Ajuste do Select */
.modern-select {
  background: rgba(20, 20, 25, 0.9); /* Fundo sólido para evitar transparência nos itens */
  color: var(--text-main);
  border: 1px solid var(--border);
  padding: 8px 12px;
  border-radius: 8px;
  width: 100%;
  cursor: pointer;
  outline: none;
  transition: all 0.3s ease;
  
  /* Remove a seta padrão para podermos customizar se desejar */
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  
  /* Adiciona uma seta customizada via background-image (opcional) */
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%23666' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
}

.modern-select:focus {
  border-color: var(--accent);
  box-shadow: 0 0 10px var(--accent-glow);
}

/* Estilização das opções (O SEGREDO ESTÁ AQUI) */
.modern-select option {
  background-color: #1a1a1a; /* Cor de fundo escura sólida */
  color: #ffffff;            /* Cor do texto */
  padding: 10px;
}

/* Hover e seleção (funciona melhor em alguns navegadores que outros) */
.modern-select option:hover,
.modern-select option:checked {
  background-color: var(--accent) !important;
  color: #000;
}




/* Espaçamento extra entre cards */
.mt-4 { margin-top: 0.8rem; }

/* THEME GRID */
.theme-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 5px;
}

.theme-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  transition: 0.2s;
  position: relative;
}

.theme-btn:hover { border-color: var(--accent); }
.theme-btn.active { border-color: var(--accent); background: rgba(var(--accent-rgb), 0.1); }

/* ÍCONE DE DUAS CORES */
.theme-color-icon {
  width: 24px;
  height: 24px;
  display: flex;
  border-radius: 6px;
  overflow: hidden;
  transform: rotate(45deg); /* Dá um ar mais moderno/tech */
  border: 1px solid rgba(255,255,255,0.1);
}
.theme-color-icon span { flex: 1; }

/* PROGRESS SELECTOR (SEM BARRAS) */
.progress-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  background: rgba(0,0,0,0.2);
  padding: 4px;
  border-radius: 8px;
}

.progress-option {
  flex: 1;
  min-width: 100px;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: var(--text-dim);
  font-size: 0.75rem;
  font-weight: bold;
  letter-spacing: 1px;
  cursor: pointer;
  border-radius: 6px;
  transition: 0.3s;
}

.progress-option:hover { color: var(--text-main); }
.progress-option.active {
  background: var(--accent);
  color: #000; /* Texto preto para contraste no botão ativo */
}

.check-mark {
  width: 14px;
  height: 14px;
  background: var(--accent);
  border-radius: 50%;
  position: absolute;
  top: -5px;
  right: -5px;
  padding: 2px;
}


.modern-select:focus {
  border-color: var(--accent);
}

.theme-label { font-size: 0.85rem; color: var(--text-main); }
</style>