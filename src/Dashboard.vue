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

// --- BUSCA POR O.S. OU SERIAL ---
// Procura no banco inteiro (sem limite de período). Enquanto há uma busca
// ativa, os cards e o resumo mostram os resultados dela em vez da produção.
const termoBusca = ref('');
const busca = ref(null); // { termo, registros }
const buscando = ref(false);

async function buscar() {
  const termo = termoBusca.value.trim();
  if (termo.length < 2) return;
  buscando.value = true;
  errorMsg.value = '';
  try {
    const response = await fetch(`${API_BASE_URL}/dashboard/busca?termo=${encodeURIComponent(termo)}`, { headers: authHeaders() });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) throw new Error(data?.message || 'Falha na busca.');
    busca.value = { termo, registros: Array.isArray(data.registros) ? data.registros : [] };
    filtroStatus.value = 'todos';
  } catch (err) {
    console.error('Erro na busca do dashboard:', err);
    errorMsg.value = err.message || 'Não foi possível buscar.';
  } finally {
    buscando.value = false;
  }
}

function limparBusca() {
  busca.value = null;
  termoBusca.value = '';
}

const registrosExibidos = computed(() => (busca.value ? busca.value.registros : registros.value));

// --- RESUMO / AGRUPAMENTO ---
const resumo = computed(() => ({
  total: registrosExibidos.value.length,
  aprovados: registrosExibidos.value.filter((r) => r.status === 'PASS').length,
  reprovados: registrosExibidos.value.filter((r) => r.status === 'FAIL').length,
}));

const registrosFiltrados = computed(() =>
  filtroStatus.value === 'todos'
    ? registrosExibidos.value
    : registrosExibidos.value.filter((r) => r.status === filtroStatus.value)
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

// --- VERSO DO CARD: TESTES DE QUALIDADE ---
// Colunas devolvidas pelo servidor em r.testes, na ordem em que aparecem
const TESTES_QUALIDADE = [
  ['testeLcd', 'LCD'], ['testeTouchpad', 'Touchpad'], ['testeTeclado', 'Teclado'],
  ['testeMicrofone', 'Microfone'], ['testeSpeakers', 'Alto-falantes'], ['testeCamera', 'Câmera'],
  ['testeRedes', 'Redes'], ['testeBateria', 'Bateria'], ['testeUsb', 'USB'],
  ['testeFingerPrint', 'FingerPrint'], ['testeAuto', 'Auto teste'],
];

const virados = ref(new Set());
function virarCard(id) {
  const novo = new Set(virados.value);
  novo.has(id) ? novo.delete(id) : novo.add(id);
  virados.value = novo;
}

// O valor salvo é "PASS", "PASS: <detalhe>" ou "PASS | Disco: ..." (Auto teste)
function lerTeste(valor) {
  const texto = String(valor || '').trim();
  const m = /^(PASS|FAIL)\s*[:|]?\s*(.*)$/is.exec(texto);
  if (m) return { status: m[1].toUpperCase(), detalhe: m[2].trim() };
  // Registros antigos (app C#) gravavam "não realizado" quando o teste não rodou
  if (!texto || /^n[ãa]o realizado$/i.test(texto)) return { status: 'NA', detalhe: '' };
  return { status: 'OUTRO', detalhe: texto };
}

function testesDoCard(r) {
  return TESTES_QUALIDADE.map(([coluna, nome]) => {
    const { status, detalhe } = lerTeste(r.testes?.[coluna]);
    const rotulo = status === 'PASS' ? 'PASS' : status === 'FAIL' ? 'FAIL' : status === 'NA' ? 'Não realizado' : '—';
    return { nome, status, detalhe, rotulo, classe: status.toLowerCase() };
  });
}

const testesRealizados = (r) => testesDoCard(r).filter((t) => t.status === 'PASS' || t.status === 'FAIL');

// --- JANELA DE DETALHES DO PRODUTO (clique no número da O.S.) ---
// Os dados completos (memórias, discos, BIOS, Windows...) só são buscados aqui,
// sob demanda, em /api/dashboard/registro/:id.
const detalhe = ref(null); // { carregando, erro, registro, os }

async function abrirDetalhes(r) {
  detalhe.value = { carregando: true, erro: '', registro: null, os: r.os };
  try {
    const response = await fetch(`${API_BASE_URL}/dashboard/registro/${r.id}`, { headers: authHeaders() });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) throw new Error(data?.message || 'Falha ao carregar os dados.');
    if (detalhe.value) detalhe.value = { carregando: false, erro: '', registro: data.registro, os: r.os };
  } catch (err) {
    if (detalhe.value) detalhe.value = { carregando: false, erro: err.message || 'Erro ao carregar.', registro: null, os: r.os };
  }
}

