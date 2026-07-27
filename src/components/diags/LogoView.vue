<template>
  <div class="logo-3d-wrapper">
    <div class="top-toolbar">
      <button @click="goBack" class="btn-back">
        <span class="icon">◀</span> VOLTAR
      </button>
      <div class="gpu-badge-inline">
        {{ activeGPU }}
      </div>
    </div>

    <div class="logo-3d-container">
      <div ref="canvasContainer" class="canvas-3d"></div>
      
      <button @click="isUiHidden = !isUiHidden" class="btn-ui-toggle shadow-glow">
        {{ isUiHidden ? 'MOSTRAR PAINEL' : 'OCULTAR PAINEL' }}
      </button>

      <div class="camera-controls shadow-glow" v-show="!isUiHidden">
        <div class="gpu-badge">
          <span class="dot" :class="{ 'pulse': isAnimating }"></span>
          MODO BENCHMARK
        </div>
        
        <div class="control-row">
          <label>LUZ: {{ (envIntensity * 100).toFixed(0) }}%</label>
          <input type="range" v-model.number="envIntensity" min="0" max="4" step="0.1" @input="updateLighting">
        </div>

        <div class="button-grid">
          <button @click="saveKeyframe" class="btn-rec">● RECORD FRAME</button>
          <button @click="playSequence" :disabled="keyframes.length < 2" class="btn-play">▶ PLAY LOOP</button>
        </div>

        <div class="button-grid secondary">
          <button @click="exportJSON" :disabled="keyframes.length === 0">EXPORT</button>
          <button @click="$refs.fileInput.click()">IMPORT</button>
          <input type="file" ref="fileInput" @change="importJSON" accept=".json" style="display: none">
          <button @click="toggleLaptop">TAMPA: {{ laptopOpen ? 'FECHAR' : 'ABRIR' }}</button>
          <button @click="clearPath" class="btn-danger">RESET</button>
        </div>
        
        <div class="status-bar">
          PONTOS: {{ keyframes.length }} | {{ isAnimating ? 'LOOP' : 'MANUAL' }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import gsap from 'gsap';
import { globalState } from '@/store.js';

const canvasContainer = ref(null);
const fileInput = ref(null);
const activeGPU = ref('Detectando...');
const keyframes = ref([]);
const envIntensity = ref(1.5);
const isAnimating = ref(false);
const laptopOpen = ref(false);
// 1. Painel inicia oculto por padrão
const isUiHidden = ref(true);

let scene, camera, renderer, model, controls, rafId, timeline;
let lcdCover = null;

const goBack = () => {
  globalState.activeMenu = 'testes';
};

const initThree = async () => {
  if (!canvasContainer.value) return;

  scene = new THREE.Scene();
  
  const width = canvasContainer.value.offsetWidth || window.innerWidth - 300;
  const height = canvasContainer.value.offsetHeight || window.innerHeight - 100;

  camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 1000);
  camera.position.set(0, 5, 15);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  
  canvasContainer.value.appendChild(renderer.domElement);

  const gl = renderer.getContext();
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  activeGPU.value = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : "GPU Ativa";

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  new RGBELoader().load('/studio.hdr', (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.environment = texture;
    scene.background = texture;
    updateLighting();
  });

  new GLTFLoader().load('/laptop.glb', (gltf) => {
    model = gltf.scene;
    lcdCover = model.getObjectByName('Lcd_Cover');
    
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const scale = 6 / Math.max(size.x, size.y, size.z);
    model.scale.set(scale, scale, scale);
    model.position.sub(center.multiplyScalar(scale));

    scene.add(model);
    animate();

    // 2. Carrega automaticamente a animação 'anima.json' após inserir o modelo 3D na cena
    loadDefaultAnimation();
  });

  window.addEventListener('resize', onWindowResize);
};

// Função para buscar e iniciar a animação padrão do mesmo diretório
const loadDefaultAnimation = async () => {
  try {
    const response = await fetch('/anima.json');
    if (!response.ok) return;
    
    const data = await response.json();
    if (Array.isArray(data) && data.length >= 2) {
      keyframes.value = data;
      nextTick(() => playSequence());
    }
  } catch (err) {
    // Caso anima.json não exista na pasta public ou falhe o parse, segue a execução limpa
    console.warn("Animação padrão (anima.json) não encontrada ou inválida.");
  }
};

const updateLighting = () => {
  if (!model) return;
  model.traverse(node => { if (node.isMesh) node.material.envMapIntensity = envIntensity.value; });
  renderer.toneMappingExposure = Math.max(0.3, envIntensity.value * 0.6);
};

const animate = () => {
  rafId = requestAnimationFrame(animate);
  if (controls) controls.update();
  if (renderer && scene && camera) renderer.render(scene, camera);
};

