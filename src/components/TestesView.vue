<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { globalState } from '@/store.js';


// Importação dos componentes de teste
import SpeakerTest from '@/components/tests/SpeakerTest.vue'
import MicTest from '@/components/tests/MicTest.vue'
import MicTestGrava from '@/components/tests/MicTestGrava.vue'
import CameraTest from '@/components/tests/CameraTest.vue'
import LcdTest from '@/components/tests/LcdTest.vue'
import KeyboardTest from '@/components/tests/KeyboardTest.vue';
import Joystick3dTest from '@/components/tests/Joystick3dTest.vue';
import NetworkTest from '@/components/tests/NetworkTest.vue';
import MouseTest from '@/components/tests/MouseTest.vue';
import BatteryTest from '@/components/tests/BatteryTest.vue';
import UsbTest from '@/components/tests/UsbTest.vue';
import AutoTest from '@/components/tests/AutoTest.vue';
import Icons from '@/components/common/Icons.vue';
import TouchScreen from '@/components/tests/TouchScreen.vue';
import FingerprintTest from '@/components/tests/FingerprintTest.vue';

// --- CONFIGURAÇÃO DA API LOCAL (agente C#) ---
const API_BASE_URL = 'http://localhost:5000/api';

const currentTest = ref(null);
const runner = ref(null);
// Muda pra forçar a remontagem do teste atual (ex: técnico desistiu de
// interromper o Teste Final e o mesmo teste precisa recomeçar do zero).
const execucao = ref(0);

// Joystick fica escondido (pouco usado e ainda em ajuste): F3 na tela de
// testes mostra/esconde o botão.
const mostrarJoystick = ref(false);

const startTest = (testKey) => {
  currentTest.value = testKey;
};

// --- TESTE FINAL (sequencial) ---
// Ordem fixa dos testes. No Teste Final o microfone usa só o Rec & Play
// (MicTestGrava), sem o menu de sub-testes do MicTest.
const SEQUENCIA_FINAL = ['lcd', 'touchpad', 'teclado', 'microfone', 'speaker', 'webcam', 'redes', 'battery', 'usb', 'fingerprint', 'touchscreen'];

const sequencia = ref(null); // lista de chaves enquanto o Teste Final está rodando
const indiceSequencia = ref(0);
const detectando = ref(false);
const avisoDispositivos = ref(null); // { faltando: string[], lista: string[], agenteOffline: bool }

const emTesteFinal = computed(() => sequencia.value !== null);