const fecharDetalhes = () => { detalhe.value = null; };

const valorOuTraco = (v) => (String(v ?? '').trim() || '—');

// Seções da janela: [rótulo, valor] — valores vazios aparecem como "—"
function secoesDetalhe(reg) {
  return [
    { titulo: 'Equipamento', linhas: [
      ['Fabricante', reg.fabricante], ['Modelo', reg.modelo], ['Família', reg.systemFamily],
      ['SKU', reg.systemSkuNumber], ['Serial', reg.serial], ['BIOS', reg.biosVersion],
    ] },
    { titulo: 'Sistema', linhas: [
      ['Sistema operacional', reg.sistema], ['Windows ativado', reg.windowsAtivado], ['Chave do Windows', reg.chaveWindows],
    ] },
    { titulo: 'Hardware', linhas: [
      ['Processador', reg.processador], ['Memória total', reg.memoriaTotal], ['Tela', reg.tela],
      ['Placa de vídeo', [reg.gpu, reg.gpu2].filter((g) => String(g ?? '').trim()).join(' | ')],
    ] },
  ].map((sec) => ({ ...sec, linhas: sec.linhas.map(([rotulo, valor]) => [rotulo, valorOuTraco(valor)]) }));
}

function resumoTestes(r) {
  const testes = testesDoCard(r);
  const feitos = testes.filter((t) => t.status === 'PASS' || t.status === 'FAIL');
  const aprovados = feitos.filter((t) => t.status === 'PASS').length;
  if (!feitos.length) return 'Nenhum teste registrado';
  return `${aprovados} de ${feitos.length} aprovados` + (feitos.length < testes.length ? ` · ${testes.length - feitos.length} não realizados` : '');
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
  else if (e.key === 'Escape' && detalhe.value) fecharDetalhes();
}

