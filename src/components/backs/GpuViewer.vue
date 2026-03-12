<template>
  <div class="joystick-3d-container">
    <div class="test-window">
      <div class="ui-overlay">
        <div class="info">
          <h1>3D HARDWARE PROBE v3.0</h1>
          <p v-if="gamepad" class="orange-text">{{ gamepad.id.slice(0, 30) }}...</p>
          <p v-else class="blink">SISTEMA EM STANDBY...</p>
        </div>
        <div class="status-group">
          <div class="status" :class="{ active: isFinished }">
            {{ isFinished ? 'SISTEMA VALIDADO' : 'EM TESTE' }}
          </div>
        </div>
      </div>

      <div class="canvas-wrapper">
        <div ref="canvasContainer" class="canvas-3d"></div>
      </div>

      <div class="instructions">
        <span>GATILHOS:</span> Azul | <span>BOTÕES:</span> Laranja | <span>ESTADO:</span> Dinâmico
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, reactive, computed } from 'vue';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

const canvasContainer = ref(null);
const gamepad = ref(null);
const mission = reactive({ buttons: false, sticks: false, dpad: false });
const isFinished = computed(() => mission.buttons && mission.sticks && mission.dpad);

let scene, camera, renderer, model, rafId, composer;
let idleRotationY = 0;
const meshes = {};

// Referências para as luzes
let mainSpotLight, pointLight1, pointLight2;

const PART_NAMES = {
  buttonA: 'Cylinder004_Black_0',
  buttonB: 'Cylinder006_Black_0',
  buttonX: 'Cylinder007_Black_0',
  buttonY: 'Cylinder005_Black_0',
  dpadUp: 'Cube002_Black_0',
  dpadDown: 'Cube001_Black_0',
  dpadLeft: 'Cube003_Black_0',
  dpadRight: 'Cube004_Black_0',
  trigger_R1: 'Cylinder011_Black_0',
  trigger_R2: 'Cylinder033_Black_0',
  trigger_L1: 'Cylinder012_Black_0',
  trigger_L2: 'Cylinder034_Black_0',
  stickL: 'analog_L',
  stickR: 'analog_R'
};

const initThree = () => {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(40, 900 / 600, 0.1, 1000);
  camera.position.set(0, 1,8, 5);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(900, 600);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ReinhardToneMapping;
  renderer.toneMappingExposure = 2.2;
  canvasContainer.value.appendChild(renderer.domElement);

  // --- ILUMINAÇÃO "COM VIDA" ---

  // 1. SPOTLIGHT (Luz de Destaque Superior)
  mainSpotLight = new THREE.SpotLight(0xffffff, 80);
  mainSpotLight.position.set(0, 6, 3);
  mainSpotLight.angle = Math.PI / 6;
  mainSpotLight.penumbra = 0.5;
  mainSpotLight.decay = 2;
  mainSpotLight.distance = 30;
  scene.add(mainSpotLight);

  // 2. POINT LIGHT 1 (Laranja Vibrante - Lado Direito)
  pointLight1 = new THREE.PointLight(0xff4400,15, 13);
  scene.add(pointLight1);

  // 3. POINT LIGHT 2 (Ciano/Azul - Lado Esquerdo)
  pointLight2 = new THREE.PointLight(0x00013f, 10, 10);
  scene.add(pointLight2);

  // Luz ambiente suave para preencher sombras
  scene.add(new THREE.AmbientLight(0xffffff, 0.75));

  // --- POST-PROCESSING (BLOOM) ---
  const renderPass = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(900, 600), 0.2, 0.2, 0.8);
  composer = new EffectComposer(renderer);
  composer.addPass(renderPass);
  composer.addPass(bloomPass);

  const loader = new GLTFLoader();
  loader.load('/logo.glb', (gltf) => {
    model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const fScale = 2.6 / Math.max(size.x, size.y, size.z);
    model.scale.set(fScale, fScale, fScale);
    scene.add(model);

    model.traverse((child) => {
      if (child.isMesh) {
        meshes[child.name] = child;
        if (child.material) {
          child.material = child.material.clone();
          child.material.emissiveIntensity = 0;
          // Cores base do emissive
          const name = child.name.toLowerCase();
          if (name.includes('cylinder011') || name.includes('cylinder012') || name.includes('cylinder033') || name.includes('cylinder034')) {
            child.material.emissive = new THREE.Color(0x00ffff);
          } else {
            child.material.emissive = new THREE.Color(0xff6600);
          }
        }
      }
    });
    animate();   
  });
};

const toggleGlow = (meshName, isPressed) => {
  const mesh = meshes[meshName];
  if (mesh && mesh.material) {
    mesh.material.emissiveIntensity = isPressed ? 25 : 0;
  }
};

