# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A static WebGL educational demo site demonstrating OpenGL ES / WebGL rendering techniques (Phong lighting, PBR, shadow mapping, lens flare, skybox, post-processing filters). Hosted on GitHub Pages. There is **no build step** — all code runs directly in the browser.

## Development

**Run locally:** Open any `.html` file in a browser, or serve with any static file server:

```bash
python -m http.server 8080
# or
npx serve .
```

**No npm, no TypeScript, no bundler, no linting config.** Edit HTML/JS/GLSL directly and refresh the browser.

## Architecture

### Entry Points

- **`index.html`** — Main educational platform with sidebar navigation and embedded blog tutorials (markdown files in `blog/` rendered via showdown.js)
- **Individual demo pages** (`pbr.html`, `pbrModel.html`, `skybox.html`, `lensFlare.html`, `imageEditor.html`, `learnMatrix.html`, `lutFilter.html`, etc.) — each paired with a same-named `.js` file

### Core Framework (`base/`)

Custom WebGL abstraction layer with no external runtime dependencies beyond `gl-matrix.js`:

- **`GLCanvas.js`** — Base class for WebGL context init; all demos extend or instantiate this
- **`Drawable.js`** — Base class for renderable objects (vertex buffers, shader binding)
- **`GeometryUtil.js`** — Generates sphere, cube, plane geometry with normals/UVs/tangents
- **`TextureUtil.js`** — Texture loading from URL, mipmap, cube map creation
- **`FrameBufferObject.js`** — Render-to-texture; used for shadow maps and post-processing
- **`ShaderUtil.js`** — Shader compilation and program linking helpers
- **`FontUtil.js`** — Text rendering using an 8×8 texture atlas

### Main Demo (`learnOpenGLES.js`, ~4900 lines)

The flagship educational demo combining all rendering techniques in a single interactive canvas. Organized into sections covering: Phong lighting, normal mapping, shadow mapping, lens flare, skybox, terrain, video texture, image filters, and 3D model loading (OBJ via Three.js).

### Shader System (`shader/`)

GLSL shaders loaded at runtime via `ShaderUtil.js`. Key shader pairs:

| Pair | Purpose |
|------|---------|
| `base_lighting.vs/.fs` | Phong + normal map + shadow PCF |
| `pbr_lighting.vs/.fs` | Full PBR: GGX NDF, Smith geometry, Fresnel, IBL |
| `skybox.vs/.fs` | Cubemap environment rendering |
| `shadow.vs/.fs` | Depth-only pass for shadow map generation |
| `lens_flare.vs/.fs` | Billboard sprite lens flare |
| `filter/*.fs` | Post-processing: inverse, reminiscence, illusion, soul-out, LUT |

Shaders are fetched as text and compiled dynamically — edit `.vs`/`.fs` files directly.

### Libraries (`public/`)

All bundled, no CDN:
- **`gl-matrix.js`** — All vector/matrix/quaternion math (`mat4`, `vec3`, `quat`)
- **`three/`** — Three.js with `OBJLoader`, `FBXLoader`, `GLTFLoader` for model importing
- **`jquery/`** + **`jquery.i18n.properties`** — DOM and i18n
- **`showdown_2_1_0.min.js`** — Markdown → HTML for blog content

### Internationalization

UI strings live in `language/strings_en.properties` and `language/strings_zh.properties`. Loaded via the jQuery i18n plugin at startup.

## Key Patterns

- All WebGL demos follow the same lifecycle: create canvas → compile shaders → load textures/models → start `requestAnimationFrame` loop
- Shadow mapping uses a two-pass render: depth pass into an FBO, then main pass sampling the depth texture
- PBR textures follow the convention: albedo, normal, metalness, roughness, AO maps loaded as a set
- Post-processing filters are applied by rendering to an FBO then drawing a fullscreen quad with a filter shader
- `gl-matrix.js` API: functions take an output parameter first (`mat4.multiply(out, a, b)`)