// Fingerprint vem do agente (classe PnP "Biometric"); touchscreen vem do
// agente ou do próprio navegador (maxTouchPoints), o que detectar primeiro.
async function detectarDispositivos() {
  let fingerprint = false;
  let touchscreen = navigator.maxTouchPoints > 0;
  let agenteOffline = false;
  try {
    const response = await fetch(`${API_BASE_URL}/devices/presence`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    fingerprint = !!data.fingerprint;
    touchscreen = touchscreen || !!data.touchscreen;
  } catch (err) {
    agenteOffline = true;
    console.warn('Não foi possível detectar os dispositivos pelo agente local:', err);
  }
  return { fingerprint, touchscreen, agenteOffline };
}

async function iniciarTesteFinal() {
  detectando.value = true;
  const { fingerprint, touchscreen, agenteOffline } = await detectarDispositivos();
  detectando.value = false;

  const faltando = [];
  if (!fingerprint) faltando.push('FingerPrint');
  if (!touchscreen) faltando.push('Touchscreen');

  const lista = SEQUENCIA_FINAL.filter((key) =>
    (key !== 'fingerprint' || fingerprint) && (key !== 'touchscreen' || touchscreen)
  );

  if (faltando.length) {
    avisoDispositivos.value = { faltando, lista, agenteOffline };
    return;
  }
  comecarSequencia(lista);
}

function comecarSequencia(lista) {
  avisoDispositivos.value = null;
  sequencia.value = lista;
  indiceSequencia.value = 0;
  currentTest.value = lista[0];
}

function encerrarSequencia() {
  sequencia.value = null;
  indiceSequencia.value = 0;
  currentTest.value = null;
}

function avancarSequencia() {
  const proximo = indiceSequencia.value + 1;
  if (proximo >= sequencia.value.length) {
    // Fim: vai pra aba de relatórios, onde o técnico digita a O.S. e salva
    encerrarSequencia();
    globalState.activeMenu = 'relatorios';
    return;
  }
  indiceSequencia.value = proximo;
  currentTest.value = sequencia.value[proximo];
}

// Os testes emitem 'test-completed' com (resultado, detalhe) — o detalhe é o
// que o teste conseguiu ler (ver src/utils/detalhesTeste.js) e vai pro banco.
const handleTestCompletion = (result, detalhe = '') => {
  const key = currentTest.value;
  if (!key) return;
  const temResultado = result === 'PASS' || result === 'FAIL';
  if (temResultado) globalState.saveResult(key, result, detalhe);

  if (!emTesteFinal.value) {
    currentTest.value = null;
    return;
  }

  // No Teste Final, PASS e FAIL seguem pro próximo. Voltar/cancelar pergunta
  // se é pra interromper a sequência (os resultados já salvos ficam).
  if (temResultado) return avancarSequencia();
  if (confirm('Interromper o Teste Final? Os resultados já registrados serão mantidos.')) {
    encerrarSequencia();
  } else {
    execucao.value++; // recomeça o mesmo teste
  }
};

const getResultClass = (testKey) => {
  const result = globalState.testResults[testKey]?.result;
  if (result === 'PASS') return 'result-pass';
  if (result === 'FAIL') return 'result-fail';
  return '';
};

const testButtons = [
  { key: 'lcd', title: globalState.t('hardware.lcd'), icon: 'lcd' },
  { key: 'touchpad', title: globalState.t('hardware.touchpad'), icon: 'touchpad' },
  { key: 'teclado', title: globalState.t('hardware.keyboard'), icon: 'keyboard' },
  { key: 'microfone', title: globalState.t('hardware.mic'), icon: 'mic' },
  { key: 'speaker', title: globalState.t('hardware.speaker'), icon: 'speaker' },
  { key: 'webcam', title: globalState.t('hardware.webcam'), icon: 'webcam' },
  { key: 'redes', title: globalState.t('hardware.network'), icon: 'network' },
  { key: 'battery', title: globalState.t('hardware.battery'), icon: 'battery' }, // Usei 'battery' como placeholder
  { key: 'joystick', title: globalState.t('hardware.joystick'), icon: 'joystick' }, // Usei 'joystick' como placeholder
  { key: 'usb', title: globalState.t('hardware.usb'), icon: 'usb' },
  { key: 'touchscreen', title: globalState.t('hardware.touchscreen'), icon: 'touchscreen' },
  { key: 'auto', title: globalState.t('hardware.auto_test'), icon: 'test-list' },
  { key: 'fingerprint', title: globalState.t('hardware.fingerprint'), icon: 'fingerprint' },
];

const nomeDoTeste = (key) => testButtons.find((t) => t.key === key)?.title || key;

const botoesVisiveis = computed(() =>
  testButtons.filter((t) => t.key !== 'joystick' || mostrarJoystick.value)
);

// --- ATALHOS DE TECLADO ---
// F3: mostra/esconde o joystick (só na grade de testes).
// Espaço: aperta o PASS quando ele já está liberado (classe "pass-ready",
// ver theme.css) — exceto no teste de teclado, onde o Espaço é uma tecla a
// testar, e em tela cheia (LCD/touchscreen), pra não aprovar sem querer.
function onKeydown(e) {
  if (e.key === 'F3') {
    e.preventDefault();
    if (currentTest.value === null) mostrarJoystick.value = !mostrarJoystick.value;
    return;
  }

  const ehEspaco = e.code === 'Space' || e.key === ' ';
  if (!ehEspaco || e.repeat || !currentTest.value || currentTest.value === 'teclado') return;
  if (document.fullscreenElement) return;
  const tag = (e.target?.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

  const botaoPass = runner.value?.querySelector('button.pass-ready:not(:disabled)');
  if (!botaoPass) return;
  e.preventDefault(); // evita o Espaço "clicar" também o botão que estiver com foco
  document.activeElement?.blur?.();
  botaoPass.click();
}

onMounted(() => window.addEventListener('keydown', onKeydown));
onUnmounted(() => window.removeEventListener('keydown', onKeydown));
</script>

<template>
  <div class="testes-view-container">
    <div v-if="currentTest === null">
      <div class="section-header">
        <h2 class="section-title">Testes de Periféricos</h2>
        <button class="btn-final-test" :disabled="detectando" @click="iniciarTesteFinal">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polygon points="6 4 20 12 6 20 6 4" />
          </svg>
          {{ detectando ? 'Verificando...' : 'Final Test' }}
        </button>
      </div>
      <div class="test-grid">
        <button v-for="test in botoesVisiveis"
          :key="test.key"
          class="test-card"
          :class="getResultClass(test.key)"
          @click="startTest(test.key)"
        >
          <Icons :name="test.icon" size="48" class="test-icon-svg" />

          <h3>{{ test.title }}</h3>

          <p class="result-label" v-if="globalState.testResults[test.key]">
            {{ globalState.testResults[test.key].result || globalState.t('status.waiting') }}
          </p>
        </button>
      </div>
    </div>

    <template v-else>
      <!-- Progresso do Teste Final -->
      <div v-if="emTesteFinal" class="final-progress">
        <span class="final-label">TESTE FINAL</span>
        <span class="final-step">{{ indiceSequencia + 1 }}/{{ sequencia.length }}</span>
        <span class="final-name">{{ nomeDoTeste(currentTest) }}</span>
        <div class="final-bar">
          <div class="final-bar-fill" :style="{ width: ((indiceSequencia + 1) / sequencia.length * 100) + '%' }"></div>
        </div>
        <span class="final-hint">Espaço = PASS e próximo</span>
      </div>

      <div class="test-runner-container" ref="runner" :key="execucao">
        <LcdTest v-if="currentTest === 'lcd'" @test-completed="handleTestCompletion" @test-cancelled="handleTestCompletion" />
        <SpeakerTest v-else-if="currentTest === 'speaker'" @test-completed="handleTestCompletion" @test-cancelled="handleTestCompletion" />
        <MicTestGrava v-else-if="currentTest === 'microfone' && emTesteFinal" @test-completed="handleTestCompletion" @test-cancelled="handleTestCompletion" />
        <MicTest v-else-if="currentTest === 'microfone'" @test-completed="handleTestCompletion" @test-cancelled="handleTestCompletion" />
        <CameraTest v-else-if="currentTest === 'webcam'" @test-completed="handleTestCompletion" @test-cancelled="handleTestCompletion" />
        <Joystick3dTest v-else-if="currentTest === 'joystick'" @test-completed="handleTestCompletion" @test-cancelled="handleTestCompletion" />
        <KeyboardTest v-else-if="currentTest === 'teclado'" @test-completed="handleTestCompletion" @test-cancelled="handleTestCompletion" />
        <NetworkTest v-else-if="currentTest === 'redes'" @test-completed="handleTestCompletion" @test-cancelled="handleTestCompletion" />
        <MouseTest v-else-if="currentTest === 'touchpad'" @test-completed="handleTestCompletion" @test-cancelled="handleTestCompletion" />
        <BatteryTest v-else-if="currentTest === 'battery'" @test-completed="handleTestCompletion" @test-cancelled="handleTestCompletion" />
        <UsbTest v-else-if="currentTest === 'usb'" @test-completed="handleTestCompletion" @test-cancelled="handleTestCompletion" />
        <TouchScreen v-else-if="currentTest === 'touchscreen'" @test-completed="handleTestCompletion" @test-cancelled="handleTestCompletion" />
        <AutoTest v-else-if="currentTest === 'auto'" @test-completed="handleTestCompletion" @test-cancelled="handleTestCompletion" />
        <FingerprintTest v-else-if="currentTest === 'fingerprint'" @test-completed="handleTestCompletion" @test-cancelled="handleTestCompletion" />
      </div>
    </template>

    <!-- Aviso: fingerprint/touchscreen não detectados -->
    <div v-if="avisoDispositivos" class="modal-backdrop">
      <div class="modal">
        <h3 class="modal-title">Dispositivo não detectado</h3>
        <p class="modal-text">
          Não foi detectado <strong>{{ avisoDispositivos.faltando.join(' e ') }}</strong>.
          Se a máquina possuir, realize o reparo antes do Teste Final.
        </p>
        <p v-if="avisoDispositivos.agenteOffline" class="modal-note">
          O agente local (porta 5000) não respondeu, então o FingerPrint não pôde ser verificado.
        </p>
        <p class="modal-note">
          Continuando, {{ avisoDispositivos.faltando.length > 1 ? 'esses testes serão removidos' : 'esse teste será removido' }}
          da sequência ({{ avisoDispositivos.lista.length }} testes).
        </p>
        <div class="modal-actions">
          <button class="btn-ghost" @click="avisoDispositivos = null">Cancelar</button>
          <button class="btn-primary" @click="comecarSequencia(avisoDispositivos.lista)">Continuar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.section-title {
  font-size: 1.5rem;
  font-weight: 500;
  margin-bottom: 2rem;
  color: var(--text-main);
  /* #ffffff no dark */
}

.test-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1.5rem;
}

.test-card {
  background-color: var(--bg-panel);
  /* #23263a */
  border: 1px solid var(--border);
  /* #2a2d3a */
  border-radius: 18px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  transition: all 0.4s ease;
  text-align: center;
}

.test-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px var(--accent-glow);
  border-color: var(--accent);
  /* #ff6b35 */
  background-color: var(--bg-hover);
  /* #2a2d3a */
}