watch([inicio, fim, escopo], () => {
  limparBusca(); // mudar o período volta pra visão de produção
  fetchProducao();
});
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

      <form class="search-box" :class="{ active: busca }" @submit.prevent="buscar">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
        </svg>
        <input v-model="termoBusca" type="search" placeholder="Buscar O.S. ou serial" aria-label="Buscar O.S. ou serial" />
        <button v-if="termoBusca || busca" type="button" class="search-clear" title="Limpar busca" @click="limparBusca">✕</button>
        <button type="submit" class="search-go" :disabled="buscando || termoBusca.trim().length < 2">
          {{ buscando ? '...' : 'Buscar' }}
        </button>
      </form>

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

    <div v-if="busca" class="search-banner">
      <span>
        Busca por <strong>"{{ busca.termo }}"</strong> —
        {{ busca.registros.length }} {{ busca.registros.length === 1 ? 'registro encontrado' : 'registros encontrados' }}
        <template v-if="busca.registros.length === 50"> (mostrando os 50 mais recentes)</template>
      </span>
      <button class="btn-link" @click="limparBusca">Voltar à produção do período</button>
    </div>

    <p v-if="errorMsg" class="error-banner">{{ errorMsg }}</p>

    <div v-if="loading && registros.length === 0" class="empty-state">Carregando produção...</div>
    <div v-else-if="!errorMsg && grupos.length === 0" class="empty-state">
      <template v-if="busca">Nenhum registro encontrado para "{{ busca.termo }}".</template>
      <template v-else>Nenhum equipamento registrado neste período.</template>
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
        <!-- Card que gira: frente = hardware, verso = testes de qualidade -->
        <div
          v-for="r in grupo.itens"
          :key="r.id"
          class="flip-card"
          :class="{ virado: virados.has(r.id) }"
          @click="virarCard(r.id)"
        >
        <div class="flip-inner">
        <article
          class="prod-card card-face card-front"
          :class="{ pass: r.status === 'PASS', fail: r.status === 'FAIL' }"
        >
          <header class="card-top">
            <button class="os-number os-link" title="Ver todos os dados do produto" @click.stop="abrirDetalhes(r)">{{ r.os }}</button>
            <button
              v-if="isAdm"
              class="status-badge editable"
              title="Alterar status e comentário"
              @click.stop="abrirEdicao(r)"
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
            <span class="flip-hint">{{ r.hora }} · Testes ↻</span>
          </footer>
        </article>

        <article
          class="prod-card card-face card-back"
          :class="{ pass: r.status === 'PASS', fail: r.status === 'FAIL' }"
        >
          <header class="card-top">
            <button class="os-number os-link" title="Ver todos os dados do produto" @click.stop="abrirDetalhes(r)">{{ r.os }}</button>
            <span class="back-title">Testes de qualidade</span>
          </header>
          <p class="tests-summary">{{ resumoTestes(r) }}</p>

          <!-- Só os testes realizados: verde = PASS, vermelho = FAIL. Os detalhes
               de cada um ficam na janela aberta pelo número da O.S. -->
          <div class="test-chips">
            <span v-for="t in testesRealizados(r)" :key="t.nome" class="test-chip-mini" :class="t.classe">{{ t.nome }}</span>
          </div>

          <footer class="card-footer">
            <span>{{ r.tecnico || '—' }}</span>
            <span class="flip-hint">Hardware ↻</span>
          </footer>
        </article>
        </div>
        </div>
      </div>
    </section>

    <!-- JANELA DE DETALHES DO PRODUTO -->
    <div v-if="detalhe" class="modal-backdrop" @click.self="fecharDetalhes">
      <div class="modal modal-detalhes">
        <header class="modal-header">
          <div>
            <span class="modal-kicker">Dados do produto</span>
            <h3 class="modal-title">OS {{ detalhe.os }}</h3>
            <p v-if="detalhe.registro" class="modal-sub">
              {{ detalhe.registro.data }} {{ detalhe.registro.hora }} · {{ detalhe.registro.tecnico || '—' }} ·
              <span :class="['status-text', detalhe.registro.status.toLowerCase()]">{{ rotuloStatus(detalhe.registro) }}</span>
            </p>
          </div>
          <button type="button" class="modal-close" @click="fecharDetalhes" title="Fechar">✕</button>
        </header>

        <p v-if="detalhe.carregando" class="detalhe-estado">Carregando...</p>
        <p v-else-if="detalhe.erro" class="modal-error">{{ detalhe.erro }}</p>

        <div v-else class="detalhe-corpo">
          <section v-for="sec in secoesDetalhe(detalhe.registro)" :key="sec.titulo" class="detalhe-secao">
            <h4>{{ sec.titulo }}</h4>
            <dl class="detalhe-lista">
              <div v-for="[rotulo, valor] in sec.linhas" :key="rotulo" class="detalhe-linha">
                <dt>{{ rotulo }}</dt><dd>{{ valor }}</dd>
              </div>
            </dl>
          </section>

          <section class="detalhe-secao">
            <h4>Memórias</h4>
            <ul v-if="listar(detalhe.registro.memoriaDetalhada).length" class="detalhe-itens">
              <li v-for="(m, i) in listar(detalhe.registro.memoriaDetalhada)" :key="i">{{ m }}</li>
            </ul>
            <p v-else class="detalhe-vazio">Não registrado</p>
          </section>

          <section class="detalhe-secao">
            <h4>Discos</h4>
            <ul v-if="listar(detalhe.registro.armazenamento).length" class="detalhe-itens">
              <li v-for="(d, i) in listar(detalhe.registro.armazenamento)" :key="i">{{ d }}</li>
            </ul>
            <p v-else class="detalhe-vazio">Não registrado</p>
          </section>

          <section class="detalhe-secao detalhe-largo">
            <h4>Testes de qualidade</h4>
            <ul v-if="testesRealizados(detalhe.registro).length" class="detalhe-testes">
              <li v-for="t in testesRealizados(detalhe.registro)" :key="t.nome">
                <span class="test-chip-mini" :class="t.classe">{{ t.rotulo }}</span>
                <strong>{{ t.nome }}</strong>
                <span v-if="t.detalhe" class="detalhe-teste-texto">{{ t.detalhe }}</span>
              </li>
            </ul>
            <p v-else class="detalhe-vazio">Nenhum teste registrado</p>
          </section>

          <section v-if="detalhe.registro.comentarios" class="detalhe-secao detalhe-largo">
            <h4>Comentário</h4>
            <p class="detalhe-comentario">{{ detalhe.registro.comentarios }}</p>
          </section>
        </div>
      </div>
    </div>

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

/* --- BUSCA --- */
.search-box {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 3px 3px 3px 10px;
  color: var(--text-dim);
  transition: border-color 0.2s ease;
}

.search-box:focus-within,
.search-box.active {
  border-color: var(--accent);
}

.search-box input {
  background: transparent;
  border: none;
  color: var(--text-main);
  font-family: inherit;
  font-size: 0.82rem;
  width: 170px;
  padding: 0.4rem 0;
}

.search-box input:focus {
  outline: none;
}

/* some com o "x" nativo do input search (já temos o nosso) */
.search-box input::-webkit-search-cancel-button {
  display: none;
}

