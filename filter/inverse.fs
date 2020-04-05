precision mediump float;
uniform sampler2D uTexSampler;
varying lowp vec2 vTexCoord;

void main() {
    vec4 color = texture2D(uTexSampler, vTexCoord);
    float gray = 0.2989 * color.r + 0.5870 * color.g + 0.1140 * color.b;
    gl_FragColor = vec4(1.0 - gray, 1.0 - gray, 1.0 - gray, color.a);
}