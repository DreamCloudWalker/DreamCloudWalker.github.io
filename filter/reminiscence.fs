precision mediump float;

uniform sampler2D uTexSampler;
varying lowp vec2 vTexCoord;

void main() {
    gl_FragColor = texture2D(uTexSampler, vTexCoord);
    float dx = fract(sin(dot(vTexCoord ,vec2(12.9898,78.233))) * 43758.5453);
    vec3 cResult = gl_FragColor.rgb + gl_FragColor.rgb * clamp(0.1 + dx, 0.0, 1.0);
    vec2 sc = vec2(sin(vTexCoord.y * 4096.0), cos(vTexCoord.y * 4096.0));
    cResult += gl_FragColor.rgb * vec3(sc.x, sc.y, sc.x) * 0.025;
    cResult = gl_FragColor.rgb + clamp(0.35, 0.0, 1.0) * (cResult - gl_FragColor.rgb);
    if (false) {
        cResult = vec3(cResult.r * 0.3 + cResult.g * 0.59 + cResult.b * 0.11);
    }
    float oldr=0.393*cResult[0]+0.769*cResult[1]+0.189*cResult[2];
    float oldg=0.349*cResult[0]+0.686*cResult[1]+0.168*cResult[2];
    float oldb=0.272*cResult[0]+0.534*cResult[1]+0.131*cResult[2];
    gl_FragColor = vec4( oldr,oldg,oldb , gl_FragColor.a);
}