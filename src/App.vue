<script setup>
import { ref, computed } from 'vue';
import StepsProgress from '@/components/StepsProgress.vue';
import DiagnosticsView from '@/components/DiagnosticsView.vue';
import ProductionView from '@/components/ProductionView.vue';
import { globalState } from './store.js';

// --- CONFIGURAÇÃO DA API REMOTA ---
const API_PRODUCAO_URL = 'https://api.cdqweb.com.br';

// --- ESTADOS DE AUTENTICAÇÃO E MODOS ---
const isAuthenticated = ref(false);
const username = ref('');
const password = ref('');
const loginError = ref('');
const isSubmitting = ref(false);

const appMode = ref('diagnostics'); // 'diagnostics' ou 'production'
const userLocal = ref('');
const userConfig = ref({ idioma: 'pt', batteryHealth: 80, diskHealth: 80 });

// --- ALTERNAR ENTRE MODOS GLOBAIS ---
const toggleAppMode = (mode) => {
  appMode.value = mode;
  if (mode === 'production') {
    globalState.activeMenu = 'dashboard';
  } else {
    globalState.activeMenu = 'informacoes';
  }
};

// --- LOGICA DE LOGIN ---
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
      body: JSON.stringify({ usuario: username.value, senha: password.value })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      isAuthenticated.value = true;
      userLocal.value = data.local;
      userConfig.value = data.config;

      // Aplica idioma dinâmico vindo das configurações do Node
      if (globalState && typeof globalState.changeLanguage === 'function') {
        globalState.changeLanguage(data.config.idioma);
      }
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

// Computa dinamicamente qual view deve ser exibida no miolo do app
const currentViewComponent = computed(() => {
  return appMode.value === 'production' ? ProductionView : DiagnosticsView;
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
            <input v-model="username" type="text" placeholder="Ex: ricardo.silva" :disabled="isSubmitting" required />
          </div>
        </div>
        <div class="input-group">
          <label class="tech-label">Senha de Segurança</label>
          <div class="input-container">
            <input v-model="password" type="password" placeholder="••••••••" :disabled="isSubmitting" required />
          </div>
        </div>
        <div v-if="loginError" class="error-box">
          <span class="error-icon">⚠</span>
          <p class="error-msg">{{ loginError }}</p>
        </div>
        <button type="submit" class="btn-login tech-font" :disabled="isSubmitting">
          <span v-if="isSubmitting">AUTENTICANDO...</span>
          <span v-else>CONECTAR SISTEMA</span>
        </button>
      </form>
    </div>
  </div>

  <div v-else class="app-container">
    <nav class="custom-title-bar">
      <div class="drag-region">
        <span class="app-title tech-font">HARDWARE DIAG V2.0</span>
        <span class="region-indicator">{{ userLocal }} ACTIVE REGION</span>
      </div>
      
      <div class="topbar-center">
        <StepsProgress v-if="appMode === 'diagnostics'" />
        <span v-else class="production-title tech-font">PRODUCTION & ANALYTICS CONTROL</span>
      </div>
      
      <div class="mode-selector-controls">
        <button @click="toggleAppMode('diagnostics')" class="mode-btn" :class="{ active: appMode === 'diagnostics' }">
          ⚙ TST AGENTE
        </button>
        <button @click="toggleAppMode('production')" class="mode-btn production-theme-btn" :class="{ active: appMode === 'production' }">
          📊 DASHBOARD
        </button>
      </div>
    </nav>

    <component :is="currentViewComponent" :userConfig="userConfig" />
  </div>
</template>

<style>
/* Cole aqui todo o CSS da tela de login e do .mode-selector-controls que estruturamos antes */
</style>