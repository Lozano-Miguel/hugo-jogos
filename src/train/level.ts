// Train level creation, an exact port of Hugo.exe (FUN_00419150 build, FUN_00418b60
// arcade generator, FUN_00419d60 TV trains, FUN_0041a7b0/FUN_0041d6f0 random trains).
// It must consume rand() in the original order: docs/research/train-level-port.py is the
// verified reference and tests/fixtures/levels.json its output.
import { type MsvcRand, scale } from './rand';

export const ROW = 48; // scroll units per track row

export enum Cell {
  Track = 0,
  None = 1,
  BufEnd = 2,
  BufStart = 3,
  SwLeft = 4,
  JoinFromRight = 5,
  SwRight = 6,
  JoinFromLeft = 7,
}

export interface TrackObject {
  type: number; // 1 tree, 2-5 switches, 6 buffer front, 7 buffer back, 8 sack, 9 fence
  lane: number;
  pos: number;
  frames: number;
  flag?: number;
  kind?: number;
}

export type TrainCommand = [cmd: number, when: number, arg: number]; // 0 start, 1 change lane by arg, 2 stop

export interface TrainSpec {
  lane: number;
  pos: number;
  cmds: TrainCommand[];
  targetLane?: number;
  meet?: number;
}

export interface Level {
  string: string;
  length: number;
  endLane: number;
  cells: Cell[][]; // [row][lane], row 0 = start
  objects: TrackObject[];
  trains: TrainSpec[];
  retries: number;
}

export const TV_LEVEL =
  '38\n1020010010010212111111111451154111131121541145311211113452154111145541111354011245113542154451111145541111313010010';

const is = (c: string, set: string) => c.length === 1 && set.includes(c);

