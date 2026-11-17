(function (global) {
  'use strict';

  /**
   * 賽博龐克 3D 美術與視覺特效模組 (Three.js r128)
   * 提供競技場、可進化武器模型、多類型敵人與 Boss、3D 衝擊波與浮動傷害文字。
   */

  const _cache = {
    textures: {},
    geometries: {},
    materials: {}
  };

  function getGeo(key, factory) {
    if (!_cache.geometries[key]) {
      _cache.geometries[key] = factory();
    }
    return _cache.geometries[key];
  }

  function getMat(key, factory) {
    if (!_cache.materials[key]) {
      _cache.materials[key] = factory();
    }
    return _cache.materials[key];
  }

  function getTex(key, factory) {
    if (!_cache.textures[key]) {
      _cache.textures[key] = factory();
    }
    return _cache.textures[key];
  }

  function toCssColor(color, fallback) {
    if (typeof color === 'number' && Number.isFinite(color)) {
      return '#' + (color & 0xffffff).toString(16).padStart(6, '0');
    }
    if (typeof color === 'string' && color.trim().length > 0) {
      return color.trim();
    }
    return fallback || '#00ffcc';
  }

  function toThreeColor(color, fallbackHex) {
    if (color && color.isColor) return color.clone();
    try {
      return new THREE.Color(color !== undefined && color !== null ? color : fallbackHex);
    } catch (_) {
      return new THREE.Color(fallbackHex || 0x00ffcc);
    }
  }

  // ==========================================
  // 程序化貼圖生成器 (Zero external assets)
  // ==========================================

  function getGlowTexture() {
    return getTex('glow_soft', function () {
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 128;
      const ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
      g.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
      g.addColorStop(0.25, 'rgba(255, 255, 255, 0.72)');
      g.addColorStop(0.55, 'rgba(255, 255, 255, 0.22)');
      g.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 128);
      const tex = new THREE.CanvasTexture(c);
      tex.needsUpdate = true;
      return tex;
    });
  }

  function getShockwaveRingTexture() {
    return getTex('shockwave_ring', function () {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 256;
      const ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(128, 128, 56, 128, 128, 126);
      g.addColorStop(0.0, 'rgba(255, 255, 255, 0.0)');
      g.addColorStop(0.45, 'rgba(255, 255, 255, 0.18)');
      g.addColorStop(0.76, 'rgba(255, 255, 255, 0.95)');
      g.addColorStop(0.90, 'rgba(255, 255, 255, 0.85)');
      g.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 256);
      const tex = new THREE.CanvasTexture(c);
      tex.needsUpdate = true;
      return tex;
    });
  }

  function getFloorTexture() {
    return getTex('arena_floor', function () {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 512;
      const ctx = c.getContext('2d');

      ctx.fillStyle = '#050b18';
      ctx.fillRect(0, 0, 512, 512);

      // 裝甲板區塊微色差
      for (let gx = 0; gx < 4; gx++) {
        for (let gy = 0; gy < 4; gy++) {
          ctx.fillStyle = (gx + gy) % 2 === 0 ? '#070f21' : '#060c1b';
          ctx.fillRect(gx * 128 + 3, gy * 128 + 3, 122, 122);
        }
      }

      // 次級細網格線
      ctx.strokeStyle = 'rgba(30, 64, 140, 0.38)';
      ctx.lineWidth = 2;
      for (let i = 0; i <= 512; i += 64) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 512);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(512, i);
        ctx.stroke();
      }

      // 電路節點與對角接縫
      ctx.strokeStyle = 'rgba(0, 255, 204, 0.28)';
      ctx.lineWidth = 2;
      for (let gx = 0; gx < 4; gx++) {
        for (let gy = 0; gy < 4; gy++) {
          const ox = gx * 128;
          const oy = gy * 128;
          ctx.strokeRect(ox + 10, oy + 10, 108, 108);
          ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
          ctx.fillRect(ox + 18, oy + 18, 6, 6);
          ctx.fillRect(ox + 104, oy + 104, 6, 6);
        }
      }

      // 主發光格線
      ctx.strokeStyle = 'rgba(0, 255, 204, 0.6)';
      ctx.lineWidth = 3;
      ctx.strokeRect(1.5, 1.5, 509, 509);

      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(20, 20);
      tex.anisotropy = 4;
      tex.needsUpdate = true;
      return tex;
    });
  }

  function getRuneCircleTexture() {
    return getTex('arena_rune', function () {
      const c = document.createElement('canvas');
      c.width = 1024;
      c.height = 1024;
      const ctx = c.getContext('2d');
      const cx = 512;
      const cy = 512;

      ctx.clearRect(0, 0, 1024, 1024);

      const bgGlow = ctx.createRadialGradient(cx, cy, 40, cx, cy, 490);
      bgGlow.addColorStop(0.0, 'rgba(0, 255, 204, 0.25)');
      bgGlow.addColorStop(0.45, 'rgba(56, 189, 248, 0.12)');
      bgGlow.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = bgGlow;
      ctx.fillRect(0, 0, 1024, 1024);

      function ring(r, w, color, dash) {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = w;
        if (dash) ctx.setLineDash(dash);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      ring(470, 6, 'rgba(0, 255, 204, 0.85)');
      ring(448, 3, 'rgba(56, 189, 248, 0.6)', [24, 14]);
      ring(385, 8, 'rgba(0, 255, 204, 0.55)', [64, 24, 14, 24]);
      ring(310, 4, 'rgba(168, 85, 247, 0.75)');
      ring(230, 5, 'rgba(56, 189, 248, 0.85)', [32, 16]);
      ring(130, 6, 'rgba(0, 255, 204, 0.95)');

      // 正六邊形能量陣
      ctx.strokeStyle = 'rgba(0, 255, 204, 0.75)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (let i = 0; i <= 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const x = cx + Math.cos(a) * 380;
        const y = cy + Math.sin(a) * 380;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // 刻度線
      ctx.strokeStyle = 'rgba(165, 243, 252, 0.7)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 36; i++) {
        const a = (i / 36) * Math.PI * 2;
        const r1 = i % 3 === 0 ? 412 : 428;
        const r2 = 446;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
        ctx.stroke();
      }

      const tex = new THREE.CanvasTexture(c);
      tex.needsUpdate = true;
      return tex;
    });
  }

  function getCoverArmorTexture() {
    return getTex('cover_armor', function () {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 512;
      const ctx = c.getContext('2d');

      const grad = ctx.createLinearGradient(0, 0, 0, 512);
      grad.addColorStop(0, '#18243f');
      grad.addColorStop(0.5, '#10192d');
      grad.addColorStop(1, '#090f1d');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 512, 512);

      // 裝甲板接縫與強化筋
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
      ctx.lineWidth = 4;
      ctx.strokeRect(18, 18, 476, 476);
      ctx.strokeRect(42, 42, 428, 360);

      // 對角線科技紋理
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
      ctx.lineWidth = 2;
      for (let y = 70; y < 370; y += 36) {
        ctx.beginPath();
        ctx.moveTo(64, y);
        ctx.lineTo(448, y);
        ctx.stroke();
      }

      // 底部警示斜紋
      ctx.save();
      ctx.beginPath();
      ctx.rect(18, 430, 476, 56);
      ctx.clip();
      ctx.fillStyle = '#0b1220';
      ctx.fillRect(18, 430, 476, 56);
      ctx.fillStyle = 'rgba(250, 204, 21, 0.52)';
      for (let x = -60; x < 540; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 486);
        ctx.lineTo(x + 20, 486);
        ctx.lineTo(x + 48, 430);
        ctx.lineTo(x + 28, 430);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      const tex = new THREE.CanvasTexture(c);
      tex.needsUpdate = true;
      return tex;
    });
  }

  function getSkylineTexture(variant) {
    return getTex('skyline_' + variant, function () {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 512;
      const ctx = c.getContext('2d');

      ctx.fillStyle = '#030612';
      ctx.fillRect(0, 0, 256, 512);

      const palettes = {
        cyan: ['#00ffcc', '#38bdf8', '#0284c7'],
        magenta: ['#e879f9', '#a855f7', '#38bdf8'],
        amber: ['#facc15', '#fb923c', '#00ffcc']
      };
      const cols = palettes[variant] || palettes.cyan;

      // 窗格矩陣 (使用於 emissiveMap 時僅亮處自發光)
      let seed = variant.charCodeAt(0) * 137 + 17;
      function rand() {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
      }

      for (let row = 16; row < 496; row += 16) {
        const floorLit = rand() > 0.28;
        if (!floorLit) continue;
        const rowColor = cols[Math.floor(rand() * cols.length)];
        for (let col = 14; col < 242; col += 18) {
          if (rand() > 0.42) {
            ctx.fillStyle = rowColor;
            ctx.globalAlpha = 0.35 + rand() * 0.65;
            ctx.fillRect(col, row, 10, 8);
          }
        }
      }

      // 垂直霓虹燈條
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = cols[0];
      ctx.fillRect(6, 12, 3, 488);
      ctx.fillStyle = cols[1];
      ctx.fillRect(247, 12, 3, 488);
      ctx.globalAlpha = 1.0;

      const tex = new THREE.CanvasTexture(c);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.needsUpdate = true;
      return tex;
    });
  }

  function getSkyDomeTexture() {
    return getTex('sky_dome', function () {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 512;
      const ctx = c.getContext('2d');

      const g = ctx.createLinearGradient(0, 0, 0, 512);
      g.addColorStop(0.00, '#01030a');
      g.addColorStop(0.24, '#050c24');
      g.addColorStop(0.42, '#0a1c42');
      g.addColorStop(0.49, '#191345');
      g.addColorStop(0.52, '#0c2c4a');
      g.addColorStop(0.65, '#040917');
      g.addColorStop(1.00, '#02040b');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 512, 512);

      // 水平賽博極光霓虹帶
      const aurora = ctx.createLinearGradient(0, 175, 512, 245);
      aurora.addColorStop(0.0, 'rgba(0, 255, 204, 0.0)');
      aurora.addColorStop(0.25, 'rgba(56, 189, 248, 0.14)');
      aurora.addColorStop(0.55, 'rgba(168, 85, 247, 0.16)');
      aurora.addColorStop(0.85, 'rgba(0, 255, 204, 0.10)');
      aurora.addColorStop(1.0, 'rgba(0, 255, 204, 0.0)');
      ctx.fillStyle = aurora;
      ctx.fillRect(0, 160, 512, 100);

      const tex = new THREE.CanvasTexture(c);
      tex.needsUpdate = true;
      return tex;
    });
  }

  function getHpBarTexture() {
    return getTex('hp_bar_tex', function () {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 32;
      const ctx = c.getContext('2d');
      const g = ctx.createLinearGradient(0, 0, 256, 0);
      g.addColorStop(0.0, '#00ffcc');
      g.addColorStop(0.55, '#38bdf8');
      g.addColorStop(1.0, '#00ffcc');
      ctx.fillStyle = g;
      ctx.fillRect(0, 2, 256, 28);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fillRect(0, 4, 256, 6);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, 254, 30);

      const tex = new THREE.CanvasTexture(c);
      tex.needsUpdate = true;
      return tex;
    });
  }

  // ==========================================
  // 1. 賽博龐克立體競技場 buildArena(scene, obstacles)
  // ==========================================

  function buildArena(scene, obstacles) {
    if (!scene) throw new Error('GameArt.buildArena requires a THREE.Scene');
    const obstacleList = Array.isArray(obstacles) ? obstacles : [];

    const arenaGroup = new THREE.Group();
    arenaGroup.name = 'CyberArena';

    // 燈光與大氣霧效（若場景尚未建立基礎燈光則補齊）
    const hasLight = scene.children.some(function (ch) { return ch && ch.isLight; });
    if (!hasLight) {
      const amb = new THREE.AmbientLight(0x4a6090, 1.35);
      const sun = new THREE.DirectionalLight(0xa5f3fc, 1.15);
      sun.position.set(20, 40, 20);
      arenaGroup.add(amb, sun);
    }
    const hemi = new THREE.HemisphereLight(0x38bdf8, 0x1a0b33, 0.55);
    const rimLight = new THREE.DirectionalLight(0xa855f7, 0.65);
    rimLight.position.set(-28, 22, -26);
    arenaGroup.add(hemi, rimLight);

    scene.background = new THREE.Color(0x030612);
    scene.fog = new THREE.FogExp2(0x040818, 0.0105);

    // 1.1 立體漸層天空穹頂（即時載入 AI 生成全景賽博夜空貼圖）
    const skyDomeMat = new THREE.MeshBasicMaterial({
      map: getSkyDomeTexture(),
      side: THREE.BackSide,
      fog: false,
      depthWrite: false
    });
    if (typeof THREE.TextureLoader === 'function') {
      new THREE.TextureLoader().load('assets/cyber_sky.jpg', function (tex) {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.repeat.set(2, 1);
        skyDomeMat.map = tex;
        skyDomeMat.needsUpdate = true;
      });
    }
    const skyDome = new THREE.Mesh(
      getGeo('sky_dome', function () { return new THREE.SphereGeometry(185, 36, 26); }),
      skyDomeMat
    );
    arenaGroup.add(skyDome);

    // 1.2 粒子星塵（遠距星空 + 競技場內浮動賽博光塵）
    const starCount = 650;
    const starPos = new Float32Array(starCount * 3);
    const starCol = new Float32Array(starCount * 3);
    const starPalette = [
      new THREE.Color(0x00ffcc),
      new THREE.Color(0x38bdf8),
      new THREE.Color(0xe879f9),
      new THREE.Color(0xffffff)
    ];
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.44; // 上半球
      const r = 78 + Math.random() * 72;
      starPos[i * 3] = Math.cos(theta) * Math.cos(phi) * r;
      starPos[i * 3 + 1] = Math.sin(phi) * r + 8;
      starPos[i * 3 + 2] = Math.sin(theta) * Math.cos(phi) * r;
      const c = starPalette[i % starPalette.length];
      starCol[i * 3] = c.r;
      starCol[i * 3 + 1] = c.g;
      starCol[i * 3 + 2] = c.b;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
    const starMat = new THREE.PointsMaterial({
      size: 1.7,
      map: getGlowTexture(),
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false
    });
    const starField = new THREE.Points(starGeo, starMat);
    arenaGroup.add(starField);

    const moteCount = 200;
    const motePos = new Float32Array(moteCount * 3);
    const moteCol = new Float32Array(moteCount * 3);
    const moteSpeeds = new Float32Array(moteCount);
    for (let i = 0; i < moteCount; i++) {
      motePos[i * 3] = (Math.random() - 0.5) * 68;
      motePos[i * 3 + 1] = 0.4 + Math.random() * 15.6;
      motePos[i * 3 + 2] = (Math.random() - 0.5) * 68;
      moteSpeeds[i] = 0.45 + Math.random() * 0.95;
      const c = starPalette[i % 3];
      moteCol[i * 3] = c.r;
      moteCol[i * 3 + 1] = c.g;
      moteCol[i * 3 + 2] = c.b;
    }
    const moteGeo = new THREE.BufferGeometry();
    moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
    moteGeo.setAttribute('color', new THREE.BufferAttribute(moteCol, 3));
    const moteMat = new THREE.PointsMaterial({
      size: 0.45,
      map: getGlowTexture(),
      vertexColors: true,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const cyberMotes = new THREE.Points(moteGeo, moteMat);
    arenaGroup.add(cyberMotes);

    // 1.3 多層發光地板線條與中心能量陣
    const floorMesh = new THREE.Mesh(
      getGeo('arena_floor_plane', function () { return new THREE.PlaneGeometry(160, 160); }),
      new THREE.MeshStandardMaterial({
        map: getFloorTexture(),
        roughness: 0.55,
        metalness: 0.35
      })
    );
    floorMesh.rotation.x = -Math.PI / 2;
    arenaGroup.add(floorMesh);

    const gridHelper = new THREE.GridHelper(120, 60, 0x00ffcc, 0x16264d);
    gridHelper.position.y = 0.012;
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.28;
    arenaGroup.add(gridHelper);

    const centerArray = new THREE.Group();
    centerArray.position.y = 0.025;

    const runeOuter = new THREE.Mesh(
      new THREE.PlaneGeometry(15, 15),
      new THREE.MeshBasicMaterial({
        map: getRuneCircleTexture(),
        color: 0x00ffcc,
        transparent: true,
        opacity: 0.68,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    runeOuter.rotation.x = -Math.PI / 2;

    const runeInner = new THREE.Mesh(
      new THREE.PlaneGeometry(8.6, 8.6),
      new THREE.MeshBasicMaterial({
        map: getRuneCircleTexture(),
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.62,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    runeInner.rotation.x = -Math.PI / 2;
    runeInner.position.y = 0.01;

    const floorRingMat = new THREE.MeshBasicMaterial({
      color: 0x00ffcc,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const floorRingOuter = new THREE.Mesh(new THREE.RingGeometry(7.2, 7.42, 48), floorRingMat);
    floorRingOuter.rotation.x = -Math.PI / 2;
    floorRingOuter.position.y = 0.014;

    const floorHexRing = new THREE.Mesh(
      new THREE.RingGeometry(2.7, 2.9, 6),
      new THREE.MeshBasicMaterial({
        color: 0xa855f7,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    floorHexRing.rotation.x = -Math.PI / 2;
    floorHexRing.position.y = 0.018;

    centerArray.add(runeOuter, runeInner, floorRingOuter, floorHexRing);
    arenaGroup.add(centerArray);

    // 戰鬥邊界發光圍欄（標示玩家可移動範圍 [-28, 28]）
    const borderMat = new THREE.MeshBasicMaterial({
      color: 0x00ffcc,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending
    });
    const railLen = 57.6;
    const railH = new THREE.BoxGeometry(railLen, 0.07, 0.09);
    const railV = new THREE.BoxGeometry(0.09, 0.07, railLen);
    [[-28.8, 'z'], [28.8, 'z'], [-28.8, 'x'], [28.8, 'x']].forEach(function (item) {
      const m = new THREE.Mesh(item[1] === 'z' ? railH : railV, borderMat);
      if (item[1] === 'z') m.position.set(0, 0.06, item[0]);
      else m.position.set(item[0], 0.06, 0);
      arenaGroup.add(m);
    });

    // 1.4 遠景賽博天際線高樓剪影與發光窗格
    const skylineVariants = ['cyan', 'magenta', 'amber'];
    const skylineMats = skylineVariants.map(function (v) {
      const t = getSkylineTexture(v);
      return new THREE.MeshStandardMaterial({
        color: 0x0b1224,
        map: t,
        emissive: 0xffffff,
        emissiveMap: t,
        emissiveIntensity: 0.9,
        roughness: 0.85,
        metalness: 0.25
      });
    });
    const skylineTrimColors = [0x00ffcc, 0xe879f9, 0x38bdf8, 0xfacc15];
    const beacons = [];

    const spireMetalMat = getMat('spire_metal', function () {
      return new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.3 });
    });
    const darkGlassMat = getMat('dark_glass_tower', function () {
      return new THREE.MeshStandardMaterial({ color: 0x091326, metalness: 0.75, roughness: 0.22 });
    });

    for (let i = 0; i < 44; i++) {
      const ringLayer = i < 22 ? 0 : 1;
      const baseCount = 22;
      const idxInLayer = i % baseCount;
      const ang = (idxInLayer / baseCount) * Math.PI * 2 + (ringLayer * 0.14) + ((i % 3) - 1) * 0.04;
      const radius = ringLayer === 0 ? (47 + (i % 4) * 4.5) : (72 + (i % 5) * 6.5);
      const bx = Math.cos(ang) * radius;
      const bz = Math.sin(ang) * radius;
      const bw = 4.8 + ((i * 7) % 6) * 1.1;
      const bd = 4.8 + ((i * 5) % 5) * 1.1;
      const bh = (ringLayer === 0 ? 22 : 35) + ((i * 13) % 11) * 4.6;

      const matIdx = i % skylineMats.length;
      const trimColor = skylineTrimColors[i % skylineTrimColors.length];
      const trimMat = new THREE.MeshBasicMaterial({ color: trimColor, transparent: true, opacity: 0.82 });
      const tower = new THREE.Group();
      tower.position.set(bx, 0, bz);
      tower.rotation.y = -ang;

      const archType = i % 6;
      let topY = bh;

      if (archType === 0) {
        // 造型 1：斜角金字塔企業總部（梯形削角柱體 + 垂直發光肋條）
        const monoGeo = new THREE.CylinderGeometry(bw * 0.26, bw * 0.68, bh, 4);
        const mono = new THREE.Mesh(monoGeo, skylineMats[matIdx]);
        mono.rotation.y = Math.PI / 4;
        mono.position.y = bh / 2;
        tower.add(mono);

        const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.28, bh * 0.92, bw * 0.82), trimMat);
        ridge.position.y = bh * 0.46;
        tower.add(ridge);

        const halo = new THREE.Mesh(new THREE.TorusGeometry(bw * 0.32, 0.2, 6, 4), trimMat);
        halo.rotation.x = Math.PI / 2;
        halo.rotation.z = Math.PI / 4;
        halo.position.y = bh * 0.78;
        tower.add(halo);
        topY = bh;
      } else if (archType === 1) {
        // 造型 2：雙子連橋摩天塔（左右雙塔 + 中高段雙層發光空中連廊）
        const subW = bw * 0.44;
        const gap = bw * 0.54;
        [-gap, gap].forEach(function (ox, idx) {
          const hSub = idx === 0 ? bh : bh * 0.88;
          const b = new THREE.Mesh(new THREE.BoxGeometry(subW, hSub, bd * 0.82), skylineMats[matIdx]);
          b.position.set(ox, hSub / 2, 0);
          tower.add(b);
          const neonEdge = new THREE.Mesh(new THREE.BoxGeometry(0.22, hSub, 0.22), trimMat);
          neonEdge.position.set(ox + (idx === 0 ? -subW / 2 : subW / 2), hSub / 2, bd * 0.41);
          tower.add(neonEdge);
        });
        [0.52, 0.74].forEach(function (frac) {
          const bridge = new THREE.Mesh(new THREE.BoxGeometry(gap * 2, 1.3, bd * 0.42), darkGlassMat);
          bridge.position.set(0, bh * frac, 0);
          const bLight = new THREE.Mesh(new THREE.BoxGeometry(gap * 2 + 0.1, 0.26, bd * 0.46), trimMat);
          bLight.position.set(0, bh * frac, 0);
          tower.add(bridge, bLight);
        });
        topY = bh;
      } else if (archType === 2) {
        // 造型 3：懸臂錯位科幻大廈（Z 字錯層挑空塊體 + 懸臂底燈）
        const lowerH = bh * 0.45;
        const midH = bh * 0.34;
        const upperH = bh * 0.26;
        const base = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.72, lowerH, bd * 0.72), skylineMats[matIdx]);
        base.position.set(-bw * 0.1, lowerH / 2, 0);
        const mid = new THREE.Mesh(new THREE.BoxGeometry(bw * 1.15, midH, bd * 0.86), skylineMats[matIdx]);
        mid.position.set(bw * 0.18, lowerH + midH * 0.45, 0);
        const underGlow = new THREE.Mesh(new THREE.BoxGeometry(bw * 1.16, 0.24, bd * 0.88), trimMat);
        underGlow.position.set(bw * 0.18, lowerH - 0.1, 0);
        const upper = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.76, upperH, bd * 0.76), skylineMats[(matIdx + 1) % skylineMats.length]);
        upper.position.set(-bw * 0.08, lowerH + midH * 0.85 + upperH / 2, 0);
        tower.add(base, mid, underGlow, upper);
        topY = lowerH + midH * 0.85 + upperH;
      } else if (archType === 3) {
        // 造型 4：八角圓柱通訊巨塔（多層發光環狀軌道 + 球型觀景/雷達圓頂）
        const cyl = new THREE.Mesh(new THREE.CylinderGeometry(bw * 0.38, bw * 0.56, bh, 8), skylineMats[matIdx]);
        cyl.position.y = bh / 2;
        tower.add(cyl);
        [0.35, 0.62, 0.86].forEach(function (frac) {
          const ring = new THREE.Mesh(new THREE.TorusGeometry(bw * (0.56 - frac * 0.16) + 0.35, 0.18, 6, 16), trimMat);
          ring.rotation.x = Math.PI / 2;
          ring.position.y = bh * frac;
          tower.add(ring);
        });
        const dome = new THREE.Mesh(new THREE.SphereGeometry(bw * 0.44, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), darkGlassMat);
        dome.position.y = bh;
        tower.add(dome);
        topY = bh + bw * 0.35;
      } else if (archType === 4) {
        // 造型 5：三段退縮階梯尖塔（Art-Deco 賽博高塔 + 四翼霓虹光柱）
        const h1 = bh * 0.46, h2 = bh * 0.34, h3 = bh * 0.22;
        const s1 = new THREE.Mesh(new THREE.BoxGeometry(bw, h1, bd), skylineMats[matIdx]);
        s1.position.y = h1 / 2;
        const s2 = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.72, h2, bd * 0.72), skylineMats[matIdx]);
        s2.position.y = h1 + h2 / 2;
        const s3 = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.42, h3, bd * 0.42), skylineMats[(matIdx + 2) % skylineMats.length]);
        s3.position.y = h1 + h2 + h3 / 2;
        const band1 = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.2, 0.3, bd + 0.2), trimMat);
        band1.position.y = h1;
        const band2 = new THREE.Mesh(new THREE.BoxGeometry(bw * 0.74 + 0.2, 0.28, bd * 0.74 + 0.2), trimMat);
        band2.position.y = h1 + h2;
        tower.add(s1, s2, s3, band1, band2);
        topY = h1 + h2 + h3;
      } else {
        // 造型 6：六角外骨骼光網稜柱塔（斜頂光柱塔）
        const hexBody = new THREE.Mesh(new THREE.CylinderGeometry(bw * 0.44, bw * 0.52, bh, 6), skylineMats[matIdx]);
        hexBody.position.y = bh / 2;
        const cage = new THREE.Mesh(
          new THREE.CylinderGeometry(bw * 0.48, bw * 0.56, bh * 0.96, 6, 4),
          new THREE.MeshBasicMaterial({ color: trimColor, wireframe: true, transparent: true, opacity: 0.35 })
        );
        cage.position.y = bh * 0.48;
        const crown = new THREE.Mesh(new THREE.ConeGeometry(bw * 0.44, 5.5, 6), darkGlassMat);
        crown.position.y = bh + 2.75;
        tower.add(hexBody, cage, crown);
        topY = bh + 5.5;
      }

      // 尖塔天線與航空警示閃燈
      if (i % 2 === 0) {
        const spireH = 6 + (i % 5) * 2.2;
        const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.22, spireH, 6), spireMetalMat);
        spire.position.y = topY + spireH / 2;
        tower.add(spire);

        const beaconMat = new THREE.MeshBasicMaterial({
          color: i % 4 === 0 ? 0xff3355 : trimColor,
          transparent: true,
          opacity: 0.9,
          fog: false
        });
        const beacon = new THREE.Mesh(
          getGeo('beacon_sphere', function () { return new THREE.SphereGeometry(0.38, 8, 8); }),
          beaconMat
        );
        beacon.position.y = topY + spireH;
        tower.add(beacon);
        beacons.push({ mesh: beacon, phase: i * 0.75 });
      }

      arenaGroup.add(tower);
    }

    // 場外環城高架磁浮軌道環（包圍戰場外圍 r=39.5, y=4.8，連結高樓與近景空間感）
    const viaductRing = new THREE.Mesh(
      new THREE.TorusGeometry(39.5, 0.52, 6, 48),
      spireMetalMat
    );
    viaductRing.rotation.x = Math.PI / 2;
    viaductRing.position.y = 4.8;
    const viaductRail = new THREE.Mesh(
      new THREE.TorusGeometry(39.1, 0.09, 6, 64),
      new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.72 })
    );
    viaductRail.rotation.x = Math.PI / 2;
    viaductRail.position.y = 5.15;
    arenaGroup.add(viaductRing, viaductRail);
    for (let p = 0; p < 12; p++) {
      const pa = ((p + 0.5) / 12) * Math.PI * 2;
      const archPillar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 4.8, 1.3), spireMetalMat);
      archPillar.position.set(Math.cos(pa) * 39.5, 2.4, Math.sin(pa) * 39.5);
      archPillar.rotation.y = -pa;
      arenaGroup.add(archPillar);
    }

    // 1.5 帶發光邊框與裝甲紋理的戰術掩體（保持 obstacles 格式 { x, z, hw, hd, h, mesh }）
    const armorBodyMat = getMat('cover_armor_mat', function () {
      return new THREE.MeshStandardMaterial({
        map: getCoverArmorTexture(),
        color: 0xffffff,
        metalness: 0.65,
        roughness: 0.38
      });
    });
    const darkTrimMat = getMat('cover_dark_trim', function () {
      return new THREE.MeshStandardMaterial({
        color: 0x0b1222,
        metalness: 0.85,
        roughness: 0.25
      });
    });

    function createCover(x, z, w, h, d, accentColor, isStepPlatform) {
      const coverGroup = new THREE.Group();
      coverGroup.position.set(x, h / 2, z);

      const boxGeo = new THREE.BoxGeometry(w, h, d);
      const box = new THREE.Mesh(boxGeo, armorBodyMat);
      coverGroup.add(box);

      // 發光霓虹邊框
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(boxGeo),
        new THREE.LineBasicMaterial({ color: accentColor, transparent: true, opacity: 0.92 })
      );
      edges.scale.setScalar(1.004);
      coverGroup.add(edges);

      // 裝甲底座與頂蓋
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(w + 0.22, 0.22, d + 0.22), darkTrimMat);
      plinth.position.y = -h / 2 + 0.11;
      const topCap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.14, 0.14, d + 0.14), darkTrimMat);
      topCap.position.y = h / 2 - 0.07;
      coverGroup.add(plinth, topCap);

      // 中段發光能量導流帶
      const glowStrip = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.05, 0.09, d + 0.05),
        new THREE.MeshBasicMaterial({ color: accentColor, transparent: true, opacity: 0.85 })
      );
      glowStrip.position.y = h * 0.14;
      coverGroup.add(glowStrip);

      // 頂部斜角防彈裝甲護鰭 / 跑酷踏台指示光環（非高塔時添加立體細節）
      if (h < 6) {
        if (isStepPlatform) {
          const padRing = new THREE.Mesh(
            new THREE.RingGeometry(Math.min(w, d) * 0.22, Math.min(w, d) * 0.34, 6),
            new THREE.MeshBasicMaterial({ color: accentColor, side: THREE.DoubleSide, transparent: true, opacity: 0.78 })
          );
          padRing.rotation.x = -Math.PI / 2;
          padRing.position.y = h / 2 + 0.015;
          coverGroup.add(padRing);
        } else {
          // 頂面斜角護欄與側邊裝甲強化肋
          const ribCount = Math.max(2, Math.floor(Math.max(w, d) / 1.2));
          const alongX = w >= d;
          for (let r = 0; r < ribCount; r++) {
            const offset = ((r + 0.5) / ribCount - 0.5) * (alongX ? w * 0.72 : d * 0.72);
            const rib = new THREE.Mesh(
              new THREE.BoxGeometry(alongX ? 0.14 : w + 0.18, h * 0.65, alongX ? d + 0.18 : 0.14),
              darkTrimMat
            );
            rib.position.set(alongX ? offset : 0, -h * 0.06, alongX ? 0 : offset);
            coverGroup.add(rib);
          }
        }
      }

      // 四角立柱裝甲護角
      const cornerGeo = new THREE.BoxGeometry(0.18, h + 0.06, 0.18);
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (sgn) {
        const c = new THREE.Mesh(cornerGeo, darkTrimMat);
        c.position.set(sgn[0] * (w / 2 - 0.04), 0, sgn[1] * (d / 2 - 0.04));
        coverGroup.add(c);
      });

      arenaGroup.add(coverGroup);
      obstacleList.push({ x: x, z: z, hw: w / 2, hd: d / 2, h: h, mesh: box });
    }

    // 內圈雙層階梯狙擊掩體（低階踏台 h=1.15 -> 上層掩體頂 h=2.25，輕鬆跳上制高點！）
    createCover(-9, -9, 3.0, 2.25, 1.3, 0x00ffcc, false);
    createCover(-10.6, -10.5, 2.4, 1.15, 1.5, 0x00ffcc, true);
    createCover(9, -9, 3.0, 2.25, 1.3, 0x00ffcc, false);
    createCover(10.6, -10.5, 2.4, 1.15, 1.5, 0x00ffcc, true);
    createCover(-9, 9, 3.0, 2.25, 1.3, 0x00ffcc, false);
    createCover(-10.6, 10.5, 2.4, 1.15, 1.5, 0x00ffcc, true);
    createCover(9, 9, 3.0, 2.25, 1.3, 0x00ffcc, false);
    createCover(10.6, 10.5, 2.4, 1.15, 1.5, 0x00ffcc, true);

    // 中圈重型防線掩體
    createCover(0, -16, 4.5, 2.6, 1.4, 0x38bdf8, false);
    createCover(0, 16, 4.5, 2.6, 1.4, 0x38bdf8, false);
    createCover(-16, 0, 1.4, 2.6, 4.5, 0x38bdf8, false);
    createCover(16, 0, 1.4, 2.6, 4.5, 0x38bdf8, false);

    // 角落雙層跑酷堡壘（銜接跳板動線：1.35m 前階梯 -> 2.75m 高台頂端）
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (sgn) {
      createCover(sgn[0] * 20.5, sgn[1] * 20.5, 2.6, 2.75, 2.6, 0xa855f7, true);
      createCover(sgn[0] * 18.0, sgn[1] * 18.0, 2.2, 1.35, 2.2, 0xe879f9, true);
    });

    // 外圈 12 座高聳能量導流塔 (h = 14 > 8，自動被雷達小地圖略過)
    const pylonRings = [];
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2;
      const px = Math.cos(ang) * 32;
      const pz = Math.sin(ang) * 32;
      const pylonColor = i % 2 === 0 ? 0x6366f1 : 0x38bdf8;
      createCover(px, pz, 2.2, 14, 2.2, pylonColor);

      const collar = new THREE.Mesh(
        new THREE.TorusGeometry(1.75, 0.08, 8, 24),
        new THREE.MeshBasicMaterial({ color: pylonColor, transparent: true, opacity: 0.78 })
      );
      collar.rotation.x = Math.PI / 2;
      collar.position.set(px, 12.6, pz);
      arenaGroup.add(collar);
      pylonRings.push({ mesh: collar, phase: i * 0.52 });
    }

    // 1.6 空中動態多環能量反應爐
    const reactorGroup = new THREE.Group();
    reactorGroup.position.set(0, 24.5, 0);

    const reactorCoreMat = new THREE.MeshStandardMaterial({
      color: 0xa5f3fc,
      emissive: 0x00ffcc,
      emissiveIntensity: 1.4,
      roughness: 0.15,
      metalness: 0.2
    });
    const reactorCore = new THREE.Mesh(new THREE.IcosahedronGeometry(2.1, 1), reactorCoreMat);

    const reactorCage = new THREE.Mesh(
      new THREE.IcosahedronGeometry(3.05, 1),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        wireframe: true,
        transparent: true,
        opacity: 0.45
      })
    );

    const reactorHalo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: getGlowTexture(),
        color: 0x00ffcc,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    reactorHalo.scale.set(15, 15, 1);

    const gimbalConfigs = [
      { r: 4.6, tube: 0.14, seg: 48, color: 0x00ffcc, rx: 0.55, ry: 0.25, speedX: 0.65, speedY: 0.9 },
      { r: 6.4, tube: 0.16, seg: 56, color: 0x38bdf8, rx: -0.75, ry: 0.45, speedX: -0.5, speedY: 0.75 },
      { r: 8.6, tube: 0.18, seg: 64, color: 0xa855f7, rx: 1.15, ry: -0.35, speedX: 0.35, speedY: -0.55 },
      { r: 11.2, tube: 0.15, seg: 72, color: 0xfacc15, rx: -0.25, ry: 0.9, speedX: -0.22, speedY: 0.42 }
    ];

    const gimbals = [];
    gimbalConfigs.forEach(function (cfg, idx) {
      const g = new THREE.Group();
      g.rotation.set(cfg.rx, cfg.ry, 0);
      const torus = new THREE.Mesh(
        new THREE.TorusGeometry(cfg.r, cfg.tube, 10, cfg.seg),
        new THREE.MeshBasicMaterial({ color: cfg.color, transparent: true, opacity: 0.8 })
      );
      g.add(torus);

      // 環上節能發光節點
      const nodeCount = 4 + (idx % 2) * 2;
      const nodeGeo = getGeo('reactor_node', function () { return new THREE.OctahedronGeometry(0.32, 0); });
      const nodeMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      for (let n = 0; n < nodeCount; n++) {
        const na = (n / nodeCount) * Math.PI * 2;
        const node = new THREE.Mesh(nodeGeo, nodeMat);
        node.position.set(Math.cos(na) * cfg.r, Math.sin(na) * cfg.r, 0);
        g.add(node);
      }

      reactorGroup.add(g);
      gimbals.push({ group: g, speedX: cfg.speedX, speedY: cfg.speedY });
    });

    // 外圍巨大天環
    const skyOuterRing = new THREE.Mesh(
      new THREE.TorusGeometry(35.5, 0.28, 10, 84),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.42 })
    );
    skyOuterRing.rotation.x = Math.PI / 2;

    const skyOuterNodes = new THREE.Group();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const node = new THREE.Mesh(
        new THREE.BoxGeometry(1.1, 0.55, 0.55),
        new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0x00ffcc : 0xa855f7 })
      );
      node.position.set(Math.cos(a) * 35.5, 0, Math.sin(a) * 35.5);
      node.rotation.y = -a;
      skyOuterNodes.add(node);
    }

    reactorGroup.add(reactorCore, reactorCage, reactorHalo, skyOuterRing, skyOuterNodes);

    // 4 道由高塔導向反應爐的微透能量連線（保持在玩家視線上方 y >= 13，不遮擋視野）
    const tetherMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const start = new THREE.Vector3(Math.cos(a) * 32, 13.5, Math.sin(a) * 32);
      const end = new THREE.Vector3(0, 24.5, 0);
      const dist = start.distanceTo(end);
      const mid = start.clone().lerp(end, 0.5);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.14, dist, 6), tetherMat);
      beam.position.copy(mid);
      beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize());
      arenaGroup.add(beam);
    }

    arenaGroup.add(reactorGroup);

    // 1.7 浮空全息霓虹廣告看板（AI 生成賽博看板貼圖，掛於天際線高樓外側）
    const holoBillboards = [];
    if (typeof THREE.TextureLoader === 'function') {
      const texLoader = new THREE.TextureLoader();
      const adTex1 = texLoader.load('assets/holo_ad_1.jpg');
      const adTex2 = texLoader.load('assets/holo_ad_2.jpg');
      for (let i = 0; i < 10; i++) {
        const isWide = i % 2 === 0;
        const ang = (i / 10) * Math.PI * 2 + 0.18;
        const rad = isWide ? 43.5 : 46.5;
        const bw = isWide ? 12.5 : 6.8;
        const bh = isWide ? 7.0 : 12.0;
        const by = isWide ? (12.5 + (i % 3) * 3.0) : (16.5 + (i % 2) * 3.5);

        const adGroup = new THREE.Group();
        adGroup.position.set(Math.cos(ang) * rad, by, Math.sin(ang) * rad);
        adGroup.lookAt(0, by, 0);

        const adMat = new THREE.MeshBasicMaterial({
          map: isWide ? adTex1 : adTex2,
          transparent: true,
          opacity: 0.90,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          depthWrite: false,
          fog: false
        });
        const adPlane = new THREE.Mesh(new THREE.PlaneGeometry(bw, bh), adMat);
        adGroup.add(adPlane);

        // 看板上下發光支架邊條
        const barColor = isWide ? 0x00ffcc : 0xe879f9;
        const barMat = new THREE.MeshBasicMaterial({ color: barColor, transparent: true, opacity: 0.85, fog: false });
        const topBar = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.4, 0.18, 0.18), barMat);
        topBar.position.y = bh / 2 + 0.2;
        const botBar = topBar.clone();
        botBar.position.y = -bh / 2 - 0.2;
        adGroup.add(topBar, botBar);

        arenaGroup.add(adGroup);
        holoBillboards.push({ group: adGroup, mat: adMat, baseY: by, phase: i * 0.9 });
      }
    }

    // 1.8 高空穿梭賽博飛行車流 (26 台 Blade Runner 風格流線浮空飛車)
    const hoverCars = [];
    const carBodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.85, roughness: 0.25 });
    const carCanopyMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.55,
      metalness: 0.9,
      roughness: 0.12
    });

    // 共用幾何體：流線楔形車身（+X 經 rotation.y = -PI/2 對齊車頭 +Z）
    const carShape = new THREE.Shape();
    carShape.moveTo(-1.15, -0.14);
    carShape.lineTo(1.35, -0.12);
    carShape.lineTo(1.52, 0.02);
    carShape.lineTo(0.45, 0.22);
    carShape.lineTo(-0.75, 0.24);
    carShape.lineTo(-1.20, 0.06);
    carShape.closePath();
    const carHullGeo = new THREE.ExtrudeGeometry(carShape, {
      depth: 0.66,
      bevelEnabled: true,
      bevelThickness: 0.06,
      bevelSize: 0.05,
      bevelSegments: 2
    });
    carHullGeo.translate(0, 0, -0.33);
    carHullGeo.rotateY(-Math.PI / 2);

    const canopyShape = new THREE.Shape();
    canopyShape.moveTo(-0.55, 0.16);
    canopyShape.lineTo(0.62, 0.14);
    canopyShape.lineTo(0.18, 0.38);
    canopyShape.lineTo(-0.42, 0.36);
    canopyShape.closePath();
    const carCanopyGeo = new THREE.ExtrudeGeometry(canopyShape, {
      depth: 0.44,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 1
    });
    carCanopyGeo.translate(0, 0, -0.22);
    carCanopyGeo.rotateY(-Math.PI / 2);

    const podGeo = new THREE.CylinderGeometry(0.14, 0.18, 1.35, 8);
    podGeo.rotateX(Math.PI / 2);
    const wingGeo = new THREE.BoxGeometry(1.55, 0.06, 0.55);
    const trailConeGeo = new THREE.ConeGeometry(0.12, 3.2, 8);
    trailConeGeo.rotateX(-Math.PI / 2); // 尖端朝 -Z 向後拖曳

    for (let i = 0; i < 26; i++) {
      const car = new THREE.Group();
      const hull = new THREE.Mesh(carHullGeo, carBodyMat);
      const canopy = new THREE.Mesh(carCanopyGeo, carCanopyMat);
      const wing = new THREE.Mesh(wingGeo, carBodyMat);
      wing.position.set(0, -0.02, -0.35);
      car.add(hull, canopy, wing);

      // 左右雙浮空渦輪推進莢艙
      const podL = new THREE.Mesh(podGeo, carBodyMat);
      podL.position.set(-0.58, -0.02, -0.28);
      const podR = podL.clone();
      podR.position.x = 0.58;
      car.add(podL, podR);

      const isCyan = i % 2 === 0;
      const headMat = new THREE.MeshBasicMaterial({ color: isCyan ? 0x00ffcc : 0x38bdf8, fog: false });
      const tailMat = new THREE.MeshBasicMaterial({
        color: isCyan ? 0xe879f9 : 0xff3355,
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false
      });

      // 雙前頭燈光條 + 雙噴射尾焰錐光束
      const headL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.07, 0.12), headMat);
      headL.position.set(-0.24, -0.04, 1.44);
      const headR = headL.clone();
      headR.position.x = 0.24;

      const trailL = new THREE.Mesh(trailConeGeo, tailMat);
      trailL.position.set(-0.58, -0.02, -2.55);
      const trailR = trailL.clone();
      trailR.position.x = 0.58;
      car.add(headL, headR, trailL, trailR);

      const lane = i % 3;
      const orbitR = 37 + lane * 9.5 + (i % 4) * 1.4;
      const dir = lane % 2 === 0 ? 1 : -1;
      const speed = dir * (0.14 + (i % 5) * 0.035);
      const alt = 7.5 + lane * 6.5 + (i % 3) * 1.8;
      const angle = (i / 26) * Math.PI * 2;

      arenaGroup.add(car);
      hoverCars.push({ mesh: car, radius: orbitR, angle: angle, speed: speed, alt: alt, phase: i * 0.7 });
    }

    // 1.9 都市天際線旋轉探照光束（高空掃描夜空）
    const searchlights = [];
    const beamGeo = new THREE.CylinderGeometry(0.28, 3.8, 62, 12, 1, true);
    beamGeo.translate(0, 31, 0);
    [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5].forEach(function (ang, idx) {
      const pivot = new THREE.Group();
      pivot.position.set(Math.cos(ang) * 44, 18, Math.sin(ang) * 44);
      const beamMat = new THREE.MeshBasicMaterial({
        color: idx % 2 === 0 ? 0x38bdf8 : 0xe879f9,
        transparent: true,
        opacity: 0.065,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false
      });
      const cone = new THREE.Mesh(beamGeo, beamMat);
      cone.rotation.z = 0.48;
      pivot.add(cone);
      arenaGroup.add(pivot);
      searchlights.push({ pivot: pivot, speed: (idx % 2 === 0 ? 1 : -1) * 0.38, phase: idx * 1.4 });
    });

    // 1.10 外部 CC0 3D 動畫離子引擎模型載入（GLTFLoader 載入 models/PrimaryIonDrive.glb）
    let gltfMixer = null;
    if (typeof THREE.GLTFLoader === 'function') {
      const gltfLoader = new THREE.GLTFLoader();
      gltfLoader.load(
        'models/PrimaryIonDrive.glb',
        function (gltf) {
          const driveModel = gltf.scene;
          driveModel.scale.setScalar(2.4);
          driveModel.traverse(function (obj) {
            if (obj.isMesh && obj.material) {
              if (obj.material.emissiveIntensity !== undefined) {
                obj.material.emissiveIntensity = Math.max(obj.material.emissiveIntensity || 1, 1.35);
              }
            }
          });
          reactorCore.visible = false;
          reactorGroup.add(driveModel);
          if (gltf.animations && gltf.animations.length > 0) {
            gltfMixer = new THREE.AnimationMixer(driveModel);
            gltfMixer.clipAction(gltf.animations[0]).play();
          }
        },
        undefined,
        function () {
          // 若離線或載入失敗，自動維持原本幾何反應爐核心
        }
      );
    }

    scene.add(arenaGroup);

    // 動態更新迴圈
    let elapsed = 0;
    function update(dt) {
      const safeDt = (typeof dt === 'number' && Number.isFinite(dt)) ? Math.min(Math.max(dt, 0), 0.1) : 0.016;
      elapsed += safeDt;

      if (gltfMixer) {
        gltfMixer.update(safeDt);
      }

      // 浮空全息看板漂浮與掃描閃爍
      for (let i = 0; i < holoBillboards.length; i++) {
        const hb = holoBillboards[i];
        hb.group.position.y = hb.baseY + Math.sin(elapsed * 1.3 + hb.phase) * 0.45;
        hb.mat.opacity = 0.82 + Math.sin(elapsed * 5.0 + hb.phase) * 0.08;
      }

      // 飛行車流巡航更新
      for (let i = 0; i < hoverCars.length; i++) {
        const hc = hoverCars[i];
        hc.angle += hc.speed * safeDt;
        const cx = Math.cos(hc.angle) * hc.radius;
        const cz = Math.sin(hc.angle) * hc.radius;
        const cy = hc.alt + Math.sin(elapsed * 2.1 + hc.phase) * 0.45;
        hc.mesh.position.set(cx, cy, cz);
        const tangentAngle = hc.speed >= 0 ? -hc.angle : -hc.angle + Math.PI;
        hc.mesh.rotation.set(0, tangentAngle, hc.speed >= 0 ? -0.14 : 0.14);
      }

      // 天際線探照燈掃描
      for (let i = 0; i < searchlights.length; i++) {
        const sl = searchlights[i];
        sl.pivot.rotation.y += sl.speed * safeDt;
      }

      // 地板能量陣旋轉與脈動
      runeOuter.rotation.z -= safeDt * 0.22;
      runeInner.rotation.z += safeDt * 0.45;
      floorHexRing.rotation.z -= safeDt * 0.35;
      const pulse = 0.55 + Math.sin(elapsed * 2.4) * 0.18;
      floorRingMat.opacity = pulse;

      // 空中多環能量反應爐
      reactorCore.rotation.y += safeDt * 0.85;
      reactorCore.rotation.x += safeDt * 0.35;
      reactorCage.rotation.y -= safeDt * 0.5;
      reactorCage.rotation.z += safeDt * 0.25;
      const coreScale = 1 + Math.sin(elapsed * 3.1) * 0.06;
      reactorCore.scale.setScalar(coreScale);
      reactorHalo.scale.setScalar(14.5 + Math.sin(elapsed * 2.5) * 1.4);
      skyOuterNodes.rotation.y += safeDt * 0.16;

      for (let i = 0; i < gimbals.length; i++) {
        const gb = gimbals[i];
        gb.group.rotation.x += safeDt * gb.speedX;
        gb.group.rotation.y += safeDt * gb.speedY;
      }

      // 外圈高塔環浮動
      for (let i = 0; i < pylonRings.length; i++) {
        const pr = pylonRings[i];
        pr.mesh.position.y = 12.6 + Math.sin(elapsed * 2.0 + pr.phase) * 0.45;
      }

      // 天際線警示閃燈
      for (let i = 0; i < beacons.length; i++) {
        const b = beacons[i];
        b.mesh.material.opacity = 0.25 + 0.75 * Math.max(0, Math.sin(elapsed * 3.2 + b.phase));
      }

      // 星塵緩慢飄動
      starField.rotation.y += safeDt * 0.008;
      const posArr = moteGeo.attributes.position.array;
      for (let i = 0; i < moteCount; i++) {
        posArr[i * 3 + 1] += moteSpeeds[i] * safeDt;
        if (posArr[i * 3 + 1] > 16) {
          posArr[i * 3 + 1] = 0.4;
        }
      }
      moteGeo.attributes.position.needsUpdate = true;
    }

    return {
      group: arenaGroup,
      update: update,
      dispose: function () {
        scene.remove(arenaGroup);
      }
    };
  }

  // ==========================================
  // 2. 精緻流線科幻 3D 武器與第一人稱裝甲手部 buildWeaponModel(style)
  // ==========================================

  let _gunMetalTex = null;
  function getGunMetalTexture() {
    if (_gunMetalTex) return _gunMetalTex;
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 128, 128);
    // 細緻碳纖維斜紋 + 拉絲金屬質感
    for (let y = 0; y < 128; y += 4) {
      for (let x = 0; x < 128; x += 4) {
        const checker = ((x + y) / 4) % 2 === 0;
        ctx.fillStyle = checker ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.14)';
        ctx.fillRect(x, y, 3, 2);
      }
      ctx.fillStyle = y % 8 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';
      ctx.fillRect(0, y, 128, 1);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 3);
    _gunMetalTex = tex;
    return tex;
  }

  /**
   * 依 2D 側視輪廓建立帶 45° 倒角的立體槍身部件
   * 輪廓座標：(fwd = 朝槍口 -Z 的距離, up = 高度 +Y)
   */
  function createBeveledPart(points, width, material, bevel) {
    const b = bevel === undefined ? 0.008 : bevel;
    const shape = new THREE.Shape();
    shape.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) {
      shape.lineTo(points[i][0], points[i][1]);
    }
    shape.closePath();
    const innerDepth = Math.max(0.006, width - b * 2);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: innerDepth,
      bevelEnabled: b > 0,
      bevelThickness: b,
      bevelSize: b,
      bevelSegments: 2
    });
    geo.translate(0, 0, -innerDepth / 2);
    const mesh = new THREE.Mesh(geo, material);
    mesh.rotation.y = Math.PI / 2;
    return mesh;
  }

  /** 槍背皮卡汀尼戰術導軌 */
  function addPicatinnyRail(parent, y, zStart, zEnd, teeth, mat) {
    const len = Math.abs(zStart - zEnd);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.01, len), mat);
    base.position.set(0, y, (zStart + zEnd) / 2);
    parent.add(base);
    const step = len / teeth;
    for (let i = 0; i < teeth; i++) {
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.009, step * 0.55), mat);
      tooth.position.set(0, y + 0.008, zStart - (i + 0.5) * step);
      parent.add(tooth);
    }
  }

  /** 鏤空全息瞄具（含半透明鏡片與懸浮準星） */
  function addHoloSight(parent, y, z, frameMat, energyMat) {
    const sight = new THREE.Group();
    sight.position.set(0, y, z);

    const base = createBeveledPart([
      [-0.055, 0], [0.055, 0], [0.048, 0.016], [-0.048, 0.016]
    ], 0.046, frameMat, 0.004);
    sight.add(base);

    const hood = createBeveledPart([
      [-0.038, 0.014], [0.038, 0.014], [0.030, 0.058], [0.018, 0.058],
      [0.022, 0.024], [-0.022, 0.024], [-0.018, 0.058], [-0.030, 0.058]
    ], 0.042, frameMat, 0.003);
    sight.add(hood);

    const archTop = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.008, 0.052), frameMat);
    archTop.position.set(0, 0.057, 0);
    sight.add(archTop);

    const glassMat = new THREE.MeshBasicMaterial({
      color: energyMat.color,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const lens = new THREE.Mesh(new THREE.PlaneGeometry(0.034, 0.032), glassMat);
    lens.position.set(0, 0.038, 0);
    sight.add(lens);

    const dot = new THREE.Mesh(new THREE.OctahedronGeometry(0.0045, 0), energyMat);
    dot.position.set(0, 0.038, -0.002);
    sight.add(dot);

    parent.add(sight);
  }

  function buildWeaponModel(style) {
    const weaponStyle = style || 'pistol';
    const group = new THREE.Group();
    group.name = 'Weapon_' + weaponStyle;

    // 專屬第一人稱武器微補光（輕微勾勒槍身倒角即可，保留深色金屬質感）
    const weaponKeyLight = new THREE.PointLight(0xdbeafe, 0.82, 2.3);
    weaponKeyLight.position.set(-0.20, 0.30, 0.24);
    group.add(weaponKeyLight);

    const metalBump = getGunMetalTexture();
    const darkFrameMat = new THREE.MeshStandardMaterial({
      color: 0x1a2639,
      metalness: 0.82,
      roughness: 0.30,
      bumpMap: metalBump,
      bumpScale: 0.0025
    });
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x6b7c93,
      metalness: 0.88,
      roughness: 0.22,
      bumpMap: metalBump,
      bumpScale: 0.0018
    });
    const matteGripMat = new THREE.MeshStandardMaterial({
      color: 0x111a2e,
      metalness: 0.28,
      roughness: 0.78
    });

    const tierColorMap = {
      pistol: 0x00ffcc,
      smg: 0x38bdf8,
      shotgun: 0xfacc15,
      railgun: 0xfacc15,
      plasma: 0xe879f9
    };
    const defaultColor = tierColorMap[weaponStyle] || 0x00ffcc;
    const energyMat = new THREE.MeshStandardMaterial({
      color: defaultColor,
      emissive: defaultColor,
      emissiveIntensity: 0.85,
      roughness: 0.2,
      metalness: 0.3
    });

    let muzzleTip = null;
    const spinParts = [];
    const recoilParts = [];
    const reloadMagParts = [];
    const drumStepParts = [];

    if (weaponStyle === 'smg') {
      // 雙管脈衝衝鋒槍（斜角流線機匣 + 導軌 + 全息鏡 + 往復拉柄 + 裝甲手）
      const chassis = createBeveledPart([
        [-0.20, -0.035], [0.24, -0.035], [0.28, -0.008], [0.28, 0.042],
        [0.16, 0.058], [-0.14, 0.058], [-0.21, 0.032]
      ], 0.096, darkFrameMat, 0.009);
      group.add(chassis);

      // 後托緩衝管與貼腮斜坡
      const stock = createBeveledPart([
        [-0.31, -0.025], [-0.19, -0.03], [-0.19, 0.042], [-0.30, 0.028]
      ], 0.068, matteGripMat, 0.006);
      group.add(stock);

      // 人體工學斜角握把 + 護弓
      const grip = createBeveledPart([
        [-0.12, -0.14], [-0.055, -0.14], [-0.03, -0.03], [-0.095, -0.03]
      ], 0.050, matteGripMat, 0.006);
      group.add(grip);

      const triggerGuard = createBeveledPart([
        [-0.045, -0.068], [0.025, -0.068], [0.035, -0.032], [0.02, -0.032],
        [0.014, -0.056], [-0.04, -0.056]
      ], 0.022, darkFrameMat, 0.002);
      group.add(triggerGuard);

      // 前傾彈匣（換彈時可抽離下沉）
      const mag = createBeveledPart([
        [0.035, -0.165], [0.092, -0.155], [0.112, -0.03], [0.055, -0.03]
      ], 0.042, steelMat, 0.004);
      mag.userData.baseY = 0;
      reloadMagParts.push(mag);
      group.add(mag);

      // 垂直斜角前握把
      const foreGrip = createBeveledPart([
        [0.21, -0.125], [0.258, -0.125], [0.242, -0.032], [0.194, -0.032]
      ], 0.044, matteGripMat, 0.005);
      group.add(foreGrip);

      // 斜切散熱護木套筒
      const shroud = createBeveledPart([
        [0.22, -0.022], [0.46, -0.015], [0.485, 0.032], [0.45, 0.052], [0.22, 0.052]
      ], 0.092, steelMat, 0.007);
      group.add(shroud);

      // 雙管精密槍管 + 斜切制退器
      const barrelGeo = new THREE.CylinderGeometry(0.016, 0.018, 0.36, 12);
      const bL = new THREE.Mesh(barrelGeo, steelMat);
      const bR = new THREE.Mesh(barrelGeo, steelMat);
      bL.rotation.x = bR.rotation.x = Math.PI / 2;
      bL.position.set(-0.024, 0.02, -0.40);
      bR.position.set(0.024, 0.02, -0.40);
      group.add(bL, bR);

      // 動態往復拉柄（開火時後退）
      const boltHandle = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.016, 0.055), steelMat);
      boltHandle.position.set(0.054, 0.032, -0.06);
      boltHandle.userData.baseZ = -0.06;
      boltHandle.userData.kickZ = 0.05;
      recoilParts.push(boltHandle);
      group.add(boltHandle);

      // 兩側能量導管
      const pipeGeo = new THREE.CylinderGeometry(0.007, 0.007, 0.32, 8);
      const pipeL = new THREE.Mesh(pipeGeo, energyMat);
      pipeL.rotation.x = Math.PI / 2;
      pipeL.position.set(-0.052, 0.018, -0.08);
      const pipeR = pipeL.clone();
      pipeR.position.x = 0.052;
      group.add(pipeL, pipeR);

      addPicatinnyRail(group, 0.060, 0.12, -0.18, 8, darkFrameMat);
      addHoloSight(group, 0.066, -0.04, darkFrameMat, energyMat);

      muzzleTip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.045, 8), energyMat);
      muzzleTip.rotation.x = Math.PI / 2;
      muzzleTip.position.set(0, 0.02, -0.59);
      group.add(muzzleTip);
    } else if (weaponStyle === 'shotgun') {
      // 重型榴彈/散彈砲（斜角重裝機匣 + 6孔真實旋轉彈巢 + 雙層砲管 + 裝甲手）
      const receiver = createBeveledPart([
        [-0.22, -0.045], [0.22, -0.045], [0.26, 0.01], [0.24, 0.068],
        [-0.16, 0.068], [-0.24, 0.03]
      ], 0.125, darkFrameMat, 0.01);
      group.add(receiver);

      const grip = createBeveledPart([
        [-0.14, -0.145], [-0.07, -0.145], [-0.04, -0.04], [-0.11, -0.04]
      ], 0.056, matteGripMat, 0.006);
      group.add(grip);

      // 6 孔旋轉榴彈滾筒
      const drumGroup = new THREE.Group();
      drumGroup.position.set(0, 0.014, -0.07);
      const drumCore = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.13, 18), steelMat);
      drumCore.rotation.x = Math.PI / 2;
      drumGroup.add(drumCore);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.136, 10), energyMat);
        ch.rotation.x = Math.PI / 2;
        ch.position.set(Math.cos(a) * 0.036, Math.sin(a) * 0.036, 0);
        drumGroup.add(ch);
      }
      drumStepParts.push(drumGroup);
      group.add(drumGroup);

      // 肋條泵動前護木
      const pump = createBeveledPart([
        [0.24, -0.075], [0.46, -0.072], [0.47, -0.025], [0.24, -0.025]
      ], 0.105, matteGripMat, 0.006);
      pump.userData.baseZ = 0;
      pump.userData.kickZ = 0.04;
      recoilParts.push(pump);
      group.add(pump);

      // 三管三角重型砲管 + 鏤空箍環
      const tubeGeo = new THREE.CylinderGeometry(0.023, 0.025, 0.44, 14);
      const bTop = new THREE.Mesh(tubeGeo, steelMat);
      const bBL = new THREE.Mesh(tubeGeo, steelMat);
      const bBR = new THREE.Mesh(tubeGeo, steelMat);
      bTop.rotation.x = bBL.rotation.x = bBR.rotation.x = Math.PI / 2;
      bTop.position.set(0, 0.044, -0.43);
      bBL.position.set(-0.034, -0.004, -0.43);
      bBR.position.set(0.034, -0.004, -0.43);
      group.add(bTop, bBL, bBR);

      const clampGeo = new THREE.TorusGeometry(0.056, 0.011, 6, 12);
      [-0.36, -0.56].forEach(function (cz) {
        const c = new THREE.Mesh(clampGeo, darkFrameMat);
        c.position.set(0, 0.018, cz);
        group.add(c);
      });

      addPicatinnyRail(group, 0.072, 0.12, -0.22, 8, darkFrameMat);
      addHoloSight(group, 0.078, -0.06, darkFrameMat, energyMat);

      muzzleTip = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.055, 8), energyMat);
      muzzleTip.rotation.x = Math.PI / 2;
      muzzleTip.position.set(0, 0.018, -0.66);
      group.add(muzzleTip);
    } else if (weaponStyle === 'railgun') {
      // 科幻磁軌長砲（流線狙擊機匣 + 光學狙擊鏡筒 + 雙磁軌 + 環形加速線圈 + 裝甲手）
      const body = createBeveledPart([
        [-0.24, -0.045], [0.22, -0.045], [0.27, 0.005], [0.24, 0.068],
        [-0.18, 0.068], [-0.26, 0.025]
      ], 0.104, darkFrameMat, 0.009);
      group.add(body);

      const grip = createBeveledPart([
        [-0.13, -0.145], [-0.065, -0.145], [-0.038, -0.04], [-0.102, -0.04]
      ], 0.052, matteGripMat, 0.006);
      group.add(grip);

      // 狙擊槍長條彈匣
      const sniperMag = createBeveledPart([
        [0.04, -0.14], [0.12, -0.135], [0.13, -0.04], [0.05, -0.04]
      ], 0.042, steelMat, 0.004);
      sniperMag.userData.baseY = 0;
      reloadMagParts.push(sniperMag);
      group.add(sniperMag);

      addPicatinnyRail(group, 0.072, 0.14, -0.22, 9, darkFrameMat);

      // 階梯式光學狙擊鏡筒 + 鏡環 + 發光鍍膜透鏡
      const scopeGroup = new THREE.Group();
      scopeGroup.position.set(0, 0.118, -0.06);
      const scopeMain = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.22, 16), steelMat);
      scopeMain.rotation.x = Math.PI / 2;
      const scopeFront = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.025, 0.08, 16), darkFrameMat);
      scopeFront.rotation.x = Math.PI / 2;
      scopeFront.position.z = -0.13;
      const scopeRear = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.024, 0.06, 16), darkFrameMat);
      scopeRear.rotation.x = Math.PI / 2;
      scopeRear.position.z = 0.12;
      const scopeLens = new THREE.Mesh(new THREE.CylinderGeometry(0.027, 0.027, 0.008, 16), energyMat);
      scopeLens.rotation.x = Math.PI / 2;
      scopeLens.position.z = -0.172;
      scopeGroup.add(scopeMain, scopeFront, scopeRear, scopeLens);
      [-0.06, 0.06].forEach(function (rz) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.006, 8, 14), darkFrameMat);
        ring.position.z = rz;
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.03, 0.02), darkFrameMat);
        post.position.set(0, -0.028, rz);
        scopeGroup.add(ring, post);
      });
      group.add(scopeGroup);

      // 上下斜切雙電磁加速軌
      const railTop = createBeveledPart([
        [0.20, 0.044], [0.80, 0.038], [0.83, 0.056], [0.20, 0.066]
      ], 0.048, steelMat, 0.004);
      const railBot = createBeveledPart([
        [0.20, -0.024], [0.80, -0.016], [0.83, -0.034], [0.20, -0.042]
      ], 0.048, steelMat, 0.004);
      group.add(railTop, railBot);

      // 中央高能發光磁軌核心棒
      const coreRod = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.62, 10), energyMat);
      coreRod.rotation.x = Math.PI / 2;
      coreRod.position.set(0, 0.012, -0.50);
      group.add(coreRod);

      // 4 組外露環形電磁加速線圈
      [-0.36, -0.49, -0.62, -0.75].forEach(function (cz) {
        const coilFrame = new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.009, 6, 8), darkFrameMat);
        coilFrame.position.set(0, 0.012, cz);
        const coilGlow = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.0045, 6, 12), energyMat);
        coilGlow.position.set(0, 0.012, cz);
        group.add(coilFrame, coilGlow);
      });

      // 兩側斜角散熱電容翼
      const finL = createBeveledPart([
        [-0.02, -0.02], [0.20, -0.01], [0.16, 0.045], [-0.05, 0.045]
      ], 0.016, energyMat, 0.003);
      finL.position.set(-0.06, 0.01, 0);
      const finR = finL.clone();
      finR.position.x = 0.06;
      group.add(finL, finR);

      muzzleTip = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.034, 0.06, 8), energyMat);
      muzzleTip.rotation.x = Math.PI / 2;
      muzzleTip.position.set(0, 0.012, -0.84);
      group.add(muzzleTip);
    } else if (weaponStyle === 'plasma') {
      // 終極電漿加特林（重甲機匣 + 流線提把 + 雙側能量鼓 + 6 管旋轉砲組 + 裝甲手）
      const body = createBeveledPart([
        [-0.22, -0.065], [0.20, -0.065], [0.24, 0.0], [0.20, 0.075],
        [-0.16, 0.075], [-0.24, 0.025]
      ], 0.148, darkFrameMat, 0.012);
      group.add(body);

      // 頂部斜角提把
      const handle = createBeveledPart([
        [-0.10, 0.07], [-0.07, 0.07], [-0.05, 0.115], [0.16, 0.115],
        [0.18, 0.07], [0.21, 0.07], [0.19, 0.138], [-0.08, 0.138]
      ], 0.038, steelMat, 0.004);
      group.add(handle);

      // 雙側發光電漿鼓式彈匣
      const drumGeo = new THREE.CylinderGeometry(0.050, 0.050, 0.19, 16);
      const drumL = new THREE.Mesh(drumGeo, energyMat);
      drumL.rotation.x = Math.PI / 2;
      drumL.position.set(-0.102, -0.02, -0.06);
      const drumR = drumL.clone();
      drumR.position.x = 0.102;
      drumL.userData.baseY = -0.02;
      drumR.userData.baseY = -0.02;
      reloadMagParts.push(drumL, drumR);
      group.add(drumL, drumR);

      const drumBandGeo = new THREE.TorusGeometry(0.053, 0.008, 6, 16);
      [-0.14, 0.02].forEach(function (bz) {
        const bandL = new THREE.Mesh(drumBandGeo, darkFrameMat);
        bandL.position.set(-0.102, -0.02, bz);
        const bandR = bandL.clone();
        bandR.position.x = 0.102;
        group.add(bandL, bandR);
      });

      // 6 管可旋轉加特林砲管組件
      const spinBarrelGroup = new THREE.Group();
      spinBarrelGroup.position.set(0, 0.008, -0.49);

      const gBarrelGeo = new THREE.CylinderGeometry(0.013, 0.013, 0.56, 10);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const b = new THREE.Mesh(gBarrelGeo, steelMat);
        b.rotation.x = Math.PI / 2;
        b.position.set(Math.cos(a) * 0.052, Math.sin(a) * 0.052, 0);
        spinBarrelGroup.add(b);
      }

      const centerCore = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.021, 0.52, 12), energyMat);
      centerCore.rotation.x = Math.PI / 2;
      spinBarrelGroup.add(centerCore);

      [-0.18, 0.0, 0.16].forEach(function (cz) {
        const clamp = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.012, 8, 18), darkFrameMat);
        clamp.position.z = cz;
        spinBarrelGroup.add(clamp);
      });

      spinParts.push(spinBarrelGroup);
      group.add(spinBarrelGroup);

      muzzleTip = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.05, 12), energyMat);
      muzzleTip.rotation.x = Math.PI / 2;
      muzzleTip.position.set(0, 0.008, -0.79);
      group.add(muzzleTip);
    } else {
      // 'pistol': 斜角雙色脈衝手槍（滑套後座力 + 裝甲雙手托握）
      const frame = createBeveledPart([
        [-0.12, -0.024], [0.16, -0.024], [0.18, 0.005], [-0.11, 0.005]
      ], 0.060, darkFrameMat, 0.005);
      group.add(frame);

      const grip = createBeveledPart([
        [-0.11, -0.13], [-0.048, -0.13], [-0.024, -0.02], [-0.088, -0.02]
      ], 0.048, matteGripMat, 0.005);
      group.add(grip);

      const slide = createBeveledPart([
        [-0.125, 0.004], [0.185, 0.004], [0.165, 0.054], [-0.115, 0.054]
      ], 0.066, steelMat, 0.006);
      slide.userData.baseZ = 0;
      slide.userData.kickZ = 0.045;
      recoilParts.push(slide);
      group.add(slide);

      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.018, 0.14, 12), steelMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(0, 0.022, -0.22);
      group.add(barrel);

      const glowStripL = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.011, 0.18), energyMat);
      glowStripL.position.set(-0.036, 0.026, -0.03);
      const glowStripR = glowStripL.clone();
      glowStripR.position.x = 0.036;
      group.add(glowStripL, glowStripR);

      muzzleTip = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.04, 10), energyMat);
      muzzleTip.rotation.x = Math.PI / 2;
      muzzleTip.position.set(0, 0.022, -0.30);
      group.add(muzzleTip);
    }

    // 槍口動態閃光光源 + 十字立體能量火光星芒
    const muzzleFlash = new THREE.PointLight(0xffaa00, 0, 9);
    muzzleFlash.position.set(muzzleTip.position.x, muzzleTip.position.y + 0.02, muzzleTip.position.z - 0.08);
    group.add(muzzleFlash);

    const flashGroup = new THREE.Group();
    flashGroup.position.copy(muzzleTip.position);
    flashGroup.position.z -= 0.04;
    flashGroup.visible = false;
    const flashMat = new THREE.MeshBasicMaterial({
      map: getGlowTexture(),
      color: defaultColor,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const flashPlane1 = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.28), flashMat);
    const flashPlane2 = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.28), flashMat);
    flashPlane2.rotation.z = Math.PI / 4;
    flashGroup.add(flashPlane1, flashPlane2);
    group.add(flashGroup);

    let spinSpeed = 1.2;
    let lastSyncedColorHex = energyMat.color.getHex();
    let reloadDropProgress = 0;

    function update(dt, isFiring, isReloading, reloadProgress) {
      const safeDt = (typeof dt === 'number' && Number.isFinite(dt)) ? Math.min(Math.max(dt, 0), 0.1) : 0.016;
      const rProg = (typeof reloadProgress === 'number' && Number.isFinite(reloadProgress)) ? reloadProgress : 0;

      // 若外部修改 energyMat.color（例如低彈藥轉紅），同步更新自發光顏色
      const curHex = energyMat.color.getHex();
      if (curHex !== lastSyncedColorHex) {
        lastSyncedColorHex = curHex;
        energyMat.emissive.copy(energyMat.color).multiplyScalar(0.75);
        flashMat.color.copy(energyMat.color);
      }

      if (spinParts.length > 0) {
        const targetSpin = isFiring || muzzleFlash.intensity > 0.2 ? 18.0 : (isReloading ? 6.0 : 1.4);
        spinSpeed = THREE.MathUtils.damp(spinSpeed, targetSpin, 10, safeDt);
        for (let i = 0; i < spinParts.length; i++) {
          spinParts[i].rotation.z += safeDt * spinSpeed;
        }
      }

      // 榴彈滾筒轉動與側翻退殼（換彈時側滑開倉、快速旋轉補彈再歸位）
      if (drumStepParts.length > 0) {
        const drumOut = isReloading && rProg > 0.12 && rProg < 0.80 ? 1 : 0;
        const drumSpeed = isReloading ? 10.5 : (muzzleFlash.intensity > 0.3 ? 6.5 : 0);
        for (let i = 0; i < drumStepParts.length; i++) {
          const dp = drumStepParts[i];
          dp.position.x = THREE.MathUtils.damp(dp.position.x, -0.048 * drumOut, 16, safeDt);
          if (drumSpeed > 0) dp.rotation.z += safeDt * drumSpeed;
        }
      }

      // 槍機 / 滑套 / 泵動護木後座往復動態（開火後座 + 換彈 74%~88% 自動拉槍機上膛）
      const kickRatio = Math.min(1, muzzleFlash.intensity / 4.0);
      const reloadRack = isReloading && rProg >= 0.72 && rProg <= 0.88 ? Math.sin(((rProg - 0.72) / 0.16) * Math.PI) : 0;
      const activeKick = Math.max(kickRatio, reloadRack);
      for (let i = 0; i < recoilParts.length; i++) {
        const rp = recoilParts[i];
        const targetZ = rp.userData.baseZ + activeKick * rp.userData.kickZ;
        rp.position.z = THREE.MathUtils.damp(rp.position.z, targetZ, 24, safeDt);
      }

      // 分段式換彈彈匣抽插動畫（0.10~0.24 抽出 -> 0.24~0.48 空倉 -> 0.48~0.68 推回卡槽）
      let targetMagDrop = 0;
      if (isReloading) {
        if (rProg < 0.24) targetMagDrop = Math.min(1, rProg / 0.22);
        else if (rProg < 0.48) targetMagDrop = 1;
        else if (rProg < 0.68) targetMagDrop = Math.max(0, 1 - (rProg - 0.48) / 0.20);
        else targetMagDrop = 0;
      }
      reloadDropProgress = THREE.MathUtils.damp(reloadDropProgress, targetMagDrop, 18, safeDt);
      for (let i = 0; i < reloadMagParts.length; i++) {
        const mp = reloadMagParts[i];
        mp.position.y = mp.userData.baseY - reloadDropProgress * 0.20;
        mp.rotation.x = reloadDropProgress * 0.26;
      }

      if (muzzleFlash.intensity > 0.25) {
        flashGroup.visible = true;
        const s = 0.65 + (muzzleFlash.intensity / 5) * 0.65;
        flashGroup.scale.setScalar(s);
        flashGroup.rotation.z += safeDt * 24;
      } else {
        flashGroup.visible = false;
      }
    }

    return {
      group: group,
      muzzleTip: muzzleTip,
      muzzleFlash: muzzleFlash,
      energyMat: energyMat,
      spinParts: spinParts,
      update: update
    };
  }

  // ==========================================
  // 3. 精緻 3D 敵人與巨型 Boss 模型 createEnemyMesh(type, wave)
  // ==========================================

  function createEnemyMesh(type, wave) {
    const enemyType = type || 'scout';
    const wv = (typeof wave === 'number' && wave > 0) ? wave : 1;
    const group = new THREE.Group();
    group.name = 'Enemy_' + enemyType;

    const armorDarkMat = getMat('enemy_armor_dark', function () {
      return new THREE.MeshStandardMaterial({
        color: 0x11192c,
        metalness: 0.78,
        roughness: 0.28
      });
    });

    let core = null;
    let ring = null;
    let hpBar = null;
    let shieldMesh = null;
    const animParts = [];

    if (enemyType === 'scout') {
      // 流線雙翼無人機
      const coreMat = new THREE.MeshStandardMaterial({
        color: 0xff2255,
        emissive: 0xd9043d,
        emissiveIntensity: 0.8,
        metalness: 0.35,
        roughness: 0.25
      });
      core = new THREE.Mesh(
        getGeo('scout_core', function () { return new THREE.OctahedronGeometry(0.64, 0); }),
        coreMat
      );
      core.scale.set(0.95, 0.78, 1.25);

      const wingMat = armorDarkMat;
      const wingTipMat = new THREE.MeshBasicMaterial({ color: 0xff4477 });
      const wingGeo = getGeo('scout_wing', function () { return new THREE.BoxGeometry(0.82, 0.08, 0.42); });
      const tipGeo = getGeo('scout_wing_tip', function () { return new THREE.BoxGeometry(0.14, 0.11, 0.56); });

      [-1, 1].forEach(function (side) {
        const wing = new THREE.Mesh(wingGeo, wingMat);
        wing.position.set(side * 0.76, 0.06, 0.08);
        wing.rotation.z = side * 0.22;
        wing.rotation.y = side * -0.28;

        const tip = new THREE.Mesh(tipGeo, wingTipMat);
        tip.position.set(side * 1.15, 0.14, 0.16);
        tip.rotation.y = side * -0.28;

        const thruster = new THREE.Mesh(
          getGeo('scout_thruster', function () { return new THREE.ConeGeometry(0.14, 0.36, 8); }),
          new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
        );
        thruster.rotation.x = -Math.PI / 2;
        thruster.position.set(side * 0.35, 0.02, 0.55);

        group.add(wing, tip, thruster);
      });

      ring = new THREE.Mesh(
        getGeo('scout_ring', function () { return new THREE.TorusGeometry(0.95, 0.042, 8, 28); }),
        new THREE.MeshBasicMaterial({ color: 0xffe4e6 })
      );

      hpBar = new THREE.Mesh(
        new THREE.PlaneGeometry(1.1, 0.12),
        new THREE.MeshBasicMaterial({ map: getHpBarTexture(), color: 0xff4477, side: THREE.DoubleSide })
      );
      hpBar.position.y = 1.25;

      group.add(core, ring, hpBar);
    } else if (enemyType === 'turret') {
      // 多層旋轉稜鏡砲台
      const coreMat = new THREE.MeshStandardMaterial({
        color: 0xa855f7,
        emissive: 0x7e22ce,
        emissiveIntensity: 0.8,
        metalness: 0.45,
        roughness: 0.2
      });
      core = new THREE.Mesh(
        getGeo('turret_core', function () { return new THREE.CylinderGeometry(0.56, 0.68, 1.32, 6); }),
        coreMat
      );

      const capGeo = getGeo('turret_cap', function () { return new THREE.CylinderGeometry(0.45, 0.64, 0.24, 6); });
      const topCap = new THREE.Mesh(capGeo, armorDarkMat);
      topCap.position.y = 0.78;
      const botCap = new THREE.Mesh(capGeo, armorDarkMat);
      botCap.rotation.z = Math.PI;
      botCap.position.y = -0.78;
      group.add(topCap, botCap);

      // 3 組徑向對稱電漿砲管與懸浮稜鏡
      const barrelGeo = getGeo('turret_barrel', function () { return new THREE.CylinderGeometry(0.08, 0.1, 0.65, 8); });
      const muzzleGlowMat = new THREE.MeshBasicMaterial({ color: 0xf472b6 });
      const shardGeo = getGeo('turret_shard', function () { return new THREE.OctahedronGeometry(0.18, 0); });

      const turretOrbit = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        const pod = new THREE.Group();
        pod.rotation.y = a;

        const barrel = new THREE.Mesh(barrelGeo, armorDarkMat);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.set(0, 0.08, 0.72);

        const tip = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), muzzleGlowMat);
        tip.position.set(0, 0.08, 1.05);

        const shard = new THREE.Mesh(shardGeo, muzzleGlowMat);
        shard.position.set(0, 0.55, 0.92);

        pod.add(barrel, tip, shard);
        turretOrbit.add(pod);
      }
      group.add(turretOrbit);
      animParts.push({ obj: turretOrbit, ry: -1.6 });

      ring = new THREE.Group();
      const outerDiamond = new THREE.Mesh(
        getGeo('turret_ring_outer', function () { return new THREE.TorusGeometry(1.24, 0.055, 6, 4); }),
        new THREE.MeshBasicMaterial({ color: 0xf472b6 })
      );
      const innerHex = new THREE.Mesh(
        getGeo('turret_ring_inner', function () { return new THREE.TorusGeometry(0.98, 0.036, 6, 6); }),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      innerHex.rotation.y = Math.PI / 3;
      ring.add(outerDiamond, innerHex);

      hpBar = new THREE.Mesh(
        new THREE.PlaneGeometry(1.45, 0.15),
        new THREE.MeshBasicMaterial({ map: getHpBarTexture(), color: 0xc084fc, side: THREE.DoubleSide })
      );
      hpBar.position.y = 1.68;

      group.add(core, ring, hpBar);
    } else if (enemyType === 'heavy') {
      // 厚重裝甲護盾機甲
      const coreMat = new THREE.MeshStandardMaterial({
        color: 0xffaa00,
        emissive: 0xb45309,
        emissiveIntensity: 0.75,
        metalness: 0.5,
        roughness: 0.25
      });
      core = new THREE.Mesh(
        getGeo('heavy_core', function () { return new THREE.DodecahedronGeometry(1.05, 0); }),
        coreMat
      );

      // 重裝左右肩甲與肩砲
      const pauldronGeo = getGeo('heavy_pauldron', function () { return new THREE.BoxGeometry(0.56, 0.96, 0.98); });
      const podGeo = getGeo('heavy_pod', function () { return new THREE.BoxGeometry(0.38, 0.32, 0.66); });
      const ventMat = new THREE.MeshBasicMaterial({ color: 0xffdd00 });

      [-1, 1].forEach(function (side) {
        const pauldron = new THREE.Mesh(pauldronGeo, armorDarkMat);
        pauldron.position.set(side * 1.18, 0.12, 0);
        pauldron.rotation.z = side * -0.14;

        const vent = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.62, 0.72), ventMat);
        vent.position.set(side * 1.44, 0.12, 0);

        const pod = new THREE.Mesh(podGeo, armorDarkMat);
        pod.position.set(side * 1.15, 0.78, -0.05);

        group.add(pauldron, vent, pod);
      });

      // 半透明弧形能量護盾板
      const shieldArcMat = new THREE.MeshBasicMaterial({
        color: 0xfacc15,
        transparent: true,
        opacity: 0.24,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const shieldArc = new THREE.Mesh(
        getGeo('heavy_shield_arc', function () {
          return new THREE.CylinderGeometry(1.48, 1.48, 1.15, 10, 1, true, -0.9, 1.8);
        }),
        shieldArcMat
      );
      group.add(shieldArc);
      animParts.push({ obj: shieldArc, ry: 1.1 });

      ring = new THREE.Mesh(
        getGeo('heavy_ring', function () { return new THREE.TorusGeometry(1.52, 0.085, 8, 6); }),
        new THREE.MeshBasicMaterial({ color: 0xffdd00 })
      );

      hpBar = new THREE.Mesh(
        new THREE.PlaneGeometry(1.85, 0.18),
        new THREE.MeshBasicMaterial({ map: getHpBarTexture(), color: 0xfacc15, side: THREE.DoubleSide })
      );
      hpBar.position.y = 2.08;

      group.add(core, ring, hpBar);
    } else if (enemyType === 'charger') {
      // 'charger': 高速利刃衝鋒怪（橘紅突刺機體 + 雙側旋轉刃環）
      const coreMat = new THREE.MeshStandardMaterial({
        color: 0xff5500,
        emissive: 0xea580c,
        emissiveIntensity: 0.9,
        metalness: 0.4,
        roughness: 0.22
      });
      core = new THREE.Mesh(
        getGeo('charger_core', function () { return new THREE.ConeGeometry(0.68, 1.55, 6); }),
        coreMat
      );
      core.rotation.x = Math.PI / 2;

      const bladeMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
      const bladeGeo = getGeo('charger_blade', function () { return new THREE.BoxGeometry(0.12, 0.16, 1.4); });
      [-1, 1].forEach(function (side) {
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.position.set(side * 0.72, 0, 0.1);
        blade.rotation.y = side * -0.18;
        group.add(blade);
      });

      ring = new THREE.Mesh(
        getGeo('charger_ring', function () { return new THREE.TorusGeometry(0.92, 0.05, 8, 24); }),
        new THREE.MeshBasicMaterial({ color: 0xff6600 })
      );
      animParts.push({ obj: ring, rz: 4.5, ry: 2.2 });

      hpBar = new THREE.Mesh(
        new THREE.PlaneGeometry(1.3, 0.14),
        new THREE.MeshBasicMaterial({ map: getHpBarTexture(), color: 0xf97316, side: THREE.DoubleSide })
      );
      hpBar.position.y = 1.45;
      group.add(core, ring, hpBar);
    } else if (enemyType === 'shielder') {
      // 'shielder': 正面能量護盾衛士（需繞背、炸藥桶、榴彈或貫穿雷射擊破）
      const coreMat = new THREE.MeshStandardMaterial({
        color: 0x6366f1,
        emissive: 0x4338ca,
        emissiveIntensity: 0.85,
        metalness: 0.45,
        roughness: 0.25
      });
      core = new THREE.Mesh(
        getGeo('shielder_core', function () { return new THREE.CylinderGeometry(0.72, 0.82, 1.55, 8); }),
        coreMat
      );

      const backCore = new THREE.Mesh(
        getGeo('shielder_back_node', function () { return new THREE.OctahedronGeometry(0.36, 0); }),
        new THREE.MeshBasicMaterial({ color: 0xf43f5e })
      );
      backCore.position.set(0, 0.15, -0.82);
      group.add(backCore);
      animParts.push({ obj: backCore, ry: 3.2 });

      shieldMesh = new THREE.Mesh(
        getGeo('shielder_front_shield', function () { return new THREE.BoxGeometry(2.35, 2.25, 0.14); }),
        new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.52,
          side: THREE.DoubleSide
        })
      );
      shieldMesh.position.set(0, 0.05, 1.05);

      const shieldFrame = new THREE.Mesh(
        getGeo('shielder_frame', function () { return new THREE.BoxGeometry(2.45, 2.35, 0.08); }),
        new THREE.MeshBasicMaterial({ color: 0x7dd3fc, wireframe: true })
      );
      shieldMesh.add(shieldFrame);

      ring = new THREE.Mesh(
        getGeo('shielder_ring', function () { return new THREE.TorusGeometry(1.18, 0.055, 8, 24); }),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -0.55;
      animParts.push({ obj: ring, rz: 1.6 });

      hpBar = new THREE.Mesh(
        new THREE.PlaneGeometry(1.75, 0.16),
        new THREE.MeshBasicMaterial({ map: getHpBarTexture(), color: 0x38bdf8, side: THREE.DoubleSide })
      );
      hpBar.position.y = 1.85;
      group.add(core, shieldMesh, ring, hpBar);
    } else if (enemyType === 'gold_drone') {
      // 'gold_drone': 限時黃金獎勵無人機（高機動雙金環）
      const coreMat = new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        emissive: 0xeab308,
        emissiveIntensity: 1.1,
        metalness: 0.75,
        roughness: 0.15
      });
      core = new THREE.Mesh(
        getGeo('gold_drone_core', function () { return new THREE.OctahedronGeometry(0.72, 0); }),
        coreMat
      );

      ring = new THREE.Mesh(
        getGeo('gold_drone_ring', function () { return new THREE.TorusGeometry(1.12, 0.06, 8, 32); }),
        new THREE.MeshBasicMaterial({ color: 0xfef08a })
      );
      const ring2 = new THREE.Mesh(
        getGeo('gold_drone_ring2', function () { return new THREE.TorusGeometry(0.88, 0.04, 8, 24); }),
        new THREE.MeshBasicMaterial({ color: 0xf59e0b })
      );
      ring.add(ring2);
      animParts.push({ obj: ring, rx: 2.2, ry: 3.1 });
      animParts.push({ obj: ring2, rx: -2.8, rz: 2.4 });

      hpBar = new THREE.Mesh(
        new THREE.PlaneGeometry(1.4, 0.14),
        new THREE.MeshBasicMaterial({ map: getHpBarTexture(), color: 0xfacc15, side: THREE.DoubleSide })
      );
      hpBar.position.y = 1.55;
      group.add(core, ring, hpBar);
    } else if (enemyType === 'dummy') {
      // 'dummy': 演示用全息人形訓練標靶假人（可受擊閃白、掉落經驗、HP歸零自動重置）
      const coreMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.9,
        metalness: 0.45,
        roughness: 0.22
      });
      core = new THREE.Mesh(
        getGeo('dummy_core', function () { return new THREE.CylinderGeometry(0.58, 0.44, 1.65, 10); }),
        coreMat
      );

      const head = new THREE.Mesh(
        getGeo('dummy_head', function () { return new THREE.OctahedronGeometry(0.36, 1); }),
        new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xd97706, emissiveIntensity: 0.85 })
      );
      head.position.y = 1.15;

      const pedestal = new THREE.Mesh(
        getGeo('dummy_pedestal', function () { return new THREE.CylinderGeometry(0.95, 1.15, 0.28, 8); }),
        armorDarkMat
      );
      pedestal.position.y = -1.65;

      const baseRing = new THREE.Mesh(
        getGeo('dummy_base_ring', function () { return new THREE.TorusGeometry(1.22, 0.05, 8, 32); }),
        new THREE.MeshBasicMaterial({ color: 0x00ffcc })
      );
      baseRing.rotation.x = Math.PI / 2;
      baseRing.position.y = -1.48;

      ring = new THREE.Mesh(
        getGeo('dummy_target_ring', function () { return new THREE.TorusGeometry(0.96, 0.05, 8, 32); }),
        new THREE.MeshBasicMaterial({ color: 0xfacc15 })
      );
      ring.position.y = 0.15;
      animParts.push({ obj: ring, rz: 1.8 });
      animParts.push({ obj: head, ry: 2.0 });

      hpBar = new THREE.Mesh(
        new THREE.PlaneGeometry(1.7, 0.16),
        new THREE.MeshBasicMaterial({ map: getHpBarTexture(), color: 0x00ffcc, side: THREE.DoubleSide })
      );
      hpBar.position.y = 1.95;

      group.add(core, head, pedestal, baseRing, ring, hpBar);
    } else {
      // 'boss': 巨型多核科幻戰艦 Boss（有旋轉裝甲環與發光核心）
      const bossScale = 1 + Math.min(0.25, Math.max(0, wv - 3) * 0.025);
      const coreMat = new THREE.MeshStandardMaterial({
        color: 0xff1f5a,
        emissive: 0xdc003c,
        emissiveIntensity: 0.98,
        metalness: 0.4,
        roughness: 0.2
      });
      core = new THREE.Mesh(
        getGeo('boss_core', function () { return new THREE.IcosahedronGeometry(2.05, 1); }),
        coreMat
      );

      // 戰艦裝甲艦翼與前突角
      const prowGeo = getGeo('boss_prow', function () { return new THREE.BoxGeometry(5.6, 0.65, 1.65); });
      const prow = new THREE.Mesh(prowGeo, armorDarkMat);
      prow.position.set(0, -0.1, 0);
      const prowEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(prowGeo),
        new THREE.LineBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.85 })
      );
      prow.add(prowEdges);

      const crossHullGeo = getGeo('boss_cross_hull', function () { return new THREE.BoxGeometry(1.65, 0.72, 5.4); });
      const crossHull = new THREE.Mesh(crossHullGeo, armorDarkMat);
      const crossEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(crossHullGeo),
        new THREE.LineBasicMaterial({ color: 0xe879f9, transparent: true, opacity: 0.85 })
      );
      crossHull.add(crossEdges);
      group.add(prow, crossHull);

      // 4 顆環繞副核心 + 下方戰艦砲塔
      const subCoreGeo = getGeo('boss_subcore', function () { return new THREE.OctahedronGeometry(0.5, 0); });
      const subCoreMat = new THREE.MeshStandardMaterial({
        color: 0xfacc15,
        emissive: 0xeab308,
        emissiveIntensity: 1.0,
        roughness: 0.2
      });
      const cannonGeo = getGeo('boss_cannon', function () { return new THREE.CylinderGeometry(0.14, 0.2, 0.9, 8); });
      const subCoreGroup = new THREE.Group();

      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        const sx = Math.cos(a) * 2.85;
        const sz = Math.sin(a) * 2.85;
        const sub = new THREE.Mesh(subCoreGeo, subCoreMat);
        sub.position.set(sx, 0.35, sz);

        const cannon = new THREE.Mesh(cannonGeo, armorDarkMat);
        cannon.position.set(sx * 0.78, -0.75, sz * 0.78);
        subCoreGroup.add(sub, cannon);
      }
      group.add(subCoreGroup);
      animParts.push({ obj: subCoreGroup, ry: -0.9 });

      // 核心脈衝光暈
      const bossHalo = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: getGlowTexture(),
          color: 0xff2266,
          transparent: true,
          opacity: 0.65,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        })
      );
      bossHalo.scale.set(6.4, 6.4, 1);
      group.add(bossHalo);

      // 多層旋轉裝甲環系統
      ring = new THREE.Group();
      const outerArmorRing = new THREE.Mesh(
        getGeo('boss_ring_outer', function () { return new THREE.TorusGeometry(3.55, 0.16, 10, 12); }),
        new THREE.MeshBasicMaterial({ color: 0xfacc15 })
      );
      ring.add(outerArmorRing);

      // 外環上的 8 塊戰艦裝甲鎖塊
      const clampGeo = getGeo('boss_clamp', function () { return new THREE.BoxGeometry(0.55, 0.42, 0.48); });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        const clamp = new THREE.Mesh(clampGeo, armorDarkMat);
        clamp.position.set(Math.cos(a) * 3.55, Math.sin(a) * 3.55, 0);
        clamp.rotation.z = a;
        ring.add(clamp);
      }

      const midRing = new THREE.Mesh(
        getGeo('boss_ring_mid', function () { return new THREE.TorusGeometry(2.85, 0.09, 8, 36); }),
        new THREE.MeshBasicMaterial({ color: 0xe879f9 })
      );
      midRing.rotation.set(0.75, 0.4, 0);

      const innerRing = new THREE.Mesh(
        getGeo('boss_ring_inner', function () { return new THREE.TorusGeometry(2.45, 0.06, 8, 24); }),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      innerRing.rotation.set(-0.65, 0.2, 0);

      ring.add(midRing, innerRing);
      animParts.push({ obj: midRing, rx: 1.2, ry: 0.9 });
      animParts.push({ obj: innerRing, rx: -1.5, rz: 1.4 });

      hpBar = new THREE.Mesh(
        new THREE.PlaneGeometry(4.4, 0.30),
        new THREE.MeshBasicMaterial({ map: getHpBarTexture(), color: 0xff2266, side: THREE.DoubleSide })
      );
      hpBar.position.y = 4.05;

      group.add(core, ring, hpBar);
      if (bossScale !== 1) group.scale.setScalar(bossScale);
    }

    function update(dt) {
      const safeDt = (typeof dt === 'number' && Number.isFinite(dt)) ? Math.min(Math.max(dt, 0), 0.1) : 0.016;
      for (let i = 0; i < animParts.length; i++) {
        const p = animParts[i];
        if (p.rx) p.obj.rotation.x += safeDt * p.rx;
        if (p.ry) p.obj.rotation.y += safeDt * p.ry;
        if (p.rz) p.obj.rotation.z += safeDt * p.rz;
      }
    }

    group.userData.artUpdate = update;

    return {
      group: group,
      core: core,
      ring: ring,
      hpBar: hpBar,
      shieldMesh: shieldMesh,
      update: update
    };
  }

  // ==========================================
  // 4. 3D 能量擴散光環特效 createShockwave(scene, pos, color, maxRadius)
  // ==========================================

  function createShockwave(scene, pos, color, maxRadius) {
    const targetRadius = (typeof maxRadius === 'number' && maxRadius > 0) ? maxRadius : 4.5;
    const waveColor = toThreeColor(color, 0x00ffcc);
    const origin = pos ? new THREE.Vector3(pos.x || 0, pos.y || 0, pos.z || 0) : new THREE.Vector3();

    const group = new THREE.Group();
    group.position.copy(origin);

    const discMat = new THREE.MeshBasicMaterial({
      map: getShockwaveRingTexture(),
      color: waveColor,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const disc = new THREE.Mesh(
      getGeo('sw_disc', function () { return new THREE.RingGeometry(0.45, 1.0, 40); }),
      discMat
    );
    disc.rotation.x = -Math.PI / 2;

    const torusMat = new THREE.MeshBasicMaterial({
      color: waveColor,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const torus = new THREE.Mesh(
      getGeo('sw_torus', function () { return new THREE.TorusGeometry(0.88, 0.045, 8, 36); }),
      torusMat
    );
    torus.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);

    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const flashSphere = new THREE.Mesh(
      getGeo('sw_flash', function () { return new THREE.SphereGeometry(0.55, 14, 10); }),
      flashMat
    );

    group.add(disc, torus, flashSphere);
    disc.scale.setScalar(0.15);
    torus.scale.setScalar(0.15);
    flashSphere.scale.setScalar(0.3);
    if (scene) scene.add(group);

    const duration = Math.min(0.75, 0.36 + targetRadius * 0.035);
    let elapsed = 0;

    const handle = {
      group: group,
      mesh: group,
      alive: true,
      life: duration,
      maxLife: duration,
      update: function (dt) {
        if (!handle.alive) return false;
        const safeDt = (typeof dt === 'number' && Number.isFinite(dt)) ? Math.min(Math.max(dt, 0), 0.1) : 0.016;
        elapsed += safeDt;
        handle.life = Math.max(0, duration - elapsed);

        const t = Math.min(1, elapsed / duration);
        const ease = 1 - Math.pow(1 - t, 3);
        const r = 0.15 + (targetRadius - 0.15) * ease;
        disc.scale.setScalar(r);
        torus.scale.setScalar(r * 0.92);
        flashSphere.scale.setScalar(0.3 + targetRadius * 0.45 * t);

        discMat.opacity = Math.max(0, Math.pow(1 - t, 1.35) * 0.95);
        torusMat.opacity = Math.max(0, Math.pow(1 - t, 1.5) * 0.85);
        flashMat.opacity = Math.max(0, (1 - Math.min(1, t * 2.4)) * 0.75);

        if (t >= 1) {
          handle.dispose();
          return false;
        }
        return true;
      },
      dispose: function () {
        if (!handle.alive) return;
        handle.alive = false;
        handle.life = 0;
        if (scene) scene.remove(group);
        discMat.dispose();
        torusMat.dispose();
        flashMat.dispose();
      }
    };

    return handle;
  }

  // ==========================================
  // 5. 3D 浮動傷害數字/暴擊/連電文字 createDamagePopup(scene, pos, text, color)
  // ==========================================

  function createDamagePopup(scene, pos, text, color) {
    const label = text !== undefined && text !== null ? String(text) : '';
    const cssColor = toCssColor(color, '#ffffff');
    const isHighlight = /CRIT|暴擊|!|⚡|BOSS/i.test(label);

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = (isHighlight ? '900 72px ' : '800 62px ') + '"Segoe UI", "Microsoft JhengHei", sans-serif';

    // 外發光與深色描邊確保戰場高對比可讀性
    ctx.shadowColor = cssColor;
    ctx.shadowBlur = isHighlight ? 22 : 12;
    ctx.lineJoin = 'round';
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#030712';
    ctx.strokeText(label, 256, 82);

    ctx.fillStyle = cssColor;
    ctx.fillText(label, 256, 82);

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.32)';
    ctx.fillText(label, 256, 80);

    const tex = new THREE.CanvasTexture(canvas);
    tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;

    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      opacity: 1.0,
      depthTest: false,
      depthWrite: false
    });

    const sprite = new THREE.Sprite(mat);
    const origin = pos ? new THREE.Vector3(pos.x || 0, pos.y || 1.5, pos.z || 0) : new THREE.Vector3(0, 1.5, 0);
    sprite.position.set(
      origin.x + (Math.random() - 0.5) * 0.55,
      origin.y + 0.45 + Math.random() * 0.2,
      origin.z + (Math.random() - 0.5) * 0.55
    );
    sprite.renderOrder = 950;

    const baseW = isHighlight ? 3.1 : 2.5;
    const baseH = isHighlight ? 0.97 : 0.78;
    sprite.scale.set(baseW * 0.5, baseH * 0.5, 1);

    if (scene) scene.add(sprite);

    const duration = 0.85;
    let elapsed = 0;

    const handle = {
      sprite: sprite,
      alive: true,
      life: duration,
      maxLife: duration,
      update: function (dt) {
        if (!handle.alive) return false;
        const safeDt = (typeof dt === 'number' && Number.isFinite(dt)) ? Math.min(Math.max(dt, 0), 0.1) : 0.016;
        elapsed += safeDt;
        handle.life = Math.max(0, duration - elapsed);

        const t = Math.min(1, elapsed / duration);
        // 彈出縮放：0 -> 1.25 -> 1.0
        let pop = 1.0;
        if (t < 0.16) {
          pop = 0.45 + (t / 0.16) * 0.8;
        } else if (t < 0.3) {
          pop = 1.25 - ((t - 0.16) / 0.14) * 0.25;
        }
        sprite.scale.set(baseW * pop, baseH * pop, 1);

        // 向上漂浮且漸漸減速
        const floatVel = 2.6 * (1 - t * 0.6);
        sprite.position.y += floatVel * safeDt;

        // 後半段淡出
        if (t > 0.5) {
          mat.opacity = Math.max(0, 1 - (t - 0.5) / 0.5);
        } else {
          mat.opacity = 1.0;
        }

        if (t >= 1) {
          handle.dispose();
          return false;
        }
        return true;
      },
      dispose: function () {
        if (!handle.alive) return;
        handle.alive = false;
        handle.life = 0;
        if (scene) scene.remove(sprite);
        mat.dispose();
        tex.dispose();
      }
    };

    return handle;
  }

  // ==========================================
  // 輔助特效 (供整合端選用：3D 浮游砲與 3D 閃電折線)
  // ==========================================

  function createDroneMesh(accentColor) {
    const colorHex = accentColor || 0x38bdf8;
    const group = new THREE.Group();
    const core = new THREE.Mesh(
      getGeo('drone_core', function () { return new THREE.OctahedronGeometry(0.26, 0); }),
      new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 0.9,
        metalness: 0.4,
        roughness: 0.2
      })
    );
    const ring = new THREE.Mesh(
      getGeo('drone_ring', function () { return new THREE.TorusGeometry(0.42, 0.032, 8, 24); }),
      new THREE.MeshBasicMaterial({ color: 0x00ffcc })
    );
    ring.rotation.x = Math.PI / 2;

    const muzzleTip = new THREE.Mesh(
      getGeo('drone_tip', function () { return new THREE.SphereGeometry(0.06, 8, 8); }),
      new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    muzzleTip.position.set(0, -0.05, -0.32);

    group.add(core, ring, muzzleTip);
    return { group: group, core: core, ring: ring, muzzleTip: muzzleTip };
  }

  function createLightningBolt(scene, fromPos, toPos, color) {
    const start = fromPos ? new THREE.Vector3(fromPos.x, fromPos.y, fromPos.z) : new THREE.Vector3();
    const end = toPos ? new THREE.Vector3(toPos.x, toPos.y, toPos.z) : new THREE.Vector3(0, 1, -5);
    const boltColor = toThreeColor(color, 0x38bdf8);

    const boltGroup = new THREE.Group();
    const dist = start.distanceTo(end);
    const jitter = Math.min(1.35, Math.max(0.45, dist * 0.14));
    const segments = 8;
    const points = [start.clone()];
    for (let i = 1; i < segments; i++) {
      const f = i / segments;
      const p = start.clone().lerp(end, f);
      p.x += (Math.random() - 0.5) * jitter;
      p.y += (Math.random() - 0.5) * jitter * 0.85;
      p.z += (Math.random() - 0.5) * jitter;
      points.push(p);
    }
    points.push(end.clone());

    const outerMat = new THREE.MeshBasicMaterial({
      color: boltColor,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.98,
      depthWrite: false
    });
    const upVec = new THREE.Vector3(0, 1, 0);
    const disposables = [];

    function addArcSegment(a, b, rOuter, rCore) {
      const dVec = b.clone().sub(a);
      const len = dVec.length();
      if (len < 0.02) return;
      const quat = new THREE.Quaternion().setFromUnitVectors(upVec, dVec.normalize());
      const mid = a.clone().lerp(b, 0.5);

      const gOut = new THREE.CylinderGeometry(rOuter, rOuter, len + rOuter * 0.6, 5);
      const mOut = new THREE.Mesh(gOut, outerMat);
      mOut.position.copy(mid);
      mOut.quaternion.copy(quat);
      boltGroup.add(mOut);
      disposables.push(gOut);

      if (rCore > 0) {
        const gCore = new THREE.CylinderGeometry(rCore, rCore, len + rCore * 0.5, 5);
        const mCore = new THREE.Mesh(gCore, coreMat);
        mCore.position.copy(mid);
        mCore.quaternion.copy(quat);
        boltGroup.add(mCore);
        disposables.push(gCore);
      }
    }

    // 主閃電光弧（粗外層光暈 + 刺眼純白核心）
    for (let i = 0; i < points.length - 1; i++) {
      addArcSegment(points[i], points[i + 1], 0.095, 0.034);
    }

    // 分岔電弧支線（讓閃電看起來更像高壓放電）
    [2, 5].forEach(function (idx) {
      if (idx < points.length - 1) {
        const branchStart = points[idx];
        const branchMid = branchStart.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 1.6,
          (Math.random() - 0.3) * 1.4,
          (Math.random() - 0.5) * 1.6
        ));
        const branchEnd = branchMid.clone().add(new THREE.Vector3(
          (Math.random() - 0.5) * 1.4,
          (Math.random() - 0.5) * 1.2,
          (Math.random() - 0.5) * 1.4
        ));
        addArcSegment(branchStart, branchMid, 0.048, 0.016);
        addArcSegment(branchMid, branchEnd, 0.032, 0);
      }
    });

    // 命中點高壓電漿爆閃球
    const orbGeo = new THREE.SphereGeometry(0.42, 10, 10);
    const orbMesh = new THREE.Mesh(orbGeo, outerMat);
    orbMesh.position.copy(end);
    const orbCoreGeo = new THREE.SphereGeometry(0.20, 8, 8);
    const orbCore = new THREE.Mesh(orbCoreGeo, coreMat);
    orbCore.position.copy(end);
    boltGroup.add(orbMesh, orbCore);
    disposables.push(orbGeo, orbCoreGeo);

    if (scene) scene.add(boltGroup);

    const duration = 0.28;
    let elapsed = 0;
    const handle = {
      line: boltGroup,
      alive: true,
      life: duration,
      update: function (dt) {
        if (!handle.alive) return false;
        const safeDt = (typeof dt === 'number' && Number.isFinite(dt)) ? Math.min(Math.max(dt, 0), 0.1) : 0.016;
        elapsed += safeDt;
        handle.life = Math.max(0, duration - elapsed);
        const fade = Math.max(0, 1 - elapsed / duration);
        const flicker = (Math.sin(elapsed * 85) > -0.35) ? 1.0 : 0.45;
        outerMat.opacity = 0.90 * fade * flicker;
        coreMat.opacity = 0.98 * fade * flicker;
        if (elapsed >= duration) {
          handle.dispose();
          return false;
        }
        return true;
      },
      dispose: function () {
        if (!handle.alive) return;
        handle.alive = false;
        handle.life = 0;
        if (scene) scene.remove(boltGroup);
        for (let i = 0; i < disposables.length; i++) {
          disposables[i].dispose();
        }
        outerMat.dispose();
        coreMat.dispose();
      }
    };
    return handle;
  }

  // ==========================================
  // 8. 互動競技場物件（彈射跳台 / 能量炸藥桶 / 空投箱 / 佔領信標）
  // ==========================================

  function createJumpPadMesh(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0.05, z);

    const base = new THREE.Mesh(
      getGeo('jumppad_base', function () { return new THREE.CylinderGeometry(1.55, 1.75, 0.18, 16); }),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.8, roughness: 0.25 })
    );
    const padCore = new THREE.Mesh(
      getGeo('jumppad_core', function () { return new THREE.CylinderGeometry(1.25, 1.25, 0.21, 16); }),
      new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.78 })
    );
    const ring1 = new THREE.Mesh(
      getGeo('jumppad_ring', function () { return new THREE.TorusGeometry(1.32, 0.055, 8, 28); }),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.85 })
    );
    ring1.rotation.x = Math.PI / 2;
    ring1.position.y = 0.22;

    const ring2 = new THREE.Mesh(
      getGeo('jumppad_ring', function () { return new THREE.TorusGeometry(1.32, 0.055, 8, 28); }),
      new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.65 })
    );
    ring2.rotation.x = Math.PI / 2;
    ring2.position.y = 0.6;

    group.add(base, padCore, ring1, ring2);

    return {
      group: group,
      update: function (dt, now) {
        const t = (now || 0) * 0.003;
        ring1.position.y = 0.2 + ((t % 1) * 1.1);
        ring1.material.opacity = Math.max(0.1, 1 - (t % 1));
        ring2.position.y = 0.2 + (((t + 0.5) % 1) * 1.1);
        ring2.material.opacity = Math.max(0.1, 1 - ((t + 0.5) % 1));
      }
    };
  }

  function createBarrelMesh(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0.95, z);

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      emissive: 0x991b1b,
      emissiveIntensity: 0.65,
      metalness: 0.5,
      roughness: 0.3
    });
    const core = new THREE.Mesh(
      getGeo('barrel_body', function () { return new THREE.CylinderGeometry(0.62, 0.65, 1.85, 12); }),
      bodyMat
    );
    const bandMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const bandTop = new THREE.Mesh(
      getGeo('barrel_band', function () { return new THREE.CylinderGeometry(0.66, 0.66, 0.16, 12); }),
      bandMat
    );
    bandTop.position.y = 0.55;
    const bandBot = new THREE.Mesh(
      getGeo('barrel_band', function () { return new THREE.CylinderGeometry(0.66, 0.66, 0.16, 12); }),
      bandMat
    );
    bandBot.position.y = -0.55;

    const hazardRing = new THREE.Mesh(
      getGeo('barrel_ring', function () { return new THREE.TorusGeometry(0.95, 0.04, 8, 24); }),
      new THREE.MeshBasicMaterial({ color: 0xff5500, transparent: true, opacity: 0.7 })
    );
    hazardRing.rotation.x = Math.PI / 2;
    hazardRing.position.y = -0.82;

    group.add(core, bandTop, bandBot, hazardRing);

    return {
      group: group,
      core: core,
      update: function (dt, now) {
        const pulse = 0.55 + Math.sin((now || 0) * 0.008) * 0.35;
        bodyMat.emissiveIntensity = pulse;
        hazardRing.scale.setScalar(1 + Math.sin((now || 0) * 0.006) * 0.08);
      }
    };
  }

  function createSupplyCrateMesh(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0.9, z);

    const crate = new THREE.Mesh(
      getGeo('supply_crate', function () { return new THREE.BoxGeometry(1.45, 1.25, 1.45); }),
      new THREE.MeshStandardMaterial({
        color: 0x0ea5e9,
        emissive: 0x0284c7,
        emissiveIntensity: 0.7,
        metalness: 0.55,
        roughness: 0.25
      })
    );
    const frame = new THREE.Mesh(
      getGeo('supply_frame', function () { return new THREE.BoxGeometry(1.55, 1.35, 1.55); }),
      new THREE.MeshBasicMaterial({ color: 0x00ffcc, wireframe: true })
    );
    const beam = new THREE.Mesh(
      getGeo('supply_beam', function () { return new THREE.CylinderGeometry(0.25, 0.95, 24, 12, 1, true); }),
      new THREE.MeshBasicMaterial({ color: 0x00ffcc, transparent: true, opacity: 0.18, side: THREE.DoubleSide })
    );
    beam.position.y = 12;

    group.add(crate, frame, beam);

    return {
      group: group,
      core: crate,
      update: function (dt, now) {
        group.rotation.y += (dt || 0.016) * 1.1;
        crate.position.y = Math.sin((now || 0) * 0.004) * 0.14;
        frame.position.y = crate.position.y;
      }
    };
  }

  function createBeaconZoneMesh(x, z, radius) {
    const r = radius || 3.8;
    const group = new THREE.Group();
    group.position.set(x, 0.06, z);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(r - 0.22, r, 36),
      new THREE.MeshBasicMaterial({ color: 0xa855f7, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
    );
    ring.rotation.x = -Math.PI / 2;

    const fill = new THREE.Mesh(
      new THREE.CircleGeometry(r - 0.25, 36),
      new THREE.MeshBasicMaterial({ color: 0xa855f7, side: THREE.DoubleSide, transparent: true, opacity: 0.16 })
    );
    fill.rotation.x = -Math.PI / 2;

    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xd8b4fe, transparent: true, opacity: 0.45 })
    );
    pillar.position.y = 6;

    group.add(ring, fill, pillar);

    return {
      group: group,
      fillMat: fill.material,
      ringMat: ring.material,
      update: function (dt, now, progress) {
        const p = Math.max(0, Math.min(1, progress || 0));
        fill.material.opacity = 0.15 + p * 0.45;
        ring.scale.setScalar(1 + Math.sin((now || 0) * 0.007) * 0.03);
      }
    };
  }

  /**
   * Boss 衛星軌道轟炸紅色預警圓圈（含中心擴張倒數填滿與垂直光柱指示）
   */
  function createDangerZoneMesh(x, z, radius, colorHex) {
    const r = radius || 3.3;
    const col = colorHex || 0xff1f5a;
    const group = new THREE.Group();
    group.position.set(x, 0.08, z);

    const outerRingGeo = new THREE.RingGeometry(r - 0.18, r, 40);
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: col,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
      depthWrite: false
    });
    const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    outerRing.rotation.x = -Math.PI / 2;

    const fillGeo = new THREE.CircleGeometry(r - 0.16, 36);
    const fillMat = new THREE.MeshBasicMaterial({
      color: col,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.34,
      depthWrite: false
    });
    const fill = new THREE.Mesh(fillGeo, fillMat);
    fill.rotation.x = -Math.PI / 2;
    fill.scale.setScalar(0.05);

    const beamGeo = new THREE.CylinderGeometry(0.14, r * 0.35, 22, 16, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: col,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 11;

    group.add(outerRing, fill, beam);

    return {
      group: group,
      update: function (progress, now) {
        const p = Math.max(0.05, Math.min(1, progress || 0));
        fill.scale.setScalar(p);
        const flash = p > 0.75 ? (0.5 + 0.5 * Math.sin((now || 0) * 0.04)) : 0;
        fillMat.opacity = 0.22 + p * 0.32 + flash * 0.25;
        outerRingMat.opacity = 0.78 + flash * 0.22;
        beamMat.opacity = 0.14 + p * 0.32 + flash * 0.35;
        beam.scale.x = 1 - p * 0.55;
        beam.scale.z = 1 - p * 0.55;
      },
      dispose: function (scene) {
        if (scene) scene.remove(group);
        outerRingGeo.dispose(); outerRingMat.dispose();
        fillGeo.dispose(); fillMat.dispose();
        beamGeo.dispose(); beamMat.dispose();
      }
    };
  }

  /**
   * Boss 鎖定直線突進的紅色地面路徑預警帶
   */
  function createChargeLaneMesh(originPos, dirVec, length, width, colorHex) {
    const len = length || 22;
    const wid = width || 3.6;
    const col = colorHex || 0xfacc15;
    const group = new THREE.Group();
    const dir = dirVec.clone().setY(0).normalize();
    const yaw = Math.atan2(dir.x, dir.z);

    group.position.set(originPos.x + dir.x * (len * 0.5), 0.09, originPos.z + dir.z * (len * 0.5));
    group.rotation.y = yaw;

    const planeGeo = new THREE.PlaneGeometry(wid, len);
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0xff2244,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.26,
      depthWrite: false
    });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = -Math.PI / 2;

    const railGeo = new THREE.BoxGeometry(0.14, 0.12, len);
    const railMat = new THREE.MeshBasicMaterial({
      color: col,
      transparent: true,
      opacity: 0.92
    });
    const leftRail = new THREE.Mesh(railGeo, railMat);
    leftRail.position.set(-wid * 0.5, 0.05, 0);
    const rightRail = new THREE.Mesh(railGeo, railMat);
    rightRail.position.set(wid * 0.5, 0.05, 0);

    group.add(plane, leftRail, rightRail);

    return {
      group: group,
      update: function (progress, now) {
        const p = Math.max(0, Math.min(1, progress || 0));
        const pulse = 0.5 + 0.5 * Math.sin((now || 0) * (p > 0.7 ? 0.045 : 0.018));
        planeMat.opacity = 0.18 + p * 0.34 + pulse * 0.14;
        railMat.opacity = 0.65 + pulse * 0.35;
      },
      dispose: function (scene) {
        if (scene) scene.remove(group);
        planeGeo.dispose(); planeMat.dispose();
        railGeo.dispose(); railMat.dispose();
      }
    };
  }

  /**
   * Boss 脈衝地面震波環（可透過 Space 跳躍或彈射跳台騰空躲避）
   */
  function createGroundRingWaveMesh(originPos, colorHex) {
    const col = colorHex || 0xf97316;
    const group = new THREE.Group();
    group.position.set(originPos.x, 0.45, originPos.z);

    const torusGeo = new THREE.TorusGeometry(1, 0.11, 10, 48);
    const torusMat = new THREE.MeshBasicMaterial({
      color: col,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const torus = new THREE.Mesh(torusGeo, torusMat);
    torus.rotation.x = Math.PI / 2;

    const wallGeo = new THREE.CylinderGeometry(1, 1, 0.85, 48, 1, true);
    const wallMat = new THREE.MeshBasicMaterial({
      color: col,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const wall = new THREE.Mesh(wallGeo, wallMat);

    group.add(torus, wall);

    return {
      group: group,
      setRadius: function (radius, opacity) {
        const r = Math.max(0.5, radius || 1);
        const op = opacity === undefined ? 1 : opacity;
        torus.scale.set(r, r, 1);
        wall.scale.set(r, 1, r);
        torusMat.opacity = 0.95 * op;
        wallMat.opacity = 0.42 * op;
      },
      dispose: function (scene) {
        if (scene) scene.remove(group);
        torusGeo.dispose(); torusMat.dispose();
        wallGeo.dispose(); wallMat.dispose();
      }
    };
  }

  const GameArt = {
    buildArena: buildArena,
    buildWeaponModel: buildWeaponModel,
    createEnemyMesh: createEnemyMesh,
    createShockwave: createShockwave,
    createDamagePopup: createDamagePopup,
    createDroneMesh: createDroneMesh,
    createLightningBolt: createLightningBolt,
    createJumpPadMesh: createJumpPadMesh,
    createBarrelMesh: createBarrelMesh,
    createSupplyCrateMesh: createSupplyCrateMesh,
    createBeaconZoneMesh: createBeaconZoneMesh,
    createDangerZoneMesh: createDangerZoneMesh,
    createChargeLaneMesh: createChargeLaneMesh,
    createGroundRingWaveMesh: createGroundRingWaveMesh
  };

  global.GameArt = GameArt;
})(typeof window !== 'undefined' ? window : globalThis);
