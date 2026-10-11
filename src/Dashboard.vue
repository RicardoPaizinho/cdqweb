<script setup>
// Página de Dashboard — produção diária do técnico (ou da região toda) em cards.
// Consome GET /api/dashboard/producao no servidor Node (api.cdqweb.com.br),
// que devolve o registro mais recente de cada O.S. no período escolhido.
defineOptions({ name: 'DashboardView' });

import { onMounted, onUnmounted, ref, computed, watch } from 'vue';
import { globalState } from './store.js';

// --- CONFIGURAÇÃO DA API DO SERVIDOR NODE ---
const API_BASE_URL = 'https://api.cdqweb.com.br/api';

// --- DATAS (sempre no fuso local; toISOString() usaria UTC e viraria o dia às 21h) ---
function toIsoDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function parseIsoDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const hoje = () => toIsoDate(new Date());

const PERIODOS = [
  { id: 'hoje', label: 'Hoje', range: () => [hoje(), hoje()] },
  { id: 'ontem', label: 'Ontem', range: () => { const o = toIsoDate(addDays(new Date(), -1)); return [o, o]; } },
  { id: '7dias', label: '7 dias', range: () => [toIsoDate(addDays(new Date(), -6)), hoje()] },
  { id: 'mes', label: 'Este mês', range: () => { const n = new Date(); return [toIsoDate(new Date(n.getFullYear(), n.getMonth(), 1)), hoje()]; } },
];

// --- ESTADOS ---
const inicio = ref(hoje());
const fim = ref(hoje());
const escopo = ref('meus'); // 'meus' | 'todos' — só o ADM pode trocar
const isAdm = computed(() => globalState.isAdm);
const filtroStatus = ref('todos'); // 'todos' | 'PASS' | 'FAIL'
const loading = ref(false);
const errorMsg = ref('');
const registros = ref([]);
let refreshInterval = null;

// O preset ativo é derivado das datas: editar as datas à mão desmarca os botões.
const periodoAtivo = computed(() => {
  const p = PERIODOS.find((p) => {
    const [i, f] = p.range();
    return i === inicio.value && f === fim.value;
  });
  return p ? p.id : 'custom';
});

function selecionarPeriodo(periodo) {
  const [i, f] = periodo.range();
  inicio.value = i;
  fim.value = f;
}

// --- RESUMO / AGRUPAMENTO ---
const resumo = computed(() => ({
  total: registros.value.length,
  aprovados: registros.value.filter((r) => r.status === 'PASS').length,
  reprovados: registros.value.filter((r) => r.status === 'FAIL').length,
}));

const registrosFiltrados = computed(() =>
  filtroStatus.value === 'todos'
    ? registros.value
    : registros.value.filter((r) => r.status === filtroStatus.value)
);

// Agrupa por dia (o servidor já devolve ordenado do mais recente pro mais antigo)
const grupos = computed(() => {
  const mapa = new Map();
  registrosFiltrados.value.forEach((r) => {
    if (!mapa.has(r.dia)) mapa.set(r.dia, []);
    mapa.get(r.dia).push(r);
  });
  return [...mapa.entries()].map(([dia, itens]) => ({
    dia,
    itens,
    aprovados: itens.filter((r) => r.status === 'PASS').length,
    reprovados: itens.filter((r) => r.status === 'FAIL').length,
  }));
});

const locale = computed(() =>
  globalState.language === 'pt' ? 'pt-BR' : globalState.language === 'en' ? 'en-US' : 'es-ES'
);

