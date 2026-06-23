var App = App || {};

App.SkyBox = (function () {
    var _program = null;
    var _buffer = null;
    var _texture = null;

    // 立方体边界线（CubeMap 6 个面的接缝）相关
    var _edgeProgram = null;
    var _edgeBuffer = null;
    var _showEdge = false;   // 是否绘制 CubeMap 面的边界线

    const _quadVerts = [
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1,
    ];

    // 单位立方体 12 条棱的端点（每条棱 2 个顶点，共 24 个顶点）。
    // 这 12 条棱正好是 CubeMap 6 个面两两相接的边界。
    const _edgeVerts = [
        // 顶面 4 条
        -1,  1, -1,   1,  1, -1,
         1,  1, -1,   1,  1,  1,
         1,  1,  1,  -1,  1,  1,
        -1,  1,  1,  -1,  1, -1,
        // 底面 4 条
        -1, -1, -1,   1, -1, -1,
         1, -1, -1,   1, -1,  1,
         1, -1,  1,  -1, -1,  1,
        -1, -1,  1,  -1, -1, -1,
        // 竖直 4 条
        -1, -1, -1,  -1,  1, -1,
         1, -1, -1,   1,  1, -1,
         1, -1,  1,   1,  1,  1,
        -1, -1,  1,  -1,  1,  1,
    ];

    function _initShader(gl) {
        const vsSource = `
            attribute vec4 aPosition;
            varying vec4 vTexCoord;
            void main() {
                vTexCoord = aPosition;
                gl_Position = aPosition;
                gl_Position.z = 1.0;
            }
        `;
        const fsSource = `
            precision highp float;
            varying vec4 vTexCoord;
            uniform samplerCube uSkybox;
            uniform mat4 uViewDirectionProjectionInverse;
            void main() {
                vec4 t = uViewDirectionProjectionInverse * vTexCoord;
                gl_FragColor = textureCube(uSkybox, normalize(t.xyz / t.w));
            }
        `;
        const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
        const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
        const shaderProgram = gl.createProgram();
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
            },
            uniformLocations: {
                uSkybox: gl.getUniformLocation(shaderProgram, 'uSkybox'),
                uViewDirectionProjectionInverse: gl.getUniformLocation(shaderProgram, 'uViewDirectionProjectionInverse'),
            },
        };
    }

    function _initBuffer(gl) {
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(_quadVerts), gl.STATIC_DRAW);
        return {
            position: positionBuffer,
            vertexCount: _quadVerts.length / 2,
        };
    }

    // 边界线 shader：天空盒内部用 inverse(proj * inv(rot)) 从 NDC 反算世界方向，
    // 因此边界线要用 proj * inv(rot) 正算。两者是同一映射链的正反向，旋转时才对齐。
    function _initEdgeShader(gl) {
        const vsSource = `
            attribute vec4 aPosition;
            uniform mat4 uViewNoTrans;
            uniform mat4 uProjection;
            void main() {
                vec4 pos = uProjection * uViewNoTrans * aPosition;
                gl_Position = pos;
                gl_Position.z = pos.w;   // 贴到远平面，和天空盒一样
            }
        `;
        const fsSource = `
            precision mediump float;
            uniform vec4 uColor;
            void main() {
                gl_FragColor = uColor;
            }
        `;
        const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
        const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
        const shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            alert('Unable to initialize the skybox edge shader: ' + gl.getProgramInfoLog(shaderProgram));
            return null;
        }
        return {
            program: shaderProgram,
            attribLocations: {
                vertexPosition: gl.getAttribLocation(shaderProgram, 'aPosition'),
            },
            uniformLocations: {
                uViewNoTrans: gl.getUniformLocation(shaderProgram, 'uViewNoTrans'),
                uProjection: gl.getUniformLocation(shaderProgram, 'uProjection'),
                uColor: gl.getUniformLocation(shaderProgram, 'uColor'),
            },
        };
    }

    function _initEdgeBuffer(gl) {
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(_edgeVerts), gl.STATIC_DRAW);
        return {
            position: positionBuffer,
            vertexCount: _edgeVerts.length / 3,
        };
    }

    function _drawEdge(gl, programInfo, buffer, isGodView) {
        if (null == programInfo || !buffer) return;

        gl.useProgram(programInfo.program);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.position);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

        var viewMatrix = mat4.create();
        var projMatrix = mat4.create();
        if (isGodView) {
            viewMatrix = mat4.clone(mGodViewMatrix);
            projMatrix = mat4.clone(mGodProjectionMatrix);
        } else {
            viewMatrix = mat4.clone(mViewMatrix);
            projMatrix = mat4.clone(mProjectionMatrix);
        }
        // 天空盒内部用的是 inverse(view) 的旋转（去掉平移后），
        // 边界线也必须用同一套旋转映射，否则相机转动时线和纹理会对不齐。
        var viewInv = mat4.create();
        mat4.invert(viewInv, viewMatrix);
        viewInv[12] = viewInv[13] = viewInv[14] = 0;

        gl.uniformMatrix4fv(programInfo.uniformLocations.uViewNoTrans, false, viewInv);
        gl.uniformMatrix4fv(programInfo.uniformLocations.uProjection, false, projMatrix);
        gl.uniform4fv(programInfo.uniformLocations.uColor, [1.0, 0.85, 0.1, 1.0]);

        gl.drawArrays(gl.LINES, 0, buffer.vertexCount);
        gl.disableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    }


    function _draw(gl, programInfo, buffers, skyboxTexture, isGodView) {
        if (null == programInfo || !buffers || !skyboxTexture) {
            console.log('SkyBox.draw: missing program, buffer, or texture');
            return;
        }

        gl.useProgram(programInfo.program);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, skyboxTexture);
        gl.uniform1i(programInfo.uniformLocations.uSkybox, 0);

        // 矩阵计算（移除平移部分）
        var viewMatrix = mat4.create();
        var viewInverseMatrix = mat4.create();
        var projMatrix = mat4.create();
        if (isGodView) {
            viewMatrix = mat4.clone(mGodViewMatrix);
            mat4.invert(viewInverseMatrix, mGodViewMatrix);
            projMatrix = mat4.clone(mGodProjectionMatrix);
        } else {
            viewMatrix = mat4.clone(mViewMatrix);
            mat4.invert(viewInverseMatrix, mViewMatrix);
            projMatrix = mat4.clone(mProjectionMatrix);
        }
        viewMatrix[12] = viewMatrix[13] = viewMatrix[14] = 0;
        viewInverseMatrix[12] = 0;
        viewInverseMatrix[13] = 0;
        viewInverseMatrix[14] = 0;

        var viewDirectionProjectionMatrix = mat4.create();
        mat4.multiply(viewDirectionProjectionMatrix, projMatrix, viewInverseMatrix);
        var viewDirectionProjectionInverseMatrix = mat4.create();
        mat4.invert(viewDirectionProjectionInverseMatrix, viewDirectionProjectionMatrix);
        gl.uniformMatrix4fv(
            programInfo.uniformLocations.uViewDirectionProjectionInverse,
            false,
            viewDirectionProjectionInverseMatrix
        );

        gl.drawArrays(gl.TRIANGLES, 0, buffers.vertexCount);
        gl.disableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    }

    return {
        init: function (gl, onLoad) {
            _program = _initShader(gl);
            _buffer = _initBuffer(gl);
            _edgeProgram = _initEdgeShader(gl);
            _edgeBuffer = _initEdgeBuffer(gl);
            loadCubeMapTexture(gl, {
                posX: './texture/SkyBox/posX.png',
                negX: './texture/SkyBox/negX.png',
                posY: './texture/SkyBox/posY.png',
                negY: './texture/SkyBox/negY.png',
                posZ: './texture/SkyBox/posZ.png',
                negZ: './texture/SkyBox/negZ.png',
            }).then(function (texture) {
                _texture = texture;
                if (onLoad) onLoad();
            });
        },
        draw: function (gl, isGodView) {
            _draw(gl, _program, _buffer, _texture, isGodView);
            if (_showEdge) {
                _drawEdge(gl, _edgeProgram, _edgeBuffer, isGodView);
            }
        },
        setShowEdge: function (v) { _showEdge = v; },
    };
})();

// ── 全局包装函数，供 HTML checkbox 的 onchange 调用 ──
function updateSkyBoxOptions() {
    // "隐藏边界"勾选 = 不显示边界线，故取反
    App.SkyBox.setShowEdge(!document.getElementById('id_skybox_hide_edge').checked);
    requestRender();
}
