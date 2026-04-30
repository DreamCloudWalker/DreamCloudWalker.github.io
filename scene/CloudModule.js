var App = App || {};

App.Cloud = (function () {
    var _program = null;
    var _buffer = null;
    var _texture = null;

    var _vertices = [];
    var _uvs = [];

    function _initShader(gl) {
        const vsSource = `
            attribute vec4 aPosition;
            attribute vec2 aTexCoord;
            uniform mat4 uMVPMatrix;
            varying lowp vec2 vTexCoord;
            void main() {
                gl_Position = uMVPMatrix * aPosition;
                vTexCoord = aTexCoord;
            }
        `;
        const fsSource = `
            precision mediump float;
            uniform sampler2D uTexSampler;
            uniform float uFogNear;
            uniform float uFogFar;
            varying lowp vec2 vTexCoord;
            void main() {
                vec3 fogColor = vec3(0.27, 0.52, 0.71);
                float depth = gl_FragCoord.z / gl_FragCoord.w;
                float fogFactor = smoothstep(uFogNear, uFogFar, depth);
                gl_FragColor = texture2D(uTexSampler, vTexCoord);
                gl_FragColor.w *= pow(gl_FragCoord.z, 20.0);
                gl_FragColor = vec4(fogColor, gl_FragColor.w);
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
                uMVPMatrixHandle: gl.getUniformLocation(shaderProgram, 'uMVPMatrix'),
                uTexSamplerHandle: gl.getUniformLocation(shaderProgram, 'uTexSampler'),
                uFogNearHandle: gl.getUniformLocation(shaderProgram, 'uFogNear'),
                uFogFarHandle: gl.getUniformLocation(shaderProgram, 'uFogFar'),
            },
        };
    }

    function _initBuffer(gl) {
        const vertexCoords = [
            [-1.0, -1.0, -3.0],
            [ 1.0, -1.0, -3.0],
            [-1.0,  1.0, -3.0],
            [ 1.0,  1.0, -3.0],
        ];
        _vertices = [];
        for (var j = 0; j < vertexCoords.length; ++j) {
            _vertices = _vertices.concat(vertexCoords[j]);
        }

        const uvCoords = [0.0, 1.0, 1.0, 1.0, 0.0, 0.0, 1.0, 0.0];
        _uvs = [];
        for (var i = 0; i < uvCoords.length; i++) {
            _uvs.push(uvCoords[i]);
        }

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(_vertices), gl.STATIC_DRAW);

        const uvBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(_uvs), gl.STATIC_DRAW);

        return {
            position: positionBuffer,
            uv: uvBuffer,
            drawCnt: _vertices.length / 3,
        };
    }

    function _draw(gl, program, buffers, texture, drawCount, deltaTime, isGodView) {
        {
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
            gl.vertexAttribPointer(program.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(program.attribLocations.vertexPosition);
        }
        {
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.uv);
            gl.vertexAttribPointer(program.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(program.attribLocations.textureCoord);
        }

        gl.useProgram(program.program);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(program.uniformLocations.uTexSamplerHandle, 0);
        gl.uniform1f(program.uniformLocations.uFogNearHandle, -100);
        gl.uniform1f(program.uniformLocations.uFogFarHandle, 3000);

        if (isGodView) {
            gl.uniformMatrix4fv(program.uniformLocations.uMVPMatrixHandle, false, mGodMvpMatrix);
        } else {
            gl.uniformMatrix4fv(program.uniformLocations.uMVPMatrixHandle, false, mMvpMatrix);
        }
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, drawCount);
    }

    return {
        init: function (gl, onLoad) {
            _program = _initShader(gl);
            _buffer = _initBuffer(gl);
            _texture = loadTexture(gl, './texture/cloud.png', onLoad);
        },
        draw: function (gl, deltaTime, isGodView) {
            if (!_program || !_buffer || !_texture) return;
            _draw(gl, _program, _buffer, _texture, _buffer.drawCnt, deltaTime, isGodView);
        },
    };
})();
