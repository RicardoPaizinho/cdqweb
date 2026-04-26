<template>
  <div class="game-wrapper" ref="mainContainer">
    <div id="ui" class="tech-font">DIAGNÓSTICO TOUCHSCREEN: PERCORRA O LABIRINTO</div>
    
    <canvas 
      ref="gameCanvas" 
      class="touch-canvas"
      @mousedown="handleInput"
      @mousemove="handleMove"
      @touchstart.prevent="handleInput"
      @touchmove.prevent="handleInput"
    ></canvas>
    
    <div v-if="hasWon" class="win-overlay">
      <h1 class="neon-text tech-font">PASS APPLIED</h1>
      <p class="status-msg tech-font">SINAL DE TOQUE: 100% OPERACIONAL</p>
    </div>

    <div class="exit-hint tech-font" v-if="!hasWon">
      PRESS [ESC] PARA CANCELAR / FAIL
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

// Padronizado com seu teste de Speaker
const emit = defineEmits(['test-completed', 'test-cancelled']);

const gameCanvas = ref(null);
const mainContainer = ref(null);
let ctx = null;
let animationId = null;

// Estados de Jogo
const dots = ref([]);
const walls = ref([]);
const pacPos = ref({ x: 50, y: 50 });
const trail = ref([]);
const hasWon = ref(false);

// Configurações Técnicas
const pacSize = 22;
const speed = 9; 
const dotRadius = 8;
const minDotDistance = 35;
const maxTrailLength = 12;

// --- FUNÇÕES DE SAÍDA PADRONIZADAS ---
const handleEnd = (result) => {
  cancelAnimationFrame(animationId);
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
  emit('test-completed', result);
};

const init = () => {
  if (!gameCanvas.value) return;
  const canvas = gameCanvas.value;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  ctx = canvas.getContext('2d');

  // Gerar Labirinto Responsivo
  const gap = canvas.height / 6;
  const wallThickness = 25;
  const tempWalls = [];

  for (let i = 1; i < 6; i++) {
    let wallY = i * gap;
    if (i % 2 === 0) {
      tempWalls.push({ x: 0, y: wallY, w: canvas.width - 180, h: wallThickness });
    } else {
      tempWalls.push({ x: 180, y: wallY, w: canvas.width - 180, h: wallThickness });
    }
  }
  walls.value = tempWalls;
};

const handleInput = (e) => {
  if (hasWon.value) return;
  const rect = gameCanvas.value.getBoundingClientRect();
  const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
  const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;

  // Bloqueia criação de bolinhas dentro das paredes
  const inWall = walls.value.some(w => 
    x > w.x - 5 && x < w.x + w.w + 5 && y > w.y - 5 && y < w.y + w.h + 5
  );

  if (!inWall) {
    const lastDot = dots.value[dots.value.length - 1] || pacPos.value;
    if (Math.hypot(x - lastDot.x, y - lastDot.y) > minDotDistance) {
      dots.value.push({ x, y });
    }
  }
};

const handleMove = (e) => {
  if (e.buttons > 0 || (e.touches && e.touches.length > 0)) handleInput(e);
};

const update = () => {
  if (dots.value.length > 0) {
    const target = dots.value[0];
    const dx = target.x - pacPos.value.x;
    const dy = target.y - pacPos.value.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 5) {
      const nextX = pacPos.value.x + (dx / dist) * speed;
      const nextY = pacPos.value.y + (dy / dist) * speed;

      // Colisão de hardware (Box Check)
      const hitsWall = walls.value.some(w => 
        nextX > w.x - pacSize && nextX < w.x + w.w + pacSize &&
        nextY > w.y - pacSize && nextY < w.y + w.h + pacSize
      );

      if (!hitsWall) {
        // Atualiza Rastro
        trail.value.push({ ...pacPos.value });
        if (trail.value.length > maxTrailLength) trail.value.shift();
        
        pacPos.value.x = nextX;
        pacPos.value.y = nextY;
      } else {
        dots.value = []; // Limpa caminho se colidir
      }
    } else {
      dots.value.shift(); // Remove bolinha alcançada
    }
  } else {
    if (trail.value.length > 0) trail.value.shift(); // Dissipa rastro parado
  }

  // Vitória (Zona Verde Inferior Direita)
  if (pacPos.value.x > window.innerWidth - 130 && pacPos.value.y > window.innerHeight - 90) {
    if (!hasWon.value) {
      hasWon.value = true;
      setTimeout(() => handleEnd('PASS'), 1500);
    }
  }
};

