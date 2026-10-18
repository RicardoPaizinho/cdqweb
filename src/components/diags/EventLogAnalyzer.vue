<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import bsodEventsRaw from '@/data/bsodEvents.json';
import { getCauseForCode, getGuideForCode } from '@/data/bsodCauses.js';
import { getDriverInfo } from '@/data/driverComponents.js';
import { WHEA_EVENTOS, decodificarMciStat, diagnosticarWhea } from '@/data/wheaErrors.js';

// "testar-cpu" leva os APIC IDs de um erro WHEA de processador pro CPU Stress
// (o DiagsView.vue troca de tela e já deixa esses núcleos selecionados)
const emit = defineEmits(['testar-cpu']);

// --- CONFIGURAÇÃO DA API LOCAL (agente C#) ---
const API_BASE_URL = 'http://localhost:5000/api';

const PERIODOS = [30, 60, 90, 120];

const CATEGORIAS = {
  system: 'SISTEMA', driver: 'DRIVER', memory: 'MEMÓRIA',
  storage: 'ARMAZENAMENTO', hardware: 'HARDWARE', gpu: 'VÍDEO',
};
const GRAVIDADES = { high: 'ALTA', medium: 'MÉDIA', low: 'BAIXA' };

// Códigos de parada ligados a vídeo — pra esses, o card procura um travamento de
// driver de vídeo (Display 4101) logo antes, que é onde o Windows registra o
// NOME do driver (nvlddmkm.sys, igdkmd64.sys...) e assim diz se é dedicada ou onboard.
const CODIGOS_VIDEO = new Set([0x10E, 0x113, 0x116, 0x117, 0x119, 0xEA, 0x141, 0x1E4]);
const JANELA_DRIVER_VIDEO_MS = 72 * 60 * 60 * 1000;

const AI_PREFIX = 'IA: ';

const logs = ref([]);
const wheaEventos = ref([]); // /api/whea — erros de hardware (WheaService.cs no agente)
const salvandoProvas = ref(false);
const statusProvas = ref('');
const isLoading = ref(true);
const searchQuery = ref('');
const connectionError = ref('');
const dias = ref(30);
const filtroTipo = ref('todos'); // 'todos' | 'bsod' | 'shutdown' | 'video'
const expandidos = ref(new Set());
const copiado = ref(null);

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

const toHex = (code) => '0x' + code.toString(16).toUpperCase().padStart(8, '0');

// Causa da equipe (bsodCauses.js) + guia completo (bsodGuide.json) pra um código
function infoDoCodigo(code) {
  const causa = getCauseForCode(code);
  const isIA = !!causa?.startsWith(AI_PREFIX);
  return {
    code,
    hex: code != null ? toHex(code) : null,
    causaEquipe: isIA ? causa.slice(AI_PREFIX.length) : causa,
    causaIA: isIA,
    guia: getGuideForCode(code),
  };
}

function nomeDoCodigo(code) {
  return BUGCHECK_NAMES.get(code) || getGuideForCode(code)?.nome || 'CÓDIGO DE PARADA NÃO CATALOGADO';
}