export function generateArcadeString(rand: MsvcRand): string {
  const r = () => rand.next();
  const base = scale(r(), 50);
  const L = base + 30;
  const endLane = scale(r(), 3);
  const g: string[][] = Array.from({ length: L }, () => ['0', '0', '0']);
  const get = (row: number, lane: number) => (row >= 0 && row < L ? g[row][lane] : '\0');
  const put = (row: number, lane: number, c: string) => {
    if (row >= 0 && row < L) g[row][lane] = c;
  };

  const passes = scale(r(), 4) + 2;
  let budget = Math.trunc(L / 2);
  let target: number | null = null; // uninitialised in the original: persists between walks
  for (let p = 0; p < passes; p++) {
    let lastSwitchRow = 3;
    let lane = 1;
    for (let row = 0; row < base + 26; row++) {
      let noSwitch = row - lastSwitchRow < 3 || budget === 0;
      if (!noSwitch) noSwitch = scale(r(), lane === 1 ? 5 : 3) !== 0;
      if (!noSwitch) noSwitch = get(row - 1, lane) === '5';
      if (noSwitch && row <= base + 24) {
        if (!is(g[row][lane], '45')) g[row][lane] = '1';
        continue;
      }
      if (lane === 0 || lane === 2) target = 1;
      if (row > base + 24) {
        if (lane === 1 && endLane !== 1) target = endLane;
      } else if (lane === 1) {
        target = scale(r(), 2) * 2;
      }
      const cur = g[row];
      let placed = false;
      if (target === 0) {
        if (cur[0] !== '4' && cur[1] !== '5' && cur[2] !== '5') {
          cur[lane] = '4';
          cur[0] = '5';
          placed = true;
        }
      } else if (target === 1) {
        const other = lane !== 0 ? 0 : 2;
        if (cur[lane] !== '5' && cur[1] !== '4' && cur[other] !== '4' && cur[other] !== '5') {
          cur[lane] = '4';
          cur[1] = '5';
          placed = true;
        }
      } else if (target === 2) {
        if (cur[0] !== '5' && cur[1] !== '5' && cur[2] !== '4') {
          cur[lane] = '4';
          cur[2] = '5';
          placed = true;
        }
      }
      if (placed) {
        budget--;
        lastSwitchRow = row;
        lane = target!;
      }
    }
  }

  for (const row of [base + 26, base + 27, base + 28]) g[row][endLane] = '1';
  g[L - 1][endLane] = '2';

  for (let t = 0; t < base + 28; t++) {
    for (let k = 0; k < 3; k++) {
      // A) track stops here: extend it 1..3 rows, then a buffer
      if (get(t, k) === '0' && is(get(t - 1, k), '145')) {
        let n = (r() % 3) + 1;
        if (base + 27 <= n + (t + 1)) n = L - 1 - t - 3;
        if (n < 1) {
          put(t, k, '2');
        } else {
          let j = 0;
          while (j < n) {
            if (get(t + j, k) !== '0') {
              put(t + j - 1, k, '2');
              break;
            }
            put(t + j, k, '1');
            j++;
          }
          if (j === n) put(t + j - 1, k, '2');
        }
      }
      // B) track starts in the next row: a start buffer
      if (get(t, k) === '0' && is(get(t + 1, k), '145')) {
        if (get(t - 1, k) === '0' && scale(r(), 2) === 0) {
          put(t, k, '1');
          put(t - 1, k, '3');
        } else {
          put(t, k, '3');
        }
      }
      // C) a buffer directly followed by more track is pointless
      if (get(t + 1, k) !== '0' && get(t, k) === '2') put(t, k, '1');
    }
  }

  // the goal lane must be entered through a switch
  let found5 = false;
  for (let row = L - 2; row >= 0; row--) {
    const c = g[row][endLane];
    if (c === '3') break;
    if (c === '5') {
      found5 = true;
      break;
    }
  }
  if (!found5) {
    const side = endLane === 0 || endLane === 2 ? 1 : scale(r(), 2) * 2;
    for (let row = L - 2; row >= 0; row--) {
      if (g[row][side] === '1') {
        g[row][side] = '4';
        g[row][endLane] = '5';
        put(row - 1, endLane, '1');
        break;
      }
      if (g[row][endLane] === '5') g[row][side] = '1';
      g[row][endLane] = '1';
    }
  }

  // cleanup: drop half switches, enforce buffers around every gap
  for (let i = 1; i < L; i++) {
    const row = L - 1 - i;
    const cur = g[row];
    for (let k = 0; k < 3; k++) {
      if (cur[k] === '4') {
        if (k === 0 || k === 2) {
          if (cur[1] !== '5') cur[k] = '1';
        } else if (cur[0] !== '5' && cur[2] !== '5') {
          cur[1] = '1';
        }
      }
      if (cur[k] === '5') {
        if (k === 0 || k === 2) {
          if (cur[1] !== '4') cur[k] = '1';
        } else if (cur[0] !== '4' && cur[2] !== '4') {
          cur[1] = '1';
        }
      }
      if (i > 1 && i <= base + 27 && cur[k] === '0') {
        if (!is(g[row + 1][k], '03')) g[row + 1][k] = '3';
        if (!is(g[row - 1][k], '02')) g[row - 1][k] = '2';
      }
    }
  }

  let s = `${L}\n${endLane}`;
  for (let row = L - 1; row >= 0; row--) s += g[row].join('');
  return s;
}

function parseLevelString(s: string): { L: number; endLane: number; raw: number[][] } {
  const L = parseInt(s.split('\n')[0], 10);
  const head = String(L).length;
  const endLane = parseInt(s[head + 1], 10);
  const digits = s.slice(head + 2);
  const raw = Array.from({ length: L }, (_, r) => [0, 1, 2].map((k) => Number(digits[3 * (L - 1 - r) + k])));
  return { L, endLane, raw };
}

const TREE_FRAMES: Record<number, number> = { 3: 119, 4: 106, 5: 91 };

