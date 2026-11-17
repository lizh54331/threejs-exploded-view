# 材质、高亮与程序化纹理

> 目标：暗场里"黑得下来、亮得清楚"，且高亮只作用于被点的那一件。

---

## 1. 第一原则：材质按构件克隆

three 的材质是共享引用。`plateMat` 同时给镜头筒、按钮、底座用，改一次 emissive 就全部发亮 —— 这是拆解页最常见的翻车点。

```js
for (const p of parts) {
  const cache = new Map();          // 每个构件一份缓存，构件内部仍可共享
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
```

克隆发生在"构建完成之后、交互接入之前"，一次性做完，后续所有高亮/透明都可以安全地直接改材质。

---

## 2. 高亮的正确浓度

```js
const saved = new Map();
function setGlow(part, on, strength = 0.35) {
  part.object.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (!m || !m.emissive) continue;
      if (on) {
        if (!saved.has(m)) saved.set(m, { hex: m.emissive.getHex(), i: m.emissiveIntensity });
        m.emissive.setHex(0x0a4a5c);                  // 暗青，不要纯亮色
        m.emissiveIntensity = Math.max(m.emissiveIntensity, 0.2) + strength;
      } else {
        const s = saved.get(m);
        if (s) { m.emissive.setHex(s.hex); m.emissiveIntensity = s.i; saved.delete(m); }
      }
    }
  });
}
```

经验值：

| 用途 | strength | 说明 |
|---|---|---|
| hover | 0.18–0.25 | 只提示"可点" |
| selected | 0.3–0.45 | 看得出选中，但不吃掉固有色 |
| 超过 0.6 | ✗ | 构件会变成一块发光板，纹理全丢 |

注意：
- `MeshBasicMaterial` 没有 emissive，屏幕这类自发光面要跳过；
- 高亮色选**低饱和**（如 `0x0a4a5c`），纯青/纯白会把木纹、布纹冲掉；
- 悬停与选中的恢复要分别判断（`hovered !== selected`），否则会把选中态清掉。

---

## 3. 金属不要拉满

没有环境贴图（`scene.environment`）时，高 metalness 的材质只反射黑 —— 结果是发灰、发蓝、像发光球。

| 材质 | metalness | roughness | 备注 |
|---|---|---|---|
| 阳极氧化铝 | 0.5–0.7 | 0.4–0.55 | 暗场里的主力 |
| 镜面钢 | 0.8+ | 0.15–0.3 | 必须有环境贴图或强边光，否则别用 |
| 铸铁/做旧 | 0.2–0.4 | 0.6–0.7 | 靠粗糙度出质感 |
| 玻璃 | — | `MeshPhysicalMaterial` + clearcoat 1 + opacity 0.9 | 没有 env 时别开 transmission |

要镜面感，廉价替代是：加一道 `DirectionalLight` 做边缘高光 + 金属件上用 `MeshBasicMaterial` 画一道细高光条。

---

## 4. 程序化纹理配方

全部用 256–1024 px 的 Canvas，`colorSpace = SRGBColorSpace`，`RepeatWrapping` + `anisotropy = 8`。

**木纹**：底色 → 8–60 个大半径径向斑（明暗）→ 60–90 条水平贝塞尔长纹 → 3–6 个同心椭圆节疤。
**金属拉丝**：底色 → 3000+ 条极细水平线（alpha 0.02–0.06）。
**PCB**：深绿底 → 40+ 条折线走线（低饱和绿）→ 90 个 3px 金色焊盘。
**石材/地面**：底色 → 方砖 + 缝 → 逐像素噪声（±22）→ 8–12 条折线裂纹。
**屏幕**：直接画 UI（状态条、数值、按钮），用 `MeshBasicMaterial` 当自发光面；暗场里这块"亮"是画面的信息锚点。

**实例化构件的颜色变化**：`InstancedMesh` + `setColorAt()`，色相抖动 ≤ 5%、明度 ±12%，超过就会花。

---

## 5. 暗场打光模板

```js
hemi   = HemisphereLight(0x3f6484, 0x121316, 1.3–1.6)   // 天蓝/地暗
key    = DirectionalLight(0xffd9ab, 2.5–3.0)            // 暖主光，开阴影
rim    = DirectionalLight(0x35d6ff, 1.2–1.6)            // 冷轮廓，从背后
fill   = DirectionalLight(0xd8e6f2, 0.7–1.1)            // 正面补光，别让正面死黑
accent = PointLight(暖或冷, 15–30, 12–16, 2)            // 局部（甲板下、展台、镜头旁）
```

- `toneMapping = ACESFilmic`，曝光 1.0–1.4（暗场要靠曝光救，不要一味加灯）；
- 雾：`FogExp2` 密度 0.008–0.018，颜色与背景同色系；
- 背景：CSS 多层径向渐变 + `renderer alpha:true`，调色不必改代码。

---

## 6. 性能红线

- 重复件（板条/栏杆/树/螺丝）必须 `InstancedMesh`：几百个独立 Mesh 会掉到 20 fps；
- 阴影贴图 2048，`PCFSoftShadowMap`；再多也看不出差别；
- 不要每帧创建几何/材质/贴图；渐变用 `ctx.createRadialGradient` 每次重建是常见泄漏；
- 截图脚本用 `swiftshader` 时 20–30 fps 属正常，真实 GPU 会翻倍。
