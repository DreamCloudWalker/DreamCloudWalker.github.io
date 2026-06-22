var App = App || {};

// 混合与透明排序 demo
// 5 个斜向交错、互不相交、深度各异的半透明球，
// 用三个独立开关演示透明渲染的三要素：开启混合 / 关闭深度写入 / 由远到近排序。
App.BlendSort = (function () {
    var _program = null;
    var _sphereBuffer = null;

    // 三个开关（默认：开混合、开深度写入、不排序 —— 先呈现"穿帮"错误效果）
    var _enableBlend = true;
    var _depthMask = true;
    var _sortByDepth = false;

    // 5 个半透明球：斜向交错排列，x/y/z 同向递增，深度各不相同且互不相交。
    // 相机在 (0,0,5) 沿 -z 看，half-fov=25°，这里把球收在 z_world 0→-4
    // （相机空间深度约 5→9）、横向 ±0.45 之内，保证含半径(0.7)后都落在视锥体内。
    var _spheres = [
        { pos: vec3.fromValues(-0.45, -0.45,  0.0), color: vec4.fromValues(1.0, 0.2, 0.2, 0.5) }, // 红，最近
        { pos: vec3.fromValues(-0.225, -0.225, -1.0), color: vec4.fromValues(1.0, 0.7, 0.1, 0.5) }, // 橙
        { pos: vec3.fromValues( 0.0,   0.0,  -2.0), color: vec4.fromValues(0.2, 0.8, 0.2, 0.5) }, // 绿，居中
        { pos: vec3.fromValues( 0.225,  0.225, -3.0), color: vec4.fromValues(0.2, 0.6, 1.0, 0.5) }, // 蓝
        { pos: vec3.fromValues( 0.45,  0.45, -4.0), color: vec4.fromValues(0.8, 0.3, 1.0, 0.5) }, // 紫，最远
    ];

    function _initShader(gl) {
        var vsSource = `
            attribute vec4 aPosition;
            attribute vec3 aNormal;
            uniform mat4 uModelMatrix;
            uniform mat4 uViewMatrix;
            uniform mat4 uProjectionMatrix;
            varying vec3 vNormal;
            void main() {
                gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * aPosition;
                // 球以原点为中心，顶点坐标即法线方向；只做旋转的话这里够用
                vNormal = normalize(mat3(uModelMatrix) * aNormal);
            }
        `;
        var fsSource = `
            precision mediump float;
            uniform vec4 uColor;
            uniform vec3 uLightDir;
            varying vec3 vNormal;
            void main() {
                float diff = max(dot(normalize(vNormal), normalize(uLightDir)), 0.0);
                float ambient = 0.35;
                vec3 rgb = uColor.rgb * (ambient + 0.65 * diff);
                gl_FragColor = vec4(rgb, uColor.a);
            }
        `;

        var vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
        var fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
        var shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
            return null;
        }
        return {
            program: shaderProgram,
            attribLocations: {
                vertexPosition: gl.getAttribLocation(shaderProgram, 'aPosition'),
                normalPosition: gl.getAttribLocation(shaderProgram, 'aNormal'),
            },
            uniformLocations: {
                uModelMatrix: gl.getUniformLocation(shaderProgram, 'uModelMatrix'),
                uViewMatrix: gl.getUniformLocation(shaderProgram, 'uViewMatrix'),
                uProjectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
                uColor: gl.getUniformLocation(shaderProgram, 'uColor'),
                uLightDir: gl.getUniformLocation(shaderProgram, 'uLightDir'),
            },
        };
    }

    function _draw(gl, programInfo, buffer, isGodView) {
        if (!programInfo || !buffer) return;

        var viewMatrix = isGodView ? mGodViewMatrix : mViewMatrix;
        var projMatrix = isGodView ? mGodProjectionMatrix : mProjectionMatrix;

        // 计算每个球在相机空间的深度（到相机的距离），用于排序
        var order = [];
        for (var i = 0; i < _spheres.length; i++) {
            var viewPos = vec4.fromValues(_spheres[i].pos[0], _spheres[i].pos[1], _spheres[i].pos[2], 1.0);
            vec4.transformMat4(viewPos, viewPos, viewMatrix);
            // 相机看向 -z，viewPos[2] 越小越远；记录 -z 作为"到相机距离"
            order.push({ index: i, dist: -viewPos[2] });
        }
        if (_sortByDepth) {
            // 由远到近：dist 大的（远）先画
            order.sort(function (a, b) { return b.dist - a.dist; });
        }

        gl.useProgram(programInfo.program);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.position);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.normal);
        gl.vertexAttribPointer(programInfo.attribLocations.normalPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.normalPosition);

        gl.uniformMatrix4fv(programInfo.uniformLocations.uViewMatrix, false, viewMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.uProjectionMatrix, false, projMatrix);
        gl.uniform3fv(programInfo.uniformLocations.uLightDir, LIGHT_POSITION);

        // 主视角按教学开关演示透明排序；上帝视角是"看真相"的辅助视角，
        // 强制"实心 + 写深度"，真实显示 5 个球的空间位置与前后遮挡关系
        // （否则主视角关掉深度写入时，不写深度的球会被后画的不透明远裁剪面覆盖）。
        var blendOn = isGodView ? false : _enableBlend;
        var depthWrite = isGodView ? true : _depthMask;

        // 开关：混合
        if (blendOn) {
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        } else {
            gl.disable(gl.BLEND);
        }
        // 开关：深度写入
        gl.depthMask(depthWrite);

        var modelMatrix = mat4.create();
        for (var k = 0; k < order.length; k++) {
            var sphere = _spheres[order[k].index];
            mat4.identity(modelMatrix);
            mat4.translate(modelMatrix, modelMatrix, sphere.pos);
            gl.uniformMatrix4fv(programInfo.uniformLocations.uModelMatrix, false, modelMatrix);
            gl.uniform4fv(programInfo.uniformLocations.uColor, sphere.color);
            gl.drawArrays(gl.TRIANGLES, 0, buffer.drawCnt);
        }

        // 恢复默认状态，避免污染后续渲染
        gl.depthMask(true);
        gl.disable(gl.BLEND);
        gl.disableVertexAttribArray(programInfo.attribLocations.vertexPosition);
        gl.disableVertexAttribArray(programInfo.attribLocations.normalPosition);
    }

    return {
        init: function (gl) {
            _sphereBuffer = initSphereBuffers(gl, 0.7, 20, vec4.fromValues(1.0, 1.0, 1.0, 1.0));
            _program = _initShader(gl);
        },
        draw: function (gl, isGodView) {
            _draw(gl, _program, _sphereBuffer, isGodView);
        },
        setEnableBlend: function (v) { _enableBlend = v; },
        setDepthMask: function (v) { _depthMask = v; },
        setSortByDepth: function (v) { _sortByDepth = v; },
    };
})();

// ── 全局包装函数，供 HTML checkbox 的 onchange 调用 ──
function updateBlendSortOptions() {
    App.BlendSort.setEnableBlend(document.getElementById('id_blend_enable').checked);
    App.BlendSort.setDepthMask(document.getElementById('id_blend_depth_mask').checked);
    App.BlendSort.setSortByDepth(document.getElementById('id_blend_sort_far_to_near').checked);
    requestRender();
}
