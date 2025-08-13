var FrameBufferObject = function(gl, activeTextureType, width, height) {
    const mFrameBufferId = gl.createFramebuffer(); // generate FBO id
    const mRenderBufferId = gl.createRenderbuffer();
    this.gl = gl;
    gl.activeTexture(activeTextureType);
    const mTextureId = generateTextureID(gl, width, height);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, mFrameBufferId);
    gl.bindRenderbuffer(gl.RENDERBUFFER, mRenderBufferId);
    // make a depth buffer and the same size as the targetTexture
    // 指定存储在 renderbuffer 中图像的宽高以及颜色格式，并按照此规格为之分配存储空间
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
    // recover 
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, null);

    this.getTextureId = function() {
        return mTextureId;
    }
    
    this.bind = function () {
        gl.bindFramebuffer(gl.FRAMEBUFFER, mFrameBufferId);

        gl.viewport(0, 0, width, height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // 绑定2D纹理关联到fbo
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, mTextureId, 0);
        // 绑定fbo纹理到渲染缓冲区对象
        gl.bindRenderbuffer(gl.RENDERBUFFER, mRenderBufferId);
        // 将渲染缓冲区作为深度缓冲区附加到fbo
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, mRenderBufferId);
        var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
        if (status != gl.FRAMEBUFFER_COMPLETE) {
            alert('FrameBuffer error, the status: ' + status);
        }
    }

    this.unbind = function() {  // will render to canvas after unbind
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    }

    this.release = function() {
        gl.deleteTexture(mTextureId);
        gl.deleteFramebuffer(mFrameBufferId);
        gl.deleteRenderbuffer(mRenderBufferId);
    }

    this.dumpImage = function(returnType = 'Image') {
        const pixels = new Uint8Array(width * height * 4); // RGBA format
        gl.bindFramebuffer(gl.FRAMEBUFFER, mFrameBufferId);
    
        // Read the pixels from the framebuffer
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    
        // Create a canvas to draw the image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
    
        // Create an ImageData object and set the pixel data
        const imageData = ctx.createImageData(width, height);
        imageData.data.set(pixels);
    
        // Flip the image vertically because WebGL's origin is bottom-left
        for (let y = 0; y < height / 2; y++) {
            for (let x = 0; x < width * 4; x++) {
                const topIndex = y * width * 4 + x;
                const bottomIndex = (height - y - 1) * width * 4 + x;
    
                const temp = imageData.data[topIndex];
                imageData.data[topIndex] = imageData.data[bottomIndex];
                imageData.data[bottomIndex] = temp;
            }
        }
    
        // Put the ImageData onto the canvas
        ctx.putImageData(imageData, 0, 0);
    
        // Generate the data URL
        const dataURL = canvas.toDataURL();

        if (returnType === 'dataURL') {
            return dataURL; // Return the data URL
        } else if (returnType === 'Image') {
            // Create and return an Image object
            const img = new Image();
            img.src = dataURL;
            return img;
        } else {
            throw new Error("Invalid returnType. Use 'dataURL' or 'Image'.");
        }
    };

    function generateTextureID(gl, width, height) {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);

        // Because video havs to be download over the internet
        // they might take a moment until it's ready so
        // put a single pixel in the texture so we can
        // use it immediately.
        const level = 0;
        const internalFormat = gl.RGBA;
        const border = 0;
        const srcFormat = gl.RGBA;
        const srcType = gl.UNSIGNED_BYTE;
        // if pass unnull value may cause framebuffer status error
        const pixelData = null; // becareful, We don't need to supply any data. We just need WebGL to allocate the texture.
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                        width, height, border, srcFormat, srcType,
                        pixelData);

        // Turn off mips and set  wrapping to clamp to edge so it
        // will work regardless of the dimensions of the video.
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        return texture;
    }
};
