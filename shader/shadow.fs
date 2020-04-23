precision mediump float;

void main() {
    gl_FragColor = vec4(0.0, 0.0, 0.0, gl_FragCoord.z); // 将灯源视点下的每个顶点的深度值存入绘制的颜色内
}