function classify(log) {
  const source = (log.origin || '').toLowerCase();
  const id = Number(log.eventId) & 0xFFFF;

  if (source.includes('kernel-power') && id === 41) {
    // Parâmetro 0 do Kernel-Power 41 = BugcheckCode (decimal). Diferente de zero
    // significa que o desligamento inesperado foi, na verdade, uma tela azul.
    const bugcheck = Number(log.dados?.[0]) || 0;
    if (bugcheck > 0) {
      return {
        type: 'shutdown', typeLabel: 'DESLIGAMENTO',
        name: `REINÍCIO POR TELA AZUL — ${nomeDoCodigo(bugcheck)}`,
        descricao: 'O Windows reiniciou sem desligar corretamente, e o próprio evento registrou que foi por tela azul.',
        ...infoDoCodigo(bugcheck),
      };
    }
    return {
      type: 'shutdown', typeLabel: 'DESLIGAMENTO',
      name: 'KERNEL-POWER 41 — DESLIGAMENTO SEM AVISO PRÉVIO',
      descricao: 'Queda de energia, trava total do sistema (freeze) ou desligamento forçado (botão físico). Verificar fonte/bateria, superaquecimento e estabilidade geral.',
      ...infoDoCodigo(null),
    };
  }
  if (source === 'eventlog' && id === 6008) {
    return {
      type: 'shutdown', typeLabel: 'DESLIGAMENTO',
      name: 'EVENTLOG 6008 — DESLIGAMENTO ANTERIOR INESPERADO',
      descricao: 'O Windows não conseguiu registrar a causa do desligamento anterior. Tratar como possível queda de energia ou travamento — investigar junto com outros eventos próximos no horário.',
      ...infoDoCodigo(null),
    };
  }
  if (source === 'display' && id === 4101) {
    return {
      type: 'video', typeLabel: 'VÍDEO (TDR)',
      name: 'DRIVER DE VÍDEO PAROU DE RESPONDER',
      descricao: 'O driver de vídeo travou e o Windows conseguiu recuperá-lo sem tela azul. Se for frequente, pode evoluir para VIDEO_TDR_FAILURE (0x116) — verificar driver, temperatura e a própria placa.',
      driverInfo: getDriverInfo(log.driver),
      ...infoDoCodigo(null),
    };
  }

  const code = extractStopCode(log.msg);
  return {
    type: 'bsod', typeLabel: 'TELA AZUL',
    name: code != null ? nomeDoCodigo(code) : 'TELA AZUL (código não identificado na mensagem)',
    ...infoDoCodigo(code),
  };
}

// Pra falhas de vídeo, aponta o driver do travamento de vídeo (4101) mais
// recente nas 72h anteriores. Depende do "dateIso" do agente — sem ele, pula.
function relacionarDriverDeVideo(lista) {
  const tdrs = lista
    .filter((l) => l.type === 'video' && l.driverInfo && l.dateIso)
    .map((l) => ({ ...l, ts: new Date(l.dateIso).getTime() }));
  if (!tdrs.length) return lista;

  return lista.map((l) => {
    const ehVideo = CODIGOS_VIDEO.has(l.code) || l.guia?.categoria === 'gpu';
    if (l.type === 'video' || !ehVideo || !l.dateIso) return l;
    const ts = new Date(l.dateIso).getTime();
    const anterior = tdrs
      .filter((t) => t.ts <= ts && ts - t.ts <= JANELA_DRIVER_VIDEO_MS)
      .sort((a, b) => b.ts - a.ts)[0];
    return anterior ? { ...l, driverInfo: anterior.driverInfo, driverRelacionadoEm: anterior.date } : l;
  });
}

async function carregar(metodo) {
  isLoading.value = true;
  try {
    const rota = metodo === 'POST' ? '/eventlog/refresh' : '/eventlog';
    const response = await fetch(`${API_BASE_URL}${rota}?dias=${dias.value}`, { method: metodo });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    logs.value = await response.json();
    connectionError.value = '';
    await carregarWhea();
  } catch (err) {
    connectionError.value = metodo === 'POST'
      ? 'Não foi possível reexecutar a busca no agente local.'
      : 'Não foi possível conectar ao agente local (porta 5000). Verifique se o HardwareTestApp está em execução.';
    console.error('Erro ao buscar Event Log:', err);
  } finally {
    isLoading.value = false;
  }
}

async function carregarWhea() {
  try {
    const response = await fetch(`${API_BASE_URL}/whea?dias=${dias.value}`);
    wheaEventos.value = response.ok ? await response.json() : [];
  } catch (err) {
    wheaEventos.value = []; // agente antigo sem /api/whea: só não mostra os WHEA
    console.warn('Não foi possível buscar os erros WHEA:', err);
  }
}

// Grava Redist\logs\<Modelo>_<Serial>.txt no agente (substitui o Capturar-Crash.ps1)
async function salvarProvas() {
  salvandoProvas.value = true;
  statusProvas.value = '';
  try {
    const response = await fetch(`${API_BASE_URL}/whea/salvar`, { method: 'POST' });
    const data = await response.json().catch(() => null);
    if (!response.ok || !data?.success) throw new Error(data?.message || `HTTP ${response.status}`);
    statusProvas.value = `Provas salvas em ${data.arquivo}`;
  } catch (err) {
    statusProvas.value = `Não foi possível salvar as provas: ${err.message}`;
  } finally {
    salvandoProvas.value = false;
  }
}

