<script setup>
// CPU Stress — estressa os núcleos procurando ERROS (cálculo errado, WHEA novo,
// tela azul), mede temperatura/tensão/clock e gera uma pontuação (benchmark).
// A carga roda no agente C# (CpuStressService.cs), com cada thread presa a um
// processador lógico — dá pra estressar só o núcleo apontado por um erro WHEA.
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { Line } from 'vue-chartjs';
import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend } from 'chart.js';

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);

const props = defineProps({
  // APIC IDs vindos do Event Log ("Testar o núcleo APIC X no CPU Stress")
  apicsIniciais: { type: Array, default: () => [] },
});

const API_BASE_URL = 'http://localhost:5000/api';

// Acima disso, em Intel 13ª/14ª geração, a tensão já é considerada perigosa
// (relatos de degradação de silício com VID entre ~1,48 V e 1,52 V)
const TENSAO_ALERTA = 1.48;
const MICROCODE_CORRECAO = 0x12B; // correção de tensão elevada da Intel (set/2024)

const DURACOES = [
  { seg: 60, label: '1 min' }, { seg: 300, label: '5 min' },
  { seg: 600, label: '10 min' }, { seg: 1800, label: '30 min' },
];

const topologia = ref(null); // { nome, microcode, intelRaptorLake, processadores[] }
const erroConexao = ref('');
const wheaPorApic = ref(new Map()); // APIC -> nº de erros WHEA (120 dias)
const selecionados = ref(new Set());
const duracao = ref(300);
const status = ref(null);
const iniciando = ref(false);
let poll = null;

