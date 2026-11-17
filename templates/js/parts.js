// 模板用的示例模型：一张木质边几（4 个构件）。
// 换成你的场景时，只要保持返回结构一致，main.js 不用改。
import * as THREE from 'three';
import { woodTexture } from './textures.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

function box(w, h, d, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function createDemo() {
  const root = new THREE.Group();
  const parts = [];

  const wood = new THREE.MeshStandardMaterial({
    map: woodTexture(512, { seed: 4, base: '#6e5843' }),
    color: 0xd7c2a6, roughness: 0.8, metalness: 0.02,
  });
  const woodDark = new THREE.MeshStandardMaterial({
    map: woodTexture(512, { seed: 21, base: '#57432f' }),
    color: 0xb69d81, roughness: 0.86, metalness: 0.02,
  });
  const brass = new THREE.MeshStandardMaterial({ color: 0xb08a52, roughness: 0.42, metalness: 0.55 });

  /* 1. 台面 */
  const top = new THREE.Group();
  {
    const board = box(1.6, 0.075, 1.0, wood);
    board.position.y = 0.712;
    top.add(board);
    // 包边
    for (const z of [-0.5, 0.5]) {
      const edge = box(1.6, 0.05, 0.03, woodDark);
      edge.position.set(0, 0.69, z);
      top.add(edge);
    }
    // 铜角
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), brass);
        cap.position.set(sx * 0.77, 0.7, sz * 0.47);
        top.add(cap);
      }
    }
  }
  parts.push({
    key: 'top', name: '台面', en: 'TABLE TOP', tag: '面层',
    object: top, direction: V(0, 1, 0), distance: 0.85,
    anchor: V(-0.85, 0.15, 0.35),
    spec: '1600 × 1000 · 75 mm',
    desc: '一整块实木台面，四角包铜防磕碰；下沿做了 3 mm 倒角，手放上去不会硌。',
    params: [['尺寸', '1600 × 1000 mm'], ['板厚', '75 mm'], ['倒角', '3 mm'], ['表面', '硬蜡油']],
  });

  /* 2. 腿架 */
  const frame = new THREE.Group();
  {
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const leg = box(0.075, 0.68, 0.075, woodDark);
        leg.position.set(sx * 0.7, 0.34, sz * 0.42);
        frame.add(leg);
      }
    }
    // 上围板
    for (const sz of [-1, 1]) {
      const apron = box(1.5, 0.1, 0.04, woodDark);
      apron.position.set(0, 0.62, sz * 0.44);
      frame.add(apron);
    }
  }
  parts.push({
    key: 'frame', name: '腿架', en: 'LEG FRAME', tag: '结构',
    object: frame, direction: V(0, -1, 0), distance: 0.4,
    anchor: V(0.9, 0.2, 0.45),
    spec: '75 × 75 mm 四腿',
    desc: '四根方腿加上围板，把台面荷载直接落到地面；围板同时防止腿脚外撇。',
    params: [['截面', '75 × 75 mm'], ['腿高', '680 mm'], ['围板', '100 mm 高'], ['连接', '榫卯 + 胶']],
  });

  /* 3. 横撑 */
  const stretcher = new THREE.Group();
  {
    for (const sz of [-1, 1]) {
      const beam = box(1.42, 0.055, 0.055, wood);
      beam.position.set(0, 0.2, sz * 0.42);
      stretcher.add(beam);
    }
    const cross = box(0.055, 0.05, 0.84, wood);
    cross.position.set(0, 0.17, 0);
    stretcher.add(cross);
  }
  parts.push({
    key: 'stretcher', name: '横撑', en: 'STRETCHERS', tag: '结构',
    object: stretcher, direction: V(0, 0.15, 1), distance: 0.85,
    anchor: V(0, -0.05, 0.5),
    spec: '55 × 55 mm',
    desc: '前后两根横撑 + 一根中撑，主要作用是抗扭：人坐上去侧向晃的时候，靠它们把四条腿锁在一起。',
    params: [['截面', '55 × 55 mm'], ['位置', '离地 200 mm'], ['数量', '2 + 1'], ['作用', '抗扭 / 防外撇']],
  });

  /* 4. 层板 */
  const shelf = new THREE.Group();
  {
    const board = box(1.4, 0.035, 0.8, wood);
    board.position.y = 0.1;
    shelf.add(board);
    for (const sz of [-1, 1]) {
      const stop = box(1.4, 0.03, 0.025, woodDark);
      stop.position.set(0, 0.13, sz * 0.39);
      shelf.add(stop);
    }
  }
  parts.push({
    key: 'shelf', name: '下层板', en: 'LOWER SHELF', tag: '面层',
    object: shelf, direction: V(0, -1, 0), distance: 0.5,
    anchor: V(-0.75, -0.05, -0.25),
    spec: '1400 × 800 · 35 mm',
    desc: '下层搁板，两侧有 30 mm 挡边，放杂志和遥控器不会滑下来。',
    params: [['尺寸', '1400 × 800 mm'], ['板厚', '35 mm'], ['挡边', '30 mm'], ['离地', '100 mm']],
  });

  // 把四个构件挂到根节点（漏了这步，模型不会出现在场景里）
  for (const part of parts) root.add(part.object);

  const meta = {
    title: '木质边几',
    subtitle: 'SIDE TABLE / 结构拆解',
    scaleNote: '1 单位 = 1 m',
    camera: { pos: new THREE.Vector3(2.9, 2.5, 3.6), target: new THREE.Vector3(0, 0.5, 0) },
    specs: [
      ['外形', '1600 × 1000 × 750 mm'],
      ['主材', '白蜡木实木'],
      ['台面', '75 mm 厚板'],
      ['腿架', '75 × 75 mm 方料'],
      ['横撑', '55 × 55 mm'],
      ['层板', '35 mm，离地 100 mm'],
      ['五金', '四角铜包角'],
    ],
  };

  return { root, parts, meta };
}
