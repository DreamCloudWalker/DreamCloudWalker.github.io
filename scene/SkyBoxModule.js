var App = App || {};

App.SkyBox = (function () {
    var _program = null;
    var _buffer = null;
    var _texture = null;

    const _quadVerts = [
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1,
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
        },
    };
})();
