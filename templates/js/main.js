// 通用拆解引擎：ui / 拾取 / 动画 / 标签，全部由 parts.js 的数据驱动。
// 换场景时不需要改这个文件（除非要加新的交互）。
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { createDemo } from './parts.js';

const canvas = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a141b, 0.02);

const camera = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, 0.1, 200);

/* ---------------------------------------------------------- 数据 */
const world = createDemo();
const parts = world.parts;
const meta = world.meta;

const HOME = { pos: meta.camera.pos.clone(), target: meta.camera.target.clone() };
camera.position.copy(HOME.pos);
scene.add(world.root);

// 材质按构件克隆：高亮不会串到共用材质的其它构件
for (const p of parts) {
  p.base = p.object.position.clone();
  const cache = new Map();
  p.object.traverse((o) => {
    if (!o.isMesh) return;
    o.userData.partKey = p.key;
    const swap = (m) => {
      if (!cache.has(m)) cache.set(m, m.clone());
      return cache.get(m);
    };
    o.material = Array.isArray(o.material) ? o.material.map(swap) : swap(o.material);
  });
}

/* ---------------------------------------------------------- 相机 */
const controls = new OrbitControls(camera, canvas);
controls.target.copy(HOME.target);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.minDistance = 0.8;
controls.maxDistance = 20;
controls.maxPolarAngle = Math.PI * 0.5;
controls.update();

/* ---------------------------------------------------------- 灯光 */
scene.add(new THREE.HemisphereLight(0x3f6484, 0x121316, 1.5));

const key = new THREE.DirectionalLight(0xffd9ab, 2.8);
key.position.set(-4, 6, 3);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.near = 0.5;
key.shadow.camera.far = 30;
key.shadow.camera.left = -6;
key.shadow.camera.right = 6;
key.shadow.camera.top = 6;
key.shadow.camera.bottom = -6;
key.shadow.bias = -0.0008;
scene.add(key);

const rim = new THREE.DirectionalLight(0x35d6ff, 1.4);
rim.position.set(5, 3, -6);
scene.add(rim);

const fill = new THREE.DirectionalLight(0xd8e6f2, 0.8);
fill.position.set(4, 2, 6);
scene.add(fill);

/* ------------------------------------------------- 地面与光池 */
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(24, 24),
  new THREE.MeshStandardMaterial({ color: 0x121a20, roughness: 1 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.02;
floor.receiveShadow = true;
scene.add(floor);

/* ---------------------------------------------------------- 状态 */
let explodeTarget = 0;
let explode = 0;
let selected = null;
let hovered = null;
const byKey = Object.fromEntries(parts.map((p) => [p.key, p]));

const glowSaved = new Map();
function setGlow(part, on, strength = 0.35) {
  part.object.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (!m || !m.emissive) continue;
      if (on) {
        if (!glowSaved.has(m)) glowSaved.set(m, { hex: m.emissive.getHex(), i: m.emissiveIntensity });
        m.emissive.setHex(0x0a4a5c);
        m.emissiveIntensity = Math.max(m.emissiveIntensity, 0.2) + strength;
      } else {
        const s = glowSaved.get(m);
        if (s) { m.emissive.setHex(s.hex); m.emissiveIntensity = s.i; glowSaved.delete(m); }
      }
    }
  });
}

/* ------------------------------------------------------------ UI */
document.getElementById('title').textContent = meta.title;
document.getElementById('subtitle').textContent = meta.subtitle;
document.getElementById('scale-note').textContent = meta.scaleNote;
document.getElementById('count').textContent = `${parts.length} UNITS`;
document.getElementById('specTable').innerHTML = meta.specs
  .map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');

const list = document.getElementById('partList');
parts.forEach((p, i) => {
  const li = document.createElement('li');
  li.className = 'part';
  li.innerHTML = `<span class="no">${String(i + 1).padStart(2, '0')}</span>
    <span class="nm">${p.name}<small>${p.en}</small></span>
    <span class="sp">${p.spec}</span>`;
  li.addEventListener('click', () => select(p.key));
  p.row = li;
  list.appendChild(li);
});

const labelsHost = document.getElementById('labels');
parts.forEach((p) => {
  const el = document.createElement('div');
  el.className = 'lbl';
  el.innerHTML = `<span class="dot"></span><span class="txt"><span class="t1">${p.name}</span><span class="t2">${p.spec}</span></span>`;
  labelsHost.appendChild(el);
  p.labelEl = el;
  p.anchorV = p.anchor.clone();
});

const dTag = document.getElementById('dTag');
const dName = document.getElementById('dName');
const dDesc = document.getElementById('dDesc');
const dParams = document.getElementById('dParams');

function renderDetail(p) {
  if (!p) {
    dTag.textContent = '未选中构件';
    dName.textContent = '点击构件查看详情';
    dDesc.textContent = '点左侧清单或直接点场景里的构件，会播放拆解动画并高亮，这里显示构造说明与参数。';
    dParams.innerHTML = '';
    return;
  }
  dTag.textContent = `${p.tag} · ${p.en}`;
  dName.textContent = p.name;
  dDesc.textContent = p.desc;
  dParams.innerHTML = p.params.map(([k, v]) => `<div><span>${k}</span><span>${v}</span></div>`).join('');
}

function select(key) {
  const p = byKey[key];
  if (!p) return;
  if (selected && selected !== key) {
    setGlow(byKey[selected], false);
    byKey[selected].row.classList.remove('on');
  }
  selected = key;
  setGlow(p, true, 0.32);
  p.row.classList.add('on');
  renderDetail(p);
  explodeTarget = 1;
  syncBtn();
}

