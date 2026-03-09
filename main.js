// City Watchkeeper - full game

window.addEventListener("load", () => {
  const config = {
    type: Phaser.AUTO,
    width: 1600,
    height: 900,
    pixelArt: true,
    physics: {
      default: "arcade",
      arcade: {
        gravity: { y: 0 },
        debug: false,
      },
    },
    scene: [MainScene],
  };

  new Phaser.Game(config);
});

// Tunable gameplay numbers
const GAME_CONFIG = {
  player: {
    moveSpeed: 130,
    maxHealth: 5,
    wardRange: 60,
    wardConeAngle: 70,
    wardCooldown: 250,
    baseDamage: 2,
    maxTotems: 2,
    totemSlowFactor: 0.4,
    totemRadius: 96,
    totemDuration: 8000,
    totemRechargeTime: 5000,
  },
  accessibility: {
    mode: "normal",
    modes: {
      normal: {
        label: "Normal",
        colors: {
          altar: 0xffee58,
          altarText: "#fff7a8",
          totem: 0x5be7ff,
          totemRing: 0xffffff,
          ward: 0x64c8ff,
          wardOutline: 0xffffff,
          gameOver: 0xaa0000,
          victory: 0x006600,
          hudAccent: "#ffffff",
        },
        tints: {
          world: 0xffffff,
          player: 0xffffff,
          ghost: 0xffffff,
          skeleton: 0xffffff,
          boss: 0xffffff,
        },
        visuals: {
          overlayColor: 0xffffff,
          overlayAlpha: 0,
          hudPanelColor: 0x000000,
          hudPanelAlpha: 0.42,
          canvasFilter: "brightness(108%) saturate(108%)",
        },
      },
      highContrast: {
        label: "High Contrast",
        colors: {
          altar: 0xfff36a,
          altarText: "#ffffff",
          totem: 0x00f5ff,
          totemRing: 0xffffff,
          ward: 0xff8a00,
          wardOutline: 0xffffff,
          gameOver: 0x5b0017,
          victory: 0x003b2f,
          hudAccent: "#ffffff",
        },
        tints: {
          world: 0xffffff,
          player: 0xffffff,
          ghost: 0x58f4ff,
          skeleton: 0xfff36a,
          boss: 0xff6b6b,
        },
        visuals: {
          overlayColor: 0xffffff,
          overlayAlpha: 0,
          hudPanelColor: 0x000000,
          hudPanelAlpha: 0.62,
          canvasFilter: "brightness(112%) contrast(130%) saturate(118%)",
        },
      },
      grayscale: {
        label: "Grayscale",
        colors: {
          altar: 0xffffff,
          altarText: "#ffffff",
          totem: 0xd8d8d8,
          totemRing: 0xffffff,
          ward: 0xebebeb,
          wardOutline: 0xffffff,
          gameOver: 0x2b2b2b,
          victory: 0x4a4a4a,
          hudAccent: "#ffffff",
        },
        tints: {
          world: 0xffffff,
          player: 0xffffff,
          ghost: 0xffffff,
          skeleton: 0xffffff,
          boss: 0xffffff,
        },
        visuals: {
          overlayColor: 0xffffff,
          overlayAlpha: 0,
          hudPanelColor: 0x000000,
          hudPanelAlpha: 0.64,
          canvasFilter: "grayscale(100%) contrast(120%) brightness(112%)",
        },
      },
    },
  },
  mausoleumMaxHealth: 5,
  waves: [
    { ghosts: 6, skeletons: 0 },
    { ghosts: 9, skeletons: 3 },
    { ghosts: 12, skeletons: 5 },
  ],
  bossExtraSkeletons: 4,
};

class MainScene extends Phaser.Scene {
  constructor() {
    super("MainScene");
  }

  preload() {
    // Tilemap
    this.load.image("tiles", "tilemap/tilemap_packed.png");
    this.load.tilemapTiledJSON("map", "tilemap/Project 4.tmj");

    // Player: 3 frames for each direction
    const playerBase = "assets/Player sprites/player/";
    const dirs = ["down", "left", "right", "up"];
    for (let d of dirs) {
      for (let i = 1; i <= 3; i++) {
        this.load.image(
          `player_${d}_${i}`,
          `${playerBase}Playerframe${i}${d}.png`
        );
      }
    }

    // Enemies
    const enemyBase = "assets/Enemy sprites/";
    this.load.image("ghost", enemyBase + "ghost.png");
    this.load.image("ghost_hit", enemyBase + "ghost_hit.png");
    this.load.image("ghost_dead", enemyBase + "ghost_dead.png");

    this.load.image("skeleton", enemyBase + "skeleton.png");
    this.load.image("skeleton_hit", enemyBase + "skeleton_hit.png");
    this.load.image("skeleton_dead", enemyBase + "skeleton_dead.png");

    this.load.image("boss", enemyBase + "Boss.png");
    this.load.image("boss_hit", enemyBase + "Boss_hit.png");
    this.load.image("boss_dead", enemyBase + "Boss_dead.png");
    this.load.image("boss_ani", enemyBase + "Boss_ani.png"); // optional

    // --- Audio assets ---
    this.load.audio("sfx_ward", "audio/ward.mp3");
    this.load.audio("sfx_totem", "audio/totem.ogg");
    this.load.audio("sfx_hit", "audio/hit.mp3");
    this.load.audio("music_loop", "audio/music_loop.mp3");
  }

