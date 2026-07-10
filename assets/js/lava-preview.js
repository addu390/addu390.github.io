(function () {
    "use strict";
    if (typeof document === "undefined") return;

    var canvas = document.querySelector('.np-play-canvas[data-preview="lava"]');
    if (!canvas) return;
    var card = canvas.closest(".np-play-card");

    function fallbackToText() {
        if (card) card.classList.add("np-play-text");
        canvas.style.display = "none";
    }

    var gl = null;
    try {
        gl = canvas.getContext("webgl2", {
            antialias: false,
            alpha: true,
            powerPreference: "low-power"
        });
    } catch (e) {}
    if (!gl) { fallbackToText(); return; }

    var VERT_SRC = [
        "#version 300 es",
        "void main() {",
        "  vec2 v = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);",
        "  gl_Position = vec4(v * 2.0 - 1.0, 0.0, 1.0);",
        "}"
    ].join("\n");

    var FRAG_SRC = "#version 300 es\n" +
"precision highp float;\n" +
"\n" +
"uniform vec2 uResolution;\n" +
"uniform vec4 uCam;\n" +
"uniform vec2 uGrid;\n" +
"uniform int uLampCount;\n" +
"uniform float uGlow;\n" +
"uniform float uLight;\n" +
"uniform sampler2D uBlobA;\n" +
"uniform sampler2D uBlobB;\n" +
"uniform sampler2D uBlobC;\n" +
"uniform sampler2D uLamp;\n" +
"\n" +
"out vec4 fragColor;\n" +
"\n" +
"const float FOOT_BOT  = 0.042;\n" +
"const float WAIST_Y   = 0.235;\n" +
"const float BASE_TOP  = 0.415;\n" +
"const float GLASS_TOP = 0.845;\n" +
"const float CAP_TOP   = 0.968;\n" +
"const float GLASS_T   = 0.006;\n" +
"\n" +
"const float INT_BOT   = 0.400;\n" +
"const float INT_SPAN  = 0.480;\n" +
"\n" +
"const int MAX_BLOBS = 10;\n" +
"\n" +
"float hash21(vec2 p) {\n" +
"  p = fract(p * vec2(234.34, 435.345));\n" +
"  p += dot(p, p + 34.23);\n" +
"  return fract(p.x * p.y);\n" +
"}\n" +
"\n" +
"float vnoise(vec2 p) {\n" +
"  vec2 i = floor(p);\n" +
"  vec2 f = fract(p);\n" +
"  vec2 u = f * f * (3.0 - 2.0 * f);\n" +
"  return mix(mix(hash21(i), hash21(i + vec2(1, 0)), u.x),\n" +
"             mix(hash21(i + vec2(0, 1)), hash21(i + vec2(1, 1)), u.x), u.y);\n" +
"}\n" +
"\n" +
"vec3 hsv2rgb(vec3 c) {\n" +
"  vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);\n" +
"  return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);\n" +
"}\n" +
"\n" +
"float ss(float a, float b, float x) { return smoothstep(a, b, x); }\n" +
"\n" +
"float lampHalfW(float y) {\n" +
"  if (y >= GLASS_TOP) {\n" +
"    return mix(0.060, 0.046, (y - GLASS_TOP) / (CAP_TOP - GLASS_TOP));\n" +
"  }\n" +
"  if (y >= BASE_TOP) {\n" +
"    float t = (y - BASE_TOP) / (GLASS_TOP - BASE_TOP);\n" +
"    if (t < 0.07) {\n" +
"      float s = t / 0.07;\n" +
"      return mix(0.106, 0.1135, s * (2.0 - s));\n" +
"    }\n" +
"    float s = (t - 0.07) / 0.93;\n" +
"    return mix(0.1135, 0.062, s);\n" +
"  }\n" +
"  if (y >= WAIST_Y) {\n" +
"    float t = (y - WAIST_Y) / (BASE_TOP - WAIST_Y);\n" +
"    return mix(0.052, 0.116, t);\n" +
"  }\n" +
"\n" +
"  float t = clamp((y - FOOT_BOT) / (WAIST_Y - FOOT_BOT), 0.0, 1.0);\n" +
"  return mix(0.112, 0.052, t);\n" +
"}\n" +
"\n" +
"float sdRoundBox(vec2 p, vec2 b, float r) {\n" +
"  vec2 d = abs(p) - b + r;\n" +
"  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;\n" +
"}\n" +
"\n" +
"vec3 silver(float m, float y, float seed) {\n" +
"  vec3 c = mix(vec3(0.78, 0.80, 0.84), vec3(0.28, 0.30, 0.34), pow(m, 1.15));\n" +
"  c += vec3(0.35) * exp(-pow(m - 0.25, 2.0) * 28.0) * 0.28;\n" +
"  c *= 0.97 + 0.03 * vnoise(vec2(seed * 37.0, y * 120.0));\n" +
"  return c;\n" +
"}\n" +
"\n" +
"void main() {\n" +
"  vec2 uv = gl_FragCoord.xy / uResolution;\n" +
"  vec2 wallP = uCam.xy + uv * uCam.zw;\n" +
"\n" +
"  float A = (uResolution.x / uResolution.y) * (uCam.w / uCam.z);\n" +
"  vec2 cell = floor(wallP);\n" +
"  vec2 p = fract(wallP);\n" +
"  vec2 q = vec2((p.x - 0.5) * A, p.y);\n" +
"\n" +
"  bool inGrid = wallP.x >= 0.0 && wallP.x < uGrid.x && wallP.y >= 0.0 &&\n" +
"                wallP.y < uGrid.y;\n" +
"  int lampIdx = int(cell.y) * int(uGrid.x) + int(cell.x);\n" +
"  bool hasLamp = inGrid && lampIdx < uLampCount;\n" +
"\n" +
"  vec3 col = vec3(0.0);\n" +
"  float alpha = 0.0;\n" +
"\n" +
"  if (hasLamp) {\n" +
"    vec4 lamp = texelFetch(uLamp, ivec2(lampIdx, 0), 0);\n" +
"    float hue = lamp.y;\n" +
"    float switchedOn = lamp.z;\n" +
"    float seed = lamp.w;\n" +
"    vec4 lamp2 = texelFetch(uLamp, ivec2(lampIdx, 1), 0);\n" +
"    vec3 liquidCol = lamp2.rgb;\n" +
"    float bulbLit = lamp2.a;\n" +
"\n" +
"    vec3 waxCore = hsv2rgb(vec3(hue, 0.72, 1.05));\n" +
"    vec3 waxMid  = hsv2rgb(vec3(hue, 0.88, 0.92));\n" +
"    vec3 waxRim  = hsv2rgb(vec3(hue, 0.95, 0.55));\n" +
"    float glowAmt = bulbLit * uGlow * (1.0 - 0.8 * uLight);\n" +
"    float lit = mix(mix(0.60, 0.93, uLight), 1.0, bulbLit);\n" +
"\n" +
"    vec2 bulbXY = vec2(0.0, INT_BOT - 0.01);\n" +
"\n" +
"    float ax = abs(q.x);\n" +
"    float hw = lampHalfW(q.y);\n" +
"\n" +
"    float aaq = fwidth(q.y) + 1e-4;\n" +
"    bool insideLamp = q.y > FOOT_BOT && q.y < CAP_TOP && ax < hw + aaq;\n" +
"\n" +
"    if (insideLamp) {\n" +
"      float edgeAA = ss(hw + aaq, hw - aaq, ax);\n" +
"      vec3 lampCol;\n" +
"\n" +
"      if (q.y >= BASE_TOP && q.y < GLASS_TOP) {\n" +
"        float hwi = hw - GLASS_T;\n" +
"        float xn = clamp(q.x / max(hwi, 1e-3), -1.0, 1.0);\n" +
"\n" +
"        float centerGlow = pow(max(1.0 - xn * xn, 0.0), 1.1);\n" +
"        float att = exp(-(q.y - INT_BOT) * 1.8);\n" +
"\n" +
"        vec3 liq = liquidCol *\n" +
"                   (0.85 + 0.32 * uLight + 0.2 * centerGlow + 0.32 * att * glowAmt);\n" +
"        liq += vec3(1.0, 0.86, 0.62) * 0.05 * att * glowAmt * centerGlow;\n" +
"        liq *= lit;\n" +
"\n" +
"        vec2 qb = q - bulbXY;\n" +
"        liq += waxCore * glowAmt * 0.14 * exp(-dot(qb, qb) * 140.0);\n" +
"\n" +
"        lampCol = liq;\n" +
"\n" +
"        {\n" +
"          float lens = 0.94 + 0.10 * xn * xn;\n" +
"          vec2 qs = vec2(q.x * lens, q.y);\n" +
"          float f = 0.0;\n" +
"          float hsum = 0.0;\n" +
"          float dsum = 0.0;\n" +
"          for (int b = 0; b < MAX_BLOBS; b++) {\n" +
"            vec4 ba = texelFetch(uBlobA, ivec2(b, lampIdx), 0);\n" +
"            vec4 bb = texelFetch(uBlobB, ivec2(b, lampIdx), 0);\n" +
"            float bz0 = texelFetch(uBlobC, ivec2(b, lampIdx), 0).x;\n" +
"            float act = bb.z;\n" +
"            float near = bz0 * 0.5 + 0.5;\n" +
"            float rq = ba.z * INT_SPAN * (0.93 + 0.11 * near);\n" +
"            vec2 bq;\n" +
"            bq.y = INT_BOT + ba.y * INT_SPAN;\n" +
"            float avail = max(lampHalfW(bq.y) - GLASS_T - 0.006 - rq * 0.55, 0.012);\n" +
"            bq.x = ba.x * avail;\n" +
"            vec2 d = qs - bq;\n" +
"            float e = clamp(bb.y * 1.1, -0.15, 0.35);\n" +
"            d.y /= (1.0 + 0.1 * max(e, 0.0));\n" +
"            float dl = length(d) / max(rq, 1e-4);\n" +
"            float c = act * max(0.0, 1.0 - dl * dl);\n" +
"            c *= c;\n" +
"            f += c;\n" +
"            hsum += c * ba.w;\n" +
"            dsum += c * near;\n" +
"          }\n" +
"          float heatL = hsum / max(f, 1e-4);\n" +
"          float depthL = dsum / max(f, 1e-4);\n" +
"          float aa = max(fwidth(f) * 0.9, 0.04);\n" +
"          float wax = ss(0.42 - aa, 0.42 + aa, f);\n" +
"\n" +
"          if (wax > 0.003) {\n" +
"            vec3 waxBody = mix(waxMid, waxCore, 0.35 + 0.4 * heatL);\n" +
"            waxBody = mix(waxRim, waxBody, 0.82);\n" +
"\n" +
"            vec2 gf = vec2(dFdx(f), dFdy(f));\n" +
"            vec3 n = normalize(vec3(-gf, max(length(gf), 0.03) * 2.2));\n" +
"            vec3 L = normalize(vec3(-0.3, 0.6, 0.72));\n" +
"            float diff = 0.80 + 0.20 * max(dot(n, L), 0.0);\n" +
"            float spec =\n" +
"                pow(max(dot(n, normalize(L + vec3(0.0, 0.0, 1.0))), 0.0), 28.0);\n" +
"\n" +
"            float back = glowAmt * exp(-(q.y - INT_BOT) * 2.6);\n" +
"            vec3 shaded = waxBody * diff;\n" +
"            shaded += waxCore * back * 0.16;\n" +
"            shaded += vec3(1.0) * spec * 0.05 * (1.0 - 0.7 * uLight);\n" +
"\n" +
"            float far = 1.0 - clamp(depthL, 0.0, 1.0);\n" +
"            shaded *= mix(1.03, 0.78, far);\n" +
"            shaded = mix(shaded, shaded * (0.4 + liquidCol * 1.2), 0.28 * far);\n" +
"\n" +
"            float light = (0.92 + 0.08 * glowAmt) * lit;\n" +
"            lampCol = mix(lampCol, shaded * light, wax);\n" +
"          }\n" +
"        }\n" +
"\n" +
"        lampCol *= 1.0 - 0.10 * exp(-max(hwi - ax, 0.0) * 40.0);\n" +
"\n" +
"        float rim = exp(-(hw - ax) * 110.0);\n" +
"        lampCol += vec3(0.75, 0.82, 0.92) * rim * (0.12 + 0.18 * glowAmt);\n" +
"\n" +
"        float wob = vnoise(vec2(seed * 91.0, q.y * 11.0));\n" +
"        float sx = q.x + hw * 0.48 + (wob - 0.5) * 0.006;\n" +
"        float s1 = exp(-sx * sx * 2400.0);\n" +
"        float streak = 0.55 + 0.45 * vnoise(vec2(q.y * 7.0, seed * 53.0));\n" +
"        lampCol += vec3(1.0) * s1 * (0.025 + 0.065 * glowAmt) * streak *\n" +
"                   ss(BASE_TOP, BASE_TOP + 0.06, q.y) *\n" +
"                   (1.0 - ss(GLASS_TOP - 0.05, GLASS_TOP, q.y));\n" +
"\n" +
"        float extTop = ss(BASE_TOP, GLASS_TOP, q.y);\n" +
"        float sheenB = exp(-pow(xn + 0.42, 2.0) * 2.6);\n" +
"        lampCol *= 1.0 + uLight * (0.04 + 0.10 * extTop);\n" +
"        lampCol += vec3(1.0) * uLight * sheenB * 0.06;\n" +
"      } else {\n" +
"        float m = ax / hw;\n" +
"        lampCol = silver(m, q.y, seed) * (1.0 + 0.2 * uLight) *\n" +
"                  mix(mix(0.88, 0.99, uLight), 1.0, bulbLit);\n" +
"\n" +
"        if (q.y < BASE_TOP) {\n" +
"          lampCol *= 1.0 - 0.35 * exp(-pow((q.y - WAIST_Y) * 80.0, 2.0));\n" +
"          lampCol += waxMid * glowAmt * 0.35 *\n" +
"                     exp(-(BASE_TOP - q.y) * 22.0) * (1.0 - m * 0.6);\n" +
"\n" +
"          float swTh = 0.74;\n" +
"          float swFace = cos(swTh);\n" +
"          if (swFace > 0.05) {\n" +
"            vec2 sp = q - vec2(0.086 * sin(swTh), 0.330);\n" +
"            sp.x /= max(swFace, 0.25);\n" +
"            float housing = sdRoundBox(sp, vec2(0.0135, 0.027), 0.005);\n" +
"            float hMask = 1.0 - ss(0.0, 0.0025, housing);\n" +
"            if (hMask > 0.0) {\n" +
"              vec3 swCol = vec3(0.07);\n" +
"              float well = sdRoundBox(sp, vec2(0.0095, 0.022), 0.004);\n" +
"              float wMask = 1.0 - ss(0.0, 0.002, well);\n" +
"              swCol = mix(swCol, vec3(0.025), wMask);\n" +
"\n" +
"              float dir = switchedOn * 2.0 - 1.0;\n" +
"              vec2 rp = sp - vec2(0.0, dir * 0.0105);\n" +
"              float rocker = sdRoundBox(rp, vec2(0.008, 0.0115), 0.003);\n" +
"              float rMask = 1.0 - ss(0.0, 0.0018, rocker);\n" +
"              float tilt = ss(-0.012, 0.012, rp.y * dir);\n" +
"              vec3 rockCol = vec3(0.13 + 0.17 * tilt);\n" +
"              rockCol +=\n" +
"                  vec3(0.12) * exp(-pow((rp.y - dir * 0.008) * 220.0, 2.0));\n" +
"              swCol = mix(swCol, rockCol, rMask);\n" +
"\n" +
"              lampCol = mix(lampCol, swCol, hMask * ss(0.05, 0.35, swFace));\n" +
"            }\n" +
"          }\n" +
"        } else {\n" +
"          lampCol += waxMid * glowAmt * 0.12 *\n" +
"                     (1.0 - ss(GLASS_TOP, GLASS_TOP + 0.05, q.y));\n" +
"        }\n" +
"      }\n" +
"\n" +
"      float lum = dot(lampCol, vec3(0.299, 0.587, 0.114));\n" +
"      lampCol = mix(lampCol, vec3(lum), 0.13 * uLight);\n" +
"      lampCol = lampCol * (1.0 - 0.06 * uLight) + 0.055 * uLight;\n" +
"\n" +
"      col = mix(col, lampCol, edgeAA);\n" +
"      alpha = edgeAA;\n" +
"    }\n" +
"  }\n" +
"\n" +
"  col = pow(clamp(col, 0.0, 1.5), vec3(0.95));\n" +
"\n" +
"  fragColor = vec4(col * alpha, alpha);\n" +
"}\n";

    function compile(type, src) {
        var sh = gl.createShader(type);
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
            throw new Error("lava shader: " + gl.getShaderInfoLog(sh));
        }
        return sh;
    }

    var program;
    try {
        program = gl.createProgram();
        gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT_SRC));
        gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG_SRC));
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error("lava program: " + gl.getProgramInfoLog(program));
        }
    } catch (e) {
        fallbackToText();
        return;
    }
    gl.useProgram(program);

    var U = {};
    ["uResolution", "uCam", "uGrid", "uLampCount", "uGlow", "uLight",
     "uBlobA", "uBlobB", "uBlobC", "uLamp"
    ].forEach(function (n) { U[n] = gl.getUniformLocation(program, n); });
    gl.uniform1i(U.uBlobA, 0);
    gl.uniform1i(U.uBlobB, 1);
    gl.uniform1i(U.uBlobC, 3);
    gl.uniform1i(U.uLamp, 2);

    function dataTexture() {
        var tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return tex;
    }
    var texBlobA = dataTexture();
    var texBlobB = dataTexture();
    var texBlobC = dataTexture();
    var texLamp = dataTexture();

    var MAX_BLOBS = 10;
    var BLOB_SIZE = 1.3;
    var TIME_SCALE = 1.8;
    var FLOOR = 0.02;
    var THEMES = [
        { hue: 0.10, jitter: 0.015, liquid: [0.04, 0.28, 0.22] },
        { hue: 0.07, jitter: 0.008, liquid: [0.12, 0.38, 0.85] },
        { hue: 0.95, jitter: 0.015, liquid: [0.12, 0.18, 0.45] }
    ];

    function mulberry32(seed) {
        var a = seed >>> 0;
        return function () {
            a |= 0; a = (a + 0x6d2b79f5) | 0;
            var t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
    function smoothstep(a, b, x) {
        var t = clamp((x - a) / (b - a), 0, 1);
        return t * t * (3 - 2 * t);
    }

    function buildWall(count) {
        var nb = count * MAX_BLOBS;
        var w = {
            count: count,
            blobA: new Float32Array(nb * 4),
            blobB: new Float32Array(nb * 4),
            blobC: new Float32Array(nb * 4),
            lampData: new Float32Array(count * 4 * 2),
            targetR: new Float32Array(nb),
            phase: new Float32Array(nb),
            respawn: new Float32Array(nb),
            jit: new Float32Array(count * 3),
            seed: new Float32Array(count),
            blobCount: new Uint8Array(count),
            mergeCd: new Float32Array(count)
        };
        var liqRow = count * 4;
        for (var i = 0; i < count; i++) {
            var r = mulberry32(i * 7919 + 17);
            var seed = r();
            w.seed[i] = seed;
            w.jit[i * 3] = 1 + (r() - 0.5) * 0.4;
            w.jit[i * 3 + 1] = 1 + (r() - 0.5) * 0.4;
            w.jit[i * 3 + 2] = 1 + (r() - 0.5) * 0.4;
            var n = 5 + Math.floor(r() * 3);
            w.blobCount[i] = n;

            var theme = THEMES[i % THEMES.length];
            w.lampData[i * 4 + 1] =
                (theme.hue + (r() - 0.5) * 2 * theme.jitter + 1) % 1;
            w.lampData[i * 4 + 2] = 1;
            w.lampData[i * 4 + 3] = seed;
            w.lampData[liqRow + i * 4] = theme.liquid[0];
            w.lampData[liqRow + i * 4 + 1] = theme.liquid[1];
            w.lampData[liqRow + i * 4 + 2] = theme.liquid[2];
            w.lampData[liqRow + i * 4 + 3] = 1;

            initBlobs(w, i, n, seed, r);
        }
        return w;
    }

    function initBlobs(w, lamp, n, phase, rand) {
        var base = lamp * MAX_BLOBS;
        for (var b = 0; b < MAX_BLOBS; b++) {
            var k = (base + b) * 4;
            var active = b < n ? 1 : 0;
            w.phase[base + b] = rand() * Math.PI * 2;
            w.blobC[k] = active ? (rand() - 0.5) * 0.7 : 0;
            w.blobC[k + 1] = 0;

            if (!active) continue;

            if (b === 0) {
                var tr0 = (0.115 + rand() * 0.025) * BLOB_SIZE;
                w.targetR[base + b] = tr0;
                w.blobA[k] = (rand() - 0.5) * 0.15;
                w.blobA[k + 1] = 0.1;
                w.blobA[k + 2] = tr0;
                w.blobA[k + 3] = 0.55;
                w.blobB[k + 2] = 1;
                w.blobB[k + 3] = 1;
                continue;
            }

            var cycle = (phase + (b - 1) / Math.max(1, n - 1) + rand() * 0.05) % 1;
            var y, heat, vy, tr, x;
            if (cycle < 0.4) {
                y = 0.15 + (cycle / 0.4) * 0.8;
                heat = 0.92 - cycle * 0.3;
                vy = 0.05 + rand() * 0.025;
                tr = (0.07 + rand() * 0.035) * BLOB_SIZE;
                x = (rand() - 0.5) * 0.55;
            } else if (cycle < 0.55) {
                y = 0.88 + ((cycle - 0.4) / 0.15) * 0.08;
                heat = 0.3;
                vy = -0.025 - rand() * 0.015;
                tr = (0.06 + rand() * 0.03) * BLOB_SIZE;
                x = (rand() - 0.5) * 0.45;
            } else {
                y = 0.9 - ((cycle - 0.55) / 0.45) * 0.75;
                heat = 0.22 + rand() * 0.1;
                vy = -0.045 - rand() * 0.02;
                tr = (0.065 + rand() * 0.03) * BLOB_SIZE;
                x = (rand() - 0.5) * 0.5;
            }
            w.targetR[base + b] = tr;
            w.blobA[k] = x;
            w.blobA[k + 1] = clamp(y, 0, 1);
            w.blobA[k + 2] = tr;
            w.blobA[k + 3] = clamp(heat, 0, 1);
            w.blobB[k] = (rand() - 0.5) * 0.04;
            w.blobB[k + 1] = vy;
            w.blobB[k + 2] = 1;
            w.blobB[k + 3] = 1;
        }
    }

    function stepLamp(w, lamp, dt, t) {
        var base = lamp * MAX_BLOBS;
        var A = w.blobA, B = w.blobB, C = w.blobC;
        var heatMul = w.jit[lamp * 3];
        var drag = 2.64 * w.jit[lamp * 3 + 1];
        var buoy = 0.5 * w.jit[lamp * 3 + 2];
        var maxR = 0.13 * BLOB_SIZE;
        var minR = 0.05 * BLOB_SIZE;
        if (w.mergeCd[lamp] > 0) w.mergeCd[lamp] -= dt;

        for (var b = 0; b < MAX_BLOBS; b++) {
            var i = base + b, k = i * 4;
            if (B[k + 2] < 0.5) continue;

            if (B[k + 3] < 1) B[k + 3] = Math.min(1, B[k + 3] + dt * 0.5);
            w.targetR[i] = clamp(w.targetR[i], minR, maxR);
            var g = B[k + 3];
            var r = w.targetR[i] * (0.1 + 0.9 * g * g * (3 - 2 * g));
            A[k + 2] = r;

            var x = A[k], y = A[k + 1], heat = A[k + 3];
            var vx = B[k], vy = B[k + 1];

            var bulbZone = smoothstep(0.3, 0.06, y);
            var heatGain = 0.9 * heatMul * bulbZone * (1 - heat);
            var heatLoss = 0.025 * heat * smoothstep(0.25, 0.5, y);
            if (y > 0.8) heatLoss += (y - 0.8) * 0.3 * heat;
            heat = clamp(heat + (heatGain - heatLoss) * dt, 0, 1);
            if (b === 0) heat = Math.min(heat, 0.48);

            var ay = buoy * (heat - 0.5) * 1.5;
            if (y > 0.82 && heat > 0.42 && ay < 0) ay *= 0.15;
            var ph = w.phase[i];
            var ax = Math.sin(t * 0.2 + ph) * 0.01 +
                     Math.sin(t * 0.08 + ph * 1.3) * 0.006 - x * 0.035;
            vx += ax * dt;
            vy += ay * dt;

            for (var b2 = b + 1; b2 < MAX_BLOBS; b2++) {
                var k2 = (base + b2) * 4;
                if (B[k2 + 2] < 0.5) continue;
                var dx = x - A[k2];
                var dy = y - A[k2 + 1];
                var dz = (C[k] - C[k2]) * 0.28;
                var dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 1e-5;
                var need = (r + A[k2 + 2]) * 1.12;
                if (dist >= need) continue;
                var push = ((need - dist) / need) * 1.1 * dt;
                var fx = (dx / dist) * push;
                var fy = (dy / dist) * push * 0.65;
                var fz = (dz / dist) * push * 1.6;
                vx += fx;
                vy += fy;
                C[k + 1] += fz;
                B[k2] -= fx;
                B[k2 + 1] -= fy;
                C[k2 + 1] -= fz;
            }

            var damp = Math.exp(-drag * dt);
            vx *= damp;
            vy *= damp;
            var spd = Math.sqrt(vx * vx + vy * vy);
            if (spd > 0.12) { vx *= 0.12 / spd; vy *= 0.12 / spd; }

            x += vx * dt;
            y += vy * dt;

            var xMax = 1 - r * 1.1;
            if (x > xMax) { x = xMax; vx *= -0.15; }
            else if (x < -xMax) { x = -xMax; vx *= -0.15; }
            var yMin = FLOOR + r * 0.2;
            var yMax = 1 - r * 0.1;
            if (y < yMin) { y = yMin; if (vy < 0) vy *= -0.1; }
            else if (y > yMax) { y = yMax; if (vy > 0) vy *= -0.05; }

            var z = C[k], vz = C[k + 1];
            vz += (Math.sin(t * 0.13 + ph * 2.3) * 0.012 - z * 0.05) * dt;
            vz *= damp;
            z += vz * dt;
            var zMax = Math.sqrt(Math.max(xMax * xMax - x * x, 0.02));
            if (z > zMax) { z = zMax; vz *= -0.2; }
            else if (z < -zMax) { z = -zMax; vz *= -0.2; }
            C[k] = z;
            C[k + 1] = vz;

            A[k] = x;
            A[k + 1] = y;
            A[k + 3] = heat;
            B[k] = vx;
            B[k + 1] = vy;
        }

        if (w.mergeCd[lamp] <= 0) {
            for (var b1 = 0; b1 < MAX_BLOBS; b1++) {
                var k1 = (base + b1) * 4;
                if (B[k1 + 2] < 0.5 || A[k1 + 1] > 0.16) continue;
                for (var m2 = b1 + 1; m2 < MAX_BLOBS; m2++) {
                    var km = (base + m2) * 4;
                    if (B[km + 2] < 0.5 || A[km + 1] > 0.16) continue;
                    var md = Math.sqrt(
                        Math.pow(A[km] - A[k1], 2) +
                        Math.pow(A[km + 1] - A[k1 + 1], 2));
                    if (md < (A[k1 + 2] + A[km + 2]) * 0.45) {
                        mergeBlobs(w, lamp, b1, m2);
                        w.mergeCd[lamp] = 2.5;
                        break;
                    }
                }
                if (w.mergeCd[lamp] > 0) break;
            }
        }

        if (w.mergeCd[lamp] <= 0) {
            for (var sb = 0; sb < MAX_BLOBS; sb++) {
                var ks = (base + sb) * 4;
                if (B[ks + 2] < 0.5) continue;
                if (A[ks + 2] > 0.11 * BLOB_SIZE && A[ks + 1] > 0.45 &&
                    B[ks + 1] > 0.02) {
                    if (splitBlob(w, lamp, sb)) {
                        w.mergeCd[lamp] = 3.0;
                        break;
                    }
                }
            }
        }

        var active = 0;
        var free = -1;
        var above = 0;
        var poolIdx = -1;
        var poolScore = -1;
        for (var pb = 0; pb < MAX_BLOBS; pb++) {
            var kp = (base + pb) * 4;
            if (B[kp + 2] < 0.5) {
                if (free < 0 && w.respawn[base + pb] <= 0) free = pb;
                continue;
            }
            active++;
            if (A[kp + 1] > 0.28) above++;
            if (A[kp + 1] < 0.2 && A[kp + 2] > poolScore) {
                poolScore = A[kp + 2];
                poolIdx = pb;
            }
        }

        if (poolIdx < 0 && free >= 0) {
            spawnPool(w, lamp, free);
            poolIdx = free;
            active++;
            free = -1;
            for (var fb = 0; fb < MAX_BLOBS; fb++) {
                if (B[(base + fb) * 4 + 2] < 0.5 && w.respawn[base + fb] <= 0) {
                    free = fb;
                    break;
                }
            }
        }

        var wantAbove = Math.min(4, Math.max(2, w.blobCount[lamp] - 2));
        var launchPeriod = above < wantAbove ? 4.0 : 9.0;
        if (poolIdx >= 0 && free >= 0 && active < w.blobCount[lamp] &&
            above < wantAbove && w.mergeCd[lamp] <= 0 &&
            (t + w.seed[lamp] * 17) % launchPeriod < dt * 1.5) {
            launchFromPool(w, lamp, poolIdx, free);
            w.mergeCd[lamp] = 2.0;
        }

        for (var rb = 0; rb < MAX_BLOBS; rb++) {
            var ri = base + rb;
            if (B[ri * 4 + 2] >= 0.5) continue;
            if (w.respawn[ri] > 0) {
                w.respawn[ri] -= dt;
                continue;
            }
            if (active >= w.blobCount[lamp]) continue;
            spawnPool(w, lamp, rb);
            active++;
        }
    }

    function spawnPool(w, lamp, b) {
        var i = lamp * MAX_BLOBS + b;
        var k = i * 4;
        var rnd = fract(Math.sin(i * 91.7 + w.seed[lamp] * 40));
        var tr = (0.11 + rnd * 0.02) * BLOB_SIZE;
        w.blobC[k] = (rnd - 0.5) * 0.3;
        w.blobC[k + 1] = 0;
        w.targetR[i] = tr;
        w.phase[i] = rnd * Math.PI * 2;
        w.blobA[k] = (rnd - 0.5) * 0.2;
        w.blobA[k + 1] = FLOOR + 0.05;
        w.blobA[k + 2] = tr * 0.1;
        w.blobA[k + 3] = 0.45;
        w.blobB[k] = 0;
        w.blobB[k + 1] = 0;
        w.blobB[k + 2] = 1;
        w.blobB[k + 3] = 0;
        w.respawn[i] = 0;
    }

    function launchFromPool(w, lamp, pool, free) {
        var base = lamp * MAX_BLOBS;
        var A = w.blobA, B = w.blobB;
        var kp = (base + pool) * 4;
        var kf = (base + free) * 4;
        var childR = (0.06 + Math.random() * 0.03) * BLOB_SIZE;

        w.targetR[base + pool] = Math.max(
            w.targetR[base + pool] * 0.92, 0.08 * BLOB_SIZE);
        A[kp + 2] = w.targetR[base + pool];
        A[kp + 3] = Math.max(0.3, A[kp + 3] - 0.1);

        w.targetR[base + free] = childR;
        w.phase[base + free] = Math.random() * Math.PI * 2;

        A[kf] = A[kp] + (Math.random() - 0.5) * 0.12;
        A[kf + 1] = A[kp + 1] + A[kp + 2] * 0.5;
        w.blobC[kf] = w.blobC[kp] + (Math.random() - 0.5) * 0.2;
        w.blobC[kf + 1] = 0;
        A[kf + 2] = childR * 0.1;
        A[kf + 3] = 0.9;
        B[kf] = (Math.random() - 0.5) * 0.04;
        B[kf + 1] = 0.06;
        B[kf + 2] = 1;
        B[kf + 3] = 0;
        w.respawn[base + free] = 0;
    }

    function splitBlob(w, lamp, b) {
        var base = lamp * MAX_BLOBS;
        var A = w.blobA, B = w.blobB;
        var active = 0;
        var free = -1;
        for (var s = 0; s < MAX_BLOBS; s++) {
            if (B[(base + s) * 4 + 2] >= 0.5) {
                active++;
                continue;
            }
            if (free < 0 && w.respawn[base + s] <= 0) free = s;
        }
        if (free < 0 || active >= w.blobCount[lamp]) return false;

        var k = (base + b) * 4;
        var kf = (base + free) * 4;
        var childR = Math.min(A[k + 2] * 0.42, 0.055 * BLOB_SIZE);
        var parentR = Math.max(A[k + 2] * 0.72, 0.05 * BLOB_SIZE);
        w.targetR[base + b] = parentR;
        w.targetR[base + free] = childR;
        A[k + 2] = parentR;

        var side = Math.random() < 0.5 ? -1 : 1;

        A[kf] = A[k] + side * parentR * 0.7;
        A[kf + 1] = A[k + 1] + 0.03;
        w.blobC[kf] = w.blobC[k] + (Math.random() - 0.5) * 0.25;
        w.blobC[kf + 1] = (Math.random() - 0.5) * 0.02;
        A[kf + 2] = childR * 0.3;
        A[kf + 3] = A[k + 3] * 0.88;
        B[kf] = side * 0.04;
        B[kf + 1] = Math.max(B[k + 1] * 0.5, 0.03);
        B[kf + 2] = 1;
        B[kf + 3] = 0.3;
        w.phase[base + free] = Math.random() * Math.PI * 2;
        return true;
    }

    function mergeBlobs(w, lamp, b1, b2) {
        var base = lamp * MAX_BLOBS;
        var A = w.blobA, B = w.blobB;
        var big = base + b1;
        var small = base + b2;

        if (b1 !== 0 && (b2 === 0 || A[small * 4 + 2] > A[big * 4 + 2])) {
            var tmp = big;
            big = small;
            small = tmp;
        }
        var kb = big * 4;
        var ks = small * 4;
        var r1 = A[kb + 2];
        var r2 = A[ks + 2];
        var v1 = r1 * r1 * r1;
        var v2 = r2 * r2 * r2;
        var vSum = v1 + v2 + 1e-8;
        var rNew = Math.min(Math.cbrt(vSum), 0.13 * BLOB_SIZE);
        A[kb] = (A[kb] * v1 + A[ks] * v2) / vSum;
        A[kb + 1] = (A[kb + 1] * v1 + A[ks + 1] * v2) / vSum;
        A[kb + 3] = (A[kb + 3] * v1 + A[ks + 3] * v2) / vSum;
        B[kb] = (B[kb] * v1 + B[ks] * v2) / vSum;
        B[kb + 1] = (B[kb + 1] * v1 + B[ks + 1] * v2) / vSum;
        w.blobC[kb] = (w.blobC[kb] * v1 + w.blobC[ks] * v2) / vSum;
        w.targetR[big] = rNew;
        A[kb + 2] = rNew;
        B[ks + 2] = 0;
        A[ks + 2] = 0;
        w.respawn[small] = 4 + Math.random() * 4;
    }

    function fract(v) {
        return v - Math.floor(v);
    }

    function step(w, dt, t) {
        var d = Math.min(dt, 0.08);
        for (var lamp = 0; lamp < w.count; lamp++) stepLamp(w, lamp, d, t);
    }

    var LAMPS = 3;
    var wall = buildWall(LAMPS);
    var allocated = false;

    function upload() {
        function tex(t, unit, wpx, hpx, data) {
            gl.activeTexture(gl.TEXTURE0 + unit);
            gl.bindTexture(gl.TEXTURE_2D, t);
            if (!allocated) {
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, wpx, hpx, 0, gl.RGBA, gl.FLOAT, data);
            } else {
                gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, wpx, hpx, gl.RGBA, gl.FLOAT, data);
            }
        }
        tex(texBlobA, 0, MAX_BLOBS, LAMPS, wall.blobA);
        tex(texBlobB, 1, MAX_BLOBS, LAMPS, wall.blobB);
        tex(texBlobC, 3, MAX_BLOBS, LAMPS, wall.blobC);
        tex(texLamp, 2, LAMPS, 2, wall.lampData);
        allocated = true;
    }

    function fit() {
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var w = Math.max(1, Math.round(canvas.clientWidth * dpr));
        var h = Math.max(1, Math.round(canvas.clientHeight * dpr));
        if (w !== canvas.width || h !== canvas.height) {
            canvas.width = w;
            canvas.height = h;
        }
        gl.viewport(0, 0, w, h);
    }

    function render() {
        gl.uniform2f(U.uResolution, canvas.width, canvas.height);
        gl.uniform4f(U.uCam, 0, 0, LAMPS, 1);
        gl.uniform2f(U.uGrid, LAMPS, 1);
        gl.uniform1i(U.uLampCount, LAMPS);
        gl.uniform1f(U.uGlow, 1.6);
        gl.uniform1f(U.uLight, 0.85);
        upload();
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    var simT = Math.random() * 1000;

    fit();

    for (var s = 0; s < 90; s++) {
        step(wall, (1 / 30) * TIME_SCALE, simT);
        simT += 1 / 30;
    }
    render();

    var reduce = window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    var visible = true;
    if ("IntersectionObserver" in window) {
        new IntersectionObserver(function (entries) {
            entries.forEach(function (e) { visible = e.isIntersecting; });
        }, { threshold: 0.05 }).observe(canvas);
    }

    var resizeTimer = null;
    window.addEventListener("resize", function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
            fit();
            render();
        }, 150);
    });

    var FRAME_MS = 32;
    var last = performance.now();

    function frame(now) {
        requestAnimationFrame(frame);
        if (!visible) { last = now; return; }
        if (now - last < FRAME_MS) return;
        var dt = Math.min((now - last) / 1000, 1 / 30);
        last = now;
        step(wall, dt * TIME_SCALE, simT);
        simT += dt;
        render();
    }
    requestAnimationFrame(frame);
})();