export function buildLevel(mode: 'tv' | 'arcade', rand: MsvcRand, maxTries = 1000): Level {
  const r = () => rand.next();
  for (let attempt = 0; attempt < maxTries; attempt++) {
    const s = mode === 'tv' ? TV_LEVEL : generateArcadeString(rand);
    const { L, endLane, raw } = parseLevelString(s);
    const cells: Cell[][] = Array.from({ length: L }, () => [Cell.Track, Cell.Track, Cell.Track]);
    const objects: TrackObject[] = [];
    const flag = (c: number) => (c === 0 || c === 2 || c === 3 ? 1 : 0);

    for (let row = 0; row < L; row++) {
      const rr = raw[row];
      for (let lane = 0; lane < 3; lane++) {
        const c = rr[lane];
        const pos = ROW * row;
        if (c === 0) {
          cells[row][lane] = Cell.None;
        } else if (c === 1) {
          cells[row][lane] = Cell.Track;
        } else if (c === 2) {
          cells[row][lane] = Cell.BufEnd;
          objects.push({ type: 6, lane, pos: pos - 12, frames: 84 });
        } else if (c === 3) {
          cells[row][lane] = Cell.BufStart;
          objects.push({ type: 7, lane, pos: pos + 4, frames: 84 });
        } else if (c === 4) {
          if (lane === 0) {
            cells[row][0] = Cell.SwRight;
            objects.push({ type: 2, lane: 0, pos: pos - 1, frames: 98, flag: flag(rr[2]) });
          } else if (lane === 1) {
            if (rr[0] !== 5) {
              cells[row][1] = Cell.SwRight;
              objects.push({ type: 3, lane: 1, pos: pos + 3, frames: 98, flag: flag(rr[0]) });
            } else {
              cells[row][1] = Cell.SwLeft;
              const f = flag(rr[2]);
              objects.push({ type: 5, lane: 1, pos: pos - (f === 0 ? 2 : 1), frames: 97, flag: f });
            }
          } else {
            cells[row][2] = Cell.SwLeft;
            const f = flag(rr[0]);
            objects.push({ type: 4, lane: 2, pos: pos - (f ? 2 : 3), frames: 97, flag: f });
          }
        } else if (c === 5) {
          if (lane === 0) cells[row][0] = Cell.JoinFromRight;
          else if (lane === 1) cells[row][1] = rr[0] === 4 ? Cell.JoinFromLeft : Cell.JoinFromRight;
          else cells[row][2] = Cell.JoinFromLeft;
        }
      }
    }

    // scenery: every half row, 0-2 objects on the verge (lanes 3..5 = tree1..3)
    for (let t = 0.25; t < L; t += 0.5) {
      const count = r() % 3;
      for (let n = 0; n < count; n++) {
        if (r() << 2 === 0) {
          // original bug: compares a float with 0, so a fence only appears when rand() == 0
          objects.push({ type: 9, lane: (r() % 3) + 3, pos: Math.trunc(ROW * t), frames: 75 });
        } else {
          const lane = (r() % 3) + 3;
          objects.push({ type: 1, lane, pos: Math.trunc(ROW * t), frames: TREE_FRAMES[lane] });
        }
      }
    }

    let trains: TrainSpec[];
    let approved: boolean;
    if (mode === 'tv') {
      trains = tvTrains();
      approved = true;
    } else {
      trains = randomTrains(L, cells, rand);
      approved = trains.length > 4;
    }

    // sacks hang along a side lane after the middle lane switches into it, until that lane's buffer
    let left = false;
    let right = false;
    for (let row = 0; row < L; row++) {
      if (cells[row][0] === Cell.BufEnd) left = false;
      if (cells[row][2] === Cell.BufEnd) right = false;
      for (const [side, on] of [
        [0, left],
        [2, right],
      ] as const) {
        if (!on) continue;
        const k = (r() * 10) >> 15;
        const kind = k < 6 ? 0 : k < 8 ? 1 : 2;
        objects.push({ type: 8, lane: side, pos: ROW * row + 6, frames: 119, kind });
      }
      if (cells[row][1] === Cell.SwLeft) left = true;
      if (cells[row][1] === Cell.SwRight) right = true;
    }

    if (approved) return { string: s, length: L, endLane, cells, objects, trains, retries: attempt };
  }
  throw new Error('Could not build a train level');
}

export function tvTrains(): TrainSpec[] {
  return [
    { lane: 0, pos: 480, cmds: [[0, 288, 0], [2, 720, 0]] },
    { lane: 1, pos: 480, cmds: [[0, 96, 0], [2, 480, 0]] },
    { lane: 0, pos: 960, cmds: [[0, 768, 0], [2, 960, 0]] },
    { lane: 1, pos: 960, cmds: [[0, 192, 0], [2, 1440, 0]] },
    { lane: 1, pos: 1104, cmds: [[0, 240, 0], [1, 468, 1], [2, 1440, 0]] },
    { lane: 2, pos: 1488, cmds: [[0, 144, 0], [1, 516, -1], [2, 1920, 0]] },
    { lane: 1, pos: 1584, cmds: [[0, 480, 0], [1, 660, 1], [2, 1008, 0]] },
    { lane: 0, pos: 1536, cmds: [[0, 1152, 0], [2, 1920, 0]] },
    { lane: 2, pos: 1536, cmds: [[0, 1248, 0], [2, 1920, 0]] },
  ];
}