.search-clear {
  background: none;
  border: none;
  color: var(--text-dim);
  cursor: pointer;
  font-size: 0.8rem;
  padding: 0 0.3rem;
}

.search-clear:hover {
  color: var(--text-main);
}

.search-go {
  background: var(--accent);
  border: none;
  color: #fff;
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.4rem 0.8rem;
  border-radius: 7px;
  cursor: pointer;
}

.search-go:disabled {
  opacity: 0.5;
  cursor: default;
}

.search-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  background: var(--bg-panel);
  border: 1px solid var(--accent);
  border-radius: 10px;
  padding: 0.6rem 1rem;
  margin-bottom: 1.2rem;
  font-size: 0.85rem;
  color: var(--text-main);
}

.btn-link {
  background: none;
  border: none;
  color: var(--accent);
  font-family: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}

.btn-link:hover {
  text-decoration: underline;
}

.btn-refresh {
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

/* --- CARD QUE GIRA (frente: hardware / verso: testes) --- */
.flip-card {
  perspective: 1400px;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.flip-card:hover {
  transform: translateY(-3px);
}

/* As duas faces ficam na mesma célula do grid: a altura do card é a da face
   mais alta, sem precisar de altura fixa. */
.flip-inner {
  display: grid;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1);
}

.flip-card.virado .flip-inner {
  transform: rotateY(180deg);
}

.card-face {
  grid-area: 1 / 1;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.card-back {
  transform: rotateY(180deg);
}

.flip-card:hover .prod-card {
  box-shadow: 0 8px 20px var(--shadow-color);
  border-left-color: var(--accent);
  border-right-color: var(--accent);
  border-bottom-color: var(--accent);
}

.flip-hint {
  color: var(--accent);
}

.back-title {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--text-dim);
}

.tests-summary {
  font-size: 0.78rem;
  color: var(--text-main);
  margin: 0 0 0.6rem;
}








@media (prefers-reduced-motion: reduce) {
  .flip-inner { transition: none; }
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

/* --- VERSO COMPACTO: só testes realizados --- */
.test-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  padding-top: 0.6rem;
  border-top: 1px solid var(--border);
  align-content: flex-start;
  flex: 1;
}

.test-chip-mini {
  --chip-color: var(--text-dim);
  --chip-bg: var(--bg-hover);
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.2rem 0.55rem;
  border-radius: 20px;
  color: var(--chip-color);
  background: var(--chip-bg);
  border: 1px solid var(--chip-color);
  white-space: nowrap;
}

.test-chip-mini.pass { --chip-color: var(--status-pass); --chip-bg: var(--status-pass-glow); }
.test-chip-mini.fail { --chip-color: var(--status-fail); --chip-bg: var(--status-fail-glow); }

/* --- NÚMERO DA O.S. COMO LINK --- */
.os-link {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  text-decoration: underline;
  text-decoration-color: transparent;
  text-underline-offset: 3px;
  transition: text-decoration-color 0.2s ease;
}

.os-link:hover {
  text-decoration-color: var(--accent);
}

/* --- JANELA DE DETALHES DO PRODUTO --- */
.modal.modal-detalhes {
  max-width: 820px;
  max-height: 88vh;
  overflow-y: auto;
}

.status-text.pass { color: var(--status-pass); font-weight: 700; }
.status-text.fail { color: var(--status-fail); font-weight: 700; }

.detalhe-estado {
  color: var(--text-dim);
  padding: 1.5rem 0;
  text-align: center;
}

.detalhe-corpo {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem 1.4rem;
}

.detalhe-secao h4 {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--accent);
  margin: 0 0 0.45rem;
}

.detalhe-largo {
  grid-column: 1 / -1;
}

.detalhe-lista {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.detalhe-linha {
  display: grid;
  grid-template-columns: 130px 1fr;
  gap: 0.6rem;
  font-size: 0.82rem;
}

.detalhe-linha dt {
  color: var(--text-dim);
}

.detalhe-linha dd {
  margin: 0;
  color: var(--text-main);
  word-break: break-word;
}

.detalhe-itens {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.82rem;
  color: var(--text-main);
  line-height: 1.5;
}

.detalhe-vazio {
  font-size: 0.8rem;
  color: var(--text-dim);
  margin: 0;
}

.detalhe-testes {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.detalhe-testes li {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: 0.82rem;
  color: var(--text-main);
}

.detalhe-teste-texto {
  color: var(--text-dim);
  font-size: 0.78rem;
  word-break: break-word;
}

.detalhe-comentario {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-main);
  white-space: pre-wrap;
}
</style>
