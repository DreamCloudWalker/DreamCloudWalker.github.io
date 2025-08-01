precision highp float;

uniform sampler2D uTexture;
uniform sampler2D uLutTexture;

varying lowp vec2 vTexCoord;

void main() {
    vec4 textureColor = texture2D(uTexture, vTexCoord);
    
    // 获取 B 分量值，确定 LUT 小方格的 index, 取值范围转为 0～63
    highp float blueColor = textureColor.b * 63.0;
    // 取与 B 分量值最接近的 2 个小方格的坐标
    vec2 quad1;
    quad1.y = floor(floor(blueColor) / 8.0);
    quad1.x = floor(blueColor) - (quad1.y * 8.0);

    vec2 quad2;
    quad2.y = floor(ceil(blueColor) / 8.0);
    quad2.x = ceil(blueColor) - (quad2.y * 8.0);
    
    // 通过 R 和 G 分量的值确定小方格内目标映射的 RGB 组合的坐标，然后归一化，转化为纹理坐标。
    vec2 texPos1;
    texPos1.x = (quad1.x * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * textureColor.r);
    texPos1.y = (quad1.y * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * textureColor.g);

    vec2 texPos2;
    texPos2.x = (quad2.x * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * textureColor.r);
    texPos2.y = (quad2.y * 0.125) + 0.5/512.0 + ((0.125 - 1.0/512.0) * textureColor.g);

    // 取目标映射对应的像素值
    vec4 newColor1 = texture2D(uLutTexture, texPos1);
    vec4 newColor2 = texture2D(uLutTexture, texPos2);

    // 使用 Mix 方法对 2 个边界像素值进行混合
    vec4 newColor = mix(newColor1, newColor2, fract(blueColor));
    gl_FragColor = mix(textureColor, vec4(newColor.rgb, textureColor.w), 1.0);
}