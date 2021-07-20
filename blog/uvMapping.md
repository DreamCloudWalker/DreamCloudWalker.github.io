## uv坐标
这里先纠正一个之前Demo犯的错误，所有OpenGL版本，包括OpenGL ES，uv坐标的原点都是左下角为（0，0）点。参考：https://stackoverflow.com/questions/8619584/opengl-es-has-different-uv-coordinates
中Christian Rau的回答。

在大部分Android介绍OpenGL ES Texture的书籍或博客中很多都把左上角当作（0，0）点，在我的UV Demo中也一样。这是不对的。但之所以这些书籍的demo和这里的UV Demo能运行正确，是因为Bitmap的读取是自顶向下，也就是说一张Bitmap从内存中读出来就是上下翻转了180度的，因此把左上角当作uv的原点才能绘制正确。

但如果要用fbo或glReadPixel，用这样的uv坐标又会发现读出来的图片是上下翻转了180的，就是因为uv坐标不对导致。在我的视频特效的demo里，制作灵魂出窍的效果就用到了fbo，但当时以为是yuv视频的问题。在当时我是把顶点坐标旋转了180度纠正的。这个后面再做个系统的总结。