  create() {
    this.accessibilityMode = GAME_CONFIG.accessibility.mode;
    this.updateAccessibilityColors();

    this.createMap();
    this.createPlayer();
    this.createEnemyGroups();
    this.createAltarHighlight();
    this.createUI();
    this.createInput();
    this.createAudio();

    // Disable right-click browser menu so we can use RMB for totems
    this.input.mouse.disableContextMenu();

    // Game state
    this.gamePhase = "title"; // 'title','intro','ready','wave','awaitingUpgrade','choosingUpgrade','victory','gameOver'
    this.isPaused = false;
    this.currentWaveIndex = -1;
    this.totalWaves = GAME_CONFIG.waves.length + 1; // + boss
    this.enemiesRemaining = 0;

    // Player & mausoleum stats
    this.playerStats = {
      moveSpeed: GAME_CONFIG.player.moveSpeed,
      maxHealth: GAME_CONFIG.player.maxHealth,
      health: GAME_CONFIG.player.maxHealth,
      wardRange: GAME_CONFIG.player.wardRange,
      wardConeAngle: GAME_CONFIG.player.wardConeAngle,
      wardCooldown: GAME_CONFIG.player.wardCooldown,
      damage: GAME_CONFIG.player.baseDamage,
      maxTotems: GAME_CONFIG.player.maxTotems,
      totemSlowFactor: GAME_CONFIG.player.totemSlowFactor,
      totemRadius: GAME_CONFIG.player.totemRadius,
      totemDuration: GAME_CONFIG.player.totemDuration,
      totemRechargeTime: GAME_CONFIG.player.totemRechargeTime,
    };

    this.mausoleumHealth = GAME_CONFIG.mausoleumMaxHealth;

    this.nextAttackTime = 0;
    this.totemCharges = this.playerStats.maxTotems;
    this.totems = [];

    this.playerDirection = "down";
    this.invincibleUntil = 0;

    this.applyAccessibilityMode();
    this.updateUI();
    this.showTitleScreen();
  }

  // --- Audio setup ---------------------------------------------

  createAudio() {
    this.sfxWard = this.sound.add("sfx_ward", { volume: 0.09 });
    this.sfxTotem = this.sound.add("sfx_totem", { volume: 0.09 });
    this.sfxHit = this.sound.add("sfx_hit", { volume: 0.09 });

    this.music = this.sound.add("music_loop", {
      loop: true,
      volume: 0.1,
    });

    // Start music right away (title + gameplay)
    this.music.play();
  }

  // --- Map / layers / spawn points -----------------------------

  createMap() {
    const map = this.make.tilemap({ key: "map" });
    this.map = map;

    const tileset = map.addTilesetImage("RPG_urban", "tiles");
    this.groundLayer = map.createLayer("Ground", tileset, 0, 0);
    this.wallsLayer = map.createLayer("Walls", tileset, 0, 0);
    this.decoLayer = map.createLayer("Deco", tileset, 0, 0);

    this.wallsLayer.setCollisionByExclusion([-1]);
    this.decoLayer.setCollisionByExclusion([-1]);

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    const playerLayer = map.getObjectLayer("Player");
    const spawnLayer = map.getObjectLayer("Spawns");
    const bossLayer = map.getObjectLayer("Boss");
    const poiLayer = map.getObjectLayer("POI");
    const mausoleumObjLayer = map.getObjectLayer("Mausoleum");

    // Player spawn
    let playerObj =
      playerLayer && playerLayer.objects
        ? playerLayer.objects.find((o) =>
            o.name.toLowerCase().includes("player")
          )
        : null;
    if (!playerObj && playerLayer && playerLayer.objects.length > 0) {
      playerObj = playerLayer.objects[0];
    }
    this.playerSpawn = playerObj
      ? { x: playerObj.x, y: playerObj.y }
      : { x: map.widthInPixels / 2, y: map.heightInPixels / 2 };

    // Mausoleum position
    let mausoleumObj = null;
    if (poiLayer && poiLayer.objects) {
      mausoleumObj = poiLayer.objects.find((o) =>
        o.name.toLowerCase().includes("mausoleum")
      );
    }
    if (
      !mausoleumObj &&
      mausoleumObjLayer &&
      mausoleumObjLayer.objects.length > 0
    ) {
      mausoleumObj = mausoleumObjLayer.objects[0];
    }
    this.mausoleumPos = mausoleumObj
      ? new Phaser.Math.Vector2(mausoleumObj.x, mausoleumObj.y)
      : new Phaser.Math.Vector2(map.widthInPixels / 2, map.heightInPixels / 2);

    // Upgrade altar / caretaker
    this.upgradeAltarPos = null;
    if (poiLayer && poiLayer.objects) {
      const upObj = poiLayer.objects.find(
        (o) =>
          o.name.toLowerCase().includes("upgrade") ||
          o.name.toLowerCase().includes("caretaker")
      );
      if (upObj) {
        this.upgradeAltarPos = { x: upObj.x, y: upObj.y };
      }
    }

    // Enemy spawn points
    this.ghostSpawns = [];
    this.skeletonSpawns = [];
    if (spawnLayer && spawnLayer.objects) {
      spawnLayer.objects.forEach((obj) => {
        const name = obj.name.toLowerCase();
        if (name.includes("ghost")) {
          this.ghostSpawns.push({ x: obj.x, y: obj.y });
        } else if (name.includes("skeleton")) {
          this.skeletonSpawns.push({ x: obj.x, y: obj.y });
        }
      });
    }

    // Boss spawn
    this.bossSpawn = null;
    if (bossLayer && bossLayer.objects && bossLayer.objects.length > 0) {
      const b =
        bossLayer.objects.find((o) => o.name.toLowerCase().includes("boss")) ||
        bossLayer.objects[0];
      this.bossSpawn = { x: b.x, y: b.y };
    }

    // Optional visual marker for mausoleum center
    this.add
      .rectangle(
        this.mausoleumPos.x,
        this.mausoleumPos.y,
        24,
        24,
        0x000000,
        0.2
      )
      .setDepth(1);
  }

