## 镜头光晕（Lens Flare）

镜头光晕是摄影/摄像中常见的光学现象——强光源（通常是太阳）的光线在相机镜头内部多次反射、散射，在画面上形成一串沿直线排列的彩色光斑、光环和条纹。

实时渲染中模拟镜头光晕的标准做法是：**在屏幕空间沿光源→屏幕中心的连线，放置一串半透明的 2D 精灵（sprite）**。

### 一、原理

真实镜头光晕的物理过程是光在多层镜片之间反复反射。实时渲染不可能逐条光线追踪，但可以抓住一个关键规律：**所有光晕元素都排列在从光源位置到画面中心的一条直线上**。

算法：
1. 把光源的方向向量投影到屏幕空间，得到光源在屏幕上的"虚拟位置"
2. 把这个位置推到屏幕边缘（因为太阳通常不在画面内，而在画面外某个方向）
3. 沿光源位置 → 屏幕中心画一条线，在这条线上按间距放置多个光晕元素
4. 每个元素是一张贴图（光斑/光环/条纹），用 alpha 混合叠加
5. 离光源越远，元素越小、越暗

### 二、方向光 → 屏幕坐标

太阳是方向光（平行光），没有"位置"。但可以构造一个虚拟位置——沿光线的反方向推到无穷远：

```
虚拟位置 = -lightDir × farDistance  （farDistance = 1000）
```

然后用 MVP 矩阵把这个虚拟位置投影到屏幕上：

```
screenPos = worldToScreenNDC(-lightDir × 1000, viewMatrix, projMatrix)
```

最后以屏幕中心 [0.5, 0.5] 为基准，把这个点推到屏幕边缘：

```js
const dx = screen[0] - 0.5;  // 到屏幕中心的方向
const dy = screen[1] - 0.5;
const edgeScale = 0.5 * 0.92 / max(|dx|, |dy|);  // 推到边缘
return [0.5 + dx * edgeScale, 0.5 + dy * edgeScale];
```

光晕元素沿 `光源位置 → 屏幕中心` 的连线按比例排布：
```
flareVec = screenCenter - lightScreen  // 从光源指向中心
elementPos = lightScreen + flareVec × i × spacing
```

### 三、精灵渲染

每个光晕元素是以屏幕坐标为单位的 2D 四边形（billboard），无需 3D 变换：

```glsl
// 顶点着色器：直接把 [0,1] 屏幕坐标转成 NDC [-1,1] 的四边形
vec2 screenPosition = aPosition * uScale + uCenter;
screenPosition.x = screenPosition.x * 2.0 - 1.0;   // [0,1] → [-1,1]
screenPosition.y = screenPosition.y * -2.0 + 1.0;   // 翻转 Y
gl_Position = vec4(screenPosition, 0.0, 1.0);
```

片元着色器简单地采样贴图，乘以亮度系数，用 alpha 混合叠加。

### 四、本 Demo 修复的问题

之前的实现有两个 bug 导致光晕效果不正确：

1. **屏幕边缘缩放错误**：`directionToScreenEdge` 用 `Math.abs(screenCoord)` 做缩放——但 screenCoord 的原点是左上角 [0,0] 而非屏幕中心 [0.5, 0.5]，导致光晕被推到角落而非边缘。修复为以中心为基准做方向缩放。

2. **元素位置双重偏移**：`_renderOne` 在传入的 `flarePos`（已按元素间距偏移过的位置）上又加了一个 `flareVec × 0.3` 的偏移，导致所有元素被推离正确位置。修复为直接用 `flarePos` 做中心。

3. **亮度曲线**：原本 `brightness = 1.5 × (1 - distance)`，当光源在屏幕中央时距离为 0、亮度最高——但这是镜头光晕，光源在画面外时才有光晕。新增了钳制和衰减。

### 五、为什么用 alpha 混合

光晕元素互相重叠——离光源近的大光斑会被远处的小光斑叠在上面。所有元素必须开启混合：

```glsl
gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
```

和透明排序不同，这里的绘制顺序不影响视觉效果（因为所有光晕颜色都是叠加的、没有相互遮挡）。

### 小结

- 镜头光晕 = 沿**光源→屏幕中心**连线放置的 2D 透明精灵序列
- 方向光通过 **虚拟远点投影** 得到屏幕上的位置
- 元素在**屏幕空间**以四边形方式渲染，无需 3D 变换
- 用 alpha 混合直接叠加，无需深度测试