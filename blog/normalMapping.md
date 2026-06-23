## 法线贴图（Normal Mapping）

这个 Demo 并排展示两堵砖墙——**左墙只用漫反射贴图**（砖缝是"画上去的"），**右墙叠加了法线贴图**（砖缝有真实的凹凸感）。两墙共用同一个方向光源，拖动左窗口旋转墙面时，右墙砖缝处的光影会随角度变化而动态起伏，左墙则始终平坦。

### 一、问题：面数 vs 细节

3D 渲染永远在"效果"和"性能"之间权衡。假设要做一面砖墙：

- **方案 A**：把每块砖的凹凸造型做进几何体（几千甚至几万个三角面）→ 效果完美但性能崩溃
- **方案 B**：用 2 个三角面的平面 + 法线贴图 → 性能零损耗，效果接近方案 A

法线贴图的本质是：**在不增加几何面的前提下，通过扰动表面法线来伪造凹凸和细节**。

### 二、法线贴图是什么

法线贴图是一张 RGB 图片，每个像素存储了一个**法线向量**：

```
R 通道 = 法线 X 分量  ([0,1] → [-1,1])
G 通道 = 法线 Y 分量  ([0,1] → [-1,1])
B 通道 = 法线 Z 分量  ([0.5,1] → [0,1]，法线通常朝外)
```

> 法线贴图整体呈淡蓝色，因为大部分像素 RGB ≈ (0.5, 0.5, 1.0)，解码后为 (0, 0, 1) —— "不扰动，保持原始法线方向"。砖缝处 R/G 通道偏移，解码后法线被"弯折"向侧面，在光照下产生亮暗变化。

解码公式：
```glsl
vec3 tangentNormal = texture2D(uNormalSampler, vTexCoord).rgb * 2.0 - 1.0;
```

### 三、切线空间与 TBN 矩阵

法线贴图存储的向量在**切线空间（Tangent Space）**里：

- X = 切线(Tangent) —— 沿贴图 u 方向
- Y = 副切线(Bitangent) —— 沿贴图 v 方向
- Z = 法线(Normal) —— 垂直表面

要把切线空间法线转到世界空间做光照，需要 **TBN 矩阵**。本 Demo 中墙面朝 +Z、切线沿 X，顶点着色器构建 TBN：

```glsl
// 顶点着色器 —— TBN 构建
vec3 T = normalize(mat3(uModelMatrix) * aTangent);
vec3 N = normalize(mat3(uModelMatrix) * aNormal);
T = normalize(T - dot(T, N) * N);   // Gram-Schmidt 正交化，保证 T ⊥ N
vec3 B = cross(N, T);               // 副切线 = N × T
vTBN = mat3(T, B, N);               // 三列 = 切线→世界 变换矩阵
```

片段着色器把切线空间法线通过 TBN 转到世界空间：
```glsl
vec3 perturbedNormal = normalize(vTBN * tangentNormal);
vec3 N = normalize(mix(vWorldNormal, perturbedNormal, uEnableNormal));
```

`uEnableNormal` 控制是否启用法线贴图 —— 关闭时 `mix` 退化为纯几何法线，两墙显示相同。

### 四、方向光 vs 点光源

本 Demo 使用**方向光（directional light）**，两面墙共享完全相同的 `L` 向量：

```glsl
vec3 L = normalize(uLightDir);   // 方向光 —— 所有片元用同一方向
```

如果使用点光源 `L = normalize(lightPos - worldPos)`，两面墙位置不同（x 偏移 ±1.5），指向光源的向量就不同，旋转时会出现左右明暗不一致的现象。方向光（模拟太阳/远距离平行光）避免了这个问题，同时法线贴图的凹凸感也更纯粹——每个砖缝的明暗完全取决于被扰动的法线方向。

### 五、完整着色器

**顶点着色器**：
```glsl
attribute vec4 aPosition;
attribute vec3 aNormal;
attribute vec3 aTangent;
attribute vec2 aTexCoord;
varying vec3 vWorldPos, vWorldNormal;
varying mat3 vTBN;
varying vec2 vTexCoord;

void main() {
    vec4 worldPos = uModelMatrix * aPosition;
    gl_Position = uProjectionMatrix * uViewMatrix * worldPos;
    vWorldPos = worldPos.xyz;
    vWorldNormal = normalize(mat3(uModelMatrix) * aNormal);

    vec3 T = normalize(mat3(uModelMatrix) * aTangent);
    vec3 N = vWorldNormal;
    T = normalize(T - dot(T, N) * N);
    vec3 B = cross(N, T);
    vTBN = mat3(T, B, N);
    vTexCoord = aTexCoord;
}
```

**片段着色器**（光照计算部分）：
```glsl
vec4 diffColor = texture2D(uDiffuseSampler, vTexCoord);
vec3 tangentNormal = texture2D(uNormalSampler, vTexCoord).rgb * 2.0 - 1.0;
vec3 perturbedNormal = normalize(vTBN * tangentNormal);
vec3 N = normalize(mix(vWorldNormal, perturbedNormal, uEnableNormal));

vec3 L = normalize(uLightDir);          // 方向光
vec3 V = normalize(uViewPos - vWorldPos);
vec3 H = normalize(L + V);

float diff = max(dot(N, L), 0.0);
float spec = pow(max(dot(N, H), 0.0), uShininess);

gl_FragColor = vec4(
    diffColor.rgb * uAmbientStrength
  + diffColor.rgb * diff * uDiffuseStrength
  + vec3(1.0) * spec * uSpecularStrength,
  1.0);
```

### 六、对比：本 Demo 的左右墙

| | 左墙 | 右墙 |
|---|---|---|
| 漫反射贴图 | ✓ bricks.jpg | ✓ bricks.jpg |
| 法线贴图 | ✗ | ✓ bricks_normal.png |
| 法线来源 | 几何法线 `vWorldNormal` | TBN × 采样的 `tangentNormal` |
| 效果 | 砖缝平坦，"贴纸"感 | 砖缝凹凸，有立体阴影 |

> **试试看**：取消勾选「启用法线贴图」→ 两墙同时退化为纯漫反射，看起来一模一样。勾回 → 右墙立刻出现立体感。拖动左窗口旋转墙面，观察砖缝光影的动态变化——只有法线贴图一侧的砖缝会随角度改变明暗。

### 七、性能代价

法线贴图的成本极小：
- 多一张 2D 贴图（显存）
- 片元着色器中多一次 `texture2D` 采样 + 几次向量运算
- **几何体面数完全不变**

对于一面砖墙，几何建模需数千个三角面；法线贴图只需 **2 个三角面**加一张贴图。这就是现代游戏中几乎所有"有细节"的表面都在用法线贴图的原因。

### 小结

- 法线贴图用 RGB 存方向信息，在不增加几何面的前提下伪造凹凸；
- 法线数据在**切线空间**，通过 **TBN 矩阵**（Gram-Schmidt 正交化）转到世界空间；
- **方向光**确保两墙光照一致，旋转时只体现法线扰动的差异；
- 效果取决于光源/视角关系 —— 拖拽旋转左窗口观察砖缝光影的动态变化；
- 几何成本接近零，是现代游戏渲染的基石之一。