# 《Mipmap贴图》Demo 实现计划

## 形式（已与用户确认）
**左右对比双地面** + 三个教学点：开/关 Mipmap 对比、每级 mip 染色、三种滤波模式。

主视口里并排放两条向屏幕深处延伸的长地面，贴同一张高频棋盘格纹理：
- **左地面**：不启用 Mipmap（min filter = LINEAR / NEAREST），远处会闪烁、摩尔纹。
- **右地面**：启用 Mipmap（min filter = LINEAR_MIPMAP_LINEAR 等），远处平滑。
两条地面都向 -z 延伸很远，天然产生"近大远密"的纹理梯度，Mipmap 作用一目了然。
右侧上帝视角照常俯视这两条地面（复用现有左右分屏架构，不冲突）。

## 关键技术点（工程是 WebGL1）
WebGL1 片元着色器无 `textureLod`，所以"每级 mip 染色"用**手动逐级上传**实现：
- 用离屏 canvas 动态生成 **256×256 棋盘格**作为基础纹理（不依赖外部图片）。
- 普通模式：上传 level 0 后调用 `gl.generateMipmap` 自动生成各级。
- 染色模式：**逐级 `texImage2D`**，level 0 = 棋盘格，level 1 起每级填纯色（红/绿/蓝/黄/品红/青…），256→128→…→1 共 9 级。GPU 自动选了哪级，地面对应距离段就显示哪种颜色 → 直观揭示"mip 是一串逐级减半的图"+"GPU 按距离自动选级"。
- 切换染色/普通需要重建纹理（两套 texture 预先各建一份，或按需重建）。

## 文件改动

### 1. 新建 `scene/MipmapModule.js`（IIFE，App.Mipmap，仿 SkyBox/BlendSort）
私有状态：
- `_program`（内联 shader：MVP 变换 + texture2D 采样，uniform 控制 min filter 不在 shader 里、在 texParameteri）。
- `_groundBuffer`：一条沿 -z 延伸的长地面（如 x∈[-2,2]，z∈[0,-40]），UV 在长度方向大幅平铺（v: 0→20）制造高频。建两份 buffer（左、右地面，x 偏移分开），或一份 buffer 画两次平移。
- `_texPlain`：generateMipmap 自动链；`_texColored`：手动染色链。
- 开关：`_enableMipmap`、`_colored`、`_minFilterMode`（3 选 1）。
内部函数：
- `_makeCheckerCanvas(size)` → 返回画好棋盘格的 canvas。
- `_buildPlainTexture(gl)` / `_buildColoredTexture(gl)`。
- `_applyFilter(gl, tex)`：按 `_enableMipmap` + `_minFilterMode` 设 TEXTURE_MIN_FILTER。
- `_initShader` / `_initBuffer` / `_draw(gl, isGodView)`：左地面强制不开 mipmap 的纹理参数、右地面开。或：左右都用同一纹理但绑定不同 filter —— **注意 filter 是绑在 texture 对象上的，左右要用不同 texture 对象**才能同时显示开/关对比。故 `_texPlain` 用两个 texture 对象（一个 no-mip、一个 mip），染色同理。
暴露 `init`/`draw`/`setEnableMipmap`/`setColored`/`setMinFilterMode`，底部加全局包装 `updateMipmapOptions()`。

### 2. `learnOpenGLES.js`
- 顶部加 `var mNeedDrawMipmap = false;` 和 `var mUIMipmap = null;`
- 资源初始化处加 `App.Mipmap.init(gl);`
- `switchDemo()` reset 区加 `mNeedDrawMipmap = false;`、隐藏 `id_mipmap_demo` 和 `mUIMipmap`。
- 新增 `case 'Mipmap':`：`mNeedDrawMipmap = true; mNeedDrawSkyBox = true; resumeMVPMatrix(true);`（略微俯视，看清地面延伸），显示控制面板 + 加载 `blog/mipmap.md`（仿 UV case）。
- `drawScene()` 主视口加 `if (mNeedDrawMipmap) App.Mipmap.draw(gl, false);`；god 视口加 `App.Mipmap.draw(gl, true);`

### 3. `index.html`
- `<script src="scene/BlendSortModule.js">` 后加 `<script src="scene/MipmapModule.js"></script>`。
- 菜单项 Mipmap（line 334）加 `onclick="switchDemo('Mipmap')"`。
- 新增控制面板 `<div id="id_mipmap_demo">`：
  - checkbox「启用 Mipmap（右地面）」默认勾选
  - checkbox「每级 mip 染色」默认不勾
  - 单选 Min Filter：NEAREST / LINEAR_MIPMAP_NEAREST / LINEAR_MIPMAP_LINEAR
  - 均 onchange="updateMipmapOptions()"
- 新增 `<div id="id_mipmap_blog"></div>`。

### 4. 新建 `blog/mipmap.md`
中文讲解：为什么需要 Mipmap（远处采样跨多纹素 → aliasing）；Mipmap 是什么（一串逐级减半预生成图，多占 1/3 显存）；GPU 如何按屏幕空间导数自动选级；三种 min filter 区别（mip 间硬切换 vs 三线性平滑）；结合本 Demo 的左右地面与染色现象说明。

### 5. i18n（zh + en）
`mipmap` 已存在。新增 key：`mipmap_enable`、`mipmap_colored`、`mipmap_min_filter`（及三个 filter 选项文案可直接用英文常量名，不必加 key）。

## 验证
无构建步骤。`python -m http.server 8080`，浏览器打开，点击 纹理 → Mipmap：
- 默认：左地面远处闪烁/摩尔纹，右地面平滑 → Mipmap 价值。
- 勾「染色」：右地面随距离出现红→绿→蓝…颜色分层 → mip 自动选级可视化。
- 切 min filter：LINEAR_MIPMAP_NEAREST 看到 mip 级硬边界，LINEAR_MIPMAP_LINEAR 平滑过渡。
- 右上帝视角能俯视两条地面。
- `node --check scene/MipmapModule.js` 通过；console 无报错；切走后不污染其他 demo。
