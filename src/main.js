import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { FontLoader } from 'three/addons/loaders/FontLoader.js'
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import fontJson from 'three/examples/fonts/helvetiker_bold.typeface.json'
import gsap from 'gsap'
import './style.css'

// ============================================================
// RENDERER
// ============================================================
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.0
document.getElementById('app').appendChild(renderer.domElement)

// ============================================================
// SCENE + ENVIRONMENT
// ============================================================
const scene = new THREE.Scene()
scene.background = new THREE.Color(0x040409)
scene.fog = new THREE.FogExp2(0x040409, 0.006)

const pmremGenerator = new THREE.PMREMGenerator(renderer)
pmremGenerator.compileEquirectangularShader()
const envMap = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture
scene.environment = envMap

// ============================================================
// CAMERA — starts far, GSAP dolly on intro
// ============================================================
const camera = new THREE.PerspectiveCamera(
  45, window.innerWidth / window.innerHeight, 0.1, 300
)
camera.position.set(0, 1, 35) // starts far back

// ============================================================
// ORBIT CONTROLS
// ============================================================
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.04
controls.autoRotate = true
controls.autoRotateSpeed = 0.25
controls.maxDistance = 50
controls.minDistance = 10
controls.target.set(0, 0, 0)

// ============================================================
// LIGHTING
// ============================================================
scene.add(new THREE.AmbientLight(0x1a1a2e, 0.4))

const keyLight = new THREE.DirectionalLight(0xffeedd, 1.8)
keyLight.position.set(8, 10, 15)
scene.add(keyLight)

const fillLight = new THREE.DirectionalLight(0x8899cc, 0.5)
fillLight.position.set(-10, 4, 8)
scene.add(fillLight)

const rimLight = new THREE.PointLight(0xff5522, 1.2, 50)
rimLight.position.set(0, -2, -10)
scene.add(rimLight)

const topLight = new THREE.PointLight(0x7799ff, 0.6, 40)
topLight.position.set(0, 10, 0)
scene.add(topLight)

// Accent lights that orbit
const orbitLight1 = new THREE.PointLight(0xff2266, 0.8, 30)
scene.add(orbitLight1)
const orbitLight2 = new THREE.PointLight(0x2266ff, 0.8, 30)
scene.add(orbitLight2)

// ============================================================
// POST-PROCESSING
// ============================================================
const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
composer.addPass(new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.4, 0.5, 0.75
))
composer.addPass(new OutputPass())

// ============================================================
// FONT
// ============================================================
const font = new FontLoader().parse(fontJson)

// ============================================================
// PBR MATERIALS
// ============================================================
const letterMaterialDefs = [
  // S — Chrome
  { color: 0xccccdd, metalness: 1.0, roughness: 0.03, envMapIntensity: 1.5 },
  // A — Copper
  { color: 0xdd4422, metalness: 0.95, roughness: 0.2, emissive: 0x440a00, emissiveIntensity: 0.3, envMapIntensity: 1.3 },
  // M — Sapphire
  { color: 0x1144cc, metalness: 0.85, roughness: 0.06, clearcoat: 1.0, clearcoatRoughness: 0.04, envMapIntensity: 1.4 },
  // U — Gold
  { color: 0xddaa22, metalness: 1.0, roughness: 0.1, envMapIntensity: 1.5 },
  // E — Amethyst
  { color: 0x8833cc, metalness: 0.8, roughness: 0.08, iridescence: 1.0, iridescenceIOR: 1.5, clearcoat: 0.5, envMapIntensity: 1.3 },
  // L — Emerald
  { color: 0x11aa44, metalness: 0.85, roughness: 0.08, clearcoat: 1.0, clearcoatRoughness: 0.04, envMapIntensity: 1.4 },
]

const cMaterialDef = {
  color: 0xee1133, metalness: 0.9, roughness: 0.08,
  emissive: 0xcc0022, emissiveIntensity: 0.5,
  clearcoat: 0.8, clearcoatRoughness: 0.04, envMapIntensity: 1.5,
}

// ============================================================
// TEXT GEOMETRY
// ============================================================
const TEXT_SIZE = 2.8
const TEXT_DEPTH = 0.9
const SPACING = 0.3

const textConfig = {
  font, size: TEXT_SIZE, depth: TEXT_DEPTH,
  curveSegments: 24,
  bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.06, bevelSegments: 6,
}

const letters = 'SAMUEL'.split('')
const letterMeshes = []
const letterMats = []
const letterGroup = new THREE.Group()

