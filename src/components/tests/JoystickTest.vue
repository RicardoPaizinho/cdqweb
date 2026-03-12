<template>
  <div class="joystick-container">
    <div class="test-card">
      <header>
        <div class="info">
          <h1>CONTROLLER DIAGNOSTICS</h1>
          <p v-if="gamepad">
            Modo: <span class="orange-text">{{ gamepad.mapping === 'standard' ? 'Padrão (XInput)' : 'Legacy (PS2/Generic)' }}</span>
          </p>
          <p v-else class="blink">Conecte um dispositivo para iniciar...</p>
        </div>
        <div :class="['status-badge', { 'passed': isFinished }]">
          {{ isFinished ? 'SISTEMA OK' : 'TESTANDO' }}
        </div>
      </header>

      <div class="controller-visual">
        <svg viewBox="0 0 800 500" class="gamepad-svg">
          <path d="M250,150 Q150,150 150,300 Q150,450 300,450 Q400,400 500,450 Q650,450 650,300 Q650,150 550,150 Z" fill="#1a1a1a" stroke="#333" stroke-width="4"/>
          
          <g id="dpad" fill="#333">
            <rect x="210" y="240" width="20" height="60" :fill="btns.up || btns.down ? '#ff8c00' : '#333'" />
            <rect x="190" y="260" width="60" height="20" :fill="btns.left || btns.right ? '#ff8c00' : '#333'" />
          </g>

          <circle cx="320" cy="330" r="45" fill="#000" stroke="#333" />
          <circle :cx="320 + (axes.l.x * 20)" :cy="330 + (axes.l.y * 20)" r="30" :fill="btns.l3 ? '#ff8c00' : '#444'" class="stick-glow" />
          
          <circle cx="480" cy="330" r="45" fill="#000" stroke="#333" />
          <circle :cx="480 + (axes.r.x * 20)" :cy="330 + (axes.r.y * 20)" r="30" :fill="btns.r3 ? '#ff8c00' : '#444'" class="stick-glow" />

          <circle cx="580" cy="220" r="20" :fill="btns.y ? '#ff8c00' : '#333'" stroke="#fff" /> <circle cx="580" cy="300" r="20" :fill="btns.a ? '#ff8c00' : '#333'" stroke="#fff" /> <circle cx="540" cy="260" r="20" :fill="btns.x ? '#ff8c00' : '#333'" stroke="#fff" /> <circle cx="620" cy="260" r="20" :fill="btns.b ? '#ff8c00' : '#333'" stroke="#fff" /> <rect x="200" y="100" width="80" height="30" rx="5" :fill="btns.l1 ? '#ff8c00' : '#333'" />
          <rect x="520" y="100" width="80" height="30" rx="5" :fill="btns.r1 ? '#ff8c00' : '#333'" />
          <path d="M200,70 L280,70 L270,95 L210,95 Z" :fill="btns.l2 ? '#ff8c00' : '#333'" />
          <path d="M520,70 L600,70 L610,95 L530,95 Z" :fill="btns.r2 ? '#ff8c00' : '#333'" />
        </svg>
      </div>

      <div class="mission-grid">
        <div v-for="(done, name) in mission" :key="name" :class="['mission-item', { active: done }]">
          {{ name.toUpperCase() }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue';

const gamepad = ref(null);
const axes = reactive({ l: { x: 0, y: 0 }, r: { x: 0, y: 0 } });
const btns = reactive({ 
  a:false, b:false, x:false, y:false, 
  l1:false, r1:false, l2:false, r2:false,
  up:false, down:false, left:false, right:false,
  l3:false, r3:false 
});

const mission = reactive({
  botoes: false,
  analogicos: false,
  gatilhos: false,
  vibração: false
});

const isFinished = computed(() => mission.botoes && mission.analogicos && mission.gatilhos);

const updateLoop = () => {
  const gp = navigator.getGamepads()[0];
  gamepad.value = gp;

  if (gp) {
    const isStandard = gp.mapping === 'standard';
    
    // Mapeamento Inteligente (Ajuste automático para PS2 USB vs Xbox)
    // Se não for standard, mapeamos os índices típicos de adaptadores PS2
    const map = {
      a: isStandard ? gp.buttons[0] : gp.buttons[2],
      b: isStandard ? gp.buttons[1] : gp.buttons[1],
      x: isStandard ? gp.buttons[2] : gp.buttons[3],
      y: isStandard ? gp.buttons[3] : gp.buttons[0],
      l1: gp.buttons[4], r1: gp.buttons[5],
      l2: gp.buttons[6], r2: gp.buttons[7],
      l3: gp.buttons[10], r3: gp.buttons[11],
      up: gp.buttons[12], down: gp.buttons[13], left: gp.buttons[14], right: gp.buttons[15]
    };

    // Atualiza estados reativos
    Object.keys(map).forEach(key => btns[key] = map[key]?.pressed);
    
    // Eixos (Analógicos)
    axes.l.x = gp.axes[0]; axes.l.y = gp.axes[1];
    axes.r.x = gp.axes[2]; axes.r.y = gp.axes[5] || gp.axes[3];

    // Validação de Missões
    if (btns.a || btns.b || btns.x || btns.y) mission.botoes = true;
    if (Math.abs(axes.l.x) > 0.5 || Math.abs(axes.r.x) > 0.5) mission.analogicos = true;
    if (btns.l2 || btns.r2) mission.gatilhos = true;

    // Lógica de Vibração (Segurando L2 + R2)
    if (btns.l2 && btns.r2 && gp.vibrationActuator) {
      mission.vibração = true;
      gp.vibrationActuator.playEffect("dual-rumble", {
        duration: 100, weakMagnitude: 1.0, strongMagnitude: 1.0 
      });
    }
  }
  requestAnimationFrame(updateLoop);
};

onMounted(() => requestAnimationFrame(updateLoop));
</script>

<style scoped>
.joystick-container {
  background: #000;
  min-height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  font-family: 'Segoe UI', sans-serif;
}

.test-card {
  background: #111;
  border: 1px solid #333;
  padding: 40px;
  border-radius: 20px;
  width: 900px;
  box-shadow: 0 0 50px rgba(0,0,0,1);
}

header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 30px;
  border-left: 4px solid #ff8c00;
  padding-left: 20px;
}

h1 { color: #fff; margin: 0; font-size: 1.4rem; letter-spacing: 2px; }
.orange-text { color: #ff8c00; font-weight: bold; }

.status-badge {
  background: #222;
  color: #555;
  padding: 10px 20px;
  border-radius: 5px;
  font-weight: bold;
  transition: 0.5s;
}

.status-badge.passed {
  background: #ff8c00;
  color: #000;
  box-shadow: 0 0 20px rgba(255, 140, 0, 0.4);
}

.gamepad-svg {
  width: 100%;
  max-height: 400px;
  filter: drop-shadow(0 0 10px rgba(255,140,0,0.05));
}

.stick-glow {
  transition: fill 0.1s;
}

.mission-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
  margin-top: 30px;
}

.mission-item {
  background: #1a1a1a;
  color: #444;
  padding: 10px;
  text-align: center;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: bold;
  border-bottom: 2px solid transparent;
  transition: 0.3s;
}

.mission-item.active {
  color: #ff8c00;
  border-bottom-color: #ff8c00;
  background: #222;
}

.blink { animation: blinker 1.5s infinite; color: #ff8c00; }
@keyframes blinker { 50% { opacity: 0; } }
</style>