var App = App || {};

// 几何着色器（Geometry Shader）演示 —— 法线可视化
// ⚠️ WebGL 1/2 都没有几何着色器，本 Demo 用 CPU 预生成"法线线段几何"来模拟它最经典的
//    教学用途：几何着色器逐图元运行，可在顶点之后、光栅化之前"凭空生成新图元"。
//    典型例子就是给网格每个顶点/每个面额外吐出一根表示法线方向的线段。
//
// 这里：一个球体（实体着色）+ 叠加显示从表面伸出的法线短线（红=顶点法线 / 黄=面法线）。
// 真实管线里这些线段是几何着色器在 GPU 上即时生成的；WebGL 没有该阶段，故在 init 时
// 用 CPU 把线段顶点算好放进 VBO，再用 gl.LINES 画出来 —— 视觉效果与教学含义一致。
App.GeometryShader = (function () {
    var _meshProgram = null;   // 球体实体着色
    var _lineProgram = null;   // 法线线段（纯色）
    var _sphere = null;        // { position, normal, drawCnt }
    var _vertNormalLines = null; // 顶点法线线段 buffer
    var _faceNormalLines = null; // 面法线线段 buffer

    var _showMesh = true;
    var _normalMode = 0;       // 0=顶点法线 1=面法线
    var _normalLen = 0.25;     // 法线线段长度（占半径比例，重建时用）
    var _radius = 1.3;

    // ── 球体几何（经纬细分，返回 position/normal 平铺数组）──
    function _genSphere(radius, segLat, segLon) {
        var pos = [], nrm = [];
        for (var i = 0; i < segLat; i++) {
            var lat0 = Math.PI * (i / segLat - 0.5);
            var lat1 = Math.PI * ((i + 1) / segLat - 0.5);
            for (var j = 0; j < segLon; j++) {
                var lon0 = 2 * Math.PI * (j / segLon);
                var lon1 = 2 * Math.PI * ((j + 1) / segLon);
                // 四个角的方向向量（即单位法线）
                var p00 = _sph(lat0, lon0), p01 = _sph(lat0, lon1);
                var p10 = _sph(lat1, lon0), p11 = _sph(lat1, lon1);
                _pushTri(pos, nrm, radius, p00, p10, p11);
                _pushTri(pos, nrm, radius, p00, p11, p01);
            }
        }
        return { pos: pos, nrm: nrm };
    }
    function _sph(lat, lon) {
        var cl = Math.cos(lat);
        return [cl * Math.cos(lon), Math.sin(lat), cl * Math.sin(lon)];
    }
    function _pushTri(pos, nrm, r, a, b, c) {
        [a, b, c].forEach(function (d) {
            pos.push(d[0] * r, d[1] * r, d[2] * r);
            nrm.push(d[0], d[1], d[2]); // 单位球方向即法线
        });
    }

    // ── CPU 模拟"几何着色器"：根据球体三角形生成法线线段 ──
    // 顶点法线：每个顶点一根线段（position → position + N*len）。
    // 面法线：每个三角形质心一根线段（centroid → centroid + faceN*len）。
    function _genNormalLines(sphere) {
        var pos = sphere.pos, nrm = sphere.nrm;
        var vCount = pos.length / 3;
        var len = _radius * _normalLen;

        // 顶点法线线段
        var vLines = [];
        for (var i = 0; i < vCount; i++) {
            var px = pos[i*3], py = pos[i*3+1], pz = pos[i*3+2];
            var nx = nrm[i*3], ny = nrm[i*3+1], nz = nrm[i*3+2];
            vLines.push(px, py, pz);
            vLines.push(px + nx * len, py + ny * len, pz + nz * len);
        }

        // 面法线线段（每 3 个顶点一组三角形）
        var fLines = [];
        for (var t = 0; t < vCount; t += 3) {
            var ax = pos[t*3],     ay = pos[t*3+1],     az = pos[t*3+2];
            var bx = pos[(t+1)*3], by = pos[(t+1)*3+1], bz = pos[(t+1)*3+2];
            var cx = pos[(t+2)*3], cy = pos[(t+2)*3+1], cz = pos[(t+2)*3+2];
            var ccx = (ax+bx+cx)/3, ccy = (ay+by+cy)/3, ccz = (az+bz+cz)/3;
            // 面法线 = (b-a) × (c-a)
            var e1x=bx-ax, e1y=by-ay, e1z=bz-az;
            var e2x=cx-ax, e2y=cy-ay, e2z=cz-az;
            var fnx = e1y*e2z - e1z*e2y;
            var fny = e1z*e2x - e1x*e2z;
            var fnz = e1x*e2y - e1y*e2x;
            var fl = Math.sqrt(fnx*fnx+fny*fny+fnz*fnz) || 1;
            fnx/=fl; fny/=fl; fnz/=fl;
            fLines.push(ccx, ccy, ccz);
            fLines.push(ccx + fnx*len, ccy + fny*len, ccz + fnz*len);
        }
        return { vLines: vLines, fLines: fLines };
    }

    function _makeLineBuffer(gl, arr) {
        var b = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, b);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW);
        return { position: b, drawCnt: arr.length / 3 };
    }

    // 重建法线线段（改长度/初始化时）
    function _rebuildLines(gl, sphereRaw) {
        if (_vertNormalLines) gl.deleteBuffer(_vertNormalLines.position);
        if (_faceNormalLines) gl.deleteBuffer(_faceNormalLines.position);
        var lines = _genNormalLines(sphereRaw);
        _vertNormalLines = _makeLineBuffer(gl, lines.vLines);
        _faceNormalLines = _makeLineBuffer(gl, lines.fLines);
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
                vec3 base = vec3(0.55, 0.6, 0.7);
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
            alert('GeometryShader demo link failed: ' + gl.getProgramInfoLog(prog));
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
        if (!_meshProgram || !_lineProgram || !_sphere) return;
        var view = isGodView ? mGodViewMatrix : mViewMatrix;
        var proj = isGodView ? mGodProjectionMatrix : mProjectionMatrix;
        var model = _modelMatrix();
        var L = (typeof LIGHT_POSITION !== 'undefined') ? LIGHT_POSITION : [0.5, 1.0, 0.5];

        // 1) 球体实体
        if (_showMesh) {
            var mp = _meshProgram;
            gl.useProgram(mp.program);
            gl.bindBuffer(gl.ARRAY_BUFFER, _sphere.position);
            gl.vertexAttribPointer(mp.a.aPosition, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(mp.a.aPosition);
            gl.bindBuffer(gl.ARRAY_BUFFER, _sphere.normal);
            gl.vertexAttribPointer(mp.a.aNormal, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(mp.a.aNormal);
            gl.uniformMatrix4fv(mp.u.uModel, false, model);
            gl.uniformMatrix4fv(mp.u.uView, false, view);
            gl.uniformMatrix4fv(mp.u.uProj, false, proj);
            gl.uniform3fv(mp.u.uLightDir, L);
            gl.drawArrays(gl.TRIANGLES, 0, _sphere.drawCnt);
        }

        // 2) 法线线段（模拟几何着色器生成的额外图元）
        var lp = _lineProgram;
        gl.useProgram(lp.program);
        gl.uniformMatrix4fv(lp.u.uModel, false, model);
        gl.uniformMatrix4fv(lp.u.uView, false, view);
        gl.uniformMatrix4fv(lp.u.uProj, false, proj);
        var lines = (_normalMode === 1) ? _faceNormalLines : _vertNormalLines;
        var color = (_normalMode === 1) ? [0.95, 0.85, 0.2, 1.0] : [0.95, 0.3, 0.25, 1.0];
        gl.uniform4fv(lp.u.uColor, color);
        gl.bindBuffer(gl.ARRAY_BUFFER, lines.position);
        gl.vertexAttribPointer(lp.a.aPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(lp.a.aPosition);
        gl.drawArrays(gl.LINES, 0, lines.drawCnt);
    }

    var _sphereRaw = null;

    return {
        init: function (gl) {
            _meshProgram = _initMeshShader(gl);
            _lineProgram = _initLineShader(gl);
            // 用较粗的细分，面/顶点法线条数适中、看得清
            _sphereRaw = _genSphere(_radius, 14, 24);
            var posBuf = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(_sphereRaw.pos), gl.STATIC_DRAW);
            var nrmBuf = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, nrmBuf);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(_sphereRaw.nrm), gl.STATIC_DRAW);
            _sphere = { position: posBuf, normal: nrmBuf, drawCnt: _sphereRaw.pos.length / 3 };
            _rebuildLines(gl, _sphereRaw);
        },
        draw: function (gl, isGodView) { _draw(gl, isGodView); },
        setShowMesh: function (v) { _showMesh = v; },
        setNormalMode: function (m) { _normalMode = m; },
        setNormalLen: function (gl, v) { _normalLen = v; if (_sphereRaw) _rebuildLines(gl, _sphereRaw); },
    };
})();

// ── 全局包装函数，供 HTML 控件调用 ──
function updateGeometryShaderOptions() {
    var gl = mGLCanvas.getGL();
    App.GeometryShader.setShowMesh(document.getElementById('id_gs_mesh').checked);
    App.GeometryShader.setNormalMode(document.getElementById('id_gs_face').checked ? 1 : 0);
    var len = parseFloat(document.getElementById('id_gs_len').value);
    App.GeometryShader.setNormalLen(gl, len);
    document.getElementById('label_gs_len').innerHTML = len.toFixed(2);
    requestRender();
}