const letterGeometries = letters.map((l) => {
  const g = new TextGeometry(l, textConfig)
  g.computeBoundingBox()
  return g
})

const cGeometry = new TextGeometry('C', textConfig)
cGeometry.computeBoundingBox()
const cWidth = cGeometry.boundingBox.max.x - cGeometry.boundingBox.min.x

let totalWidth = 0
letterGeometries.forEach((g, i) => {
  totalWidth += g.boundingBox.max.x - g.boundingBox.min.x
  if (i < letterGeometries.length - 1) totalWidth += SPACING
})

let cursorX = -totalWidth / 2
const textHeight = letterGeometries[0].boundingBox.max.y

letters.forEach((_, i) => {
  const mat = new THREE.MeshPhysicalMaterial(letterMaterialDefs[i])
  letterMats.push(mat)
  const mesh = new THREE.Mesh(letterGeometries[i], mat)
  const w = letterGeometries[i].boundingBox.max.x - letterGeometries[i].boundingBox.min.x
  const homeX = cursorX
  const homeY = -textHeight / 2

  mesh.position.set(homeX, homeY, 0)
  mesh.userData = {
    homeX, homeY, originalX: homeX,
    introX: homeX + (Math.random() - 0.5) * 30,
    introY: homeY + (Math.random() - 0.5) * 20,
    introZ: -15 - Math.random() * 20, // all start behind camera
    introRotX: (Math.random() - 0.5) * Math.PI * 4,
    introRotY: (Math.random() - 0.5) * Math.PI * 4,
    floatPhase: Math.random() * Math.PI * 2,
    floatSpeed: 0.4 + Math.random() * 0.3,
    breathePhase: Math.random() * Math.PI * 2,
  }

  letterMeshes.push(mesh)
  letterGroup.add(mesh)
  cursorX += w + SPACING
})

scene.add(letterGroup)

// ============================================================
// THE "C"
// ============================================================
const cMaterial = new THREE.MeshPhysicalMaterial(cMaterialDef)
const cMesh = new THREE.Mesh(cGeometry, cMaterial)
cMesh.position.set(0, -textHeight / 2, 0)
cMesh.visible = false
cMesh.scale.set(0, 0, 0)
letterGroup.add(cMesh)

const sWidth = letterGeometries[0].boundingBox.max.x - letterGeometries[0].boundingBox.min.x
const cTargetX = letterMeshes[0].userData.originalX + sWidth + SPACING
const shiftAmount = cWidth + SPACING
const groupShiftX = -shiftAmount / 2

// ============================================================
// GSAP SCROLL STATE
// ============================================================
let introProgress = 0
const INTRO_DURATION = 2.5

const state = { cProgress: 0 }
const SCROLL_RANGE = 600
let scrollAccum = 0
let activeTween = null

function updateCTarget(target) {
  target = Math.max(0, Math.min(1, target))
  if (activeTween) activeTween.kill()
  activeTween = gsap.to(state, {
    cProgress: target,
    duration: 1.0,
    ease: 'power3.out',
    overwrite: true,
  })
}

window.addEventListener('wheel', (e) => {
  if (introProgress < 1) return
  scrollAccum = Math.max(0, Math.min(SCROLL_RANGE, scrollAccum + e.deltaY))
  updateCTarget(scrollAccum / SCROLL_RANGE)
}, { passive: true })

let touchStartY = 0
window.addEventListener('touchstart', (e) => { touchStartY = e.touches[0].clientY }, { passive: true })
window.addEventListener('touchmove', (e) => {
  if (introProgress < 1) return
  const dy = touchStartY - e.touches[0].clientY
  touchStartY = e.touches[0].clientY
  scrollAccum = Math.max(0, Math.min(SCROLL_RANGE, scrollAccum + dy * 2))
  updateCTarget(scrollAccum / SCROLL_RANGE)
}, { passive: true })

// ============================================================
// GSAP CAMERA DOLLY — cinematic intro
// ============================================================
gsap.to(camera.position, {
  z: 18,
  duration: 3.0,
  ease: 'power2.inOut',
  delay: 0.3,
})

// ============================================================
// "227" INSTANCES — 120 of them, organized in orbital rings + scattered
// ============================================================
const NUM_227 = 120
const instances227 = []

const palette227 = [
  0xff1144, 0x11ff88, 0x2266ff, 0xffaa11, 0xff11ff,
  0x11eeff, 0xffee11, 0xff6611, 0x8811ff, 0x11ff44,
  0xff4488, 0x44ffaa, 0x8844ff, 0xff8811, 0x11aaff,
]

