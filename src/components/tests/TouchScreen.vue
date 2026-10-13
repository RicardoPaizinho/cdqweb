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

    <!-- Camada 3D (Three.js) só com o Pac-Man, por cima do canvas 2D -->
    <div ref="pacmanLayer" class="pacman-layer"></div>

    <div class="exit-hint tech-font" v-if="!hasWon">
      PRESS [ESC] PARA CANCELAR / FAIL
    </div>

    <div class="model-credit" v-if="modeloCarregado">
      Modelo 3D "Pacman animated" por Luall_Studio — CC BY 4.0
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// Padronizado com seu teste de Speaker
const emit = defineEmits(['test-completed', 'test-cancelled']);

const gameCanvas = ref(null);
const mainContainer = ref(null);
const pacmanLayer = ref(null);
const modeloCarregado = ref(false);
let ctx = null;
let animationId = null;

// Estados de Jogo
const dots = ref([]);
const walls = ref([]);
const pacPos = ref({ x: window.innerWidth - 100, y: 50 });
const trail = ref([]);
const hasWon = ref(false);

// Configurações Técnicas
const pacSize = 35;
const speed = 10; 
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
  const wallThickness = 20;
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

  // 5. Pac-Man: modelo 3D animado quando carregado; senão, o desenho 2D
  if (modeloCarregado.value) {
    desenharBrilhoPacman();
    renderPacman3D();
  } else {
    desenharPacman2D();
  }

  update();
  animationId = requestAnimationFrame(draw);
};

const desenharPacman2D = () => {
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
};

// Brilho amarelo no chão, embaixo do modelo 3D (mantém o visual neon do 2D)
const desenharBrilhoPacman = () => {
  const { x, y } = pacPos.value;
  const raio = pacSize * ESCALA_DESENHO;
  const brilho = ctx.createRadialGradient(x, y, raio * 0.3, x, y, raio * 1.6);
  brilho.addColorStop(0, 'rgba(255, 255, 0, 0.35)');
  brilho.addColorStop(1, 'rgba(255, 255, 0, 0)');
  ctx.fillStyle = brilho;
  ctx.beginPath();
  ctx.arc(x, y, raio * 1.6, 0, Math.PI * 2);
  ctx.fill();
};

// --- PAC-MAN 3D (public/pacman_animated.glb) ---
// Câmera ortográfica com 1 unidade = 1 pixel da tela: o modelo vai exatamente
// pra pacPos, então colisão e lógica do jogo continuam todas no 2D.
let renderer = null;
let scene = null;
let camera = null;
let pivo = null; // gira pra direção do movimento
let giro = null; // perfil (andando) ou de frente pra câmera (parado)
let mixer = null;
const ESCALA_DESENHO = 0.8; // modelo 20% menor que o pacSize (colisão não muda)
const GIRO_PERFIL = Math.PI / 2;
const GIRO_FRENTE = 0;
const clock = new THREE.Clock();
let ultimoAngulo = 0;

const iniciarPacman3D = () => {
  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera(0, window.innerWidth, 0, -window.innerHeight, -1000, 1000);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  pacmanLayer.value.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 1.2));
  const luz = new THREE.DirectionalLight(0xffffff, 2.5);
  luz.position.set(-0.4, 0.6, 1); // de frente pra câmera, um pouco de cima
  scene.add(luz);

  // Caminho relativo ao BASE_URL ('./' no build) — funciona tanto no navegador
  // quanto no app desktop, que carrega o dist/ direto do disco.
  new GLTFLoader().load(`${import.meta.env.BASE_URL}pacman_animated.glb`, (gltf) => {
    const modelo = gltf.scene;

    // Centraliza no próprio centro (a origem do arquivo fica embaixo do modelo)
    // e escala pra 80% do tamanho do Pac-Man 2D (diâmetro = 2 * pacSize).
    const caixa = new THREE.Box3().setFromObject(modelo);
    const tamanho = caixa.getSize(new THREE.Vector3());
    const centro = caixa.getCenter(new THREE.Vector3());
    modelo.position.sub(centro);

    // A boca do modelo aponta pra +Z (de frente pra câmera). Girando 90° no Y ela
    // passa a apontar pra +X: Pac-Man de perfil, olhando pra direita.
    giro = new THREE.Group();
    giro.rotation.y = GIRO_FRENTE;
    giro.add(modelo);

    pivo = new THREE.Group();
    pivo.scale.setScalar((pacSize * 2 * ESCALA_DESENHO) / Math.max(tamanho.x, tamanho.y, tamanho.z));
    pivo.add(giro);
    scene.add(pivo);

    const clip = gltf.animations.find((a) => a.name === 'Eating') || gltf.animations[0];
    if (clip) {
      mixer = new THREE.AnimationMixer(modelo);
      mixer.clipAction(clip).play();
    }
    modeloCarregado.value = true;
  }, undefined, (err) => {
    // Sem o modelo o teste continua funcionando com o desenho 2D
    console.warn('Não foi possível carregar o Pac-Man 3D, usando o 2D:', err);
  });
};