// Agrupa os WHEA iguais (mesmo evento + núcleo + tipo) num card só, com a
// contagem — 100 erros "Internal parity error" no APIC 33 viram 1 card.
const wheaCards = computed(() => {
  const grupos = new Map();
  for (const ev of wheaEventos.value) {
    const mca = decodificarMciStat(ev.mciStat);
    const chave = `${ev.id}|${ev.apicId ?? '-'}|${ev.tipoErro || mca?.codigo || ''}`;
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(ev); // a lista vem do mais novo pro mais antigo
  }
  const porApic = new Map();
  wheaEventos.value.forEach((ev) => { if (ev.apicId != null) porApic.set(ev.apicId, (porApic.get(ev.apicId) || 0) + 1); });

  return [...grupos.entries()].map(([chave, eventos]) => {
    const ultimo = eventos[0];
    const primeiro = eventos[eventos.length - 1];
    const info = WHEA_EVENTOS[ultimo.id] || { titulo: 'ERRO DE HARDWARE (WHEA)', gravidade: 'medium' };
    const diag = diagnosticarWhea(ultimo, porApic.get(ultimo.apicId) || eventos.length);
    const mca = diag.mca;
    const partes = [
      ultimo.componente, ultimo.tipoErro || mca?.descricao,
      ultimo.mcaBank != null ? `banco MCA ${ultimo.mcaBank}` : null,
    ].filter(Boolean).join(' · ');
    return {
      key: `whea-${chave}`,
      type: 'whea',
      typeLabel: 'HARDWARE (WHEA)',
      name: info.titulo + (ultimo.apicId != null ? ` — APIC ${ultimo.apicId}` : ''),
      hex: mca?.codigo || null,
      date: ultimo.data,
      dateIso: ultimo.dataIso,
      origin: 'WHEA-Logger',
      eventId: ultimo.id,
      msg: ultimo.mensagem,
      apicId: ultimo.apicId,
      ocorrencias: eventos.length,
      descricao: `${eventos.length} ocorrência(s)` + (eventos.length > 1 ? ` entre ${primeiro.data} e ${ultimo.data}` : '') + (partes ? ` — ${partes}` : ''),
      causaEquipe: diag.causa,
      causaIA: false,
      guia: {
        categoria: 'hardware',
        gravidade: info.gravidade,
        solucao: [diag.acao],
        comandos: [],
        tags: [diag.componente, ultimo.tipoErro || mca?.descricao].filter(Boolean),
      },
      testarNucleo: diag.nucleo,
    };
  });
});

const fetchLogs = () => carregar('GET');
const refresh = () => carregar('POST');

onMounted(fetchLogs);
watch(dias, fetchLogs);

// Enriquece cada log com tipo/nome/causa antes de exibir — feito uma vez aqui
// em vez de recalcular tudo isso dentro do template.
const enrichedLogs = computed(() =>
  relacionarDriverDeVideo(
    logs.value.map((log, i) => ({ ...log, key: `${log.dateIso || log.date}-${log.eventId}-${i}`, ...classify(log) }))
  ).map(aplicarMinidump)
);

// O driver lido do minidump (MinidumpService.cs no agente) é a fonte mais
// direta — o mesmo "O que falhou" da tela azul. Tem prioridade sobre o driver
// de vídeo deduzido pelo travamento (Display 4101) anterior.
function aplicarMinidump(log) {
  const dump = log.minidump;
  if (!dump?.driver) return log;
  return {
    ...log,
    driverInfo: getDriverInfo(dump.driver),
    driverFonte: dump.confirmado ? 'minidump' : 'minidump-provavel',
    driverArquivoDump: dump.arquivo,
    driverRelacionadoEm: null,
  };
}

function rotuloDriver(log) {
  if (log.driverFonte === 'minidump') return 'Driver que falhou (minidump)';
  if (log.driverFonte === 'minidump-provavel') return 'Driver provável (minidump)';
  return log.type === 'video' ? 'Driver envolvido' : 'Driver de vídeo relacionado';
}

