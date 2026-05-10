import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, Dimensions, StyleSheet } from 'react-native';
import Svg, { Circle, Ellipse, Path, Rect, Defs, LinearGradient, Stop, G } from 'react-native-svg';
import { MiloState } from './useMiloSpeech';

const { width, height } = Dimensions.get('window');

const MILO_W = 110;
const MILO_H = 96;
const MILO_CENTER_X = width / 2;
const MILO_CENTER_Y = height * 0.42;

// ── Pre-generated static data ──────────────────────────────────────────────────
// 70 stars — first 14 twinkle, rest static
const STARS = Array.from({ length: 70 }, (_, i) => ({
  x: width * (0.02 + ((i * 0.139) % 0.96)),
  y: height * 0.9 * ((i * 0.173) % 1),
  r: 0.8 + ((i * 0.37) % 1) * 1.8,
  twinkle: i < 14,
  delay: (i * 217) % 3000,
}));

const SOUL_COLORS = ['#F0F0FF', '#FFE8A3', '#9FE1CB', '#CECBF6'];
const SOULS = Array.from({ length: 10 }, (_, i) => ({
  x: width * (0.05 + ((i * 0.193) % 0.90)),
  y: height * 0.75 * ((i * 0.211) % 1) + height * 0.05,
  color: SOUL_COLORS[i % 4],
  size: 7 + ((i * 0.7) % 1) * 7,
  dur: 8000 + ((i * 700) % 7000),
  dxRange: (((i * 0.137) % 1) - 0.5) * 130,
  dyRange: (((i * 0.193) % 1) - 0.5) * 90,
}));

const ORBIT = [
  { radius: 52, dur: 6000,  size: 3,   color: '#9FE1CB' },
  { radius: 68, dur: 9000,  size: 2,   color: '#FFE8A3' },
  { radius: 44, dur: 7500,  size: 2.5, color: '#CECBF6' },
  { radius: 78, dur: 11000, size: 2,   color: '#9FE1CB' },
  { radius: 60, dur: 8000,  size: 1.5, color: '#FFE8A3' },
];

function soulPath(s: number): string {
  return `M${s * 1.5},${s * 0.2} C${s * 2.6},${s * 0.9} ${s * 2.8},${s * 2.2} ${s * 1.5},${s * 2.8} C${s * 0.2},${s * 2.2} ${s * 0.4},${s * 0.9} ${s * 1.5},${s * 0.2} Z`;
}

interface Props { state: MiloState }

