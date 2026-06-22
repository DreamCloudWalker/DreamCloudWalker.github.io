# 《混合与透明排序》Demo 实现计划

## 目标
为教学平台新增「混合与透明排序」Demo。选中后场景渲染 5 个**斜向交错排列、互不相交、深度各异**的半透明球。提供 3 个独立开关，让新人直观对比开启/关闭各项时的渲染差异。配套一篇中文讲解 `blog/blendSort.md`。

## 设计要点（让新人理解透明排序）
三个独立开关，每个对应一个 OpenGL 概念：
1. **开启混合 (gl.BLEND, SRC_ALPHA / ONE_MINUS_SRC_ALPHA)** — 关闭时球完全不透明，看不出半透明；开启后才有透明叠加。
2. **深度写入 (depthMask)** — 开启混合但仍写深度时，后画的远处球会被先画的近处球的深度挡掉，出现「空洞/缺失」的经典错误。关闭 depthMask 可修正。
3. **由远到近排序** — 不排序（按固定顺序画）时透明叠加颜色错误；按到相机距离从远到近排序后颜色才正确。

这三者组合能完整演示「为什么透明物体要：开混合 + 关深度写入 + 由远到近排序」。

## 文件改动

### 1. 新建 `scene/BlendSortModule.js`（IIFE，App.BlendSort 命名空间，仿 LightingModule/SkyBox）
- 私有状态：`_program`、`_sphereBuffer`（复用 `initSphereBuffers`，半径 ~0.7）、`_spheres`（5 个 {pos, color(rgba, a≈0.5)}，斜向交错：x/y/z 均递增偏移，z 跨度大保证深度不同且互不相交）。
- 开关状态：`_enableBlend`、`_depthMask`、`_sortByDepth`，提供 setter。
- `_initShader`：内联简单顶点+片元着色器（MVP 变换 + 朴素方向光，输出带 alpha 的颜色）。沿用工程内联 shader 模式。
- `_draw(gl, isGodView)`：
  - 选 view/proj（god view 用 mGod* 矩阵，仿 LightingModule）。
  - 计算每球在相机空间的深度；若 `_sortByDepth` 则按距离从远到近排序，否则用固定数组顺序。
  - 按开关设置 `gl.enable/disable(gl.BLEND)`、`gl.blendFunc(...)`、`gl.depthMask(true/false)`。
  - 逐球设置 model 矩阵并 `drawArrays(TRIANGLES)`。
  - 画完恢复 `gl.depthMask(true)`、`gl.disable(gl.BLEND)`，避免污染后续渲染。
- 暴露 `init`/`draw`/`setEnableBlend`/`setDepthMask`/`setSortByDepth`。
- 文件底部加全局包装函数 `updateBlendSortOptions()`（读 3 个 checkbox → 调 setter → requestRender），供 HTML onchange 调用。

### 2. `learnOpenGLES.js`
- 顶部加 `var mNeedDrawBlendSort = false;`
- `GLScene` 资源初始化处加 `App.BlendSort.init(gl);`（在 `App.Sphere.init(gl);` 附近）。
- `switchDemo()`：开头 reset 区加 `mNeedDrawBlendSort = false;` 与隐藏 `id_blend_sort_demo`、`id_blend_sort_blog`。
- `switchDemo()` 新增 `case 'BlendSort':`：`mNeedDrawBlendSort = true; mNeedDrawSkyBox = true; resumeMVPMatrix(false);` 显示控制面板 + 用 XHR 加载 `blog/blendSort.md` 渲染到 `id_blend_sort_blog`（完全仿 'UV' case）。
- `drawScene()` 主视口（~line 2819 mNeedDrawSphere 附近）加 `if (mNeedDrawBlendSort) App.BlendSort.draw(gl, false);`
- `drawScene()` 右侧 god 视口（~line 2925 附近）加 `if (mNeedDrawBlendSort) App.BlendSort.draw(gl, true);`

### 3. `index.html`
- `<script src="scene/LightingModule.js">` 后加 `<script src="scene/BlendSortModule.js"></script>`（须在 learnOpenGLES.js 之前）。
- 侧边栏菜单项「混合与透明排序」(line 331) 加 `onclick="switchDemo('BlendSort')"` 与 `href="#TOC2.2"`。
- 在 `id_uv_demo` 区块附近新增控制面板 `<div id="id_blend_sort_demo">`：标题 + 3 个 checkbox（开启混合 / 深度写入 / 由远到近排序，均 `onchange="updateBlendSortOptions()"`，默认勾选「开启混合」，「深度写入」默认勾选以先展示错误效果、「排序」默认不勾）。
- 新增空白 `<div id="id_blend_sort_blog"></div>` 承载讲解文档。

### 4. 新建 `blog/blendSort.md`
中文讲解：混合方程 `result = src.a*src + (1-src.a)*dst`；为何关深度写入；为何由远到近排序；结合本 Demo 三个开关说明对应现象与正确组合。

### 5. `language/strings_zh.properties` / `strings_en.properties`
- `blend_sort` 已存在。新增 checkbox 文案 key：`blend_enable`、`blend_depth_mask`、`blend_sort_far_to_near`（中英各一份），HTML 用 `data-lang` 引用。

## 验证
无构建步骤。用 `python -m http.server 8080` 起服务，浏览器打开 index.html，点击「混合与透明排序」，逐一切换 3 个开关确认：
- 仅开混合+关排序+开深度写入 → 出现穿帮/空洞；
- 加上关深度写入 → 空洞消失但颜色可能仍错；
- 再开排序 → 颜色正确。
检查浏览器 console 无报错，且切到其他 Demo 后混合状态不残留（depthMask/BLEND 已复位）。
