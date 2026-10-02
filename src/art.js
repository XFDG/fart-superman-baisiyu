// Original, resolution-independent comic artwork. No external image assets.
const INK = '#443747';
const TAU = Math.PI * 2;

function rounded(ctx, x, y, w, h, r = 12) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function oval(ctx, x, y, rx, ry, fill, stroke = null, line = 2) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = line;
    ctx.stroke();
  }
}

function path(ctx, points, fill, stroke = INK, line = 2.5) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = line;
    ctx.stroke();
  }
}

function cloud(ctx, x, y, scale, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-52, 14);
  ctx.bezierCurveTo(-76, 13, -72, -10, -52, -12);
  ctx.bezierCurveTo(-52, -39, -17, -44, -5, -23);
  ctx.bezierCurveTo(11, -52, 49, -41, 48, -17);
  ctx.bezierCurveTo(76, -24, 85, 12, 62, 16);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-47, 22);
  ctx.bezierCurveTo(-16, 29, 21, 29, 53, 22);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

function sparkle(ctx, x, y, size, color) {
  path(ctx, [[x, y - size], [x + size * .27, y - size * .27], [x + size, y],
    [x + size * .27, y + size * .27], [x, y + size],
    [x - size * .27, y + size * .27], [x - size, y], [x - size * .27, y - size * .27]], color, null);
}