.test-card svg {
  color: var(--accent);
}

.test-card h3 {
  font-size: 1.25rem;
  color: var(--text-main);
  font-weight: 500;
}

.test-card p {
  font-size: 0.875rem;
  color: var(--text-dim);
  /* #9ca3af */
}
/* Adicione ou ajuste esta classe para garantir que o ícone herde a cor do tema */
.test-icon-svg {
  color: var(--accent); /* Cor laranja que você gosta */
  transition: color 0.3s ease;
}

/* Quando passar o teste, o ícone pode ficar verde */
.result-pass .test-icon-svg {
  color: var(--status-pass);
}

/* Quando falhar, o ícone fica vermelho */
.result-fail .test-icon-svg {
  color: var(--status-fail);
}


/* NOVOS ESTILOS PARA INDICAR O RESULTADO COM VARIÁVEIS */
.result-pass {
  border-color: var(--status-pass) !important;
  box-shadow: 0 4px 8px var(--status-pass-glow);
}

.result-pass:hover {
  border-color: var(--status-pass) !important;
  box-shadow: 0 8px 16px var(--status-pass-glow);
}

.result-fail {
  border-color: var(--status-fail) !important;
  box-shadow: 0 4px 8px var(--status-fail-glow);
}

.result-fail:hover {
  border-color: var(--status-fail) !important;
  box-shadow: 0 8px 16px var(--status-fail-glow);
}