  createAltarHighlight() {
    if (!this.upgradeAltarPos) return;

    const { x, y } = this.upgradeAltarPos;

    this.altarHighlight = this.add.circle(
      x,
      y - 4,
      20,
      this.currentColors.altar,
      0.22
    );
    this.altarHighlight.setDepth(11);

    this.altarRing = this.add.circle(x, y - 4, 24);
    this.altarRing.setDepth(12);
    this.altarRing.setStrokeStyle(3, this.currentColors.altar, 0.9);

    this.altarDiamond = this.add.rectangle(
      x,
      y - 4,
      12,
      12,
      this.currentColors.altar,
      0.95
    );
    this.altarDiamond.setAngle(45).setDepth(13);

    this.tweens.add({
      targets: [this.altarHighlight, this.altarRing, this.altarDiamond],
      scale: { from: 1, to: 1.18 },
      alpha: { from: 0.35, to: 0.95 },
      duration: 700,
      yoyo: true,
      repeat: -1,
    });

    this.altarLabel = this.add
      .text(x, y - 38, "ALTAR", {
        fontFamily: "sans-serif",
        fontSize: "14px",
        fill: this.currentColors.altarText,
        stroke: "#000000",
        strokeThickness: 4,
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0.5)
      .setDepth(14);
  }

  getAccessibilitySettings() {
    return (
      GAME_CONFIG.accessibility.modes[this.accessibilityMode] ||
      GAME_CONFIG.accessibility.modes.normal
    );
  }

  getAccessibilityModeLabel() {
    return this.getAccessibilitySettings().label;
  }

  updateAccessibilityColors() {
    const settings = this.getAccessibilitySettings();
    this.currentAccessibility = settings;
    this.currentColors = settings.colors;
    this.currentVisuals = settings.visuals || {};
  }

  applyTintToGameObject(gameObject, tint = 0xffffff) {
    if (!gameObject) return;
    if (gameObject.setTint) {
      gameObject.setTint(tint);
    } else if (gameObject.clearTint && tint === 0xffffff) {
      gameObject.clearTint();
    }
  }

  applyCanvasVisualMode() {
    const filter = this.currentVisuals.canvasFilter || "none";
    if (this.game && this.game.canvas) {
      this.game.canvas.style.filter = filter;
      this.game.canvas.style.imageRendering = "pixelated";
    }
  }

  applyWorldVisualMode() {
    const tints = this.currentAccessibility.tints;

    [this.groundLayer, this.wallsLayer, this.decoLayer].forEach((layer) => {
      if (!layer) return;
      this.applyTintToGameObject(layer, tints.world);
    });

    if (this.player) {
      this.applyTintToGameObject(this.player, tints.player);
    }

    if (this.enemiesGroup) {
      this.enemiesGroup.children.each((enemy) => {
        if (!enemy) return;
        this.styleEnemyForAccessibility(enemy);
      });
    }
  }

  styleEnemyForAccessibility(enemy) {
    if (!enemy) return;
    const tints = this.currentAccessibility.tints;
    const tint = tints[enemy.type] || 0xffffff;
    this.applyTintToGameObject(enemy, tint);
  }

  styleTotemForAccessibility(totem) {
    if (!totem) return;
    const ring = totem.getByName ? totem.getByName("ring") : null;
    const core = totem.getByName ? totem.getByName("core") : null;
    const crossH = totem.getByName ? totem.getByName("cross-h") : null;
    const crossV = totem.getByName ? totem.getByName("cross-v") : null;

    if (ring && ring.setStrokeStyle) {
      ring.setStrokeStyle(3, this.currentColors.totemRing, 0.7);
    }
    if (core) {
      core.fillColor = this.currentColors.totem;
    }
    if (crossH) {
      crossH.fillColor = this.currentColors.totemRing;
    }
    if (crossV) {
      crossV.fillColor = this.currentColors.totemRing;
    }
  }

  applyAccessibilityMode() {
    this.updateAccessibilityColors();

    if (this.worldModeOverlay) {
      this.worldModeOverlay.fillColor =
        this.currentVisuals.overlayColor ?? 0xffffff;
      this.worldModeOverlay.setAlpha(this.currentVisuals.overlayAlpha ?? 0);
    }

    if (this.hudPanel) {
      this.hudPanel.fillColor = this.currentVisuals.hudPanelColor ?? 0x000000;
      this.hudPanel.setAlpha(this.currentVisuals.hudPanelAlpha ?? 0.45);
    }

    if (this.altarHighlight) {
      this.altarHighlight.fillColor = this.currentColors.altar;
    }

    if (this.altarRing) {
      this.altarRing.setStrokeStyle(3, this.currentColors.altar, 0.9);
    }

    if (this.altarDiamond) {
      this.altarDiamond.fillColor = this.currentColors.altar;
    }

    if (this.altarLabel) {
      this.altarLabel.setStyle({ fill: this.currentColors.altarText });
    }

    if (this.statusText) {
      this.statusText.setStyle({ fill: this.currentColors.hudAccent });
    }

    if (this.waveText) {
      this.waveText.setStyle({ fill: this.currentColors.hudAccent });
    }

    if (this.accessibilityText) {
      this.accessibilityText.setStyle({ fill: this.currentColors.hudAccent });
    }

    if (this.gameOverOverlay) {
      this.gameOverOverlay.fillColor = this.currentColors.gameOver;
    }

    if (this.victoryOverlay) {
      this.victoryOverlay.fillColor = this.currentColors.victory;
    }

    if (this.totems && this.totems.length) {
      this.totems.forEach((totem) => this.styleTotemForAccessibility(totem));
    }

    this.applyCanvasVisualMode();
    this.applyWorldVisualMode();
    this.updateUI();
  }

  cycleAccessibilityMode() {
    const modes = Object.keys(GAME_CONFIG.accessibility.modes);
    const index = modes.indexOf(this.accessibilityMode);
    this.accessibilityMode = modes[(index + 1) % modes.length];
    this.applyAccessibilityMode();

    this.showAnnouncement(
      `Accessibility view: ${this.getAccessibilityModeLabel()}`,
      1100
    );
  }

  // --- Player & movement ---------------------------------------

  createPlayer() {
    this.player = this.physics.add.sprite(
      this.playerSpawn.x,
      this.playerSpawn.y,
      "player_down_1"
    );
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);

    this.createPlayerAnimations();
    this.player.play("idle-down");

    this.cameras.main.setBounds(
      0,
      0,
      this.map.widthInPixels,
      this.map.heightInPixels
    );
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

    this.physics.add.collider(this.player, this.wallsLayer);
    this.physics.add.collider(this.player, this.decoLayer);
    this.applyWorldVisualMode();
  }