// Telas azuis/desligamentos/vídeo + WHEA agrupados, do mais recente pro mais antigo
const todosEventos = computed(() =>
  [...enrichedLogs.value, ...wheaCards.value].sort((a, b) => String(b.dateIso || '').localeCompare(String(a.dateIso || '')))
);

const contagem = computed(() => {
  const c = { todos: todosEventos.value.length, bsod: 0, shutdown: 0, video: 0, whea: 0 };
  todosEventos.value.forEach((l) => { c[l.type]++; });
  return c;
});

const TIPOS = [
  { id: 'todos', label: 'Todos' },
  { id: 'bsod', label: 'Telas azuis' },
  { id: 'shutdown', label: 'Desligamentos' },
  { id: 'video', label: 'Vídeo' },
  { id: 'whea', label: 'Hardware (WHEA)' },
];

// FILTRO (tipo + busca por nome, código, causa, driver ou tag)
const filteredLogs = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  return todosEventos.value.filter((log) => {
    if (filtroTipo.value !== 'todos' && log.type !== filtroTipo.value) return false;
    if (!q) return true;
    return [
      log.name, log.hex, log.origin, log.causaEquipe, log.descricao, log.guia?.causa,
      log.driverInfo?.driver, log.driverInfo?.componente, ...(log.guia?.tags || []),
    ].some((campo) => campo?.toLowerCase().includes(q));
  });
});

function toggleDetalhes(key) {
  const novo = new Set(expandidos.value);
  novo.has(key) ? novo.delete(key) : novo.add(key);
  expandidos.value = novo;
}

async function copiarCodigo(log) {
  try {
    await navigator.clipboard.writeText(log.hex);
    copiado.value = log.key;
    setTimeout(() => { if (copiado.value === log.key) copiado.value = null; }, 1500);
  } catch (err) {
    console.warn('Não foi possível copiar o código:', err);
  }
}
</script>

