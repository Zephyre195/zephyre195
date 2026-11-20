import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  random,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

const W = 1920;
const H = 1080;

// Sum of sines describing one ocean layer's surface height at x.
type Layer = {base: number; amp: number; len: number; speed: number; amp2: number; len2: number; speed2: number};

const surfaceY = (l: Layer, x: number, t: number) =>
  l.base +
  l.amp * Math.sin((x / l.len) * Math.PI * 2 + t * l.speed) +
  l.amp2 * Math.sin((x / l.len2) * Math.PI * 2 - t * l.speed2);

const layerPath = (l: Layer, t: number) => {
  let d = `M -80 ${H}`;
  for (let x = -80; x <= W + 80; x += 16) d += ` L ${x} ${surfaceY(l, x, t).toFixed(1)}`;
  return d + ` L ${W + 80} ${H} Z`;
};

const crestPath = (l: Layer, t: number) => {
  let d = '';
  for (let x = -80; x <= W + 80; x += 16) d += `${x === -80 ? 'M' : 'L'} ${x} ${surfaceY(l, x, t).toFixed(1)} `;
  return d;
};

// The hero wave: a big swell whose peak travels with the surfer.
const heroY = (x: number, t: number, peakX: number) => {
  const swell = 230 * Math.exp(-Math.pow((x - peakX) / 420, 2));
  return 760 - swell + 14 * Math.sin(x / 90 + t * 2.2) + 8 * Math.sin(x / 41 - t * 3.1);
};

const heroPath = (t: number, peakX: number) => {
  let d = `M -80 ${H}`;
  for (let x = -80; x <= W + 80; x += 12) d += ` L ${x} ${heroY(x, t, peakX).toFixed(1)}`;
  return d + ` L ${W + 80} ${H} Z`;
};

const Surfer: React.FC<{crouch: number}> = ({crouch}) => (
  <g>
    {/* board */}
    <ellipse cx={0} cy={0} rx={92} ry={11} fill="#ff6b35" />
    <ellipse cx={0} cy={-2} rx={86} ry={4} fill="#ffd166" opacity={0.85} />
    <line x1={-80} y1={0} x2={80} y2={0} stroke="#7a2e12" strokeWidth={2} />
    {/* legs */}
    <path d={`M -28 -6 L ${-18 + crouch * 6} ${-44 + crouch * 10} L -4 ${-78 + crouch * 16}`} stroke="#1b1b2f" strokeWidth={13} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d={`M 30 -6 L ${18 - crouch * 4} ${-42 + crouch * 10} L 6 ${-78 + crouch * 16}`} stroke="#1b1b2f" strokeWidth={13} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    {/* torso */}
    <path d={`M 0 ${-78 + crouch * 16} L ${-6 - crouch * 8} ${-132 + crouch * 22}`} stroke="#1b1b2f" strokeWidth={18} strokeLinecap="round" />
    {/* arms out for balance */}
    <path d={`M ${-58} ${-104 + crouch * 10} L ${-4 - crouch * 8} ${-120 + crouch * 22} L 62 ${-116 + crouch * 6}`} stroke="#1b1b2f" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    {/* head */}
    <circle cx={-8 - crouch * 9} cy={-152 + crouch * 22} r={16} fill="#1b1b2f" />
  </g>
);

