// Every pixel the player sees: the arena, the foes, the lantern-bearer, the HUD
// and the five screens (title, level-up, pause, game over, victory). The logical
// playfield is 1280x720; the canvas is scaled to the window by CSS.
import { FIELD, FONT, PALETTE, xpForLevel } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_LEVELUP = 'levelup';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

/** The three level-up card rectangles, shared by the renderer and click handling. */
export function levelupCardRects() {
  const w = 300;
  const h = 210;
  const gap = 36;
  const total = w * 3 + gap * 2;
  const x0 = (FIELD.width - total) / 2;
  const y = 250;
  return [0, 1, 2].map((i) => ({ x: x0 + i * (w + gap), y, w, h }));
}

export function createRenderer(canvas) {
  canvas.width = FIELD.width;
  canvas.height = FIELD.height;
  const ctx = canvas.getContext('2d');

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function text(str, x, y, size, colour, align = 'center', weight = '700') {
    ctx.font = `${weight} ${size}px ${FONT}`;
    ctx.fillStyle = colour;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(str, x, y);
  }

  function drawFloor(time) {
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    // Checkerboard flagstones.
    const tile = 80;
    for (let ty = 0; ty < 9; ty += 1) {
      for (let tx = 0; tx < 16; tx += 1) {
        ctx.fillStyle = (tx + ty) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
        ctx.fillRect(tx * tile, ty * tile, tile, tile);
      }
    }
    // Cracks and moss: a few fixed strokes so the floor is not flat.
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    const cracks = [[200, 120, 260, 200], [900, 500, 980, 560], [520, 80, 560, 160], [1100, 200, 1040, 280], [320, 560, 380, 620]];
    for (const [x1, y1, x2, y2] of cracks) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo((x1 + x2) / 2 + 12, (y1 + y2) / 2 - 8);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    // Lantern posts in the corners, flames flickering with time.
    const posts = [[48, 48], [FIELD.width - 48, 48], [48, FIELD.height - 48], [FIELD.width - 48, FIELD.height - 48]];
    for (const [x, y] of posts) {
      const flick = 0.75 + Math.sin(time * 5 + x) * 0.15 + Math.sin(time * 9 + y) * 0.1;
      const glow = ctx.createRadialGradient(x, y, 4, x, y, 90 * flick);
      glow.addColorStop(0, 'rgba(242, 201, 76, 0.5)');
      glow.addColorStop(1, 'rgba(242, 201, 76, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(x - 90, y - 90, 180, 180);
      ctx.fillStyle = '#3a2f22';
      ctx.fillRect(x - 3, y - 6, 6, 26);
      ctx.fillStyle = PALETTE.lantern;
      ctx.beginPath();
      ctx.arc(x, y - 10, 8 * flick, 0, Math.PI * 2);
      ctx.fill();
    }
    // Arena border.
    ctx.strokeStyle = PALETTE.wall;
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, FIELD.width - 10, FIELD.height - 10);
  }

  function drawGem(g) {
    const colour = g.value >= 20 ? '#ffd94d' : g.value >= 5 ? '#7ab8ff' : '#5ad6ff';
    const size = g.value >= 20 ? 10 : g.value >= 5 ? 8 : 6;
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = colour;
    ctx.shadowColor = colour;
    ctx.shadowBlur = 10;
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.restore();
  }

  function drawPickup(pk, time) {
    const bob = Math.sin(time * 4 + pk.phase) * 4;
    if (pk.kind === 'heart') {
      ctx.font = '28px ' + FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#ff5a6e';
      ctx.shadowBlur = 12;
      ctx.fillText('❤', pk.x, pk.y + bob);
      ctx.shadowBlur = 0;
    }
  }

  function drawEnemy(e, time) {
    ctx.save();
    ctx.translate(e.x, e.y);
    if (e.flash > 0) ctx.globalAlpha = 0.6;
    const flashWhite = e.flash > 0;
    if (e.kind === 'mite') {
      ctx.fillStyle = flashWhite ? '#fff' : e.colour;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2a0d0d';
      ctx.beginPath();
      ctx.arc(-5, -3, 3, 0, Math.PI * 2);
      ctx.arc(5, -3, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'wisp') {
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = flashWhite ? '#fff' : e.colour;
      ctx.beginPath();
      ctx.arc(0, -2, e.radius, Math.PI, 0);
      ctx.lineTo(e.radius, e.radius * 0.8);
      ctx.lineTo(e.radius / 2, e.radius * 0.4);
      ctx.lineTo(0, e.radius * 0.8);
      ctx.lineTo(-e.radius / 2, e.radius * 0.4);
      ctx.lineTo(-e.radius, e.radius * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#0d2233';
      ctx.beginPath();
      ctx.arc(-4, -4, 2.5, 0, Math.PI * 2);
      ctx.arc(4, -4, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'spitter') {
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = flashWhite ? '#fff' : e.colour;
      ctx.fillRect(-e.radius * 0.8, -e.radius * 0.8, e.radius * 1.6, e.radius * 1.6);
      ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = '#1d0d33';
      ctx.beginPath();
      ctx.arc(0, 2, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'dasher') {
      const ang = Math.atan2(0, 1);
      ctx.rotate(e.lungeState === 1 ? Math.sin(time * 40) * 0.1 : 0);
      ctx.fillStyle = flashWhite ? '#fff' : e.colour;
      ctx.beginPath();
      ctx.moveTo(e.radius + 6, 0);
      ctx.lineTo(-e.radius, e.radius * 0.85);
      ctx.lineTo(-e.radius * 0.4, 0);
      ctx.lineTo(-e.radius, -e.radius * 0.85);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#332200';
      ctx.beginPath();
      ctx.arc(2, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      void ang;
    } else if (e.kind === 'brute') {
      ctx.fillStyle = flashWhite ? '#fff' : e.colour;
      roundRect(-e.radius, -e.radius, e.radius * 2, e.radius * 2, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-e.radius * 0.5, -e.radius * 0.5);
      ctx.lineTo(e.radius * 0.4, e.radius * 0.3);
      ctx.moveTo(e.radius * 0.5, -e.radius * 0.4);
      ctx.lineTo(-e.radius * 0.3, e.radius * 0.5);
      ctx.stroke();
      ctx.fillStyle = '#2a1503';
      ctx.beginPath();
      ctx.arc(-6, -4, 3.5, 0, Math.PI * 2);
      ctx.arc(6, -4, 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'boss') {
      const pulse = 1 + Math.sin(time * 3) * 0.03;
      ctx.scale(pulse, pulse);
      ctx.fillStyle = flashWhite ? '#fff' : '#7a1f14';
      ctx.beginPath();
      ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ff5a3c';
      ctx.lineWidth = 4;
      ctx.stroke();
      // Horns.
      ctx.fillStyle = '#ffd94d';
      ctx.beginPath();
      ctx.moveTo(-e.radius * 0.7, -e.radius * 0.7);
      ctx.lineTo(-e.radius * 1.1, -e.radius * 1.25);
      ctx.lineTo(-e.radius * 0.35, -e.radius * 0.9);
      ctx.closePath();
      ctx.moveTo(e.radius * 0.7, -e.radius * 0.7);
      ctx.lineTo(e.radius * 1.1, -e.radius * 1.25);
      ctx.lineTo(e.radius * 0.35, -e.radius * 0.9);
      ctx.closePath();
      ctx.fill();
      // Burning eyes.
      ctx.fillStyle = '#ffd94d';
      ctx.shadowColor = '#ff5a3c';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(-14, -8, 6, 0, Math.PI * 2);
      ctx.arc(14, -8, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#2a0d0d';
      ctx.fillRect(-20, 12, 40, 6);
    }
    if (e.elite) {
      ctx.strokeStyle = '#ffd94d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
      text('★', 0, -e.radius - 12, 14, '#ffd94d');
    }
    // Small HP bar for hurt foes.
    if (e.hp < e.maxHp && e.kind !== 'boss') {
      const w = e.radius * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(-w / 2, -e.radius - 10, w, 5);
      ctx.fillStyle = '#e5534b';
      ctx.fillRect(-w / 2, -e.radius - 10, w * Math.max(0, e.hp / e.maxHp), 5);
    }
    ctx.restore();
  }

  function drawPlayer(p, time) {
    const blink = p.invulnerable > 0 && Math.floor(time * 14) % 2 === 0;
    ctx.save();
    ctx.translate(p.x, p.y);
    if (blink) ctx.globalAlpha = 0.45;
    // Lantern glow.
    const glow = ctx.createRadialGradient(0, 0, 8, 0, 0, 110);
    glow.addColorStop(0, 'rgba(255, 209, 102, 0.35)');
    glow.addColorStop(1, 'rgba(255, 209, 102, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(-110, -110, 220, 220);
    // Cloak.
    const bob = p.moving ? Math.sin(p.walkPhase) * 2 : 0;
    ctx.fillStyle = PALETTE.cloak;
    ctx.beginPath();
    ctx.moveTo(0, -p.radius - 4);
    ctx.quadraticCurveTo(p.radius + 4, -4, p.radius * 0.8, p.radius);
    ctx.quadraticCurveTo(0, p.radius + 6 + bob, -p.radius * 0.8, p.radius);
    ctx.quadraticCurveTo(-p.radius - 4, -4, 0, -p.radius - 4);
    ctx.fill();
    // Hood and face.
    ctx.fillStyle = '#2c4a6b';
    ctx.beginPath();
    ctx.arc(0, -4, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe9b0';
    ctx.beginPath();
    ctx.arc(0, -3, 6.5, 0, Math.PI * 2);
    ctx.fill();
    // Lantern held out toward the aim.
    const aim = Math.atan2(p.aimY - p.y, p.aimX - p.x);
    const lx = Math.cos(aim) * 22;
    const ly = Math.sin(aim) * 22;
    ctx.strokeStyle = '#3a2f22';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(lx, ly);
    ctx.stroke();
    ctx.fillStyle = PALETTE.lantern;
    ctx.beginPath();
    ctx.arc(lx, ly, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Aim reticle at the mouse.
    ctx.strokeStyle = 'rgba(244, 234, 216, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.aimX, p.aimY, 10, 0, Math.PI * 2);
    ctx.moveTo(p.aimX - 14, p.aimY);
    ctx.lineTo(p.aimX - 6, p.aimY);
    ctx.moveTo(p.aimX + 6, p.aimY);
    ctx.lineTo(p.aimX + 14, p.aimY);
    ctx.moveTo(p.aimX, p.aimY - 14);
    ctx.lineTo(p.aimX, p.aimY - 6);
    ctx.moveTo(p.aimX, p.aimY + 6);
    ctx.lineTo(p.aimX, p.aimY + 14);
    ctx.stroke();
  }

  function drawHud(state, ui) {
    const p = state.player;
    // Top-left: health + level.
    ctx.fillStyle = PALETTE.panel;
    roundRect(16, 14, 260, 64, 10);
    ctx.fill();
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 2;
    ctx.stroke();
    text(`❤ ${Math.ceil(p.hp)} / ${p.maxHp}`, 30, 34, 17, p.hp < p.maxHp * 0.3 ? PALETTE.hpLow : PALETTE.hp, 'left');
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    roundRect(30, 48, 200, 12, 6);
    ctx.fill();
    ctx.fillStyle = p.hp < p.maxHp * 0.3 ? PALETTE.hpLow : PALETTE.hp;
    roundRect(30, 48, 200 * Math.max(0, p.hp / p.maxHp), 12, 6);
    ctx.fill();
    text(`LV ${p.level}`, 240, 34, 15, PALETTE.xp, 'left');
    // Top-centre: wave, boss bar under it.
    text(state.wave === 0 ? 'EMBERWARD' : `WAVE ${state.wave} / 15`, FIELD.width / 2, 30, 22, PALETTE.text);
    if (state.boss) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      roundRect(FIELD.width / 2 - 190, 46, 380, 12, 6);
      ctx.fill();
      ctx.fillStyle = PALETTE.boss;
      roundRect(FIELD.width / 2 - 190, 46, 380 * Math.max(0, state.boss.hp / state.boss.maxHp), 12, 6);
      ctx.fill();
      text('CINDER WARDEN', FIELD.width / 2, 72, 13, '#ff8a70');
    }
    // Top-right: score, kills, time.
    text(`SCORE ${state.score}`, FIELD.width - 24, 28, 17, PALETTE.text, 'right');
    const mins = Math.floor(state.time / 60);
    const secs = Math.floor(state.time % 60);
    text(`☠ ${state.kills}   ⏱ ${mins}:${String(secs).padStart(2, '0')}`, FIELD.width - 24, 52, 15, PALETTE.muted, 'right');
    if (ui.best > 0) text(`BEST ${ui.best}`, FIELD.width - 24, 74, 13, PALETTE.muted, 'right');
    // Bottom: XP bar.
    const need = xpForLevel(p.level);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, FIELD.height - 18, FIELD.width, 18);
    ctx.fillStyle = PALETTE.xp;
    ctx.fillRect(0, FIELD.height - 18, FIELD.width * Math.min(1, p.xp / need), 18);
    text(`XP ${p.xp} / ${need} — level ${p.level}`, FIELD.width / 2, FIELD.height - 9, 11, '#0d0a14');
    if (ui.muted) text('🔇 MUTED (M)', 24, FIELD.height - 34, 13, PALETTE.muted, 'left');
    // Wave banner.
    if (state.bannerTimer > 0 && state.banner) {
      const a = Math.min(1, state.bannerTimer);
      ctx.globalAlpha = a;
      text(state.banner, FIELD.width / 2, 150, 40, '#ffd94d');
      ctx.globalAlpha = 1;
    }
    // Low-health vignette.
    if (p.hp < p.maxHp * 0.3 && !state.over) {
      const pulse = 0.12 + Math.sin(state.time * 5) * 0.06;
      const vg = ctx.createRadialGradient(FIELD.width / 2, FIELD.height / 2, 260, FIELD.width / 2, FIELD.height / 2, 640);
      vg.addColorStop(0, 'rgba(229, 83, 75, 0)');
      vg.addColorStop(1, `rgba(229, 83, 75, ${pulse})`);
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
  }

  function drawWorld(state, time) {
    drawFloor(time);
    for (const g of state.gems) drawGem(g);
    for (const pk of state.pickups) drawPickup(pk, time);
    for (const e of state.enemies) drawEnemy(e, time);
    if (!state.over) drawPlayer(state.player, time);
    for (const b of state.bullets) {
      ctx.fillStyle = b.crit ? '#ffd94d' : '#ffb347';
      ctx.shadowColor = '#ff7a3c';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    for (const b of state.ebullets) {
      ctx.fillStyle = '#c77dff';
      ctx.shadowColor = '#b678f2';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    for (const pt of state.particles.list) {
      if (!pt.alive) continue;
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.colour;
      if (pt.glow) {
        ctx.shadowColor = pt.colour;
        ctx.shadowBlur = 8;
      }
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }
    for (const t of state.particles.textList) {
      if (!t.alive) continue;
      ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
      text(t.text, t.x, t.y, t.size, t.colour);
      ctx.globalAlpha = 1;
    }
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = PALETTE.panel;
    roundRect(x, y, w, h, 14);
    ctx.fill();
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawTitle(state, ui) {
    ctx.fillStyle = 'rgba(10, 6, 18, 0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    text('EMBERWARD', FIELD.width / 2, 150, 84, '#ffd94d');
    text('Hold the Last Lantern', FIELD.width / 2, 215, 26, PALETTE.text, 'center', '400');
    panel(FIELD.width / 2 - 330, 260, 660, 190);
    text('The dark has swallowed the valley. You carry the last lantern.', FIELD.width / 2, 292, 18, PALETTE.text, 'center', '400');
    text('WASD / arrows — move      Mouse — aim      Hold click / Space — fire', FIELD.width / 2, 330, 17, PALETTE.muted, 'center', '400');
    text('Slay fiends, gather embers, choose a boon each level.', FIELD.width / 2, 362, 17, PALETTE.muted, 'center', '400');
    text('Beat the Cinder Warden on Wave 15 to win.  P — pause   M — mute', FIELD.width / 2, 394, 17, PALETTE.muted, 'center', '400');
    text('▶  PRESS SPACE OR CLICK TO BEGIN', FIELD.width / 2, 432, 20, '#ffd94d');
    if (ui.best > 0) text(`Best score: ${ui.best}`, FIELD.width / 2, 500, 17, PALETTE.muted);
    text('Five kinds of fiends, elites, a boss every 5 waves, 12 boons.', FIELD.width / 2, 540, 15, PALETTE.muted, 'center', '400');
  }

  function drawLevelup(state) {
    ctx.fillStyle = 'rgba(10, 6, 18, 0.62)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    text(`LEVEL ${state.player.level} — CHOOSE A BOON`, FIELD.width / 2, 180, 38, '#ffd94d');
    text('Click a card, or press 1 / 2 / 3', FIELD.width / 2, 218, 16, PALETTE.muted, 'center', '400');
    const rects = levelupCardRects();
    state.levelChoices.forEach((u, i) => {
      const r = rects[i];
      panel(r.x, r.y, r.w, r.h);
      text(u.icon, r.x + r.w / 2, r.y + 42, 40, '#ffd94d');
      text(u.name, r.x + r.w / 2, r.y + 92, 21, PALETTE.text);
      // Word-wrap the description to the card width.
      const words = u.desc.split(' ');
      const lines = [];
      let line = '';
      for (const w of words) {
        if ((line + ' ' + w).trim().length > 26) {
          lines.push(line.trim());
          line = w;
        } else line += ' ' + w;
      }
      lines.push(line.trim());
      lines.forEach((ln, li) => text(ln, r.x + r.w / 2, r.y + 132 + li * 22, 15, PALETTE.muted, 'center', '400'));
      text(`[${i + 1}]`, r.x + r.w / 2, r.y + r.h - 22, 15, PALETTE.xp);
    });
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(10, 6, 18, 0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    text('PAUSED', FIELD.width / 2, 330, 56, PALETTE.text);
    text('Press P or click to resume', FIELD.width / 2, 390, 18, PALETTE.muted, 'center', '400');
  }

  function drawStats(state, ui, y0) {
    const mins = Math.floor(state.time / 60);
    const secs = Math.floor(state.time % 60);
    const rows = [
      `Score  ${state.score}`,
      `Waves cleared  ${Math.max(0, state.wave - (state.victory ? 0 : 1))} / 15`,
      `Fiends slain  ${state.kills}`,
      `Level reached  ${state.player.level}`,
      `Time survived  ${mins}:${String(secs).padStart(2, '0')}`,
      `Best score  ${Math.max(ui.best, state.score)}`,
    ];
    rows.forEach((row, i) => text(row, FIELD.width / 2, y0 + i * 34, 19, i === 0 ? '#ffd94d' : PALETTE.text, 'center', i === 0 ? '700' : '400'));
  }

  function drawOver(state, ui) {
    ctx.fillStyle = 'rgba(10, 6, 18, 0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    text('THE LIGHT GOES OUT', FIELD.width / 2, 150, 52, '#e5534b');
    text(`The dark took the lantern on Wave ${state.wave}.`, FIELD.width / 2, 205, 20, PALETTE.muted, 'center', '400');
    drawStats(state, ui, 260);
    text('▶  PRESS SPACE OR CLICK TO TRY AGAIN', FIELD.width / 2, 500, 20, '#ffd94d');
  }

  function drawWin(state, ui) {
    ctx.fillStyle = 'rgba(10, 6, 18, 0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    text('☀  THE LANTERN STILL BURNS  ☀', FIELD.width / 2, 140, 46, '#ffd94d');
    text('The Cinder Warden is ash. Dawn returns to the valley.', FIELD.width / 2, 195, 20, PALETTE.text, 'center', '400');
    drawStats(state, ui, 250);
    text('▶  PRESS SPACE OR CLICK TO PLAY AGAIN', FIELD.width / 2, 500, 20, '#ffd94d');
  }

  return {
    draw(state, screen, ui) {
      const time = state.time;
      const off = state.particles.offset();
      ctx.save();
      ctx.clearRect(0, 0, FIELD.width, FIELD.height);
      ctx.translate(off.x, off.y);
      drawWorld(state, time);
      if (screen === SCREEN_PLAY || screen === SCREEN_LEVELUP || screen === SCREEN_PAUSED) drawHud(state, ui);
      if (screen === SCREEN_TITLE) drawTitle(state, ui);
      else if (screen === SCREEN_LEVELUP) drawLevelup(state);
      else if (screen === SCREEN_PAUSED) drawPaused();
      else if (screen === SCREEN_OVER) drawOver(state, ui);
      else if (screen === SCREEN_WIN) drawWin(state, ui);
      ctx.restore();
    },
  };
}