<template>
  <div class="log-container">
    <div class="log-header">
      <div class="title-section">
        <h2>HISTÓRICO DE FALHAS DO SISTEMA</h2>
        <p>Telas azuis, desligamentos inesperados, travamentos de vídeo e erros de hardware (WHEA) nos últimos {{ dias }} dias</p>
      </div>

      <div class="actions">
        <div class="segmented" title="Período">
          <button v-for="p in PERIODOS" :key="p" class="seg-btn" :class="{ active: dias === p }"
                  @click="dias = p" :disabled="isLoading">{{ p }} dias</button>
        </div>
        <input v-model="searchQuery" type="text" placeholder="Filtrar código, causa ou driver..." class="search-input" />
        <button @click="refresh" class="btn-refresh" :disabled="isLoading">
          {{ isLoading ? 'BUSCANDO...' : 'ATUALIZAR' }}
        </button>
        <button @click="salvarProvas" class="btn-provas" :disabled="salvandoProvas"
                title="Grava eventos, WHEA e minidumps em Redist\logs, num arquivo com modelo e serial">
          {{ salvandoProvas ? 'SALVANDO...' : 'SALVAR PROVAS' }}
        </button>
      </div>
    </div>

    <p v-if="statusProvas" class="provas-status">{{ statusProvas }}</p>

    <div class="type-filters">
      <button v-for="t in TIPOS" :key="t.id" class="type-chip" :class="['chip-' + t.id, { active: filtroTipo === t.id }]"
              @click="filtroTipo = t.id">
        {{ t.label }} <span class="chip-count">{{ contagem[t.id] }}</span>
      </button>
    </div>

    <p v-if="connectionError" class="connection-error">{{ connectionError }}</p>

    <div class="cards-scroll">
      <div v-if="isLoading" class="state-info">
        <div class="spinner"></div>
        <p>Acessando registros do Windows...</p>
      </div>

      <div v-else-if="!connectionError && filteredLogs.length === 0" class="state-info">
        <p v-if="todosEventos.length === 0">✅ Nenhuma tela azul, desligamento inesperado, travamento de vídeo ou erro de hardware nos últimos {{ dias }} dias.</p>
        <p v-else>Nenhum evento corresponde ao filtro.</p>
      </div>

      <div v-else class="cards-grid">
        <article v-for="log in filteredLogs" :key="log.key" class="crash-card" :class="'type-' + log.type">
          <header class="card-head">
            <div class="badges">
              <span class="badge badge-type">{{ log.typeLabel }}</span>
              <span v-if="log.guia" class="badge badge-cat">{{ CATEGORIAS[log.guia.categoria] || log.guia.categoria }}</span>
              <span v-if="log.guia" class="badge badge-sev" :class="'sev-' + log.guia.gravidade">
                {{ GRAVIDADES[log.guia.gravidade] || log.guia.gravidade }}
              </span>
            </div>
            <div v-if="log.hex" class="code-area">
              <button class="btn-copy" @click="copiarCodigo(log)" title="Copiar código">
                {{ copiado === log.key ? 'Copiado' : 'Copiar' }}
              </button>
              <span class="code-box">{{ log.hex }}</span>
            </div>
          </header>

          <h3 class="crash-name">{{ log.name }}</h3>
          <p class="crash-meta">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            {{ log.date }}
            <span class="meta-sep">·</span>
            {{ log.origin }} {{ Number(log.eventId) & 0xFFFF }}
          </p>

          <p v-if="log.guia?.causa || log.descricao" class="crash-desc">{{ log.guia?.causa || log.descricao }}</p>

          <div v-if="log.causaEquipe" class="info-box cause-box" :class="{ 'is-ia': log.causaIA }">
            <span class="box-label">{{ log.causaIA ? 'Sugestão (IA)' : 'Diagnóstico da equipe' }}</span>
            <p>{{ log.causaEquipe }}</p>
          </div>

          <div v-if="log.driverInfo" class="info-box driver-box">
            <span class="box-label">{{ rotuloDriver(log) }}</span>
            <p>
              <code>{{ log.driverInfo.driver }}</code>
              <template v-if="log.driverInfo.componente">
                — {{ log.driverInfo.fabricante }} · <strong>{{ log.driverInfo.componente }}</strong>
              </template>
              <template v-else> — driver não catalogado</template>
            </p>
            <p v-if="log.driverInfo.onboard" class="box-tip">Vídeo integrado: defeito físico aponta para a placa-mãe.</p>
            <p v-if="log.driverInfo.dica" class="box-tip">{{ log.driverInfo.dica }}</p>
            <p v-if="log.driverRelacionadoEm" class="box-tip">Travamento desse driver registrado em {{ log.driverRelacionadoEm }}, antes desta falha.</p>
            <p v-if="log.driverArquivoDump" class="box-tip">Arquivo: C:\Windows\Minidump\{{ log.driverArquivoDump }}</p>
          </div>

          <button v-if="log.testarNucleo" class="btn-testar-nucleo" @click="emit('testar-cpu', [log.apicId])">
            Testar o núcleo APIC {{ log.apicId }} no CPU Stress →
          </button>

          <div v-if="expandidos.has(log.key)" class="details">
            <template v-if="log.guia?.solucao?.length">
              <h4>Como resolver</h4>
              <ol>
                <li v-for="(passo, i) in log.guia.solucao" :key="i">{{ passo }}</li>
              </ol>
            </template>
            <div v-if="log.guia?.comandos?.length" class="commands">
              <code v-for="cmd in log.guia.comandos" :key="cmd">{{ cmd }}</code>
            </div>
            <details class="raw-msg">
              <summary>Mensagem original do Windows</summary>
              <pre>{{ log.msg }}</pre>
            </details>
          </div>

          <footer class="card-foot">
            <button class="btn-details" @click="toggleDetalhes(log.key)">
              {{ expandidos.has(log.key) ? 'Ocultar' : 'Detalhes' }} →
            </button>
            <div v-if="log.guia?.tags?.length" class="tags">
              <span v-for="tag in log.guia.tags.slice(0, 4)" :key="tag" class="tag">{{ tag }}</span>
            </div>
          </footer>
        </article>
      </div>

    </div>
  </div>
</template>

<style scoped>
.log-container {
  --bsod-color: #3b82f6;
  --shutdown-color: #f59e0b;
  --video-color: #a855f7;
  --whea-color: #f43f5e;
  height: 100%;
  display: flex;
  flex-direction: column;
  color: var(--text-dim);
  padding: 20px;
}

