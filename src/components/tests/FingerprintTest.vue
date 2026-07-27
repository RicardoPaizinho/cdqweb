<script setup>
import { ref } from 'vue';

const emit = defineEmits(['test-completed', 'test-cancelled']);

const launchStatus = ref('');

function openWindowsFingerprintEnrollment() {
  try {
    // Dispara o protocolo do Windows para abrir o cadastro de digital no Configurações
    window.location.href = 'ms-settings:signinoptions-launchfingerprintenrollment';
    launchStatus.value = 'Configuração do Windows solicitada. Verifique a janela aberta.';
  } catch (err) {
    launchStatus.value = 'Não foi possível abrir o recurso do Windows automaticamente.';
    console.error('Erro ao abrir ms-settings:', err);
  }
}

const finishTest = (status) => {
  emit('test-completed', status);
};

const goBack = () => {
  emit('test-cancelled');
};
</script>

<template>
  <div class="fingerprint-test-container">
    <!-- Header Padronizado -->
    <header class="test-header">
      <div class="header-left">
        <h4 class="tech-font">TESTE DE BIOMETRIA / FINGERPRINT</h4>
        <button class="btn-glass back-neon tech-font" @click="goBack">VOLTAR</button>
      </div>

      <div class="header-actions">
        <button class="btn-glass pass-neon tech-font" @click="finishTest('PASS')">
          PASS
        </button>
        <button class="btn-glass fail-neon tech-font" @click="finishTest('FAIL')">
          FAIL
        </button>
      </div>
    </header>

    <!-- Conteúdo Principal -->
    <div class="test-content">
      <div class="fingerprint-card card-glass">
        <!-- Ícone do Leitor de Digital -->
        <div class="fingerprint-icon-box">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 12a3 3 0 0 0 3-3 3 3 0 0 0-6 0 3 3 0 0 0 3 3z"/>
            <path d="M19 12a7 7 0 0 0-14 0"/>
            <path d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12"/>
            <path d="M12 16a4 4 0 0 0 4-4"/>
            <path d="M8 12a4 4 0 0 1 4-4"/>
            <path d="M12 20a8 8 0 0 0 8-8"/>
          </svg>
        </div>

        <h3 class="tech-font title">VALIDAÇÃO DO LEITOR DACTILOSCÓPICO</h3>
        
        <p class="tech-font instruction">
          Clique no botão abaixo para acionar a verificação/cadastro de biometria nativa do Windows Hello.
        </p>

        <!-- Botão de Ação do Windows -->
        <button class="btn-glass action-neon tech-font launch-btn" @click="openWindowsFingerprintEnrollment">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          ABRIR TESTE NO WINDOWS HELLO
        </button>

        <span v-if="launchStatus" class="tech-font status-msg">
          {{ launchStatus }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fingerprint-test-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
  color: var(--text-main, #fff);
  padding: 10px;
  height: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.tech-font {
  font-family: var(--font-tech, 'Consolas', monospace);
  letter-spacing: 1px;
}

/* Header Padronizado */
.test-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.1));
  padding-bottom: 10px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.header-left h4 {
  margin: 0;
  color: var(--accent, #00ff41);
  text-transform: uppercase;
  font-weight: bold;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.btn-glass {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-main, #fff);
  padding: 8px 20px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.8rem;
  font-weight: bold;
}

.back-neon:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.3);
}

.pass-neon:hover {
  border-color: var(--text-success, #00ff41);
  color: var(--text-success, #00ff41);
  background: rgba(0, 255, 65, 0.1);
  box-shadow: 0 0 15px rgba(0, 255, 65, 0.3);
}

.fail-neon:hover {
  border-color: #ff4d4d;
  color: #ff4d4d;
  background: rgba(255, 77, 77, 0.1);
  box-shadow: 0 0 15px rgba(255, 77, 77, 0.3);
}

/* Botão de Ação */
.action-neon {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(0, 255, 65, 0.05);
  border-color: rgba(0, 255, 65, 0.3);
  color: var(--accent, #00ff41);
  padding: 12px 24px;
  font-size: 0.85rem;
}

.action-neon:hover {
  background: rgba(0, 255, 65, 0.15);
  border-color: var(--accent, #00ff41);
  box-shadow: 0 0 20px rgba(0, 255, 65, 0.25);
  transform: translateY(-2px);
}

/* Card Principal */
.card-glass {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 20px;
}

.test-content {
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fingerprint-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  max-width: 500px;
  width: 100%;
  padding: 40px 30px;
}

.fingerprint-icon-box {
  color: var(--accent, #00ff41);
  margin-bottom: 20px;
  filter: drop-shadow(0 0 10px rgba(0, 255, 65, 0.3));
}

.title {
  font-size: 1rem;
  color: #fff;
  margin: 0 0 10px 0;
}

.instruction {
  font-size: 0.75rem;
  color: var(--text-dim, #aaa);
  line-height: 1.5;
  margin-bottom: 25px;
}

.launch-btn {
  margin-bottom: 15px;
}

.status-msg {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 10px;
}
</style>