export function drawBackdrop(ctx, { width, height, camera = 0, time = 0, zone = 0 }) {
  ctx.save();
  const cam = typeof camera === 'number' ? camera : (camera.x || 0);
  const region = Math.max(0, Math.min(2, Math.floor(zone)));
  const palette = [
    { sky: ['#fff3d5', '#fff4de', '#e3f2da'], sun: ['#ffe4a7', '#ffd47c'],
      clouds: ['#d7ebd7', '#f6d9dc'], hills: ['#e1eaca', '#cbe0c1'],
      rock: '#d5b8b2', grass: '#b6d3b2', tree: '#adcca6', breeze: '#d7dcc1' },
    { sky: ['#f5e4f4', '#fff0ee', '#e9def3'], sun: ['#ffe4c8', '#ffdb9e'],
      clouds: ['#e5d8ef', '#f4cdda'], hills: ['#e1cfe6', '#cbbbdc'],
      rock: '#d9bfd2', grass: '#c6bddd', tree: '#bba7d5', breeze: '#dac5de' },
    { sky: ['#dbe9df', '#edf0dc', '#cedfd3'], sun: ['#e6e3b1', '#e8d68c'],
      clouds: ['#c3d9c8', '#d8cee1'], hills: ['#b9ccbf', '#9cbfa7'],
      rock: '#b6a8bd', grass: '#9cbba7', tree: '#8caf9a', breeze: '#b1c4b7' },
  ][region];
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, palette.sky[0]);
  sky.addColorStop(.58, palette.sky[1]);
  sky.addColorStop(1, palette.sky[2]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  // A sun with a smile, kept softly behind the action.
  const sunX = width * .81 - (cam * .022 % (width * .18));
  const sunY = height * .2;
  oval(ctx, sunX, sunY, 60, 60, palette.sun[0]);
  oval(ctx, sunX, sunY, 43, 43, palette.sun[1]);
  ctx.strokeStyle = '#d59662';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const a = i * TAU / 8 + .1;
    ctx.beginPath();
    ctx.moveTo(sunX + Math.cos(a) * 69, sunY + Math.sin(a) * 69);
    ctx.lineTo(sunX + Math.cos(a) * 75, sunY + Math.sin(a) * 75);
    ctx.stroke();
  }
  oval(ctx, sunX - 12, sunY - 1, 2.1, 3.6, '#c6935d');
  oval(ctx, sunX + 12, sunY - 1, 2.1, 3.6, '#c6935d');
  ctx.beginPath();
  ctx.arc(sunX, sunY + 6, 9, .18, Math.PI - .18);
  ctx.stroke();

  // Layered cotton-candy clouds wrap continuously as the camera moves.
  const span = width + 220;
  for (let i = 0; i < 8; i++) {
    const baseX = i * 197 + 33;
    const x = ((baseX - cam * (.1 + i % 2 * .055) + time * (i % 2 ? 2 : -1.5)) % span + span) % span - 110;
    const y = height * (.16 + (i * 41 % 150) / 540);
    cloud(ctx, x, y, .55 + (i % 3) * .16, palette.clouds[i % 2]);
  }

  if (region === 1) {
    // A few distant perfume sparkles give the cloud valley a dreamy feel.
    ctx.globalAlpha = .5;
    for (let i = 0; i < 7; i++) {
      const x = ((i * 181 + 80 - cam * .12) % span + span) % span - 110;
      const y = height * (.26 + (i % 3) * .095);
      sparkle(ctx, x, y, 3.5 + Math.sin(time * 1.7 + i) * .8, '#c7a9cc');
    }
    ctx.globalAlpha = 1;
  }
  if (region === 2) {
    // A playful, hazy castle behind the hills announces the stink kingdom.
    ctx.save();
    ctx.translate(width * .71 - (cam * .045 % (width * .18)), height * .88);
    const castleScale = height / 540;
    ctx.scale(castleScale, castleScale);
    ctx.globalAlpha = .55;
    ctx.fillStyle = '#aaa6bb';
    rounded(ctx, -77, -80, 154, 87, 8);
    ctx.fill();
    for (const side of [-1, 1]) {
      const x = side * 75 - 21;
      rounded(ctx, x, -108, 42, 117, 5);
      ctx.fill();
      path(ctx, [[x - 4, -106], [x + 21, -139], [x + 46, -106]], '#9c98b1', null);
      rounded(ctx, x + 15, -94, 12, 20, 6);
      ctx.fillStyle = '#dbe4d8';
      ctx.fill();
      ctx.fillStyle = '#aaa6bb';
    }
    path(ctx, [[-31, 4], [-31, -140], [-23, -140], [-23, -150], [-11, -150],
      [-11, -140], [-6, -140], [-6, -152], [6, -152], [6, -140], [11, -140],
      [11, -150], [23, -150], [23, -140], [31, -140], [31, 4]], '#a39db3', null);
    ctx.fillStyle = '#dbe4d8';
    rounded(ctx, -7, -123, 14, 23, 7);
    ctx.fill();
    rounded(ctx, -15, -44, 30, 49, 15);
    ctx.fill();
    ctx.strokeStyle = '#a39db3';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, -153);
    ctx.lineTo(0, -183);
    ctx.stroke();
    path(ctx, [[1, -182], [23, -177 + Math.sin(time * 2) * 2], [1, -168]], '#aa91b2', null);
    ctx.restore();
  }

  // Soft distant hills and floating islands lend depth without clutter.
  ctx.fillStyle = palette.hills[0];
  ctx.beginPath();
  ctx.moveTo(0, height);
  for (let i = -1; i < 8; i++) {
    const x = i * 210 - cam * .08 % 210;
    ctx.bezierCurveTo(x + 35, height * .83, x + 75, height * .61, x + 155, height * .84);
  }
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = palette.hills[1];
  ctx.beginPath();
  ctx.moveTo(0, height);
  for (let i = -1; i < 10; i++) {
    const x = i * 165 - cam * .14 % 165;
    ctx.bezierCurveTo(x + 20, height * .97, x + 72, height * .77, x + 130, height * .94);
  }
  ctx.lineTo(width, height);
  ctx.closePath();
  ctx.fill();

  for (let i = 0; i < 3; i++) {
    const spanX = width + 260;
    const x = ((i * 420 + 90 - cam * .23) % spanX + spanX) % spanX - 130;
    const y = height * (.58 + i * .065) + Math.sin(time * .4 + i) * 3;
    ctx.globalAlpha = .62;
    path(ctx, [[x - 54, y], [x + 61, y], [x + 41, y + 16], [x + 7, y + 35], [x - 33, y + 23]], palette.rock, null);
    oval(ctx, x + 3, y, 65, 9, palette.grass);
    oval(ctx, x + 25, y - 12, 12, 15, palette.tree);
    oval(ctx, x + 11, y - 6, 13, 10, palette.tree);
    ctx.globalAlpha = 1;
  }

  // Tiny breeze lines.
  ctx.strokeStyle = palette.breeze;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const x = ((i * 251 + 72 - cam * .17) % (width + 100) + width + 100) % (width + 100) - 50;
    const y = height * (.49 + (i % 2) * .095);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 20, y);
    ctx.moveTo(x + 26, y);
    ctx.lineTo(x + 34, y);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawPlatform(ctx, p, time = 0) {
  ctx.save();
  const { x, y, w, h = 44, kind = 'float' } = p;
  const depth = Math.max(22, h);
  const ground = kind === 'ground';
  // Hand-cut rosy stone beneath a velvety lawn.
  ctx.fillStyle = '#bea094';
  rounded(ctx, x + 3, y + 7, w - 6, depth, 13);
  ctx.fill();
  const rock = ctx.createLinearGradient(0, y, 0, y + depth);
  rock.addColorStop(0, '#d9b59d');
  rock.addColorStop(1, '#bf9385');
  rounded(ctx, x, y + 4, w, depth, 12);
  ctx.fillStyle = rock;
  ctx.fill();
  ctx.strokeStyle = '#796756';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.fillStyle = '#edd0ad';
  for (let i = 0; i < Math.floor(w / 47); i++) {
    const px = x + 19 + i * 47;
    const py = y + 24 + (i % 3) * 7;
    rounded(ctx, px, py, 14 + (i % 2) * 8, 5, 2);
    ctx.fill();
  }
  if (!ground) {
    path(ctx, [[x + w * .29, y + depth + 1], [x + w * .4, y + depth + 11], [x + w * .49, y + depth + 1]], '#bc9386', null);
    path(ctx, [[x + w * .66, y + depth + 1], [x + w * .72, y + depth + 7], [x + w * .79, y + depth + 1]], '#bc9386', null);
  }
  rounded(ctx, x - 2, y - 3, w + 4, 15, 7);
  ctx.fillStyle = '#84b885';
  ctx.fill();
  ctx.strokeStyle = '#547c5a';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.strokeStyle = '#bfe09a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 7, y + 1);
  ctx.lineTo(x + w - 7, y + 1);
  ctx.stroke();
  // Grass and daisies are placed deterministically so they do not shimmer.
  ctx.strokeStyle = '#5f935f';
  ctx.lineWidth = 2;
  for (let i = 0; i < Math.floor(w / 55); i++) {
    const px = x + 27 + i * 55;
    const sway = Math.sin(time * 1.6 + px * .03) * 1.2;
    ctx.beginPath();
    ctx.moveTo(px - 5, y - 3);
    ctx.lineTo(px - 8 + sway, y - 10);
    ctx.moveTo(px, y - 3);
    ctx.lineTo(px + sway, y - 13);
    ctx.moveTo(px + 4, y - 3);
    ctx.lineTo(px + 8 + sway, y - 8);
    ctx.stroke();
    if (i % 3 === 1) {
      for (let j = 0; j < 5; j++) oval(ctx, px + Math.cos(j * TAU / 5) * 3, y - 15 + Math.sin(j * TAU / 5) * 3, 2.6, 2.6, '#fff7e2');
      oval(ctx, px, y - 15, 2, 2, '#f5c46b');
    }
  }
  ctx.restore();
}