/* --- CABEÇALHO --- */
.log-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 14px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 14px;
}
.title-section h2 { color: var(--text-main); margin: 0; font-size: 1.2rem; letter-spacing: 1px; }
.title-section p { font-size: 0.8rem; color: var(--text-dim); margin: 5px 0 0; }

.actions { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }

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
  transition: background 0.2s ease, color 0.2s ease;
}
.seg-btn:hover:not(:disabled) { color: var(--text-main); background: var(--bg-hover); }
.seg-btn.active { background: var(--accent); color: #fff; }
.seg-btn:disabled { cursor: wait; }

.search-input {
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px 12px;
  color: var(--text-main);
  width: 250px;
  font-family: inherit;
}
.search-input:focus { outline: none; border-color: var(--accent); }

.btn-refresh {
  background: var(--accent);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-weight: 700;
  padding: 9px 18px;
  cursor: pointer;
  transition: opacity 0.2s ease;
}
.btn-refresh:hover:not(:disabled) { opacity: 0.85; }
.btn-refresh:disabled { opacity: 0.6; cursor: not-allowed; }

/* --- FILTRO POR TIPO --- */
.type-filters { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
.type-chip {
  --chip-color: var(--accent);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  color: var(--text-dim);
  border-radius: 20px;
  padding: 5px 12px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease;
}
.type-chip.chip-bsod { --chip-color: var(--bsod-color); }
.type-chip.chip-shutdown { --chip-color: var(--shutdown-color); }
.type-chip.chip-video { --chip-color: var(--video-color); }
.type-chip.chip-whea { --chip-color: var(--whea-color); }
.type-chip:hover { border-color: var(--chip-color); }
.type-chip.active { border-color: var(--chip-color); color: var(--chip-color); }
.chip-count {
  background: var(--bg-hover);
  border-radius: 10px;
  padding: 0 7px;
  font-size: 0.72rem;
  color: var(--text-main);
}

.connection-error {
  background: var(--status-fail-glow);
  border: 1px solid var(--status-fail);
  color: var(--status-fail);
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 0.8rem;
  margin-bottom: 14px;
}

/* --- ÁREA DOS CARDS --- */
.cards-scroll { flex: 1; overflow-y: auto; padding-right: 4px; }
.cards-scroll::-webkit-scrollbar { width: 6px; }
.cards-scroll::-webkit-scrollbar-track { background: transparent; }
.cards-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 10px; }
.cards-scroll::-webkit-scrollbar-thumb:hover { background: var(--accent); }

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 14px;
}

.crash-card {
  --type-color: var(--bsod-color);
  display: flex;
  flex-direction: column;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 16px 18px 12px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.crash-card.type-shutdown { --type-color: var(--shutdown-color); }
.crash-card.type-video { --type-color: var(--video-color); }
.crash-card.type-whea { --type-color: var(--whea-color); }

.btn-provas {
  background: transparent;
  border: 1px solid var(--accent);
  border-radius: 10px;
  color: var(--accent);
  font-weight: 700;
  padding: 9px 14px;
  cursor: pointer;
}
.btn-provas:hover:not(:disabled) { background: var(--accent-glow); }
.btn-provas:disabled { opacity: 0.6; cursor: wait; }

.provas-status {
  font-size: 0.78rem;
  color: var(--text-main);
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px 12px;
  margin: 0 0 12px;
  word-break: break-all;
}

.btn-testar-nucleo {
  align-self: flex-start;
  background: color-mix(in srgb, var(--whea-color) 14%, transparent);
  border: 1px solid var(--whea-color);
  color: var(--whea-color);
  font-size: 0.78rem;
  font-weight: 700;
  border-radius: 8px;
  padding: 6px 10px;
  margin-bottom: 10px;
  cursor: pointer;
}
.btn-testar-nucleo:hover { background: color-mix(in srgb, var(--whea-color) 24%, transparent); }
.crash-card:hover { border-color: var(--type-color); box-shadow: 0 6px 18px var(--shadow-color); }

.card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 12px; }
.badges { display: flex; flex-wrap: wrap; gap: 6px; }