  createPlayerAnimations() {
    if (this.anims.exists("walk-down")) return;

    const dirs = ["down", "left", "right", "up"];
    dirs.forEach((d) => {
      this.anims.create({
        key: `walk-${d}`,
        frames: [
          { key: `player_${d}_1` },
          { key: `player_${d}_2` },
          { key: `player_${d}_3` },
        ],
        frameRate: 10,
        repeat: -1,
      });
      this.anims.create({
        key: `idle-${d}`,
        frames: [{ key: `player_${d}_1` }],
        frameRate: 1,
        repeat: -1,
      });
    });
  }

  handlePlayerMovement() {
    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown || this.keys.A.isDown) vx -= 1;
    if (this.cursors.right.isDown || this.keys.D.isDown) vx += 1;
    if (this.cursors.up.isDown || this.keys.W.isDown) vy -= 1;
    if (this.cursors.down.isDown || this.keys.S.isDown) vy += 1;

    if (vx === 0 && vy === 0) {
      this.player.setVelocity(0, 0);
      this.player.play("idle-" + this.playerDirection, true);
      return;
    }

    const len = Math.hypot(vx, vy);
    vx /= len;
    vy /= len;

    this.player.setVelocity(
      vx * this.playerStats.moveSpeed,
      vy * this.playerStats.moveSpeed
    );

    if (Math.abs(vx) > Math.abs(vy)) {
      this.playerDirection = vx > 0 ? "right" : "left";
    } else {
      this.playerDirection = vy > 0 ? "down" : "up";
    }

