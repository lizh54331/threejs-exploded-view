# 拆解可视化模板（4 部件示例：木质边几）

这是 `threejs-exploded-view` 技能的**可运行骨架**：UI、拾取、拆解动画、标签、点击测试都已经接好，你只换模型数据。

## 第一次运行（补 vendor）

模板里不放 three 本体（1.3 MB，属于第三方代码），第一次用需要拷进来：

```bash
cd <project>
npm i three@0.169.0
mkdir vendor
cp node_modules/three/build/three.module.js vendor/
cp node_modules/three/examples/jsm/controls/OrbitControls.js vendor/
npm i playwright-core        # 只给 tools/ 里的截图与测试用
```

之后双击 `启动预览.bat`，或 `python -m http.server 5188` 后打开 http://127.0.0.1:5188/index.html 。

## 验证

```bash
node tools/shot.mjs --out shots/a.jpg          # 合体
node tools/shot.mjs --out shots/b.jpg --pick top   # 拆解 + 选中
node tools/test-click.mjs                      # 真实点击 / 清单 / 重组
```

## 换成你的场景

只有三个文件要动：

| 文件 | 改什么 |
|---|---|
| `js/parts.js` | 换成你的构件：每个部件一个 `THREE.Group` + 一条配置（key/name/en/tag/object/direction/distance/anchor/spec/desc/params），并填 `meta`（标题、机位、整体参数） |
| `js/textures.js` | 需要新贴图时加生成函数（木纹/石纹/PCB/屏幕…） |
| `index.html` 的 `<title>` | 页面标题 |

`js/main.js` 不用改——它是数据驱动的引擎。只有当你要加新的交互（比如剖面、自动巡游）时才动它。

## 引擎已提供

- OrbitControls：旋转 / 缩放 / 平移，极角限制在地平线以上
- 拆解状态机：指数插值，`explode 0..1`，按钮与空格键切换
- 拾取：`userData.partKey` + 向上回溯，点击空白取消选中
- 高亮：材质按构件克隆，hover 0.18 / selected 0.4 + 呼吸
- 标签：投影到屏幕 + 按 y 排序防重叠 + 背面隐藏
- UI：构件清单 / 详情卡 / 整体参数 / 操作引导
- 测试钩子：`window.__scene.{parts,select,explode,centerOf,setExplode}`

## 数据格式

```js
{
  key: 'top', name: '台面', en: 'TABLE TOP', tag: '面层',
  object: topGroup,
  direction: new THREE.Vector3(0, 1, 0), distance: 1.0,
  anchor: new THREE.Vector3(-0.85, 0.15, 0.35),   // 标签锚点（构件局部坐标）
  spec: '1600 × 1000 · 75 mm',
  desc: '一两句话讲它是什么、为什么这样设计',
  params: [['尺寸', '1600 × 1000 mm'], ['板厚', '75 mm']],
}
```

`direction` 会被直接乘上 `distance`，所以不必归一化，但为了可读性建议归一化。
`distance` 取构件包围盒最大边的 0.6–1.2 倍。
