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
        <div v-if="!userInteracted" class="interaction-shield" @click="startTestManual">
          <button class="btn-start tech-font">INICIAR TESTE</button>
        </div>
      </div>

      <div class="footer-controls">
        <button class="btn-mini fail" @click="handleFail">FAIL</button>
        <div class="instructions">
          <span>L2+R2:</span> VIBRAR | <span>BOTÕES:</span> Laranja | <span>ESTADO:</span> {{ missionStatus }}
        </div>
        <button class="btn-mini pass" :disabled="!isFinished" @click="handlePass">PASS</button>
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

const emit = defineEmits(['test-completed', 'test-cancelled']);
const canvasContainer = ref(null);
const gamepad = ref(null);
const userInteracted = ref(false);
const mission = reactive({ buttons: false, sticks: false, dpad: false });
const isFinished = computed(() => mission.buttons && mission.sticks && mission.dpad);
const missionStatus = computed(() => isFinished.value ? 'CONCLUÍDO' : 'PENDENTE');

let scene, camera, renderer, model, rafId, composer;
let idleRotationY = 0;
const meshes = {};

const PART_NAMES = {
  buttonA: 'Cylinder004_Black_0', buttonB: 'Cylinder006_Black_0',
  buttonX: 'Cylinder007_Black_0', buttonY: 'Cylinder005_Black_0',
  dpadUp: 'Cube002_Black_0', dpadDown: 'Cube001_Black_0',
  dpadLeft: 'Cube003_Black_0', dpadRight: 'Cube004_Black_0',
  trigger_R1: 'Cylinder011_Black_0', trigger_R2: 'Cylinder033_Black_0',
  trigger_L1: 'Cylinder012_Black_0', trigger_L2: 'Cylinder034_Black_0'
};

const initThree = () => {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(40, 900 / 600, 0.1, 1000);
  camera.position.set(0, 0, 5);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(900, 600);
  renderer.toneMapping = THREE.ReinhardToneMapping;
  renderer.toneMappingExposure = 2.2;
  canvasContainer.value.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const mainSpot = new THREE.SpotLight(0xffffff, 80);
  mainSpot.position.set(0, 5, 2);
  scene.add(mainSpot);

  const renderPass = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(900, 600), 0.4, 0.2, 0.8);
  composer = new EffectComposer(renderer);
  composer.addPass(renderPass);
  composer.addPass(bloomPass);

  new GLTFLoader().load('/joystick.glb', (gltf) => {
    model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const fScale = 3.6 / Math.max(size.x, size.y, size.z);
    model.scale.set(fScale, fScale, fScale);
    scene.add(model);

    model.traverse((child) => {
      if (child.isMesh) {
        meshes[child.name] = child;
        if (child.material) {
          child.material = child.material.clone();
          child.material.emissiveIntensity = 0;
          child.material.emissive = child.name.includes('trigger') ? new THREE.Color(0x00ffff) : new THREE.Color(0xff6600);
        }
      }
    });
    animate();
  });
};

const triggerVibration = (gp) => {
  if (gp?.vibrationActuator?.playEffect) {
    gp.vibrationActuator.playEffect('dual-rumble', {
      duration: 150, strongMagnitude: 1.0, weakMagnitude: 1.0
    });
  }
};

const toggleGlow = (meshName, isPressed) => {
  if (meshes[meshName]?.material) meshes[meshName].material.emissiveIntensity = isPressed ? 25 : 0;
};

