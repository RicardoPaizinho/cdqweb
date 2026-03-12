<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';

const logs = ref([]);
const isLoading = ref(true);
const searchQuery = ref('');

// 1. ESCUTAR MENSAGENS DO C#
const handleNativeMessage = (event) => {
  const data = event.data;
  if (data.type === 'eventLogs') {
    logs.value = data.data;
    isLoading.value = false;
  }
};

// 2. SOLICITAR DADOS AO MONTAR
onMounted(async () => {
  if (window.chrome?.webview?.hostObjects?.nativeBridge) {
    window.chrome.webview.addEventListener('message', handleNativeMessage);
    
    // Solicita os logs (agora filtrados por Crítico/Erro no C#)
    const bridge = window.chrome.webview.hostObjects.nativeBridge;
    await bridge.RequestLogs();
  }
});

onUnmounted(() => {
  window.chrome.webview.removeEventListener('message', handleNativeMessage);
});

// 3. LÓGICA DE ESTILO POR ORIGEM E NÍVEL
const getRowClass = (item) => {
  const origin = item.origin?.toLowerCase() || '';
  if (origin.includes('bugcheck')) return 'row-bsod';
  if (origin.includes('kernel-power')) return 'row-power';
  return '';
};

const getBadgeClass = (level) => {
  return level === 'Critical' ? 'badge-critical' : 'badge-error';
};

// 4. FILTRO DE BUSCA LOCAL (Opcional, para facilitar a vida do técnico)
const filteredLogs = computed(() => {
  if (!searchQuery.value) return logs.value;
  return logs.value.filter(log => 
    log.msg.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    log.origin.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

const refresh = () => {
  isLoading.value = true;
  window.chrome.webview.hostObjects.nativeBridge.RequestLogs();
};
</script>

<template>
  <div class="log-container">
    <div class="log-header">
      <div class="title-section">
        <h2>HISTÓRICO DE FALHAS DO SISTEMA</h2>
        <p>Exibindo apenas Erros Críticos e Falhas de Hardware (Últimos 30 eventos)</p>
      </div>
      
      <div class="actions">
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Filtrar origem ou mensagem..." 
          class="search-input"
        />
        <button @click="refresh" class="btn-refresh" :disabled="isLoading">
          {{ isLoading ? 'BUSCANDO...' : 'ATUALIZAR' }}
        </button>
      </div>
    </div>

    <div class="table-wrapper">
      <table v-if="!isLoading && filteredLogs.length > 0">
        <thead>
          <tr>
            <th width="100">NÍVEL</th>
            <th width="150">ORIGEM</th>
            <th width="180">DATA / HORA</th>
            <th width="80">ID</th>
            <th>DESCRIÇÃO DO EVENTO</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(log, index) in filteredLogs" :key="index" :class="getRowClass(log)">
            <td>
              <span :class="['badge', getBadgeClass(log.level)]">
                {{ log.level }}
              </span>
            </td>
            <td class="col-origin">{{ log.origin }}</td>
            <td class="col-date">{{ log.date }}</td>
            <td class="col-id">{{ log.eventId }}</td>
            <td class="col-msg" :title="log.msg">{{ log.msg }}</td>
          </tr>
        </tbody>
      </table>

      <div v-if="isLoading" class="state-info">
        <div class="spinner"></div>
        <p>Acessando registros do Windows...</p>
      </div>
      
      <div v-else-if="filteredLogs.length === 0" class="state-info">
        <p>✅ Nenhum erro crítico ou tela azul detectada recentemente.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.log-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #0b0c10;
  color: #c5c6c7;
  padding: 20px;
  font-family: 'Segoe UI', sans-serif;
}

/* Header */
.log-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 20px;
  border-bottom: 1px solid #1f2833;
  padding-bottom: 15px;
}
.title-section h2 { color: #66fcf1; margin: 0; font-size: 1.2rem; letter-spacing: 1px; }
.title-section p { font-size: 0.8rem; color: #45a29e; margin: 5px 0 0; }

/* Actions */
.actions { display: flex; gap: 10px; }
.search-input {
  background: #1f2833;
  border: 1px solid #45a29e;
  border-radius: 4px;
  padding: 8px 12px;
  color: white;
  width: 250px;
}
.btn-refresh {
  background: #45a29e;
  border: none;
  border-radius: 4px;
  color: #0b0c10;
  font-weight: bold;
  padding: 0 20px;
  cursor: pointer;
  transition: 0.3s;
}
.btn-refresh:hover { background: #66fcf1; }

/* Tabela */
.table-wrapper {
  flex-grow: 1;
  overflow-y: auto;
  background: #14161f;
  border-radius: 8px;
  border: 1px solid #1f2833;
}
table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
th { 
  background: #1f2833; 
  text-align: left; 
  padding: 12px; 
  position: sticky; 
  top: 0; 
  color: #66fcf1; 
  font-size: 0.75rem;
}
td { padding: 12px; border-bottom: 1px solid #0b0c10; vertical-align: middle; }

/* Badges */
.badge { padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 0.7rem; }
.badge-critical { background: #ff0000; color: white; box-shadow: 0 0 8px rgba(255, 0, 0, 0.4); }
.badge-error { background: rgba(255, 68, 68, 0.2); color: #ff4444; border: 1px solid #ff4444; }

/* Destaques por Origem */
.row-bsod { background: rgba(0, 80, 255, 0.15) !important; }
.row-bsod .col-origin { color: #00d2ff; font-weight: bold; }

.row-power { background: rgba(255, 165, 0, 0.1) !important; }
.row-power .col-origin { color: #ffa500; font-weight: bold; }

.col-origin { font-family: 'Consolas', monospace; }
.col-date { color: #888; }
.col-msg { 
  max-width: 300px; 
  white-space: nowrap; 
  overflow: hidden; 
  text-overflow: ellipsis; 
  color: #aaa;
}

/* Estados */
.state-info { padding: 100px; text-align: center; }
.spinner {
  width: 30px; height: 30px;
  border: 3px solid #1f2833;
  border-top-color: #66fcf1;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 15px;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>