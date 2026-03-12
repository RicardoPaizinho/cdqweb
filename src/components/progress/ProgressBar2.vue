<template>
  <div class="cyber-progress-container">
    <div class="progress-info">
      <span class="label tech-font">{{ label }}</span>
      <span class="percent tech-font">{{ Math.round(progressValue) }}%</span>
    </div>
    
    <div class="progress-track">
      <div class="segments-placeholder"></div>

      <div 
        class="progress-fill-mask" 
        :style="{ width: progressValue + '%' }"
      >
        <div class="active-segments"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  label: String,
  progressValue: {
    type: [Number, String],
    default: 0
  }
});
</script>

<style scoped>
.cyber-progress-container {
  margin-top: 20px;
  margin-left: 10px;
  margin-bottom: 30px;
  width: calc(100% - 20px);
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.label {
  font-size: 0.75rem;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 2px;
}

.percent {
  font-size: 1rem;
  color: var(--accent);
  font-weight: 800;
  text-shadow: 0 0 12px var(--accent-glow);
}

.progress-track {
  height: 18px; /* Mais grossa para destacar os blocos */
  position: relative;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 3px;
  overflow: hidden;
}

/* CONFIGURAÇÃO DOS SEGMENTOS:
   8px de bloco + 4px de espaço = 12px por segmento.
   Em uma sidebar de 180px, isso resulta em exatos 15 segmentos.
*/

.segments-placeholder {
  position: absolute;
  width: 100%;
  height: 100%;
  background: repeating-linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.05) 0px,
    rgba(255, 255, 255, 0.05) 8px, /* Largura do bloco vazio */
    transparent 8px,
    transparent 12px              /* Espaço total (8 + 4) */
  );
}

.progress-fill-mask {
  height: 100%;
  position: absolute;
  left: 0;
  top: 0;
  /* Transição "step" ou suave, usei suave para fluidez */
  transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  z-index: 2;
}

.active-segments {
  width: 1000px; 
  height: 100%;
  background: repeating-linear-gradient(
    90deg,
    var(--accent) 0px,
    var(--accent) 8px,            /* Largura do bloco aceso */
    transparent 8px,
    transparent 12px              /* Espaço total (8 + 4) */
  );
  
  /* Brilho Neon Cintilante */
  filter: drop-shadow(0 0 5px var(--accent)) 
          drop-shadow(0 0 15px var(--accent-glow));
  
  animation: neonPulse 2.5s infinite ease-in-out;
}

@keyframes neonPulse {
  0%, 100% { 
    filter: drop-shadow(0 0 5px var(--accent)) drop-shadow(0 0 15px var(--accent-glow)); 
    opacity: 1;
  }
  50% { 
    filter: drop-shadow(0 0 8px var(--accent)) drop-shadow(0 0 25px var(--accent-glow)); 
    opacity: 0.9;
  }
}

.tech-font {
  font-family: 'Orbitron', sans-serif;
}
</style>