precision mediump float;

uniform sampler2D uTexSampler;
varying vec2 vTexCoord;

void main() {
    gl_FragColor = texture2D(uTexSampler, vTexCoord);
}