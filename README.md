# threejs-exploded-view

把一张实景 / 产品图片做成**纯代码**的可交互 3D 拆解页：部件级爆炸动画、点击高亮与详情、自由旋转缩放、深色科技 UI，外加构件清单 / 参数说明 / 操作引导四件套。

一个 [DeepSeek Harness](https://github.com/) 技能（skill）：`SKILL.md` 是流程与规则，`references/` 是细节，`templates/` 是**可直接运行**的骨架。

> Turn a single photo into an interactive exploded-view page with Three.js — no external 3D models, no image assets, everything generated in code.

## 它解决什么

照着图做 3D 不难，难的是「做出来还好看、还能验收」。这个技能把这些硬经验固化了：

- **拆解构图法**：屏幕平面扇形 / 纵深堆叠 / 分组合并，以及"被挡了怎么办"（外壳半透明）；
- **高亮不串色**：材质必须按构件克隆，否则改一处 emissive 整机发亮；
- **标签不打架**：每帧投影 + 按 y 排序 + 最小间距下推；
- **性能**：重复件一律 `InstancedMesh`（400 根栏杆条不能是 400 个 Mesh）；
- **能验收**：真实 `mouse.click` 冒烟测试 + 截图 + 7 条硬指标清单。

## 快速开始

```bash
cp -r templates <your-project>
cd <your-project>
npm i three@0.169.0
mkdir -p vendor
cp node_modules/three/build/three.module.js vendor/
cp node_modules/three/examples/jsm/controls/OrbitControls.js vendor/
npm i playwright-core        # 只给 tools/ 里的截图与测试用

# 双击 启动预览.bat，或：
python -m http.server 5188
# 打开 http://127.0.0.1:5188/index.html

node tools/shot.mjs --out shots/a.jpg           # 截一帧
node tools/test-click.mjs                       # 真实点击冒烟测试
```

## 目录

```
SKILL.md                          技能入口：适用 / 10 步闭环 / 数据契约 / 失败模式
references/
  layout-and-anim.md              拆解方向、遮挡、位移量、动画曲线、相机
  materials-and-highlight.md      材质克隆、高亮浓度、金属度、程序化贴图、打光
  ui-and-qa.md                    四件套规格、标签防重叠、验收脚本与清单
templates/                        可运行骨架（4 件木边几示例）
  index.html  style.css
  js/main.js                      通用拆解引擎（数据驱动，不用改）
  js/parts.js                     示例构件：改这里就能换成你的场景
  js/textures.js                  程序化木纹 / 柔光
  tools/shot.mjs                  无头截图（Playwright + Edge + SwiftShader）
  tools/test-click.mjs            真实输入冒烟测试
  启动预览.bat                     一键起本地服务 + 开浏览器
```

## 数据契约

构件全部由 `parts[]` 描述，UI、标签、拆解动画都从它派生：

```js
{
  key: 'top', name: '台面', en: 'TABLE TOP', tag: '面层',
  object: topGroup,
  direction: new THREE.Vector3(0, 1, 0),   // 拆解方向
  distance: 0.85,                           // 位移（≈包围盒最大边 × 0.6–1.2）
  anchor: new THREE.Vector3(-0.85, 0.15, 0.35), // 标签锚点（局部坐标）
  spec: '1600 × 1000 · 75 mm',
  desc: '一两句话讲它是什么、为什么这样设计',
  params: [['尺寸', '1600 × 1000 mm'], ['板厚', '75 mm']],
}
```

## 已验证

模板在 headless Chromium（SwiftShader）下实测：合体 / 拆解 / 选中三态出图正常，真实鼠标点击能选中构件、清单联动、重组复位，控制台 0 报错。

## 许可

MIT（见 `LICENSE`）。模板不含 three.js 本体，运行时从 npm 获取，遵循其自身许可。
