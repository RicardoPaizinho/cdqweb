<template>
  <div ref="container" class="three-container"></div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import Stats from 'stats.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js' // Importação necessária para a mistura

const emit = defineEmits(['fps-update'])
const container = ref(null)
let isAnimating = true

const props = defineProps({
  modelPath: { type: String, default: '/logo.glb' },
  cameraPositions: {
    type: Array,
    default: () => [[0, 2, 6], [2, 3, 4], [-2, 1, 6]]
  },
  playAnimation: { type: Boolean, default: true },
  animateCamera: { type: Boolean, default: true }
})

// Shader de mistura para combinar a cena principal e o resultado do Bloom
const MIX_SHADER = {
  uniforms: {
    baseTexture: { value: null },
    bloomTexture: { value: null }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D baseTexture;
    uniform sampler2D bloomTexture;
    varying vec2 vUv;
    void main() {
      gl_FragColor = (texture2D(baseTexture, vUv) + texture2D(bloomTexture, vUv));
    }
  `
}

onMounted(() => {
  const stats = new Stats()
  stats.showPanel(0)
  stats.dom.style.position = 'absolute'
  stats.dom.style.top = '10px'
  stats.dom.style.right = '10px'
  container.value.appendChild(stats.dom)

  document.addEventListener('visibilitychange', () => {
    isAnimating = !document.hidden
  })

  // Camada 0: Cena padrão
  // Camada 1: Fumaça (DOF)
  // Camada 2: Faíscas (DOF)
  // Camada 3: Objetos de Bloom
  const BLOOM_LAYER = 3

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
  camera.position.set(...(props.cameraPositions[0] || [0, 2, 6]))
  camera.layers.enableAll()

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  container.value.appendChild(renderer.domElement)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.target.set(0, 0, 0)
  controls.update()

  // Luzes
  const ambientLight = new THREE.AmbientLight( 0xffffff, 0.205)
  scene.add(ambientLight)

  const pointLight = new THREE.PointLight(0xffffff, 12, 10,2)
  pointLight.castShadow = false
  //pointLight.position.set(2, 5, 5)
  scene.add(pointLight)

  const spotLight = new THREE.SpotLight(0x22aaff, 122)
  spotLight.intensity = 444.5
  spotLight.position.set(5, 5, 6)
  spotLight.angle = Math.PI / 6
  spotLight.penumbra = 0.00
  spotLight.decay = 2
  spotLight.distance = 6
  spotLight.castShadow = false

 // scene.add(spotLight)
camera.add(spotLight)
scene.add(camera) // importante: a câmera precisa estar na cena
const lightTarget = new THREE.Object3D()
lightTarget.position.set(0, 0, -1) // à frente da câmera
camera.add(lightTarget)
spotLight.target = lightTarget

  const debugLight = new THREE.DirectionalLight(0xffffff, 0.8)
debugLight.position.set(11,12,11)
scene.add(debugLight)

  const loader = new GLTFLoader()
  let mixer = null

  loader.load(props.modelPath, (gltf) => {
    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
        child.layers.set(0)
        console.log('Modelo carregado:')    //temporario apenas para pegar nome do child para efeitos
        gltf.scene.traverse((child) => {console.log(child.name)})

        if (child.name === 'Frame_Material002_0') {
          child.material.emissive = new THREE.Color(0xffffff)
          child.material.emissiveIntensity = 2.025    // brilho extra para o efeito de bloom
         
              if (!(child.material instanceof THREE.MeshStandardMaterial)) {
      const oldMat = child.material
      child.material = new THREE.MeshStandardMaterial({
        color: oldMat.color || new THREE.Color(0xffffff),
        map: oldMat.map || null,
        metalness: 0.8,
        roughness: 0.2
      })
    }

          // **CORREÇÃO CRÍTICA**: Adiciona à camada 3 E remove da camada 0
         // child.layers.enable(BLOOM_LAYER)
         // child.layers.disable(0) 

          child.layers.set(0) // garante que aparece na cena principal
          child.layers.enable(BLOOM_LAYER) // adiciona bloom sem remover da cena


        //  child.layers.set(0) // garante que ele aparece na cena principal
        //child.layers.enable(BLOOM_LAYER) // adiciona o bloom sem remover da cena
        }

    // Substitui materiais que não reagem à luz
    if (!(child.material instanceof THREE.MeshStandardMaterial)) {
      const oldMat = child.material
      child.material = new THREE.MeshStandardMaterial({
        color: oldMat.color || new THREE.Color(0xffffff),
        map: oldMat.map || null,
        metalness: 0.5,
        roughness: 0.5
      })
    }


      }
    })
    scene.add(gltf.scene)
    if (props.playAnimation && gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(gltf.scene)
      gltf.animations.forEach((clip) => mixer.clipAction(clip).play())
    }
  })

  // Fumaça (Camada 1)
  const smokeTexture = new THREE.TextureLoader().load('/smoke.png')
  const smokeGeometry = new THREE.BufferGeometry()
  // ... (criação da geometria da fumaça)
  const smokeCount = 10
  const smokePositions = []
  for (let i = 0; i < smokeCount; i++) {
    smokePositions.push((Math.random() - 0.5) * 20, Math.random() * 5, (Math.random() - 0.5) * 20)
  }
  smokeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(smokePositions, 3))
  const smokeMaterial = new THREE.PointsMaterial({
    map: smokeTexture,
    size: 2.8,
    transparent: true,
    opacity: 0.20,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })
  const smoke = new THREE.Points(smokeGeometry, smokeMaterial)
  smoke.layers.set(1) // Camada 1 para a fumaça
  scene.add(smoke)

  // Faíscas (Camada 2)
  const sparkTexture = new THREE.TextureLoader().load('/spark.png')
  const sparkGeometry = new THREE.BufferGeometry()
  // ... (criação da geometria das faíscas)
  const sparkCount = 10
  const sparkPositions = []
  for (let i = 0; i < sparkCount; i++) {
    sparkPositions.push((Math.random() - 0.5) * 10, Math.random() * 3, (Math.random() - 0.5) * 10)
  }
  sparkGeometry.setAttribute('position', new THREE.Float32BufferAttribute(sparkPositions, 3))
  const sparkMaterial = new THREE.PointsMaterial({
    map: sparkTexture,
    size: 0.2,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  })
  const sparks = new THREE.Points(sparkGeometry, sparkMaterial)
  sparks.layers.set(2) // Camada 2 para as faíscas
  scene.add(sparks)

  // --- COMPOSITORES DE EFEITOS CORRIGIDOS ---

  // 1. Compositor de Bloom: Renderiza apenas a camada BLOOM_LAYER (3)
  const bloomComposer = new EffectComposer(renderer)
  const bloomRenderPass = new RenderPass(scene, camera)
  bloomRenderPass.clear = true // Garante que apenas o objeto Bloom seja renderizado
  bloomRenderPass.camera.layers.set(BLOOM_LAYER)
  bloomComposer.addPass(bloomRenderPass)

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.5, 0.4, 0.85
  )
  bloomComposer.addPass(bloomPass)
  bloomComposer.renderToScreen = false // O resultado será misturado no finalComposer

  // 2. Compositor Final: Renderiza a cena principal (camadas 0, 1, 2) e aplica os efeitos
  const finalComposer = new EffectComposer(renderer)

  // Passo A: Renderizar a cena principal (sem o objeto de Bloom)
  const renderPass = new RenderPass(scene, camera)
  renderPass.clear = true
  finalComposer.addPass(renderPass)

  // Passo B: Misturar a cena principal com o resultado do Bloom
  const mixPass = new ShaderPass(MIX_SHADER, 'baseTexture')
mixPass.uniforms['bloomTexture'].value = bloomComposer.renderTarget2.texture
  finalComposer.addPass(mixPass)

  // Passo C: Aplicar o Bokeh (DOF)
 // finalComposer.addPass(new BokehPass(scene, camera, {
 //   focus: 1.0,
 //   aperture: 0.025,
  //  maxblur: 0.01,
  //  width: window.innerWidth,
  //  height: window.innerHeight
  //}))

  // Animação
  let currentIndex = 0
  let nextIndex = 1
  let transitionProgress = 0
  const transitionSpeed = 0.0128
  const clock = new THREE.Clock()

  const animate = () => {
    requestAnimationFrame(animate)
    stats.begin()

    if (isAnimating) {
      const delta = clock.getDelta()
      const time = clock.getElapsedTime()

      // Animação de Luzes
      pointLight.position.x = Math.sin(time * 0.5) * 5
      pointLight.position.z = Math.cos(time * 0.5) * 5
      pointLight.position.y = 32 + Math.sin(time * 0.3) * 0.5
      spotLight.intensity = 1.5 + Math.sin(time * 2) * 111.6
      spotLight.target.updateMatrixWorld()

      // Animação de Câmera (movida para antes dos controles)
      if (props.animateCamera && props.cameraPositions.length > 1) {
        const from = new THREE.Vector3(...props.cameraPositions[currentIndex])
        const to = new THREE.Vector3(...props.cameraPositions[nextIndex])
        const interpolated = new THREE.Vector3().lerpVectors(from, to, transitionProgress)
        camera.position.copy(interpolated)
        transitionProgress += transitionSpeed * delta * 60
        if (transitionProgress >= 1) {
          currentIndex = nextIndex
          nextIndex = (nextIndex + 1) % props.cameraPositions.length
          transitionProgress = 0
        }
      }

      camera.lookAt(0, 0, 0)
      controls.update()
      if (mixer) mixer.update(delta)

      // Animação das Faíscas
      const sparkAttr = sparks.geometry.attributes.position
      for (let i = 0; i < sparkAttr.count; i++) {
        sparkAttr.array[i * 3 + 1] += 0.02
        if (sparkAttr.array[i * 3 + 1] > 5) {
          sparkAttr.array[i * 3 + 1] = 0
        }
      }
      sparkAttr.needsUpdate = true

      // --- LOOP DE RENDERIZAÇÃO CORRIGIDO ---
      
      // 1. Renderiza a camada de Bloom (3) em um buffer temporário
      // Garante que APENAS os objetos na camada 3 (Plane006) são visíveis
      camera.layers.set(BLOOM_LAYER) 
      renderer.setClearColor(0x000000) // Renderiza o bloom em preto para evitar cores indesejadas
      bloomComposer.render()

      // 2. Renderiza a cena principal (camadas 0, 1, 2) e aplica a mistura e DOF
      // CRÍTICO: Desabilita a camada 3 para que o Plane006 não seja renderizado duas vezes
      camera.layers.disableAll()
      camera.layers.enable(0) 
      camera.layers.enable(1) // Fumaça
      camera.layers.enable(2) // Faíscas
      
      // Conecta o buffer do Bloom ao shader de mistura
      mixPass.uniforms['bloomTexture'].value = bloomComposer.renderTarget2.texture
      
      // Renderiza a cena principal, mistura o Bloom e aplica o DOF por cima
      renderer.setClearColor(scene.background || 0x000000) // Volta para a cor de fundo original
      finalComposer.render()

      // Reseta as camadas para a próxima iteração
      camera.layers.enableAll()

      emit('fps-update', Math.round(stats.getFPS?.() || 0))
    }

    stats.end()
  }

  animate()
})
</script>

<style scoped>
.three-container {
  width: 100%;
  height: 100%;
  position: relative;
}
</style>