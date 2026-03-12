<template>
  <div class="logo-3d-container">
    <div ref="canvasContainer" class="canvas-3d"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

const canvasContainer = ref(null);
let scene, camera, renderer, model, rafId;
let idleRotationY = 0;

// Referências para as luzes orbitais
let light1, light2;

// Mapeamento de cores baseado nos seus temas
const themeColors = {
  'dark-orange-mode': { c1: 0xff6b35, c2: 0xff8c00 },
  'emerald-cyber':     { c1: 0x00ff88, c2: 0x008f44 },
  'midnight-purple':  { c1: 0xa855f7, c2: 0x6366f1 },
  'arctic-clean':     { c1: 0x0055ff, c2: 0x00aaff },
  'solaris-gold':     { c1: 0xd97706, c2: 0xfacc15 },
  'default':          { c1: 0xffffff, c2: 0x94a3b8 }
};

const getThemeColors = () => {
  const theme = document.documentElement.getAttribute('data-theme') || 'default';
  return themeColors[theme] || themeColors['default'];
};

const initThree = () => {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(1, -0.4, 5);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  canvasContainer.value.appendChild(renderer.domElement);

  // 1. Luz Ambiente (Mantém a cor original do material)
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  // 2. Luzes Orbitais (Dinâmicas conforme o tema)
  const colors = getThemeColors();
  
  light1 = new THREE.PointLight(colors.c1, 10, 10);
  scene.add(light1);

  light2 = new THREE.PointLight(colors.c2, 10, 10);
  scene.add(light2);

  const loader = new GLTFLoader();
  loader.load('/logo.glb', (gltf) => {
    model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const fScale = 2.5 / Math.max(size.x, size.y, size.z);
    
    model.scale.set(fScale, fScale, fScale);
    model.position.set(-center.x * fScale, -center.y * fScale, -center.z * fScale);

    scene.add(model);
    animate();
  });

  window.addEventListener('resize', onWindowResize);

  // Observer para mudar as cores em tempo real sem recarregar
  const observer = new MutationObserver(() => {
    const newColors = getThemeColors();
    light1.color.setHex(newColors.c1);
    light2.color.setHex(newColors.c2);
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
};

const onWindowResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
};

const animate = () => {
  rafId = requestAnimationFrame(animate);
  
  const time = Date.now() * 0.001;

  if (model) {
    idleRotationY += 0.005;
    model.rotation.y = idleRotationY;
    model.rotation.x = Math.sin(idleRotationY * 0.5) * 0.1;

    // Movimentação Orbital das Luzes
    if (light1 && light2) {
      light1.position.x = Math.cos(time) * 3;
      light1.position.z = Math.sin(time) * 3;
      light1.position.y = Math.sin(time * 0.5) * 2;

      light2.position.x = Math.cos(time + Math.PI) * 3;
      light2.position.z = Math.sin(time + Math.PI) * 3;
      light2.position.y = Math.cos(time * 0.5) * 2;
    }
  }
  
  renderer.render(scene, camera);
};

onMounted(() => initThree());
onUnmounted(() => {
  cancelAnimationFrame(rafId);
  window.removeEventListener('resize', onWindowResize);
  if (renderer) renderer.dispose();
});
</script>