const renderPacman3D = () => {
  if (!renderer || !pivo) return;
  const delta = clock.getDelta();
  const andando = dots.value.length > 0;

  if (andando) {
    // Só recalcula a direção com o alvo a uma distância razoável: colado na
    // bolinha, o ângulo fica instável e ele "virava" pro lado errado.
    const alvo = dots.value[0];
    const dx = alvo.x - pacPos.value.x;
    const dy = alvo.y - pacPos.value.y;
    if (Math.hypot(dx, dy) > 5) ultimoAngulo = Math.atan2(dy, dx);
  }
  mixer?.update(delta); // boca sempre animada, andando ou parado

  // Andando: de perfil, olhando pra direção do movimento. Parado: vira de frente
  // pra câmera (transição suave no giro).
  const giroAlvo = andando ? GIRO_PERFIL : GIRO_FRENTE;
  giro.rotation.y += (giroAlvo - giro.rotation.y) * Math.min(1, delta * 12);

  // Tela tem Y pra baixo e o Three.js pra cima: inverte Y e o ângulo. Indo pra
  // esquerda, espelha no Y pra ele não ficar de cabeça pra baixo (igual ao arcade).
  pivo.position.set(pacPos.value.x, -pacPos.value.y, 0);
  const escala = Math.abs(pivo.scale.x);
  if (andando) {
    pivo.rotation.z = -ultimoAngulo;
    pivo.scale.set(escala, Math.abs(ultimoAngulo) > Math.PI / 2 ? -escala : escala, escala);
  } else {
    pivo.rotation.z = 0;
    pivo.scale.set(escala, escala, escala);
  }

  renderer.render(scene, camera);
};

const redimensionarPacman3D = () => {
  if (!renderer) return;
  camera.right = window.innerWidth;
  camera.bottom = -window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};

const liberarPacman3D = () => {
  mixer?.stopAllAction();
  scene?.traverse((obj) => {
    if (obj.isMesh) {
      obj.geometry?.dispose();
      [].concat(obj.material || []).forEach((m) => m.dispose());
    }
  });
  if (renderer) {
    renderer.dispose();
    renderer.domElement.remove();
  }
  renderer = scene = camera = pivo = giro = mixer = null;
};

const onResize = () => {
  init();
  redimensionarPacman3D();
};

// Teclado (ESC)
const handleKeyDown = (e) => {
  if (e.key === 'Escape') {
    handleEnd('FAIL');
  }
};

onMounted(() => {
  init();
  iniciarPacman3D();
  draw();
  
  // Entra em fullscreen automaticamente
  if (mainContainer.value) {
    mainContainer.value.requestFullscreen().catch(() => {});
  }

  window.addEventListener('resize', onResize);
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
  window.removeEventListener('resize', onResize);
  window.removeEventListener('keydown', handleKeyDown);
  liberarPacman3D();
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

/* Fica por cima do canvas 2D mas deixa os toques passarem pra ele */
.pacman-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 5;
}

.model-credit {
  position: absolute;
  bottom: 6px;
  right: 12px;
  color: rgba(255, 255, 255, 0.25);
  font-size: 0.6rem;
  pointer-events: none;
  z-index: 10;
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