const draw = () => {
  if (!ctx) return;
  
  // Limpeza com Alpha para rastro leve de fundo
  ctx.fillStyle = 'rgba(5, 5, 12, 0.4)';
  ctx.fillRect(0, 0, gameCanvas.value.width, gameCanvas.value.height);

  // 1. Paredes Neon
  walls.value.forEach(w => {
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00f2ff';
    ctx.strokeStyle = '#00f2ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(w.x, w.y, w.w, w.h);
    ctx.shadowBlur = 0;
  });

  // 2. Zona de Chegada (Target)
  ctx.fillStyle = 'rgba(57, 255, 20, 0.2)';
  ctx.strokeStyle = '#39ff14';
  ctx.lineWidth = 1;
  ctx.strokeRect(window.innerWidth - 130, window.innerHeight - 90, 110, 70);
  ctx.fillRect(window.innerWidth - 130, window.innerHeight - 90, 110, 70);

  // 3. Bolinhas (Inputs Detectados)
  dots.value.forEach(d => {
    ctx.fillStyle = '#fff0ff';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#5d5a56';
    ctx.beginPath();
    ctx.arc(d.x, d.y, dotRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  // 4. Rastro de Velocidade
  trail.value.forEach((p, index) => {
    const ratio = index / trail.value.length;
    ctx.fillStyle = `rgba(255, 255, 0, ${ratio * 0.4})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, pacSize * ratio, 0, Math.PI * 2);
    ctx.fill();
  });

  // 5. Pac-Man Animado
  ctx.save();
  ctx.translate(pacPos.value.x, pacPos.value.y);
  
  if (dots.value.length > 0) {
    const target = dots.value[0];
    const angle = Math.atan2(target.y - pacPos.value.y, target.x - pacPos.value.x);
    ctx.rotate(angle);
  }

  ctx.shadowBlur = 20;
  ctx.shadowColor = 'yellow';
  ctx.fillStyle = 'yellow';
  ctx.beginPath();
  const mouth = (Math.sin(Date.now() * 0.015) > 0) ? 0.25 : 0.05;
  ctx.arc(0, 0, pacSize, mouth * Math.PI, (2 - mouth) * Math.PI);
  ctx.lineTo(0, 0);
  ctx.fill();
  ctx.restore();

  update();
  animationId = requestAnimationFrame(draw);
};

// Teclado (ESC)
const handleKeyDown = (e) => {
  if (e.key === 'Escape') {
    handleEnd('FAIL');
  }
};

onMounted(() => {
  init();
  draw();
  
  // Entra em fullscreen automaticamente
  if (mainContainer.value) {
    mainContainer.value.requestFullscreen().catch(() => {});
  }

  window.addEventListener('resize', init);
  window.addEventListener('keydown', handleKeyDown);

  // Se sair do fullscreen manualmente, trata como cancelado
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && !hasWon.value) {
      emit('test-cancelled');
    }
  });
});

onUnmounted(() => {
  cancelAnimationFrame(animationId);
  window.removeEventListener('resize', init);
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
.game-wrapper {
  width: 100vw;
  height: 100vh;
  background-color: #050505;
  overflow: hidden;
  position: fixed;
  inset: 0;
  cursor: crosshair;
}

.touch-canvas {
  display: block;
  touch-action: none;
}

.tech-font {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  letter-spacing: 2px;
  font-weight: bold;
}

#ui {
  position: absolute;
  top: 20px;
  width: 100%;
  text-align: center;
  color: #00f2ff;
  text-shadow: 0 0 10px #00f2ff;
  pointer-events: none;
  z-index: 10;
  font-size: 0.9rem;
}

.win-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.neon-text {
  color: #39ff14;
  font-size: 4rem;
  text-shadow: 0 0 25px #39ff14;
  margin: 0;
}

.status-msg {
  color: #fff;
  margin-top: 10px;
  opacity: 0.8;
}

.exit-hint {
  position: absolute;
  bottom: 20px;
  width: 100%;
  text-align: center;
  color: rgba(255, 255, 255, 0.3);
  font-size: 0.7rem;
  pointer-events: none;
}
</style>