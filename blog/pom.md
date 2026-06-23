## 视差遮蔽贴图（Parallax Occlusion Mapping, POM）

这个 Demo 用 2×2 四宫格排列四堵正方形砖墙，让你一眼对比四种贴图技术的递进效果：

- **左上**：仅漫反射 — 纯平面，"墙纸"感
- **右上**：+法线贴图 — 砖缝有明暗凹凸，但掠射角下穿帮
- **左下**：+法线+视差贴图 — UV 单次偏移，掠射角下有深度，但纹理阶梯明显
- **右下**：+法线+POM — 沿视线逐层 ray-march + 层间插值，最接近真实几何位移

### 一、视差贴图的缺陷

上一节的视差贴图用 `height × scale − bias` 一次性偏移 UV，假设高度是均匀变化的。但实际上，砖缝到砖面是**阶跃式**的高度变化——视差的一步到位无法精确找到视线与高度场的真正交点，在陡峭角度或复杂高度变化时纹理位置不够准确。

POM 解决这个问题的方式和真正的光线追踪一样：**沿视线方向一步一步采样高度图，直到找到交点**。

### 二、POM 的 Ray Marching

POM 在切线空间里沿视线方向分层步进：

```
视线从上往下（进入表面）
   ↓  step 0: depth=0,   height=0.95  → 还在表面上方，继续
   ↓  step 1: depth=0.1, height=0.85  → 还在上方
   ↓  step 2: depth=0.2, height=0.75  → 还在上方
   ↓  step 3: depth=0.3, height=0.22  → height < depth！进入砖缝了
   ↓  step 4: depth=0.4, height=0.20  → 更深
```

在 step 3（或 step 2→3 之间），视线与高度场相交。然后对 step 2 和 step 3 的纹理坐标做**插值**，得到平滑的偏移。

核心 GLSL 代码：

```glsl
// 动态层数：正视少（性能高）、斜视多（质量高）
float numLayers = mix(maxL, minL, abs(V_tangent.z));
float layerDepth = 1.0 / numLayers;
float currentDepth = 0.0;
vec2 deltaUV = (V_tangent.xy / abs(V_tangent.z)) * scale / numLayers;
vec2 currentUV = texCoord;

// 逐层步进
for (int i = 0; i < MAX_STEPS; i++) {
    if (float(i) >= numLayers) break;          // 达到动态层数上限
    currentDepth += layerDepth;
    currentUV -= deltaUV;
    float h = texture2D(uHeightSampler, currentUV).r;
    if (h > currentDepth) break;                // 高度 > 层深度 → 击中表面
}

// 与前一层插值，消除步进阶梯
vec2 prevUV = currentUV + deltaUV;
float prevH = texture2D(uHeightSampler, prevUV).r;
float prevD = currentDepth - layerDepth;
float w = (currentDepth - h) / (currentDepth - h - prevD + prevH + EPS);
vec2 finalUV = mix(currentUV, prevUV, w);
```

### 三、动态层数（Dynamic Layer Count）

`for` 循环硬限定 `MAX_STEPS`（本 Demo 为 40），但并非每帧都跑满：

```glsl
float numLayers = mix(maxL, minL, abs(V_tangent.z));
```

- **正视** `V_tangent.z ≈ 1` → `numLayers ≈ minL(8)` — 步进少，性能高
- **斜视** `V_tangent.z ≈ 0` → `numLayers ≈ maxL(40)` — 步进多，掠射角下质量好

这就是 POM 按视角**动态调整质量和性能**的关键。

### 四、层间插值

不插值时，步进的离散性会在纹理上留下明显的**阶梯状条带**。用前一层和当前层的纹理坐标做插值：

```
weight = (currentDepth - currentHeight) / (depthDiff + heightDiff)
finalUV = mix(currentUV, prevUV, weight)
```

插值后的纹理坐标是连续变化的，条带消失，画面平滑。

### 五、对比四种效果

|  | 左上 | 右上 | 左下 | 右下 |
|---|---|---|---|---|
| 漫反射 | ✓ | ✓ | ✓ | ✓ |
| 法线 | ✗ | ✓ | ✓ | ✓ |
| 视差 | ✗ | ✗ | ✓ | ✗ |
| POM | ✗ | ✗ | ✗ | ✓ |
| 深度准确性 | 无 | 仅光影 | 近似 | **最精确** |

> **关键测试**：把墙旋到掠射角（几乎平行视线），对比左下（视差）和右下（POM）的砖缝深度。POM 的砖缝在掠射角下依然被深深推入——因为它用 40 层步进找到了高度场的真实交点，而视差只有一层偏移。

### 六、性能与局限

- **POM 比视差贴图更耗性能**：每个片元最多 40 次纹理采样（vs 视差的 1 次），在移动设备上需注意 min/max 层数配置。
- **层数太少** → 条带化（banding）和阶梯纹理（stepping artifacts）
- **层数太多** → 帧率下降
- **完全侧看（>85°）** → 即使 80 层也可能不够，真正的极致质量需要用 Relief Mapping 或 cone step mapping
- POM 是 **3A 游戏中最常用的地面/墙壁细节技术**之一，在质量和性能之间取得了良好的平衡

### 小结

- POM 在视差贴图的基础上做**逐层 ray-march**，精确找到视线与高度场的交点
- **动态层数**根据视角调整——正视少（快）、斜视多（准）
- **层间插值**消除步进阶梯，画面平滑
- 在掠射角下远优于单次视差偏移，是现代游戏地面细节的事实标准