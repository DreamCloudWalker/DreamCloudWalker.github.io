## 基本光照 —— Phong 反射模型

这个 Demo 用一架战机模型来演示经典的 **Phong（Blinn-Phong）光照模型**。侧边栏有三个分量开关（环境光/漫射光/镜面光）和对应的 RGB 颜色滑块，关闭或调色可以直观地看到每种光照分量对最终画面的独立贡献。

### 一、Phong 反射模型是什么

Phong 模型把物体表面收到的光拆成**三个独立的分量**，各自算完再加起来。这三个分量不互相依赖，可以单独控制：

```
最终颜色 = (环境光 + 漫射光 + 镜面光) × 贴图颜色
```

每个分量对应一种物理上不同来源的光：

| 分量 | 来源 | 作用 |
|------|------|------|
| 环境光（Ambient） | 场景中间接反弹的漫射光——现实中不存在"纯黑"的阴影 | 给背光面填一个底色，避免阴影死黑 |
| 漫射光（Diffuse） | 光源直射到粗糙表面后被均匀散射到各个方向 | 决定物体"本来是什么颜色"，与观察角度无关 |
| 镜面光（Specular） | 光源在光滑表面上形成的集中反射 | 产生高光（highlight），体现表面光滑程度 |

### 二、环境光（Ambient）

环境光最简单——就是一个和法线方向、视线方向都无关的常数颜色：

```
ambient = uKa
```

> **试试看**：把漫射光和镜面光都关掉，只留环境光。战机变成一个均匀颜色的剪影，没有任何立体感——这就是"只有环境光"的世界。然后把环境光分别调成纯红、纯绿、纯蓝，画面就整片偏色。

### 三、漫射光（Diffuse）—— Lambert 余弦定律

漫射光假设光在粗糙表面被**均匀散射到所有方向**，因此在不同角度看到的亮度一样——只取决于光线与表面法线的夹角。

Lambert 定律：**光照强度 ∝ cos(θ)**，其中 θ 是入射光方向 L 和表面法线 N 的夹角。用点积表达：

```
N = normalize(vWorldNormal);
L = normalize(uLightPos - vWorldPos);

diffuse = uKd × max(dot(N, L), 0.0);
```

- `dot(N, L)` = cos(θ)。N·L < 0 时光源在表面背面，`max(…,0)` 把它钳到 0，背面全黑。
- 光线**斜射**时光弱（cos 小），**正射**时光最强（cos=1）。

> **试试看**：只开漫射光，关掉环境光和镜面光。你看到的是纯粹的"明暗过渡"——迎光面亮，背光面黑。这是最基础的光照形式。

### 四、镜面光（Specular）—— Blinn-Phong

镜面光模拟光源在光滑表面上的**反射高光**。原始 Phong 模型用"反射向量 R 和视线 V 的夹角"；Blinn-Phong 改进版用**半向量（half-vector）**代替反射，计算更快且效果更好：

```
V = normalize(uViewPos - vWorldPos);    // 从片元指向相机
H = normalize(L + V);                   // 半向量：光和视线的中间方向

specular = uKs × pow(max(dot(N, H), 0.0), uShininess);
```

**半向量 H 的几何直觉**：如果表面法线 N 正好等于半向量 H，说明"入射光正好反射进相机"，这个像素就是高光最亮的位置。N 偏离 H 越远，高光越暗。

**shininess（粗糙度/高光指数）**：`pow(…, shininess)` 是核心。shininess 越大，高光**越集中、越尖锐**（像镜面）；shininess 越小，高光**越散开、越柔和**（像磨砂）。

```
shininess =   1  →  pow(x, 1)  → 整个半球都是高光，极其发散
shininess =  32  →  pow(x, 32) → 典型塑胶/粗糙金属
shininess = 100  →  pow(x,100) → 镜面般尖锐的反光
```

> **试试看**：只开镜面光 + 漫射光，拖动"粗糙度"滑块从左边(0)到右边(100)。0 附近高光铺满整个迎光面；100 附近变成一个小小的亮点——这就是 shininess 的作用。

### 五、三个分量的独立开关

最右边的复选框独立控制每个分量是否参与最终颜色：

```glsl
vec3 ambient  = uKa.rgb * uEnableAmbient;
vec3 diffuse  = uKd.rgb * uEnableDiffuse * max(dot(N, L), 0.0);
vec3 specular = uKs.rgb * uEnableSpecular * pow(max(dot(N, H), 0.0), uShininess);

vec3 lit = (ambient + diffuse + specular) * texColor.rgb;
```

`uEnableAmbient/Diffuse/Specular` 是 1.0 或 0.0（对应勾选/取消），把对应分量**乘 0 直接关掉**。

### 六、完整流程（Vertex + Fragment）

本 Demo 的着色器代码脉络（简化版）：

**顶点着色器** —— 把顶点变换到世界空间，传给片元着色器：

```glsl
vec4 worldPos = uModelMatrix * aPosition;
gl_Position = uProjectionMatrix * uViewMatrix * worldPos;
vWorldPos = worldPos.xyz;
vWorldNormal = normalize(mat3(uMITMatrix) * aNormal);
vTexCoord = aUV;
```

**片元着色器** —— 在世界空间做 Blinn-Phong 光照：

```glsl
vec4 texColor = texture2D(uDiffuseSampler, vTexCoord);
vec3 N = normalize(vWorldNormal);
vec3 L = normalize(uLightPos - vWorldPos);
vec3 V = normalize(uViewPos - vWorldPos);
vec3 H = normalize(L + V);

vec3 ambient  = uKa.rgb * uEnableAmbient;
vec3 diffuse  = uKd.rgb * uEnableDiffuse * max(dot(N, L), 0.0);
vec3 specular = uKs.rgb * uEnableSpecular * pow(max(dot(N, H), 0.0), uShininess);

gl_FragColor = vec4((ambient + diffuse + specular) * texColor.rgb, texColor.a);
```

### 小结

- Phong 模型 = 环境光（打底）+ 漫射光（N·L 明暗）+ 镜面光（pow(N·H, shininess) 高光）；
- 三个分量**互不依赖**，可以单独控制颜色和开关；
- Blinn-Phong 用半向量 H 代替反射向量 R，计算更简单、效果相近；
- shininess 越小 → 高光越散（粗糙）；越大 → 高光越锐（光滑）。