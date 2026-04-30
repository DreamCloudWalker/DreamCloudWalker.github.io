var App = App || {};

App.Terrain = (function () {
    var _buffer = null;
    var _texture = null;

    function _initBuffer(gl) {
        const vertexCoords = [
            [-50.0, -3.0, -50.0],
            [ 50.0, -3.0, -50.0],
            [-50.0, -3.0,  50.0],
            [ 50.0, -3.0,  50.0],
        ];
        let vertices = [];
        for (var j = 0; j < vertexCoords.length; ++j) {
            vertices = vertices.concat(vertexCoords[j]);
        }

        const normalCoords = [
            [0.0, 1.0, 0.0],
            [0.0, 1.0, 0.0],
            [0.0, 1.0, 0.0],
            [0.0, 1.0, 0.0],
        ];
        let normals = [];
        for (var j = 0; j < normalCoords.length; ++j) {
            normals = normals.concat(normalCoords[j]);
        }

        const uvCoords = [0.0, 10.0, 10.0, 10.0, 0.0, 0.0, 10.0, 0.0];
        let uvs = [];
        for (var i = 0; i < uvCoords.length; i++) {
            uvs.push(uvCoords[i]);
        }

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

        const normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

        const uvBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);

        return {
            position: positionBuffer,
            normal: normalBuffer,
            uv: uvBuffer,
            drawCnt: vertices.length / 3,
        };
    }

    // share fighter object's mvp
    function _draw(gl, lightingProgram, shadowProgram, buffers, diffuseTexture, drawCount, deltaTime, isDrawShadow, isGodView) {
        if (isDrawShadow && null != shadowProgram) {
            {
                gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
                gl.vertexAttribPointer(shadowProgram.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(shadowProgram.attribLocations.vertexPosition);
            }
            gl.useProgram(shadowProgram.program);
            mat4.multiply(mMvpMatrixByLightCoord, mVpMatrixByLightCoord, mModelMatrix);
            gl.uniformMatrix4fv(shadowProgram.uniformLocations.uMVPMatrixHandle, false, mMvpMatrixByLightCoord);
        } else {
            {
                gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
                gl.vertexAttribPointer(lightingProgram.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(lightingProgram.attribLocations.vertexPosition);
            }
            {
                gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
                gl.vertexAttribPointer(lightingProgram.attribLocations.normalPosition, 3, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(lightingProgram.attribLocations.normalPosition);
            }
            {
                gl.bindBuffer(gl.ARRAY_BUFFER, buffers.uv);
                gl.vertexAttribPointer(lightingProgram.attribLocations.textureCoord, 2, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(lightingProgram.attribLocations.textureCoord);
            }

            gl.useProgram(lightingProgram.program);

            var mvpMatrix = isGodView ? mGodMvpMatrix : mMvpMatrix;
            var mitMatrix = mat4.create();
            mat4.invert(mitMatrix, mModelMatrix);
            mat4.transpose(mitMatrix, mitMatrix);

            gl.uniformMatrix4fv(lightingProgram.uniformLocations.uProjectionMatrixHandle, false, mProjectionMatrix);
            gl.uniformMatrix4fv(lightingProgram.uniformLocations.uModelMatrixHandle, false, mModelMatrix);
            gl.uniformMatrix4fv(lightingProgram.uniformLocations.uViewMatrixHandle, false, mViewMatrix);
            gl.uniformMatrix4fv(lightingProgram.uniformLocations.uVIHandle, false, mVIMatrix);
            gl.uniformMatrix4fv(lightingProgram.uniformLocations.uMITHandle, false, mitMatrix);
            gl.uniformMatrix4fv(lightingProgram.uniformLocations.uVpMatrixByLightCoordHandle, false, mVpMatrixByLightCoord);

            gl.uniform3fv(lightingProgram.uniformLocations.uLightDirHandle, LIGHT_POSITION);
            gl.uniform4fv(lightingProgram.uniformLocations.uKaHandle, mAmbientColor);
            gl.uniform4fv(lightingProgram.uniformLocations.uKdHandle, mDiffuseColor);
            gl.uniform4fv(lightingProgram.uniformLocations.uKsHandle, mSpecularColor);
            gl.uniform1f(lightingProgram.uniformLocations.uSpecularHandle, mSpecularShininess);
            gl.uniform1i(lightingProgram.uniformLocations.uUseAmbient, mUseAmbientColor ? 1 : 0);
            gl.uniform1i(lightingProgram.uniformLocations.uUseDiffuse, mUseDiffuseColor ? 1 : 0);
            gl.uniform1i(lightingProgram.uniformLocations.uUseSpecular, mUseSpecularColor ? 1 : 0);
            gl.uniform1i(lightingProgram.uniformLocations.uUseNormalMapping, 0);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, diffuseTexture);
            gl.uniform1i(lightingProgram.uniformLocations.uTexDiffuseSampler, 0);

            if (App.Shadow.getFBO()) {
                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_2D, App.Shadow.getFBO().getTextureId());
                gl.uniform1i(lightingProgram.uniformLocations.uShadowSampler, 1);
            }
        }

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, drawCount);
    }

    return {
        init: function (gl, onLoad) {
            _buffer = _initBuffer(gl);
            _texture = loadTextureByParams(gl, './texture/terrain.jpg', false, false, false, true, true, onLoad);
        },
        draw: function (gl, deltaTime, isDrawShadow, isGodView) {
            if (!_buffer || !_texture) return;
            _draw(gl, mLightProgram, App.Shadow.getProgram(), _buffer, _texture, _buffer.drawCnt, deltaTime, isDrawShadow, isGodView);
        },
    };
})();
