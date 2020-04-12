precision mediump float;

uniform sampler2D uTexSampler;
uniform sampler2D uSouloutTexSampler;
uniform float uProgress;
uniform int uDrawFBO;
varying lowp vec2 vTexCoord;

void main() {
    float alpha = 0.6 * (1.0 - uProgress);
    float scale = 1.0 + 0.5 * uProgress;
    float soulTexU = 0.5 + (vTexCoord.x - 0.5) / scale;
    float soulTexV = 0.5 + (vTexCoord.y - 0.5) / scale;
    vec2 soulTexCoord = vec2(soulTexU, soulTexV);
    vec4 soulMaskTex = texture2D(uSouloutTexSampler, soulTexCoord);
    vec4 videoTex = texture2D(uTexSampler, vTexCoord);
    if (0 == uDrawFBO) {
        gl_FragColor = videoTex * (1.0 - alpha) + soulMaskTex * alpha;
    } else {
        gl_FragColor = videoTex;
    }
}