// All drawing: arena, fiends, player, HUD, and every screen. Nothing here
// changes the simulation; it only reads the world state and paints it.
import { ARENA, PALETTE, FINAL_WAVE } from './config.js';
import { aimAngle } from './player.js';

const FONT = 'system-ui, -apple-system, sans-serif';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function bar(ctx, x, y, w, h, frac, fill, back) {
  ctx.fillStyle = back;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fill();
  if (frac > 0) {
    ctx.fillStyle = fill;
    roundRect(ctx, x, y, w * Math.min(1, frac), h, h / 2);
    ctx.fill();
  }
}

function drawArena(ctx, state, time) {
  ctx.fillStyle = PALETTE.bg;
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);
  ctx.fillStyle = PALETTE.arena;
  roundRect(ctx, ARENA.wall, ARENA.wall, ARENA.width - ARENA.wall * 2, ARENA.height - ARENA.wall * 2, 18);
  ctx.fill();
  // Faint floor embers, drifting slowly so the arena feels alive.
  ctx.fillStyle = PALETTE.floorDot;
  for (let i = 0; i < 60; i++) {
    const x = ((i * 173) % 1200) + 40;
    const y = ((i * 311) % 640) + 40 + Math.sin(time * 0.7 + i) * 3;
    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = PALETTE.arenaEdge;
  ctx.lineWidth = 3;
  roundRect(ctx, ARENA.wall, ARENA.wall, ARENA.width - ARENA.wall * 2, ARENA.height - ARENA.wall * 2, 18);
  ctx.stroke();
  // Warm lantern glow around the player.
  const p = state.player;
  const glow = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, 260);
  glow.addColorStop(0, 'rgba(255, 179, 71, 0.20)');
  glow.addColorStop(1, 'rgba(255, 179, 71, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);
}

function drawGems(ctx, state) {
  for (const g of state.gems) {
    const big = g.kind === 'big';
    ctx.fillStyle = big ? PALETTE.gold : PALETTE.xp;
    const s = big ? 8 : 5;
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-s / 2, -s / 2, s, s);
    ctx.restore();
  }
}

