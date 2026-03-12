<template>
  <transition name="fade">
    <div v-if="isOpen" class="about-overlay" @click.self="$emit('close')">
      <div class="about-card">
        <div class="system-pulse">
          <div class="pulse-bar" v-for="n in 8" :key="n"></div>
        </div>

        <div class="about-header">
          <div class="header-line"></div>
          <h2>SYSTEM DIAGNOSTIC SUITE</h2>
          <p class="tagline">Engine de Monitoramento Avançado</p>
        </div>
        
        <div class="about-content">
          <p class="description">
            Uma solução de hardware-aware projetada para o ecossistema de informática moderno. 
            Integramos diagnóstico de baixo nível com visualização interativa para transformar 
            dados técnicos em decisões inteligentes.
          </p>
          
          <div class="specs-grid">
            <div class="spec-item">
              <span class="label">BUILD</span>
              <span class="value">v1.0.4-release</span>
            </div>
            <div class="spec-item">
              <span class="label">DESENVOLVIMENTO</span>
              <span class="value">Diagnostic Team</span>
            </div>
            <div class="spec-item">
              <span class="label">STATUS</span>
              <span class="value active-text">KERNEL ACTIVE</span>
            </div>
            <div class="spec-item">
              <span class="label">LICENSE</span>
              <span class="value">PROFESSIONAL</span>
            </div>
          </div>
        </div>

        <div class="about-footer">
          <a href="mailto:suporte@exemplo.com" class="contact-link">
            📩 suporte@exemplo.com
          </a>
          <button @click="$emit('close')" class="btn-close-about">FECHAR</button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
defineProps({
  isOpen: Boolean
});

defineEmits(['close']);
</script>

<style scoped>
.about-overlay {
  position: fixed; /* Fixed para cobrir todo o app independente de onde for chamado */
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.about-card {
  width: 480px;
  background: rgba(20, 20, 20, 0.8);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 40px;
  color: #fff;
  box-shadow: 0 0 50px rgba(0, 255, 136, 0.1);
  position: relative;
  clip-path: polygon(0 0, 100% 0, 100% 90%, 95% 100%, 0 100%); /* Corte industrial no canto */
}

/* Gráfico de Pulso Animado */
.system-pulse {
  position: absolute;
  top: 20px; right: 20px;
  display: flex;
  gap: 3px;
  align-items: flex-end;
  height: 20px;
}

.pulse-bar {
  width: 3px;
  background:  var(--accent);
  animation: pulse-grow 1s ease-in-out infinite;
}

.pulse-bar:nth-child(even) { animation-delay: 0.2s; }
.pulse-bar:nth-child(3n) { animation-delay: 0.4s; }

@keyframes pulse-grow {
  0%, 100% { height: 4px; opacity: 0.3; }
  50% { height: 100%; opacity: 1; }
}

.header-line { width: 40px; height: 3px; background: var(--accent);; margin-bottom: 12px; }

h2 {
  font-family: 'Orbitron', sans-serif;
  font-size: 1.3rem;
  letter-spacing: 2px;
  color: var(--accent);;
  margin: 0;
}

.tagline {
  font-size: 0.7rem;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 3px;
  margin-top: 5px;
}

.description {
  font-size: 0.9rem;
  line-height: 1.6;
  color: #bbb;
  margin: 25px 0;
}

.specs-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  padding: 20px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.label { font-size: 0.6rem; color: #555; display: block; margin-bottom: 2px; }
.value { font-family: monospace; font-size: 0.8rem; color: #eee; }
.active-text { color:var(--accent); text-shadow: 0 0 8px var(--accent-glow); }

.about-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
}

.contact-link { color: #555; text-decoration: none; font-size: 0.75rem; transition: 0.3s; }
.contact-link:hover { color: var(--accent); }

.btn-close-about {
  background: var(--accent);;
  border: none;
  color: #000;
  padding: 8px 25px;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.7rem;
  font-weight: bold;
  cursor: pointer;
  transition: 0.3s;
}

.btn-close-about:hover { background: #fff; transform: scale(1.05); }

.fade-enter-active, .fade-leave-active { transition: all 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: scale(1.05); }
</style>