export function drawHero(ctx, p, time = 0) {
  ctx.save();
  const w = p.w || 36, h = p.h || 52;
  ctx.translate(p.x + w / 2, p.y + h);
  ctx.scale((p.dir || 1) * w / 36, h / 52);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (p.hurt > 0 && Math.floor(time * 18) % 2 === 0) ctx.globalAlpha = .48;
  const running = p.grounded && Math.abs(p.vx || 0) > 15;
  const walk = running ? Math.sin(time * 20) * 3.5 : 0;
  const bounce = running ? Math.abs(Math.sin(time * 20)) * 1.4 : Math.sin(time * 3) * .6;
  ctx.translate(0, -bounce);

  // A cape with an animated scalloped silhouette.
  ctx.beginPath();
  ctx.moveTo(-6, -35);
  ctx.bezierCurveTo(-20, -28, -24 - Math.sin(time * 10) * 3, -18, -25, -9);
  ctx.lineTo(-16, -13);
  ctx.lineTo(-9, -9);
  ctx.quadraticCurveTo(-10, -23, 2, -32);
  ctx.closePath();
  ctx.fillStyle = '#ed6b67';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = '#ffc0a4';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-9, -31);
  ctx.quadraticCurveTo(-16, -25, -19, -17);
  ctx.stroke();

  // Blue shorts, little sneakers, and a chunky yellow supersuit.
  rounded(ctx, -10, -17, 21, 12, 4);
  ctx.fillStyle = '#527f9f';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  rounded(ctx, -11 - walk * .3, -8 + walk, 12, 8, 3);
  ctx.fillStyle = '#fff2db';
  ctx.fill();
  ctx.stroke();
  rounded(ctx, 2 + walk * .3, -8 - walk, 13, 8, 3);
  ctx.fillStyle = '#ef6b65';
  ctx.fill();
  ctx.stroke();
  rounded(ctx, -12, -34, 25, 22, 8);
  ctx.fillStyle = '#f8cf60';
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#ffe998';
  rounded(ctx, -8, -31, 9, 14, 4);
  ctx.fill();
  // A puff emblem on the chest.
  oval(ctx, 3, -23, 5.3, 5, '#fff4d7');
  oval(ctx, 0, -24, 3, 3.2, '#fff4d7');
  oval(ctx, 5, -25, 3.1, 3, '#fff4d7');
  ctx.strokeStyle = '#c29642';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, -20);
  ctx.lineTo(6, -20);
  ctx.stroke();

  // Forward arm becomes an enthusiastic fist while airborne.
  const armY = p.grounded ? -23 + walk * .35 : -31;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6.5;
  ctx.beginPath();
  ctx.moveTo(10, -29);
  ctx.lineTo(16, armY);
  ctx.stroke();
  ctx.strokeStyle = '#f8cf60';
  ctx.lineWidth = 4;
  ctx.stroke();
  oval(ctx, 17, armY, 4, 4.3, '#ffe3bd', INK, 1.6);

  // A big face and slouchy cobalt cap: readable even on a phone.
  oval(ctx, 1, -41, 12, 11, '#ffe3bd', INK, 2);
  oval(ctx, -9, -40, 3.4, 4, '#f7cca8', INK, 1.5);
  path(ctx, [[-10, -44], [-9, -51], [-2, -54], [6, -51], [10, -47], [8, -44], [4, -48], [1, -44], [-3, -48]], '#443747', null);
  ctx.beginPath();
  ctx.moveTo(-11, -49);
  ctx.bezierCurveTo(-12, -60, 8, -61, 11, -51);
  ctx.lineTo(10, -48);
  ctx.closePath();
  ctx.fillStyle = '#68a3c1';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.stroke();
  rounded(ctx, -10, -51, 26, 5, 2.5);
  ctx.fillStyle = '#6cacc8';
  ctx.fill();
  ctx.stroke();
  oval(ctx, 5, -41, 2, 2.7, INK);
  oval(ctx, 5.6, -42, .65, .8, '#fff9e9');
  oval(ctx, 10, -38, 2.7, 1.7, '#efac98');
  ctx.beginPath();
  ctx.arc(5.5, -36.5, 3.3, .08, Math.PI * .78);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();
}

