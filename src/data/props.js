// Horror props, drawn procedurally on canvas (no external assets, all ₹0).
// Each entry draws centered at (0,0) inside a unit-ish bounding box; Stage
// applies translate/rotate/scale before calling draw().

function path(ctx, points, close = true) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  if (close) ctx.closePath();
}

export const PROP_TYPES = {
  bloodSplatter: {
    label: 'Blood Splatter',
    category: 'effects',
    size: 70,
    draw(ctx) {
      ctx.fillStyle = '#8a0303';
      const blobs = [[0, 0, 22], [18, -10, 10], [-16, 8, 12], [10, 16, 8], [-20, -14, 7], [24, 6, 6]];
      blobs.forEach(([x, y, r]) => {
        ctx.beginPath();
        ctx.ellipse(x, y, r, r * 0.8, 0.3, 0, Math.PI * 2);
        ctx.fill();
      });
    },
  },
  fog: {
    label: 'Fog / Mist',
    category: 'effects',
    size: 140,
    draw(ctx) {
      ctx.fillStyle = 'rgba(210,220,230,0.25)';
      for (let i = 0; i < 5; i += 1) {
        ctx.beginPath();
        ctx.ellipse(-50 + i * 26, Math.sin(i) * 10, 40, 18, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  },
  lantern: {
    label: 'Lantern',
    category: 'objects',
    size: 40,
    draw(ctx) {
      const grad = ctx.createRadialGradient(0, -2, 2, 0, -2, 30);
      grad.addColorStop(0, 'rgba(255,190,80,0.9)');
      grad.addColorStop(1, 'rgba(255,190,80,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, -2, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2b2016';
      ctx.fillRect(-8, -16, 16, 20);
      ctx.fillStyle = '#ffb347';
      ctx.fillRect(-5, -13, 10, 14);
      ctx.strokeStyle = '#1a130d';
      ctx.lineWidth = 2;
      ctx.strokeRect(-8, -16, 16, 20);
      ctx.beginPath();
      ctx.moveTo(-6, -16);
      ctx.lineTo(0, -24);
      ctx.lineTo(6, -16);
      ctx.stroke();
    },
  },
  axe: {
    label: 'Axe',
    category: 'weapons',
    size: 60,
    draw(ctx) {
      ctx.strokeStyle = '#5a3a20';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(0, 26);
      ctx.lineTo(0, -24);
      ctx.stroke();
      ctx.fillStyle = '#9aa4ad';
      path(ctx, [[0, -30], [26, -22], [22, -6], [0, -12]]);
      ctx.fill();
      ctx.strokeStyle = '#4a5158';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    },
  },
  tombstone: {
    label: 'Tombstone',
    category: 'environment',
    size: 70,
    draw(ctx) {
      ctx.fillStyle = '#7d7d80';
      ctx.beginPath();
      ctx.moveTo(-22, 30);
      ctx.lineTo(-22, -10);
      ctx.quadraticCurveTo(-22, -30, 0, -30);
      ctx.quadraticCurveTo(22, -30, 22, -10);
      ctx.lineTo(22, 30);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#4d4d50';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = '#5c5c5f';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-10, -6);
      ctx.lineTo(10, -6);
      ctx.moveTo(0, -16);
      ctx.lineTo(0, 4);
      ctx.stroke();
    },
  },
  candle: {
    label: 'Candle',
    category: 'objects',
    size: 30,
    draw(ctx) {
      ctx.fillStyle = '#e9e2c8';
      ctx.fillRect(-5, -4, 10, 26);
      const grad = ctx.createRadialGradient(0, -14, 1, 0, -14, 14);
      grad.addColorStop(0, 'rgba(255,200,90,0.95)');
      grad.addColorStop(1, 'rgba(255,140,40,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, -14, 12, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffcf5c';
      ctx.beginPath();
      ctx.ellipse(0, -8, 3, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  spiderweb: {
    label: 'Spiderweb',
    category: 'environment',
    size: 80,
    draw(ctx) {
      ctx.strokeStyle = 'rgba(220,220,230,0.65)';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * 36, Math.sin(a) * 36);
        ctx.stroke();
      }
      for (let r = 10; r <= 32; r += 8) {
        ctx.beginPath();
        for (let i = 0; i <= 8; i += 1) {
          const a = (i / 8) * Math.PI * 2;
          const x = Math.cos(a) * r;
          const y = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    },
  },
  skull: {
    label: 'Skull',
    category: 'objects',
    size: 44,
    draw(ctx) {
      ctx.fillStyle = '#eee6d3';
      ctx.beginPath();
      ctx.ellipse(0, -4, 16, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-10, 4, 20, 10);
      ctx.fillStyle = '#161318';
      ctx.beginPath();
      ctx.ellipse(-6, -4, 4, 5, 0, 0, Math.PI * 2);
      ctx.ellipse(6, -4, 4, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-1, 2, 2, 5);
      for (let i = -8; i <= 8; i += 4) {
        ctx.fillRect(i, 10, 2, 5);
      }
    },
  },
  coffin: {
    label: 'Coffin',
    category: 'environment',
    size: 90,
    draw(ctx) {
      ctx.fillStyle = '#3a2418';
      path(ctx, [[-14, -40], [14, -40], [20, -20], [20, 40], [-20, 40], [-20, -20]]);
      ctx.fill();
      ctx.strokeStyle = '#1c1109';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.strokeStyle = '#5a3a24';
      ctx.beginPath();
      ctx.moveTo(-16, -18);
      ctx.lineTo(16, -18);
      ctx.moveTo(-18, 20);
      ctx.lineTo(18, 20);
      ctx.stroke();
    },
  },
  bat: {
    label: 'Bat',
    category: 'objects',
    size: 46,
    draw(ctx) {
      ctx.fillStyle = '#181018';
      path(ctx, [[0, -2], [-24, -14], [-10, 0], [-22, 6], [0, 4], [22, 6], [10, 0], [24, -14]]);
      ctx.fill();
      ctx.fillStyle = '#e63946';
      ctx.beginPath();
      ctx.arc(-3, -3, 1.6, 0, Math.PI * 2);
      ctx.arc(3, -3, 1.6, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  fullMoon: {
    label: 'Full Moon',
    category: 'environment',
    size: 90,
    draw(ctx) {
      ctx.fillStyle = '#eef0e6';
      ctx.beginPath();
      ctx.arc(0, 0, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(190,195,180,0.5)';
      ctx.beginPath();
      ctx.arc(-8, -6, 6, 0, Math.PI * 2);
      ctx.arc(10, 8, 8, 0, Math.PI * 2);
      ctx.arc(4, -12, 4, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  knife: {
    label: 'Knife',
    category: 'weapons',
    size: 50,
    draw(ctx) {
      ctx.fillStyle = '#c7ced4';
      path(ctx, [[0, -26], [5, -6], [4, 10], [-4, 10], [-5, -6]]);
      ctx.fill();
      ctx.fillStyle = '#3a2418';
      ctx.fillRect(-4, 10, 8, 16);
    },
  },
  brokenWindow: {
    label: 'Broken Window',
    category: 'objects',
    size: 80,
    draw(ctx) {
      ctx.fillStyle = 'rgba(180,205,215,0.15)';
      ctx.fillRect(-30, -35, 60, 70);
      ctx.strokeStyle = '#3a2418';
      ctx.lineWidth = 5;
      ctx.strokeRect(-30, -35, 60, 70);
      ctx.beginPath();
      ctx.moveTo(0, -35);
      ctx.lineTo(0, 35);
      ctx.moveTo(-30, 0);
      ctx.lineTo(30, 0);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(225,235,245,0.85)';
      ctx.lineWidth = 1.4;
      path(ctx, [[-5, -10], [10, 5], [2, 20], [15, 30]], false);
      ctx.stroke();
      path(ctx, [[10, 5], [-15, 15]], false);
      ctx.stroke();
      path(ctx, [[2, 20], [-10, 28]], false);
      ctx.stroke();
      ctx.fillStyle = '#0a0508';
      path(ctx, [[12, -5], [24, -20], [26, -2]]);
      ctx.fill();
    },
  },
  hangingChains: {
    label: 'Hanging Chains',
    category: 'environment',
    size: 70,
    draw(ctx) {
      ctx.strokeStyle = '#6b6b6b';
      ctx.lineWidth = 3;
      for (let i = 0; i < 6; i += 1) {
        const y = -35 + i * 13;
        ctx.beginPath();
        ctx.ellipse(0, y, i % 2 === 0 ? 6 : 9, i % 2 === 0 ? 9 : 6, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    },
  },
  ghostlyAura: {
    label: 'Ghostly Aura',
    category: 'environment',
    size: 100,
    draw(ctx) {
      const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, 46);
      grad.addColorStop(0, 'rgba(180,255,220,0.55)');
      grad.addColorStop(0.6, 'rgba(120,220,255,0.25)');
      grad.addColorStop(1, 'rgba(120,220,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, 46, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(200,255,240,0.5)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.arc(0, 0, 18 + i * 9, 0.3 + i, 2.5 + i);
        ctx.stroke();
      }
    },
  },
};

export const PROP_CATEGORIES = ['effects', 'weapons', 'objects', 'environment'];

export function getPropsByCategory(category) {
  return Object.entries(PROP_TYPES)
    .filter(([, p]) => p.category === category)
    .map(([id, p]) => ({ id, ...p }));
}
