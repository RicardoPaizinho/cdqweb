<script setup>
// Página de Dashboard — visão geral e consultas ao banco de dados.
// Consome o servidor Node em app.cdqweb.com.br para trazer estatísticas
// e o histórico de diagnósticos já registrados.
defineOptions({ name: 'DashboardView' });

import { onMounted, onUnmounted, ref, computed } from 'vue';
import { globalState } from './store.js';

// --- CONFIGURAÇÃO DA API DO SERVIDOR NODE ---
const API_BASE_URL = 'https://app.cdqweb.com.br/api';

const user = computed(() => globalState.user);

// --- ESTADOS ---
const loading = ref(false);
const errorMsg = ref('');
const stats = ref({
  totalDiagnosticos: 0,
  aprovados: 0,
  reprovados: 0,
  emAndamento: 0
});
const registros = ref([]); // histórico vindo do banco
const filtroLocal = ref('todos');
const filtroStatus = ref('todos');
let refreshInterval = null;

const locaisDisponiveis = computed(() => {
  const set = new Set(registros.value.map(r => r.local).filter(Boolean));
  return ['todos', ...set];
});

const registrosFiltrados = computed(() => {
  return registros.value.filter(r => {
    const okLocal = filtroLocal.value === 'todos' || r.local === filtroLocal.value;
    const okStatus = filtroStatus.value === 'todos' || r.status === filtroStatus.value;
    return okLocal && okStatus;
  });
});

