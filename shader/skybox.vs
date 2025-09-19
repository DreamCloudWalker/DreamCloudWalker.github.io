attribute vec4 aPosition;
varying vec4 vTexCoord;

uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;

void main() {
    // mat4 viewMatrix = mat4(mat3(uViewMatrix)); // 移除平移部分
    vTexCoord = aPosition;  // 直接使用顶点坐标作为采样坐标
    gl_Position = aPosition;    // uProjectionMatrix * uViewMatrix * 
    gl_Position.z = 1.0;
    // gl_Position.z = gl_Position.w; // 确保天空盒在最远处
}