function eyes(ctx, y, span, scale = 1, angry = false) {
  for (const side of [-1, 1]) {
    oval(ctx, side * span, y, 5.2 * scale, 6.8 * scale, '#fff7e7', INK, 1.5 * scale);
    oval(ctx, side * span + 1.1 * scale, y + .7 * scale, 2.4 * scale, 3.7 * scale, INK);
    if (angry) {
      ctx.beginPath();
      ctx.moveTo(side * span - 5 * scale, y - (side === 1 ? 4 : 8) * scale);
      ctx.lineTo(side * span + 5 * scale, y - (side === 1 ? 8 : 4) * scale);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.5 * scale;
      ctx.stroke();
    }
  }
}

export function drawEnemy(ctx, e, time = 0) {
  ctx.save();
  const w = e.w || 38, h = e.h || 32;
  ctx.translate(e.x + w / 2, e.y + h);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  if (e.flash > 0) ctx.globalAlpha = .55;
  const bob = Math.sin(time * 4 + e.x * .03);
  if (e.type === 'boss') {
    ctx.scale(w / 82, h / 90);
    oval(ctx, 0, -4, 34, 5, '#49354622');
    oval(ctx, -23, -6, 15, 7, '#785b91', INK, 2.5);
    oval(ctx, 23, -6, 15, 7, '#785b91', INK, 2.5);
    ctx.translate(0, bob * 1.5);
    oval(ctx, 0, -38, 37, 40, e.slow > 0 ? '#9bc9b8' : '#b598bf', INK, 3);
    oval(ctx, -9, -45, 21, 29, '#c8afd0');
    // Crown is a dented saucepan, since this king takes himself too seriously.
    path(ctx, [[-25, -72], [-30, -87], [-14, -79], [-3, -94], [8, -79], [25, -87], [24, -70]], '#f5cc65', INK, 2.8);
    rounded(ctx, -25, -75, 51, 10, 4);
    ctx.fillStyle = '#e9b655';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.stroke();
    oval(ctx, -1, -75, 4, 4, '#ef857c', INK, 1.3);
    eyes(ctx, -47, 12, 1.35, true);
    oval(ctx, -22, -35, 6, 3, '#d790a4');
    oval(ctx, 22, -35, 6, 3, '#d790a4');
    rounded(ctx, -12, -29, 24, 12, 6);
    ctx.fillStyle = INK;
    ctx.fill();
    rounded(ctx, -8, -29, 6, 5, 1);
    ctx.fillStyle = '#fff5df';
    ctx.fill();
    rounded(ctx, 3, -29, 6, 5, 1);
    ctx.fill();
    // Two floating stink curls flank the crown.
    ctx.strokeStyle = '#98b780';
    ctx.lineWidth = 3;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 39, -60);
      ctx.bezierCurveTo(side * 53, -67, side * 34, -75, side * 43, -83);
      ctx.stroke();
    }
  } else if (e.type === 'fly') {
    ctx.scale(w / 40, h / 34);
    const flap = Math.sin(time * 40) * 5;
    ctx.save();
    ctx.translate(-12, -24);
    ctx.rotate(-.5 + flap * .06);
    oval(ctx, 0, -7, 7, 13, '#fff8e0cc', '#809d87', 1.5);
    ctx.restore();
    ctx.save();
    ctx.translate(12, -24);
    ctx.rotate(.5 - flap * .06);
    oval(ctx, 0, -7, 7, 13, '#fff8e0cc', '#809d87', 1.5);
    ctx.restore();
    oval(ctx, 0, -16, 18, 15, e.slow > 0 ? '#aad7c4' : '#bfd478', INK, 2);
    oval(ctx, -5, -21, 9, 6, '#dce89a');
    eyes(ctx, -17, 7, .82);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, -10, 3, .1, Math.PI - .1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-5, -30);
    ctx.lineTo(-8, -35);
    ctx.moveTo(5, -30);
    ctx.lineTo(8, -35);
    ctx.stroke();
    oval(ctx, -8, -35, 2, 2, '#edb080');
    oval(ctx, 8, -35, 2, 2, '#edb080');
  } else {
    ctx.scale(w / 40, h / 32);
    const squeeze = Math.sin(time * 5 + e.x) * 1.2;
    oval(ctx, 0, -2, 17, 3.5, '#4437471a');
    ctx.beginPath();
    ctx.moveTo(-19, -5);
    ctx.bezierCurveTo(-21, -13, -15, -30 - squeeze, 0, -30 - squeeze);
    ctx.bezierCurveTo(15, -30 - squeeze, 22, -13, 19, -5);
    ctx.quadraticCurveTo(15, 1, 10, -3);
    ctx.quadraticCurveTo(5, 1, 0, -2);
    ctx.quadraticCurveTo(-5, 1, -10, -3);
    ctx.quadraticCurveTo(-15, 1, -19, -5);
    ctx.closePath();
    ctx.fillStyle = e.slow > 0 ? '#b7d8c4' : '#cb9bb6';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.stroke();
    oval(ctx, -8, -24, 5.5, 2.8, '#eed0db');
    eyes(ctx, -16, 6, .8);
    oval(ctx, -13, -9, 3.5, 2, '#dc7f9e');
    oval(ctx, 13, -9, 3.5, 2, '#dc7f9e');
    ctx.beginPath();
    ctx.arc(0, -8, 3.1, .1, Math.PI - .1);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    path(ctx, [[-4, -29], [-7, -36], [0, -31], [6, -37], [5, -29]], '#9ab47b', INK, 1.5);
  }
  ctx.restore();
}

