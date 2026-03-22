<template>
  <div class="reports-container">
    <div class="header-actions">
      <h2 class="section-title">Histórico de Diagnósticos</h2>
      <button class="btn-clear" @click="clearReports" v-if="globalState.testReports.length > 0">
        Limpar Histórico
      </button>
    </div>

    <div v-if="globalState.testReports.length === 0" class="empty-state">
      <Icons name="test-list" size="64" class="empty-icon" />
      <p>Nenhum relatório encontrado no banco de dados.</p>
    </div>

    <div v-else class="table-wrapper">
      <table class="modern-table">
        <thead>
          <tr>
            <th>ID / O.S.</th>
            <th>Equipamento</th>
            <th>Data</th>
            <th>Status</th>
            <th class="text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="report in globalState.testReports" :key="report.id" class="table-row">
            <td class="os-cell">#{{ report.os || '0001' }}</td>
            <td class="name-cell">
              <span class="device-name">{{ report.name }}</span>
            </td>
            <td class="date-cell">{{ report.date }}</td>
            <td class="status-cell">
              <span :class="['status-badge', report.status.toLowerCase()]">
                {{ report.status }}
              </span>
            </td>
            <td class="actions-cell text-right">
              <button class="btn-detail" @click="viewDetails(report)">
                <Icons name="info" size="18" />
                Detalhes
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { globalState } from '@/store.js';
import Icons from '@/components/common/Icons.vue';

const viewDetails = (report) => {
  console.log("Abrindo detalhes de:", report.id);
  // Aqui você pode abrir um modal com o JSON completo do hardware
};

const clearReports = () => {
  if(confirm("Deseja apagar todos os relatórios?")) {
    globalState.testReports = [];
  }
};
</script>
<style scoped>
.reports-container {
  padding: 10px;
  animation: fadeIn 0.5s ease;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.table-wrapper {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.modern-table {
  width: 100%;
  border-collapse: collapse;
  color: var(--text-main);
}

.modern-table th {
  text-align: left;
  padding: 15px 20px;
  background: rgba(0, 0, 0, 0.3);
  color: var(--accent);
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 1px;
}

.table-row {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.2s ease;
}

.table-row:hover {
  background: rgba(255, 136, 0, 0.05); /* Glow laranja sutil ao passar o mouse */
  transform: scale(1.002);
}

.modern-table td {
  padding: 15px 20px;
  font-size: 0.9rem;
}

/* Estilo das Badges de Status */
.status-badge {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: bold;
  text-transform: uppercase;
}

.status-badge.aprovado {
  background: rgba(0, 255, 136, 0.1);
  color: #00ff88;
  border: 1px solid rgba(0, 255, 136, 0.3);
}

.status-badge.reprovado {
  background: rgba(255, 68, 68, 0.1);
  color: #ff4444;
  border: 1px solid rgba(255, 68, 68, 0.3);
}

/* Botão de Detalhes */
.btn-detail {
  background: transparent;
  border: 1px solid var(--accent);
  color: var(--accent);
  padding: 6px 12px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: 0.3s;
}

.btn-detail:hover {
  background: var(--accent);
  color: #000;
  box-shadow: 0 0 15px var(--accent-glow);
}

.text-right { text-align: right; }

.empty-state {
  text-align: center;
  padding: 100px;
  color: var(--text-dim);
}

.empty-icon {
  opacity: 0.2;
  margin-bottom: 20px;
}
</style>