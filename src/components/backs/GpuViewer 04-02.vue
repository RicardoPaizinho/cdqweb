<template>
  <div ref="container" class="three-container"></div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
// Removidos: Stats, EffectComposer, RenderPass, UnrealBloomPass, BokehPass, ShaderPass

const emit = defineEmits(['fps-update'])
const container = ref(null)
let isAnimating = true

const props = defineProps({
  modelPath: { type: String, default: '/logo.glb' },
  // 'cameraPositions' e 'animateCamera' não são mais necessários, mas mantidos para evitar erro de prop
  cameraPositions: {
    type: Array,
    default: () => [[0, 2, 6], [2, 3, 4], [-2, 1, 6]]
  },
  playAnimation: { type: Boolean, default: true },
  animateCamera: { type: Boolean, default: false } // Default alterado para false
})

onMounted(() => {
  // --- Limpeza de utilitários ---
  // Removido: Stats initialization

  document.addEventListener('visibilitychange', () => {
    isAnimating = !document.hidden
  })

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x1a1d29) // Define um fundo escuro
  

  // Define uma câmera padrão caso o GLTF não tenha uma ou ela não seja utilizada.
  // Será substituída ou ignorada se o GLTF contiver uma câmera ativa.
  const defaultCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
  defaultCamera.position.set(6, 4, 6)
  
  let camera = defaultCamera // Câmera inicial
  
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  container.value.appendChild(renderer.domElement)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.target.set(0, 0, 0)
  controls.update()

  // --- Limpeza de Luzes ---
  // Removidas: ambientLight, pointLight, spotLight, debugLight.
  // As luzes devem vir do arquivo GLTF. Adicionamos uma luz ambiente mínima para garantir visibilidade, se o GLTF não tiver luzes.
  const defaultAmbientLight = new THREE.AmbientLight(0xffffff, 0.8)
  scene.add(defaultAmbientLight)

  const loader = new GLTFLoader()
  let mixer = null

  loader.load(props.modelPath, (gltf) => {
    // Se o arquivo GLTF contiver câmeras, usa a primeira encontrada.
    if (gltf.cameras && gltf.cameras.length > 0) {
      camera = gltf.cameras[0]
      // Atualiza o OrbitControls para usar a nova câmera
      controls.object = camera
    } else {
      console.warn("O arquivo GLB não contém uma câmera. Usando a câmera padrão.")
    }

    // Configuração de sombras para o modelo
    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
      // Se houver luzes no GLTF, elas já devem estar configuradas
    })
    
    scene.add(gltf.scene)
    
    // Animações do GLTF
    if (props.playAnimation && gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(gltf.scene)
      gltf.animations.forEach((clip) => mixer.clipAction(clip).play())
    }
    
    // Centraliza o controle na cena, independentemente da câmera usada
   // controls.target.set(0, 0, 0)
    controls.update()
  },
  undefined, // onProgress
  (error) => {
    console.error('Erro ao carregar o modelo GLTF:', error)
  })

  // Removidos: Fumaça (smoke) e Faíscas (sparks) e suas lógicas de animação
  // Removidos: Compositor de Bloom e Compositor Final

  const clock = new THREE.Clock()

  const animate = () => {
    requestAnimationFrame(animate)

    if (isAnimating) {
      const delta = clock.getDelta()

      // Apenas atualiza o mixer de animação do GLTF
      if (mixer) mixer.update(delta)

      controls.update()
      
      // Renderiza a cena sem efeitos de post-processing
      renderer.render(scene, camera)

      // Removida: emissão de 'fps-update' (Stats não existe mais)
    }
  }

  animate()
  
  // Lógica para redimensionamento da janela
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight
    camera.updateProjectionMatrix()
    //renderer.setSize(300, 300)
  })
})
</script>

<style scoped>
.three-container {
  width: 50%;
  height: 50%;
  position: relative;
}
</style>