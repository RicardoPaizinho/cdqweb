<template>
  <div class="content-section">
    <h2 class="section-title">Aparência e Interface</h2>

    <div class="settings-card">
      <div class="card-header">
        <Icons name="settings" size="20" class="accent-icon" />
        <h3>Galeria de Temas</h3>
      </div>
      
      <p class="settings-desc">Escolha a paleta de cores principal para a interface.</p>

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
          
          <div class="theme-details">
            <span class="theme-label">{{ theme.name }}</span>
          </div>

          <div class="check-mark" v-if="currentTheme === theme.id">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="4"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        </button>
      </div>
    </div>

    <div class="settings-card mt-4">
      <div class="card-header">
       
        <h3>Estilo dos Indicadores</h3>
      </div>
      
      <p class="settings-desc">Selecione o design das barras de progresso e sensores.</p>

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
import Icons from './common/Icons.vue'; //

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
  { id: 'progress-02', name: 'GLOW' },
  { id: 'progress-03', name: 'MINIMAL' },
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
.mt-4 { margin-top: 1.5rem; }

.settings-card {
  background-color: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.2rem;
}

/* THEME GRID */
.theme-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 10px;
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

.theme-label { font-size: 0.85rem; color: var(--text-main); }
</style>