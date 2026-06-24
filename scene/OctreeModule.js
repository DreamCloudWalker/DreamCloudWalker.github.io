var App = App || {};

// ═══════════════════════════════════════════════════════════════════════
// 场景管理：八叉树（Octree）空间分割 + 视锥体剔除（Frustum Culling）
// 一片散布在空间里的方块，用八叉树递归划分空间；以"主相机"的视锥体为裁剪体，
// 自上而下测试每个八叉树节点的包围盒(AABB)：整体在视锥外的节点连同其子树
// 一次性剔除，不再深入测试里面的物体 —— 这就是空间分割加速剔除的核心价值。
//
// 双视口配合：
//   左(主视口) = 裁剪用的相机，只画通过剔除的物体；
//   右(上帝视角) = 俯瞰全局：画八叉树盒子 + 物体(绿=可见/灰=被剔除) + 主相机视锥线框。
// 用 WASD 平移、拖右窗口旋转主相机，即可实时看到剔除随视锥变化。
// ═══════════════════════════════════════════════════════════════════════
App.Octree = (function () {
    var _program = null;
    var _cube = null;          // 单位立方体几何（实体三角形索引 + 线框索引）
    var _objects = [];         // [{x,y,z,half,colorIdx}]
    var _root = null;          // 八叉树根节点
    var _enableCull = true;    // 是否启用视锥剔除
    var _showBoxes = true;     // 是否画八叉树节点盒子

    // 统计（供 UI 显示）
    var _stat = { total: 0, drawn: 0, nodes: 0, culledNodes: 0 };

    // 场景体积（八叉树根 AABB）与物体数量
    var ROOT_MIN = [-8, -4, -8];
    var ROOT_MAX = [ 8,  4,  8];
    var OBJ_COUNT = 280;
    var MAX_DEPTH = 4;
    var MAX_PER_NODE = 6;

    // 物体颜色板（可见时用）
    var COLORS = [
        [0.85, 0.4, 0.4], [0.4, 0.75, 0.9], [0.5, 0.85, 0.45],
        [0.9, 0.78, 0.35], [0.75, 0.55, 0.9], [0.9, 0.6, 0.35],
    ];

    // ── 单位立方体几何（中心在原点，半边长 0.5）──
    function _initCube(gl) {
        var p = 0.5;
        var positions = [
            -p,-p,-p,  p,-p,-p,  p,p,-p,  -p,p,-p,   // back
            -p,-p, p,  p,-p, p,  p,p, p,  -p,p, p,    // front
        ];
        // 实体三角形索引（12 个三角形）
        var tri = [
            0,1,2, 0,2,3,   // back
            4,6,5, 4,7,6,   // front
            0,4,5, 0,5,1,   // bottom
            3,2,6, 3,6,7,   // top
            0,3,7, 0,7,4,   // left
            1,5,6, 1,6,2,   // right
        ];
        // 线框索引（12 条棱）
        var wire = [
            0,1, 1,2, 2,3, 3,0,
            4,5, 5,6, 6,7, 7,4,
            0,4, 1,5, 2,6, 3,7,
        ];
        var posBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
        var triBuf = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triBuf);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(tri), gl.STATIC_DRAW);
        var wireBuf = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, wireBuf);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(wire), gl.STATIC_DRAW);
        return {
            position: posBuf, tri: triBuf, triCount: tri.length,
            wire: wireBuf, wireCount: wire.length,
        };
    }

    // ── 确定性散布物体 ──
    function _genObjects() {
        var s = 1337;
        var rng = function () {
            s |= 0; s = s + 0x6D2B79F5 | 0;
            var t = Math.imul(s ^ s >>> 15, 1 | s);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
        _objects = [];
        for (var i = 0; i < OBJ_COUNT; i++) {
            var x = ROOT_MIN[0] + rng() * (ROOT_MAX[0] - ROOT_MIN[0]);
            var y = ROOT_MIN[1] + rng() * (ROOT_MAX[1] - ROOT_MIN[1]);
            var z = ROOT_MIN[2] + rng() * (ROOT_MAX[2] - ROOT_MIN[2]);
            var half = 0.12 + rng() * 0.22;
            _objects.push({ x: x, y: y, z: z, half: half, colorIdx: i % COLORS.length, visible: true });
        }
    }

    // ── 八叉树：递归把空间均分为 8 个子立方体 ──
    function _makeNode(min, max, depth) {
        return { min: min, max: max, depth: depth, children: null, objects: [] };
    }

    function _objInNode(o, node) {
        // 物体中心落在节点 AABB 内即归属该节点（简化：按中心点划分）
        return o.x >= node.min[0] && o.x < node.max[0] &&
               o.y >= node.min[1] && o.y < node.max[1] &&
               o.z >= node.min[2] && o.z < node.max[2];
    }

    function _subdivide(node) {
        var mn = node.min, mx = node.max;
        var cx = (mn[0] + mx[0]) / 2, cy = (mn[1] + mx[1]) / 2, cz = (mn[2] + mx[2]) / 2;
        var xs = [[mn[0], cx], [cx, mx[0]]];
        var ys = [[mn[1], cy], [cy, mx[1]]];
        var zs = [[mn[2], cz], [cz, mx[2]]];
        node.children = [];
        for (var ix = 0; ix < 2; ix++)
            for (var iy = 0; iy < 2; iy++)
                for (var iz = 0; iz < 2; iz++)
                    node.children.push(_makeNode(
                        [xs[ix][0], ys[iy][0], zs[iz][0]],
                        [xs[ix][1], ys[iy][1], zs[iz][1]],
                        node.depth + 1));
    }

    // 把一组物体插入节点，必要时继续细分
    function _insert(node, objs) {
        node.objects = [];
        if (objs.length <= MAX_PER_NODE || node.depth >= MAX_DEPTH) {
            node.objects = objs;   // 叶节点：直接存物体
            return;
        }
        _subdivide(node);
        // 分配到子节点；落不进任何子节点的(极少数边界)留在本节点
        var buckets = [[], [], [], [], [], [], [], []];
        for (var i = 0; i < objs.length; i++) {
            var placed = false;
            for (var c = 0; c < 8; c++) {
                if (_objInNode(objs[i], node.children[c])) { buckets[c].push(objs[i]); placed = true; break; }
            }
            if (!placed) node.objects.push(objs[i]);
        }
        for (var c2 = 0; c2 < 8; c2++) _insert(node.children[c2], buckets[c2]);
    }

    function _buildOctree() {
        _root = _makeNode(ROOT_MIN.slice(), ROOT_MAX.slice(), 0);
        _insert(_root, _objects.slice());
    }

    // ── 视锥体剔除：从 view-projection 矩阵提取 6 个裁剪平面 ──
    // 平面以 [a,b,c,d] 表示 ax+by+cz+d=0，法线指向视锥体内侧。
    function _extractFrustumPlanes(m) {
        // m 为列主序 mat4（gl-matrix），按 Gribb-Hartmann 提取
        var planes = [];
        function add(a, b, c, d) {
            var len = Math.sqrt(a*a + b*b + c*c) || 1;
            planes.push([a/len, b/len, c/len, d/len]);
        }
        // m[col*4 + row]
        var m0=m[0],m1=m[1],m2=m[2],m3=m[3];
        var m4=m[4],m5=m[5],m6=m[6],m7=m[7];
        var m8=m[8],m9=m[9],m10=m[10],m11=m[11];
        var m12=m[12],m13=m[13],m14=m[14],m15=m[15];
        add(m3+m0, m7+m4, m11+m8,  m15+m12);  // left
        add(m3-m0, m7-m4, m11-m8,  m15-m12);  // right
        add(m3+m1, m7+m5, m11+m9,  m15+m13);  // bottom
        add(m3-m1, m7-m5, m11-m9,  m15-m13);  // top
        add(m3+m2, m7+m6, m11+m10, m15+m14);  // near
        add(m3-m2, m7-m6, m11-m10, m15-m14);  // far
        return planes;
    }

    // AABB 与视锥体相交测试：用"最正顶点(p-vertex)"法。
    // 若 AABB 在任一平面的完全外侧 → 不相交（剔除）。
    function _aabbInFrustum(min, max, planes) {
        for (var i = 0; i < planes.length; i++) {
            var pl = planes[i];
            // 取 AABB 在该平面法线方向上最靠正侧的顶点
            var px = pl[0] >= 0 ? max[0] : min[0];
            var py = pl[1] >= 0 ? max[1] : min[1];
            var pz = pl[2] >= 0 ? max[2] : min[2];
            if (pl[0]*px + pl[1]*py + pl[2]*pz + pl[3] < 0) return false; // 完全在外侧
        }
        return true;
    }

    // 递归遍历八叉树：节点在视锥外 → 整棵子树剔除；否则收集其物体。
    function _cullNode(node, planes, outObjs, outBoxes) {
        _stat.nodes++;
        if (_enableCull && !_aabbInFrustum(node.min, node.max, planes)) {
            _stat.culledNodes++;
            return; // 整个子树跳过，不再测试里面的物体（八叉树加速的关键）
        }
        if (_showBoxes) outBoxes.push(node);
        for (var i = 0; i < node.objects.length; i++) {
            var o = node.objects[i];
            // 叶里仍可对单个物体做一次精细剔除（可选）；这里直接收集
            o.visible = true;
            outObjs.push(o);
        }
        if (node.children) {
            for (var c = 0; c < 8; c++) _cullNode(node.children[c], planes, outObjs, outBoxes);
        }
    }

    function _initShader(gl) {
        var vs = `
            attribute vec3 aPosition;
            uniform mat4 uMVP;
            void main() { gl_Position = uMVP * vec4(aPosition, 1.0); }
        `;
        var fs = `
            precision mediump float;
            uniform vec4 uColor;
            void main() { gl_FragColor = uColor; }
        `;
        var vsh = loadShader(gl, gl.VERTEX_SHADER, vs);
        var fsh = loadShader(gl, gl.FRAGMENT_SHADER, fs);
        var prog = gl.createProgram();
        gl.attachShader(prog, vsh); gl.attachShader(prog, fsh); gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            alert('Octree shader link failed: ' + gl.getProgramInfoLog(prog));
            return null;
        }
        return {
            program: prog,
            aPosition: gl.getAttribLocation(prog, 'aPosition'),
            uMVP: gl.getUniformLocation(prog, 'uMVP'),
            uColor: gl.getUniformLocation(prog, 'uColor'),
        };
    }

    function _cubeModel(cx, cy, cz, half) {
        var m = mat4.create();
        mat4.translate(m, m, [cx, cy, cz]);
        mat4.scale(m, m, [half * 2, half * 2, half * 2]); // 单位立方体半边 0.5 → ×(2*half)
        return m;
    }

    function _boxModel(min, max) {
        var m = mat4.create();
        mat4.translate(m, m, [(min[0]+max[0])/2, (min[1]+max[1])/2, (min[2]+max[2])/2]);
        mat4.scale(m, m, [(max[0]-min[0]), (max[1]-min[1]), (max[2]-min[2])]);
        return m;
    }

    // 主绘制。cullVP = 用于剔除的相机 VP（恒为主相机）；drawVP = 当前视口的 VP。
    // isGodView=true 时额外画八叉树盒子 + 被剔除物体(灰) + 剔除统计。
    function _draw(gl, drawVP, cullVP, isGodView) {
        if (!_program || !_cube || !_root) return;
        var p = _program;
        gl.useProgram(p.program);
        gl.bindBuffer(gl.ARRAY_BUFFER, _cube.position);
        gl.vertexAttribPointer(p.aPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(p.aPosition);

        // 用主相机 VP 做剔除
        var planes = _extractFrustumPlanes(cullVP);
        _stat.total = _objects.length; _stat.drawn = 0;
        _stat.nodes = 0; _stat.culledNodes = 0;
        for (var i = 0; i < _objects.length; i++) _objects[i].visible = false;
        var visObjs = [], boxes = [];
        _cullNode(_root, planes, visObjs, boxes);
        _stat.drawn = visObjs.length;

        // 1) 画通过剔除的物体（实体，按色板上色）
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, _cube.tri);
        for (var v = 0; v < visObjs.length; v++) {
            var o = visObjs[v];
            var mvp = mat4.create();
            mat4.multiply(mvp, drawVP, _cubeModel(o.x, o.y, o.z, o.half));
            gl.uniformMatrix4fv(p.uMVP, false, mvp);
            var col = COLORS[o.colorIdx];
            gl.uniform4f(p.uColor, col[0], col[1], col[2], 1.0);
            gl.drawElements(gl.TRIANGLES, _cube.triCount, gl.UNSIGNED_SHORT, 0);
        }

        // 上帝视角：画被剔除的物体(灰，半透明感)，让对比明显
        if (isGodView) {
            for (var k = 0; k < _objects.length; k++) {
                var ob = _objects[k];
                if (ob.visible) continue;
                var mvp2 = mat4.create();
                mat4.multiply(mvp2, drawVP, _cubeModel(ob.x, ob.y, ob.z, ob.half));
                gl.uniformMatrix4fv(p.uMVP, false, mvp2);
                gl.uniform4f(p.uColor, 0.35, 0.35, 0.38, 1.0);
                gl.drawElements(gl.TRIANGLES, _cube.triCount, gl.UNSIGNED_SHORT, 0);
            }

            // 2) 画八叉树节点盒子（线框）
            if (_showBoxes) {
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, _cube.wire);
                for (var b = 0; b < boxes.length; b++) {
                    var node = boxes[b];
                    var mvpb = mat4.create();
                    mat4.multiply(mvpb, drawVP, _boxModel(node.min, node.max));
                    gl.uniformMatrix4fv(p.uMVP, false, mvpb);
                    // 越深的节点颜色越亮
                    var t = node.depth / MAX_DEPTH;
                    gl.uniform4f(p.uColor, 0.3 + t * 0.6, 0.9 - t * 0.3, 0.4 + t * 0.4, 1.0);
                    gl.drawElements(gl.LINES, _cube.wireCount, gl.UNSIGNED_SHORT, 0);
                }
            }
        }
    }

    // ═══ 对外接口 ═══
    return {
        init: function (gl) {
            if (!_program) _program = _initShader(gl);
            if (!_cube) _cube = _initCube(gl);
            _genObjects();
            _buildOctree();
        },
        // drawVP=当前视口VP；cullVP=主相机VP(剔除依据)；isGodView 决定是否画盒子/灰块
        draw: function (gl, drawVP, cullVP, isGodView) { _draw(gl, drawVP, cullVP, isGodView); },
        setEnableCull: function (v) { _enableCull = v; },
        setShowBoxes: function (v) { _showBoxes = v; },
        getStat: function () { return _stat; },
    };
})();

// ── 全局包装函数：供 HTML 控件调用 ──
function updateOctreeOptions() {
    App.Octree.setEnableCull(document.getElementById('id_octree_cull').checked);
    App.Octree.setShowBoxes(document.getElementById('id_octree_boxes').checked);
    requestRender();
}