// FUN_0041d6f0: can a train at spawnRow, examined at (lane,row) and driving towards the
// player (row decreasing), reach the switch at (goalLane, goalRow)?
function reachable(
  cells: Cell[][],
  lane: number,
  row: number,
  goalLane: number,
  goalRow: number,
  spawnRow: number,
  budget: number,
): boolean {
  if (row < goalRow) return false;
  let k = spawnRow - row;
  while (row !== goalRow || lane === goalLane) {
    if (budget < 1 || (row === goalRow && lane === goalLane)) return true;
    const c = cells[row][lane];
    if (c === Cell.Track || c === Cell.SwLeft || c === Cell.SwRight) {
      // keep going
    } else if (c === Cell.JoinFromRight) {
      if (goalRow + 6 < row && k < goalRow - 6) {
        if (lane === goalLane || goalLane <= lane) {
          if (reachable(cells, lane, row - 1, goalLane, goalRow, spawnRow, budget - 1)) return true;
          lane += 1;
        } else if (reachable(cells, lane + 1, row - 1, goalLane, goalRow, spawnRow, budget - 1)) {
          return true;
        }
        return reachable(cells, lane, row - 1, goalLane, goalRow, spawnRow, budget - 1);
      }
    } else if (c === Cell.JoinFromLeft) {
      if (goalRow + 6 < row && k < goalRow - 6) {
        if (lane === goalLane || lane < goalLane) {
          if (reachable(cells, lane, row - 1, goalLane, goalRow, spawnRow, budget - 1)) return true;
          lane -= 1;
        } else if (reachable(cells, lane - 1, row - 1, goalLane, goalRow, spawnRow, budget - 1)) {
          return true;
        }
        return reachable(cells, lane, row - 1, goalLane, goalRow, spawnRow, budget - 1);
      }
    } else {
      return false;
    }
    budget -= 1;
    row -= 1;
    k += 1;
    if (row < goalRow) return false;
  }
  return false;
}

// FUN_0041a7b0 "CreateRandomLocomotives"
function randomTrains(L: number, cells: Cell[][], rand: MsvcRand): TrainSpec[] {
  const r = () => rand.next();
  const cands: [number, number][] = [];
  for (let row = 5; row < L - 5; row += 2) {
    for (let lane = 0; lane < 3; lane++) {
      if (cells[row][lane] === Cell.SwLeft || cells[row][lane] === Cell.SwRight) cands.push([lane, row]);
    }
  }
  const blocked = new Set<string>();
  const trains: { lane: number; pos: number; targetLane: number; meet: number }[] = [];
  while (cands.length > 0) {
    const i = r() % cands.length;
    const [clane, crow] = cands[i];
    let end = crow;
    while (end < L - 1) {
      if (end >= crow * 2 || cells[end][clane] === Cell.BufEnd) break;
      end++;
    }
    if (end - crow - 1 > 3) {
      let tries = 0;
      let usable = true; // once a blocked spot is drawn, every later try for this switch fails
      let found: [number, number] | null = null;
      while (found === null) {
        if (tries > 999) break;
        tries++;
        const lane = r() % 3;
        const row = Math.trunc((r() * (crow - 6)) / 32768) + 3 + crow;
        if (row >= L) continue;
        const c = cells[row][lane];
        if (c === Cell.None || c === Cell.BufEnd || c === Cell.BufStart) continue;
        if (!reachable(cells, lane, row - 1, clane, crow, row, 50)) continue;
        if (!reachable(cells, lane, row - 2, clane, crow, row, 50)) continue;
        if (blocked.has(`${lane},${row}`)) usable = false;
        if (usable) found = [lane, row];
      }
      if (found !== null && tries < 1000) {
        const [lane, row] = found;
        for (let dr = -2; dr <= 2; dr++) for (let bl = 0; bl < 3; bl++) blocked.add(`${bl},${row + dr}`);
        trains.push({ lane, pos: row * ROW, targetLane: clane, meet: crow * ROW + 12 });
      }
    }
    cands.splice(i, 1);
  }
  // "Switching places": trains further away must meet later
  for (const a of trains) {
    for (const b of trains) {
      if (b.pos < a.pos && a.meet < b.meet) {
        [a.pos, b.pos] = [b.pos, a.pos];
        [a.lane, b.lane] = [b.lane, a.lane];
      }
    }
  }
  return trains.map((t) => ({ lane: t.lane, pos: t.pos, cmds: [], targetLane: t.targetLane, meet: t.meet }));
}
