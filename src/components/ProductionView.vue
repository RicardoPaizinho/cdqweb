<script setup>
import { ref, defineProps } from 'vue';
import Icons from './common/Icons.vue';

const props = defineProps({
  userConfig: Object
});

const activeProdMenu = ref('dashboard');
</script>

<template>
  <div class="main-layout production-layout">
    <aside class="left-sidebar production-sidebar">
      <nav class="sidebar-menu">
        <button class="menu-item" :class="{ active: activeProdMenu === 'dashboard' }" @click="activeProdMenu = 'dashboard'">
          <Icons name="monitor" size="32" class="menu-icon" />
          <span class="menu-text">Geral / Dash</span>
        </button>

        <button class="menu-item" :class="{ active: activeProdMenu === 'queries' }" @click="activeProdMenu = 'queries'">
          <Icons name="info" size="32" class="menu-icon" />
          <span class="menu-text">Executar Queries</span>
        </button>

        <button class="menu-item" :class="{ active: activeProdMenu === 'prod-config' }" @click="activeProdMenu = 'prod-config'">
          <Icons name="settings" size="32" class="menu-icon" />
          <span class="menu-text">Limites Node</span>
        </button>
      </nav>
    </aside>

    <main class="main-content">
      <div class="content-wrapper">
        
        <div v-if="activeProdMenu === 'dashboard'" class="content-section">
          <h2 class="section-title">Métricas de Produção Globais</h2>
          <p class="desc-text">Painel integrado com o Express para análise estatística de diagnósticos.</p>
          </div>

        <div v-if="activeProdMenu === 'queries'" class="content-section">
          <h2 class="section-title">Console de Banco de Dados</h2>
          <p class="desc-text">Painel estruturado para execução de queries de manutenção de registros.</p>
          </div>

        <div v-if="activeProdMenu === 'prod-config'" class="content-section">
          <h2 class="section-title">Configurações Ativas Carregadas pelo Servidor</h2>
          <div class="config-summary-card">
            <p><strong>Idioma Sincronizado:</strong> {{ props.userConfig.idioma }}</p>
            <p><strong>Corte de Bateria Mínimo:</strong> {{ props.userConfig.batteryHealth }}%</p>
            <p><strong>Corte de Integridade de Disco:</strong> {{ props.userConfig.diskHealth }}%</p>
          </div>
        </div>

      </div>
    </main>
  </div>
</template>

<style scoped>
.production-layout {
  background-color: #0d0b14;
}
.production-sidebar {
  border-right: 1px solid rgba(139, 92, 246, 0.2) !important;
}
.desc-text {
  color: #9ca3af;
  font-size: 0.9rem;
}
.config-summary-card {
  background: #161224;
  border: 1px solid #2e1f4d;
  padding: 20px;
  border-radius: 6px;
  margin-top: 15px;
}
.config-summary-card p {
  margin: 8px 0;
  color: #c0b6e4;
}
</style>