const updateGamepad = () => {
  const gp = navigator.getGamepads()[0];
  gamepad.value = gp;

  if (model) {
    let targetX = 0.4, targetY = 0, targetZ = 0;

    if (gp) {
      userInteracted.value = true;
      const bA = gp.buttons[0]?.pressed, bB = gp.buttons[1]?.pressed;
      const bX = gp.buttons[2]?.pressed, bY = gp.buttons[3]?.pressed;
      toggleGlow(PART_NAMES.buttonA, bA); toggleGlow(PART_NAMES.buttonB, bB);
      toggleGlow(PART_NAMES.buttonX, bX); toggleGlow(PART_NAMES.buttonY, bY);

      const l1 = gp.buttons[4]?.pressed, r1 = gp.buttons[5]?.pressed;
      const l2 = gp.buttons[6]?.pressed || gp.buttons[6]?.value > 0.1;
      const r2 = gp.buttons[7]?.pressed || gp.buttons[7]?.value > 0.1;
      toggleGlow(PART_NAMES.trigger_L1, l1); toggleGlow(PART_NAMES.trigger_R1, r1);
      toggleGlow(PART_NAMES.trigger_L2, l2); toggleGlow(PART_NAMES.trigger_R2, r2);

      const dU = gp.buttons[12]?.pressed, dD = gp.buttons[13]?.pressed;
      const dL = gp.buttons[14]?.pressed, dR = gp.buttons[15]?.pressed;
      toggleGlow(PART_NAMES.dpadUp, dU); toggleGlow(PART_NAMES.dpadDown, dD);
      toggleGlow(PART_NAMES.dpadLeft, dL); toggleGlow(PART_NAMES.dpadRight, dR);

      // --- RECUPERADO: LÓGICA DE INCLINAÇÃO ---
      if (l2 || r2) targetX = 1.1; 
      if (bA || bB || bX || bY) { targetZ = -0.25; mission.buttons = true; } // Inclina para Direita
      if (dU || dD || dL || dR) { targetZ = 0.25; mission.dpad = true; }   // Inclina para Esquerda
      if (Math.abs(gp.axes[0]) > 0.4) mission.sticks = true;
      
      if (l2 && r2) triggerVibration(gp);

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
  if (composer) composer.render();
};

const startTestManual = () => { userInteracted.value = true; };
const handlePass = () => emit('test-completed', 'PASS');
const handleFail = () => emit('test-completed', 'FAIL');

onMounted(initThree);
onUnmounted(() => {
  cancelAnimationFrame(rafId);
  renderer?.dispose();
});
</script>

<style scoped>
/* Mesmos estilos da versão anterior */
.joystick-3d-container { background: #000; display: flex; justify-content: center; align-items: center; min-height: 400px; }
.test-window { width: 900px; height: 600px; background: radial-gradient(circle at center, #0a0a0a 0%, #000 100%); border: 1px solid #1a1a1a; border-radius: 40px; position: relative; overflow: hidden; }
.ui-overlay { position: absolute; top: 40px; left: 40px; right: 40px; display: flex; justify-content: space-between; pointer-events: none; z-index: 10; }
h1 { font-size: 0.65rem; color: #444; letter-spacing: 6px; margin: 0; }
.orange-text { color: #ff8c00; font-size: 0.7rem; font-family: monospace; }
.status { padding: 8px 20px; border-radius: 30px; border: 1px solid #222; color: #333; font-size: 0.55rem; }
.status.active { border-color: #ff8c00; color: #ff8c00; }
.interaction-shield { position: absolute; inset: 0; z-index: 100; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px); }
.btn-start { padding: 15px 35px; background: #ff8c00; border: none; border-radius: 8px; color: #000; font-weight: bold; cursor: pointer; }
.footer-controls { position: absolute; bottom: 30px; left: 0; right: 0; display: flex; justify-content: space-between; align-items: center; padding: 0 40px; }
.btn-mini { padding: 8px 20px; border-radius: 6px; border: 1px solid; background: transparent; font-weight: bold; cursor: pointer; font-size: 0.6rem; }
.btn-mini.pass { border-color: #00ff41; color: #00ff41; }
.btn-mini.pass:disabled { opacity: 0.1; }
.btn-mini.fail { border-color: #ff4d4d; color: #ff4d4d; }
.instructions { color: #222; font-size: 0.6rem; }
.blink { animation: blinker 2s infinite; }
@keyframes blinker { 50% { opacity: 0; } }
</style>