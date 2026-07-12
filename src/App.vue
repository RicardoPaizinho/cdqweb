<script setup>
// App.vue — Casca principal da aplicação.
// Responsável por: title bar da janela, tela de login (servidor Node em
// app.cdqweb.com.br) e a barra de navegação entre as duas janelas
// principais: Diagnóstico (Diagnostico.vue) e Dashboard (Dashboard.vue).
import { onMounted, ref, computed } from 'vue';
import StepsProgress from '@/components/StepsProgress.vue';
import Diagnostico from './Diagnostico.vue';
import Dashboard from './Dashboard.vue';
import { globalState } from './store.js';

const isAuthenticated = computed(() => globalState.isAuthenticated);
const activeWindow = computed(() => globalState.activeWindow);
const user = computed(() => globalState.user);

// --- FORMULÁRIO DE LOGIN ---
const loginUsuario = ref('');
const loginSenha = ref('');

async function handleLogin() {
  if (!loginUsuario.value || !loginSenha.value) {
    globalState.authError = 'Informe usuário e senha.';
    return;
  }
  const ok = await globalState.login(loginUsuario.value, loginSenha.value);
  if (ok) {
    loginSenha.value = '';
  }
}

function handleLogout() {
  globalState.logout();
  loginUsuario.value = '';
  loginSenha.value = '';
}

onMounted(() => {
  // Tenta restaurar uma sessão salva anteriormente (opcional)
  globalState.restoreSession();
});
</script>

<template>
  <div class="app-container">



    <!-- TELA DE LOGIN -->
    <div v-if="!isAuthenticated" class="login-screen">
      <form class="login-card" @submit.prevent="handleLogin">
        <h1 class="login-title tech-font">HARDWARE DIAG</h1>
        <p class="login-subtitle">Acesse com seu usuário para continuar</p>

        <label class="login-label">Usuário</label>
        <input
          v-model="loginUsuario"
          type="text"
          class="login-input"
          placeholder="Usuário"
          autocomplete="username"
        />

        <label class="login-label">Senha</label>
        <input
          v-model="loginSenha"
          type="password"
          class="login-input"
          placeholder="••••••••"
          autocomplete="current-password"
        />

        <p v-if="globalState.authError" class="login-error">{{ globalState.authError }}</p>

        <button type="submit" class="login-btn" :disabled="globalState.authLoading">
          {{ globalState.authLoading ? 'Entrando...' : 'Entrar' }}
        </button>
      </form>
    </div>

    <!-- APLICAÇÃO PRINCIPAL (após login) -->
    <template v-else>
      <header class="app-topnav">
        <div class="topnav-tabs">
          <button
            class="topnav-tab"
            :class="{ active: activeWindow === 'diagnostico' }"
            @click="globalState.setActiveWindow('diagnostico')"
          >
            Diagnóstico
          </button>
          <button
            class="topnav-tab"
            :class="{ active: activeWindow === 'dashboard' }"
            @click="globalState.setActiveWindow('dashboard')"
          >
            Dashboard
          </button>
        </div>

        <div class="topnav-user" v-if="user">
          <div class="user-info">
            <span class="user-name">{{ user.nome }}</span>
            <span class="user-meta">{{ user.tipo }} · {{ user.local }}</span>
          </div>
          <button class="logout-btn" @click="handleLogout" title="Sair">⏻</button>
        </div>
      </header>

      <div class="window-body">
        <Diagnostico v-show="activeWindow === 'diagnostico'" />
        <Dashboard v-show="activeWindow === 'dashboard'" />
      </div>
    </template>
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
  color: var(--text-dim);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-image:
    url('@/assets/circuito.png'),
    radial-gradient(circle at bottom right, var(--bg-app) 40%, rgba(0, 0, 0, 0.7) 100%);
  background-position: bottom right, center;
  background-repeat: no-repeat, repeat;
  background-size: 600px auto, 100% 100%;
}

/* 1. CUSTOM TITLE BAR */
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
  flex-shrink: 0;
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

.tech-font {
  font-family: var(--font-mono, 'Consolas', monospace);
}

/* 2. TELA DE LOGIN */
.login-screen {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-card {
  width: 340px;
  background-color: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 2.5rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
}

.login-title {
  font-size: 1.3rem;
  color: var(--text-main);
  letter-spacing: 2px;
  text-align: center;
  margin-bottom: 0.2rem;
}

.login-subtitle {
  font-size: 0.8rem;
  color: var(--text-dim);
  text-align: center;
  margin-bottom: 1.2rem;
}

.login-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-dim);
  margin-top: 0.6rem;
}

.login-input {
  background-color: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.7rem 0.9rem;
  color: var(--text-main);
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s ease;
}

.login-input:focus {
  border-color: var(--accent);
}

.login-error {
  color: #e74c3c;
  font-size: 0.8rem;
  margin-top: 0.8rem;
  text-align: center;
}

.login-btn {
  margin-top: 1.4rem;
  background-color: var(--accent);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 3. TOPO DE NAVEGAÇÃO (Diagnóstico / Dashboard) */
.app-topnav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 52px;
  padding: 0 1.2rem;
  background: var(--bg-primary, #0a0a0a);
  border-bottom: 1px solid var(--border-color, #222);
  flex-shrink: 0;
}

.topnav-tabs {
  display: flex;
  gap: 0.4rem;
  height: 100%;
}

.topnav-tab {
  background: transparent;
  border: none;
  color: var(--text-dim);
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0 1.1rem;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
}

.topnav-tab:hover {
  color: var(--text-main);
  background: rgba(255, 255, 255, 0.05);
}

.topnav-tab.active {
  background-color: var(--accent);
  color: #fff;
  box-shadow: 0 4px 12px var(--accent-glow);
}

.topnav-user {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.user-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  line-height: 1.2;
}

.user-name {
  font-size: 0.8rem;
  color: var(--text-main);
  font-weight: 700;
}

.user-meta {
  font-size: 0.65rem;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.logout-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border);
  color: var(--text-dim);
  border-radius: 8px;
  width: 34px;
  height: 34px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.logout-btn:hover {
  background: #e74c3c;
  border-color: #e74c3c;
  color: #fff;
}

/* 4. CORPO DA JANELA (Diagnóstico / Dashboard) */
.window-body {
  flex: 1;
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
}

.window-body > * {
  flex: 1;
  min-height: 0;
}
</style>