precision mediump float;

uniform sampler2D uTexSampler;      // 当前输入纹理
uniform sampler2D uLastInputTex;    // 上一次纹理
uniform sampler2D uLookUpTableTex;  // 颜色查找表纹理
varying lowp vec2 vTexCoord;

vec4 getLutColor(vec4 texColor, sampler2D lookUpTex) {
    float blueColor = texColor.b * 63.0;

    mediump vec2 quad1;
    quad1.y = floor(floor(blueColor) / 8.0);
    quad1.x = floor(blueColor) - quad1.y * 8.0;

    mediump vec2 quad2;
    quad2.y = floor(ceil(blueColor) / 8.0);
    quad2.x = ceil(blueColor) - quad2.y * 8.0;

    highp vec2 texPos1;
    texPos1.x = (quad1.x * 0.125) + 0.5 / 512.0 + ((0.125 - 1.0 / 512.0) * texColor.r);
    texPos1.y = (quad1.y * 0.125) + 0.5 / 512.0 + ((0.125 - 1.0 / 512.0) * texColor.g);
    texPos1.y = 1.0 - texPos1.y;

    highp vec2 texPos2;
    texPos2.x = (quad2.x * 0.125) + 0.5 / 512.0 + ((0.125 - 1.0 / 512.0) * texColor.r);
    texPos2.y = (quad2.y * 0.125) + 0.5 / 512.0 + ((0.125 - 1.0 / 512.0) * texColor.g);
    texPos2.y = 1.0 - texPos2.y;

    lowp vec4 newColor1 = texture2D(lookUpTex, texPos1);
    lowp vec4 newColor2 = texture2D(lookUpTex, texPos2);

    lowp vec4 newColor = mix(newColor1, newColor2, fract(blueColor));
    return newColor;
}

void main() {
    // 上一帧纹理
    vec4 lastFrame = texture2D(uLastInputTex, vTexCoord);
    // 此帧对应的Lut转换纹理
    vec4 currentFrame = getLutColor(texture2D(uTexSampler, vTexCoord), uLookUpTableTex);
    // 上一帧和此帧混色处理
    gl_FragColor = vec4(0.95 * lastFrame.r + 0.05 * currentFrame.r, currentFrame.g * 0.2 + lastFrame.g * 0.8, currentFrame.b, 1.0);
}