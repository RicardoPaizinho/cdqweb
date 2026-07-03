<template>
  <div class="disk-smart-container">
    <div class="header-actions">
      <h3>Diagnóstico de Integridade (S.M.A.R.T)</h3>
      <div class="controls">
        <select v-model="selectedDisk" @change="fetchDiskDetails" :disabled="loading">
          <option value="" disabled>Selecione um disco...</option>
          <option v-for="disk in diskList" :key="disk.Device" :value="disk.Device">
            {{ disk.Device }} ({{ disk.Protocol }})
          </option>
        </select>
        <button @click="refreshDiskList" :disabled="loading" class="btn-refresh">
          {{ loading ? 'Carregando...' : 'Atualizar Lista' }}
        </button>
      </div>
    </div>

    <div v-if="errorMessage" class="error-banner">
      {{ errorMessage }}
    </div>

    <div v-if="selectedDisk" class="test-actions">
      <button @click="runTest('short')" :disabled="testLoading" class="btn-test btn-short">
        {{ testLoading ? 'Executando...' : 'Teste Rápido (Short)' }}
      </button>
      <button @click="runTest('long')" :disabled="testLoading" class="btn-test btn-long">
        {{ testLoading ? 'Executando...' : 'Teste Completo (Long)' }}
      </button>
    </div>

    <div v-if="diskData" class="smart-content">
      <div class="health-badge" :class="diskData.smart_status?.passed ? 'status-good' : 'status-bad'">
        Status Geral: {{ diskData.smart_status?.passed ? 'SAUDÁVEL' : 'ALERTA' }}
      </div>

      <div class="info-grid">
        <div class="info-card">
          <span>Modelo:</span>
          <strong>{{ diskData.model_name || 'N/A' }}</strong>
        </div>
        <div class="info-card">
          <span>Power on Time:</span>
          <strong>{{ diskData.power_on_time || 'N/A' }}</strong>
        </div>
        <div class="info-card">
          <span>Capacidade:</span>
          <strong>{{ formatCapacity(diskData.user_capacity?.bytes) }}</strong>
        </div>
      </div>

      <table class="smart-table" v-if="smartAttributes.length">
        <thead>
          <tr>
            <th>ID</th>
            <th>Atributo</th>
            <th>Valor Real</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="attr in smartAttributes" :key="attr.id">
            <td>{{ attr.id }}</td>
            <td>{{ attr.name }}</td>
            <td>{{ attr.raw_value }}</td>
            <td :class="attr.flags?.prefailure ? 'text-warning' : 'text-ok'">
              {{ attr.flags?.prefailure ? 'Crítico' : 'OK' }}
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty-state">
        Nenhum atributo SMART detalhado disponível para este protocolo.
      </div>
    </div>

    <div v-else-if="!loading" class="empty-state">
      Selecione um disco para ver os detalhes técnicos.
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      diskList: [],
      selectedDisk: '',
      diskData: null,
      loading: false,
      testLoading: false,
      errorMessage: ''
    };
  },
  computed: {
    smartAttributes() {
      if (!this.diskData) return [];
      
      if (this.diskData.ata_smart_attributes?.table) {
        return this.diskData.ata_smart_attributes.table.map(item => ({
          id: item.id,
          name: item.name,
          raw_value: item.raw?.string || 'N/A',
          flags: item.flags
        }));
      }
      return [];
    }
  },
  methods: {
    formatCapacity(bytes) {
      if (!bytes) return 'N/A';
      return (bytes / Math.pow(1024, 3)).toFixed(2) + ' GB';
    },

    refreshDiskList() {
      console.log("[VUE] Solicitando lista de discos...");
      this.loading = true;
      this.errorMessage = '';
      if (window.chrome?.webview) {
        window.chrome.webview.postMessage("LIST_DISKS");
      }
    },

    fetchDiskDetails() {
      if (!this.selectedDisk) return;
      console.log("[VUE] Solicitando detalhes do disco:", this.selectedDisk);
      this.loading = true;
      if (window.chrome?.webview) {
        window.chrome.webview.postMessage(`GET_SMART_DETAILS|${this.selectedDisk}`);
      }
    },

    runTest(type) {
      if (!this.selectedDisk) {
        alert("Selecione um disco primeiro.");
        return;
      }
      
      this.testLoading = true;
      console.log(`[VUE] Iniciando teste ${type} para o disco: ${this.selectedDisk}`);

      if (window.chrome?.webview) {
        // Envia o comando estruturado para o C# executar no smartctl (ex: RUN_TEST|short|/dev/sda)
        window.chrome.webview.postMessage(`RUN_TEST|${type}|${this.selectedDisk}`);
      }

      // Simulando o tempo de resposta ou aguardando o C# responder
      setTimeout(() => {
        this.testLoading = false;
        alert(`Teste ${type.toUpperCase()} iniciado com sucesso!`);
      }, 2000);
    },

    handleNativeMessage(event) {
      const response = event.data;
      console.log("[VUE] Dados Brutos:", response);

      if (response.type === 'DISK_LIST') {
        this.diskList = Array.isArray(response.data) ? response.data : [];
        this.loading = false;
      } 
      else if (response.type === "SMART_DATA") {
        try {
          const smartObject = JSON.parse(response.payload);
          console.log("[VUE] SMART Payload Detalhado:", smartObject);
          this.diskData = smartObject;
          this.loading = false;
        } catch (e) {
          console.error("[VUE] Erro no Parse do SMART:", e);
          this.loading = false;
        }
      }
      else if (response.type === "SMART_ERROR") {
        this.errorMessage = response.message;
        this.loading = false;
      }
    }
  },
  mounted() {
    if (window.chrome?.webview) {
      window.chrome.webview.addEventListener('message', this.handleNativeMessage);
      this.refreshDiskList();
    }
  },
  beforeUnmount() {
    if (window.chrome?.webview) {
      window.chrome.webview.removeEventListener('message', this.handleNativeMessage);
    }
  }
};
</script>

