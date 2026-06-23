var App = App || {};

// 菲涅尔边缘光 demo
// 一个大的球体 + 天空盒背景，用 Schlick 近似隔离演示菲涅尔反射。
//   fresnel = F0 + (1-F0) * (1 - N·V)^power
//
// 正对相机 (N·V≈1) → fresnel≈F0 → 中心接近基底色
// 斜看边缘 (N·V≈0) → fresnel≈1.0 → 边缘发光（"边缘光"/rim lighting）
//
// 控制：开关、F0 滑块、power 滑块、边缘光颜色。
App.Fresnel = (function () {
    var _program = null;
    var _sphereBuffer = null;

    // 默认参数
    var _enableFresnel = true;
    var _F0 = 0.04;           // 典型电介质值
    var _power = 5.0;         // Schlick 经典值
    var _rimColor = vec4.fromValues(0.3, 0.7, 1.0, 1.0);  // 冰蓝边缘光

    function _initShader(gl) {
        var vsSource = `
            attribute vec4 aPosition;
            attribute vec3 aNormal;
            uniform mat4 uModelMatrix;
            uniform mat4 uViewMatrix;
            uniform mat4 uProjectionMatrix;
            varying vec3 vWorldPos;
            varying vec3 vWorldNormal;
            void main() {
                vec4 worldPos = uModelMatrix * aPosition;
                gl_Position = uProjectionMatrix * uViewMatrix * worldPos;
                vWorldPos = worldPos.xyz;
                // 法线变换矩阵（模型仅位移+旋转+均匀缩放时 MIT = model）
                vWorldNormal = normalize(mat3(uModelMatrix) * aNormal);
            }
        `;
        var fsSource = `
            precision mediump float;
            uniform vec4 uBaseColor;
            uniform vec4 uRimColor;
            uniform float uF0;
            uniform float uPower;
            uniform float uEnable;
            uniform vec3 uViewPos;
            varying vec3 vWorldPos;
            varying vec3 vWorldNormal;
            void main() {
                vec3 N = normalize(vWorldNormal);
                vec3 V = normalize(uViewPos - vWorldPos);
                float NoV = abs(dot(N, V));           // 对背面也适用，形成环形光晕
                // Schlick Fresnel
                float fresnel = uF0 + (1.0 - uF0) * pow(1.0 - NoV, uPower);
                fresnel = clamp(fresnel, 0.0, 1.0);
                // 关闭菲涅尔时退化为纯基底色
                float f = mix(0.0, fresnel, uEnable);
                vec4 color = mix(uBaseColor, uRimColor, vec4(f));
                gl_FragColor = color;
            }
        `;
        var vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
        var fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
        var shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            alert('Fresnel shader init failed: ' + gl.getProgramInfoLog(shaderProgram));
            return null;
        }
        return {
            program: shaderProgram,
            attribLocations: {
                vertexPosition: gl.getAttribLocation(shaderProgram, 'aPosition'),
                normalPosition:  gl.getAttribLocation(shaderProgram, 'aNormal'),
            },
            uniformLocations: {
                uModelMatrix:  gl.getUniformLocation(shaderProgram, 'uModelMatrix'),
                uViewMatrix:   gl.getUniformLocation(shaderProgram, 'uViewMatrix'),
                uProjectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
                uBaseColor:    gl.getUniformLocation(shaderProgram, 'uBaseColor'),
                uRimColor:     gl.getUniformLocation(shaderProgram, 'uRimColor'),
                uF0:           gl.getUniformLocation(shaderProgram, 'uF0'),
                uPower:        gl.getUniformLocation(shaderProgram, 'uPower'),
                uEnable:       gl.getUniformLocation(shaderProgram, 'uEnable'),
                uViewPos:      gl.getUniformLocation(shaderProgram, 'uViewPos'),
            },
        };
    }

    function _draw(gl, programInfo, buffer, isGodView) {
        if (!programInfo || !buffer) return;

        var viewMatrix = isGodView ? mGodViewMatrix : mViewMatrix;
        var projMatrix = isGodView ? mGodProjectionMatrix : mProjectionMatrix;

        gl.useProgram(programInfo.program);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.position);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.normal);
        gl.vertexAttribPointer(programInfo.attribLocations.normalPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.normalPosition);

        gl.uniformMatrix4fv(programInfo.uniformLocations.uViewMatrix, false, viewMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.uProjectionMatrix, false, projMatrix);
        gl.uniform4fv(programInfo.uniformLocations.uBaseColor, [0.08, 0.08, 0.12, 1.0]);
        gl.uniform4fv(programInfo.uniformLocations.uRimColor, _rimColor);
        gl.uniform1f(programInfo.uniformLocations.uF0, _F0);
        gl.uniform1f(programInfo.uniformLocations.uPower, _power);
        gl.uniform1f(programInfo.uniformLocations.uEnable, _enableFresnel ? 1.0 : 0.0);

        // 相机位置从逆视图矩阵提取
        if (isGodView) {
            gl.uniform3fv(programInfo.uniformLocations.uViewPos,
                [mGodVIMatrix[12], mGodVIMatrix[13], mGodVIMatrix[14]]);
        } else {
            gl.uniform3fv(programInfo.uniformLocations.uViewPos,
                [mVIMatrix[12], mVIMatrix[13], mVIMatrix[14]]);
        }

        // 球体模型矩阵：应用当前拖拽旋转，让用户转动查看不同角度下的边缘光
        var modelMatrix = mat4.create();
        mat4.translate(modelMatrix, modelMatrix, [0.0, 0.0, -0.5]);   // 略微前移
        mat4.rotate(modelMatrix, modelMatrix, mRolling,  [0, 0, 1]);
        mat4.rotate(modelMatrix, modelMatrix, mYawing,   [0, 1, 0]);
        mat4.rotate(modelMatrix, modelMatrix, mPitching, [1, 0, 0]);
        mat4.rotate(modelMatrix, modelMatrix, mRotAngle, mRotAxis);
        gl.uniformMatrix4fv(programInfo.uniformLocations.uModelMatrix, false, modelMatrix);

        gl.drawArrays(gl.TRIANGLES, 0, buffer.drawCnt);

        gl.disableVertexAttribArray(programInfo.attribLocations.vertexPosition);
        gl.disableVertexAttribArray(programInfo.attribLocations.normalPosition);
    }

    return {
        init: function (gl) {
            _sphereBuffer = initSphereBuffers(gl, 1.3, 20, vec4.fromValues(1.0, 1.0, 1.0, 1.0));
            _program = _initShader(gl);
        },
        draw: function (gl, isGodView) {
            _draw(gl, _program, _sphereBuffer, isGodView);
        },
        setEnable:   function (v) { _enableFresnel = v; },
        setF0:       function (v) { _F0 = v; },
        setPower:    function (v) { _power = v; },
        setRimColor: function (r, g, b) { _rimColor[0] = r; _rimColor[1] = g; _rimColor[2] = b; },
    };
})();

// ── 全局包装函数 ──
function updateFresnelOptions() {
    var f0 = parseFloat(document.getElementById('id_fresnel_f0').value);
    var power = parseFloat(document.getElementById('id_fresnel_power').value);
    App.Fresnel.setEnable(document.getElementById('id_fresnel_enable').checked);
    App.Fresnel.setF0(f0);
    App.Fresnel.setPower(power);
    App.Fresnel.setRimColor(
        parseFloat(document.getElementById('id_fresnel_rim_r').value),
        parseFloat(document.getElementById('id_fresnel_rim_g').value),
        parseFloat(document.getElementById('id_fresnel_rim_b').value)
    );
    document.getElementById('label_fresnel_f0').innerHTML = f0.toFixed(2);
    document.getElementById('label_fresnel_power').innerHTML = power.toFixed(1);
    requestRender();
}