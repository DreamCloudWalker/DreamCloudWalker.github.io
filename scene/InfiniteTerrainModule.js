var App = App || {};

// ═══════════════════════════════════════════════════════════════════════
// 无限地形（程序化沙漠戈壁）+ 3×3 chunk 流式加载 + GLB 石头/植被道具
// 移植自 three.js 工程 dream3Body（src/world/terrain.mjs + core/math.mjs），
// 适配为原生 WebGL：
//   - 噪声/高度场/分块/道具放置逻辑为纯 JS，直接移植；
//   - 地形网格、道具几何体改为原生 WebGL VBO（不依赖 three.js 渲染器）；
//   - GLB 道具仍用 THREE.GLTFLoader 仅做"解析"，随后把 geometry.attributes
//     与内嵌贴图抽取成原生 WebGL buffer/texture（沿用本工程 OBJ 的既有做法）。
// 该模块只负责"数据 + 基础渲染"，供后续 FBO 阴影 / LOD / 场景管理 等 Demo 驱动。
// ═══════════════════════════════════════════════════════════════════════
App.InfiniteTerrain = (function () {
    // ── 配置（对齐参考工程）──
    var CHUNK = 200;          // 单块世界尺寸
    var FEATURE = 200;        // 噪声特征尺度
    var SEGMENTS = 128;       // 每块每边分段数（与参考工程一致，相机离地形较近需要细节）
    var SEED = 20240602;

    var ROCK_FILES = ['rock_formation', 'rock_large', 'rock_large2', 'rock_b'];
    var PLANT_FILES = {
        cactus:   ['cactus_a', 'cactus_b'],
        deadtree: ['deadtree_a', 'deadtree_b', 'deadtree_c'],
        bush:     ['bush_a', 'bush_b'],
        grass:    ['grass_a', 'grass_b', 'grass_c'],
    };
    var PLANT_TARGET_H = { cactus: 5.0, deadtree: 5.0, bush: 1.5, grass: 0.8 };

    // ═══ Simplex Noise（移植自 core/math.mjs）═══
    function SimplexNoise(seed) {
        this.p = new Uint8Array(256);
        var rng = this._mulberry32(seed || 42);
        for (var i = 0; i < 256; i++) this.p[i] = i;
        for (var i2 = 255; i2 > 0; i2--) {
            var j = Math.floor(rng() * (i2 + 1));
            var tmp = this.p[i2]; this.p[i2] = this.p[j]; this.p[j] = tmp;
        }
        this.perm = new Uint8Array(512);
        for (var k = 0; k < 512; k++) this.perm[k] = this.p[k & 255];
        this.grad3 = [
            [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
            [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
            [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1],
        ];
    }
    SimplexNoise.prototype._mulberry32 = function (a) {
        return function () {
            a |= 0; a = a + 0x6D2B79F5 | 0;
            var t = Math.imul(a ^ a >>> 15, 1 | a);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    };
    SimplexNoise.prototype._dot2 = function (g, x, y) { return g[0] * x + g[1] * y; };
    SimplexNoise.prototype.noise2D = function (x, y) {
        var F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
        var s = (x + y) * F2, i = Math.floor(x + s), j = Math.floor(y + s);
        var t = (i + j) * G2, X0 = i - t, Y0 = j - t, x0 = x - X0, y0 = y - Y0;
        var i1, j1;
        if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
        var x1 = x0 - i1 + G2, y1 = y0 - j1 + G2, x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
        var ii = i & 255, jj = j & 255;
        var n0 = 0, n1 = 0, n2 = 0;
        var t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 >= 0) { t0 *= t0; var gi0 = this.perm[ii + this.perm[jj]] % 12; n0 = t0 * t0 * this._dot2(this.grad3[gi0], x0, y0); }
        var t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 >= 0) { t1 *= t1; var gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12; n1 = t1 * t1 * this._dot2(this.grad3[gi1], x1, y1); }
        var t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 >= 0) { t2 *= t2; var gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12; n2 = t2 * t2 * this._dot2(this.grad3[gi2], x2, y2); }
        return 70 * (n0 + n1 + n2);
    };
    SimplexNoise.prototype.fbm = function (x, y, octaves, lacunarity, gain) {
        var sum = 0, amp = 1, freq = 1, maxAmp = 0;
        for (var i = 0; i < octaves; i++) {
            sum += this.noise2D(x * freq, y * freq) * amp;
            maxAmp += amp; amp *= gain; freq *= lacunarity;
        }
        return sum / maxAmp;
    };

    var _noise = new SimplexNoise(SEED);

    // ═══ 高度场（移植自 world/terrain.mjs，去掉湖泊雕刻）═══
    // 世界坐标高度纯函数：任意 (wx,wz) 唯一确定，跨块连续无缝。
    function baseTerrainHeight(wx, wz) {
        var nx = wx / FEATURE, nz = wz / FEATURE;
        var baseH = _noise.fbm(nx * 2.5, nz * 2.5, 4, 2.0, 0.5) * 4.0;
        var duneH = _noise.fbm(nx * 6 + 100, nz * 6 + 100, 3, 2.0, 0.5) * 1.5;
        var rippleH = _noise.fbm(nx * 15, nz * 15, 2, 2.0, 0.4) * 0.3;
        var rockNoise = _noise.fbm(nx * 10 + 50, nz * 10 + 50, 3, 2.2, 0.5);
        var h = baseH + duneH + rippleH;
        if (rockNoise > 0.35) h += (rockNoise - 0.35) * 3.0;
        return h;
    }
    function terrainHeightAt(wx, wz) { return baseTerrainHeight(wx, wz); }

    // ═══ 地形块网格（原生 WebGL：索引网格 + 顶点色 + 法线）═══
    // 等价于参考工程的 buildChunkTerrain：一块 CHUNK×CHUNK 的细分平面，
    // 顶点 Y 由 terrainHeightAt 决定，顶点色按高度/岩石噪声分层着色。
    function _buildChunkTerrainBuffer(gl, cx, cz, segments) {
        var N = segments || SEGMENTS;
        var step = CHUNK / N;
        var ox = cx * CHUNK, oz = cz * CHUNK;
        var vCount = (N + 1) * (N + 1);
        var positions = new Float32Array(vCount * 3);
        var normals = new Float32Array(vCount * 3);
        var colors = new Float32Array(vCount * 3);
        var heights = new Float32Array(vCount);

        // 法线用世界坐标的高度场梯度解析求出（中心差分），而不是从本块三角形累加。
        // 因为 terrainHeightAt 是连续的世界函数，块边界顶点两侧算出的法线完全一致，
        // 不会出现"各块只看自己三角形"造成的边界法线突变 → 拼接处不再有光照缝。
        // eps 取一个固定世界尺度（与块分辨率无关），保证相邻块边界法线逐字节相同。
        var eps = 0.5;

        // 顶点：以块中心为原点，铺 [-CHUNK/2, +CHUNK/2]
        var idx = 0;
        for (var iz = 0; iz <= N; iz++) {
            for (var ix = 0; ix <= N; ix++) {
                var lx = -CHUNK / 2 + ix * step;
                var lz = -CHUNK / 2 + iz * step;
                var wx = lx + ox, wz = lz + oz;
                var h = terrainHeightAt(wx, wz);
                positions[idx * 3] = lx;
                positions[idx * 3 + 1] = h;
                positions[idx * 3 + 2] = lz;
                heights[idx] = h;

                // 解析法线：N = normalize(-dH/dx, 1, -dH/dz)，只依赖世界坐标
                var hL = terrainHeightAt(wx - eps, wz);
                var hR = terrainHeightAt(wx + eps, wz);
                var hD = terrainHeightAt(wx, wz - eps);
                var hU = terrainHeightAt(wx, wz + eps);
                var nx = -(hR - hL) / (2 * eps);
                var nz = -(hU - hD) / (2 * eps);
                var ny = 1.0;
                var nlen = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
                normals[idx * 3]     = nx / nlen;
                normals[idx * 3 + 1] = ny / nlen;
                normals[idx * 3 + 2] = nz / nlen;

                var rockNoise = _noise.fbm((wx / FEATURE) * 10 + 50, (wz / FEATURE) * 10 + 50, 3, 2.2, 0.5);
                var r, g, b;
                if (h < -1) { r = 0.45; g = 0.32; b = 0.22; }
                else if (h < 1) { r = 0.82; g = 0.70; b = 0.48; }
                else if (h < 3) { r = 0.90; g = 0.80; b = 0.55; }
                else if (rockNoise > 0.3) {
                    var t = Math.min(1, (rockNoise - 0.3) * 4);
                    r = 0.55 + t * 0.1; g = 0.45 + t * 0.1; b = 0.38 + t * 0.08;
                } else { r = 0.92; g = 0.84; b = 0.62; }
                var cn = _noise.noise2D((wx / FEATURE) * 30, (wz / FEATURE) * 30) * 0.05;
                colors[idx * 3] = Math.max(0, Math.min(1, r + cn));
                colors[idx * 3 + 1] = Math.max(0, Math.min(1, g + cn));
                colors[idx * 3 + 2] = Math.max(0, Math.min(1, b + cn));
                idx++;
            }
        }

        // 索引：每个网格单元两个三角形
        var indices = new Uint16Array(N * N * 6);
        var ii = 0;
        for (var z2 = 0; z2 < N; z2++) {
            for (var x2 = 0; x2 < N; x2++) {
                var a = z2 * (N + 1) + x2;
                var bb = a + 1;
                var c = a + (N + 1);
                var d = c + 1;
                indices[ii++] = a; indices[ii++] = c; indices[ii++] = bb;
                indices[ii++] = bb; indices[ii++] = c; indices[ii++] = d;
            }
        }

        // 法线已在上面用世界高度场梯度解析求出（拼接无缝），此处不再从三角形累加。

        // 线框索引：每个网格单元画 3 条边（共享边只画一次，避免重复）：
        // 左边、上边、对角线 —— 足以勾出三角网格。
        var wire = [];
        for (var wz2 = 0; wz2 < N; wz2++) {
            for (var wx2 = 0; wx2 < N; wx2++) {
                var p = wz2 * (N + 1) + wx2;
                var pr = p + 1;            // 右
                var pd = p + (N + 1);      // 下
                wire.push(p, pr);          // 水平边
                wire.push(p, pd);          // 垂直边
                wire.push(pr, pd);         // 对角线
            }
        }
        // 补最后一行/列的外边界
        for (var e = 0; e < N; e++) {
            wire.push(N * (N + 1) + e, N * (N + 1) + e + 1);          // 最后一行水平
            wire.push(e * (N + 1) + N, (e + 1) * (N + 1) + N);        // 最后一列垂直
        }
        var wireArr = new Uint16Array(wire);

        var posBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
        var nrmBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, nrmBuf);
        gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
        var colBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, colBuf);
        gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
        var idxBuf = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
        var wireBuf = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, wireBuf);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, wireArr, gl.STATIC_DRAW);

        return {
            position: posBuf, normal: nrmBuf, color: colBuf, index: idxBuf,
            indexCount: indices.length,
            wire: wireBuf, wireCount: wireArr.length,
            triCount: indices.length / 3,
            ox: ox, oz: oz,
        };
    }

    // ═══ GLB 道具原型加载（THREE.GLTFLoader 仅解析，抽取为原生 WebGL）═══
    // 沿用本工程 OBJ 的做法：用 three.js 解析模型，把 geometry.attributes 与内嵌
    // 贴图抽取成原生 buffer/texture，渲染交给本模块自己的 shader（不用 three 渲染器）。
    var _rockProtos = null;        // [{primitives:[...], radius, minY}]
    var _plantProtos = {};         // { cat: [{primitives, h, minY}] }

    // 把一个 three.js 解析出的 Object3D 抽取为原生 WebGL primitive 列表 + 包围盒信息
    function _extractProto(gl, object3d) {
        var primitives = [];
        var box = new THREE.Box3().setFromObject(object3d);
        var size = new THREE.Vector3(); box.getSize(size);
        object3d.updateMatrixWorld(true);

        object3d.traverse(function (o) {
            if (!o.isMesh || !o.geometry) return;
            var geo = o.geometry;
            var posAttr = geo.attributes.position;
            var nrmAttr = geo.attributes.normal;
            var uvAttr = geo.attributes.uv;
            if (!posAttr) return;

            // 把局部顶点烘焙到原型根坐标（应用 mesh 自身的世界矩阵）
            o.updateWorldMatrix(true, false);
            var mw = o.matrixWorld.elements;
            var n = posAttr.count;
            var positions = new Float32Array(n * 3);
            var normals = new Float32Array(n * 3);
            for (var i = 0; i < n; i++) {
                var px = posAttr.getX(i), py = posAttr.getY(i), pz = posAttr.getZ(i);
                positions[i*3]   = mw[0]*px + mw[4]*py + mw[8]*pz + mw[12];
                positions[i*3+1] = mw[1]*px + mw[5]*py + mw[9]*pz + mw[13];
                positions[i*3+2] = mw[2]*px + mw[6]*py + mw[10]*pz + mw[14];
                if (nrmAttr) {
                    var nxv = nrmAttr.getX(i), nyv = nrmAttr.getY(i), nzv = nrmAttr.getZ(i);
                    // 法线只用旋转部分（这些 GLB 无非均匀缩放，近似可用 mw 上 3x3）
                    var rx = mw[0]*nxv + mw[4]*nyv + mw[8]*nzv;
                    var ry = mw[1]*nxv + mw[5]*nyv + mw[9]*nzv;
                    var rz = mw[2]*nxv + mw[6]*nyv + mw[10]*nzv;
                    var rl = Math.sqrt(rx*rx+ry*ry+rz*rz) || 1;
                    normals[i*3] = rx/rl; normals[i*3+1] = ry/rl; normals[i*3+2] = rz/rl;
                } else { normals[i*3+1] = 1; }
            }
            var uvs = new Float32Array(n * 2);
            if (uvAttr) for (var u = 0; u < n; u++) { uvs[u*2] = uvAttr.getX(u); uvs[u*2+1] = uvAttr.getY(u); }

            // 索引
            var indexArr = geo.index ? geo.index.array : null;
            var idxBuf = null, drawCnt;
            if (indexArr) {
                idxBuf = gl.createBuffer();
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
                var idata = (indexArr instanceof Uint32Array) ? new Uint16Array(indexArr) : indexArr;
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idata, gl.STATIC_DRAW);
                drawCnt = indexArr.length;
            } else { drawCnt = n; }

            var posBuf = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, posBuf); gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
            var nrmBuf = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, nrmBuf); gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
            var uvBuf = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf); gl.bufferData(gl.ARRAY_BUFFER, uvs, gl.STATIC_DRAW);

            // 抽取内嵌贴图（baseColorTexture）为原生 GL 纹理
            var glTex = _extractTexture(gl, o.material);

            primitives.push({
                position: posBuf, normal: nrmBuf, uv: uvBuf, index: idxBuf,
                drawCnt: drawCnt, texture: glTex,
            });
        });

        var radius = Math.max(size.x, size.z) / 2 || 1;
        return { primitives: primitives, radius: radius, h: size.y || 1, minY: box.min.y };
    }

    // 从 three.js 材质里取出 baseColor map 的 image，上传为原生 GL 纹理
    function _extractTexture(gl, material) {
        var mat = Array.isArray(material) ? material[0] : material;
        var img = mat && mat.map && mat.map.image;
        var tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        if (img) {
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            // 还原全局 pixelStorei 默认，避免污染其它异步纹理上传
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        } else {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                new Uint8Array([150, 130, 100, 255]));
        }
        return tex;
    }

    function _loadRockModels(gl, onProgress) {
        var loader = new THREE.GLTFLoader();
        var base = './model/terrain/rocks/';
        _rockProtos = [];
        var pending = ROCK_FILES.length;
        ROCK_FILES.forEach(function (name) {
            loader.load(base + name + '.glb', function (g) {
                _rockProtos.push(_extractProto(gl, g.scene));
                if (--pending === 0 && onProgress) onProgress();
            }, undefined, function () { if (--pending === 0 && onProgress) onProgress(); });
        });
    }

    function _loadPlantModels(gl, onProgress) {
        var loader = new THREE.GLTFLoader();
        var base = './model/terrain/plants/';
        var cats = Object.keys(PLANT_FILES);
        var pending = 0;
        cats.forEach(function (c) { pending += PLANT_FILES[c].length; });
        cats.forEach(function (cat) {
            _plantProtos[cat] = [];
            PLANT_FILES[cat].forEach(function (name) {
                loader.load(base + name + '.glb', function (g) {
                    _plantProtos[cat].push(_extractProto(gl, g.scene));
                    if (--pending === 0 && onProgress) onProgress();
                }, undefined, function () { if (--pending === 0 && onProgress) onProgress(); });
            });
        });
    }

    // ═══ 道具确定性放置（移植自 world/terrain.mjs buildProps，去湖泊）═══
    // 每块用 (cx,cz) 派生固定种子，保证同一块每次生成完全一致（无湖泊判定）。
    // 道具记录为 { proto, x, y, z, scale, rotY } 实例，渲染时按实例画原型 primitives。
    function _buildProps(cx, cz) {
        var ox = cx * CHUNK, oz = cz * CHUNK;
        var seed = ((cx * 73856093) ^ (cz * 19349663)) >>> 0;
        var s = seed || 1;
        var rng = function () {
            s |= 0; s = s + 0x6D2B79F5 | 0;
            var t = Math.imul(s ^ s >>> 15, 1 | s);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
        var rocks = [];     // 小石头 + 大石头实例
        var plants = [];
        var colliders = []; // 大石头碰撞圆（供后续场景管理 Demo 用）

        // 小石头：复用 rockProtos，缩小散布
        for (var i = 0; i < 120; i++) {
            var x = ox + (rng() - 0.5) * CHUNK * 0.95;
            var z = oz + (rng() - 0.5) * CHUNK * 0.95;
            var h = terrainHeightAt(x, z);
            if (h < -2) continue;
            if (!_rockProtos || !_rockProtos.length) continue;
            var p = _rockProtos[Math.floor(rng() * _rockProtos.length) % _rockProtos.length];
            var scale = 0.15 + rng() * 0.35;
            rocks.push({ proto: p, x: x, y: h - p.minY * scale, z: z, scale: scale, rotY: rng() * Math.PI * 2 });
        }
        // 大石头（假山）
        var boulderCount = 2 + Math.floor(rng() * 3);
        for (var b = 0; b < boulderCount; b++) {
            var bx = ox + (rng() - 0.5) * CHUNK * 0.85;
            var bz = oz + (rng() - 0.5) * CHUNK * 0.85;
            var protoIdx = Math.floor(rng() * ROCK_FILES.length);
            var targetR = 2.5 + rng() * 4.0;
            var rotY = rng() * Math.PI * 2;
            // 多点采样取最低，避免悬空
            var bh = Infinity;
            for (var sx = -1; sx <= 1; sx++) for (var sz = -1; sz <= 1; sz++) {
                var sh = terrainHeightAt(bx + sx * targetR * 0.4, bz + sz * targetR * 0.4);
                if (sh < bh) bh = sh;
            }
            if (bh < -1) continue;
            colliders.push({ x: bx, z: bz, r: targetR * 0.7 });
            if (!_rockProtos || !_rockProtos.length) continue;
            var bp = _rockProtos[protoIdx % _rockProtos.length];
            var bs = targetR / bp.radius;
            rocks.push({ proto: bp, x: bx, y: bh - bp.minY * bs - targetR * 0.08, z: bz, scale: bs, rotY: rotY });
        }
        // 植被
        function placePlant(cat, count, hMin, hMax) {
            var variants = _plantProtos[cat];
            if (!variants || !variants.length) return;
            for (var i = 0; i < count; i++) {
                var x = ox + (rng() - 0.5) * CHUNK * 0.92;
                var z = oz + (rng() - 0.5) * CHUNK * 0.92;
                var vi = Math.floor(rng() * PLANT_FILES[cat].length);
                var sj = 0.8 + rng() * 0.5;
                var rotY = rng() * Math.PI * 2;
                var h = terrainHeightAt(x, z);
                if (h < hMin || h > hMax) continue;
                var p = variants[vi % variants.length];
                var sc = (PLANT_TARGET_H[cat] * sj) / p.h;
                plants.push({ proto: p, x: x, y: h - p.minY * sc, z: z, scale: sc, rotY: rotY });
            }
        }
        placePlant('cactus', 16, -0.5, 4);
        placePlant('deadtree', 10, -1, 3);
        placePlant('bush', 20, -0.5, 5);
        placePlant('grass', 50, -0.5, 5);

        return { rocks: rocks, plants: plants, colliders: colliders };
    }

    // ═══ Chunk 流式加载（3×3 九宫格）═══
    var _chunks = {};           // key "cx,cz" -> { terrain, props }
    var _lastChunkKey = null;
    var _colliders = [];        // 当前已加载块的大石头碰撞圆汇总
    var _groundY = 0;           // 地面整体竖直偏移（在"缩放后"的世界里，让地表落到主角脚下）
    var _worldScale = 1.0;      // 整体世界缩放：把 200 单位的大地形塞进小尺度飞机场景

    // 把"未缩放世界坐标系"下的 model 矩阵，包成最终渲染矩阵：
    //   finalModel = T([0,groundY,0]) · S(worldScale) · model
    // 即先在大尺度世界里布局(model)，再整体缩放，最后整体竖直偏移到主角脚下。
    // chunk 流式加载仍基于未缩放坐标，逻辑不受缩放影响。
    function _wrapWorld(model) {
        var out = mat4.create();
        mat4.translate(out, out, [0, _groundY, 0]);
        mat4.scale(out, out, [_worldScale, _worldScale, _worldScale]);
        mat4.multiply(out, out, model);
        return out;
    }

    function _buildChunk(gl, cx, cz) {
        var key = cx + ',' + cz;
        if (_chunks[key]) return;
        var terrain = _buildChunkTerrainBuffer(gl, cx, cz);
        var props = _buildProps(cx, cz);
        _chunks[key] = { terrain: terrain, props: props };
        for (var i = 0; i < props.colliders.length; i++) _colliders.push(props.colliders[i]);
    }

    function _disposeChunk(gl, key) {
        var c = _chunks[key];
        if (!c) return;
        var t = c.terrain;
        gl.deleteBuffer(t.position); gl.deleteBuffer(t.normal);
        gl.deleteBuffer(t.color); gl.deleteBuffer(t.index);
        // 道具原型 buffer/texture 共享，不在此释放；仅移除碰撞引用
        for (var i = 0; i < c.props.colliders.length; i++) {
            var idx = _colliders.indexOf(c.props.colliders[i]);
            if (idx >= 0) _colliders.splice(idx, 1);
        }
        delete _chunks[key];
    }

    // 按相机/玩家世界坐标更新 3×3 块；跨格才工作
    function _updateChunks(gl, centerX, centerZ) {
        var pcx = Math.floor(centerX / CHUNK + 0.5);
        var pcz = Math.floor(centerZ / CHUNK + 0.5);
        var key = pcx + ',' + pcz;
        if (key === _lastChunkKey) return;
        _lastChunkKey = key;
        var need = {};
        for (var dx = -1; dx <= 1; dx++) for (var dz = -1; dz <= 1; dz++) {
            var k = (pcx + dx) + ',' + (pcz + dz);
            need[k] = true;
            if (!_chunks[k]) _buildChunk(gl, pcx + dx, pcz + dz);
        }
        for (var ek in _chunks) if (_chunks.hasOwnProperty(ek) && !need[ek]) _disposeChunk(gl, ek);
    }

    // 模型异步加载完成后，给已经建好的（但当时道具为空的）块补放道具。
    // 解决"切 Demo 时同步建块，但 GLB 还没加载完"导致地形上空无一物的问题。
    function _rebuildAllProps(gl) {
        for (var key in _chunks) {
            if (!_chunks.hasOwnProperty(key)) continue;
            var parts = key.split(',');
            var cx = parseInt(parts[0], 10), cz = parseInt(parts[1], 10);
            var c = _chunks[key];
            // 移除旧碰撞引用
            for (var i = 0; i < c.props.colliders.length; i++) {
                var idx = _colliders.indexOf(c.props.colliders[i]);
                if (idx >= 0) _colliders.splice(idx, 1);
            }
            c.props = _buildProps(cx, cz);
            for (var j = 0; j < c.props.colliders.length; j++) _colliders.push(c.props.colliders[j]);
        }
    }

    // ═══ 渲染：地形（顶点色）与道具（贴图）各一套简单方向光 shader ═══
    var _terrainProgram = null;
    var _propProgram = null;
    // 与本工程其它 demo 一致的方向光（世界空间），用 LIGHT_POSITION 当方向
    function _lightDir() {
        var L = (typeof LIGHT_POSITION !== 'undefined') ? LIGHT_POSITION : [0.5, 1.0, 0.5];
        var x = L[0], y = L[1], z = L[2];
        var l = Math.sqrt(x*x+y*y+z*z) || 1;
        return [x/l, y/l, z/l];
    }

    function _initTerrainShader(gl) {
        var vs = `
            attribute vec4 aPosition;
            attribute vec3 aNormal;
            attribute vec3 aColor;
            uniform mat4 uMVP;
            uniform mat4 uModel;
            uniform mat4 uVpByLight;   // 光源视点 view-projection（含本块 model）
            varying vec3 vNormal;
            varying vec3 vColor;
            varying vec4 vPosByLight;
            void main() {
                gl_Position = uMVP * aPosition;
                vNormal = mat3(uModel) * aNormal;
                vColor = aColor;
                vPosByLight = uVpByLight * aPosition;
            }
        `;
        var fs = `
            precision mediump float;
            uniform vec3 uLightDir;
            uniform sampler2D uShadowSampler;
            uniform int uUseShadow;
            varying vec3 vNormal;
            varying vec3 vColor;
            varying vec4 vPosByLight;
            void main() {
                vec3 N = normalize(vNormal);
                float diff = max(dot(N, normalize(uLightDir)), 0.0);
                float light = 0.35 + 0.65 * diff;   // 环境 + 漫反射
                // 阴影：与 base_lighting.fs 同一套 RTT 深度比较
                float visibility = 1.0;
                if (uUseShadow == 1) {
                    vec3 shadowCoord = (vPosByLight.xyz / vPosByLight.w) / 2.0 + 0.5;
                    if (shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 &&
                        shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0) {
                        float depth = texture2D(uShadowSampler, shadowCoord.xy).a;
                        if (shadowCoord.z > depth + 0.005) visibility = 0.5;
                    }
                }
                gl_FragColor = vec4(vColor * light * visibility, 1.0);
            }
        `;
        return _linkProgram(gl, vs, fs, ['aPosition', 'aNormal', 'aColor'],
            ['uMVP', 'uModel', 'uLightDir', 'uVpByLight', 'uShadowSampler', 'uUseShadow']);
    }

    function _initPropShader(gl) {
        var vs = `
            attribute vec4 aPosition;
            attribute vec3 aNormal;
            attribute vec2 aTexCoord;
            uniform mat4 uMVP;
            uniform mat4 uModel;
            varying vec3 vNormal;
            varying vec2 vUv;
            void main() {
                gl_Position = uMVP * aPosition;
                vNormal = mat3(uModel) * aNormal;
                vUv = aTexCoord;
            }
        `;
        var fs = `
            precision mediump float;
            uniform sampler2D uTex;
            uniform vec3 uLightDir;
            varying vec3 vNormal;
            varying vec2 vUv;
            void main() {
                vec3 N = normalize(vNormal);
                float diff = max(dot(N, normalize(uLightDir)), 0.0);
                float light = 0.4 + 0.6 * diff;
                vec4 tex = texture2D(uTex, vUv);
                if (tex.a < 0.5) discard;   // 草/叶子用 alpha 镂空
                gl_FragColor = vec4(tex.rgb * light, 1.0);
            }
        `;
        return _linkProgram(gl, vs, fs, ['aPosition', 'aNormal', 'aTexCoord'],
            ['uMVP', 'uModel', 'uTex', 'uLightDir']);
    }

    function _linkProgram(gl, vsSrc, fsSrc, attribs, uniforms) {
        var vsh = loadShader(gl, gl.VERTEX_SHADER, vsSrc);
        var fsh = loadShader(gl, gl.FRAGMENT_SHADER, fsSrc);
        var prog = gl.createProgram();
        gl.attachShader(prog, vsh); gl.attachShader(prog, fsh); gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            alert('InfiniteTerrain shader link failed: ' + gl.getProgramInfoLog(prog));
            return null;
        }
        var info = { program: prog, attribs: {}, uniforms: {} };
        attribs.forEach(function (a) { info.attribs[a] = gl.getAttribLocation(prog, a); });
        uniforms.forEach(function (u) { info.uniforms[u] = gl.getUniformLocation(prog, u); });
        return info;
    }

    // 单个原型实例的 model 矩阵（未缩放世界坐标系）：平移到世界点 + 绕 Y 旋转 + 均匀缩放。
    // groundY / worldScale 由 _wrapWorld 在外层统一施加。
    function _instanceModel(inst) {
        var m = mat4.create();
        mat4.translate(m, m, [inst.x, inst.y, inst.z]);
        mat4.rotateY(m, m, inst.rotY);
        mat4.scale(m, m, [inst.scale, inst.scale, inst.scale]);
        return _wrapWorld(m);
    }

    function _draw(gl, vpMatrix, opts) {
        if (!_terrainProgram || !_propProgram) return;
        var L = _lightDir();
        opts = opts || {};
        var vpByLight = opts.vpByLight || null;   // 光源 VP（开启阴影时传入）
        var shadowTex = opts.shadowTex || null;

        // ── 地形块（接收阴影）──
        var tp = _terrainProgram;
        gl.useProgram(tp.program);
        gl.uniform3fv(tp.uniforms.uLightDir, L);
        var useShadow = (vpByLight && shadowTex) ? 1 : 0;
        gl.uniform1i(tp.uniforms.uUseShadow, useShadow);
        if (useShadow) {
            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, shadowTex);
            gl.uniform1i(tp.uniforms.uShadowSampler, 2);
        }
        for (var key in _chunks) {
            if (!_chunks.hasOwnProperty(key)) continue;
            var t = _chunks[key].terrain;
            var model = mat4.create();
            mat4.translate(model, model, [t.ox, 0, t.oz]);
            model = _wrapWorld(model);
            var mvp = mat4.create();
            mat4.multiply(mvp, vpMatrix, model);
            gl.uniformMatrix4fv(tp.uniforms.uMVP, false, mvp);
            gl.uniformMatrix4fv(tp.uniforms.uModel, false, model);
            if (useShadow) {
                var mvpLight = mat4.create();
                mat4.multiply(mvpLight, vpByLight, model);
                gl.uniformMatrix4fv(tp.uniforms.uVpByLight, false, mvpLight);
            }

            gl.bindBuffer(gl.ARRAY_BUFFER, t.position);
            gl.vertexAttribPointer(tp.attribs.aPosition, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(tp.attribs.aPosition);
            gl.bindBuffer(gl.ARRAY_BUFFER, t.normal);
            gl.vertexAttribPointer(tp.attribs.aNormal, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(tp.attribs.aNormal);
            gl.bindBuffer(gl.ARRAY_BUFFER, t.color);
            gl.vertexAttribPointer(tp.attribs.aColor, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(tp.attribs.aColor);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, t.index);
            gl.drawElements(gl.TRIANGLES, t.indexCount, gl.UNSIGNED_SHORT, 0);
        }

        // ── 道具（石头 + 植被）──
        var pp = _propProgram;
        gl.useProgram(pp.program);
        gl.uniform3fv(pp.uniforms.uLightDir, L);
        for (var k2 in _chunks) {
            if (!_chunks.hasOwnProperty(k2)) continue;
            var props = _chunks[k2].props;
            _drawInstances(gl, pp, props.rocks, vpMatrix);
            _drawInstances(gl, pp, props.plants, vpMatrix);
        }
    }

    // 阴影深度 pass：用外部 shadow program 把道具（大石头）写入光源深度图。
    // 只画大石头（scale 较大者）即可，草木太多且太矮意义不大。
    function _drawShadowPass(gl, shadowProgram, vpByLight) {
        if (!shadowProgram) return;
        gl.useProgram(shadowProgram.program);
        var aPos = shadowProgram.attribLocations.vertexPosition;
        var uMVP = shadowProgram.uniformLocations.uMVPMatrixHandle;
        for (var key in _chunks) {
            if (!_chunks.hasOwnProperty(key)) continue;
            var rocks = _chunks[key].props.rocks;
            for (var i = 0; i < rocks.length; i++) {
                var inst = rocks[i];
                if (inst.scale < 1.0) continue;   // 仅大石头投影
                var model = _instanceModel(inst);
                var mvpLight = mat4.create();
                mat4.multiply(mvpLight, vpByLight, model);
                gl.uniformMatrix4fv(uMVP, false, mvpLight);
                var prims = inst.proto.primitives;
                for (var p = 0; p < prims.length; p++) {
                    var prim = prims[p];
                    gl.bindBuffer(gl.ARRAY_BUFFER, prim.position);
                    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
                    gl.enableVertexAttribArray(aPos);
                    if (prim.index) {
                        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, prim.index);
                        gl.drawElements(gl.TRIANGLES, prim.drawCnt, gl.UNSIGNED_SHORT, 0);
                    } else {
                        gl.drawArrays(gl.TRIANGLES, 0, prim.drawCnt);
                    }
                }
            }
        }
    }

    function _drawInstances(gl, pp, list, vpMatrix) {
        for (var i = 0; i < list.length; i++) {
            var inst = list[i];
            var model = _instanceModel(inst);
            var mvp = mat4.create();
            mat4.multiply(mvp, vpMatrix, model);
            gl.uniformMatrix4fv(pp.uniforms.uMVP, false, mvp);
            gl.uniformMatrix4fv(pp.uniforms.uModel, false, model);
            var prims = inst.proto.primitives;
            for (var p = 0; p < prims.length; p++) {
                var prim = prims[p];
                gl.bindBuffer(gl.ARRAY_BUFFER, prim.position);
                gl.vertexAttribPointer(pp.attribs.aPosition, 3, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(pp.attribs.aPosition);
                gl.bindBuffer(gl.ARRAY_BUFFER, prim.normal);
                gl.vertexAttribPointer(pp.attribs.aNormal, 3, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(pp.attribs.aNormal);
                gl.bindBuffer(gl.ARRAY_BUFFER, prim.uv);
                gl.vertexAttribPointer(pp.attribs.aTexCoord, 2, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(pp.attribs.aTexCoord);
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, prim.texture);
                gl.uniform1i(pp.uniforms.uTex, 0);
                if (prim.index) {
                    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, prim.index);
                    gl.drawElements(gl.TRIANGLES, prim.drawCnt, gl.UNSIGNED_SHORT, 0);
                } else {
                    gl.drawArrays(gl.TRIANGLES, 0, prim.drawCnt);
                }
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // LOD（层次细节）流式演示：地形按 chunk 无限扩展，每个 chunk 的细分等级
    // 由它到"相机所在 chunk"的距离(环号)决定 —— 离相机越近细分越精细。相机
    // 用 WASD 移动时，前方 chunk 持续生成、后方回收，且每个 chunk 的 LOD 等级
    // 随与相机的距离实时升降（同一 chunk 走近会变精细、走远会变粗糙）。
    // 地形上还散布球/圆柱/圆锥三种几何体，同样按到相机距离取 4 档预建网格。
    // ═══════════════════════════════════════════════════════════════════
    var _lodProgram = null;
    var _lodChunks = {};         // key "cx,cz" -> { cx,cz,lod,seg,terrain,shapes }
    var _lodRadius = 3;          // 相机周围加载半径（chunk 数）→ (2R+1)² 块
    var _lodSegsByRing = [64, 32, 16, 8];  // 每个 LOD 等级的地形细分数
    var _lodLastKey = null;      // 是否已初始化过（null=未建）
    var _lodLastX = 0, _lodLastZ = 0;  // 上次重算 LOD 时的相机位置
    var LOD_UPDATE_DIST = 20;    // 相机移动超过此距离(未缩放)就重算 LOD 分级
    var _lodWireframe = true;
    var _lodColorByLevel = true;
    var _lodEnabled = true;      // false=全部用最高细分(对比)
    var _lodTriCount = 0;
    var _lodCamX = 0, _lodCamZ = 0;  // 相机在"未缩放地形坐标"的位置

    // 三种几何体的 4 档 LOD 网格（预建，所有实例共享）
    var _shapeLODs = null;       // { sphere:[lod0..3], cylinder:[...], cone:[...] }

    // 每个 LOD 等级的颜色（近→远：绿、黄、橙、红）
    var _lodColors = [
        [0.30, 0.85, 0.35],
        [0.95, 0.90, 0.25],
        [0.98, 0.62, 0.20],
        [0.92, 0.30, 0.25],
    ];

    function _initLODShader(gl) {
        var vs = `
            attribute vec4 aPosition;
            attribute vec3 aNormal;
            attribute vec3 aColor;
            uniform mat4 uMVP;
            uniform mat4 uModel;
            varying vec3 vNormal;
            varying vec3 vColor;
            void main() {
                gl_Position = uMVP * aPosition;
                vNormal = mat3(uModel) * aNormal;
                vColor = aColor;
            }
        `;
        var fs = `
            precision mediump float;
            uniform vec3 uLightDir;
            uniform vec3 uLevelColor;   // 当前 LOD 等级染色
            uniform float uUseLevelColor;
            uniform float uFlat;        // 1=线框纯色(忽略光照)
            varying vec3 vNormal;
            varying vec3 vColor;
            void main() {
                vec3 base = mix(vColor, uLevelColor, uUseLevelColor);
                if (uFlat > 0.5) { gl_FragColor = vec4(base, 1.0); return; }
                vec3 N = normalize(vNormal);
                float diff = max(dot(N, normalize(uLightDir)), 0.0);
                float light = 0.4 + 0.6 * diff;
                gl_FragColor = vec4(base * light, 1.0);
            }
        `;
        return _linkProgram(gl, vs, fs, ['aPosition', 'aNormal', 'aColor'],
            ['uMVP', 'uModel', 'uLightDir', 'uLevelColor', 'uUseLevelColor', 'uFlat']);
    }

    // 构建一个可索引几何 buffer（positions/normals/colors 同长，三角索引 + 线框索引）
    function _makeShapeBuffer(gl, positions, normals, indices, rgb) {
        var n = positions.length / 3;
        var colors = new Float32Array(n * 3);
        for (var i = 0; i < n; i++) { colors[i*3]=rgb[0]; colors[i*3+1]=rgb[1]; colors[i*3+2]=rgb[2]; }
        var wire = [];
        for (var t = 0; t < indices.length; t += 3) {
            var a = indices[t], b = indices[t+1], c = indices[t+2];
            wire.push(a,b, b,c, c,a);
        }
        function buf(target, arr, ArrType) {
            var bb = gl.createBuffer(); gl.bindBuffer(target, bb);
            gl.bufferData(target, new ArrType(arr), gl.STATIC_DRAW); return bb;
        }
        return {
            position: buf(gl.ARRAY_BUFFER, positions, Float32Array),
            normal:   buf(gl.ARRAY_BUFFER, normals, Float32Array),
            color:    buf(gl.ARRAY_BUFFER, colors, Float32Array),
            index:    buf(gl.ELEMENT_ARRAY_BUFFER, indices, Uint16Array),
            indexCount: indices.length,
            wire:     buf(gl.ELEMENT_ARRAY_BUFFER, wire, Uint16Array),
            wireCount: wire.length,
            triCount: indices.length / 3,
        };
    }

    function _genSphere(seg) {
        var pos = [], nrm = [], idx = [];
        for (var iy = 0; iy <= seg; iy++) {
            var v = iy / seg, phi = v * Math.PI;
            for (var ix = 0; ix <= seg; ix++) {
                var u = ix / seg, theta = u * Math.PI * 2;
                var x = Math.sin(phi) * Math.cos(theta);
                var y = Math.cos(phi);
                var z = Math.sin(phi) * Math.sin(theta);
                pos.push(x, y, z); nrm.push(x, y, z);
            }
        }
        var row = seg + 1;
        for (var yy = 0; yy < seg; yy++)
            for (var xx = 0; xx < seg; xx++) {
                var a = yy*row+xx, b = a+1, c = a+row, d = c+1;
                idx.push(a,c,b, b,c,d);
            }
        return { pos: pos, nrm: nrm, idx: idx };
    }

    function _genCylinder(seg) {
        var pos = [], nrm = [], idx = [];
        for (var ring = 0; ring < 2; ring++) {
            var y = ring === 0 ? -1 : 1;
            for (var i = 0; i <= seg; i++) {
                var a = i / seg * Math.PI * 2;
                var cx = Math.cos(a), cz = Math.sin(a);
                pos.push(cx, y, cz); nrm.push(cx, 0, cz);
            }
        }
        var row = seg + 1;
        for (var ss = 0; ss < seg; ss++) {
            var a0 = ss, b0 = ss+1, c0 = row+ss, d0 = row+ss+1;
            idx.push(a0,c0,b0, b0,c0,d0);
        }
        var topC = pos.length/3; pos.push(0,1,0); nrm.push(0,1,0);
        var botC = pos.length/3; pos.push(0,-1,0); nrm.push(0,-1,0);
        for (var k = 0; k < seg; k++) {
            idx.push(topC, row + k, row + k + 1);
            idx.push(botC, k + 1, k);
        }
        return { pos: pos, nrm: nrm, idx: idx };
    }

    function _genCone(seg) {
        var pos = [], nrm = [], idx = [];
        for (var i = 0; i <= seg; i++) {
            var a = i / seg * Math.PI * 2;
            var cx = Math.cos(a), cz = Math.sin(a);
            pos.push(cx, -1, cz);
            var nl = Math.sqrt(cx*cx + cz*cz + 0.25) || 1;
            nrm.push(cx/nl, 0.5/nl, cz/nl);
        }
        var apex = pos.length/3; pos.push(0, 1, 0); nrm.push(0, 1, 0);
        var botC = pos.length/3; pos.push(0, -1, 0); nrm.push(0, -1, 0);
        for (var k = 0; k < seg; k++) {
            idx.push(apex, k, k + 1);
            idx.push(botC, k + 1, k);
        }
        return { pos: pos, nrm: nrm, idx: idx };
    }

    function _initShapeLODs(gl) {
        if (_shapeLODs) return;
        var SPHERE_SEG = [40, 20, 10, 5];
        var TUBE_SEG   = [48, 24, 12, 6];
        var c = [0.85, 0.85, 0.9];
        _shapeLODs = { sphere: [], cylinder: [], cone: [] };
        for (var i = 0; i < 4; i++) {
            var sp = _genSphere(SPHERE_SEG[i]);
            _shapeLODs.sphere.push(_makeShapeBuffer(gl, sp.pos, sp.nrm, sp.idx, c));
            var cy = _genCylinder(TUBE_SEG[i]);
            _shapeLODs.cylinder.push(_makeShapeBuffer(gl, cy.pos, cy.nrm, cy.idx, c));
            var co = _genCone(TUBE_SEG[i]);
            _shapeLODs.cone.push(_makeShapeBuffer(gl, co.pos, co.nrm, co.idx, c));
        }
    }

    // 某个 chunk 里确定性散布的几何体实例（位置/类型/尺寸固定，渲染时按到相机距离选 LOD）
    function _shapeInstances(cx, cz) {
        var seed = ((cx * 73856093) ^ (cz * 19349663) ^ 0x5bd1e995) >>> 0;
        var s = seed || 1;
        var rng = function () {
            s |= 0; s = s + 0x6D2B79F5 | 0;
            var t = Math.imul(s ^ s >>> 15, 1 | s);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
        var types = ['sphere', 'cylinder', 'cone'];
        var list = [];
        var count = 5 + Math.floor(rng() * 4);
        for (var i = 0; i < count; i++) {
            var x = cx * CHUNK + (rng() - 0.5) * CHUNK * 0.9;
            var z = cz * CHUNK + (rng() - 0.5) * CHUNK * 0.9;
            var r = 6 + rng() * 8;
            var type = types[Math.floor(rng() * types.length)];
            var h = terrainHeightAt(x, z);
            list.push({ type: type, x: x, y: h + r, z: z, r: r });
        }
        return list;
    }

    // 用"相机到 chunk 最近边的真实世界距离"决定 LOD 等级（而非块下标差）。
    // 这样无论相机在自己块内偏向哪一边，最近的地形始终是最高细分 —— 对称、无左右差异。
    function _lodLevelForChunk(cx, cz) {
        var minX = cx * CHUNK - CHUNK / 2, maxX = cx * CHUNK + CHUNK / 2;
        var minZ = cz * CHUNK - CHUNK / 2, maxZ = cz * CHUNK + CHUNK / 2;
        var dxw = Math.max(minX - _lodCamX, 0, _lodCamX - maxX);
        var dzw = Math.max(minZ - _lodCamZ, 0, _lodCamZ - maxZ);
        var dist = Math.sqrt(dxw * dxw + dzw * dzw);
        // 每 CHUNK 距离升一级 LOD；最近一圈(dist<CHUNK)恒为 lod0(最高细分)
        var lod = Math.floor(dist / CHUNK);
        return Math.min(lod, _lodSegsByRing.length - 1);
    }

    // 用真实距离给单个实例(几何体)选 LOD（同样对称、与块下标无关）
    function _lodLevelForPoint(x, z) {
        var dxw = x - _lodCamX, dzw = z - _lodCamZ;
        var dist = Math.sqrt(dxw * dxw + dzw * dzw);
        var lod = Math.floor(dist / CHUNK);
        return Math.min(lod, _lodSegsByRing.length - 1);
    }

    // 流式更新：以相机未缩放坐标为中心，维护 (2R+1)² chunk（按块下标决定加载范围），
    // 每个 chunk 的 LOD 等级用"相机到该块最近边的真实距离"决定。LOD 变化或新块则(重)建。
    function _updateLOD(gl, camX, camZ) {
        _lodCamX = camX; _lodCamZ = camZ;
        var pcx = Math.floor(camX / CHUNK + 0.5);
        var pcz = Math.floor(camZ / CHUNK + 0.5);
        var R = _lodRadius;

        var need = {};
        _lodTriCount = 0;
        for (var dz = -R; dz <= R; dz++) {
            for (var dx = -R; dx <= R; dx++) {
                var cx = pcx + dx, cz = pcz + dz;
                var key = cx + ',' + cz;
                need[key] = true;
                var lod = _lodEnabled ? _lodLevelForChunk(cx, cz) : 0;  // lod0=最精细
                var seg = _lodSegsByRing[lod];

                var ck = _lodChunks[key];
                if (!ck) {
                    ck = { cx: cx, cz: cz, lod: lod, seg: seg,
                           terrain: _buildChunkTerrainBuffer(gl, cx, cz, seg),
                           shapes: _shapeInstances(cx, cz) };
                    _lodChunks[key] = ck;
                } else if (ck.seg !== seg) {
                    // LOD 等级变了（相机走近/走远）→ 重建该 chunk 的地形几何
                    _freeTerrain(gl, ck.terrain);
                    ck.lod = lod; ck.seg = seg;
                    ck.terrain = _buildChunkTerrainBuffer(gl, cx, cz, seg);
                }
                _lodTriCount += ck.terrain.triCount;
            }
        }
        // 回收范围外的 chunk（相机走过后方的块）
        for (var ek in _lodChunks) {
            if (_lodChunks.hasOwnProperty(ek) && !need[ek]) {
                _freeTerrain(gl, _lodChunks[ek].terrain);
                delete _lodChunks[ek];
            }
        }
    }

    function _freeTerrain(gl, t) {
        gl.deleteBuffer(t.position); gl.deleteBuffer(t.normal);
        gl.deleteBuffer(t.color); gl.deleteBuffer(t.index); gl.deleteBuffer(t.wire);
    }

    function _disposeLOD(gl) {
        for (var k in _lodChunks) {
            if (_lodChunks.hasOwnProperty(k)) _freeTerrain(gl, _lodChunks[k].terrain);
        }
        _lodChunks = {};
        _lodLastKey = null;
    }

    // 绑定一个 LOD geom buffer 的 attribs 并按线框/实体绘制
    function _drawLODGeom(gl, p, t) {
        gl.bindBuffer(gl.ARRAY_BUFFER, t.position);
        gl.vertexAttribPointer(p.attribs.aPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(p.attribs.aPosition);
        gl.bindBuffer(gl.ARRAY_BUFFER, t.normal);
        gl.vertexAttribPointer(p.attribs.aNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(p.attribs.aNormal);
        gl.bindBuffer(gl.ARRAY_BUFFER, t.color);
        gl.vertexAttribPointer(p.attribs.aColor, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(p.attribs.aColor);
        if (_lodWireframe) {
            gl.uniform1f(p.uniforms.uFlat, 1.0);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, t.wire);
            gl.drawElements(gl.LINES, t.wireCount, gl.UNSIGNED_SHORT, 0);
        } else {
            gl.uniform1f(p.uniforms.uFlat, 0.0);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, t.index);
            gl.drawElements(gl.TRIANGLES, t.indexCount, gl.UNSIGNED_SHORT, 0);
        }
    }

    function _drawLOD(gl, vpMatrix) {
        if (!_lodProgram) return;
        var L = _lightDir();
        var p = _lodProgram;
        gl.useProgram(p.program);
        gl.uniform3fv(p.uniforms.uLightDir, L);

        for (var key in _lodChunks) {
            if (!_lodChunks.hasOwnProperty(key)) continue;
            var ck = _lodChunks[key];

            // ── 地形块 ──
            var model = mat4.create();
            mat4.translate(model, model, [ck.cx * CHUNK, 0, ck.cz * CHUNK]);
            model = _wrapWorld(model);
            var mvp = mat4.create();
            mat4.multiply(mvp, vpMatrix, model);
            gl.uniformMatrix4fv(p.uniforms.uMVP, false, mvp);
            gl.uniformMatrix4fv(p.uniforms.uModel, false, model);
            var col = _lodColors[Math.min(ck.lod, _lodColors.length - 1)];
            gl.uniform3fv(p.uniforms.uLevelColor, col);
            gl.uniform1f(p.uniforms.uUseLevelColor, _lodColorByLevel ? 1.0 : 0.0);
            _drawLODGeom(gl, p, ck.terrain);

            // ── 几何体（球/柱/锥）：按到相机的真实距离选 LOD（与地形同一套距离分级）──
            if (_shapeLODs && ck.shapes) {
                for (var si = 0; si < ck.shapes.length; si++) {
                    var inst = ck.shapes[si];
                    var slod = _lodEnabled ? _lodLevelForPoint(inst.x, inst.z) : 0;
                    var geom = _shapeLODs[inst.type][slod];
                    var sm = mat4.create();
                    mat4.translate(sm, sm, [inst.x, inst.y, inst.z]);
                    mat4.scale(sm, sm, [inst.r, inst.r, inst.r]);
                    sm = _wrapWorld(sm);
                    var smvp = mat4.create();
                    mat4.multiply(smvp, vpMatrix, sm);
                    gl.uniformMatrix4fv(p.uniforms.uMVP, false, smvp);
                    gl.uniformMatrix4fv(p.uniforms.uModel, false, sm);
                    var scol = _lodColors[Math.min(slod, _lodColors.length - 1)];
                    gl.uniform3fv(p.uniforms.uLevelColor, scol);
                    gl.uniform1f(p.uniforms.uUseLevelColor, _lodColorByLevel ? 1.0 : 0.0);
                    _drawLODGeom(gl, p, geom);
                }
            }
        }
    }

    // ═══ 对外接口 ═══
    return {
        // 初始化 shader（几何随 chunk 流式构建，模型异步加载）
        init: function (gl, onModelsLoaded) {
            _terrainProgram = _initTerrainShader(gl);
            _propProgram = _initPropShader(gl);
            var pending = 2;
            var done = function () {
                if (--pending === 0) {
                    // 模型就绪后，给切 Demo 时同步建好的空块补放道具
                    _rebuildAllProps(gl);
                    if (onModelsLoaded) onModelsLoaded();
                }
            };
            _loadRockModels(gl, done);
            _loadPlantModels(gl, done);
        },
        // 按世界中心点更新 3×3 块（跨格才工作）
        updateChunks: function (gl, centerX, centerZ) { _updateChunks(gl, centerX, centerZ); },
        // 渲染所有已加载块。opts: { vpByLight, shadowTex } 传入时地形接收阴影。
        draw: function (gl, vpMatrix, opts) { _draw(gl, vpMatrix, opts); },
        // 阴影深度 pass：把大石头写入光源深度图（在 FBO 内调用）
        drawShadowPass: function (gl, shadowProgram, vpByLight) { _drawShadowPass(gl, shadowProgram, vpByLight); },
        // 高度场（碰撞/道具贴地/后续 Demo 用）。
        // 入参为未缩放世界坐标，返回值为"缩放后"的渲染高度，与画面一致。
        getHeight: function (x, z) { return terrainHeightAt(x, z) * _worldScale + _groundY; },
        // 设置地面整体竖直偏移（缩放后世界里的 Y，让地形落到主角脚下）
        setGroundY: function (y) { _groundY = y; },
        // 设置整体世界缩放（把 200 单位大地形塞进小尺度场景）
        setWorldScale: function (s) { _worldScale = s; },
        getWorldScale: function () { return _worldScale; },
        // ── LOD（层次细节）演示接口 ──
        // ── LOD 流式演示接口 ──
        initLOD: function (gl) {
            if (!_lodProgram) _lodProgram = _initLODShader(gl);
            _initShapeLODs(gl);
            _disposeLOD(gl);
        },
        // 按相机未缩放坐标更新流式 LOD chunk。LOD 现按真实距离分级，相机在块内移动
        // 也会改变各块的 LOD，故不再用"跨格"门控，而是相机移动超过阈值就重算
        // （_updateLOD 内部仅对 seg 变化的块重建几何，开销可控）。
        updateLOD: function (gl, camX, camZ) {
            _lodCamX = camX; _lodCamZ = camZ;
            var moved = (camX - _lodLastX) * (camX - _lodLastX) + (camZ - _lodLastZ) * (camZ - _lodLastZ);
            if (moved < LOD_UPDATE_DIST * LOD_UPDATE_DIST && _lodLastKey !== null) return;
            _lodLastX = camX; _lodLastZ = camZ; _lodLastKey = 'set';
            _updateLOD(gl, camX, camZ);
        },
        // 强制重建（开关 LOD / 改参数时）
        rebuildLOD: function (gl) { _lodLastKey = null; _updateLOD(gl, _lodCamX, _lodCamZ); },
        drawLOD: function (gl, vpMatrix) { _drawLOD(gl, vpMatrix); },
        setLODEnabled: function (gl, v) { _lodEnabled = v; _lodLastKey = null; _updateLOD(gl, _lodCamX, _lodCamZ); },
        setLODWireframe: function (v) { _lodWireframe = v; },
        setLODColorByLevel: function (v) { _lodColorByLevel = v; },
        getLODTriCount: function () { return _lodTriCount; },
        getLODChunkCount: function () { var n = 0; for (var k in _lodChunks) if (_lodChunks.hasOwnProperty(k)) n++; return n; },
        // 大石头碰撞圆（供场景管理 Demo）
        getColliders: function () { return _colliders; },
        // 已加载块数（供 LOD/场景管理 Demo 显示）
        getChunkCount: function () { var n = 0; for (var k in _chunks) if (_chunks.hasOwnProperty(k)) n++; return n; },
        CHUNK: CHUNK,
        SEGMENTS: SEGMENTS,
        ROCK_FILES: ROCK_FILES,
        PLANT_FILES: PLANT_FILES,
        PLANT_TARGET_H: PLANT_TARGET_H,
    };
})();

// ── 全局包装函数：供 LOD demo 的 HTML 控件调用 ──
function updateLODOptions() {
    var gl = mGLCanvas.getGL();
    App.InfiniteTerrain.setLODEnabled(gl, document.getElementById('id_lod_enable').checked);
    App.InfiniteTerrain.setLODWireframe(document.getElementById('id_lod_wireframe').checked);
    App.InfiniteTerrain.setLODColorByLevel(document.getElementById('id_lod_colored').checked);
    var el = document.getElementById('id_lod_tricount');
    if (el) el.innerHTML = App.InfiniteTerrain.getLODTriCount().toLocaleString();
    requestRender();
}