<style scoped>
.disk-smart-container { padding: 20px; color: #e0e0e0; background: #121212; border-radius: 8px; }
.header-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #333; padding-bottom: 10px; }
.controls { display: flex; gap: 10px; }

.error-banner { background: #c0392b; color: white; padding: 10px; border-radius: 4px; margin-bottom: 15px; }

select {
  background: #2a2a2a;
  color: white;
  border: 1px solid #444;
  padding: 8px;
  border-radius: 4px;
  min-width: 200px;
}

.btn-refresh {
  background: #2980b9;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-refresh:hover { background: #3498db; }
.btn-refresh:disabled { background: #555; cursor: not-allowed; }

.test-actions {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
}

.btn-test {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 6px;
  color: white;
  font-weight: bold;
  cursor: pointer;
}

.btn-short {
  background: #27ae60;
}
.btn-short:hover {
  background: #2ecc71;
}

.btn-long {
  background: #d35400;
}
.btn-long:hover {
  background: #e67e22;
}

.info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin: 20px 0; }
.info-card { background: #1e1e1e; padding: 15px; border-radius: 8px; border-left: 4px solid #2980b9; }

.smart-table { width: 100%; border-collapse: collapse; background: #1e1e1e; border-radius: 8px; overflow: hidden; }
.smart-table th { background: #252525; padding: 12px; text-align: left; color: #888; }
.smart-table td { padding: 12px; border-bottom: 1px solid #2a2a2a; }

.status-good { color: #2ecc71; font-weight: bold; background: rgba(46, 204, 113, 0.1); padding: 10px; border-radius: 5px; }
.status-bad { color: #e74c3c; font-weight: bold; background: rgba(231, 76, 60, 0.1); padding: 10px; border-radius: 5px; }
.text-warning { color: #f1c40f; }
.text-ok { color: #2ecc71; }
.empty-state { text-align: center; padding: 40px; color: #666; }
</style>