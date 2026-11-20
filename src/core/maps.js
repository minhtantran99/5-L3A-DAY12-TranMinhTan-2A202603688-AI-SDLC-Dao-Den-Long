function ringPoints(radius, count, startDeg = 0, cx = 0, cz = 0, y = 0) {
  const pts = [];
  for (let i = 0; i < count; i++) {
    const rad = ((startDeg + (i * 360) / count) * Math.PI) / 180;
    pts.push([
      Math.round((cx + Math.cos(rad) * radius) * 1000) / 1000,
      y,
      Math.round((cz + Math.sin(rad) * radius) * 1000) / 1000,
    ]);
  }
  return pts;
}

function degListPoints(radius, degs, y = 0) {
  return degs.map((deg) => {
    const rad = (deg * Math.PI) / 180;
    return [
      Math.round(Math.cos(rad) * radius * 1000) / 1000,
      y,
      Math.round(Math.sin(rad) * radius * 1000) / 1000,
    ];
  });
}

export const MAPS = {
  1: {
    night: 1,
    name: 'Đêm 1 — Đảo Bến',
    intro: 'Ông Đăng: "Sương đen đã phủ xuống Đảo Bến. Hãy thắp lại 5 Đèn Lồng Lớn trước bình minh, Mây nhé!"',
    durationS: 240,
    startPos: [0, 0, 0],
    shadeSpeed: 4.0,
    shadeMax: 6,
    shadeIntervalTicks: 480,
    windEnabled: false,
    driftersEnabled: false,
    lanterns: [
      { id: 'L1', pos: [0, 0, 25] },
      { id: 'L2', pos: [23.8, 0, 7.7] },
      { id: 'L3', pos: [14.7, 0, -20.2] },
      { id: 'L4', pos: [-14.7, 0, -20.2] },
      { id: 'L5', pos: [-23.8, 0, 7.7] },
    ],
    moteSpots: [...ringPoints(12, 8, 0), ...ringPoints(33, 16, 0)],
    shadeSpots: ringPoints(37, 12, 15),
    jumpPads: [],
    charms: [],
  },
  2: {
    night: 2,
    name: 'Đêm 2 — Đảo Cau',
    intro: 'Ông Đăng: "Đảo Cau chia làm hai bờ nối bằng cầu tre. Coi chừng Gió Lạc rình rập cướp ánh sáng!"',
    durationS: 270,
    startPos: [0, 0, 0],
    shadeSpeed: 4.0,
    shadeMax: 8,
    shadeIntervalTicks: 420,
    windEnabled: false,
    driftersEnabled: true,
    lanterns: [
      { id: 'L1', pos: [0, 0, 20] },
      { id: 'L2', pos: [17, 0, -10] },
      { id: 'L3', pos: [-17, 0, -10] },
      { id: 'L4', pos: [70, 0, 20] },
      { id: 'L5', pos: [87, 0, -10] },
      { id: 'L6', pos: [53, 0, -10] },
    ],
    moteSpots: [
      ...ringPoints(10, 4, 0, 0, 0),
      ...ringPoints(22, 8, 0, 0, 0),
      ...ringPoints(10, 4, 0, 70, 0),
      ...ringPoints(22, 8, 0, 70, 0),
    ],
    shadeSpots: [
      ...ringPoints(26, 8, 22.5, 0, 0),
      ...ringPoints(26, 8, 22.5, 70, 0),
    ],
    jumpPads: [
      { pos: [20, 0, 18], radius: 1.0, vy: 14.0, vh: 24.0, target: [70, 0, 0] },
      { pos: [50, 0, -18], radius: 1.0, vy: 14.0, vh: 24.0, target: [0, 0, 0] },
    ],
    charms: [{ id: 'C1', pos: [35, 0, 0] }],
  },
  3: {
    night: 3,
    name: 'Đêm 3 — Đảo Chuông',
    intro: 'Ông Đăng: "Đêm cuối trên Đảo Chuông ba tầng! Gió lớn và Bóng Mực mạnh hơn — hãy giữ vững ngọn lửa!"',
    durationS: 300,
    startPos: [0, 0, 10],
    shadeSpeed: 4.5,
    shadeMax: 10,
    shadeIntervalTicks: 360,
    windEnabled: true,
    driftersEnabled: true,
    lanterns: [
      { id: 'L1', pos: [0, 6, 6] },
      { id: 'L2', pos: [18, 3, 10] },
      { id: 'L3', pos: [-18, 3, 10] },
      { id: 'L4', pos: [35, 0, -10] },
      { id: 'L5', pos: [-35, 0, -10] },
      { id: 'L6', pos: [20, 0, -35] },
      { id: 'L7', pos: [-20, 0, -35] },
    ],
    moteSpots: [
      ...ringPoints(34, 18, 0, 0, 0, 0),
      ...degListPoints(18, [20, 40, 60, 80, 100, 120, 140, 160], 3),
      ...degListPoints(5, [45, 135, 225, 315], 6),
    ],
    shadeSpots: ringPoints(43, 16, 0, 0, 0, 0),
    jumpPads: [
      { pos: [0, 3, 13], radius: 1.0, vy: 12.0, vh: 8.0, dir: [0, -1] },
    ],
    charms: [
      { id: 'C1', pos: [30, 0, 25] },
      { id: 'C2', pos: [-30, 0, 25] },
    ],
    tower: { x: 0, z: 0, radius: 2.0, minY: 6.0, maxY: 14.0 },
  },
};

function rampHeight(x, z) {
  for (const deg of [30, 150]) {
    const rad = (deg * Math.PI) / 180;
    const ux = Math.cos(rad);
    const uz = Math.sin(rad);
    const along = x * ux + z * uz;
    const perp = Math.abs(-x * uz + z * ux);
    if (along >= 24 && along <= 30 && perp <= 1.5) {
      return 3 * ((30 - along) / 6);
    }
  }
  return null;
}

/**
 * Returns the highest walkable ground Y <= currentY + stepTolerance, or null if over void.
 */
export function getSupportY(night, x, z, currentY) {
  if (night === 1) {
    return Math.hypot(x, z) <= 40 ? 0 : null;
  }
  if (night === 2) {
    if (Math.hypot(x, z) <= 28) return 0;
    if (Math.hypot(x - 70, z) <= 28) return 0;
    if (x >= 26 && x <= 44 && z >= -2 && z <= 2) return 0;
    return null;
  }
  if (night === 3) {
    const r = Math.hypot(x, z);
    if (r > 45) return null;
    const candidates = [0];
    if (r >= 12 && r <= 24 && z > 0) candidates.push(3);
    const rh = rampHeight(x, z);
    if (rh !== null) candidates.push(rh);
    if (r <= 8) candidates.push(6);

    let best = null;
    for (const h of candidates) {
      if (h <= currentY + 0.35) {
        if (best === null || h > best) best = h;
      }
    }
    return best;
  }
  return null;
}

/**
 * Resolve horizontal solid obstacles (e.g., Night 3 bell tower & cliffs).
 */
export function resolveObstacles(night, prevX, prevZ, nextX, nextZ, y) {
  if (night !== 3) return [nextX, nextZ];
  let x = nextX;
  let z = nextZ;

  // Bell tower cylinder R=2 on Tier 2
  if (y >= 5.5 && y <= 14.0) {
    const d = Math.hypot(x, z);
    if (d < 2.0) {
      if (d < 1e-6) {
        x = 2.0;
        z = 0;
      } else {
        x = (x / d) * 2.0;
        z = (z / d) * 2.0;
      }
    }
  }
  return [x, z];
}