export function drawTrophy(ctx, { x, y, time = 0 }) {
  ctx.save();
  ctx.translate(x, y + Math.sin(time * 2.7) * 2);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const glow = ctx.createRadialGradient(0, -38, 10, 0, -38, 72);
  glow.addColorStop(0, '#ffe49a88');
  glow.addColorStop(1, '#ffe49a00');
  ctx.fillStyle = glow;
  ctx.fillRect(-76, -112, 152, 150);
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 24, -60);
    ctx.bezierCurveTo(side * 52, -66, side * 46, -30, side * 23, -34);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 9;
    ctx.stroke();
    ctx.strokeStyle = '#edb955';
    ctx.lineWidth = 5;
    ctx.stroke();
  }
  path(ctx, [[-9, -27], [9, -27], [6, -9], [18, -4], [-18, -4], [-6, -9]], '#e8b456', INK, 2.5);
  ctx.beginPath();
  ctx.moveTo(-28, -69);
  ctx.lineTo(28, -69);
  ctx.lineTo(23, -40);
  ctx.bezierCurveTo(19, -20, -19, -20, -23, -40);
  ctx.closePath();
  const gold = ctx.createLinearGradient(-28, 0, 28, 0);
  gold.addColorStop(0, '#e9b551');
  gold.addColorStop(.4, '#ffe49b');
  gold.addColorStop(1, '#e9b551');
  ctx.fillStyle = gold;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  rounded(ctx, -29, -72, 58, 7, 3);
  ctx.fillStyle = '#ffdf8a';
  ctx.fill();
  ctx.stroke();
  sparkle(ctx, 0, -48, 9, '#fff8d8');
  rounded(ctx, -28, -5, 56, 11, 4);
  ctx.fillStyle = '#527f7d';
  ctx.fill();
  ctx.stroke();
  // Broad warm plaque keeps the requested final prize legible.
  rounded(ctx, -43, 10, 86, 25, 9);
  ctx.fillStyle = '#fff8e2';
  ctx.fill();
  ctx.strokeStyle = '#b29461';
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.font = 'bold 16px "Noto Sans SC", "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#67513e';
  ctx.fillText('浩然杯', 0, 23);
  const pulse = .65 + Math.sin(time * 3) * .2;
  ctx.globalAlpha = pulse;
  sparkle(ctx, -44, -80, 6, '#eabb5b');
  sparkle(ctx, 46, -34, 5, '#eabb5b');
  sparkle(ctx, 28, -95, 4, '#eabb5b');
  ctx.restore();
}