function rotuloDia(iso) {
  if (iso === hoje()) return 'Hoje';
  if (iso === toIsoDate(addDays(new Date(), -1))) return 'Ontem';
  const texto = parseIsoDate(iso).toLocaleDateString(locale.value, { weekday: 'long' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function dataCurta(iso) {
  return parseIsoDate(iso).toLocaleDateString(locale.value, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// --- FORMATAÇÃO DOS CAMPOS DO CARD ---
// memoriaDetalhada vem do relatório como "8GB Samsung DDR4 2133Mhz (SN: ..., PN: ...) | ...";
// pegamos tipo e clock do primeiro pente pra montar "8GB DDR4 2133Mhz".
function formatarMemoria(r) {
  const total = (r.memoriaTotal || '').trim();
  const match = /(DDR\d\w*|LPDDR\d\w*)\s+(\d+)\s*Mhz/i.exec(r.memoriaDetalhada || '');
  const extra = match ? `${match[1].toUpperCase()} ${match[2]}Mhz` : '';
  return [total, extra].filter(Boolean).join(' ') || '—';
}

// Campos com vários itens (GPU/discos) são gravados juntos com " | "
const listar = (valor) => String(valor || '').split('|').map((s) => s.trim()).filter(Boolean);

function especificacoes(r) {
  return [
    { label: 'Processador', valores: listar(r.processador) },
    { label: 'Memória', valores: [formatarMemoria(r)] },
    { label: 'Tela', valores: listar(r.tela) },
    { label: 'GPU', valores: listar(r.gpu) },
    { label: 'Armazenamento', valores: listar(r.armazenamento) },
    { label: 'Sistema', valores: listar(r.sistema) },
  ].map((s) => ({ ...s, valores: s.valores.length ? s.valores : ['—'] }));
}

function rotuloStatus(r) {
  if (r.status === 'PASS') return globalState.t('status.approved');
  if (r.status === 'FAIL') return globalState.t('status.rejected');
  return r.statusOriginal || '—';
}

// --- REQUISIÇÃO AO BANCO (via servidor Node) ---
async function fetchProducao() {
  // Garante intervalo válido mesmo que o usuário inverta as datas
  if (inicio.value > fim.value) [inicio.value, fim.value] = [fim.value, inicio.value];

  loading.value = true;
  errorMsg.value = '';
  try {
    // Região e permissão vêm do token no servidor; técnico sempre recebe só os
    // registros dele, mesmo que "usuario" não seja enviado.
    const params = new URLSearchParams({ inicio: inicio.value, fim: fim.value });
    if (escopo.value === 'meus' && globalState.user?.nome) params.set('usuario', globalState.user.nome);

    const response = await fetch(`${API_BASE_URL}/dashboard/producao?${params}`, { headers: authHeaders() });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) {
      throw new Error(response.status === 401 ? data?.message : 'Não foi possível carregar a produção do período.');
    }
    registros.value = Array.isArray(data.registros) ? data.registros : [];
  } catch (err) {
    console.error('Erro ao buscar produção do dashboard:', err);
    errorMsg.value = err.message || 'Não foi possível carregar a produção do período.';
  } finally {
    loading.value = false;
  }
}

function authHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${globalState.user?.token || ''}`,
  };
}

// --- ALTERAÇÃO DE STATUS (somente ADM) ---
const edicao = ref(null); // { registro, status, comentario }
const salvandoEdicao = ref(false);
const erroEdicao = ref('');

function abrirEdicao(registro) {
  if (!isAdm.value) return;
  edicao.value = {
    registro,
    status: registro.status === 'PASS' ? 'PASS' : 'FAIL',
    comentario: registro.comentarios || '',
  };
  erroEdicao.value = '';
}

function fecharEdicao() {
  if (!salvandoEdicao.value) edicao.value = null;
}

async function salvarEdicao() {
  const { registro, status, comentario } = edicao.value;
  salvandoEdicao.value = true;
  erroEdicao.value = '';
  try {
    const response = await fetch(`${API_BASE_URL}/dashboard/status`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ id: registro.id, status, comentario }),
    });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) throw new Error(data?.message || 'Falha ao salvar.');

    // Reflete no card sem recarregar a lista inteira
    registro.status = status;
    registro.statusOriginal = status;
    registro.comentarios = comentario.trim();
    edicao.value = null;
  } catch (err) {
    erroEdicao.value = err.message || 'Erro ao salvar alteração.';
  } finally {
    salvandoEdicao.value = false;
  }
}

// Esc fecha o modal de edição
function onKeydown(e) {
  if (e.key === 'Escape' && edicao.value) fecharEdicao();
}

watch([inicio, fim, escopo], fetchProducao);
// Troca de usuário (logout/login) sem recarregar a página
watch(() => globalState.user?.nome, (nome) => { if (nome) fetchProducao(); });

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
  if (globalState.user) fetchProducao();
  // Só faz sentido atualizar sozinho se o período inclui o dia de hoje
  refreshInterval = setInterval(() => {
    if (globalState.user && fim.value >= hoje() && !loading.value) fetchProducao();
  }, 60000);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown);
  if (refreshInterval) clearInterval(refreshInterval);
});
</script>

<template>
  <div class="dashboard-container">
    <!-- BARRA DE PERÍODO -->
    <section class="toolbar">
      <div class="segmented">
        <button
          v-for="p in PERIODOS"
          :key="p.id"
          class="seg-btn"
          :class="{ active: periodoAtivo === p.id }"
          @click="selecionarPeriodo(p)"
        >{{ p.label }}</button>
      </div>

      <div class="date-range" :class="{ active: periodoAtivo === 'custom' }">
        <input type="date" v-model="inicio" :max="hoje()" />
        <span class="range-sep">até</span>
        <input type="date" v-model="fim" :max="hoje()" />
      </div>

      <div class="segmented" v-if="isAdm">
        <button class="seg-btn" :class="{ active: escopo === 'meus' }" @click="escopo = 'meus'">Minha produção</button>
        <button class="seg-btn" :class="{ active: escopo === 'todos' }" @click="escopo = 'todos'">Todos</button>
      </div>

      <button class="btn-refresh" @click="fetchProducao" :disabled="loading" title="Atualizar">
        <svg :class="{ spinning: loading }" width="16" height="16" viewBox="0 0 24 24" fill="none"
             stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12a9 9 0 1 1-2.64-6.36" />
          <polyline points="21 3 21 9 15 9" />
        </svg>
      </button>
    </section>

    <!-- RESUMO (clicável: filtra os cards) -->
    <section class="summary">
      <button class="summary-chip" :class="{ active: filtroStatus === 'todos' }" @click="filtroStatus = 'todos'">
        <span class="chip-value">{{ resumo.total }}</span>
        <span class="chip-label">Equipamentos</span>
      </button>
      <button class="summary-chip pass" :class="{ active: filtroStatus === 'PASS' }" @click="filtroStatus = 'PASS'">
        <span class="chip-value">{{ resumo.aprovados }}</span>
        <span class="chip-label">{{ globalState.t('status.approved') }}</span>
      </button>
      <button class="summary-chip fail" :class="{ active: filtroStatus === 'FAIL' }" @click="filtroStatus = 'FAIL'">
        <span class="chip-value">{{ resumo.reprovados }}</span>
        <span class="chip-label">{{ globalState.t('status.rejected') }}</span>
      </button>
    </section>

    <p v-if="errorMsg" class="error-banner">{{ errorMsg }}</p>

    <div v-if="loading && registros.length === 0" class="empty-state">Carregando produção...</div>
    <div v-else-if="!errorMsg && grupos.length === 0" class="empty-state">
      Nenhum equipamento registrado neste período.
    </div>

    <!-- CARDS AGRUPADOS POR DIA -->
    <section v-for="grupo in grupos" :key="grupo.dia" class="day-group">
      <header class="day-header">
        <h3 class="day-title">{{ rotuloDia(grupo.dia) }}</h3>
        <span class="day-date">{{ dataCurta(grupo.dia) }}</span>
        <span class="day-line"></span>
        <span class="day-count">{{ grupo.itens.length }} {{ grupo.itens.length === 1 ? 'equipamento' : 'equipamentos' }}</span>
        <span class="day-mini pass" v-if="grupo.aprovados">{{ grupo.aprovados }}</span>
        <span class="day-mini fail" v-if="grupo.reprovados">{{ grupo.reprovados }}</span>
      </header>

      <div class="cards-grid">
        <article
          v-for="r in grupo.itens"
          :key="r.id"
          class="prod-card"
          :class="{ pass: r.status === 'PASS', fail: r.status === 'FAIL' }"
        >
          <header class="card-top">
            <span class="os-number">{{ r.os }}</span>
            <button
              v-if="isAdm"
              class="status-badge editable"
              title="Alterar status e comentário"
              @click="abrirEdicao(r)"
            >
              {{ rotuloStatus(r) }}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
            </button>
            <span v-else class="status-badge">{{ rotuloStatus(r) }}</span>
          </header>

          <h4 class="card-model">{{ r.modelo || 'Modelo não informado' }}</h4>
          <p class="card-serial"><span>SN</span>{{ r.serial || '—' }}</p>

          <dl class="specs">
            <div v-for="spec in especificacoes(r)" :key="spec.label" class="spec-row">
              <dt>{{ spec.label }}</dt>
              <dd><span v-for="(v, i) in spec.valores" :key="i">{{ v }}</span></dd>
            </div>
          </dl>

          <div v-if="r.comentarios" class="card-comment">
            <span class="comment-label">Comentário</span>
            <p>{{ r.comentarios }}</p>
          </div>

          <footer class="card-footer">
            <span>{{ r.tecnico || '—' }}</span>
            <span>{{ r.hora }}</span>
          </footer>
        </article>
      </div>
    </section>

    <!-- MODAL DE ALTERAÇÃO DE STATUS (ADM) -->
    <div v-if="edicao" class="modal-backdrop" @click.self="fecharEdicao">
      <form class="modal" @submit.prevent="salvarEdicao">
        <header class="modal-header">
          <div>
            <span class="modal-kicker">Alterar status</span>
            <h3 class="modal-title">OS {{ edicao.registro.os }}</h3>
            <p class="modal-sub">{{ edicao.registro.modelo || 'Modelo não informado' }} · {{ edicao.registro.tecnico || '—' }}</p>
          </div>
          <button type="button" class="modal-close" @click="fecharEdicao" title="Fechar">✕</button>
        </header>

        <div class="status-options">
          <button type="button" class="status-option pass" :class="{ active: edicao.status === 'PASS' }"
                  @click="edicao.status = 'PASS'">{{ globalState.t('status.approved') }}</button>
          <button type="button" class="status-option fail" :class="{ active: edicao.status === 'FAIL' }"
                  @click="edicao.status = 'FAIL'">{{ globalState.t('status.rejected') }}</button>
        </div>

        <label class="modal-label" for="edicao-comentario">Comentário</label>
        <textarea id="edicao-comentario" v-model="edicao.comentario" rows="4" maxlength="1000"
                  placeholder="Motivo da alteração, defeito encontrado..."></textarea>

        <p v-if="erroEdicao" class="modal-error">{{ erroEdicao }}</p>

        <footer class="modal-actions">
          <button type="button" class="btn-ghost" @click="fecharEdicao" :disabled="salvandoEdicao">Cancelar</button>
          <button type="submit" class="btn-primary" :disabled="salvandoEdicao">
            {{ salvandoEdicao ? 'Salvando...' : 'Salvar' }}
          </button>
        </footer>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* Ocupa toda a área da janela: o pai (.window-body no App.vue) é flex em
   coluna, e "margin: 0 auto" ali encolhia o container pra largura do conteúdo. */
.dashboard-container {
  width: 100%;
  padding: 1.5rem 2rem 2.5rem;
  color: var(--text-dim);
  height: 100%;
  overflow-y: auto;
}

/* Scrollbar no padrão do tema (mesmo estilo do .main-content do Diagnostico.vue) */
.dashboard-container::-webkit-scrollbar {
  width: 6px;
}

.dashboard-container::-webkit-scrollbar-track {
  background: transparent;
}

.dashboard-container::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 10px;
}

.dashboard-container::-webkit-scrollbar-thumb:hover {
  background: var(--accent);
}

/* --- BARRA DE PERÍODO --- */
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
}

.segmented {
  display: inline-flex;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 3px;
}

.seg-btn {
  background: transparent;
  border: none;
  color: var(--text-dim);
  font-size: 0.82rem;
  font-weight: 600;
  padding: 0.45rem 0.9rem;
  border-radius: 7px;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.seg-btn:hover {
  color: var(--text-main);
  background: var(--bg-hover);
}

.seg-btn.active {
  background: var(--accent);
  color: #fff;
}

.date-range {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 3px 8px;
  transition: border-color 0.2s ease;
}

.date-range.active {
  border-color: var(--accent);
}

.date-range input {
  background: transparent;
  border: none;
  color: var(--text-main);
  font-family: inherit;
  font-size: 0.82rem;
  padding: 0.4rem 0.2rem;
  color-scheme: dark light;
}

.date-range input:focus {
  outline: none;
}

.range-sep {
  font-size: 0.75rem;
  color: var(--text-dim);
}

.btn-refresh {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--accent);
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.btn-refresh:hover:not(:disabled) {
  border-color: var(--accent);
  background: var(--bg-hover);
}

.btn-refresh:disabled {
  cursor: wait;
}

.spinning {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* --- RESUMO --- */
.summary {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1.75rem;
}

.summary-chip {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.7rem 1.2rem;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.summary-chip:hover {
  border-color: var(--accent);
}

.summary-chip.active {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}

.chip-value {
  font-family: var(--font-tech);
  font-size: 1.7rem;
  font-weight: 700;
  line-height: 1;
  color: var(--text-main);
}

.chip-label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--text-dim);
}

.summary-chip.pass .chip-value { color: var(--status-pass); }
.summary-chip.fail .chip-value { color: var(--status-fail); }
.summary-chip.pass.active { border-color: var(--status-pass); box-shadow: 0 0 0 3px var(--status-pass-glow); }
.summary-chip.fail.active { border-color: var(--status-fail); box-shadow: 0 0 0 3px var(--status-fail-glow); }

.error-banner {
  background: var(--status-fail-glow);
  border: 1px solid var(--status-fail);
  color: var(--status-fail);
  padding: 0.7rem 1rem;
  border-radius: 10px;
  margin-bottom: 1.2rem;
  font-size: 0.85rem;
}

.empty-state {
  text-align: center;
  padding: 4rem 1rem;
  color: var(--text-dim);
  background: var(--bg-panel);
  border: 1px dashed var(--border);
  border-radius: 14px;
}

/* --- GRUPO POR DIA --- */
.day-group {
  margin-bottom: 2rem;
}

.day-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.9rem;
}

.day-title {
  font-family: var(--font-tech);
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-main);
  letter-spacing: 0.5px;
}

.day-date {
  font-size: 0.8rem;
  color: var(--text-dim);
}

.day-line {
  flex: 1;
  height: 1px;
  background: var(--border);
}

.day-count {
  font-size: 0.78rem;
  color: var(--text-dim);
}

.day-mini {
  font-size: 0.72rem;
  font-weight: 700;
  min-width: 24px;
  text-align: center;
  padding: 0.15rem 0.45rem;
  border-radius: 20px;
}

.day-mini.pass { color: var(--status-pass); background: var(--status-pass-glow); }
.day-mini.fail { color: var(--status-fail); background: var(--status-fail-glow); }

/* --- CARDS --- */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.prod-card {
  --status-color: var(--text-dim);
  --status-glow: var(--bg-hover);
  position: relative;
  display: flex;
  flex-direction: column;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-top: 3px solid var(--status-color);
  border-radius: 14px;
  padding: 1rem 1.1rem 0.85rem;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.prod-card.pass { --status-color: var(--status-pass); --status-glow: var(--status-pass-glow); }
.prod-card.fail { --status-color: var(--status-fail); --status-glow: var(--status-fail-glow); }

.prod-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 20px var(--shadow-color);
  border-left-color: var(--accent);
  border-right-color: var(--accent);
  border-bottom-color: var(--accent);
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.55rem;
}

.os-number {
  font-family: var(--font-tech);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: 0.5px;
}

.os-number::before {
  content: 'OS ';
  font-size: 0.7rem;
  color: var(--text-dim);
  letter-spacing: 1px;
}

.status-badge {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  padding: 0.22rem 0.6rem;
  border-radius: 20px;
  color: var(--status-color);
  background: var(--status-glow);
  border: 1px solid transparent;
}

.status-badge.editable {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-family: inherit;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.15s ease;
}

.status-badge.editable svg {
  opacity: 0.6;
}

.status-badge.editable:hover {
  border-color: var(--status-color);
  transform: scale(1.04);
}

.status-badge.editable:hover svg {
  opacity: 1;
}

.card-model {
  font-size: 0.98rem;
  font-weight: 600;
  color: var(--text-main);
  line-height: 1.3;
}

.card-serial {
  font-family: var(--font-mono);
  font-size: 0.78rem;
  color: var(--text-main);
  opacity: 0.85;
  margin: 0.2rem 0 0.8rem;
}

.card-serial span {
  color: var(--text-dim);
  margin-right: 0.4rem;
  font-size: 0.7rem;
}

.specs {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border);
  margin: 0;
  flex: 1;
}

.spec-row {
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: 0.6rem;
  font-size: 0.8rem;
  line-height: 1.35;
}

.spec-row dt {
  color: var(--text-dim);
}

.spec-row dd {
  margin: 0;
  color: var(--text-main);
  display: flex;
  flex-direction: column;
  word-break: break-word;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 0.8rem;
  padding-top: 0.6rem;
  border-top: 1px solid var(--border);
  font-size: 0.72rem;
  color: var(--text-dim);
}

/* --- COMENTÁRIO NO CARD --- */
.card-comment {
  margin-top: 0.75rem;
  padding: 0.55rem 0.7rem;
  border-left: 3px solid var(--status-color);
  background: var(--bg-hover);
  border-radius: 0 8px 8px 0;
}

.comment-label {
  display: block;
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--text-dim);
  margin-bottom: 0.2rem;
}

.card-comment p {
  font-size: 0.8rem;
  line-height: 1.4;
  color: var(--text-main);
  white-space: pre-wrap;
  word-break: break-word;
}

/* --- MODAL DE STATUS --- */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(3px);
}

.modal {
  width: 100%;
  max-width: 440px;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 1.4rem;
  box-shadow: 0 20px 50px var(--shadow-color);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.2rem;
}

.modal-kicker {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-dim);
}

.modal-title {
  font-family: var(--font-tech);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--accent);
  line-height: 1.2;
}

.modal-sub {
  font-size: 0.8rem;
  color: var(--text-dim);
}

.modal-close {
  background: transparent;
  border: none;
  color: var(--text-dim);
  font-size: 1rem;
  cursor: pointer;
  padding: 0.2rem 0.4rem;
  border-radius: 6px;
}

.modal-close:hover {
  color: var(--text-main);
  background: var(--bg-hover);
}

.status-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
  margin-bottom: 1.1rem;
}

.status-option {
  --opt-color: var(--status-pass);
  --opt-glow: var(--status-pass-glow);
  background: var(--bg-hover);
  border: 1px solid var(--border);
  color: var(--text-dim);
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  padding: 0.7rem;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.status-option.fail {
  --opt-color: var(--status-fail);
  --opt-glow: var(--status-fail-glow);
}

.status-option:hover {
  border-color: var(--opt-color);
  color: var(--opt-color);
}

.status-option.active {
  border-color: var(--opt-color);
  color: var(--opt-color);
  background: var(--opt-glow);
}

.modal-label {
  display: block;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--text-dim);
  margin-bottom: 0.35rem;
}

.modal textarea {
  width: 100%;
  resize: vertical;
  background: var(--bg-app);
  border: 1px solid var(--border);
  border-radius: 10px;
  color: var(--text-main);
  font-family: inherit;
  font-size: 0.85rem;
  padding: 0.65rem 0.75rem;
  transition: border-color 0.2s ease;
}

.modal textarea:focus {
  outline: none;
  border-color: var(--accent);
}

.modal-error {
  margin-top: 0.7rem;
  font-size: 0.8rem;
  color: var(--status-fail);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  margin-top: 1.2rem;
}

.btn-ghost,
.btn-primary {
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.6rem 1.2rem;
  border-radius: 10px;
  cursor: pointer;
  transition: opacity 0.2s ease, background 0.2s ease;
}

.btn-ghost {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-dim);
}

.btn-ghost:hover:not(:disabled) {
  background: var(--bg-hover);
  color: var(--text-main);
}

.btn-primary {
  background: var(--accent);
  border: 1px solid var(--accent);
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: var(--accent-hover, var(--accent));
}

.btn-ghost:disabled,
.btn-primary:disabled {
  opacity: 0.6;
  cursor: wait;
}

@media (max-width: 700px) {
  .dashboard-container { padding: 1rem; }
  .btn-refresh { margin-left: 0; }
  .cards-grid { grid-template-columns: 1fr; }
}
</style>
