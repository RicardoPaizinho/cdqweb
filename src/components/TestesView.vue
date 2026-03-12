<script setup>
import { ref } from 'vue';
import { globalState } from '@/store.js';

// Importação dos componentes de teste
import SpeakerTest from '@/components/tests/SpeakerTest.vue'
import MicTest from '@/components/tests/MicTest.vue'
import CameraTest from '@/components/tests/CameraTest.vue'
import LcdTest from '@/components/tests/LcdTest.vue'
import KeyboardTest from '@/components/tests/KeyboardTest.vue';
import Joystick3dTest from '@/components/tests/Joystick3dTest.vue';
import NetworkTest from '@/components/tests/NetworkTest.vue';
import MouseTest from '@/components/tests/MouseTest.vue';
import BatteryTest from '@/components/tests/BatteryTest.vue';
import UsbTest from '@/components/tests/UsbTest.vue';

const currentTest = ref(null);

const startTest = (testKey) => {
  currentTest.value = testKey;
};

const handleTestCompletion = (result) => {
  if (currentTest.value) {
    if (result === 'PASS' || result === 'FAIL') {
      globalState.saveResult(currentTest.value, result);
    }
    currentTest.value = null;
  }
};

const getResultClass = (testKey) => {
  const result = globalState.testResults[testKey]?.result;
  if (result === 'PASS') return 'result-pass';
  if (result === 'FAIL') return 'result-fail';
  return '';
};

const testButtons = [
  { key: 'lcd', title: 'LCD' },
  { key: 'touchpad', title: 'Touchpad' },
  { key: 'teclado', title: 'Teclado' },
  { key: 'microfone', title: 'Microfone' },
  { key: 'speaker', title: 'Speaker' },
  { key: 'webcam', title: 'Webcam' },
  { key: 'redes', title: 'Redes' },
  { key: 'battery', title: 'Bateria' },
  { key: 'joystick', title: 'Joystick' },
  { key: 'usb', title: 'Portas USB' },
];
</script>

<template>
  <div class="testes-view-container">
    <div v-if="currentTest === null">
      <h2 class="section-title">Testes de Periféricos</h2>
      <div class="test-grid">
        <button v-for="(test, index) in testButtons" 
          :key="index" 
          class="test-card" 
          :class="getResultClass(test.key)"
          @click="startTest(test.key)"
        >
          <template v-if="test.key === 'lcd'">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
          </template>

          <template v-else-if="test.key === 'touchpad'">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="5" y="2" width="14" height="20" rx="7" ry="7" />
              <line x1="12" y1="6" x2="12" y2="10" />
            </svg>
          </template>

          <template v-else-if="test.key === 'usb'">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 22V10M12 10L9 7M12 10L15 7M7 7a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm10 0a2 2 0 1 1 0-4 2 2 0 0 1 0 4zM12 6a2 2 0 1 1 0-4 2 2 0 0 1 0 4z" />
            </svg>
          </template>

          <template v-else-if="test.key === 'teclado'">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 13h.01M18 13h.01M10 13h4" />
            </svg>
          </template>

          <template v-else>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </template>

          <h3>{{ test.title }}</h3>
          
          <p class="result-label" v-if="globalState.testResults[test.key]">
            {{ globalState.testResults[test.key].result || globalState.testResults[test.key].label || 'Aguardando' }}
          </p>
        </button>
      </div>
    </div>

    <div v-else class="test-runner-container">
      <LcdTest v-if="currentTest === 'lcd'" @test-completed="handleTestCompletion" @test-cancelled="handleTestCompletion" />
      <SpeakerTest v-else-if="currentTest === 'speaker'" @test-completed="handleTestCompletion" @test-cancelled="handleTestCompletion" />
      <MicTest v-else-if="currentTest === 'microfone'" @test-completed="handleTestCompletion" @test-cancelled="handleTestCompletion" />
      <CameraTest v-else-if="currentTest === 'webcam'" @test-completed="handleTestCompletion" @test-cancelled="handleTestCompletion" />
      <Joystick3dTest v-else-if="currentTest === 'joystick'" @test-completed="handleTestCompletion" @test-cancelled="handleTestCompletion" />
      <KeyboardTest v-else-if="currentTest === 'teclado'" @test-completed="handleTestCompletion" @test-cancelled="handleTestCompletion" />
      <NetworkTest v-else-if="currentTest === 'redes'" @test-completed="handleTestCompletion" @test-cancelled="handleTestCompletion" />
      <MouseTest v-else-if="currentTest === 'touchpad'" @test-completed="handleTestCompletion" @test-cancelled="handleTestCompletion" />
      <BatteryTest v-else-if="currentTest === 'battery'" @test-completed="handleTestCompletion" @test-cancelled="handleTestCompletion" />
      <UsbTest v-else-if="currentTest === 'usb'" @test-completed="handleTestCompletion" @test-cancelled="handleTestCompletion" />
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
</style>