// --- CARGA INICIAL ---
async function carregar() {
  try {
    const r = await fetch(`${API_BASE_URL}/cpu/topologia`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    topologia.value = await r.json();
    erroConexao.value = '';
  } catch (err) {
    erroConexao.value = 'Não foi possível conectar ao agente local (porta 5000) ou ele ainda não tem o CPU Stress. Atualize o HardwareTestApp.';
    console.error('Erro ao carregar topologia da CPU:', err);
    return;
  }

  try {
    const r = await fetch(`${API_BASE_URL}/whea?dias=120`);
    const eventos = r.ok ? await r.json() : [];
    const mapa = new Map();
    eventos.forEach((ev) => { if (ev.apicId != null) mapa.set(ev.apicId, (mapa.get(ev.apicId) || 0) + 1); });
    wheaPorApic.value = mapa;
  } catch (err) {
    console.warn('Não foi possível ler os erros WHEA:', err);
  }

  // Seleção inicial: APICs vindos do Event Log > todos
  const apics = props.apicsIniciais.filter((a) => processadores.value.some((p) => p.apicId === a));
  selecionados.value = new Set(apics.length ? apics : processadores.value.map((p) => p.apicId));

  // Se já houver um teste rodando no agente (ex: voltou pra esta tela), retoma
  await atualizarStatus();
  if (status.value?.rodando) iniciarPolling();
}

const processadores = computed(() => topologia.value?.processadores || []);
const hibrido = computed(() => processadores.value.some((p) => p.tipo));

const apicsComWhea = computed(() =>
  [...wheaPorApic.value.entries()].sort((a, b) => b[1] - a[1])
);

const microcodeDesatualizado = computed(() => {
  const mc = topologia.value?.microcode;
  return topologia.value?.intelRaptorLake && mc && parseInt(mc, 16) < MICROCODE_CORRECAO;
});

// --- SELEÇÃO DE NÚCLEOS ---
function alternar(apic) {
  if (rodando.value) return;
  const novo = new Set(selecionados.value);
  novo.has(apic) ? novo.delete(apic) : novo.add(apic);
  selecionados.value = novo;
}

function selecionarTodos() { selecionados.value = new Set(processadores.value.map((p) => p.apicId)); }
function selecionarTipo(tipo) { selecionados.value = new Set(processadores.value.filter((p) => p.tipo === tipo).map((p) => p.apicId)); }
function selecionarComWhea() { selecionados.value = new Set(apicsComWhea.value.map(([apic]) => apic).filter((a) => processadores.value.some((p) => p.apicId === a))); }

// --- EXECUÇÃO ---
const rodando = computed(() => !!status.value?.rodando);

async function iniciar() {
  if (!selecionados.value.size) return;
  iniciando.value = true;
  try {
    const todos = selecionados.value.size === processadores.value.length;
    const r = await fetch(`${API_BASE_URL}/stress/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duracaoSeg: duracao.value, apicIds: todos ? null : [...selecionados.value] }),
    });
    const data = await r.json().catch(() => null);
    if (!r.ok || !data?.success) throw new Error(data?.message || `HTTP ${r.status}`);
    await atualizarStatus();
    iniciarPolling();
  } catch (err) {
    erroConexao.value = `Não foi possível iniciar o teste: ${err.message}`;
  } finally {
    iniciando.value = false;
  }
}

async function parar() {
  try { await fetch(`${API_BASE_URL}/stress/stop`, { method: 'POST' }); } catch { /* agente fora */ }
  await atualizarStatus();
}

async function atualizarStatus() {
  try {
    const r = await fetch(`${API_BASE_URL}/stress/status`);
    if (r.ok) status.value = await r.json();
  } catch (err) {
    console.warn('Falha ao ler status do CPU Stress:', err);
  }
  if (status.value && !status.value.rodando) pararPolling();
}

function iniciarPolling() {
  pararPolling();
  poll = setInterval(atualizarStatus, 1000);
}
function pararPolling() {
  if (poll) clearInterval(poll);
  poll = null;
}

onMounted(carregar);
onBeforeUnmount(pararPolling); // o teste continua no agente; ao voltar, a tela retoma

// --- RESULTADO ---
const s = computed(() => status.value?.sensores || {});
const progresso = computed(() => status.value ? Math.min(100, (status.value.decorridoSeg / status.value.duracaoSeg) * 100) : 0);
const tensaoAlta = computed(() => topologia.value?.intelRaptorLake && s.value.voltMax >= TENSAO_ALERTA);
const tensaoIndisponivel = computed(() => status.value && status.value.amostras?.length > 3 && s.value.voltMax == null);

const resultadoPorApic = computed(() => {
  const mapa = new Map();
  (status.value?.processadores || []).forEach((p) => mapa.set(p.apicId, p));
  return mapa;
});

const veredito = computed(() => {
  const st = status.value;
  if (!st || st.rodando || !st.fim) return null;
  const wheaNovos = st.wheaNovos?.length || 0;
  const interrompido = st.fim.startsWith('Interrompido');
  if (st.errosTotal > 0 || wheaNovos > 0) {
    return { classe: 'fail', titulo: 'FAIL', texto: `${st.errosTotal} erro(s) de cálculo e ${wheaNovos} erro(s) WHEA novos durante o teste — processador instável.` };
  }
  if (interrompido) return { classe: 'warn', titulo: 'INCOMPLETO', texto: st.fim };
  return { classe: 'pass', titulo: 'PASS', texto: `Nenhum erro em ${formatarTempo(st.decorridoSeg)} de carga máxima.` };
});

// Média de pontos por tipo de núcleo (P vs E) — compara núcleos parecidos
const mediasPorTipo = computed(() => {
  const grupos = {};
  (status.value?.processadores || []).forEach((p) => {
    const tipo = p.tipo || 'Núcleo';
    (grupos[tipo] ||= []).push(p.pontos);
  });
  return Object.entries(grupos).map(([tipo, pts]) => ({ tipo, media: Math.round(pts.reduce((a, b) => a + b, 0) / pts.length), qtd: pts.length }));
});

function formatarTempo(seg) {
  const m = Math.floor(seg / 60);
  const r = Math.round(seg % 60);
  return m ? `${m}min ${String(r).padStart(2, '0')}s` : `${r}s`;
}

const fmt = (v, casas = 0, unidade = '') => (v == null ? '—' : `${Number(v).toFixed(casas)}${unidade}`);

// --- GRÁFICO (temperatura e tensão ao longo do teste) ---
function corDoTema(nome, padrao) {
  return getComputedStyle(document.documentElement).getPropertyValue(nome).trim() || padrao;
}

const dadosGrafico = computed(() => {
  const amostras = status.value?.amostras || [];
  return {
    labels: amostras.map((a) => `${a.t}s`),
    datasets: [
      { label: 'Temperatura (°C)', data: amostras.map((a) => a.temp), yAxisID: 'temp', borderColor: corDoTema('--status-fail', '#e74c3c'), pointRadius: 0, borderWidth: 2, tension: 0.3 },
      { label: 'Tensão (V)', data: amostras.map((a) => a.volt), yAxisID: 'volt', borderColor: corDoTema('--accent', '#fe7f2d'), pointRadius: 0, borderWidth: 2, tension: 0.3 },
    ],
  };
});

const opcoesGrafico = computed(() => {
  const texto = corDoTema('--text-dim', '#909296');
  const grade = corDoTema('--chart-grid', 'rgba(255,255,255,0.05)');
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { labels: { color: texto, boxWidth: 12 } } },
    scales: {
      x: { ticks: { color: texto, maxTicksLimit: 8 }, grid: { color: grade } },
      temp: { position: 'left', suggestedMin: 30, suggestedMax: 100, ticks: { color: texto }, grid: { color: grade } },
      volt: { position: 'right', suggestedMin: 0.6, suggestedMax: 1.6, ticks: { color: texto }, grid: { drawOnChartArea: false } },
    },
  };
});
</script>

<template>
  <div class="stress-container">
    <header class="stress-header">
      <div>
        <h2>CPU STRESS</h2>
        <p v-if="topologia">
          {{ topologia.nome }} · {{ processadores.length }} processadores lógicos
          <template v-if="topologia.microcode"> · microcode {{ topologia.microcode }}</template>
        </p>
      </div>
    </header>

    <p v-if="erroConexao" class="alerta alerta-erro">{{ erroConexao }}</p>

    <template v-if="topologia">
      <!-- Alertas da família Intel 13ª/14ª geração -->
      <div v-if="topologia.intelRaptorLake" class="alerta alerta-aviso">
        <strong>Intel Core 13ª/14ª geração:</strong> família com relatos de degradação de silício por tensão alta
        (acima de ~{{ TENSAO_ALERTA.toFixed(2) }} V). Acompanhe a tensão durante o teste.
        <template v-if="microcodeDesatualizado">
          O microcode carregado ({{ topologia.microcode }}) é anterior ao 0x12B, a correção de tensão da Intel —
          verifique se há BIOS mais nova para este modelo.
        </template>
      </div>

      <!-- Erros WHEA já registrados neste equipamento -->
      <div v-if="apicsComWhea.length" class="alerta alerta-whea">
        <div>
          <strong>Erros WHEA no Event Log (120 dias):</strong>
          <span v-for="[apic, qtd] in apicsComWhea" :key="apic" class="whea-tag">APIC {{ apic }} · {{ qtd }}×</span>
        </div>
        <button class="btn-mini" :disabled="rodando" @click="selecionarComWhea">Testar só esses núcleos</button>
      </div>

      <!-- Mapa de núcleos -->
      <section class="painel">
        <div class="painel-topo">
          <h3>Núcleos <span class="dim">({{ selecionados.size }} selecionados)</span></h3>
          <div class="botoes-selecao">
            <button class="btn-mini" :disabled="rodando" @click="selecionarTodos">Todos</button>
            <template v-if="hibrido">
              <button class="btn-mini" :disabled="rodando" @click="selecionarTipo('P')">Só P-cores</button>
              <button class="btn-mini" :disabled="rodando" @click="selecionarTipo('E')">Só E-cores</button>
            </template>
          </div>
        </div>

        <div class="nucleos">
          <button
            v-for="p in processadores"
            :key="p.indice"
            class="nucleo"
            :class="{
              selecionado: selecionados.has(p.apicId),
              'tem-whea': wheaPorApic.has(p.apicId),
              'com-erro': resultadoPorApic.get(p.apicId)?.erros > 0,
              ecore: p.tipo === 'E',
            }"
            :disabled="rodando"
            :title="`Processador lógico ${p.indice} · núcleo físico ${p.nucleo}`"
            @click="alternar(p.apicId)"
          >
            <span class="nucleo-apic">APIC {{ p.apicId }}</span>
            <span class="nucleo-tipo">{{ p.tipo ? `${p.tipo}-core` : `CPU ${p.indice}` }}</span>
            <span v-if="resultadoPorApic.get(p.apicId)" class="nucleo-pts">
              {{ resultadoPorApic.get(p.apicId).pontos }} pts
              <b v-if="resultadoPorApic.get(p.apicId).erros"> · {{ resultadoPorApic.get(p.apicId).erros }} erro(s)</b>
            </span>
            <span v-if="wheaPorApic.has(p.apicId)" class="nucleo-whea">WHEA {{ wheaPorApic.get(p.apicId) }}×</span>
          </button>
        </div>
      </section>

      <!-- Controles -->
      <section class="controles">
        <div class="segmented">
          <button v-for="d in DURACOES" :key="d.seg" class="seg-btn" :class="{ active: duracao === d.seg }"
                  :disabled="rodando" @click="duracao = d.seg">{{ d.label }}</button>
        </div>
        <button v-if="!rodando" class="btn-iniciar" :disabled="iniciando || !selecionados.size" @click="iniciar">
          {{ iniciando ? 'Iniciando...' : 'Iniciar stress' }}
        </button>
        <button v-else class="btn-parar" @click="parar">Parar</button>
        <span class="dim nota">O teste roda no agente e continua mesmo se você sair desta tela.</span>
      </section>

      <!-- Andamento / resultado -->
      <template v-if="status && (status.rodando || status.fim)">
        <div v-if="status.rodando" class="barra"><div class="barra-fill" :style="{ width: progresso + '%' }"></div></div>

        <div v-if="veredito" class="veredito" :class="veredito.classe">
          <span class="veredito-titulo">{{ veredito.titulo }}</span>
          <span>{{ veredito.texto }}</span>
        </div>

        <section class="metricas">
          <div class="metrica">
            <span class="m-rotulo">Tempo</span>
            <span class="m-valor">{{ formatarTempo(status.decorridoSeg) }}</span>
            <span class="m-sub">de {{ formatarTempo(status.duracaoSeg) }}</span>
          </div>
          <div class="metrica">
            <span class="m-rotulo">Pontuação</span>
            <span class="m-valor destaque">{{ status.pontosTotal }}</span>
            <span class="m-sub">
              <template v-for="(m, i) in mediasPorTipo" :key="m.tipo">{{ i ? ' · ' : '' }}{{ m.tipo }}: {{ m.media }}/núcleo</template>
            </span>
          </div>
          <div class="metrica" :class="{ ruim: status.errosTotal > 0 }">
            <span class="m-rotulo">Erros de cálculo</span>
            <span class="m-valor">{{ status.errosTotal }}</span>
            <span class="m-sub">WHEA novos: {{ status.wheaNovos?.length || 0 }}</span>
          </div>
          <div class="metrica" :class="{ ruim: s.tempMax >= 95 }">
            <span class="m-rotulo">Temperatura</span>
            <span class="m-valor">{{ fmt(s.tempAtual, 0, ' °C') }}</span>
            <span class="m-sub">máx {{ fmt(s.tempMax, 0, ' °C') }}</span>
          </div>
          <div class="metrica" :class="{ ruim: tensaoAlta }">
            <span class="m-rotulo">Tensão (VID)</span>
            <span class="m-valor">{{ fmt(s.voltAtual, 3, ' V') }}</span>
            <span class="m-sub">máx {{ fmt(s.voltMax, 3, ' V') }}</span>
          </div>
          <div class="metrica">
            <span class="m-rotulo">Clock / Potência</span>
            <span class="m-valor">{{ fmt(s.clockAtual, 0, ' MHz') }}</span>
            <span class="m-sub">máx {{ fmt(s.clockMax, 0) }} MHz · {{ fmt(s.potMax, 0, ' W') }}</span>
          </div>
        </section>

        <p v-if="tensaoAlta" class="alerta alerta-erro">
          Tensão máxima de {{ fmt(s.voltMax, 3, ' V') }} — acima de {{ TENSAO_ALERTA.toFixed(2) }} V, faixa associada à
          degradação do silício nesta geração. Atualize a BIOS antes de devolver o equipamento.
        </p>
        <p v-if="tensaoIndisponivel" class="alerta alerta-info">
          Tensão indisponível: a leitura de VID precisa do driver PawnIO (coloque o PawnIO_setup.exe em Redist ao lado do agente).
        </p>

        <section v-if="status.amostras?.length > 1" class="painel grafico">
          <Line :data="dadosGrafico" :options="opcoesGrafico" />
        </section>

        <section v-if="status.mensagensErro?.length || status.wheaNovos?.length" class="painel">
          <h3>Ocorrências durante o teste</h3>
          <ul class="ocorrencias">
            <li v-for="(m, i) in status.mensagensErro" :key="'e' + i" class="oc-erro">{{ m }}</li>
            <li v-for="(w, i) in status.wheaNovos" :key="'w' + i" class="oc-whea">
              {{ w.data }} · WHEA {{ w.id }} · {{ w.componente || 'hardware' }}
              <template v-if="w.apicId != null"> · APIC {{ w.apicId }}</template>
              <template v-if="w.tipoErro"> · {{ w.tipoErro }}</template>
            </li>
          </ul>
        </section>
      </template>
    </template>
  </div>
</template>

<style scoped>
.stress-container {
  color: var(--text-dim);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.stress-header h2 { color: var(--text-main); margin: 0; font-size: 1.2rem; letter-spacing: 1px; }
.stress-header p { margin: 4px 0 0; font-size: 0.82rem; }
.dim { color: var(--text-dim); font-weight: 400; }

.alerta {
  margin: 0;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 0.82rem;
  line-height: 1.45;
  border: 1px solid var(--border);
  background: var(--bg-panel);
  color: var(--text-main);
}
.alerta-erro { border-color: var(--status-fail); background: var(--status-fail-glow); }
.alerta-aviso { border-color: #f59e0b; background: rgba(245, 158, 11, 0.12); }
.alerta-info { color: var(--text-dim); }
.alerta-whea {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  border-color: #f43f5e;
  background: rgba(244, 63, 94, 0.1);
}

.whea-tag {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 8px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  color: #f43f5e;
  border: 1px solid #f43f5e;
}

.painel {
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 14px 16px;
}
.painel h3 { margin: 0 0 10px; font-size: 0.85rem; color: var(--text-main); }
.painel-topo { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }
.painel-topo h3 { margin: 0; }
.botoes-selecao { display: flex; gap: 6px; }

.btn-mini {
  background: var(--bg-hover);
  border: 1px solid var(--border);
  color: var(--text-main);
  font-size: 0.75rem;
  font-weight: 600;
  padding: 5px 10px;
  border-radius: 8px;
  cursor: pointer;
}
.btn-mini:hover:not(:disabled) { border-color: var(--accent); }
.btn-mini:disabled { opacity: 0.5; cursor: default; }

/* --- MAPA DE NÚCLEOS --- */
.nucleos {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 8px;
}

.nucleo {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--bg-app);
  color: var(--text-dim);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.nucleo:disabled { cursor: default; }
.nucleo.selecionado { border-color: var(--accent); background: var(--accent-glow); color: var(--text-main); }
.nucleo.tem-whea { box-shadow: inset 3px 0 0 #f43f5e; }
.nucleo.com-erro { border-color: var(--status-fail); background: var(--status-fail-glow); }

.nucleo-apic { font-family: var(--font-mono, 'Consolas', monospace); font-weight: 700; font-size: 0.82rem; }
.nucleo-tipo { font-size: 0.7rem; }
.nucleo.ecore .nucleo-tipo { color: #38bdf8; }
.nucleo-pts { font-size: 0.7rem; color: var(--text-main); }
.nucleo-pts b { color: var(--status-fail); }
.nucleo-whea { font-size: 0.66rem; font-weight: 700; color: #f43f5e; }

/* --- CONTROLES --- */
.controles { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
.nota { font-size: 0.75rem; }

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
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.4rem 0.75rem;
  border-radius: 7px;
  cursor: pointer;
}
.seg-btn.active { background: var(--accent); color: #fff; }
.seg-btn:disabled:not(.active) { opacity: 0.5; cursor: default; }

.btn-iniciar, .btn-parar {
  border: none;
  border-radius: 10px;
  color: #fff;
  font-weight: 700;
  padding: 9px 18px;
  cursor: pointer;
}
.btn-iniciar { background: var(--accent); }
.btn-iniciar:disabled { opacity: 0.5; cursor: default; }
.btn-parar { background: var(--status-fail); }

.barra { height: 6px; background: var(--bg-hover); border-radius: 6px; overflow: hidden; }
.barra-fill { height: 100%; background: var(--accent); transition: width 0.5s linear; }

.veredito {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid var(--border);
  color: var(--text-main);
  font-size: 0.88rem;
}
.veredito-titulo { font-family: var(--font-tech); font-size: 1.4rem; font-weight: 800; letter-spacing: 1px; }
.veredito.pass { border-color: var(--status-pass); background: var(--status-pass-glow); }
.veredito.pass .veredito-titulo { color: var(--status-pass); }
.veredito.fail { border-color: var(--status-fail); background: var(--status-fail-glow); }
.veredito.fail .veredito-titulo { color: var(--status-fail); }
.veredito.warn { border-color: #f59e0b; background: rgba(245, 158, 11, 0.12); }
.veredito.warn .veredito-titulo { color: #f59e0b; }

/* --- MÉTRICAS --- */
.metricas {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}
.metrica {
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px 12px;
}
.metrica.ruim { border-color: var(--status-fail); }
.m-rotulo { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.8px; }
.m-valor { font-family: var(--font-tech); font-size: 1.4rem; font-weight: 700; color: var(--text-main); }
.m-valor.destaque { color: var(--accent); }
.metrica.ruim .m-valor { color: var(--status-fail); }
.m-sub { font-size: 0.72rem; }

.grafico { height: 240px; }

.ocorrencias { margin: 0; padding-left: 18px; font-size: 0.8rem; line-height: 1.6; }
.oc-erro { color: var(--status-fail); }
.oc-whea { color: #f43f5e; }
</style>