.test-card.result-pass p,
.test-card.result-fail p {
  font-weight: bold;
  color: var(--text-main);
  /* Adaptável conforme o tema */
}

.test-card.result-pass {
  /* Corrigido o valor de box-shadow que estava '10 12 12px' */
  box-shadow: 0 4px 12px var(--status-pass-glow);
}

.test-card.result-fail {
  box-shadow: 0 0 10px var(--status-fail-glow);
}

/* Corrigir a cor da label de resultado */
.result-pass .result-label {
  color: var(--status-pass);
}

.result-fail .result-label {
  color: var(--status-fail);
}

/* --- CABEÇALHO COM O BOTÃO FINAL TEST --- */
.section-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.section-header .section-title {
  margin-bottom: 0;
}

.btn-final-test {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  background: var(--accent);
  border: 1px solid var(--accent);
  color: #fff;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  padding: 0.5rem 1rem;
  border-radius: 10px;
  cursor: pointer;
  transition: box-shadow 0.2s ease, opacity 0.2s ease;
}

.btn-final-test:hover:not(:disabled) {
  box-shadow: 0 0 14px var(--accent-glow);
}

.btn-final-test:disabled {
  opacity: 0.6;
  cursor: wait;
}

/* --- PROGRESSO DO TESTE FINAL --- */
.final-progress {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.5rem 0.9rem;
  margin-bottom: 0.75rem;
  font-size: 0.8rem;
}

.final-label {
  font-weight: 800;
  letter-spacing: 1px;
  color: var(--accent);
}

.final-step {
  font-family: var(--font-mono, 'Consolas', monospace);
  color: var(--text-main);
}

.final-name {
  color: var(--text-main);
  font-weight: 600;
}

.final-bar {
  flex: 1;
  height: 4px;
  background: var(--bg-hover);
  border-radius: 4px;
  overflow: hidden;
}

.final-bar-fill {
  height: 100%;
  background: var(--accent);
  transition: width 0.3s ease;
}

.final-hint {
  color: var(--text-dim);
  font-size: 0.72rem;
}

/* --- AVISO DE DISPOSITIVO NÃO DETECTADO --- */
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
  max-width: 460px;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-top: 3px solid var(--status-fail);
  border-radius: 14px;
  padding: 1.4rem;
  box-shadow: 0 20px 50px var(--shadow-color);
}

.modal-title {
  font-size: 1.1rem;
  color: var(--text-main);
  margin-bottom: 0.75rem;
}

.modal-text {
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--text-main);
}

.modal-text strong {
  color: var(--status-fail);
}

.modal-note {
  margin-top: 0.6rem;
  font-size: 0.8rem;
  color: var(--text-dim);
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
}

.btn-ghost {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-dim);
}

.btn-ghost:hover {
  background: var(--bg-hover);
  color: var(--text-main);
}

.btn-primary {
  background: var(--accent);
  border: 1px solid var(--accent);
  color: #fff;
}
</style>
