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
import AutoTest from '@/components/tests/AutoTest.vue';
import Icons from '@/components/common/Icons.vue';
import TouchScreen from '@/components/tests/TouchScreen.vue';

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
  { key: 'lcd', title: 'LCD', icon: 'lcd' },
  { key: 'touchpad', title: 'Touchpad', icon: 'touchpad' },
  { key: 'teclado', title: 'Teclado', icon: 'keyboard' },
  { key: 'microfone', title: 'Microfone', icon: 'mic' },
  { key: 'speaker', title: 'Speaker', icon: 'speaker' },
  { key: 'webcam', title: 'Webcam', icon: 'webcam' },
  { key: 'redes', title: 'Redes', icon: 'network' },
  { key: 'battery', title: 'Bateria', icon: 'battery' }, // Usei 'battery' como placeholder
  { key: 'joystick', title: 'Joystick', icon: 'joystick' }, // Usei 'joystick' como placeholder
  { key: 'usb', title: 'Portas USB', icon: 'usb' },
  { key: 'touchscreen', title: 'Touchscreen', icon: 'touchscreen' },
  { key: 'auto', title: 'Teste Automático', icon: 'test-list' },
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
          <Icons :name="test.icon" size="48" class="test-icon-svg" />

          <h3>{{ test.title }}</h3>
          
          <p class="result-label" v-if="globalState.testResults[test.key]">
            {{ globalState.testResults[test.key].result || 'Aguardando' }}
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
      <TouchScreen v-else-if="currentTest === 'touchscreen'" @test-completed="handleTestCompletion" @test-cancelled="handleTestCompletion" />
      <AutoTest v-else-if="currentTest === 'auto'" @test-completed="handleTestCompletion" @test-cancelled="handleTestCompletion" />
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
</style>
