<template>
  <div class="test-hub-container">
    <header class="hub-header">
      <h1>GRAPHIC BENCHMARKS</h1>
      <p>Selecione o módulo de estresse para validação da GPU</p>
    </header>

    <div class="tests-grid">
      <div class="test-card" @click="navigateToInternal">
        <div class="card-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--accent, #00ff88)" stroke-width="1.5">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
            <line x1="8" y1="21" x2="16" y2="21"/>
            <line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
        </div>
        <div class="card-body">
          <h3>Módulo Interno (Web Render)</h3>
          <p>Utiliza Three.js para renderização de malha complexa. Ideal para testes rápidos de artefatos de vídeo.</p>
        </div>
        <button class="btn-start">ABRIR LOGOVIEW</button>
      </div>

      <div class="test-card external" @click="openExternalTest">
        <div class="card-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ff4444" stroke-width="1.5">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </div>
        <div class="card-body">
          <h3>FurMark (gpuTest)</h3>
          <p>Executa o utilitário nativo de estresse máximo (Burn-in). Recomendado para testes de temperatura limite.</p>
          <span class="status-badge">REQUER MÓDULO LOCAL</span>
        </div>
        <button class="btn-start danger">EXECUTAR .EXE</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { globalState } from '@/store.js'; // Importante para mudar a tela globalmente

/**
 * Navegação para o LogoView
 * Alteramos diretamente o estado global para que o App.vue reaja imediatamente
 */
const navigateToInternal = () => {
  // Se o seu App.vue usa activeMenu, mudamos aqui:
  if (globalState) {
    globalState.activeMenu = 'LogoView';
  }
};

/**
 * Chamada Nativa (Bridge com C#)
 */
const openExternalTest = () => {
  if (window.chrome?.webview) {
    window.chrome.webview.postMessage({
      action: 'launch_exe',
      target: 'furmark',
      folder: 'gpuTest',
      fileName: 'FurMark.exe'
    });
    console.log("Comando enviado para o Host C#");
  } else {
    console.warn("Ambiente nativo não detectado.");
    alert("O executável externo só pode ser iniciado através do App Desktop.");
  }
};
</script>

<style scoped>
/* Mantive seus estilos originais que já estão ótimos */
.test-hub-container {
  padding: 40px;
  color: #fff;
  font-family: var(--font-tech, 'Orbitron'), sans-serif;
  animation: fadeIn 0.5s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.hub-header { 
  margin-bottom: 50px; 
  border-left: 4px solid var(--accent, #00ff88); 
  padding-left: 20px; 
}

.hub-header h1 { 
  font-size: 1.8rem; 
  letter-spacing: 3px; 
  margin: 0; 
  text-transform: uppercase;
}

.hub-header p { 
  color: #888; 
  font-size: 0.9rem; 
  margin-top: 5px; 
}

.tests-grid { 
  display: grid; 
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); 
  gap: 30px; 
}

.test-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 30px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.test-card:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: var(--accent, #00ff88);
  box-shadow: 0 0 20px rgba(0, 255, 136, 0.1);
  transform: translateY(-5px);
}

.test-card.external:hover {
  border-color: #ff4444;
  box-shadow: 0 0 20px rgba(255, 68, 68, 0.1);
}

.card-icon { margin-bottom: 20px; }
.card-body { flex-grow: 1; }

.test-card h3 { 
  margin: 0 0 12px 0; 
  font-size: 1.1rem; 
  color: #eee;
}

.test-card p { 
  font-family: 'Inter', sans-serif; 
  color: #999; 
  font-size: 0.85rem; 
  line-height: 1.6; 
}

.status-badge {
  display: inline-block;
  font-size: 10px;
  color: #ff4444;
  margin-top: 15px;
  background: rgba(255, 68, 68, 0.1);
  padding: 4px 10px;
  border-radius: 2px;
  font-weight: bold;
}

.btn-start {
  margin-top: 25px;
  background: transparent;
  border: 1px solid var(--accent, #00ff88);
  color: var(--accent, #00ff88);
  padding: 12px;
  font-family: var(--font-tech), sans-serif;
  font-size: 0.75rem;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: 1px;
}

.btn-start.danger { 
  border-color: #ff4444; 
  color: #ff4444; 
}

.test-card:hover .btn-start { 
  background: var(--accent, #00ff88); 
  color: #000; 
}

.test-card.external:hover .btn-start.danger { 
  background: #ff4444; 
  color: #fff; 
}
</style>