const saveKeyframe = () => {
  keyframes.value.push({
    pos: camera.position.clone(),
    tar: controls.target.clone(),
    int: envIntensity.value,
    rot: lcdCover ? lcdCover.rotation.x : 0
  });
};

const playSequence = () => {
  if (keyframes.value.length < 2) return;
  if (timeline) timeline.kill();
  isAnimating.value = true;
  controls.enabled = false;
  
  timeline = gsap.timeline({ repeat: -1, defaults: { duration: 3, ease: "none" } });
  
  keyframes.value.forEach((point, index) => {
    // Garante que pos e tar sejam tratados como estruturas x,y,z no GSAP (seja classe Vector3 ou JSON legível)
    const posX = point.pos.x !== undefined ? point.pos.x : point.pos[0];
    const posY = point.pos.y !== undefined ? point.pos.y : point.pos[1];
    const posZ = point.pos.z !== undefined ? point.pos.z : point.pos[2];

    const tarX = point.tar.x !== undefined ? point.tar.x : point.tar[0];
    const tarY = point.tar.y !== undefined ? point.tar.y : point.tar[1];
    const tarZ = point.tar.z !== undefined ? point.tar.z : point.tar[2];

    timeline.to(camera.position, { x: posX, y: posY, z: posZ }, index === 0 ? 0 : ">");
    timeline.to(controls.target, { x: tarX, y: tarY, z: tarZ }, "<");
    timeline.to(envIntensity, { value: point.int, onUpdate: updateLighting }, "<");
    if (lcdCover) timeline.to(lcdCover.rotation, { x: point.rot }, "<");
  });
};

const toggleLaptop = () => {
  if (!lcdCover) return;
  laptopOpen.value = !laptopOpen.value;
  gsap.to(lcdCover.rotation, { x: laptopOpen.value ? -1.8 : 0, duration: 1.2 });
};

const clearPath = () => {
  if (timeline) timeline.kill();
  keyframes.value = [];
  isAnimating.value = false;
  controls.enabled = true;
};

const onWindowResize = () => {
  if (!canvasContainer.value) return;
  const width = canvasContainer.value.clientWidth;
  const height = canvasContainer.value.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
};

const exportJSON = () => {
  const blob = new Blob([JSON.stringify(keyframes.value, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'anima.json';
  a.click();
};

const importJSON = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      keyframes.value = JSON.parse(ev.target.result);
      if (keyframes.value.length >= 2) nextTick(() => playSequence());
    } catch (err) {
      console.error("Falha ao ler o arquivo JSON:", err);
    }
  };
  reader.readAsText(file);
};

onMounted(() => setTimeout(initThree, 100));
onUnmounted(() => {
  cancelAnimationFrame(rafId);
  if (timeline) timeline.kill();
  if (renderer) renderer.dispose();
  window.removeEventListener('resize', onWindowResize);
});
</script>

<style scoped>
.logo-3d-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: #050505;
  position: relative;
}

.top-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background: #0a0a0a;
  border-bottom: 1px solid #1a1a1a;
  height: 50px;
}

.logo-3d-container {
  flex: 1;
  position: relative;
  width: 100%;
}

.canvas-3d {
  width: 100%;
  height: 100%;
}

.camera-controls {
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(10, 10, 10, 0.9);
  padding: 15px;
  border-left: 2px solid #00ff88;
  width: 260px;
  z-index: 10;
}

.button-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 10px; }

button {
  background: #111;
  color: #fff;
  border: 1px solid #333;
  padding: 8px;
  font-family: 'Orbitron', sans-serif;
  font-size: 9px;
  cursor: pointer;
  transition: all 0.2s ease;
}

button:hover {
  border-color: #00ff88;
}

.btn-back { border-color: #444; color: #888; }
.btn-back:hover { border-color: #00ff88; color: #00ff88; }
.btn-play { background: #00ff88 !important; color: #000 !important; font-weight: bold; }
.btn-danger:hover { border-color: #ff3366; color: #ff3366; }

.gpu-badge-inline { color: #00ff88; font-size: 10px; font-family: monospace; }
.control-row { margin: 10px 0; font-size: 9px; color: #00ff88; }
.control-row input { width: 100%; accent-color: #00ff88; }

.btn-ui-toggle { 
  position: absolute; 
  bottom: 20px; 
  right: 20px; 
  font-size: 9px; 
  padding: 10px 14px;
  background: rgba(10, 10, 10, 0.8);
  border: 1px solid #00ff88;
  color: #00ff88;
  z-index: 11;
}

.shadow-glow {
  box-shadow: 0 0 15px rgba(0, 255, 136, 0.15);
}
</style>