export default function MascotSceneCosmos({ state }: Props) {

  // ── Animated values ────────────────────────────────────────────────────────
  const breathAnim  = useRef(new Animated.Value(0)).current;
  const blinkAnim   = useRef(new Animated.Value(1)).current;
  const mouthAnim   = useRef(new Animated.Value(0.3)).current;
  const glowAnim    = useRef(new Animated.Value(0.12)).current;
  const driftY      = useRef(new Animated.Value(0)).current;
  const driftX      = useRef(new Animated.Value(0)).current;
  const axialTilt   = useRef(new Animated.Value(0)).current;
  const headTilt    = useRef(new Animated.Value(0)).current;
  const spinAnim    = useRef(new Animated.Value(0)).current;
  const legFloatL   = useRef(new Animated.Value(0)).current;
  const legFloatR   = useRef(new Animated.Value(0)).current;
  const zipX        = useRef(new Animated.Value(0)).current;
  const dot1        = useRef(new Animated.Value(0)).current;
  const dot2        = useRef(new Animated.Value(0)).current;
  const dot3        = useRef(new Animated.Value(0)).current;

  const twinkleAnims = useRef(Array.from({ length: 14 }, () => new Animated.Value(0.5))).current;
  const soulXAnims   = useRef(SOULS.map(() => new Animated.Value(0))).current;
  const soulYAnims   = useRef(SOULS.map(() => new Animated.Value(0))).current;
  const orbitAnims   = useRef(ORBIT.map(() => new Animated.Value(0))).current;

  // animation refs for cleanup
  const breathRef = useRef<Animated.CompositeAnimation | null>(null);
  const mouthRef  = useRef<Animated.CompositeAnimation | null>(null);
  const glowRef   = useRef<Animated.CompositeAnimation | null>(null);
  const dotsRef   = useRef<Animated.CompositeAnimation | null>(null);
  const spinRef   = useRef<Animated.CompositeAnimation | null>(null);
  const blinkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmounted  = useRef(false);

  // ── Ambient loops — start once on mount ───────────────────────────────────
  useEffect(() => {
    unmounted.current = false;

    // Star twinkle
    twinkleAnims.forEach((anim, i) => {
      const dur = 1200 + ((i * 310) % 900);
      Animated.loop(Animated.sequence([
        Animated.delay(STARS[i].delay),
        Animated.timing(anim, { toValue: 1,   duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])).start();
    });

    // Soul drift
    SOULS.forEach((soul, i) => {
      Animated.loop(Animated.sequence([
        Animated.timing(soulXAnims[i], { toValue: soul.dxRange, duration: soul.dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(soulXAnims[i], { toValue: 0,            duration: soul.dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])).start();
      Animated.loop(Animated.sequence([
        Animated.timing(soulYAnims[i], { toValue: soul.dyRange, duration: soul.dur * 0.7, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(soulYAnims[i], { toValue: 0,            duration: soul.dur * 0.7, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])).start();
    });

    // Orbit particles
    ORBIT.forEach((o, i) => {
      Animated.loop(
        Animated.timing(orbitAnims[i], { toValue: 1, duration: o.dur, easing: Easing.linear, useNativeDriver: true })
      ).start();
    });

    // Zero-g drift Y ±12px 4s
    Animated.loop(Animated.sequence([
      Animated.timing(driftY, { toValue: 12,  duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(driftY, { toValue: 0,   duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(driftY, { toValue: -12, duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(driftY, { toValue: 0,   duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();

    // Zero-g drift X ±8px 6s
    Animated.loop(Animated.sequence([
      Animated.timing(driftX, { toValue: 8,  duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(driftX, { toValue: 0,  duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(driftX, { toValue: -8, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(driftX, { toValue: 0,  duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();

    // Axial tilt ±8° 5s
    Animated.loop(Animated.sequence([
      Animated.timing(axialTilt, { toValue: 8,  duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(axialTilt, { toValue: -8, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();

    // Leg float — opposite phase
    Animated.loop(Animated.sequence([
      Animated.timing(legFloatL, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(legFloatL, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();
    setTimeout(() => {
      Animated.loop(Animated.sequence([
        Animated.timing(legFloatR, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(legFloatR, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])).start();
    }, 800);

    // Zip — Milo occasionally zips sideways and snaps back
    let zipRunning = true;
    const doZip = () => {
      if (!zipRunning || unmounted.current) return;
      setTimeout(() => {
        if (!zipRunning || unmounted.current) return;
        const dir = Math.random() < 0.5 ? -1 : 1;
        Animated.sequence([
          Animated.timing(zipX, { toValue: dir * width * 0.28, duration: 160, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
          Animated.timing(zipX, { toValue: -dir * width * 0.10, duration: 100, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(zipX, { toValue: 0, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]).start(() => { if (zipRunning && !unmounted.current) doZip(); });
      }, 9000 + Math.random() * 1500);
    };
    doZip();

    return () => {
      unmounted.current = true;
      zipRunning = false;
    };
  }, []);

  // ── Blink ──────────────────────────────────────────────────────────────────
  const scheduleBlink = () => {
    blinkTimer.current = setTimeout(() => {
      if (unmounted.current) return;
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 0.05, duration: 65, useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 1,    duration: 65, useNativeDriver: true }),
      ]).start(() => { if (!unmounted.current) scheduleBlink(); });
    }, 3500 + Math.random() * 1500);
  };
  const stopBlink = () => {
    if (blinkTimer.current) { clearTimeout(blinkTimer.current); blinkTimer.current = null; }
  };

  // ── State-driven animations ────────────────────────────────────────────────
  useEffect(() => {
    breathRef.current?.stop();
    mouthRef.current?.stop();
    glowRef.current?.stop();
    dotsRef.current?.stop();
    spinRef.current?.stop();
    stopBlink();

    mouthAnim.setValue(0.3);
    dot1.setValue(0); dot2.setValue(0); dot3.setValue(0);
    blinkAnim.setValue(1);

    const breath = (dur: number) => Animated.loop(Animated.sequence([
      Animated.timing(breathAnim, { toValue: 1, duration: dur / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(breathAnim, { toValue: 0, duration: dur / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));

    if (state === 'idle') {
      breathRef.current = breath(3000); breathRef.current.start();
      Animated.timing(headTilt,  { toValue: 0,    duration: 300, useNativeDriver: true }).start();
      Animated.timing(glowAnim,  { toValue: 0.12, duration: 400, useNativeDriver: true }).start();
      scheduleBlink();
    } else if (state === 'speaking') {
      breathRef.current = breath(1500); breathRef.current.start();
      mouthRef.current = Animated.loop(Animated.sequence([
        Animated.timing(mouthAnim, { toValue: 1,    duration: 200, useNativeDriver: true }),
        Animated.timing(mouthAnim, { toValue: 0.25, duration: 200, useNativeDriver: true }),
      ]));
      mouthRef.current.start();
      glowRef.current = Animated.loop(Animated.sequence([
        Animated.timing(glowAnim, { toValue: 0.28, duration: 200, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.12, duration: 200, useNativeDriver: true }),
      ]));
      glowRef.current.start();
      scheduleBlink();
    } else if (state === 'listening') {
      Animated.timing(headTilt, { toValue: 12,   duration: 300, useNativeDriver: true }).start();
      Animated.timing(blinkAnim, { toValue: 1.15, duration: 300, useNativeDriver: true }).start();
      Animated.timing(glowAnim,  { toValue: 0.18, duration: 400, useNativeDriver: true }).start();
      dotsRef.current = Animated.loop(Animated.sequence([
        Animated.timing(dot1, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(dot2, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.timing(dot3, { toValue: 1, duration: 280, useNativeDriver: true }),
        Animated.delay(180),
        Animated.parallel([
          Animated.timing(dot1, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(dot2, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(dot3, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]),
        Animated.delay(180),
      ]));
      dotsRef.current.start();
    } else if (state === 'happy') {
      breathRef.current = breath(1000); breathRef.current.start();
      spinRef.current = Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: 1800, easing: Easing.linear, useNativeDriver: true })
      );
      spinRef.current.start();
      Animated.timing(glowAnim, { toValue: 0.25, duration: 400, useNativeDriver: true }).start();
      scheduleBlink();
    }

    return () => {
      breathRef.current?.stop();
      mouthRef.current?.stop();
      glowRef.current?.stop();
      dotsRef.current?.stop();
      spinRef.current?.stop();
      stopBlink();
    };
  }, [state]);

  // ── Derived interpolations ─────────────────────────────────────────────────
  const bodyScale    = breathAnim.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1.02] });
  const axialTiltRot = axialTilt.interpolate({ inputRange: [-8, 8], outputRange: ['-8deg', '8deg'] });
  const headTiltRot  = headTilt.interpolate({ inputRange: [0, 12], outputRange: ['0deg', '12deg'] });
  const spinRotate   = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const legRotL      = legFloatL.interpolate({ inputRange: [0, 1], outputRange: ['-35deg', '-25deg'] });
  const legRotR      = legFloatR.interpolate({ inputRange: [0, 1], outputRange: ['25deg', '35deg'] });

  const miloX = Animated.add(driftX, zipX);

  const staticStars = STARS.filter(s => !s.twinkle);
  const twinkleStars = STARS.filter(s => s.twinkle);

  // ════════════════════════════════════════════════════════════════════════════
  return (
    <View style={styles.root}>

      {/* ═══ LAYER 1 — Background SVG ════════════════════════════════════════════ */}
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="cosmos" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0"    stopColor="#08051A" stopOpacity="1" />
            <Stop offset="0.35" stopColor="#0D0B2E" stopOpacity="1" />
            <Stop offset="0.70" stopColor="#150D3A" stopOpacity="1" />
            <Stop offset="1"    stopColor="#1A0D30" stopOpacity="1" />
          </LinearGradient>
        </Defs>

        <Rect x={0} y={0} width={width} height={height} fill="url(#cosmos)" />

        {/* Nebula clouds */}
        <Ellipse cx={width * 0.15} cy={height * 0.20} rx={width * 0.35} ry={height * 0.14} fill="#3D1A6E" fillOpacity={0.10} />
        <Ellipse cx={width * 0.82} cy={height * 0.38} rx={width * 0.28} ry={height * 0.18} fill="#1A3D6E" fillOpacity={0.09} />
        <Ellipse cx={width * 0.50} cy={height * 0.72} rx={width * 0.45} ry={height * 0.12} fill="#6E1A4A" fillOpacity={0.08} />
        <Ellipse cx={width * 0.70} cy={height * 0.12} rx={width * 0.22} ry={height * 0.10} fill="#2A1A6E" fillOpacity={0.11} />

        {/* Galactic band */}
        <Rect
          x={-width * 0.2}
          y={height * 0.55}
          width={width * 1.4}
          height={height * 0.08}
          rx={height * 0.04}
          fill="#FFFFFF"
          fillOpacity={0.025}
          transform={`rotate(-12, ${width / 2}, ${height * 0.55})`}
        />

        {staticStars.map((star, i) => (
          <Circle key={i} cx={star.x} cy={star.y} r={star.r} fill="#FFFFFF" opacity={0.55 + (i % 4) * 0.1} />
        ))}
      </Svg>

      {/* ═══ LAYER 2 — Twinkle stars ══════════════════════════════════════════════ */}
      {twinkleStars.map((star, i) => (
        <Animated.View key={i} pointerEvents="none"
          style={{
            position: 'absolute',
            left: star.x - star.r,
            top: star.y - star.r,
            width: star.r * 2,
            height: star.r * 2,
            borderRadius: star.r,
            backgroundColor: '#FFFFFF',
            opacity: twinkleAnims[i],
          }}
        />
      ))}

      {/* ═══ LAYER 3 — Drifting souls ══════════════════════════════════════════════ */}
      {SOULS.map((soul, i) => (
        <Animated.View key={i} pointerEvents="none"
          style={{
            position: 'absolute',
            left: soul.x,
            top: soul.y,
            transform: [{ translateX: soulXAnims[i] }, { translateY: soulYAnims[i] }],
          }}
        >
          <Svg width={soul.size * 3} height={soul.size * 3}>
            <Ellipse cx={soul.size * 1.5} cy={soul.size * 1.5} rx={soul.size * 1.4} ry={soul.size * 1.4} fill={soul.color} fillOpacity={0.08} />
            <Path d={soulPath(soul.size)} fill={soul.color} fillOpacity={0.55} />
          </Svg>
        </Animated.View>
      ))}

      {/* ═══ LAYER 4 — Orbit particles ════════════════════════════════════════════ */}
      {ORBIT.map((o, i) => {
        const rotateDeg = orbitAnims[i].interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
        const boxSize = o.radius * 2 + o.size * 2;
        return (
          <Animated.View key={i} pointerEvents="none"
            style={{
              position: 'absolute',
              left: MILO_CENTER_X - boxSize / 2,
              top:  MILO_CENTER_Y - boxSize / 2,
              width: boxSize,
              height: boxSize,
              transform: [{ rotate: rotateDeg }],
            }}
          >
            <View style={{
              position: 'absolute',
              left: boxSize / 2 - o.size / 2,
              top: 0,
              width: o.size,
              height: o.size,
              borderRadius: o.size / 2,
              backgroundColor: o.color,
              opacity: 0.75,
            }} />
          </Animated.View>
        );
      })}

      {/* ═══ LAYER 5 — Milo glow ════════════════════════════════════════════════ */}
      <Animated.View pointerEvents="none"
        style={{
          position: 'absolute',
          left: MILO_CENTER_X - 90,
          top:  MILO_CENTER_Y - 90,
          width: 180,
          height: 180,
          borderRadius: 90,
          backgroundColor: '#AFA9EC',
          opacity: glowAnim,
          transform: [{ translateX: miloX }, { translateY: driftY }],
        }}
      />

      {/* ═══ LAYER 6 — Milo body ════════════════════════════════════════════════ */}
      <Animated.View pointerEvents="none"
        style={{
          position: 'absolute',
          left: MILO_CENTER_X - MILO_W / 2,
          top:  MILO_CENTER_Y - MILO_H / 2,
          width: MILO_W,
          height: MILO_H + 32,
          transform: [
            { translateX: miloX },
            { translateY: driftY },
            { rotate: headTiltRot },
            { rotate: spinRotate },
            { rotate: axialTiltRot },
            { scale: bodyScale },
          ],
        }}
      >
        <Svg width={MILO_W} height={MILO_H + 32}>
          <Ellipse cx={MILO_W / 2 + 3} cy={MILO_H * 0.50} rx={MILO_W * 0.44} ry={MILO_H * 0.43} fill="#000000" opacity={0.12} />
          <Ellipse cx={MILO_W * 0.21} cy={MILO_H * 0.16} rx={10}  ry={8}   fill="#C5BFEE" />
          <Ellipse cx={MILO_W * 0.21} cy={MILO_H * 0.16} rx={5.5} ry={4}   fill="#FFFFFF" opacity={0.32} />
          <Ellipse cx={MILO_W * 0.79} cy={MILO_H * 0.16} rx={10}  ry={8}   fill="#C5BFEE" />
          <Ellipse cx={MILO_W * 0.79} cy={MILO_H * 0.16} rx={5.5} ry={4}   fill="#FFFFFF" opacity={0.32} />
          <Ellipse cx={MILO_W * 0.11} cy={MILO_H * 0.58} rx={11}  ry={7.5} fill="#9890D0" />
          <Circle  cx={MILO_W * 0.06} cy={MILO_H * 0.61} r={6}             fill="#9890D0" />
          <Ellipse cx={MILO_W * 0.89} cy={MILO_H * 0.58} rx={11}  ry={7.5} fill="#9890D0" />
          <Circle  cx={MILO_W * 0.94} cy={MILO_H * 0.61} r={6}             fill="#9890D0" />
          <Ellipse cx={MILO_W / 2} cy={MILO_H * 0.46} rx={MILO_W * 0.46} ry={MILO_H * 0.44} fill="#AFA9EC" />
          <Ellipse cx={MILO_W / 2 + 8} cy={MILO_H * 0.54} rx={MILO_W * 0.34} ry={MILO_H * 0.32} fill="#000000" opacity={0.09} />
          <Ellipse cx={MILO_W / 2}    cy={MILO_H * 0.58} rx={MILO_W * 0.26} ry={MILO_H * 0.16} fill="#FFFFFF" opacity={0.17} />
          <Ellipse cx={MILO_W * 0.32} cy={MILO_H * 0.25} rx={15} ry={10} fill="#FFFFFF" opacity={0.22} />
          <Circle cx={MILO_W * 0.21} cy={MILO_H * 0.56} r={11} fill="#F4A0C0" opacity={0.50} />
          <Circle cx={MILO_W * 0.79} cy={MILO_H * 0.56} r={11} fill="#F4A0C0" opacity={0.50} />
        </Svg>

        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scaleY: blinkAnim }] }]}>
          <Svg width={MILO_W} height={MILO_H} style={StyleSheet.absoluteFill}>
            <Path d={`M${MILO_W*0.27},${MILO_H*0.264} Q${MILO_W*0.35},${MILO_H*0.235} ${MILO_W*0.43},${MILO_H*0.264}`} stroke="#5050A0" strokeWidth={2.2} fill="none" strokeLinecap="round" opacity={0.55} />
            <Path d={`M${MILO_W*0.57},${MILO_H*0.264} Q${MILO_W*0.65},${MILO_H*0.235} ${MILO_W*0.73},${MILO_H*0.264}`} stroke="#5050A0" strokeWidth={2.2} fill="none" strokeLinecap="round" opacity={0.55} />
            <Ellipse cx={MILO_W*0.345} cy={MILO_H*0.384} rx={7.5} ry={9}  fill="#1A1828" />
            <Circle  cx={MILO_W*0.345+3} cy={MILO_H*0.384-3} r={3}        fill="#FFFFFF" />
            <Circle  cx={MILO_W*0.345+1} cy={MILO_H*0.384+2} r={1.3}      fill="#FFFFFF" opacity={0.42} />
            <Ellipse cx={MILO_W*0.655} cy={MILO_H*0.384} rx={7.5} ry={9}  fill="#1A1828" />
            <Circle  cx={MILO_W*0.655+3} cy={MILO_H*0.384-3} r={3}        fill="#FFFFFF" />
            <Circle  cx={MILO_W*0.655+1} cy={MILO_H*0.384+2} r={1.3}      fill="#FFFFFF" opacity={0.42} />
          </Svg>
        </Animated.View>

        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scaleY: mouthAnim }] }]}>
          <Svg width={MILO_W} height={MILO_H} style={StyleSheet.absoluteFill}>
            {state === 'speaking' ? (
              <>
                <Ellipse cx={MILO_W/2} cy={MILO_H*0.628} rx={9} ry={7.5} fill="#1A1828" />
                <Ellipse cx={MILO_W/2} cy={MILO_H*0.628} rx={7} ry={5}   fill="#C06080" opacity={0.55} />
                <Ellipse cx={MILO_W/2} cy={MILO_H*0.613} rx={5.5} ry={2} fill="#FFFFFF" opacity={0.14} />
              </>
            ) : state === 'happy' ? (
              <Path d={`M${MILO_W*0.31},${MILO_H*0.575} Q${MILO_W*0.5},${MILO_H*0.745} ${MILO_W*0.69},${MILO_H*0.575}`}
                stroke="#1A1828" strokeWidth={2.8} fill="none" strokeLinecap="round" />
            ) : (
              <Path d={`M${MILO_W*0.28},${MILO_H*0.555} Q${MILO_W*0.5},${MILO_H*0.840} ${MILO_W*0.72},${MILO_H*0.555}`}
                stroke="#1A1828" strokeWidth={2.8} fill="none" strokeLinecap="round" />
            )}
          </Svg>
        </Animated.View>

        <View style={{ position: 'absolute', top: -28, left: MILO_W / 2 - 24, flexDirection: 'row', gap: 7 }}>
          <Animated.View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: '#9FE1CB', opacity: dot1 }} />
          <Animated.View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: '#9FE1CB', opacity: dot2 }} />
          <Animated.View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: '#9FE1CB', opacity: dot3 }} />
        </View>
      </Animated.View>

      {/* ═══ LAYER 7 — Milo legs ══════════════════════════════════════════════════ */}
      <Animated.View pointerEvents="none"
        style={{
          position: 'absolute',
          left: MILO_CENTER_X - 32,
          top:  MILO_CENTER_Y + MILO_H * 0.25,
          transform: [{ translateX: miloX }, { translateY: driftY }, { rotate: legRotL }],
        }}
      >
        <Svg width={22} height={42}>
          <Rect x={4} y={0} width={14} height={30} rx={7} fill="#9890D0" />
          <Ellipse cx={11} cy={14} rx={5} ry={3} fill="#FFFFFF" opacity={0.18} />
          <Ellipse cx={11} cy={32} rx={10} ry={7} fill="#8278C4" />
          <Ellipse cx={11} cy={32} rx={7}  ry={4} fill="#FFFFFF" opacity={0.14} />
        </Svg>
      </Animated.View>
      <Animated.View pointerEvents="none"
        style={{
          position: 'absolute',
          left: MILO_CENTER_X + 10,
          top:  MILO_CENTER_Y + MILO_H * 0.25,
          transform: [{ translateX: miloX }, { translateY: driftY }, { rotate: legRotR }],
        }}
      >
        <Svg width={22} height={42}>
          <Rect x={4} y={0} width={14} height={30} rx={7} fill="#9890D0" />
          <Ellipse cx={11} cy={14} rx={5} ry={3} fill="#FFFFFF" opacity={0.18} />
          <Ellipse cx={11} cy={32} rx={10} ry={7} fill="#8278C4" />
          <Ellipse cx={11} cy={32} rx={7}  ry={4} fill="#FFFFFF" opacity={0.14} />
        </Svg>
      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  root: { width, height, overflow: 'hidden', backgroundColor: '#08051A' },
});
