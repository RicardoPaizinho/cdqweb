<template>
  <div class="reports-container">
    <div class="header-actions">
      <h2 class="section-title">Relatório de Diagnóstico</h2>
      <button class="btn-clear" @click="clearReports" v-if="globalState.testReports.length > 0">
        Limpar Histórico
      </button>
    </div>

    <!-- PAINEL DE FECHAMENTO DO RELATÓRIO -->
    <div class="closing-panel">
      <div class="closing-grid">
        <div class="field">
          <label class="field-label">Número da O.S.</label>
          <input
            v-model="globalState.currentOS"
            type="text"
            class="field-input"
            placeholder="Ex: 000123"
          />
        </div>

        <div class="field">
          <label class="field-label">Status Geral</label>
          <div class="status-display" :class="statusClass">
            {{ statusLabel }}
          </div>
        </div>
      </div>

      <div class="field">
        <label class="field-label">Comentários</label>
        <textarea
          v-model="globalState.reportComments"
          class="field-textarea"
          rows="3"
          placeholder="Observações sobre o diagnóstico (opcional)..."
        ></textarea>
      </div>

      <!-- RESUMO DOS TESTES EXECUTADOS -->
      <div class="tests-summary">
        <span
          v-for="(test, key) in globalState.testResults"
          :key="key"
          class="summary-chip"
          :class="{
            'chip-pass': test.result === 'PASS',
            'chip-fail': test.result === 'FAIL',
            'chip-pending': !test.result
          }"
        >
          {{ test.label }}
        </span>
      </div>

      <p v-if="globalState.saveReportError" class="save-error">{{ globalState.saveReportError }}</p>

      <div class="closing-actions">
        <button
          class="btn-save"
          :disabled="globalState.savingReport || !globalState.overallTestStatus"
          @click="handleSave"
        >
          {{ globalState.savingReport ? 'Salvando...' : 'Salvar Relatório no Banco de Dados' }}
        </button>
      </div>
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
import { computed } from 'vue';
import { globalState } from '@/store.js';
import Icons from '@/components/common/Icons.vue';

const statusLabel = computed(() => {
  const status = globalState.overallTestStatus;
  if (status === 'PASS') return 'PASS';
  if (status === 'FAIL') return 'FAIL';
  return 'Aguardando testes...';
});

const statusClass = computed(() => {
  const status = globalState.overallTestStatus;
  if (status === 'PASS') return 'status-pass';
  if (status === 'FAIL') return 'status-fail';
  return 'status-idle';
});

const handleSave = async () => {
  const ok = await globalState.saveFinalReport(globalState.currentOS, globalState.reportComments);
  if (ok) {
    alert('Relatório salvo com sucesso!');
  }
};

const viewDetails = (report) => {
  console.log('Abrindo detalhes de:', report.id);
  // Aqui você pode abrir um modal com o JSON completo do hardware
};

const clearReports = () => {
  if (confirm('Deseja apagar todos os relatórios?')) {
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

/* --- PAINEL DE FECHAMENTO --- */
.closing-panel {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 25px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.closing-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-dim);
}

.field-input,
.field-textarea {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 10px 12px;
  color: var(--text-main);
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s ease;
  font-family: inherit;
  resize: vertical;
}

.field-input:focus,
.field-textarea:focus {
  border-color: var(--accent);
}

.status-display {
  padding: 10px 12px;
  border-radius: 8px;
  font-weight: 700;
  letter-spacing: 1px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.status-idle { color: var(--text-dim); }

.status-pass {
  background: rgba(0, 255, 136, 0.1);
  color: #00ff88;
  border-color: rgba(0, 255, 136, 0.3);
}

.status-fail {
  background: rgba(255, 68, 68, 0.1);
  color: #ff4444;
  border-color: rgba(255, 68, 68, 0.3);
}

/* --- RESUMO DE TESTES (CHIPS) --- */
.tests-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.summary-chip {
  font-size: 0.7rem;
  padding: 4px 10px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.chip-pass { color: #00ff88; border-color: rgba(0, 255, 136, 0.3); background: rgba(0, 255, 136, 0.08); }
.chip-fail { color: #ff4444; border-color: rgba(255, 68, 68, 0.3); background: rgba(255, 68, 68, 0.08); }
.chip-pending { color: var(--text-dim); opacity: 0.6; }

.save-error {
  background: rgba(231, 76, 60, 0.1);
  border: 1px solid #e74c3c;
  color: #e74c3c;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.8rem;
}

.closing-actions {
  display: flex;
  justify-content: flex-end;
}

.btn-save {
  background-color: var(--accent);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* --- TABELA (ORIGINAL) --- */
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
  background: rgba(255, 136, 0, 0.05);
  transform: scale(1.002);
}

.modern-table td {
  padding: 15px 20px;
  font-size: 0.9rem;
}

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
  padding: 60px;
  color: var(--text-dim);
}

.empty-icon {
  opacity: 0.2;
  margin-bottom: 20px;
}
</style>