const updateGamepad = () => {
  const gp = navigator.getGamepads()[0];
  gamepad.value = gp;

  if (model) {
    let targetX = 0.4, targetY = 0, targetZ = 0;

    if (gp) {
      const isStandard = gp.mapping === 'standard';
      const bA = isStandard ? gp.buttons[0]?.pressed : gp.buttons[2]?.pressed;
      const bB = isStandard ? gp.buttons[1]?.pressed : gp.buttons[1]?.pressed;
      const bX = isStandard ? gp.buttons[2]?.pressed : gp.buttons[3]?.pressed;
      const bY = isStandard ? gp.buttons[3]?.pressed : gp.buttons[0]?.pressed;
      
      toggleGlow(PART_NAMES.buttonA, bA);
      toggleGlow(PART_NAMES.buttonB, bB);
      toggleGlow(PART_NAMES.buttonX, bX);
      toggleGlow(PART_NAMES.buttonY, bY);

      const l1 = gp.buttons[4]?.pressed, r1 = gp.buttons[5]?.pressed;
      const l2 = gp.buttons[6]?.pressed, r2 = gp.buttons[7]?.pressed;
      toggleGlow(PART_NAMES.trigger_L1, l1); toggleGlow(PART_NAMES.trigger_R1, r1);
      toggleGlow(PART_NAMES.trigger_L2, l2); toggleGlow(PART_NAMES.trigger_R2, r2);

      const dU = gp.buttons[12]?.pressed || gp.axes[9] < -0.5;
      const dD = gp.buttons[13]?.pressed || (gp.axes[9] > -0.1 && gp.axes[9] < 0.2);
      const dL = gp.buttons[14]?.pressed || (gp.axes[9] > 0.5 && gp.axes[9] < 0.9);
      const dR = gp.buttons[15]?.pressed || (gp.axes[9] > -0.5 && gp.axes[9] < -0.2);
      toggleGlow(PART_NAMES.dpadUp, dU); toggleGlow(PART_NAMES.dpadDown, dD);
      toggleGlow(PART_NAMES.dpadLeft, dL); toggleGlow(PART_NAMES.dpadRight, dR);

      if (l2 || r2) targetX = 1.1;
      if (bA || bB || bX || bY) targetZ = -0.25;
      if (dU || dD || dL || dR) targetZ = 0.25;

      if (bA || bB || bX || bY) mission.buttons = true;
      if (dU || dD || dL || dR) mission.dpad = true;
      if (Math.abs(gp.axes[0]) > 0.2) mission.sticks = true;
      targetY = 0;
    } else {
      idleRotationY += 0.005;
      targetY = idleRotationY;
    }

    model.rotation.x = THREE.MathUtils.lerp(model.rotation.x, targetX, 0.1);
    model.rotation.y = THREE.MathUtils.lerp(model.rotation.y, targetY, 0.05);
    model.rotation.z = THREE.MathUtils.lerp(model.rotation.z, targetZ, 0.1);
  }
};

const animate = () => {
  rafId = requestAnimationFrame(animate);
  updateGamepad();

  const time = Date.now() * 0.001;

  // Animação das Point Lights (Movimento Orbital)
  if (pointLight1 && pointLight2) {
    pointLight1.position.x = Math.sin(time) * 4;
    pointLight1.position.z = Math.cos(time) * 4;
    pointLight1.position.y = Math.cos(time * 0.5) * 2;

    pointLight2.position.x = Math.sin(time + Math.PI) * 4;
    pointLight2.position.z = Math.cos(time + Math.PI) * 4;
    pointLight2.position.y = Math.sin(time * 0.5) * 2;
  }

  if (composer) composer.render();
};

onMounted(() => initThree());
onUnmounted(() => {
  cancelAnimationFrame(rafId);
  if (renderer) renderer.dispose();
});
</script>

<style scoped>
.joystick-3d-container { background: #000; min-height: 100vh; display: flex; justify-content: center; align-items: center; }
.test-window { 
  width: 900px; 
  height: 600px; 
  background: radial-gradient(circle at center, #0a0a0a 0%, #000 100%); 
  border: 1px solid #1a1a1a; 
  border-radius: 40px; 
  position: relative; 
  overflow: hidden; 
  box-shadow: 0 0 100px rgba(255, 140, 0, 0.05);
}
.canvas-wrapper { width: 100%; height: 100%; }
.ui-overlay { position: absolute; top: 40px; left: 40px; right: 40px; display: flex; justify-content: space-between; pointer-events: none; z-index: 10; }
h1 { font-size: 0.65rem; color: #444; letter-spacing: 6px; margin: 0; }
.orange-text { color: #ff8c00; font-size: 0.7rem; font-family: monospace; text-shadow: 0 0 15px rgba(255, 140, 0, 0.5); }
.status { padding: 8px 20px; border-radius: 30px; border: 1px solid #222; color: #333; font-size: 0.55rem; letter-spacing: 1px; }
.status.active { border-color: #ff8c00; color: #ff8c00; box-shadow: 0 0 30px rgba(255, 140, 0, 0.2); background: rgba(255, 140, 0, 0.05); }
.instructions { position: absolute; bottom: 40px; width: 100%; text-align: center; color: #222; font-size: 0.6rem; letter-spacing: 2px; text-transform: uppercase; }
.instructions span { color: #555; font-weight: bold; margin: 0 10px; }
.blink { animation: blinker 2s infinite; color: #222; }
@keyframes blinker { 50% { opacity: 0; } }
</style>