var App = App || {};

// 细分着色器（Tessellation Shader）演示 —— 多面体细分成球
// ⚠️ WebGL 1/2 都没有细分着色器（和几何着色器一样从未进入规范）。本 Demo 用 CPU
//    递归细分来模拟它的核心思想：
//    从一个粗糙的"控制网格"(低面数二十面体) 出发，按"细分级别"把每个三角形切成更小的
//    三角形(细分器)，再把每个新顶点投影到球面上算出它的最终位置(求值着色器 TES) ——
//    级别越高，棱角分明的多面体就越逼近一个光滑的球。
//
// 对应真实管线：
//   细分级别滑块      = TCS(控制着色器) 决定每个面片细分多少；
//   把三角形切成 4^n  = 固定功能细分器；
//   顶点归一化到球面  = TES(求值着色器) 求每个新顶点在光滑曲面上的位置。
App.Tessellation = (function () {
    var _meshProgram = null;
    var _lineProgram = null;
    var _solid = null;   // { position, normal, drawCnt }  当前级别的实体三角形
    var _wire = null;    // { position, drawCnt }          线框（每三角形 3 条边）

    var _level = 2;          // 细分级别 0..4
    var _project = true;     // 是否把新顶点投影到球面（TES 求值）
    var _showWire = true;
    var _radius = 1.3;
    var _triCount = 0;

    // ── 二十面体的 12 顶点 + 20 三角形（控制网格）──
    var T = 0.8506508, S = 0.5257311;  // 黄金比例归一化坐标
    var _icoVerts = [
        [0, T, -S], [0, T, S], [T, S, 0], [S, 0, -T], [-S, 0, -T], [-T, S, 0],
        [-S, 0, T], [S, 0, T], [T, -S, 0], [0, -T, -S], [-T, -S, 0], [0, -T, S],
    ];
    var _icoTris = [
        [0,1,2],[0,2,3],[0,3,4],[0,4,5],[0,5,1],
        [1,6,7],[1,7,2],[2,7,8],[2,8,3],[3,8,9],[3,9,4],[4,9,10],[4,10,5],[5,10,6],[5,6,1],
        [6,11,7],[7,11,8],[8,11,9],[9,11,10],[10,11,6],
    ];

    function _norm(v) {
        var l = Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2]) || 1;
        return [v[0]/l, v[1]/l, v[2]/l];
    }
    function _mid(a, b) { return [(a[0]+b[0])/2, (a[1]+b[1])/2, (a[2]+b[2])/2]; }

    // ── CPU 模拟"细分器 + TES"：把每个三角形按 level 递归 4 分，新顶点可投影到球面 ──
    // 返回 {pos, nrm}（非索引三角形，pos/nrm 平铺）。
    function _tessellate(level, project, radius) {
        // 控制网格的三角形（顶点取自 _icoVerts）
        var tris = _icoTris.map(function (t) {
            return [ _icoVerts[t[0]], _icoVerts[t[1]], _icoVerts[t[2]] ];
        });

        // 细分器：每细一级，1 个三角形 → 4 个（取三边中点）
        for (var s = 0; s < level; s++) {
            var next = [];
            for (var i = 0; i < tris.length; i++) {
                var a = tris[i][0], b = tris[i][1], c = tris[i][2];
                var ab = _mid(a, b), bc = _mid(b, c), ca = _mid(c, a);
                next.push([a, ab, ca]);
                next.push([ab, b, bc]);
                next.push([ca, bc, c]);
                next.push([ab, bc, ca]);
            }
            tris = next;
        }

        // TES 求值：把每个顶点的最终位置算出来。
        // project=true → 归一化到单位球再乘半径（光滑曲面）；false → 保持线性中点（仍是多面体）
        var pos = [], nrm = [];
        for (var k = 0; k < tris.length; k++) {
            var tri = tris[k];
            for (var v = 0; v < 3; v++) {
                var p = tri[v];
                if (project) {
                    var d = _norm(p);
                    pos.push(d[0]*radius, d[1]*radius, d[2]*radius);
                    nrm.push(d[0], d[1], d[2]);  // 球面法线=方向
                } else {
                    pos.push(p[0]*radius, p[1]*radius, p[2]*radius);
                    // 不投影时用面法线（在 _buildBuffers 里按面算）；先占位，下面统一处理
                    nrm.push(0, 0, 0);
                }
            }
        }
        // 不投影：用面法线（每个三角形 3 个顶点同一法线），体现"硬棱角多面体"
        if (!project) {
            for (var f = 0; f < pos.length; f += 9) {
                var ax=pos[f],ay=pos[f+1],az=pos[f+2];
                var bx=pos[f+3],by=pos[f+4],bz=pos[f+5];
                var cx=pos[f+6],cy=pos[f+7],cz=pos[f+8];
                var nx=(by-ay)*(cz-az)-(bz-az)*(cy-ay);
                var ny=(bz-az)*(cx-ax)-(bx-ax)*(cz-az);
                var nz=(bx-ax)*(cy-ay)-(by-ay)*(cx-ax);
                var nl=Math.sqrt(nx*nx+ny*ny+nz*nz)||1; nx/=nl;ny/=nl;nz/=nl;
                for (var q = 0; q < 3; q++){ nrm[f+q*3]=nx; nrm[f+q*3+1]=ny; nrm[f+q*3+2]=nz; }
            }
        }
        return { pos: pos, nrm: nrm };
    }

    // 由三角形 pos 生成线框（每三角形 3 条边）
    function _wireFromTris(pos) {
        var w = [];
        for (var i = 0; i < pos.length; i += 9) {
            var a=[pos[i],pos[i+1],pos[i+2]], b=[pos[i+3],pos[i+4],pos[i+5]], c=[pos[i+6],pos[i+7],pos[i+8]];
            w.push(a[0],a[1],a[2], b[0],b[1],b[2]);
            w.push(b[0],b[1],b[2], c[0],c[1],c[2]);
            w.push(c[0],c[1],c[2], a[0],a[1],a[2]);
        }
        return w;
    }

    function _buf(gl, arr) {
        var b = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, b);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW);
        return b;
    }

    function _rebuild(gl) {
        var t = _tessellate(_level, _project, _radius);
        if (_solid) { gl.deleteBuffer(_solid.position); gl.deleteBuffer(_solid.normal); }
        if (_wire) gl.deleteBuffer(_wire.position);
        _solid = { position: _buf(gl, t.pos), normal: _buf(gl, t.nrm), drawCnt: t.pos.length / 3 };
        var warr = _wireFromTris(t.pos);
        _wire = { position: _buf(gl, warr), drawCnt: warr.length / 3 };
        _triCount = t.pos.length / 9;
    }

    function _initMeshShader(gl) {
        var vs = `
            attribute vec4 aPosition;
            attribute vec3 aNormal;
            uniform mat4 uModel, uView, uProj;
            varying vec3 vNormal;
            void main() {
                gl_Position = uProj * uView * uModel * aPosition;
                vNormal = mat3(uModel) * aNormal;
            }
        `;
        var fs = `
            precision mediump float;
            uniform vec3 uLightDir;
            varying vec3 vNormal;
            void main() {
                vec3 N = normalize(vNormal);
                float diff = max(dot(N, normalize(uLightDir)), 0.0);
                vec3 base = vec3(0.45, 0.62, 0.85);
                gl_FragColor = vec4(base * (0.35 + 0.65 * diff), 1.0);
            }
        `;
        return _link(gl, vs, fs, ['aPosition','aNormal'], ['uModel','uView','uProj','uLightDir']);
    }

    function _initLineShader(gl) {
        var vs = `
            attribute vec4 aPosition;
            uniform mat4 uModel, uView, uProj;
            void main() { gl_Position = uProj * uView * uModel * aPosition; }
        `;
        var fs = `
            precision mediump float;
            uniform vec4 uColor;
            void main() { gl_FragColor = uColor; }
        `;
        return _link(gl, vs, fs, ['aPosition'], ['uModel','uView','uProj','uColor']);
    }

    function _link(gl, vsSrc, fsSrc, attribs, uniforms) {
        var vsh = loadShader(gl, gl.VERTEX_SHADER, vsSrc);
        var fsh = loadShader(gl, gl.FRAGMENT_SHADER, fsSrc);
        var prog = gl.createProgram();
        gl.attachShader(prog, vsh); gl.attachShader(prog, fsh); gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            alert('Tessellation demo link failed: ' + gl.getProgramInfoLog(prog));
            return null;
        }
        var info = { program: prog, a: {}, u: {} };
        attribs.forEach(function (n) { info.a[n] = gl.getAttribLocation(prog, n); });
        uniforms.forEach(function (n) { info.u[n] = gl.getUniformLocation(prog, n); });
        return info;
    }

    function _modelMatrix() {
        var m = mat4.create();
        mat4.rotate(m, m, mRolling,  [0, 0, 1]);
        mat4.rotate(m, m, mYawing,   [0, 1, 0]);
        mat4.rotate(m, m, mPitching, [1, 0, 0]);
        mat4.rotate(m, m, mRotAngle, mRotAxis);
        return m;
    }

    function _draw(gl, isGodView) {
        if (!_meshProgram || !_lineProgram || !_solid) return;
        var view = isGodView ? mGodViewMatrix : mViewMatrix;
        var proj = isGodView ? mGodProjectionMatrix : mProjectionMatrix;
        var model = _modelMatrix();
        var L = (typeof LIGHT_POSITION !== 'undefined') ? LIGHT_POSITION : [0.5, 1.0, 0.5];

        // 1) 实体
        var mp = _meshProgram;
        gl.useProgram(mp.program);
        gl.bindBuffer(gl.ARRAY_BUFFER, _solid.position);
        gl.vertexAttribPointer(mp.a.aPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(mp.a.aPosition);
        gl.bindBuffer(gl.ARRAY_BUFFER, _solid.normal);
        gl.vertexAttribPointer(mp.a.aNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(mp.a.aNormal);
        gl.uniformMatrix4fv(mp.u.uModel, false, model);
        gl.uniformMatrix4fv(mp.u.uView, false, view);
        gl.uniformMatrix4fv(mp.u.uProj, false, proj);
        gl.uniform3fv(mp.u.uLightDir, L);
        gl.drawArrays(gl.TRIANGLES, 0, _solid.drawCnt);

        // 2) 线框（看清细分出的小三角形）
        if (_showWire) {
            var lp = _lineProgram;
            gl.useProgram(lp.program);
            gl.uniformMatrix4fv(lp.u.uModel, false, model);
            gl.uniformMatrix4fv(lp.u.uView, false, view);
            gl.uniformMatrix4fv(lp.u.uProj, false, proj);
            gl.uniform4fv(lp.u.uColor, [0.1, 0.12, 0.16, 1.0]);
            gl.bindBuffer(gl.ARRAY_BUFFER, _wire.position);
            gl.vertexAttribPointer(lp.a.aPosition, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(lp.a.aPosition);
            gl.drawArrays(gl.LINES, 0, _wire.drawCnt);
        }
    }

    return {
        init: function (gl) {
            _meshProgram = _initMeshShader(gl);
            _lineProgram = _initLineShader(gl);
            _rebuild(gl);
        },
        draw: function (gl, isGodView) { _draw(gl, isGodView); },
        setLevel:   function (gl, v) { _level = v; _rebuild(gl); },
        setProject: function (gl, v) { _project = v; _rebuild(gl); },
        setShowWire: function (v) { _showWire = v; },
        getTriCount: function () { return _triCount; },
    };
})();

// ── 全局包装函数，供 HTML 控件调用 ──
function updateTessellationOptions() {
    var gl = mGLCanvas.getGL();
    var lv = parseInt(document.getElementById('id_tess_level').value, 10);
    App.Tessellation.setLevel(gl, lv);
    App.Tessellation.setProject(gl, document.getElementById('id_tess_project').checked);
    App.Tessellation.setShowWire(document.getElementById('id_tess_wire').checked);
    document.getElementById('label_tess_level').innerHTML = lv;
    var el = document.getElementById('id_tess_tricount');
    if (el) el.innerHTML = App.Tessellation.getTriCount().toLocaleString();
    requestRender();
}