const mat227Types = [
  (c) => new THREE.MeshPhysicalMaterial({ color: c, metalness: 1.0, roughness: 0.05, envMapIntensity: 1.2 }),
  (c) => new THREE.MeshPhysicalMaterial({ color: c, metalness: 0.0, roughness: 0.1, clearcoat: 1.0 }),
  (c) => new THREE.MeshPhysicalMaterial({ color: c, metalness: 0.9, roughness: 0.25 }),
  (c) => new THREE.MeshPhysicalMaterial({ color: c, metalness: 0.5, roughness: 0.05, iridescence: 1.0 }),
  (c) => new THREE.MeshPhysicalMaterial({ color: c, metalness: 0.0, roughness: 0.0, transmission: 0.85, thickness: 0.5 }),
  (c) => new THREE.MeshPhysicalMaterial({ color: c, metalness: 0.8, roughness: 0.1, emissive: c, emissiveIntensity: 0.15 }),
  (c) => new THREE.MeshBasicMaterial({ color: c, wireframe: true }),
]

// Shared geometry pool (3 sizes to reduce draw calls)
const geo227Small = new TextGeometry('227', { font, size: 0.35, depth: 0.08, curveSegments: 6, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.008, bevelSegments: 2 })
const geo227Med   = new TextGeometry('227', { font, size: 0.65, depth: 0.14, curveSegments: 8, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.01, bevelSegments: 2 })
const geo227Large = new TextGeometry('227', { font, size: 1.0, depth: 0.2, curveSegments: 8, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.015, bevelSegments: 3 })
const geoPool = [geo227Small, geo227Small, geo227Med, geo227Med, geo227Large]

for (let i = 0; i < NUM_227; i++) {
  const geo = geoPool[i % geoPool.length]
  const color = palette227[i % palette227.length]
  const mat = mat227Types[i % mat227Types.length](color)
  const mesh = new THREE.Mesh(geo, mat)

  // Distribute in organized orbital layers
  const layer = i % 4
  let radius, phi
  if (layer === 0) {
    // Inner ring — closer, tighter orbit
    radius = 9 + Math.random() * 3
    phi = Math.PI * 0.4 + Math.random() * Math.PI * 0.2
  } else if (layer === 1) {
    // Mid ring
    radius = 14 + Math.random() * 4
    phi = Math.acos(2 * Math.random() - 1)
  } else if (layer === 2) {
    // Outer ring
    radius = 20 + Math.random() * 6
    phi = Math.acos(2 * Math.random() - 1)
  } else {
    // Far scattered
    radius = 28 + Math.random() * 12
    phi = Math.acos(2 * Math.random() - 1)
  }
  const theta = (i / NUM_227) * Math.PI * 2 + Math.random() * 0.5

  mesh.position.set(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  )
  mesh.rotation.set(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2)

  const dir = Math.random() > 0.5 ? 1 : -1
  mesh.userData = {
    radius, theta, phi,
    orbitSpeed: (0.02 + Math.random() * 0.08) * dir,
    selfRotSpeed: new THREE.Vector3((Math.random()-0.5)*0.3, (Math.random()-0.5)*0.3, (Math.random()-0.5)*0.3),
    bobSpeed: 0.3 + Math.random() * 0.8,
    bobAmount: 0.05 + Math.random() * 0.2,
    // For scale pulse animation
    baseScale: 1,
    pulseSpeed: 0.5 + Math.random() * 1.0,
    pulseAmount: 0.05 + Math.random() * 0.1,
    pulsePhase: Math.random() * Math.PI * 2,
  }
  instances227.push(mesh)
  scene.add(mesh)
}

// ============================================================
// FLOATING LIGHT PARTICLES (fireflies around the text)
// ============================================================
const particleCount = 1500
const pGeo = new THREE.BufferGeometry()
const pPos = new Float32Array(particleCount * 3)
for (let i = 0; i < particleCount; i++) {
  pPos[i*3]   = (Math.random()-0.5) * 120
  pPos[i*3+1] = (Math.random()-0.5) * 80
  pPos[i*3+2] = (Math.random()-0.5) * 120
}
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({
  color: 0x5566aa, size: 0.06, transparent: true, opacity: 0.5, sizeAttenuation: true,
}))
scene.add(particles)

// ============================================================
// EASING
// ============================================================
function easeOutExpo(x) { return x === 1 ? 1 : 1 - Math.pow(2, -10 * x) }

