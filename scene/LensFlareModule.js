var App = App || {};

App.LensFlare = (function () {
    var _program = null;
    var _vboBuffer = null;
    var _textures = [];
    var _elements = [];

    const _quadVerts = new Float32Array([
        -0.5, -0.5,
         0.5, -0.5,
        -0.5,  0.5,
         0.5,  0.5
    ]);

    function _initShader(gl) {
        const vsSource = `
            attribute vec2 aPosition;
            attribute vec2 aTexCoord;
            varying vec2 vTexCoord;
            uniform vec2 uCenter;
            uniform vec2 uScale;
            uniform vec2 uResolution;
            void main() {
                vec2 screenPosition = aPosition * uScale + uCenter;
                screenPosition.x = screenPosition.x * 2.0 - 1.0;
                screenPosition.y = screenPosition.y * -2.0 + 1.0;
                gl_Position = vec4(screenPosition, 0.0, 1.0);
                vTexCoord = aTexCoord;
            }
        `;
        const fsSource = `
            precision mediump float;
            uniform sampler2D uTexture;
            uniform float uBrightness;
            varying vec2 vTexCoord;
            void main() {
                vec4 texColor = texture2D(uTexture, vTexCoord);
                gl_FragColor = texColor * uBrightness;
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
                textureCoord: gl.getAttribLocation(shaderProgram, 'aTexCoord'),
            },
            uniformLocations: {
                uCenterHandle: gl.getUniformLocation(shaderProgram, 'uCenter'),
                uScaleHandle: gl.getUniformLocation(shaderProgram, 'uScale'),
                uResolutionHandle: gl.getUniformLocation(shaderProgram, 'uResolution'),
                uTextureHandle: gl.getUniformLocation(shaderProgram, 'uTexture'),
                uBrightnessHandle: gl.getUniformLocation(shaderProgram, 'uBrightness'),
            },
        };
    }

    function _initBuffers(gl) {
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(_quadVerts), gl.STATIC_DRAW);

        const texCoords = new Float32Array([
            0.0, 0.0,
            1.0, 0.0,
            0.0, 1.0,
            1.0, 1.0
        ]);
        const uvBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

        return { position: positionBuffer, uv: uvBuffer };
    }

    function _renderOne(gl, buffers, flarePos, index, brightness) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
        gl.vertexAttribPointer(_program.attribLocations.vertexPosition, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(_program.attribLocations.vertexPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.uv);
        gl.vertexAttribPointer(_program.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(_program.attribLocations.textureCoord);

        gl.useProgram(_program.program);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, _elements[index].texture.texture);
        gl.uniform1i(_program.uniformLocations.uTextureHandle, 0);

        // flarePos 已经是该元素在屏幕上的正确中心位置
        gl.uniform2fv(_program.uniformLocations.uCenterHandle, flarePos);
        gl.uniform2fv(_program.uniformLocations.uScaleHandle, [_elements[index].scale, _elements[index].scale]);
        gl.uniform2fv(_program.uniformLocations.uResolutionHandle, [mViewportWidth, mViewportHeight]);
        gl.uniform1f(_program.uniformLocations.uBrightnessHandle, brightness);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        gl.disableVertexAttribArray(_program.attribLocations.vertexPosition);
        gl.disableVertexAttribArray(_program.attribLocations.textureCoord);
        gl.disable(gl.BLEND);
    }

    function _draw(gl) {
        if (!_program || !_vboBuffer || _elements.length === 0) return;

        // 计算方向光源屏幕坐标
        var modelViewMatrix = mat4.clone(mViewMatrix);
        const lightScreen = directionToScreenEdge(LIGHT_POSITION, modelViewMatrix, mProjectionMatrix);
        const screenCenter = [0.5, 0.5];
        const flareVec = [screenCenter[0] - lightScreen[0], screenCenter[1] - lightScreen[1]];
        const distance = Math.min(
            Math.sqrt(flareVec[0] * flareVec[0] + flareVec[1] * flareVec[1]),
            1.0
        );
        let brightness = 1.5 * (1 - distance);

        _renderOne(gl, _vboBuffer, lightScreen, 0, 1.0);
        if (brightness > 0.0) {
            for (let i = 1; i < _elements.length; i++) {
                const elementDir = [flareVec[0] * i * LENS_FLARE_SPACING, flareVec[1] * i * LENS_FLARE_SPACING];
                const flarePos = [lightScreen[0] + elementDir[0], lightScreen[1] + elementDir[1]];
                _renderOne(gl, _vboBuffer, flarePos, i, brightness);
            }
        }
    }

    return {
        init: function (gl, onLoad) {
            _program = _initShader(gl);
            _vboBuffer = _initBuffers(gl);
            _textures = [
                loadTextureByUrl(gl, './texture/LensFlare1/sun.png', onLoad),
                loadTextureByUrl(gl, './texture/LensFlare1/tex1.png', onLoad),
                loadTextureByUrl(gl, './texture/LensFlare1/tex2.png', onLoad),
                loadTextureByUrl(gl, './texture/LensFlare1/tex3.png', onLoad),
                loadTextureByUrl(gl, './texture/LensFlare1/tex4.png', onLoad),
                loadTextureByUrl(gl, './texture/LensFlare1/tex5.png', onLoad),
                loadTextureByUrl(gl, './texture/LensFlare1/tex6.png', onLoad),
                loadTextureByUrl(gl, './texture/LensFlare1/tex7.png', onLoad),
                loadTextureByUrl(gl, './texture/LensFlare1/tex8.png', onLoad),
                loadTextureByUrl(gl, './texture/LensFlare1/tex9.png', onLoad),
            ];
            _elements = [
                { texture: _textures[6], scale: 0.5 },
                { texture: _textures[4], scale: 0.23 },
                { texture: _textures[2], scale: 0.1 },
                { texture: _textures[7], scale: 0.05 },
                { texture: _textures[1], scale: 0.02 },
                { texture: _textures[3], scale: 0.06 },
                { texture: _textures[9], scale: 0.12 },
                { texture: _textures[5], scale: 0.07 },
                { texture: _textures[1], scale: 0.012 },
                { texture: _textures[7], scale: 0.2 },
                { texture: _textures[9], scale: 0.1 },
                { texture: _textures[3], scale: 0.07 },
                { texture: _textures[5], scale: 0.3 },
                { texture: _textures[4], scale: 0.4 },
                { texture: _textures[8], scale: 0.6 },
            ];
        },
        draw: function (gl) {
            _draw(gl);
        },
    };
})();
