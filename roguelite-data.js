(function (global) {
  'use strict';

  /**
   * 記錄已裝備的強化卡與流派標籤次數
   * @param {Object} state
   * @param {string} id
   * @param {string} synergyTag
   */
  function recordUpgrade(state, id, synergyTag, categoryGroup) {
    if (!state.appliedUpgrades) state.appliedUpgrades = {};
    state.appliedUpgrades[id] = (state.appliedUpgrades[id] || 0) + 1;

    if (!state.synergyTags) state.synergyTags = {};
    if (synergyTag) {
      state.synergyTags[synergyTag] = (state.synergyTags[synergyTag] || 0) + 1;
    }

    if (!state.categoryCounts) state.categoryCounts = {};
    if (categoryGroup) {
      state.categoryCounts[categoryGroup] = (state.categoryCounts[categoryGroup] || 0) + 1;
    }
  }

  /**
   * 安全呼叫外部武器模型重建 helper
   * @param {Object} helpers
   * @param {string} style
   */
  function rebuildWeapon(helpers, style) {
    if (helpers && typeof helpers.buildWeaponModel === 'function') {
      helpers.buildWeaponModel(style);
    }
  }

  /**
   * 3 種開局武器流派配置（突擊步槍 / 電漿榴彈砲 / 穿甲磁軌狙擊）
   */
  const STARTER_LOADOUTS = [
    {
      id: 'assault',
      icon: '⚡',
      name: '脈衝突擊步槍',
      badge: '全自動 / 高機動',
      desc: '全自動高速連射，移動速度 +8%，適合跳台空戰與閃避游擊。',
      stats: {
        weaponName: '⚡ MK-II 脈衝突擊步槍',
        weaponStyle: 'smg',
        weaponTier: 2,
        projectileType: 'laser',
        isAutoFire: true,
        maxAmmo: 22,
        ammo: 22,
        fireCooldownMs: 120,
        reloadTimeMs: 850,
        bulletDamage: 1,
        moveSpeedMult: 1.08,
        spreadAngle: 0.045
      }
    },
    {
      id: 'grenade',
      icon: '💥',
      name: '電漿榴彈砲',
      badge: '拋物線爆破 / 破盾',
      desc: '發射受重力影響的電漿榴彈，命中或落地產生大範圍高爆濺射，專剋持盾怪與怪群！',
      stats: {
        weaponName: '💥 MGL-X 電漿榴彈砲',
        weaponStyle: 'shotgun',
        weaponTier: 2,
        projectileType: 'grenade',
        isAutoFire: false,
        maxAmmo: 7,
        ammo: 7,
        fireCooldownMs: 410,
        reloadTimeMs: 1050,
        bulletDamage: 2.5,
        explosiveRadius: 4.8,
        explosiveDmgRatio: 0.85,
        spreadAngle: 0.03
      }
    },
    {
      id: 'rail_sniper',
      icon: '🎯',
      name: '穿甲磁軌狙擊',
      badge: '貫穿雷射 / 高暴擊',
      desc: '高威力穿甲磁軌光束，直接無視持盾怪正面護盾並貫穿直線敵陣，基礎暴擊率 25%！',
      stats: {
        weaponName: '🎯 RS-7 穿甲磁軌狙擊',
        weaponStyle: 'railgun',
        weaponTier: 2,
        projectileType: 'beam',
        isAutoFire: false,
        maxAmmo: 6,
        ammo: 6,
        fireCooldownMs: 440,
        reloadTimeMs: 920,
        bulletDamage: 3.2,
        pierceCount: 3,
        critChance: 0.25,
        critMult: 2.35,
        spreadAngle: 0.015
      }
    }
  ];

  /**
   * 建立初始肉鴿角色數值與流派構築狀態
   * @param {string} [loadoutId]
   * @returns {Object}
   */
  function createInitialBuildState(loadoutId) {
    const base = {
      // 基礎角色與武器數值
      level: 1,
      maxHp: 100,
      hp: 100,
      maxAmmo: 8,
      ammo: 8,
      reloadTimeMs: 850,
      fireCooldownMs: 260,
      bulletDamage: 1,
      projectilesPerShot: 1,
      magnetRange: 4.8,
      isAutoFire: false,
      weaponName: '🔫 MK-I 脈衝手槍',
      weaponStyle: 'pistol', // 'pistol' | 'smg' | 'shotgun' | 'railgun' | 'plasma'
      weaponTier: 1,
      projectileType: 'laser', // 'laser' | 'grenade' | 'beam'
      loadoutId: loadoutId || 'assault',

      // 進階元素與流派構築屬性
      critChance: 0.05,
      critMult: 2.0,
      chainLightning: 0,     // >0 時觸發閃電鏈，彈跳次數 = chainLightning + 1
      chainRange: 9.0,       // 閃電鏈最大彈跳半徑 (公尺)
      frostSlow: 0,          // 0..0.75 減速比例
      frostDuration: 3.0,    // 冰霜減速持續秒數
      explosiveRadius: 0,    // >0 時命中產生電漿爆炸半徑 (公尺)
      explosiveDmgRatio: 0.6,// 爆炸濺射傷害倍率 (相對於此次命中傷害)
      lifestealChance: 0,    // 擊殺吸血機率 (0..0.85)
      lifestealAmount: 8,    // 觸發吸血回復 HP 量
      droneCount: 0,         // 軌道浮游砲數量 (0..2)
      droneFireIntervalMs: 850,
      droneDamage: 1,
      dashCooldownMs: 2600,  // Shift 衝刺冷卻 (ms)
      dashInvulnMs: 380,     // Shift 衝刺無敵時間 (ms)
      dashShockwaveRadius: 0,// 衝刺震盪波半徑 (0 = 未解鎖)
      dashShockwaveDamage: 0,// 衝刺震盪波傷害
      shieldRegen: 0,        // 每秒被動回復 HP
      shieldCharges: 0,      // 目前能量護盾層數 (免傷)
      maxShieldCharges: 0,   // 最大能量護盾層數
      shieldRechargeSec: 7,  // 護盾自動充能間隔秒數
      pierceCount: 0,        // 雷射額外貫穿敵人數量
      beamWidth: 1.0,        // 狙擊雷射光束視覺粗細倍率
      beamHitRadius: 0,      // 粗光束額外判定半徑 (公尺)
      grenadeScale: 1.0,     // 榴彈體積縮放倍率
      clusterBombs: 0,       // 榴彈命中分裂子彈數
      freeShotChance: 0,     // 不消耗子彈機率 (0..0.75)
      homingMissiles: 0,     // 每次射擊額外發射追蹤微型飛彈數
      airBonusDmg: 0,        // 滯空時額外傷害倍率
      moveSpeedMult: 1.0,    // 移動速度倍率
      spreadAngle: 0.055,    // 多重彈道散射角度 (rad)

      // 流派統計與前置解鎖追蹤
      synergyTags: {},
      appliedUpgrades: {},
      categoryCounts: { firerate: 0, survival: 0, firepower: 0, mobility: 0, exclusive: 0 }
    };

    const chosen = STARTER_LOADOUTS.find((l) => l.id === (loadoutId || 'assault'));
    if (chosen && chosen.stats) {
      Object.assign(base, chosen.stats);
    }
    return base;
  }

  /**
   * 肉鴿強化卡池（分為：通用增幅 / 武器專屬分支 / 前置條件解鎖覺醒）
   */
  const UPGRADES = [
    // ==========================================
    // A. 通用增幅（三把槍都可選，同時累積前置解鎖進度）
    // ==========================================
    {
      id: 'u_firerate',
      tag: '通用・射速',
      icon: '⚡',
      legendary: false,
      synergyTag: '極速',
      title: '超頻脈衝射速',
      desc: '射擊冷卻縮短 18%（累積 3 次射速/換彈類可解鎖【極限超頻引擎：全自動連發覺醒】！）',
      condition: (state) => state.fireCooldownMs > 60,
      apply: (state) => {
        state.fireCooldownMs = Math.max(55, Math.round(state.fireCooldownMs * 0.82));
        recordUpgrade(state, 'u_firerate', '極速', 'firerate');
        return state;
      }
    },
    {
      id: 'u_reload',
      tag: '通用・射速',
      icon: '🔄',
      legendary: false,
      synergyTag: '極速',
      title: '高速熱插拔彈匣',
      desc: '換彈時間減少 22%（累積 3 次射速/換彈類可解鎖【極限超頻引擎：全自動連發覺醒】！）',
      condition: (state) => state.reloadTimeMs > 280,
      apply: (state) => {
        state.reloadTimeMs = Math.max(250, Math.round(state.reloadTimeMs * 0.78));
        recordUpgrade(state, 'u_reload', '極速', 'firerate');
        return state;
      }
    },
    {
      id: 'u_ammo',
      tag: '通用・火力',
      icon: '🔋',
      legendary: false,
      synergyTag: '火力',
      title: '高密度擴容彈匣',
      desc: '彈匣容量 +35%（至少 +2 發）並立即補滿彈藥！（計入火力前置）',
      condition: (state) => state.maxAmmo < 80,
      apply: (state) => {
        const add = Math.max(2, Math.round(state.maxAmmo * 0.35));
        state.maxAmmo += add;
        state.ammo = state.maxAmmo;
        recordUpgrade(state, 'u_ammo', '火力', 'firepower');
        return state;
      }
    },
    {
      id: 'u_damage',
      tag: '通用・火力',
      icon: '💢',
      legendary: false,
      synergyTag: '火力',
      title: '高能聚合彈頭',
      desc: '基礎傷害 +25%（至少 +0.8）！（累積 3 次火力類解鎖【處決者核心】）',
      condition: () => true,
      apply: (state) => {
        const gain = Math.max(0.8, Number((state.bulletDamage * 0.25).toFixed(1)));
        state.bulletDamage = Number((state.bulletDamage + gain).toFixed(1));
        recordUpgrade(state, 'u_damage', '火力', 'firepower');
        return state;
      }
    },
    {
      id: 'u_crit',
      tag: '通用・火力',
      icon: '🎯',
      legendary: false,
      synergyTag: '火力',
      title: '弱點鎖定透鏡',
      desc: '暴擊率 +12%、暴擊倍率 +0.3x！（累積 3 次火力類解鎖【處決者核心】）',
      condition: (state) => (state.critChance || 0) < 0.7,
      apply: (state) => {
        state.critChance = Number(Math.min(0.85, (state.critChance || 0) + 0.12).toFixed(2));
        state.critMult = Number(((state.critMult || 2.0) + 0.3).toFixed(2));
        recordUpgrade(state, 'u_crit', '火力', 'firepower');
        return state;
      }
    },
    {
      id: 'u_hp',
      tag: '通用・生存',
      icon: '❤️',
      legendary: false,
      synergyTag: '生存',
      title: '強化複合裝甲',
      desc: '最大生命 +35 並立即回復 35 HP！（累積 3 次生存類可解鎖【能量護盾】）',
      condition: () => true,
      apply: (state) => {
        state.maxHp += 35;
        state.hp = Math.min(state.maxHp, state.hp + 35);
        recordUpgrade(state, 'u_hp', '生存', 'survival');
        return state;
      }
    },
    {
      id: 'u_regen',
      tag: '通用・生存',
      icon: '💚',
      legendary: false,
      synergyTag: '生存',
      title: '奈米急救循環',
      desc: '每秒自動回血 +1.5 HP，擊殺有 20% 機率吸血！（計入生存前置）',
      condition: (state) => (state.shieldRegen || 0) < 6,
      apply: (state) => {
        state.shieldRegen = Number(((state.shieldRegen || 0) + 1.5).toFixed(1));
        state.lifestealChance = Math.min(0.6, Number(((state.lifestealChance || 0) + 0.2).toFixed(2)));
        recordUpgrade(state, 'u_regen', '生存', 'survival');
        return state;
      }
    },
    {
      id: 'u_speed',
      tag: '通用・機動',
      icon: '💨',
      legendary: false,
      synergyTag: '機動',
      title: '超頻閃現推進器',
      desc: '移動速度 +14%、Shift 衝刺冷卻 -18%！（累積 3 次機動類解鎖【浮游砲】）',
      condition: (state) => (state.moveSpeedMult || 1) < 1.75,
      apply: (state) => {
        state.moveSpeedMult = Number(((state.moveSpeedMult || 1) + 0.14).toFixed(2));
        state.dashCooldownMs = Math.max(950, Math.round((state.dashCooldownMs || 2600) * 0.82));
        recordUpgrade(state, 'u_speed', '機動', 'mobility');
        return state;
      }
    },
    {
      id: 'u_magnet',
      tag: '通用・機動',
      icon: '🧲',
      legendary: false,
      synergyTag: '機動',
      title: '超導磁場與空戰核心',
      desc: '吸取經驗距離 +3.5m，彈射跳台滯空傷害 +25%！（計入機動前置）',
      condition: (state) => (state.magnetRange || 4.5) < 18,
      apply: (state) => {
        state.magnetRange = Number(((state.magnetRange || 4.8) + 3.5).toFixed(1));
        state.airBonusDmg = Number(((state.airBonusDmg || 0) + 0.25).toFixed(2));
        recordUpgrade(state, 'u_magnet', '機動', 'mobility');
        return state;
      }
    },

    // ==========================================
    // B. 武器專屬分支（對應武器專屬強化）
    // ==========================================
    {
      id: 'a_multishot',
      tag: '步槍專屬',
      icon: '🔱',
      legendary: false,
      synergyTag: '步槍分支',
      title: '雙聯裝槍管擴展',
      desc: '步槍每次射擊子彈數量 +1 發！（累積 2 次專屬可解鎖終極進化）',
      condition: (state) => state.loadoutId === 'assault' && (state.projectilesPerShot || 1) < 4,
      apply: (state) => {
        state.projectilesPerShot = (state.projectilesPerShot || 1) + 1;
        state.spreadAngle = 0.055;
        recordUpgrade(state, 'a_multishot', '步槍分支', 'exclusive');
        return state;
      }
    },
    {
      id: 'a_chain',
      tag: '步槍專屬',
      icon: '🌩️',
      legendary: false,
      synergyTag: '步槍分支',
      title: '電弧彈跳模組',
      desc: '步槍子彈命中敵人時觸發特斯拉閃電鏈，額外彈跳電擊鄰近敵群！',
      condition: (state) => state.loadoutId === 'assault' && (state.chainLightning || 0) < 3,
      apply: (state) => {
        state.chainLightning = (state.chainLightning || 0) + 1;
        state.chainRange = Math.max(state.chainRange || 9.0, 10.5);
        recordUpgrade(state, 'a_chain', '步槍分支', 'exclusive');
        return state;
      }
    },
    {
      id: 'a_ammo_storm',
      tag: '步槍專屬',
      icon: '♾️',
      legendary: false,
      synergyTag: '步槍分支',
      title: '循環彈幕供給器',
      desc: '步槍彈匣 +10 發，且開火有 25% 機率不消耗子彈！',
      condition: (state) => state.loadoutId === 'assault' && (state.freeShotChance || 0) < 0.5,
      apply: (state) => {
        state.maxAmmo += 10;
        state.ammo = state.maxAmmo;
        state.freeShotChance = Math.min(0.65, Number(((state.freeShotChance || 0) + 0.25).toFixed(2)));
        recordUpgrade(state, 'a_ammo_storm', '步槍分支', 'exclusive');
        return state;
      }
    },
    {
      id: 'g_big_grenade',
      tag: '榴彈專屬',
      icon: '💣',
      legendary: false,
      synergyTag: '榴彈分支',
      title: '巨型電漿彈體',
      desc: '榴彈體積 +45%、爆炸半徑 +1.8m、爆炸傷害 +35%！（累積 2 次專屬解鎖終極進化）',
      condition: (state) => state.loadoutId === 'grenade' && (state.grenadeScale || 1) < 2.4,
      apply: (state) => {
        state.grenadeScale = Number(((state.grenadeScale || 1) * 1.45).toFixed(2));
        state.explosiveRadius = Number(((state.explosiveRadius || 4.8) + 1.8).toFixed(1));
        state.bulletDamage = Number((state.bulletDamage * 1.35).toFixed(1));
        recordUpgrade(state, 'g_big_grenade', '榴彈分支', 'exclusive');
        return state;
      }
    },
    {
      id: 'g_cluster',
      tag: '榴彈專屬',
      icon: '🎆',
      legendary: false,
      synergyTag: '榴彈分支',
      title: '子母分裂榴彈',
      desc: '榴彈引爆時額外向四周分裂出 +3 顆小電漿爆彈二次轟炸！',
      condition: (state) => state.loadoutId === 'grenade' && (state.clusterBombs || 0) < 6,
      apply: (state) => {
        state.clusterBombs = (state.clusterBombs || 0) + 3;
        recordUpgrade(state, 'g_cluster', '榴彈分支', 'exclusive');
        return state;
      }
    },
    {
      id: 'g_cryo_blast',
      tag: '榴彈專屬',
      icon: '❄️',
      legendary: false,
      synergyTag: '榴彈分支',
      title: '液氮急凍彈頭',
      desc: '榴彈爆炸範圍內的敵人全數被冰霜凍結減速 55%，有效控場防包圍！',
      condition: (state) => state.loadoutId === 'grenade' && (state.frostSlow || 0) < 0.7,
      apply: (state) => {
        state.frostSlow = Math.min(0.75, Number(((state.frostSlow || 0) + 0.55).toFixed(2)));
        state.frostDuration = Math.max(state.frostDuration || 3.0, 4.0);
        recordUpgrade(state, 'g_cryo_blast', '榴彈分支', 'exclusive');
        return state;
      }
    },
    {
      id: 'r_thick_beam',
      tag: '狙擊專屬',
      icon: '🔦',
      legendary: false,
      synergyTag: '狙擊分支',
      title: '高能擴束光柱',
      desc: '磁軌雷射光束明顯變粗並擴大判定寬度，貫穿 +2 名敵人、傷害 +1.5！',
      condition: (state) => state.loadoutId === 'rail_sniper' && (state.beamWidth || 1) < 3.6,
      apply: (state) => {
        state.beamWidth = Number(((state.beamWidth || 1) + 1.1).toFixed(2));
        state.beamHitRadius = Number(((state.beamHitRadius || 0) + 0.65).toFixed(2));
        state.pierceCount = (state.pierceCount || 0) + 2;
        state.bulletDamage = Number((state.bulletDamage + 1.5).toFixed(1));
        recordUpgrade(state, 'r_thick_beam', '狙擊分支', 'exclusive');
        return state;
      }
    },
    {
      id: 'r_overcharge',
      tag: '狙擊專屬',
      icon: '💠',
      legendary: false,
      synergyTag: '狙擊分支',
      title: '極限聚能透鏡',
      desc: '狙擊槍暴擊率 +20%、暴擊倍率 +0.7x，輕鬆一槍貫穿秒殺菁英怪！',
      condition: (state) => state.loadoutId === 'rail_sniper' && (state.critMult || 2) < 4.5,
      apply: (state) => {
        state.critChance = Math.min(0.95, Number(((state.critChance || 0.25) + 0.2).toFixed(2)));
        state.critMult = Number(((state.critMult || 2.35) + 0.7).toFixed(2));
        recordUpgrade(state, 'r_overcharge', '狙擊分支', 'exclusive');
        return state;
      }
    },
    {
      id: 'r_shock_beam',
      tag: '狙擊專屬',
      icon: '⚡',
      legendary: false,
      synergyTag: '狙擊分支',
      title: '感電磁軌震波',
      desc: '磁軌命中點引爆半徑 4.5m 震波並釋放連鎖閃電，賦予狙擊槍強大清群能力！',
      condition: (state) => state.loadoutId === 'rail_sniper' && (state.chainLightning || 0) < 2,
      apply: (state) => {
        state.explosiveRadius = Math.max(state.explosiveRadius || 0, 4.5);
        state.chainLightning = (state.chainLightning || 0) + 1;
        recordUpgrade(state, 'r_shock_beam', '狙擊分支', 'exclusive');
        return state;
      }
    },

    // ==========================================
    // C. 前置解鎖覺醒與終極進化卡（必須達成前置條件才會出現！）
    // ==========================================
    {
      id: 'leg_hyper_rate',
      tag: '覺醒・極速前置(3)',
      icon: '🔥',
      legendary: true,
      synergyTag: '極速覺醒',
      title: '極限超頻引擎',
      desc: '【覺醒達成】解鎖全自動連發（按住即連射）、射速翻倍、換彈 -35%、35% 不耗彈；若原本已可連發(衝鋒槍)額外補償傷害 +28%、暴擊 +12%、彈匣 +18 與 +15% 不耗彈！',
      condition: (state) =>
        !(state.appliedUpgrades && state.appliedUpgrades.leg_hyper_rate) &&
        ((state.categoryCounts && state.categoryCounts.firerate) || 0) >= 3,
      apply: (state) => {
        const wasAlreadyAuto = !!state.isAutoFire;
        state.isAutoFire = true;
        state.fireCooldownMs = Math.max(45, Math.round(state.fireCooldownMs * 0.55));
        state.reloadTimeMs = Math.max(220, Math.round(state.reloadTimeMs * 0.65));
        state.freeShotChance = Math.min(0.85, Number(((state.freeShotChance || 0) + 0.35).toFixed(2)));
        if (wasAlreadyAuto) {
          state.bulletDamage = Number((state.bulletDamage * 1.28).toFixed(1));
          state.critChance = Math.min(0.85, Number(((state.critChance || 0) + 0.12).toFixed(2)));
          state.maxAmmo += 18;
          state.ammo = state.maxAmmo;
          state.freeShotChance = Math.min(0.85, Number(((state.freeShotChance || 0) + 0.15).toFixed(2)));
        }
        recordUpgrade(state, 'leg_hyper_rate', '極速覺醒', null);
        return state;
      }
    },
    {
      id: 'leg_aegis_shield',
      tag: '覺醒・生存前置(3)',
      icon: '🛡️',
      legendary: true,
      synergyTag: '神盾覺醒',
      title: '奈米能量護盾',
      desc: '【解鎖條件達成】獲得 2 層自動充能的「免傷能量護盾」(每7秒回復1層) + 血量上限 +60！',
      condition: (state) =>
        !(state.appliedUpgrades && state.appliedUpgrades.leg_aegis_shield) &&
        ((state.categoryCounts && state.categoryCounts.survival) || 0) >= 3,
      apply: (state) => {
        state.maxShieldCharges = 2;
        state.shieldCharges = 2;
        state.shieldRechargeSec = 7;
        state.maxHp += 60;
        state.hp = Math.min(state.maxHp, state.hp + 60);
        recordUpgrade(state, 'leg_aegis_shield', '神盾覺醒', null);
        return state;
      }
    },
    {
      id: 'leg_executioner',
      tag: '覺醒・火力前置(3)',
      icon: '💀',
      legendary: true,
      synergyTag: '處決覺醒',
      title: '處決者核心',
      desc: '【解鎖條件達成】傷害 +50%、暴擊率 +25%，擊殺必定吸血 +10 HP！',
      condition: (state) =>
        !(state.appliedUpgrades && state.appliedUpgrades.leg_executioner) &&
        ((state.categoryCounts && state.categoryCounts.firepower) || 0) >= 3,
      apply: (state) => {
        state.bulletDamage = Number((state.bulletDamage * 1.5).toFixed(1));
        state.critChance = Math.min(0.95, Number(((state.critChance || 0) + 0.25).toFixed(2)));
        state.lifestealChance = 1.0;
        state.lifestealAmount = Math.max(state.lifestealAmount || 8, 10);
        recordUpgrade(state, 'leg_executioner', '處決覺醒', null);
        return state;
      }
    },
    {
      id: 'leg_drone_swarm',
      tag: '覺醒・機動前置(3)',
      icon: '🛸',
      legendary: true,
      synergyTag: '蜂群覺醒',
      title: '軌道浮游砲矩陣',
      desc: '【解鎖條件達成】直接部署 2 台全自動索敵軌道浮游砲協助清場！',
      condition: (state) =>
        !(state.appliedUpgrades && state.appliedUpgrades.leg_drone_swarm) &&
        ((state.categoryCounts && state.categoryCounts.mobility) || 0) >= 3,
      apply: (state) => {
        state.droneCount = 2;
        state.droneDamage = Math.max(state.droneDamage || 1, 2);
        state.droneFireIntervalMs = 600;
        recordUpgrade(state, 'leg_drone_swarm', '蜂群覺醒', null);
        return state;
      }
    },
    {
      id: 'leg_evo_assault',
      tag: '終極進化・專屬(2)',
      icon: '🌀',
      legendary: true,
      synergyTag: '終極步槍',
      title: '終極電漿加特林',
      desc: '【專屬解鎖】進化為 6 管旋轉電漿加特林！射速與彈匣暴增，橫掃全場！',
      condition: (state) =>
        state.loadoutId === 'assault' &&
        (state.weaponTier || 2) < 4 &&
        ((state.categoryCounts && state.categoryCounts.exclusive) || 0) >= 2,
      apply: (state, helpers) => {
        state.weaponStyle = 'plasma';
        state.weaponTier = 4;
        state.weaponName = '🌀 終極電漿加特林';
        state.fireCooldownMs = Math.min(state.fireCooldownMs, 70);
        state.maxAmmo += 25;
        state.ammo = state.maxAmmo;
        state.projectilesPerShot = Math.max(2, (state.projectilesPerShot || 1) + 1);
        recordUpgrade(state, 'leg_evo_assault', '終極步槍', null);
        rebuildWeapon(helpers, 'plasma');
        return state;
      }
    },
    {
      id: 'leg_evo_grenade',
      tag: '終極進化・專屬(2)',
      icon: '☄️',
      legendary: true,
      synergyTag: '終極榴彈',
      title: '末日集束巨砲',
      desc: '【專屬解鎖】榴彈再巨大化、爆炸半徑 +3m，且每次射擊追加發射追蹤微型飛彈！',
      condition: (state) =>
        state.loadoutId === 'grenade' &&
        (state.weaponTier || 2) < 4 &&
        ((state.categoryCounts && state.categoryCounts.exclusive) || 0) >= 2,
      apply: (state, helpers) => {
        state.weaponStyle = 'plasma';
        state.weaponTier = 4;
        state.weaponName = '☄️ 末日集束巨砲';
        state.grenadeScale = Number(((state.grenadeScale || 1) * 1.4).toFixed(2));
        state.explosiveRadius = Number(((state.explosiveRadius || 4.8) + 3.0).toFixed(1));
        state.homingMissiles = Math.max(1, (state.homingMissiles || 0) + 1);
        recordUpgrade(state, 'leg_evo_grenade', '終極榴彈', null);
        rebuildWeapon(helpers, 'plasma');
        return state;
      }
    },
    {
      id: 'leg_evo_sniper',
      tag: '終極進化・專屬(2)',
      icon: '⚡',
      legendary: true,
      synergyTag: '終極狙擊',
      title: '殲星巨型磁軌砲',
      desc: '【專屬解鎖】極限加粗光束成為毀滅能量柱，傷害翻倍、貫穿 +4 名敵人！',
      condition: (state) =>
        state.loadoutId === 'rail_sniper' &&
        (state.weaponTier || 2) < 4 &&
        ((state.categoryCounts && state.categoryCounts.exclusive) || 0) >= 2,
      apply: (state, helpers) => {
        state.weaponStyle = 'railgun';
        state.weaponTier = 4;
        state.weaponName = '⚡ 殲星巨型磁軌砲';
        state.beamWidth = Number(((state.beamWidth || 1) + 1.8).toFixed(2));
        state.beamHitRadius = Number(((state.beamHitRadius || 0) + 0.9).toFixed(2));
        state.bulletDamage = Number((state.bulletDamage * 1.9).toFixed(1));
        state.pierceCount = (state.pierceCount || 0) + 4;
        recordUpgrade(state, 'leg_evo_sniper', '終極狙擊', null);
        rebuildWeapon(helpers, 'railgun');
        return state;
      }
    }
  ];

  /**
   * 依權重做無放回隨機抽樣
   */
  function weightedPickOne(candidates) {
    let total = 0;
    for (let i = 0; i < candidates.length; i++) {
      total += candidates[i].weight;
    }
    if (total <= 0) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
    let roll = Math.random() * total;
    for (let i = 0; i < candidates.length; i++) {
      roll -= candidates[i].weight;
      if (roll <= 0) return candidates[i];
    }
    return candidates[candidates.length - 1];
  }

  /**
   * 依 condition(state) 抽取不重複強化卡：
   * 剛達成前置解鎖的傳說覺醒/終極進化卡會優先提高權重，讓玩家立刻感受到構築回報！
   */
  function pickUpgradeCards(state, count) {
    const pickCount = typeof count === 'number' && count > 0 ? Math.floor(count) : 3;
    const safeState = state || createInitialBuildState();
    const appliedMap = safeState.appliedUpgrades || {};

    let eligible = UPGRADES.filter((u) => {
      try {
        return u.condition(safeState);
      } catch (e) {
        return false;
      }
    });

    if (eligible.length === 0) {
      eligible = UPGRADES.filter((u) => u.id === 'u_damage' || u.id === 'u_ammo' || u.id === 'u_hp');
    }

    const candidates = eligible.map((card) => {
      let weight = 1.8;
      if (card.legendary) {
        weight = 4.6;
      } else if (card.tag && card.tag.includes('專屬')) {
        weight = 2.4;
      }

      const stacks = appliedMap[card.id] || 0;
      if (stacks > 0) {
        weight *= Math.max(0.55, 1 - stacks * 0.14);
      }

      return { card, weight };
    });

    const selected = [];
    const targetCount = Math.min(pickCount, candidates.length);
    for (let i = 0; i < targetCount; i++) {
      const picked = weightedPickOne(candidates);
      selected.push(picked.card);
      const idx = candidates.indexOf(picked);
      if (idx !== -1) candidates.splice(idx, 1);
    }

    return selected;
  }

  /**
   * 取得波次強度設定與每 3 波巨型 Boss 設定
   * @param {number} wave
   * @returns {Object}
   */
  function getWaveConfig(wave) {
    const w = Math.max(1, Math.floor(wave || 1));
    const isBossWave = w % 3 === 0;
    const bossTier = Math.floor(w / 3);

    const spawnIntervalSec = Math.max(0.45, Number((1.65 - (w - 1) * 0.16).toFixed(2)));
    const spawnBatch = Math.min(6, w); // W1:1, W2:2, W3:3, W4:4, W5:5, W6+:6
    const maxEnemies = Math.min(52, 4 + w * 6); // W1:10, W2:16, W3:22, W4:28, W5:34, W6:40...
    const enemyBaseSpeed = Number((2.85 + (w - 1) * 0.25).toFixed(2));
    const speedMultiplier = Number((1 + Math.min(1.4, (w - 1) * 0.07)).toFixed(2));

    const scoutWeight = w === 1 ? 0.75 : Math.max(0.28, Number((0.56 - (w - 1) * 0.04).toFixed(2)));
    const turretWeight = w === 1 ? 0.25 : Number((0.22 + Math.min(0.06, w * 0.008)).toFixed(2));
    const chargerWeight = w === 1 ? 0 : Number(Math.min(0.24, 0.12 + (w - 2) * 0.025).toFixed(2));
    const shielderWeight = w <= 2 ? 0 : Number(Math.min(0.20, 0.08 + (w - 3) * 0.025).toFixed(2));
    const heavyWeight = w <= 1 ? 0 : Number(Math.max(0.08, 1 - scoutWeight - turretWeight - chargerWeight - shielderWeight).toFixed(2));

    const scoutHp = 1 + Math.floor((w - 1) / 3);
    const turretHp = 2 + Math.floor((w - 1) * 0.65);
    const heavyHp = 3 + Math.floor(w * 0.9);
    const chargerHp = 1.5 + Math.floor((w - 1) / 2);
    const shielderHp = 3 + Math.floor(w * 0.8);

    const bossNames = [
      '⚠️ MK-X 毀滅者核心',
      '☢️ HYPERION 重裝母艦',
      '⚡ AETHER 風暴審判者'
    ];
    const bossName =
      bossTier <= bossNames.length
        ? bossNames[bossTier - 1]
        : `👁️ SINGULARITY 虛空主宰 Mk.${bossTier - 2}`;

    const boss = isBossWave
      ? {
          type: 'boss',
          tier: bossTier,
          name: bossName,
          hp: 26 + bossTier * 24 + bossTier * bossTier * 4,
          speed: Number((1.65 + bossTier * 0.22).toFixed(2)),
          expDrop: 12 + bossTier * 6,
          healDrop: 35 + bossTier * 10,
          scoreValue: 1500 * bossTier,
          attackCooldownSec: Math.max(1.25, Number((2.4 - bossTier * 0.2).toFixed(2))),
          rageThreshold: 0.45,
          minSpawnDist: 16,
          patterns: [
            {
              id: 'orbital_strike',
              label: '衛星軌道轟炸',
              warnText: '🔴 紅圈鎖定！離開地面紅色轟炸區！',
              windupSec: Math.max(0.95, Number((1.22 - bossTier * 0.06).toFixed(2))),
              strikeCount: 3 + Math.min(3, bossTier),
              strikeRadius: 3.3,
              damage: 22 + bossTier * 4,
              color: 0xff1f5a
            },
            {
              id: 'fan',
              label: '扇形電漿齊射',
              warnText: '⚠️ 扇形高能彈幕蓄力中！',
              windupSec: 0.72,
              bulletCount: 5 + bossTier * 2,
              spreadRad: Number((Math.PI * 0.48).toFixed(3)),
              bulletSpeed: Number((12 + bossTier * 1.4).toFixed(2)),
              damage: 15 + bossTier * 3,
              color: 0xff3355
            },
            {
              id: 'ground_shockwave',
              label: '脈衝震波橫掃',
              warnText: '🌊 地面震波展開！按 Space 起跳或踩跳台騰空閃避！',
              windupSec: Math.max(0.8, Number((1.05 - bossTier * 0.05).toFixed(2))),
              waveCount: bossTier >= 2 ? 2 : 1,
              maxRadius: 29,
              expandSpeed: Number((13.0 + bossTier * 1.1).toFixed(2)),
              damage: 22 + bossTier * 4,
              color: 0xf97316
            },
            {
              id: 'charge_dash',
              label: '超載磁軌突進',
              warnText: '⚡ 鎖定直線突進！向左右側移或衝刺閃開紅線！',
              windupSec: 0.95,
              dashSpeed: 27 + bossTier * 2,
              dashDuration: 0.68,
              laneWidth: 3.6,
              laneLength: 22,
              damage: 25 + bossTier * 4,
              color: 0xfacc15
            },
            {
              id: 'spiral',
              label: '狂暴螺旋交叉連彈',
              warnText: '🌀 狂暴螺旋彈幕蓄力！準備繞射走位！',
              windupSec: 0.75,
              rageOnly: bossTier === 1,
              bulletCount: 6 + bossTier * 2,
              spreadRad: Number((Math.PI * 0.7).toFixed(3)),
              bulletSpeed: Number((13.5 + bossTier * 1.4).toFixed(2)),
              damage: 16 + bossTier * 3,
              color: 0xa855f7
            }
          ]
        }
      : null;

    return {
      wave: w,
      killsPerWave: 12 + (w - 1) * 6,
      spawnIntervalSec,
      spawnBatch,
      maxEnemies,
      enemyBaseSpeed,
      speedMultiplier,
      enemyWeights: {
        scout: scoutWeight,
        turret: turretWeight,
        heavy: heavyWeight,
        charger: chargerWeight,
        shielder: shielderWeight
      },
      enemyStats: {
        scout: {
          hp: scoutHp,
          speed: Number((enemyBaseSpeed * 1.2).toFixed(2)),
          expDrop: 1,
          scoreValue: 100 * w
        },
        turret: {
          hp: turretHp,
          speed: Number((enemyBaseSpeed * 0.82).toFixed(2)),
          expDrop: 2,
          scoreValue: 150 * w,
          shootIntervalSec: Math.max(0.85, Number((2.0 - w * 0.12).toFixed(2)))
        },
        heavy: {
          hp: heavyHp,
          speed: Number((enemyBaseSpeed * 0.65).toFixed(2)),
          expDrop: 3,
          scoreValue: 250 * w
        },
        charger: {
          hp: chargerHp,
          speed: Number((enemyBaseSpeed * 1.05).toFixed(2)),
          chargeSpeed: Number((enemyBaseSpeed * 3.15).toFixed(2)),
          expDrop: 2,
          scoreValue: 180 * w
        },
        shielder: {
          hp: shielderHp,
          speed: Number((enemyBaseSpeed * 0.62).toFixed(2)),
          expDrop: 3,
          scoreValue: 260 * w
        },
        gold_drone: {
          hp: 3 + Math.floor(w * 0.6),
          speed: Number((enemyBaseSpeed * 1.55).toFixed(2)),
          expDrop: 8 + w * 2,
          scoreValue: 800 * w
        }
      },
      isBossWave,
      boss
    };
  }

  /**
   * 取得目前流派標籤摘要（供 HUD 顯示）
   * @param {Object} state
   * @returns {Array<{tag: string, count: number}>}
   */
  function getActiveSynergies(state) {
    const map = (state && state.synergyTags) || {};
    return Object.keys(map)
      .filter((k) => map[k] > 0)
      .map((k) => ({ tag: k, count: map[k] }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * 依 ID 取得強化卡定義
   * @param {string} id
   * @returns {Object|null}
   */
  function getUpgradeById(id) {
    for (let i = 0; i < UPGRADES.length; i++) {
      if (UPGRADES[i].id === id) return UPGRADES[i];
    }
    return null;
  }

  global.GameRoguelite = {
    STARTER_LOADOUTS,
    createInitialBuildState,
    UPGRADES,
    pickUpgradeCards,
    getWaveConfig,
    getActiveSynergies,
    getUpgradeById
  };
})(typeof window !== 'undefined' ? window : globalThis);