function clearSelection() {
  if (selected) {
    setGlow(byKey[selected], false);
    byKey[selected].row.classList.remove('on');
    selected = null;
  }
  renderDetail(null);
}

const btnExplode = document.getElementById('btnExplode');
function syncBtn() {
  btnExplode.textContent = explodeTarget ? '重组' : '拆解';
  btnExplode.classList.toggle('armed', !!explodeTarget);
}
btnExplode.addEventListener('click', () => {
  explodeTarget = explodeTarget ? 0 : 1;
  if (!explodeTarget) clearSelection();
  syncBtn();
});

document.getElementById('btnReset').addEventListener('click', () => {
  camera.position.copy(HOME.pos);
  controls.target.copy(HOME.target);
  controls.update();
});
document.getElementById('guideClose').addEventListener('click', () => {
  document.getElementById('guide').classList.add('hide');
});

/* ------------------------------------------------------------ 拾取 */
const ray = new THREE.Raycaster();
const ptr = new THREE.Vector2(-9, -9);
let pointerIn = false;
let down = null;

canvas.addEventListener('pointermove', (e) => {
  ptr.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  pointerIn = true;
});
canvas.addEventListener('pointerleave', () => { pointerIn = false; });
canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; canvas.classList.add('drag'); });
canvas.addEventListener('pointerup', (e) => {
  canvas.classList.remove('drag');
  if (!down) return;
  const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
  down = null;
  if (moved > 6 || e.button !== 0) return;
  const key = pick();
  if (key) select(key); else clearSelection();
});

function pick() {
  ray.setFromCamera(ptr, camera);
  const hits = ray.intersectObjects(parts.map((p) => p.object), true);
  for (const h of hits) {
    let o = h.object;
    while (o && !o.userData.partKey) o = o.parent;
    if (o) return o.userData.partKey;
  }
  return null;
}

/* ------------------------------------------------------------ 循环 */
const clock = new THREE.Clock();
let fpsAcc = 0, fpsFrames = 0;
const fpsEl = document.getElementById('fps');
const tmp = new THREE.Vector3();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  const k = 1 - Math.pow(0.0016, dt);
  explode += (explodeTarget - explode) * k;
  if (Math.abs(explodeTarget - explode) < 0.0005) explode = explodeTarget;

  for (const p of parts) {
    p.object.position.copy(p.base).addScaledVector(p.direction, p.distance * explode);
  }

  if (pointerIn && !down) {
    const hk = pick();
    if (hk !== hovered) {
      if (hovered && hovered !== selected) setGlow(byKey[hovered], false);
      hovered = hk;
      if (hovered && hovered !== selected) setGlow(byKey[hovered], true, 0.18);
      canvas.classList.toggle('hover', !!hovered);
    }
  }

  if (selected) {
    const p = byKey[selected];
    const pulse = 0.24 + Math.sin(t * 3.4) * 0.1;
    p.object.traverse((o) => {
      if (!o.isMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (m && m.emissive && glowSaved.has(m)) {
          m.emissiveIntensity = Math.max(0.2, glowSaved.get(m).i) + pulse;
        }
      }
    });
  }

  // 标签：投影 + 按 y 排序防重叠
  const showLabels = explode > 0.4;
  const placed = [];
  for (const p of parts) {
    const el = p.labelEl;
    if (!showLabels) { el.classList.remove('show'); continue; }
    tmp.copy(p.anchorV);
    p.object.localToWorld(tmp);
    tmp.project(camera);
    if (tmp.z > 1 || tmp.z < -1) { el.classList.remove('show'); continue; }
    placed.push({
      p, el,
      x: (tmp.x * 0.5 + 0.5) * innerWidth,
      y: (-tmp.y * 0.5 + 0.5) * innerHeight,
    });
  }
  placed.sort((a, b) => a.y - b.y);
  let lastY = -999, lastX = -999;
  for (const it of placed) {
    let y = it.y;
    if (Math.abs(it.x - lastX) < 180 && y < lastY + 28) y = lastY + 28;
    it.el.style.left = `${it.x}px`;
    it.el.style.top = `${y}px`;
    it.el.classList.add('show');
    it.el.style.opacity = selected && selected !== it.p.key ? 0.5 : 1;
    lastY = y;
    lastX = it.x;
  }

  controls.update();
  renderer.render(scene, camera);

  fpsFrames++; fpsAcc += dt;
  if (fpsAcc > 0.5) {
    fpsEl.textContent = `${Math.round(fpsFrames / fpsAcc)} fps`;
    fpsFrames = 0; fpsAcc = 0;
  }
}

addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    explodeTarget = explodeTarget ? 0 : 1;
    if (!explodeTarget) clearSelection();
    syncBtn();
  }
  if (e.code === 'KeyR') {
    camera.position.copy(HOME.pos);
    controls.target.copy(HOME.target);
    controls.update();
  }
  if (e.code === 'Escape') clearSelection();
});
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

renderer.compile(scene, camera);
animate();
requestAnimationFrame(() => {
  document.getElementById('loading').classList.add('done');
  window.__ready = true;
});

// 测试钩子：tools/test-click.mjs 依赖这些
window.__scene = {
  scene, camera, controls, parts, select, meta, renderer,
  // 测试用：返回构件当前的世界中心（拆解后也跟着动）
  centerOf(key) {
    const b = new THREE.Box3().setFromObject(byKey[key].object);
    return b.getCenter(new THREE.Vector3());
  },
  get explode() { return explode; },
  setExplode: (v) => { explodeTarget = v; syncBtn(); },
};
