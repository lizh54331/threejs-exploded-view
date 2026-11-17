// 程序化贴图：木纹 + 径向柔光。够模板用，扩展规则见 references/materials-and-highlight.md
import * as THREE from 'three';

function cv(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function woodTexture(size = 512, opts = {}) {
  const c = cv(size, size);
  const g = c.getContext('2d');
  const r = seeded(opts.seed || 3);
  g.fillStyle = opts.base || '#6a5a49';
  g.fillRect(0, 0, size, size);

  for (let i = 0; i < 50; i++) {
    const x = r() * size, y = r() * size, rad = 26 + r() * 90;
    const grd = g.createRadialGradient(x, y, 0, x, y, rad);
    grd.addColorStop(0, r() > 0.5 ? 'rgba(160,140,112,0.14)' : 'rgba(45,35,26,0.16)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }

  for (let i = 0; i < 80; i++) {
    const y = r() * size;
    g.strokeStyle = `rgba(${40 + r() * 30},${32 + r() * 24},${24 + r() * 18},${0.12 + r() * 0.18})`;
    g.lineWidth = 0.7 + r() * 1.5;
    g.beginPath();
    g.moveTo(0, y);
    g.bezierCurveTo(size * 0.3, y + (r() - 0.5) * 8, size * 0.7, y + (r() - 0.5) * 8, size, y);
    g.stroke();
  }

  for (let k = 0; k < 3; k++) {
    const x = r() * size, y = r() * size;
    for (let i = 0; i < 4; i++) {
      g.strokeStyle = `rgba(38,28,20,${0.22 - i * 0.04})`;
      g.lineWidth = 1.1;
      g.beginPath();
      g.ellipse(x, y, 6 + i * 5, 3 + i * 3, r() * 0.6, 0, Math.PI * 2);
      g.stroke();
    }
  }

  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export function radialGlowTexture(size = 512) {
  const c = cv(size, size);
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.32, 'rgba(255,255,255,0.5)');
  grd.addColorStop(0.68, 'rgba(255,255,255,0.1)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