// ============================================================
// ANIMATION LOOP
// ============================================================
const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)

  const delta = clock.getDelta()
  const elapsed = clock.getElapsedTime()

  // --- Intro: letters fly in from behind ---
  if (introProgress < 1) {
    introProgress = Math.min(introProgress + delta / INTRO_DURATION, 1)
    const t = easeOutExpo(introProgress)
    for (const mesh of letterMeshes) {
      const ud = mesh.userData
      mesh.position.x = THREE.MathUtils.lerp(ud.introX, ud.homeX, t)
      mesh.position.y = THREE.MathUtils.lerp(ud.introY, ud.homeY, t)
      mesh.position.z = THREE.MathUtils.lerp(ud.introZ, 0, t)
      mesh.rotation.x = THREE.MathUtils.lerp(ud.introRotX, 0, t)
      mesh.rotation.y = THREE.MathUtils.lerp(ud.introRotY, 0, t)
    }
  }

  // --- GSAP C insertion ---
  if (introProgress >= 1) {
    const p = state.cProgress

    cMesh.visible = p > 0.001

    // Slide AMUEL
    for (let i = 1; i < letterMeshes.length; i++) {
      letterMeshes[i].position.x = letterMeshes[i].userData.originalX + shiftAmount * p
    }

    // C flies in
    const inv = 1 - p
    cMesh.position.x = cTargetX + 6 * inv
    cMesh.position.y = -textHeight / 2 + 8 * inv
    cMesh.position.z = 12 * inv
    cMesh.rotation.x = Math.PI * 2 * inv
    cMesh.rotation.y = Math.PI * 1.5 * inv
    cMesh.scale.setScalar(Math.max(p, 0.001))

    letterGroup.position.x = groupShiftX * p

    // C emissive
    cMaterial.emissiveIntensity = p < 0.95
      ? 0.5 + inv * 0.6
      : 0.4 + Math.sin(elapsed * 2.5) * 0.12

    // --- Letter idle animations ---
    for (let i = 0; i < letterMeshes.length; i++) {
      const mesh = letterMeshes[i]
      const ud = mesh.userData

      // Gentle float
      mesh.position.y = ud.homeY + Math.sin(elapsed * ud.floatSpeed + ud.floatPhase) * 0.05

      // Subtle tilt to catch light differently over time
      mesh.rotation.x = Math.sin(elapsed * 0.2 + ud.floatPhase) * 0.012
      mesh.rotation.z = Math.cos(elapsed * 0.3 + ud.floatPhase) * 0.008

      // Subtle breathe (scale pulse)
      const breathe = 1.0 + Math.sin(elapsed * 0.8 + ud.breathePhase) * 0.008
      mesh.scale.setScalar(breathe)
    }

    // C idle bob
    if (p > 0.9) {
      const s = (p - 0.9) / 0.1
      cMesh.position.y += Math.sin(elapsed * 0.5 + 2.5) * 0.05 * s
    }
  }

  // --- 227 animations ---
  for (const mesh of instances227) {
    const ud = mesh.userData

    // Orbit
    ud.theta += delta * ud.orbitSpeed
    mesh.position.x = ud.radius * Math.sin(ud.phi) * Math.cos(ud.theta)
    mesh.position.z = ud.radius * Math.sin(ud.phi) * Math.sin(ud.theta)
    mesh.position.y = ud.radius * Math.cos(ud.phi) + Math.sin(elapsed * ud.bobSpeed) * ud.bobAmount

    // Self rotation
    mesh.rotation.x += delta * ud.selfRotSpeed.x
    mesh.rotation.y += delta * ud.selfRotSpeed.y
    mesh.rotation.z += delta * ud.selfRotSpeed.z

    // Scale pulse
    const s = ud.baseScale + Math.sin(elapsed * ud.pulseSpeed + ud.pulsePhase) * ud.pulseAmount
    mesh.scale.setScalar(s)
  }

  // --- Orbiting accent lights ---
  orbitLight1.position.set(
    Math.sin(elapsed * 0.3) * 12,
    Math.cos(elapsed * 0.2) * 4 + 2,
    Math.cos(elapsed * 0.3) * 12
  )
  orbitLight2.position.set(
    Math.cos(elapsed * 0.25) * 14,
    Math.sin(elapsed * 0.15) * 3 - 1,
    Math.sin(elapsed * 0.25) * 14
  )

  // Subtle key light color temperature shift
  rimLight.position.x = Math.sin(elapsed * 0.35) * 6

  // Slow particle field rotation
  particles.rotation.y = elapsed * 0.008

  controls.update()
  composer.render()
}

// ============================================================
// RESIZE
// ============================================================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  composer.setSize(window.innerWidth, window.innerHeight)
})

animate()