// --- REQUISIÇÕES AO BANCO (via servidor Node) ---
async function fetchStats() {
  try {
    const response = await fetch(`${API_BASE_URL}/dashboard/stats`, {
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Falha ao buscar estatísticas.');
    const data = await response.json();
    stats.value = {
      totalDiagnosticos: data.totalDiagnosticos || 0,
      aprovados: data.aprovados || 0,
      reprovados: data.reprovados || 0,
      emAndamento: data.emAndamento || 0
    };
  } catch (err) {
    console.error('Erro ao buscar estatísticas do dashboard:', err);
    errorMsg.value = 'Não foi possível carregar as estatísticas.';
  }
}

async function fetchRegistros() {
  loading.value = true;
  errorMsg.value = '';
  try {
    const response = await fetch(`${API_BASE_URL}/dashboard/diagnosticos`, {
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error('Falha ao buscar registros.');
    const data = await response.json();
    registros.value = Array.isArray(data) ? data : [];
  } catch (err) {
    console.error('Erro ao buscar registros do dashboard:', err);
    errorMsg.value = 'Não foi possível carregar o histórico de diagnósticos.';
  } finally {
    loading.value = false;
  }
}

async function refreshAll() {
  await Promise.all([fetchStats(), fetchRegistros()]);
}

onMounted(() => {
  refreshAll();
  // Atualiza os dados periodicamente (a cada 30s)
  refreshInterval = setInterval(refreshAll, 30000);
});

onUnmounted(() => {
  if (refreshInterval) clearInterval(refreshInterval);
});
</script>

<template>
  <div class="dashboard-container">
    <div class="dashboard-header">
      <div>
        <h2 class="section-title">Dashboard</h2>
        <p class="user-context" v-if="user">
          {{ user.nome }} <span class="dot">•</span> {{ user.tipo }} <span class="dot">•</span> {{ user.local }}
        </p>
      </div>
      <button class="btn-refresh" @click="refreshAll" :disabled="loading">
        {{ loading ? 'Atualizando...' : 'Atualizar' }}
      </button>
    </div>

    <p v-if="errorMsg" class="error-banner">{{ errorMsg }}</p>

    <!-- CARDS DE ESTATÍSTICAS -->
    <div class="stats-grid">
      <div class="stat-card">
        <h3>Total de Diagnósticos</h3>
        <p class="stat-value">{{ stats.totalDiagnosticos }}</p>
      </div>
      <div class="stat-card approved">
        <h3>Aprovados</h3>
        <p class="stat-value">{{ stats.aprovados }}</p>
      </div>
      <div class="stat-card rejected">
        <h3>Reprovados</h3>
        <p class="stat-value">{{ stats.reprovados }}</p>
      </div>
      <div class="stat-card pending">
        <h3>Em Andamento</h3>
        <p class="stat-value">{{ stats.emAndamento }}</p>
      </div>
    </div>

    <!-- FILTROS -->
    <div class="filters-bar">
      <div class="filter-group">
        <label>Local</label>
        <select v-model="filtroLocal">
          <option v-for="local in locaisDisponiveis" :key="local" :value="local">{{ local }}</option>
        </select>
      </div>
      <div class="filter-group">
        <label>Status</label>
        <select v-model="filtroStatus">
          <option value="todos">todos</option>
          <option value="Aprovado">Aprovado</option>
          <option value="Reprovado">Reprovado</option>
          <option value="Em andamento">Em andamento</option>
        </select>
      </div>
    </div>

    <!-- TABELA DE REGISTROS (CONSULTA AO BANCO) -->
    <div class="table-wrapper">
      <table class="records-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>O.S</th>
            <th>Modelo</th>
            <th>Local</th>
            <th>Responsável</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="6" class="empty-state">Carregando registros...</td>
          </tr>
          <tr v-else-if="registrosFiltrados.length === 0">
            <td colspan="6" class="empty-state">Nenhum registro encontrado.</td>
          </tr>
          <tr v-for="registro in registrosFiltrados" :key="registro.id">
            <td>{{ registro.data }}</td>
            <td>{{ registro.ordem }}</td>
            <td>{{ registro.modelo }}</td>
            <td>{{ registro.local }}</td>
            <td>{{ registro.responsavel }}</td>
            <td>
              <span class="status-badge" :class="{
                approved: registro.status === 'Aprovado',
                rejected: registro.status === 'Reprovado',
                pending: registro.status === 'Em andamento'
              }">{{ registro.status }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.dashboard-container {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  color: var(--text-dim);
  height: 100%;
  overflow-y: auto;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.section-title {
  color: var(--text-main);
  font-weight: 700;
  margin-bottom: 0.3rem;
}

.user-context {
  font-size: 0.8rem;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.dot {
  margin: 0 6px;
  opacity: 0.5;
}

.btn-refresh {
  background-color: var(--accent);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.6rem 1.2rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease;
}

.btn-refresh:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-banner {
  background: rgba(231, 76, 60, 0.1);
  border: 1px solid #e74c3c;
  color: #e74c3c;
  padding: 0.7rem 1rem;
  border-radius: 8px;
  margin-bottom: 1.2rem;
  font-size: 0.85rem;
}

/* CARDS */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.2rem;
  margin-bottom: 2rem;
}

.stat-card {
  background-color: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.4rem;
}

.stat-card h3 {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-dim);
  opacity: 0.8;
  margin-bottom: 0.6rem;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-main);
  font-family: var(--font-mono, 'Consolas', monospace);
}

.stat-card.approved .stat-value { color: #2ecc71; }
.stat-card.rejected .stat-value { color: #e74c3c; }
.stat-card.pending .stat-value { color: #f1c40f; }

/* FILTROS */
.filters-bar {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1.2rem;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.filter-group label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-dim);
}

.filter-group select {
  background-color: var(--bg-panel);
  border: 1px solid var(--border);
  color: var(--text-main);
  border-radius: 6px;
  padding: 0.5rem 0.8rem;
  min-width: 160px;
}

/* TABELA */
.table-wrapper {
  background-color: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
}

.records-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.records-table th {
  text-align: left;
  padding: 0.9rem 1rem;
  background-color: rgba(255, 255, 255, 0.03);
  color: var(--text-dim);
  text-transform: uppercase;
  font-size: 0.7rem;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--border);
}

.records-table td {
  padding: 0.8rem 1rem;
  border-bottom: 1px solid var(--border);
  color: var(--text-main);
}

.records-table tr:last-child td {
  border-bottom: none;
}

.empty-state {
  text-align: center;
  padding: 2rem !important;
  color: var(--text-dim);
  opacity: 0.7;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.7rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.08);
}

.status-badge.approved {
  background: rgba(46, 204, 113, 0.15);
  color: #2ecc71;
}

.status-badge.rejected {
  background: rgba(231, 76, 60, 0.15);
  color: #e74c3c;
}

.status-badge.pending {
  background: rgba(241, 196, 15, 0.15);
  color: #f1c40f;
}
</style>