    this.player.play("walk-" + this.playerDirection, true);
  }

  // --- Enemies -------------------------------------------------

  createEnemyGroups() {
    this.enemiesGroup = this.physics.add.group();
    this.physics.add.collider(this.enemiesGroup, this.wallsLayer);
    this.physics.add.collider(this.enemiesGroup, this.decoLayer);
    this.physics.add.collider(
      this.player,
      this.enemiesGroup,
      this.handlePlayerHit,
      null,
      this
    );
  }

  spawnEnemy(type, x, y) {
    const key = type === "boss" ? "boss" : type;
    const enemy = this.enemiesGroup.create(x, y, key);
    enemy.type = type;
    enemy.baseSpeed = type === "ghost" ? 90 : type === "skeleton" ? 50 : 45;
    enemy.maxHealth = type === "ghost" ? 3 : type === "skeleton" ? 3 : 15;
    enemy.health = enemy.maxHealth;
    enemy.setCollideWorldBounds(true);
    enemy.setDepth(9 + (type === "boss" ? 1 : 0));
    enemy.isBoss = type === "boss";
    this.styleEnemyForAccessibility(enemy);

    if (type === "boss") {
      enemy.setDisplaySize(48, 48);
    } else {
      enemy.setDisplaySize(24, 32);
    }

    this.enemiesRemaining += 1;
  }

  spawnWave(numGhosts, numSkeletons) {
    this.enemiesRemaining = 0;

    for (let i = 0; i < numGhosts; i++) {
      const spawn = this.chooseSpawn(this.ghostSpawns);
      if (spawn) this.spawnEnemy("ghost", spawn.x, spawn.y);
    }
    for (let i = 0; i < numSkeletons; i++) {
      const spawn = this.chooseSpawn(this.skeletonSpawns);
      if (spawn) this.spawnEnemy("skeleton", spawn.x, spawn.y);
    }
  }

  spawnBossWave() {
    this.enemiesRemaining = 0;

    for (let i = 0; i < GAME_CONFIG.bossExtraSkeletons; i++) {
      const spawn = this.chooseSpawn(
        this.skeletonSpawns.length ? this.skeletonSpawns : this.ghostSpawns
      );
      if (spawn) this.spawnEnemy("skeleton", spawn.x, spawn.y);
    }
    if (this.bossSpawn) {
      this.spawnEnemy("boss", this.bossSpawn.x, this.bossSpawn.y);
    }
  }

  chooseSpawn(list) {
    if (!list || list.length === 0) return null;
    const idx = Math.floor(Math.random() * list.length);
    return list[idx];
  }

  updateEnemies() {
    const enemies = this.enemiesGroup.children.entries;
    const targetPlayer = this.player;

    for (let i = 0; i < enemies.length; i++) {
      const enemy = enemies[i];
      if (!enemy.active) continue;

      // If they reach the mausoleum, they damage it once and disappear
      const distToMaus = Phaser.Math.Distance.Between(
        enemy.x,
        enemy.y,
        this.mausoleumPos.x,
        this.mausoleumPos.y
      );
      if (distToMaus < 18) {
        this.damageMausoleum(1);
        this.killEnemy(enemy);
        continue;
      }

      // Choose target: player if close, otherwise mausoleum
      const distToPlayer = Phaser.Math.Distance.Between(
        enemy.x,
        enemy.y,
        targetPlayer.x,
        targetPlayer.y
      );
      const target = distToPlayer < 150 ? targetPlayer : this.mausoleumPos;

      // Totem slow
      let slowFactor = 1;
      for (let t = 0; t < this.totems.length; t++) {
        const totem = this.totems[t];
        const d = Phaser.Math.Distance.Between(
          enemy.x,
          enemy.y,
          totem.x,
          totem.y
        );
        if (d <= this.playerStats.totemRadius) {
          slowFactor = this.playerStats.totemSlowFactor;
          break;
        }
      }

      const speed = enemy.baseSpeed * slowFactor;
      this.physics.moveTo(enemy, target.x, target.y, speed);
    }
  }

  handlePlayerHit(player, enemy) {
    if (this.gamePhase === "gameOver" || this.gamePhase === "victory") return;
    const now = this.time.now;
    if (now < this.invincibleUntil) return;

    this.playerStats.health -= 1;
    this.invincibleUntil = now + 1000;

    // play hit sound when the player takes damage
    if (this.sfxHit) {
      this.sfxHit.play();
    }

    this.cameras.main.flash(200, 255, 0, 0);
    this.updateUI();

    if (this.playerStats.health <= 0) {
      this.handleGameOver("You died. Press R to restart.");
    }
  }

  damageEnemy(enemy, amount) {
    if (!enemy.active) return;
    enemy.health -= amount;

    const baseKey = enemy.type === "boss" ? "boss" : enemy.type;
    enemy.setTexture(baseKey + "_hit");

    // Play hit SFX
    if (this.sfxHit) this.sfxHit.play();

    this.time.delayedCall(120, () => {
      if (!enemy.active) return;
      enemy.setTexture(baseKey);
    });

    if (enemy.isBoss) {
      this.cameras.main.flash(100, 255, 255, 255);
    } else {
      this.cameras.main.flash(60, 180, 220, 255);
    }

    if (enemy.health <= 0) {
      this.killEnemy(enemy);
    }
  }

  killEnemy(enemy) {
    if (!enemy.active) return;
    const baseKey = enemy.type === "boss" ? "boss" : enemy.type;
    enemy.setTexture(baseKey + "_dead");
    enemy.disableBody(true, false);

    this.tweens.add({
      targets: enemy,
      alpha: 0,
      duration: 400,
      onComplete: () => enemy.destroy(),
    });

    this.enemiesRemaining -= 1;

    if (enemy.isBoss) {
      this.handleVictory();
    } else if (
      this.gamePhase === "wave" &&
      this.enemiesRemaining <= 0 &&
      this.currentWaveIndex >= GAME_CONFIG.waves.length
    ) {
      this.handleVictory();
    } else if (
      this.gamePhase === "wave" &&
      this.enemiesRemaining <= 0 &&
      this.currentWaveIndex < GAME_CONFIG.waves.length
    ) {
      this.gamePhase = "awaitingUpgrade";
      this.showAnnouncement("Wave cleared! Upgrade time.", 1800);
      this.showMessage(
        "Return to the altar and press E to choose an upgrade."
      );
    }
  }

  damageMausoleum(amount) {
    if (this.gamePhase === "gameOver" || this.gamePhase === "victory") return;
    this.mausoleumHealth -= amount;
    this.cameras.main.shake(150, 0.01);
    this.updateUI();
    if (this.mausoleumHealth <= 0) {
      this.handleGameOver("The mausoleum fell. Press R to restart.");
    }
  }

  handleGameOver(message) {
    this.gamePhase = "gameOver";
    this.showMessage("");

    // Stop music & show red overlay
    if (this.music) this.music.stop();

    this.gameOverOverlay.setVisible(true);
    this.gameOverText.setText(message).setVisible(true);

    this.enemiesGroup.clear(true, true);
  }

  handleVictory() {
    this.gamePhase = "victory";
    this.showMessage("");

    if (this.music) this.music.stop();

    this.victoryOverlay.setVisible(true);
    this.victoryText
      .setText("You survived the night!\nPress R to restart.")
      .setVisible(true);
  }

  // --- UI & overlays -------------------------------------------

  createUI() {
    const style = {
      fontFamily: "sans-serif",
      fontSize: "14px",
      fill: "#ffffff",
    };

    this.worldModeOverlay = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0xffffff, 0)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(15);

    this.hudPanel = this.add
      .rectangle(4, 4, 530, 74, 0x000000, 0.45)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(19);

    this.statusText = this.add
      .text(12, 10, "", style)
      .setScrollFactor(0)
      .setDepth(20);

    this.waveText = this.add
      .text(12, 32, "", style)
      .setScrollFactor(0)
      .setDepth(20);

    this.accessibilityText = this.add
      .text(12, 54, "", {
        ...style,
        fill: this.currentColors.hudAccent,
      })
      .setScrollFactor(0)
      .setDepth(20);

    this.messagePanel = this.add
      .rectangle(this.scale.width / 2, this.scale.height - 42, 980, 56, 0x000000, 0.58)
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(19)
      .setVisible(false);

    this.messageText = this.add
      .text(this.scale.width / 2, this.scale.height - 42, "", {
        ...style,
        fontSize: "19px",
        align: "center",
        wordWrap: { width: 980 },
      })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(20)
      .setVisible(false);

    this.messageText.setStroke("#000000", 4);

    this.announcementPanel = this.add
      .rectangle(this.scale.width / 2, this.scale.height / 2, 860, 92, 0x000000, 0.72)
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(25)
      .setVisible(false);

    this.announcementText = this.add
      .text(this.scale.width / 2, this.scale.height / 2, "", {
        fontFamily: "sans-serif",
        fontSize: "28px",
        fill: "#ffffff",
        align: "center",
        fontStyle: "bold",
        wordWrap: { width: 780 },
      })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(26)
      .setVisible(false);

    this.announcementText.setStroke("#000000", 6);

    this.upgradeOverlay = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.75)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(30)
      .setVisible(false);

    this.upgradeText = this.add
      .text(this.scale.width / 2, this.scale.height / 2, "", {
        fontFamily: "sans-serif",
        fontSize: "20px",
        fill: "#ffffff",
        align: "center",
        wordWrap: { width: this.scale.width - 100 },
      })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(31)
      .setVisible(false);

    this.titleOverlay = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.85)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(40)
      .setVisible(false);

    this.titleText = this.add
      .text(this.scale.width / 2, this.scale.height / 2, "", {
        fontFamily: "sans-serif",
        fontSize: "20px",
        fill: "#ffffff",
        align: "center",
        wordWrap: { width: this.scale.width - 120 },
      })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(41)
      .setVisible(false);

    this.pauseOverlay = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.55)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(35)
      .setVisible(false);

    this.pauseText = this.add
      .text(this.scale.width / 2, this.scale.height / 2, "", {
        fontFamily: "sans-serif",
        fontSize: "18px",
        fill: "#ffffff",
        align: "center",
        wordWrap: { width: this.scale.width - 120 },
      })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(36)
      .setVisible(false);

    this.gameOverOverlay = this.add
      .rectangle(
        0,
        0,
        this.scale.width,
        this.scale.height,
        this.currentColors.gameOver,
        0.8
      )
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(50)
      .setVisible(false);

    this.gameOverText = this.add
      .text(this.scale.width / 2, this.scale.height / 2, "", {
        fontFamily: "sans-serif",
        fontSize: "32px",
        fill: "#ffffff",
        align: "center",
        wordWrap: { width: this.scale.width - 80 },
      })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(51)
      .setVisible(false);

    this.victoryOverlay = this.add
      .rectangle(
        0,
        0,
        this.scale.width,
        this.scale.height,
        this.currentColors.victory,
        0.8
      )
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(50)
      .setVisible(false);

    this.victoryText = this.add
      .text(this.scale.width / 2, this.scale.height / 2, "", {
        fontFamily: "sans-serif",
        fontSize: "32px",
        fill: "#ffffff",
        align: "center",
        wordWrap: { width: this.scale.width - 80 },
      })
      .setOrigin(0.5, 0.5)
      .setScrollFactor(0)
      .setDepth(51)
      .setVisible(false);
  }

  updateUI() {
    this.statusText.setText(
      `Player HP: ${this.playerStats.health}/${this.playerStats.maxHealth}   ` +
        `Mausoleum HP: ${this.mausoleumHealth}/${GAME_CONFIG.mausoleumMaxHealth}   ` +
        `Totems: ${this.totemCharges}/${this.playerStats.maxTotems}`
    );

    const waveDisplay =
      this.currentWaveIndex < 0
        ? "Wave: 0/" + this.totalWaves
        : "Wave: " +
          Math.min(this.currentWaveIndex + 1, this.totalWaves) +
          "/" +
          this.totalWaves;
    this.waveText.setText(waveDisplay);

    if (this.accessibilityText) {
      this.accessibilityText.setText(
        `View: ${this.getAccessibilityModeLabel()} (press C)`
      );
    }
  }

  showIntroPrompt() {
    const text =
      "Walk to the glowing altar and press E to start your first shift.";

    this.messagePanel.setVisible(false);
    this.messageText.setVisible(true);
    this.messageText.setText(text);
    this.messageText.setFontSize(28);
    this.messageText.setOrigin(0.5, 0.5);
    this.messageText.setPosition(this.scale.width / 2, this.scale.height / 2);
    this.messageText.setAlpha(1);
    this.messageText.setScale(1.18);

    this.tweens.add({
      targets: this.messageText,
      y: this.scale.height - 42,
      scale: 1,
      duration: 900,
      ease: "Cubic.easeOut",
      onComplete: () => {
        this.messageText.setOrigin(0.5, 0.5);
        this.messageText.setFontSize(19);
        this.messageText.setPosition(this.scale.width / 2, this.scale.height - 42);
        this.showMessage(text);
      },
    });
  }

  showMessage(text) {
    this.messageText.setText(text);
    const visible = Boolean(text);
    this.messagePanel.setVisible(visible);
    this.messageText.setVisible(visible);

    if (!visible) return;

    const panelY = this.scale.height - 42;
    const panelWidth = Phaser.Math.Clamp(this.messageText.width + 90, 420, 1120);
    const panelHeight = Phaser.Math.Clamp(this.messageText.height + 26, 54, 110);

    this.messagePanel.width = panelWidth;
    this.messagePanel.height = panelHeight;
    this.messagePanel.setPosition(this.scale.width / 2, panelY);
    this.messageText.setPosition(this.scale.width / 2, panelY);
  }

  showAnnouncement(text, duration = 1700) {
    if (!text) return;

    if (this.announcementTween) {
      this.announcementTween.remove();
      this.announcementTween = null;
    }
    if (this.announcementTimer) {
      this.announcementTimer.remove(false);
      this.announcementTimer = null;
    }

    this.announcementText
      .setText(text)
      .setAlpha(1)
      .setScale(1)
      .setVisible(true)
      .setPosition(this.scale.width / 2, this.scale.height / 2);
    this.announcementPanel
      .setAlpha(0.78)
      .setVisible(true)
      .setPosition(this.scale.width / 2, this.scale.height / 2);

    const width = Phaser.Math.Clamp(this.announcementText.width + 80, 360, 980);
    const height = Phaser.Math.Clamp(this.announcementText.height + 44, 88, 220);
    this.announcementPanel.width = width;
    this.announcementPanel.height = height;

    this.announcementTimer = this.time.delayedCall(duration, () => {
      this.announcementTween = this.tweens.add({
        targets: [this.announcementPanel, this.announcementText],
        alpha: 0,
        duration: 220,
        onComplete: () => {
          this.announcementPanel.setVisible(false);
          this.announcementText.setVisible(false);
          this.announcementPanel.setAlpha(0.78);
          this.announcementText.setAlpha(1);
          this.announcementTween = null;
        },
      });
      this.announcementTimer = null;
    });
  }

  showTitleScreen() {
    const lines = [
      "City Watchkeeper",
      "",
      "Controls:",
      "Move: WASD or Arrow Keys",
      "Ward Attack: Space or Left Mouse",
      "Ward Totem (slow field): Shift or Right Mouse",
      "Interact (altar / upgrades): E",
      "Pause: Esc",
      "Cycle Accessibility View: C",
      "Modes: Normal / High Contrast / Grayscale",
      "",
      "Goal: Survive all shifts and protect the mausoleum.",
      "",
      "Press SPACE to begin your shift.",
    ];

    this.titleOverlay.setVisible(true);
    this.titleText.setText(lines.join("\n")).setVisible(true);
    this.showMessage("");
  }

  hideTitleScreen() {
    this.titleOverlay.setVisible(false);
    this.titleText.setVisible(false);
    this.gamePhase = "intro";

    // animated intro instruction instead of tiny HUD text
    this.showIntroPrompt();
  }

  openUpgradeMenu() {
    this.gamePhase = "choosingUpgrade";
    this.physics.world.pause();

    const options = [
      "1) +1 ward damage (stronger cone attack)",
      "2) +25% move speed",
      "3) +1 max totem charge & faster recharge",
    ];

    this.upgradeOverlay.setVisible(true);
    this.upgradeText
      .setText("Choose an upgrade (press 1, 2, or 3):\n\n" + options.join("\n"))
      .setVisible(true);

    this.showMessage("");
  }

  closeUpgradeMenu() {
    this.upgradeOverlay.setVisible(false);
    this.upgradeText.setVisible(false);
    this.physics.world.resume();
    this.gamePhase = "ready";
    this.showAnnouncement("Ready for the next shift.", 1400);
    this.showMessage(
      "Press E at the altar when you are ready for the next shift."
    );
  }

  applyUpgrade(choice) {
    if (choice === 1) {
      this.playerStats.damage += 1;
      this.showMessage("Upgrade: Your ward (left click) hits harder.");
    } else if (choice === 2) {
      this.playerStats.moveSpeed = Math.round(
        this.playerStats.moveSpeed * 1.25
      );
      this.showMessage("Upgrade: You move faster.");
    } else if (choice === 3) {
      this.playerStats.maxTotems += 1;
      this.playerStats.totemRechargeTime = Math.max(
        3000,
        this.playerStats.totemRechargeTime - 1500
      );
      this.totemCharges = this.playerStats.maxTotems;
      this.showMessage(
        "Upgrade: Extra totem (right click) charge and faster recharge."
      );
    }
    this.updateUI();
    this.closeUpgradeMenu();
  }

    showPauseMenu() {
    this.pauseOverlay.setVisible(true);
    this.pauseText
      .setText(
        "Paused\n\n" +
          "Move: WASD / Arrows\n" +
          "Ward Attack: Space / Left Mouse\n" +
          "Totem: Shift / Right Mouse\n" +
          "Interact: E at altar\n" +
          "Toggle Color Blind Mode: C\n" +
          "Pause: Esc\n\n" +
          "Press Esc again to resume."
      )
      .setVisible(true);
  }

  hidePauseMenu() {
    this.pauseOverlay.setVisible(false);
    this.pauseText.setVisible(false);
  }

  togglePause() {
    if (this.isPaused) {
      this.isPaused = false;
      this.hidePauseMenu();
      this.physics.world.resume();
      if (this.music && !this.music.isPlaying) this.music.resume();
    } else {
      this.isPaused = true;
      this.showPauseMenu();
      this.physics.world.pause();
      if (this.music && this.music.isPlaying) this.music.pause();
    }
  }

  // --- Input ---------------------------------------------------

    createInput() {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.keys = this.input.keyboard.addKeys({
        W: Phaser.Input.Keyboard.KeyCodes.W,
        A: Phaser.Input.Keyboard.KeyCodes.A,
        S: Phaser.Input.Keyboard.KeyCodes.S,
        D: Phaser.Input.Keyboard.KeyCodes.D,
        SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
        SHIFT: Phaser.Input.Keyboard.KeyCodes.SHIFT,
        E: Phaser.Input.Keyboard.KeyCodes.E,
        ONE: Phaser.Input.Keyboard.KeyCodes.ONE,
        TWO: Phaser.Input.Keyboard.KeyCodes.TWO,
        THREE: Phaser.Input.Keyboard.KeyCodes.THREE,
        C: Phaser.Input.Keyboard.KeyCodes.C,
        R: Phaser.Input.Keyboard.KeyCodes.R,
        ENTER: Phaser.Input.Keyboard.KeyCodes.ENTER,
        ESC: Phaser.Input.Keyboard.KeyCodes.ESC,
      });

      this.input.on("pointerdown", (pointer) => {
        if (
          this.gamePhase === "wave" ||
          this.gamePhase === "intro" ||
          this.gamePhase === "ready" ||
          this.gamePhase === "awaitingUpgrade"
        ) {
          if (pointer.leftButtonDown()) {
            this.tryWardAttack();
          } else if (pointer.rightButtonDown()) {
            this.tryPlaceTotem();
          }
        }
      });
    }

  // --- Attacks & totems ----------------------------------------

  getDirectionAngle() {
    switch (this.playerDirection) {
      case "up":
        return -Math.PI / 2;
      case "down":
        return Math.PI / 2;
      case "left":
        return Math.PI;
      case "right":
        return 0;
      default:
        return 0;
    }
  }

  // can the player use abilities right now?
  canUseAbilities() {
    return (
      this.gamePhase === "intro" ||
      this.gamePhase === "ready" ||
      this.gamePhase === "awaitingUpgrade" ||
      this.gamePhase === "wave"
    );
  }

  showWardEffect() {
    const graphics = this.add.graphics({ x: this.player.x, y: this.player.y });
    graphics.lineStyle(3, this.currentColors.wardOutline, 0.95);
    graphics.fillStyle(this.currentColors.ward, 0.38);

    const angle = this.getDirectionAngle();
    const startAngle =
      angle - Phaser.Math.DegToRad(this.playerStats.wardConeAngle / 2);
    const endAngle =
      angle + Phaser.Math.DegToRad(this.playerStats.wardConeAngle / 2);

    graphics.slice(
      0,
      0,
      this.playerStats.wardRange,
      startAngle,
      endAngle,
      false
    );
    graphics.fillPath();
    graphics.strokePath();
    graphics.lineBetween(0, 0,
      Math.cos(startAngle) * this.playerStats.wardRange,
      Math.sin(startAngle) * this.playerStats.wardRange
    );
    graphics.lineBetween(0, 0,
      Math.cos(endAngle) * this.playerStats.wardRange,
      Math.sin(endAngle) * this.playerStats.wardRange
    );
    graphics.setDepth(5);

    this.tweens.add({
      targets: graphics,
      alpha: 0,
      duration: 150,
      onComplete: () => graphics.destroy(),
    });
  }

  tryWardAttack() {
    if (!this.canUseAbilities()) return;
    const now = this.time.now;
    if (now < this.nextAttackTime) return;
    this.nextAttackTime = now + this.playerStats.wardCooldown;

    // SFX
    if (this.sfxWard) this.sfxWard.play();

    this.showWardEffect();

    const origin = new Phaser.Math.Vector2(this.player.x, this.player.y);
    const playerAngle = this.getDirectionAngle();
    const halfAngle = Phaser.Math.DegToRad(this.playerStats.wardConeAngle / 2);
    const maxDist = this.playerStats.wardRange;

    this.enemiesGroup.children.each((enemy) => {
      if (!enemy.active) return;
      const dist = Phaser.Math.Distance.Between(
        origin.x,
        origin.y,
        enemy.x,
        enemy.y
      );
      if (dist > maxDist) return;

      const angleToEnemy = Phaser.Math.Angle.Between(
        origin.x,
        origin.y,
        enemy.x,
        enemy.y
      );
      const diff = Phaser.Math.Angle.Wrap(angleToEnemy - playerAngle);
      if (Math.abs(diff) <= halfAngle) {
        this.damageEnemy(enemy, this.playerStats.damage);
      }
    }, this);
  }

    tryPlaceTotem() {
      if (!this.canUseAbilities()) return;
      if (this.totemCharges <= 0) return;

      this.totemCharges -= 1;
      this.updateUI();

      if (this.sfxTotem) this.sfxTotem.play();

      const ring = this.add.circle(
        0,
        0,
        this.playerStats.totemRadius
      );
      ring.name = "ring";
      ring.setStrokeStyle(3, this.currentColors.totemRing, 0.7);

      const core = this.add.circle(0, 0, 18, this.currentColors.totem, 0.88);
      core.name = "core";

      const crossH = this.add.rectangle(0, 0, 22, 4, this.currentColors.totemRing, 0.95);
      crossH.name = "cross-h";
      const crossV = this.add.rectangle(0, 0, 4, 22, this.currentColors.totemRing, 0.95);
      crossV.name = "cross-v";

      const totem = this.add.container(this.player.x, this.player.y, [ring, core, crossH, crossV]);
      totem.setDepth(4);
      totem.createdAt = this.time.now;
      totem.expiresAt = totem.createdAt + this.playerStats.totemDuration;
      this.totems.push(totem);

      this.tweens.add({
        targets: ring,
        alpha: { from: 0.35, to: 0.85 },
        duration: 650,
        yoyo: true,
        repeat: -1,
      });

      this.time.delayedCall(this.playerStats.totemDuration, () => {
        const idx = this.totems.indexOf(totem);
        if (idx !== -1) this.totems.splice(idx, 1);
        totem.destroy();
      });

      this.time.delayedCall(this.playerStats.totemRechargeTime, () => {
        this.totemCharges = Math.min(
          this.playerStats.maxTotems,
          this.totemCharges + 1
        );
        this.updateUI();
      });
    }

  // --- Waves / state machine -----------------------------------

  isNearAltar() {
    if (!this.upgradeAltarPos) return false;
    const dist = Phaser.Math.Distance.Between(
      this.player.x,
      this.player.y,
      this.upgradeAltarPos.x,
      this.upgradeAltarPos.y
    );
    return dist <= 40;
  }

  startNextWave() {
    this.currentWaveIndex += 1;

    this.enemiesGroup.clear(true, true);
    this.totems.forEach((t) => t.destroy());
    this.totems = [];
    this.totemCharges = this.playerStats.maxTotems;

    if (this.currentWaveIndex < GAME_CONFIG.waves.length) {
      const cfg = GAME_CONFIG.waves[this.currentWaveIndex];
      this.spawnWave(cfg.ghosts, cfg.skeletons);
      const waveNumber = this.currentWaveIndex + 1;
      this.showAnnouncement(`Wave ${waveNumber} has begun!`, 1600);
      this.showMessage("Protect the mausoleum!");
    } else if (this.currentWaveIndex === GAME_CONFIG.waves.length) {
      this.spawnBossWave();
      this.showAnnouncement("Final wave! Boss incoming!", 1800);
      this.showMessage("The boss spirit has appeared.");
    } else {
      return;
    }

    this.gamePhase = "wave";
    this.updateUI();
  }

  // --- Main update loop ----------------------------------------

  update() {
    // Title screen – start with SPACE
    if (this.gamePhase === "title") {
      if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) {
        this.hideTitleScreen();
      }
      return;
    }

    // Game over / victory restart
    if (this.gamePhase === "gameOver" || this.gamePhase === "victory") {
      if (Phaser.Input.Keyboard.JustDown(this.keys.R)) {
        this.scene.restart();
      }
      return;
    }

    // Upgrade choice (1/2/3)
    if (this.gamePhase === "choosingUpgrade") {
      if (Phaser.Input.Keyboard.JustDown(this.keys.ONE)) {
        this.applyUpgrade(1);
      } else if (Phaser.Input.Keyboard.JustDown(this.keys.TWO)) {
        this.applyUpgrade(2);
      } else if (Phaser.Input.Keyboard.JustDown(this.keys.THREE)) {
        this.applyUpgrade(3);
      }
      return;
    }

    // Pause toggle (Esc)
    if (Phaser.Input.Keyboard.JustDown(this.keys.ESC)) {
      this.togglePause();
    }
    if (this.isPaused) return;
    if (Phaser.Input.Keyboard.JustDown(this.keys.C)) {
      this.cycleAccessibilityMode();
    }

    // Interaction (E) at altar
    if (Phaser.Input.Keyboard.JustDown(this.keys.E) && this.isNearAltar()) {
      if (this.gamePhase === "intro" || this.gamePhase === "ready") {
        this.startNextWave();
      } else if (this.gamePhase === "awaitingUpgrade") {
        this.openUpgradeMenu();
      }
    }

    this.handlePlayerMovement();

    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) {
      this.tryWardAttack();
    }
    if (Phaser.Input.Keyboard.JustDown(this.keys.SHIFT)) {
      this.tryPlaceTotem();
    }

    if (this.gamePhase === "wave") {
      this.updateEnemies();
    }
  }
}
