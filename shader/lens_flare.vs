attribute vec2 aPosition;
uniform vec2 uCenter;
uniform float uSize;
uniform vec2 uResolution;

void main() {
    vec2 pos = uCenter + aPosition * uSize;
    vec2 clipPos = (pos / uResolution) * 2.0 - 1.0;
    gl_Position = vec4(clipPos * vec2(1, -1), 0, 1);
}