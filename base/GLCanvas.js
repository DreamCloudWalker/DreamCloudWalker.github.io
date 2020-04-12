var glConfig = {
    instance : null,
    clearColor : vec4.fromValues(0.9, 0.9, 0.9, 1.0)
};

let instance = null;

function initialize(glInstance) {
    glConfig.clearColor = vec4.fromValues(0.9, 0.9, 0.9, 1.0);
    glConfig.instance   = glInstance;
}

class GLCanvas {
    constructor(glView) {
        instance = this;
        let gl = null;
        try {
            gl = glView.getContext('experimental-webgl');
            glView.glCanvas = this;
    
            this.mGL              = gl;
            this.mGLView          = glView;
            this.mIsGLValid       = true;
            this.mRenderTime      = new Date().getTime();
            console.log('[GLCanvas] create GLCanvas instance');
        } catch (exp) {
            console.error("WebGL isn't support!");
            this.mIsGLValid = false;
        }
    }
  
    create() {
        console.log('[onGLCreated]');
        this.onGLCreated();
        this.mIsGLValid = true;
        initialize(this);
        this.loadResources();
    }
  
    loadResources() {
        console.log('[onResourceLoading]');
        if (!this.mIsGLValid) 
            return;
        this.onGLResourcesLoading();
    }
  
    resize(width, height) {
        console.log('[onGLResize] size = (' + width + ', ' + height + '), ratio = ' + (width / height));
    
        if (!this.mIsGLValid) 
            return;
        this.mGL.viewport(0, 0, width, height);
        this.mGL.viewportWidth  = width;
        this.mGL.viewportHeight = height;
        this.mGLView.width      = width;
        this.mGLView.height     = height;
        if (this.mGLView.style != null && this.mGLView.style != 'undefined') {
            this.mGLView.style.width    = width;
            this.mGLView.style.height   = height;
        } else {
            this.mGLView.style          = {};
            this.mGLView.style.width    = width;
            this.mGLView.style.height   = height;
        }
        this.requestRender();
        this.onGLResize(width, height);
    }
  
    destory() {
        console.log('[onGLDestoryed]');
        this.onGLDestoryed();
    }
  
    requestRender() {
        if (!instance.mIsGLValid) 
            return;
        requestAnimationFrame(function () {
            let time      = new Date().getTime();   
            let deltaTime = time - instance.mRenderTime;
            deltaTime *= 0.001; // convert to seconds
            instance.mRenderTime = time;
            instance.onDrawFrame.call(instance, time, deltaTime);
        });
    }
  
    getGL() {
        return this.mGL;
    }
  
    glCreated() {
        console.log('[onGLCreated]');
        this.onGLCreated();
    }
  
    onDrawFrame(time, deltaTime) {
        if (!this.mIsGLValid) 
            return;
        if (this.mGL == null) {
            console.log('[onDrawFrame] GL is null, cancel render');
            return;
        }
    
        let gl = this.mGL;
        gl.clearColor(
            glConfig.clearColor[0],
            glConfig.clearColor[1],
            glConfig.clearColor[2],
            glConfig.clearColor[3]
        );
        gl.clear(gl.COLOR_BUFFER_BIT);
        console.log('[onDrawFrame] time = ' + time + ', delta = ' + deltaTime);
        this.onDrawFrame(time, deltaTime);
    }
  
    onGLCreated() {}
    onGLResourcesLoading() {}
    onGLResize(width, height) {}
    onDrawFrame(time, deltaTime) {}
    onGLDestoryed() {}
}