export function drawPoop(ctx, p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle || 0);
  const r = p.r || 8;
  ctx.scale(r / 9, r / 9);
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-9, 4);
  ctx.bezierCurveTo(-11, -1, -6, -5, -3, -5);
  ctx.bezierCurveTo(-6, -9, 4, -8, 2, -13);
  ctx.bezierCurveTo(10, -10, 4, -6, 7, -3);
  ctx.bezierCurveTo(13, -1, 12, 6, 7, 7);
  ctx.lineTo(-6, 7);
  ctx.quadraticCurveTo(-10, 7, -9, 4);
  ctx.closePath();
  ctx.fillStyle = '#aa7653';
  ctx.fill();
  ctx.strokeStyle = '#634a3f';
  ctx.lineWidth = 1.7;
  ctx.stroke();
  ctx.strokeStyle = '#81583f';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-7, 1);
  ctx.quadraticCurveTo(0, 3, 7, 0);
  ctx.moveTo(-3, -4);
  ctx.quadraticCurveTo(1, -2, 5, -4);
  ctx.stroke();
  oval(ctx, -3, -2, 2.3, 1.1, '#d8ad7d');
  oval(ctx, -5, 4, 1.7, .9, '#d8ad7d');
  ctx.restore();
}

export function drawBean(ctx, { x, y, time = 0 }) {
  ctx.save();
  ctx.translate(x, y + Math.sin(time * 4 + x * .015) * 3);
  ctx.rotate(-.2 + Math.sin(time * 2 + x) * .08);
  const halo = ctx.createRadialGradient(0, 0, 2, 0, 0, 17);
  halo.addColorStop(0, '#f8d97d55');
  halo.addColorStop(1, '#f8d97d00');
  ctx.fillStyle = halo;
  ctx.fillRect(-18, -18, 36, 36);
  ctx.beginPath();
  ctx.moveTo(-8, -6);
  ctx.bezierCurveTo(-3, -14, 9, -11, 10, -3);
  ctx.bezierCurveTo(12, 6, 4, 12, -3, 9);
  ctx.bezierCurveTo(-10, 7, -12, 0, -8, -6);
  ctx.closePath();
  ctx.fillStyle = '#f7cd67';
  ctx.fill();
  ctx.strokeStyle = '#99724b';
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(1, -6);
  ctx.bezierCurveTo(-5, -1, 5, 1, 1, 7);
  ctx.strokeStyle = '#c99a48';
  ctx.lineWidth = 1.6;
  ctx.stroke();
  oval(ctx, -4, -5, 2.8, 1.5, '#ffefb5');
  ctx.restore();
}