export const Surfing: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames} = useVideoConfig();
  const t = frame / fps;

  // Sunrise: sun climbs and the sky warms during the first few seconds.
  const sunY = interpolate(frame, [0, 150], [700, 330], {extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic)});
  const skyWarm = interpolate(frame, [0, 150], [0, 1], {extrapolateRight: 'clamp'});

  // Gentle camera bob.
  const camY = 8 * Math.sin(t * 1.3);
  const camX = 5 * Math.sin(t * 0.8);

  // Surfer progress across the frame.
  const ride = interpolate(frame, [50, 330], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.sin)});
  const peakX = interpolate(ride, [0, 1], [-200, 2150]);
  // Carve up and down the wave face.
  const carve = Math.sin(t * 2.4);
  const surferX = peakX - 150 - 80 * carve;
  const sy = heroY(surferX, t, peakX);
  const slope = heroY(surferX + 6, t, peakX) - heroY(surferX - 6, t, peakX);
  const angle = (Math.atan2(slope, 12) * 180) / Math.PI;
  const crouch = 0.5 + 0.5 * Math.cos(t * 2.4);
  const surferOpacity = interpolate(frame, [50, 70, 320, 340], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  const far: Layer = {base: 610, amp: 6, len: 300, speed: 0.6, amp2: 3, len2: 130, speed2: 0.9};
  const mid: Layer = {base: 660, amp: 12, len: 420, speed: 0.9, amp2: 6, len2: 170, speed2: 1.3};
  const near: Layer = {base: 900, amp: 22, len: 520, speed: 1.4, amp2: 10, len2: 210, speed2: 1.9};

  // Spray particles flung off the board's tail.
  const spray = new Array(46).fill(0).map((_, i) => {
    const life = 18;
    const born = frame - ((i * 7) % life) - (frame % 1);
    const age = (frame + i * 3) % life;
    const p = age / life;
    const dx = -40 - 260 * p * (0.5 + random(`sx${i}`));
    const dy = -120 * p * (0.4 + random(`sy${i}`)) + 220 * p * p;
    return {x: surferX - 70 + dx, y: sy - 4 + dy, r: 3 + 6 * random(`r${i}`) * (1 - p), o: (1 - p) * 0.9, k: born};
  });

  const titleIn = interpolate(frame, [10, 45], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const titleOut = interpolate(frame, [95, 125], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const endIn = interpolate(frame, [durationInFrames - 60, durationInFrames - 30], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  const gulls = [0, 1, 2].map((i) => ({
    x: ((t * (60 + i * 18) + i * 500) % (W + 200)) - 100,
    y: 220 + i * 46 + 10 * Math.sin(t * 2 + i),
    flap: Math.sin(t * 9 + i * 2),
  }));

  return (
    <AbsoluteFill style={{background: '#0b1d3a'}}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={skyWarm > 0.5 ? '#2b5d9b' : '#1a2f5a'} />
            <stop offset="0.55" stopColor="#f2a65a" stopOpacity={0.4 + 0.6 * skyWarm} />
            <stop offset="1" stopColor="#ffd6a0" />
          </linearGradient>
          <radialGradient id="sun">
            <stop offset="0" stopColor="#fff6d5" />
            <stop offset="0.45" stopColor="#ffd166" />
            <stop offset="1" stopColor="#ff9f43" stopOpacity={0} />
          </radialGradient>
          <linearGradient id="farSea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3f7fa8" />
            <stop offset="1" stopColor="#1d4e74" />
          </linearGradient>
          <linearGradient id="heroSea" x1="0" y1="0.35" x2="0" y2="1">
            <stop offset="0" stopColor="#2ec4b6" />
            <stop offset="0.4" stopColor="#1282a2" />
            <stop offset="1" stopColor="#063a5c" />
          </linearGradient>
          <linearGradient id="nearSea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0d5c7d" />
            <stop offset="1" stopColor="#03243b" />
          </linearGradient>
        </defs>

        <g transform={`translate(${camX} ${camY})`}>
          <rect x={-50} y={-50} width={W + 100} height={H + 100} fill="url(#sky)" />
          <circle cx={1350} cy={sunY} r={260} fill="url(#sun)" />
          <circle cx={1350} cy={sunY} r={95} fill="#fff1c1" />

          {gulls.map((g, i) => (
            <path key={i} d={`M ${g.x - 22} ${g.y + g.flap * 8} Q ${g.x - 10} ${g.y - 10} ${g.x} ${g.y} Q ${g.x + 10} ${g.y - 10} ${g.x + 22} ${g.y + g.flap * 8}`} stroke="#22304a" strokeWidth={3.5} fill="none" strokeLinecap="round" />
          ))}

          <path d={layerPath(far, t)} fill="url(#farSea)" />
          {/* sun glitter on the water */}
          {new Array(30).fill(0).map((_, i) => (
            <rect key={i} x={1350 - 160 + random(`gx${i}`) * 320} y={630 + random(`gy${i}`) * 120} width={20 + random(`gw${i}`) * 50} height={3} rx={1.5} fill="#fff4cf" opacity={0.25 + 0.6 * Math.abs(Math.sin(t * 3 + i))} />
          ))}
          <path d={layerPath(mid, t)} fill="#1f6a93" opacity={0.85} />

          <path d={heroPath(t, peakX)} fill="url(#heroSea)" />
          <path d={(() => { let d = ''; for (let x = -80; x <= W + 80; x += 12) d += `${x === -80 ? 'M' : 'L'} ${x} ${heroY(x, t, peakX).toFixed(1)} `; return d; })()} stroke="#e8fbff" strokeWidth={6} fill="none" opacity={0.75} strokeLinecap="round" />

          {/* wake trail behind the surfer */}
          {new Array(14).fill(0).map((_, i) => {
            const wx = surferX - 90 - i * 34;
            return <ellipse key={i} cx={wx} cy={heroY(wx, t, peakX) + 6} rx={24 - i} ry={5} fill="#ffffff" opacity={surferOpacity * (0.7 - i * 0.045)} />;
          })}

          <g opacity={surferOpacity}>
            {spray.map((s, i) => (
              <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#ffffff" opacity={s.o} />
            ))}
            <g transform={`translate(${surferX} ${sy - 8}) rotate(${angle})`}>
              <Surfer crouch={crouch} />
            </g>
          </g>

          <path d={layerPath(near, t)} fill="url(#nearSea)" />
          <path d={crestPath(near, t)} stroke="#bfefff" strokeWidth={4} fill="none" opacity={0.35} />
        </g>
      </svg>

      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', fontFamily: 'Georgia, serif', color: '#fffaf0', textShadow: '0 6px 30px rgba(0,0,0,0.35)'}}>
        <div style={{opacity: titleIn * titleOut, transform: `translateY(${(1 - titleIn) * 40 - 120}px)`, textAlign: 'center'}}>
          <div style={{fontSize: 170, letterSpacing: 30, fontWeight: 700}}>SWELL</div>
          <div style={{fontSize: 40, letterSpacing: 14, fontFamily: 'sans-serif', opacity: 0.9}}>DAWN PATROL</div>
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center', background: `rgba(6, 26, 48, ${endIn * 0.55})`}}>
        <div style={{opacity: endIn, transform: `scale(${0.9 + 0.1 * endIn})`, fontFamily: 'Georgia, serif', color: '#fffaf0', fontSize: 96, letterSpacing: 6, textAlign: 'center'}}>
          Chase the next wave.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
