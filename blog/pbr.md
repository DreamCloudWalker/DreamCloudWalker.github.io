## PBR 渲染（Physically Based Rendering）

这个 Demo 用一个球体孤立演示**基于物理的渲染**：通过拖动滑块实时调整**金属度（Metallic）**、**粗糙度（Roughness）**、**透明度（Alpha）**、**反照率（Albedo）**和**环境光强度**，直观感受这些参数如何决定材质外观。

### 一、为什么需要 PBR

传统的 Phong / Blinn-Phong 光照模型用一堆经验参数（`Ka`、`Kd`、`Ks`、`shininess`）拼凑高光，调出来的材质**换个光照环境就不对了**，而且不同美术调出来的金属、塑料没有统一标准。

PBR 的核心思想是：**用真实世界的物理量来描述材质**，让同一份材质在任意光照下都表现正确。它建立在三条物理原则上：

1. **微表面理论（Microfacet）**：宏观光滑的表面，在微观上是无数朝向各异的小镜面。粗糙度就是描述这些微表面朝向的"散乱程度"。
2. **能量守恒**：出射的光能不能超过入射的光能（高光越强，漫反射就越弱）。
3. **菲涅尔效应**：掠射角反射增强（参见[菲涅尔效果](#)一节）。

### 二、Cook-Torrance BRDF

PBR 的镜面反射使用 **Cook-Torrance** 双向反射分布函数（BRDF）：

```
            D(h) · G(l,v) · F(v,h)
f_specular = ─────────────────────────
              4 · (N·V) · (N·L)
```

最终某个片元的出射光：

```
Lo = (kD · albedo / π  +  f_specular) · radiance · (N·L)
```

其中三个核心函数：

| 项 | 名称 | 作用 |
|----|------|------|
| **D** | 法线分布函数（NDF） | 有多少比例的微表面朝向恰好能把光反射到相机。决定高光的**大小和锐利度**，由粗糙度控制 |
| **G** | 几何遮蔽函数 | 微表面之间互相遮挡、自阴影造成的能量损失。粗糙表面遮蔽更严重 |
| **F** | 菲涅尔项 | 掠射角反射增强，决定反射光的**强度和颜色** |

#### 1. D —— GGX 法线分布

本 Demo 使用业界标准的 **GGX / Trowbridge-Reitz** 分布：

```glsl
float DistributionGGX(vec3 N, vec3 H, float roughness) {
    float a = roughness * roughness;
    float a2 = a * a;
    float NoH = max(dot(N, H), 0.0);
    float denom = NoH * NoH * (a2 - 1.0) + 1.0;
    return a2 / (PI * denom * denom);
}
```

注意这里把 roughness **平方**后再用（`a = roughness²`）——这是 Disney 提出的经验改进，让滑块的感知更线性。

#### 2. G —— Smith 几何遮蔽

```glsl
float GeometrySchlickGGX(float NoX, float roughness) {
    float r = roughness + 1.0;
    float k = (r * r) / 8.0;          // 直接光照用 (r+1)²/8
    return NoX / (NoX * (1.0 - k) + k);
}
float GeometrySmith(float NoV, float NoL, float roughness) {
    return GeometrySchlickGGX(NoV, roughness) * GeometrySchlickGGX(NoL, roughness);
}
```

Smith 法把遮蔽拆成两部分：视线方向（`NoV`）和光线方向（`NoL`）各算一次再相乘。

#### 3. F —— Schlick 菲涅尔

```glsl
vec3 fresnelSchlick(float cosTheta, vec3 F0) {
    return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
}
```

### 三、金属度 / 粗糙度工作流（Metallic-Roughness）

这是 glTF、Unreal、Unity 等主流引擎采用的标准工作流。它的精妙之处在于：用两个标量参数 + 一个颜色，就统一描述了金属和非金属。

#### 金属度 Metallic

金属和电介质（非金属：塑料、木头、皮肤、陶瓷）的物理差异，PBR 用 **F0（基础反射率）** 和 **漫反射** 两点来区分：

```glsl
// 电介质 F0 固定约 0.04（4% 反射）；金属用 albedo 作为 F0（有色反射）
vec3 F0 = mix(vec3(0.04), uAlbedo, uMetallic);

// 金属没有漫反射（吸收所有折射进表面的光）
vec3 kS = F;                                    // 镜面比例
vec3 kD = (vec3(1.0) - kS) * (1.0 - uMetallic); // 漫反射比例，金属趋于 0
```

| | 电介质（Metallic=0） | 金属（Metallic=1） |
|--|--|--|
| 漫反射 | 有，颜色来自 albedo | **无** |
| F0（高光） | ≈0.04，**白色**高光 | 高，**带颜色**（金=黄、铜=红） |
| 直观 | 塑料、陶瓷、皮肤 | 钢、金、铝 |

> 把金属度从 0 拖到 1，会看到球体漫反射逐渐消失，高光从白色变成 albedo 的颜色——这正是金属的特征。

#### 粗糙度 Roughness

粗糙度控制微表面的散乱程度，直接喂给 D 和 G 函数：

- **Roughness → 0**：微表面高度一致 → 高光集中成一个**锐利的小亮点**（像抛光金属、镜子）；
- **Roughness → 1**：微表面朝向杂乱 → 高光**散开、模糊**，整体变哑光（像磨砂、橡胶）。

### 四、透明度 Alpha 与混合

把 Alpha 滑块拖到 1 以下时，Demo 会启用 alpha 混合：

```glsl
gl_FragColor = vec4(color, uAlpha);
```

```javascript
if (alpha < 0.999) {
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);  // 标准 alpha 混合
    gl.depthMask(false);   // 关闭深度写入，避免半透明球体自遮挡
}
```

这里有个常见陷阱：半透明物体绘制时如果照常写深度缓冲，球体的近半球会挡住远半球的混合，出现错误的"硬边"。解决办法是绘制半透明物体时 **关闭深度写入**（`depthMask(false)`），但保留深度测试。更复杂的场景还需要按距离排序（参见[混合与透明排序](#)）。

### 五、色调映射与 Gamma 校正

PBR 在**线性空间**计算光照，结果是 HDR（高动态范围，可能 > 1）。直接输出会过曝，所以最后两步必不可少：

```glsl
color = color / (color + vec3(1.0));   // Reinhard 色调映射：HDR → [0,1]
color = pow(color, vec3(1.0 / 2.2));   // Gamma 校正：线性 → sRGB 显示空间
```

### 六、本 Demo 的简化

为了聚焦参数本身，本 Demo 做了简化，与真实引擎的差异值得了解：

- **环境光用常量近似**（`uAmbient * albedo`），而非真正的 **IBL**（基于图像的光照）。完整 PBR 的环境光来自预卷积的环境立方体贴图 + BRDF LUT——本工程的 `shader/pbr_lighting.fs` 与 `pbrModel.html` 演示了带 IBL 的完整版本。
- **单个方向光**，没有阴影。
- 参数用**滑块统一控制**整个球体，真实材质则用 albedo / metallic / roughness **贴图**逐像素提供（参见 `pbr.js` 中的多贴图采样）。

### 七、动手试试

1. **造一块抛光金属**：Metallic=1，Roughness=0.05 → 锐利的小高光 + 有色反射；
2. **造一块磨砂塑料**：Metallic=0，Roughness=0.8 → 柔和的漫反射，几乎无高光；
3. **造一颗宝石**：Alpha=0.5，Metallic=0，Roughness=0.1 → 半透明且高光清晰；
4. 调整 **Albedo** 的 RGB，对比它在金属（影响高光颜色）和非金属（影响漫反射颜色）下的不同作用。
