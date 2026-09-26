<script setup>
import { ref, onMounted, computed } from 'vue';
import bsodEventsRaw from '@/data/bsodEvents.json';
import { getCauseForCode } from '@/data/bsodCauses.js';

// --- CONFIGURAÇÃO DA API LOCAL (agente C#) ---
const API_BASE_URL = 'http://localhost:5000/api';

const logs = ref([]);
const isLoading = ref(true);
const searchQuery = ref('');
const connectionError = ref('');

// Mapa código (decimal) -> nome oficial do bugcheck (fonte: catálogo da Microsoft).
const BUGCHECK_NAMES = new Map(
  bsodEventsRaw
    .map(ev => [parseInt(ev.id, 16), ev.data.description])
    .filter(([code]) => !Number.isNaN(code))
);

// O texto do Windows traz o código de parada com exatamente 8 dígitos hex
// (ex: "...bugcheck was: 0x0000007e (0xffffffffc0000005, ...)"), enquanto os
// parâmetros ao lado costumam ter 16 dígitos — por isso o \b no fim evita
// casar no meio de um parâmetro maior.
function extractStopCode(msg) {
  if (!msg) return null;
  const match = msg.match(/0x[0-9A-Fa-f]{8}\b/);
  if (!match) return null;
  return parseInt(match[0], 16);
}

function classify(log) {
  const source = (log.origin || '').toLowerCase();
  const id = Number(log.eventId) & 0xFFFF;

  if (source.includes('kernel-power') && id === 41) {
    return {
      type: 'shutdown',
      typeLabel: 'DESLIGAMENTO',
      name: 'KERNEL-POWER 41 — DESLIGAMENTO SEM AVISO PRÉVIO',
      code: null,
      causa: 'Queda de energia, trava total do sistema (freeze) ou desligamento forçado (botão físico). Verificar fonte/bateria, superaquecimento e estabilidade geral.'
    };
  }
  if (source === 'eventlog' && id === 6008) {
    return {
      type: 'shutdown',
      typeLabel: 'DESLIGAMENTO',
      name: 'EVENTLOG 6008 — DESLIGAMENTO ANTERIOR INESPERADO',
      code: null,
      causa: 'O Windows não conseguiu registrar a causa do desligamento anterior. Tratar como possível queda de energia ou travamento — investigar junto com outros eventos próximos no horário.'
    };
  }

  const code = extractStopCode(log.msg);
  const name = code != null ? (BUGCHECK_NAMES.get(code) || 'CÓDIGO DE PARADA NÃO CATALOGADO') : 'TELA AZUL (código não identificado na mensagem)';
  const causa = getCauseForCode(code);
  return { type: 'bsod', typeLabel: 'TELA AZUL', name, code, causa };
}

async function fetchLogs() {
  try {
    const response = await fetch(`${API_BASE_URL}/eventlog`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    logs.value = await response.json();
    connectionError.value = '';
  } catch (err) {
    connectionError.value = 'Não foi possível conectar ao agente local (porta 5000). Verifique se o HardwareTestApp está em execução.';
    console.error('Erro ao buscar Event Log:', err);
  } finally {
    isLoading.value = false;
  }
}

async function refresh() {
  isLoading.value = true;
  try {
    const response = await fetch(`${API_BASE_URL}/eventlog/refresh`, { method: 'POST' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    logs.value = await response.json();
    connectionError.value = '';
  } catch (err) {
    connectionError.value = 'Não foi possível reexecutar a busca no agente local.';
    console.error('Erro ao atualizar Event Log:', err);
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  fetchLogs();
});

// Enriquece cada log com tipo/nome/causa antes de exibir — feito uma vez aqui
// em vez de recalcular tudo isso dentro do template.
const enrichedLogs = computed(() => logs.value.map(log => ({ ...log, ...classify(log) })));

// FILTRO DE BUSCA LOCAL (agora também busca por código e causa, não só mensagem crua)
const filteredLogs = computed(() => {
  if (!searchQuery.value) return enrichedLogs.value;
  const q = searchQuery.value.toLowerCase();
  return enrichedLogs.value.filter(log =>
    log.name?.toLowerCase().includes(q) ||
    log.origin?.toLowerCase().includes(q) ||
    log.causa?.toLowerCase().includes(q)
  );
});
</script>

<template>
  <div class="log-container">
    <div class="log-header">
      <div class="title-section">
        <h2>HISTÓRICO DE FALHAS DO SISTEMA</h2>
        <p>Telas azuis e desligamentos inesperados, com possível causa (Últimos 30 eventos)</p>
      </div>

      <div class="actions">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Filtrar evento ou causa..."
          class="search-input"
        />
        <button @click="refresh" class="btn-refresh" :disabled="isLoading">
          {{ isLoading ? 'BUSCANDO...' : 'ATUALIZAR' }}
        </button>
      </div>
    </div>

    <p v-if="connectionError" class="connection-error">{{ connectionError }}</p>

    <div class="table-wrapper">
      <table v-if="!isLoading && filteredLogs.length > 0">
        <thead>
          <tr>
            <th width="110">TIPO</th>
            <th width="170">DATA / HORA</th>
            <th width="100">CÓDIGO</th>
            <th width="260">EVENTO</th>
            <th>POSSÍVEL CAUSA</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(log, index) in filteredLogs" :key="index" :class="log.type === 'bsod' ? 'row-bsod' : 'row-power'">
            <td>
              <span :class="['badge', log.type === 'bsod' ? 'badge-bsod' : 'badge-shutdown']">
                {{ log.typeLabel }}
              </span>
            </td>
            <td class="col-date">{{ log.date }}</td>
            <td class="col-code">{{ log.code != null ? '0x' + log.code.toString(16).toUpperCase().padStart(8, '0') : '—' }}</td>
            <td class="col-name" :title="log.msg">{{ log.name }}</td>
            <td class="col-causa" :class="{ 'causa-desconhecida': !log.causa }">
              {{ log.causa || 'Causa não catalogada — consultar mensagem completa do evento.' }}
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="isLoading" class="state-info">
        <div class="spinner"></div>
        <p>Acessando registros do Windows...</p>
      </div>

      <div v-else-if="!connectionError && filteredLogs.length === 0" class="state-info">
        <p>✅ Nenhuma tela azul ou desligamento inesperado detectado recentemente.</p>
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
  margin-bottom: 15px;
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
.btn-refresh:disabled { opacity: 0.6; cursor: not-allowed; }

.connection-error {
  background: rgba(255, 71, 71, 0.1);
  border: 1px solid #ff4747;
  color: #ff4747;
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 0.8rem;
  margin-bottom: 15px;
}

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

/* Badges de tipo */
.badge { padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 0.7rem; white-space: nowrap; }
.badge-bsod { background: #0050ff; color: white; box-shadow: 0 0 8px rgba(0, 80, 255, 0.4); }
.badge-shutdown { background: rgba(255, 165, 0, 0.2); color: #ffa500; border: 1px solid #ffa500; }

/* Destaques por linha */
.row-bsod { background: rgba(0, 80, 255, 0.08) !important; }
.row-power { background: rgba(255, 165, 0, 0.06) !important; }

.col-date { color: #888; white-space: nowrap; }
.col-code { font-family: 'Consolas', monospace; color: #66fcf1; }
.col-name { color: #e0e0e0; font-weight: bold; }

/* Causa provável — o dado mais importante pro técnico, precisa se destacar */
.col-causa { color: #ffd166; font-weight: 600; }
.col-causa.causa-desconhecida { color: #777; font-weight: normal; font-style: italic; }

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