function drawEnemy(ctx, e, time) {
  ctx.save();
  ctx.translate(e.x, e.y);
  const flash = e.flash > 0.3;
  ctx.fillStyle = flash ? '#ffffff' : e.color;
  if (e.kind === 'mite') {
    // Spiky ember mite.
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + time * 0.5;
      const r = i % 2 === 0 ? e.radius + 4 : e.radius - 2;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
  } else if (e.kind === 'wisp') {
    // Drifting ghost wisp with a tail.
    ctx.beginPath();
    ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(0, e.radius * 0.7, e.radius * 0.6, 0, Math.PI);
    ctx.fill();
    ctx.globalAlpha = 1;
  } else if (e.kind === 'spitter') {
    ctx.beginPath();
    ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0d0a14';
    ctx.beginPath();
    ctx.arc(0, 2, 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.kind === 'dasher') {
    // Arrow-shaped dasher; flashes white while winding up a lunge.
    if (e.windup > 0) {
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(time * 30);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, e.radius + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.beginPath();
    ctx.moveTo(e.radius + 6, 0);
    ctx.lineTo(-e.radius, -e.radius * 0.8);
    ctx.lineTo(-e.radius * 0.5, 0);
    ctx.lineTo(-e.radius, e.radius * 0.8);
    ctx.closePath();
    ctx.fill();
  } else if (e.kind === 'brute') {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const px = Math.cos(a) * e.radius;
      const py = Math.sin(a) * e.radius;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
  // Eyes, always facing the player is overkill; two dots read as a face.
  ctx.fillStyle = '#0d0a14';
  ctx.beginPath();
  ctx.arc(-e.radius * 0.35, -e.radius * 0.2, 2.4, 0, Math.PI * 2);
  ctx.arc(e.radius * 0.35, -e.radius * 0.2, 2.4, 0, Math.PI * 2);
  ctx.fill();
  if (e.elite) {
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, e.radius + 5, 0, Math.PI * 2);
    ctx.stroke();
  }
  // Small health bar for hurt fiends.
  if (e.hp < e.maxHp) {
    bar(ctx, -e.radius, -e.radius - 12, e.radius * 2, 4, e.hp / e.maxHp, '#ff5a5a', '#3a2030');
  }
  ctx.restore();
}

function drawBoss(ctx, boss, time) {
  ctx.save();
  ctx.translate(boss.x, boss.y);
  const flash = boss.flash > 0.3;
  // Horns.
  ctx.fillStyle = flash ? '#ffffff' : '#ffd23c';
  ctx.beginPath();
  ctx.moveTo(-boss.radius * 0.7, -boss.radius * 0.6);
  ctx.lineTo(-boss.radius * 1.15, -boss.radius * 1.4);
  ctx.lineTo(-boss.radius * 0.25, -boss.radius * 0.85);
  ctx.closePath();
  ctx.moveTo(boss.radius * 0.7, -boss.radius * 0.6);
  ctx.lineTo(boss.radius * 1.15, -boss.radius * 1.4);
  ctx.lineTo(boss.radius * 0.25, -boss.radius * 0.85);
  ctx.closePath();
  ctx.fill();
  // Body: a big ember orb with a pulsing rim.
  ctx.fillStyle = flash ? '#ffffff' : boss.color;
  ctx.beginPath();
  ctx.arc(0, 0, boss.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(255, 210, 60, ${0.5 + 0.4 * Math.sin(time * 4)})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, boss.radius + 4, 0, Math.PI * 2);
  ctx.stroke();
  // Burning eyes.
  ctx.fillStyle = '#ffd23c';
  ctx.beginPath();
  ctx.arc(-boss.radius * 0.35, -6, 5, 0, Math.PI * 2);
  ctx.arc(boss.radius * 0.35, -6, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0d0a14';
  ctx.beginPath();
  ctx.arc(-boss.radius * 0.35, -6, 2, 0, Math.PI * 2);
  ctx.arc(boss.radius * 0.35, -6, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlayer(ctx, p, time) {
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.invulnerable > 0 && Math.floor(time * 12) % 2 === 0) ctx.globalAlpha = 0.45;
  // Cloak.
  ctx.fillStyle = '#3b2d5c';
  ctx.beginPath();
  ctx.arc(0, 0, p.radius + 3, 0, Math.PI * 2);
  ctx.fill();
  // Face and hood.
  ctx.fillStyle = '#f5ead6';
  ctx.beginPath();
  ctx.arc(0, -2, 8, 0, Math.PI * 2);
  ctx.fill();
  // The lantern, held out toward the aim.
  const aim = aimAngle(p);
  const lx = Math.cos(aim) * 20;
  const ly = Math.sin(aim) * 20;
  ctx.strokeStyle = '#8a6d3b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(lx, ly);
  ctx.stroke();
  ctx.fillStyle = PALETTE.lantern;
  ctx.beginPath();
  ctx.arc(lx, ly, 7 + Math.sin(time * 6) * 1.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(lx, ly, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBolts(ctx, state) {
  for (const b of state.bolts) {
    ctx.fillStyle = '#ff9a3c';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius + 3, 0, Math.PI * 2);
    ctx.globalAlpha = 0.35;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const s of state.enemyShots) {
    ctx.fillStyle = '#c65df0';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius + 2, 0, Math.PI * 2);
    ctx.globalAlpha = 0.4;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#e9b8ff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHUD(ctx, state) {
  const p = state.player;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  // Health bar and level, top left.
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 15px ${FONT}`;
  ctx.fillText(`HP ${Math.ceil(p.hp)} / ${p.maxHp}`, 44, 62);
  bar(ctx, 44, 70, 220, 14, p.hp / p.maxHp, PALETTE.hp, PALETTE.hpBack);
  ctx.fillStyle = PALETTE.dim;
  ctx.font = `13px ${FONT}`;
  ctx.fillText(`LEVEL ${p.level}`, 44, 106);
  // XP bar, thin, under the health bar.
  bar(ctx, 44, 112, 220, 6, p.xp / p.xpNeed, PALETTE.xp, '#1d2b1d');
  // Wave and score, top centre.
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 22px ${FONT}`;
  ctx.fillText(`WAVE ${Math.max(1, state.wave)} / ${FINAL_WAVE}`, 640, 66);
  ctx.font = `bold 17px ${FONT}`;
  ctx.fillStyle = PALETTE.gold;
  ctx.fillText(`SCORE ${state.score}`, 640, 92);
  // Kills and best, top right.
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 15px ${FONT}`;
  ctx.fillText(`SLAIN ${state.kills}`, 1236, 62);
  ctx.fillStyle = PALETTE.dim;
  ctx.font = `13px ${FONT}`;
  ctx.fillText(`BEST ${state.best}`, 1236, 84);
  // Boss health bar.
  if (state.boss) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffb3a0';
    ctx.font = `bold 15px ${FONT}`;
    ctx.fillText(state.boss.name.toUpperCase(), 640, 128);
    bar(ctx, 440, 136, 400, 12, state.boss.hp / state.boss.maxHp, PALETTE.boss, '#3a2030');
  }
  // Wave banner, centre screen.
  if (state.bannerTimer > 0 && state.banner) {
    ctx.globalAlpha = Math.min(1, state.bannerTimer);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.lantern;
    ctx.font = `bold 44px ${FONT}`;
    ctx.fillText(state.banner, 640, 330);
    ctx.globalAlpha = 1;
  }
  // Control hints, bottom edge.
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(168, 158, 194, 0.75)';
  ctx.font = `13px ${FONT}`;
  ctx.fillText('WASD move  ·  Mouse aim  ·  Hold click / Space to fire  ·  P pause  ·  M mute', 640, 694);
}

function dimScreen(ctx) {
  ctx.fillStyle = 'rgba(8, 5, 16, 0.72)';
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);
}

function statLine(ctx, label, value, y) {
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.dim;
  ctx.font = `17px ${FONT}`;
  ctx.fillText(label, 560, y);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 20px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(String(value), 720, y);
}

function drawTitle(ctx, state, time) {
  dimScreen(ctx);
  ctx.textAlign = 'center';
  const bob = Math.sin(time * 2) * 6;
  ctx.fillStyle = PALETTE.lantern;
  ctx.font = `bold 76px ${FONT}`;
  ctx.fillText('EMBERWARD', 640, 250 + bob);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `28px ${FONT}`;
  ctx.fillText('Hold the Last Lantern', 640, 300 + bob);
  ctx.fillStyle = PALETTE.dim;
  ctx.font = `17px ${FONT}`;
  ctx.fillText('The dark has swallowed the valley. Survive 15 waves of ember-fiends', 640, 360);
  ctx.fillText('and slay the Cinder Warden to win.', 640, 386);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 19px ${FONT}`;
  ctx.fillText('WASD / Arrows — move    ·    Mouse — aim    ·    Hold click / Space — fire', 640, 448);
  ctx.fillText('P — pause    ·    M — mute    ·    1 / 2 / 3 or click — choose a boon', 640, 478);
  ctx.fillStyle = state.best > 0 ? PALETTE.gold : PALETTE.dim;
  ctx.font = `bold 18px ${FONT}`;
  ctx.fillText(state.best > 0 ? `BEST SCORE  ${state.best}` : 'No runs yet — light the lantern!', 640, 528);
  ctx.fillStyle = Math.floor(time * 2) % 2 === 0 ? PALETTE.lantern : PALETTE.text;
  ctx.font = `bold 24px ${FONT}`;
  ctx.fillText('PRESS SPACE OR CLICK TO BEGIN', 640, 590);
}

function drawLevelUp(ctx, state) {
  dimScreen(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.lantern;
  ctx.font = `bold 40px ${FONT}`;
  ctx.fillText('LEVEL UP!', 640, 130);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `20px ${FONT}`;
  ctx.fillText(`You reached level ${state.player.level} — choose a boon`, 640, 168);
  const choices = state.levelChoices || [];
  state.cardRects = [];
  const w = 300;
  const h = 230;
  const y = 230;
  choices.forEach((c, i) => {
    const x = 640 + (i - 1) * 330 - w / 2;
    state.cardRects.push({ x, y, w, h, index: i });
    ctx.fillStyle = PALETTE.card;
    roundRect(ctx, x, y, w, h, 14);
    ctx.fill();
    ctx.strokeStyle = PALETTE.cardEdge;
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, w, h, 14);
    ctx.stroke();
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 17px ${FONT}`;
    ctx.fillText(`[ ${i + 1} ]`, x + w / 2, y + 36);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 23px ${FONT}`;
    const name = c.name;
    ctx.fillText(name.length > 16 ? name.slice(0, 16) : name, x + w / 2, y + 78);
    ctx.fillStyle = PALETTE.dim;
    ctx.font = `16px ${FONT}`;
    wrapText(ctx, c.desc, x + w / 2, y + 118, w - 40, 24);
    ctx.fillStyle = PALETTE.lantern;
    ctx.font = `15px ${FONT}`;
    ctx.fillText('Click or press ' + (i + 1), x + w / 2, y + h - 22);
  });
}

function wrapText(ctx, text, cx, y, maxW, lineH) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, cx, y + i * lineH));
}

function drawPaused(ctx) {
  dimScreen(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;
  ctx.font = `bold 52px ${FONT}`;
  ctx.fillText('PAUSED', 640, 330);
  ctx.fillStyle = PALETTE.dim;
  ctx.font = `19px ${FONT}`;
  ctx.fillText('Press P to resume', 640, 380);
}

function drawOver(ctx, state) {
  dimScreen(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff5a5a';
  ctx.font = `bold 60px ${FONT}`;
  ctx.fillText('THE LIGHT FADES', 640, 210);
  ctx.fillStyle = PALETTE.dim;
  ctx.font = `19px ${FONT}`;
  ctx.fillText(`The dark takes the lantern on wave ${Math.max(1, state.wave)}.`, 640, 256);
  statLine(ctx, 'SCORE', state.score, 330);
  statLine(ctx, 'WAVE REACHED', state.wave, 366);
  statLine(ctx, 'FIENDS SLAIN', state.kills, 402);
  statLine(ctx, 'LEVEL', state.player.level, 438);
  statLine(ctx, 'TIME', `${Math.floor(state.time / 60)}:${String(Math.floor(state.time % 60)).padStart(2, '0')}`, 474);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = `bold 18px ${FONT}`;
  ctx.fillText(`BEST  ${state.best}`, 640, 522);
  ctx.fillStyle = PALETTE.lantern;
  ctx.font = `bold 23px ${FONT}`;
  ctx.fillText('PRESS SPACE TO TRY AGAIN', 640, 580);
}

function drawVictory(ctx, state) {
  dimScreen(ctx);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = `bold 60px ${FONT}`;
  ctx.fillText('THE VALLEY BURNS BRIGHT', 640, 190);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `22px ${FONT}`;
  ctx.fillText('The Cinder Warden is slain. The last lantern lights the valley again.', 640, 240);
  statLine(ctx, 'SCORE', state.score, 320);
  statLine(ctx, 'FIENDS SLAIN', state.kills, 356);
  statLine(ctx, 'LEVEL', state.player.level, 392);
  statLine(ctx, 'TIME', `${Math.floor(state.time / 60)}:${String(Math.floor(state.time % 60)).padStart(2, '0')}`, 428);
  statLine(ctx, 'WAVES CLEARED', `${FINAL_WAVE} / ${FINAL_WAVE}`, 464);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = `bold 18px ${FONT}`;
  ctx.fillText(`BEST  ${state.best}`, 640, 512);
  ctx.fillStyle = PALETTE.lantern;
  ctx.font = `bold 23px ${FONT}`;
  ctx.fillText('PRESS SPACE TO PLAY AGAIN', 640, 570);
}

/** Paint one frame for the given screen. */
export function draw(ctx, state, screen, particles, time) {
  ctx.save();
  const shake = particles.offset();
  ctx.translate(shake.x, shake.y);
  drawArena(ctx, state, time);
  drawGems(ctx, state);
  for (const e of state.enemies) drawEnemy(ctx, e, time);
  if (state.boss) drawBoss(ctx, state.boss, time);
  // The bearer is only visible while the run is live; the end screens show
  // stats, not a body (on game over the lantern is out, on victory the
  // valley itself is the picture).
  if (screen === 'playing' || screen === 'levelup' || screen === 'paused') drawPlayer(ctx, state.player, time);
  drawBolts(ctx, state);
  particles.draw(ctx);
  ctx.restore();
  if (screen === 'title') {
    drawTitle(ctx, state, time);
    return;
  }
  drawHUD(ctx, state);
  if (screen === 'levelup') drawLevelUp(ctx, state);
  else if (screen === 'paused') drawPaused(ctx);
  else if (screen === 'over') drawOver(ctx, state);
  else if (screen === 'victory') drawVictory(ctx, state);
}
