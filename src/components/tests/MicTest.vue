<template>
  <div class="test-container">
    <header class="test-header">
      <div class="title-group">
        <h4 class="tech-font">
          DIAGNÓSTICO DE ÁUDIO 
          <span v-if="activeTest" class="text-accent"> > {{ activeTest.toUpperCase() }}</span>
        </h4>
        <button class="btn-glass back-neon tech-font" @click="goBack">
          VOLTAR
        </button>
      </div>
    </header>

    <div class="main-layout">
      <div class="test-content glass-panel">
        
        <div v-if="!activeTest" class="selection-grid">
          <div class="card-selection card-glass" @click="activeTest = 'grava'">
            <div class="icon-wrap">🎙️</div>
            <h3 class="tech-font">REC & PLAY</h3>
            <p>Validação manual por gravação.</p>
          </div>

          <div class="card-selection card-glass" @click="activeTest = 'loop'">
            <div class="icon-wrap">🔁</div>
            <h3 class="tech-font">LIVE LOOP</h3>
            <p>Monitoramento em tempo real.</p>
          </div>

          <div class="card-selection card-glass" @click="activeTest = 'notes'">
            <div class="icon-wrap">🎵</div>
            <h3 class="tech-font">AUTO NOTES</h3>
            <p>Análise de frequência digital.</p>
          </div>
        </div>

        <div v-else class="active-module-container">
          <!-- 
            Passamos a propriedade 'activeTest' se precisar dentro do filho, 
            ou escutamos o objeto completo vindo do emit no handleModuleResult
          -->
          <component 
            :is="currentModule" 
            @test-completed="handleModuleResult" 
            @test-cancelled="activeTest = null"
          />
        </div>

      </div>

      <aside class="decision-sidebar">
        <div v-if="!activeTest" class="info-status tech-font text-dim">
          SELECIONE UM<br>MÉTODO PARA<br>AVALIAÇÃO
        </div>
        <div v-else class="info-status tech-font text-active">
          TESTE EM<br>EXECUÇÃO
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { globalState } from '@/store.js';

import MicTestGrava from './MicTestGrava.vue';
import MicTestLoop from './MicTestLoop.vue';
import MicTestNotes from './MicTestNotes.vue';

const emit = defineEmits(['test-cancelled']);
const activeTest = ref(null);

const modules = {
  grava: MicTestGrava,
  loop: MicTestLoop,
  notes: MicTestNotes
};

const currentModule = computed(() => modules[activeTest.value]);

const goBack = () => {
  if (activeTest.value) {
    activeTest.value = null; // Se está num teste, volta pro menu interno
  } else {
    emit('test-cancelled'); // Se está no menu, sai do diagnóstico de áudio
  }
};

// Os sub-módulos emitem de duas formas:
//  - string simples 'PASS'/'FAIL' (Rec&Play, Live Loop -> testam só o mic)
//  - objeto { combined: true, result: 'PASS'/'FAIL' } (Auto Notes testa mic
//    e speaker ao mesmo tempo -> os dois recebem o mesmo resultado)
// Chamamos globalState.saveResult() direto (em vez de emitir 'test-completed',
// que o TestesView.vue só reconhece como string simples) — era exatamente
// esse o motivo do resultado do microfone não estar sendo salvo antes.
const handleModuleResult = (result) => {
  let isPass = false;

  if (result && result.combined) {
    globalState.saveResult('microfone', result.result);
    globalState.saveResult('speaker', result.result);
    isPass = result.result === 'PASS';
  } else if (result === 'PASS' || result === 'FAIL') {
    globalState.saveResult('microfone', result);
    isPass = result === 'PASS';
  }

  if (isPass) {
    emit('test-cancelled'); // fecha a tela de diagnóstico de áudio (já salvamos o resultado)
  } else {
    activeTest.value = null; // reprovado (ou resultado inválido): volta pro menu interno
  }
};
</script>

<style scoped>
.selection-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  height: 100%;
}

.card-selection {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid rgba(255,255,255,0.05);
}

.card-selection:hover {
  background: rgba(0, 255, 65, 0.05);
  border-color: #00ff41;
}

.icon-wrap { font-size: 2.5rem; margin-bottom: 10px; }
.card-selection h3 { color: #00ff41; font-size: 1rem; margin-bottom: 8px; }
.card-selection p { font-size: 0.75rem; color: #777; }

.active-module-container {
  height: 100%;
  width: 100%;
  animation: fadeIn 0.3s ease;
}

.info-status {
  text-align: center;
  font-size: 0.7rem;
  padding: 15px 5px;
  border-radius: 8px;
  background: rgba(0,0,0,0.2);
}

.text-active { color: #00ff41; text-shadow: 0 0 10px rgba(0,255,65,0.4); }

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>