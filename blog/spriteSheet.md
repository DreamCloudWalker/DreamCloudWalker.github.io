## 精灵图集（Sprite Sheet）

这个 Demo 在主窗口中央放了一块正对相机的四边形，上面循环播放一段**爆炸动画**。但其实整段动画只用了**一张图片** —— 下面这张 `explosion.png`：

<img src="./texture/explosion.png" alt="explosion_sprite_sheet" style="zoom:60%;" />

这张图把爆炸的每一个瞬间画成一格小图，按 **8 列 × 5 行** 排成网格，一共 **40 帧**。把这些小图按顺序快速翻页播放，就得到了连续的爆炸动画。这种"把多帧打包进一张大图"的做法就叫**精灵图集（Sprite Sheet）**，也叫**序列帧 / Texture Atlas**。

### 一、为什么用精灵图集

如果 40 帧分成 40 张独立图片，会带来两个问题：

- **IO 开销大**：要发起 40 次网络请求 / 文件读取；
- **切换纹理代价高**：渲染时每帧都要 `bindTexture` 切换不同的纹理对象，频繁切换会打断 GPU 的批处理。

精灵图集把所有帧拼进**一张纹理**，只需加载一次、绑定一次。播放动画时纹理对象**始终不变**，变化的只是采样的 **UV 子区域** —— 这非常廉价。游戏里的爆炸、火焰、角色行走、UI 图标等几乎都用这种方式。

### 二、帧 → UV 子矩形

纹理坐标 UV 的范围是 `[0,1] × [0,1]`，覆盖整张图。要只采样其中第 `i` 帧那一格，需要把基准 UV 缩放并平移到对应的子矩形。

设列数 `COLS = 8`，行数 `ROWS = 5`，则单帧在 UV 空间里的尺寸为：

```
uvScale = (1/COLS, 1/ROWS) = (0.125, 0.2)
```

第 `i` 帧所在的列、行（图集从左到右、从上到下编号）：

```
col = i % COLS
row = floor(i / COLS)
```

它的左上角 UV 偏移：

```
uvOffset = (col / COLS, row / ROWS)
```

片元着色器里，把四边形自带的基准 UV（`vTexCoord ∈ [0,1]`）映射到这一格：

```glsl
uniform vec2 uUvOffset;   // 当前帧左上角 UV
uniform vec2 uUvScale;    // 单帧 UV 尺寸 (1/COLS, 1/ROWS)

void main() {
    vec2 uv = uUvOffset + vTexCoord * uUvScale;
    gl_FragColor = texture2D(uTexSampler, uv);
}
```

播放动画时，**顶点、UV 缓冲、纹理全都不用动**，每帧只更新 `uUvOffset` 这一个 uniform 即可。

> 注意采样方向：本 Demo 加载图集时**关闭了 Y 翻转**（`UNPACK_FLIP_Y_WEBGL = false`），让 UV 的 `v=0` 对应图片**顶部**，这样 `row=0` 就是图集第一行，帧序和肉眼看到的一致。环绕模式用 `CLAMP_TO_EDGE`，避免相邻帧在边缘互相渗色。

### 三、用时间驱动帧率

动画的"快慢"应该由**真实时间**决定，而不是绑死渲染帧率（不同设备 FPS 不同）。做法是累加每帧的时间增量 `dt`，每攒够 `1/fps` 秒就前进一帧：

```js
accum += dt;                  // dt 为两帧之间的真实秒数
var spf = 1.0 / fps;          // 每帧应停留的秒数
while (accum >= spf) {
    accum -= spf;
    curFrame = (curFrame + 1) % FRAME_COUNT;   // 循环播放
}
```

这样无论渲染快慢，爆炸都按设定的 fps 播放；`% FRAME_COUNT` 让它播完一轮后自动循环。

> 拖动左侧「帧率」滑块可以加快 / 放慢爆炸；取消「播放动画」后，可以用「手动选帧」滑块逐帧检视图集里的每一格。

### 四、透明混合

爆炸的背景是透明的（图集是带 alpha 通道的 PNG）。绘制时开启标准 alpha 混合，并关闭深度写入，让贴片自然叠加在背景之上：

```js
gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
gl.depthMask(false);
```

### 小结

- 精灵图集把**多帧打包进一张纹理**，只加载、绑定一次，省 IO、免纹理切换；
- 播放动画 = 每帧只改 **UV 子矩形偏移**（`col/COLS`, `row/ROWS`），其余资源不变；
- 用**真实时间**累加驱动帧推进，使动画速度与渲染帧率解耦；
- 带 alpha 的图集配合 **alpha 混合**叠加到场景上。

右侧上帝视角可以从侧面看到这其实只是空间中的一块薄薄的贴片。