.badge {
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.5px;
  padding: 3px 9px;
  border-radius: 20px;
  border: 1px solid transparent;
  white-space: nowrap;
}
.badge-type { color: var(--type-color); border-color: var(--type-color); background: color-mix(in srgb, var(--type-color) 14%, transparent); }
.badge-cat { color: var(--accent); border-color: var(--accent); background: var(--accent-glow); }
.badge-sev.sev-high { color: var(--status-fail); border-color: var(--status-fail); background: var(--status-fail-glow); }
.badge-sev.sev-medium { color: #f59e0b; border-color: #f59e0b; background: rgba(245, 158, 11, 0.15); }
.badge-sev.sev-low { color: var(--status-pass); border-color: var(--status-pass); background: var(--status-pass-glow); }

.code-area { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.btn-copy {
  background: var(--bg-hover);
  border: 1px solid var(--border);
  color: var(--text-dim);
  font-size: 0.68rem;
  padding: 4px 8px;
  border-radius: 7px;
  cursor: pointer;
}
.btn-copy:hover { color: var(--text-main); border-color: var(--accent); }
.code-box {
  font-family: var(--font-mono, 'Consolas', monospace);
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--type-color);
  border: 1px solid var(--border);
  background: var(--bg-app);
  border-radius: 8px;
  padding: 4px 10px;
}

.crash-name {
  font-family: var(--font-mono, 'Consolas', monospace);
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0 0 4px;
  word-break: break-word;
}
.crash-meta { display: flex; align-items: center; gap: 5px; font-size: 0.75rem; color: var(--text-dim); margin: 0 0 10px; }
.meta-sep { opacity: 0.5; }
.crash-desc { font-size: 0.84rem; line-height: 1.45; color: var(--text-main); opacity: 0.85; margin: 0 0 10px; }

.info-box {
  border-left: 3px solid var(--accent);
  background: var(--bg-hover);
  border-radius: 0 8px 8px 0;
  padding: 8px 10px;
  margin-bottom: 10px;
}
.info-box p { margin: 0; font-size: 0.82rem; line-height: 1.4; color: var(--text-main); }
.box-label {
  display: block;
  font-size: 0.64rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--text-dim);
  margin-bottom: 3px;
}
/* Diagnóstico da equipe — o dado mais importante pro técnico */
.cause-box { border-left-color: #ffd166; }
.cause-box p { color: #ffd166; font-weight: 600; }
.cause-box.is-ia { border-left-color: var(--text-dim); }
.cause-box.is-ia p { color: var(--text-main); font-weight: 500; }
.driver-box { border-left-color: var(--video-color); }
.driver-box code { font-family: var(--font-mono, 'Consolas', monospace); color: var(--video-color); font-weight: 700; }
.box-tip { margin-top: 4px !important; font-size: 0.75rem !important; color: var(--text-dim) !important; }

.details { border-top: 1px solid var(--border); padding-top: 10px; margin-bottom: 8px; }
.details h4 { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.8px; color: var(--text-dim); margin: 0 0 6px; }
.details ol { margin: 0 0 10px; padding-left: 20px; font-size: 0.8rem; line-height: 1.5; color: var(--text-main); }
.commands { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.commands code {
  font-family: var(--font-mono, 'Consolas', monospace);
  font-size: 0.74rem;
  background: var(--bg-app);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 3px 8px;
  color: var(--accent);
}
.raw-msg summary { font-size: 0.75rem; color: var(--text-dim); cursor: pointer; }
.raw-msg pre {
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 0.72rem;
  color: var(--text-dim);
  background: var(--bg-app);
  border-radius: 6px;
  padding: 8px;
  margin: 6px 0 0;
}

.card-foot { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-top: auto; padding-top: 6px; }
.btn-details {
  background: none;
  border: none;
  color: var(--accent);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}
.btn-details:hover { text-decoration: underline; }
.tags { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 5px; }
.tag {
  font-size: 0.68rem;
  color: var(--text-dim);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 1px 7px;
}

/* --- ESTADOS --- */
.state-info { padding: 80px 20px; text-align: center; }
.spinner {
  width: 30px; height: 30px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 15px;
}
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 700px) {
  .cards-grid { grid-template-columns: 1fr; }
  .search-input { width: 100%; }
}
</style>
