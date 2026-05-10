import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, Dimensions, StyleSheet } from 'react-native';
import Svg, {
  Circle, Ellipse, Path, Rect, Defs, LinearGradient, RadialGradient, Stop, G,
} from 'react-native-svg';
import { MiloState } from './useMiloSpeech';

// Animated SVG components for JS-thread color cycling
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedCircle  = Animated.createAnimatedComponent(Circle);
const AnimatedRect    = Animated.createAnimatedComponent(Rect);

const { width, height } = Dimensions.get('window');

// ── Layout constants ───────────────────────────────────────────────────────────
const STUMP_CX   = width / 2;
const STUMP_W    = 100;
const STUMP_H    = 112;
const STUMP_BASE = height * 0.648;
const STUMP_TOP  = STUMP_BASE - STUMP_H;
const MILO_W     = 118;
const MILO_H     = 104;
const MILO_CX    = STUMP_CX;
const MILO_CY    = STUMP_TOP - MILO_H * 0.28;
const GROUND_Y   = height * 0.636;
const SUN_X      = width * 0.81;
const SUN_Y      = height * 0.095;

// ── Pre-generated ambient data ─────────────────────────────────────────────────
const POLLEN = Array.from({ length: 9 }, (_, i) => ({
  x:      width * (0.10 + (i * 0.097) % 0.80),
  startY: GROUND_Y - 30 - (i * 43) % 170,
  size:   2.4 + (i % 3) * 1.1,
  dur:    5200 + (i * 1100) % 3200,
  delay:  (i * 750) % 4500,
}));

const PARROTS = [
  { y: height * 0.155, dur: 19000, startDelay: 0,    color: '#D32F2F', wing: '#FF7043', size: 1.00 },
  { y: height * 0.105, dur: 26000, startDelay: 5500,  color: '#2E7D32', wing: '#81C784', size: 0.76 },
  { y: height * 0.195, dur: 33000, startDelay: 11000, color: '#F57F17', wing: '#FFD54F', size: 0.84 },
];

// ── Ray geometry (computed once) ───────────────────────────────────────────────
type RayDef = { x1:number; y1:number; x2:number; y2:number; x3:number; y3:number };
const RAY_DEFS: RayDef[] = [215, 232, 248, 262, 200].map((deg, i) => {
  const rad  = (deg * Math.PI) / 180;
  const len  = height * (0.75 + i * 0.04);
  const hw   = 45 + i * 18;
  const perp = ((deg + 90) * Math.PI) / 180;
  const ex   = SUN_X + Math.cos(rad) * len;
  const ey   = SUN_Y + Math.sin(rad) * len;
  return {
    x1: SUN_X,                          y1: SUN_Y,
    x2: ex + Math.cos(perp) * hw,       y2: ey + Math.sin(perp) * hw,
    x3: ex - Math.cos(perp) * hw,       y3: ey - Math.sin(perp) * hw,
  };
});

interface Props { state: MiloState }

export default function MascotScene({ state }: Props) {

  // ── Animated values ────────────────────────────────────────────────────────
  // state-driven
  const breathAnim = useRef(new Animated.Value(0)).current;
  const blinkAnim  = useRef(new Animated.Value(1)).current;
  const legSwayL   = useRef(new Animated.Value(-1)).current;
  const legSwayR   = useRef(new Animated.Value(1)).current;
  const mouthAnim  = useRef(new Animated.Value(0.3)).current;
  const leanAnim   = useRef(new Animated.Value(1)).current;
  const dot1       = useRef(new Animated.Value(0)).current;
  const dot2       = useRef(new Animated.Value(0)).current;
  const dot3       = useRef(new Animated.Value(0)).current;
  // micro-animations
  const lookX        = useRef(new Animated.Value(0)).current;
  const scratchY     = useRef(new Animated.Value(0)).current;
  const headTiltAnim = useRef(new Animated.Value(0)).current;
  // ambient
  const rayOp      = useRef(new Animated.Value(0.08)).current;
  const cloud1X    = useRef(new Animated.Value(-190)).current;
  const cloud2X    = useRef(new Animated.Value(-310)).current;
  const cloud3X    = useRef(new Animated.Value(-110)).current;
  const parrotAnims = useRef(PARROTS.map(() => new Animated.Value(-80))).current;
  const pollenY    = useRef(POLLEN.map(() => new Animated.Value(0))).current;
  const pollenOp   = useRef(POLLEN.map(() => new Animated.Value(0))).current;
  // JS-thread color cycle (useNativeDriver: false required for color interpolation)
  const colorCycle = useRef(new Animated.Value(0)).current;

  // animation refs
  const breathRef  = useRef<Animated.CompositeAnimation | null>(null);
  const legRef     = useRef<Animated.CompositeAnimation | null>(null);
  const mouthRef   = useRef<Animated.CompositeAnimation | null>(null);
  const leanRef    = useRef<Animated.CompositeAnimation | null>(null);
  const dotsRef    = useRef<Animated.CompositeAnimation | null>(null);
  const blinkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const microTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unmounted  = useRef(false);

  // ── Ambient loops (mount only) ─────────────────────────────────────────────
  useEffect(() => {
    unmounted.current = false;

    // Light ray shimmer
    Animated.loop(Animated.sequence([
      Animated.timing(rayOp, { toValue: 0.16, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(rayOp, { toValue: 0.06, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])).start();

    // Clouds drift
    const driftCloud = (val: Animated.Value, dur: number, start: number) => {
      const go = () => {
        val.setValue(start);
        Animated.timing(val, { toValue: width + 240, duration: dur, easing: Easing.linear, useNativeDriver: true })
          .start(({ finished }) => { if (finished && !unmounted.current) go(); });
      };
      go();
    };
    driftCloud(cloud1X, 23000, -190);
    driftCloud(cloud2X, 31000, -310);
    driftCloud(cloud3X, 40000, -110);

    // Parrots fly across
    PARROTS.forEach((p, i) => {
      const go = () => {
        parrotAnims[i].setValue(-90);
        Animated.timing(parrotAnims[i], { toValue: width + 90, duration: p.dur, easing: Easing.linear, useNativeDriver: true })
          .start(({ finished }) => { if (finished && !unmounted.current) go(); });
      };
      setTimeout(go, p.startDelay);
    });

    // Pollen float up + fade
    POLLEN.forEach((p, i) => {
      const go = () => {
        pollenY[i].setValue(0);
        pollenOp[i].setValue(0);
        Animated.sequence([
          Animated.delay(p.delay + Math.random() * 800),
          Animated.parallel([
            Animated.timing(pollenY[i],  { toValue: -130, duration: p.dur, easing: Easing.out(Easing.quad), useNativeDriver: true }),
            Animated.sequence([
              Animated.timing(pollenOp[i], { toValue: 0.60, duration: p.dur * 0.18, useNativeDriver: true }),
              Animated.timing(pollenOp[i], { toValue: 0,    duration: p.dur * 0.82, useNativeDriver: true }),
            ]),
          ]),
        ]).start(({ finished }) => { if (finished && !unmounted.current) go(); });
      };
      go();
    });

    // Color cycle: lavender → teal → orange → lavender (9 s per lap)
    Animated.loop(
      Animated.timing(colorCycle, { toValue: 3, duration: 9000, easing: Easing.linear, useNativeDriver: false })
    ).start();

    return () => { unmounted.current = true; };
  }, []);

  // ── Blink ─────────────────────────────────────────────────────────────────
  const scheduleBlink = () => {
    blinkTimer.current = setTimeout(() => {
      if (unmounted.current) return;
      Animated.sequence([
        Animated.timing(blinkAnim, { toValue: 0.05, duration: 65,  useNativeDriver: true }),
        Animated.timing(blinkAnim, { toValue: 1,    duration: 65,  useNativeDriver: true }),
      ]).start(() => { if (!unmounted.current) scheduleBlink(); });
    }, 3000 + Math.random() * 2000);
  };
  const stopBlink = () => {
    if (blinkTimer.current) { clearTimeout(blinkTimer.current); blinkTimer.current = null; }
  };

  // ── Micro-animations (look around / head tilt / scratch) ─────────────────
  const scheduleMicro = () => {
    microTimer.current = setTimeout(() => {
      if (unmounted.current) return;
      const roll = Math.random();
      if (roll < 0.40) {
        const dir = Math.random() < 0.5 ? -7 : 6;
        Animated.sequence([
          Animated.timing(lookX, { toValue: dir, duration: 320, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.delay(700 + Math.random() * 700),
          Animated.timing(lookX, { toValue: 0,   duration: 320, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        ]).start(() => { if (!unmounted.current) scheduleMicro(); });
      } else if (roll < 0.75) {
        const tilt = Math.random() < 0.5 ? -1 : 1;
        Animated.sequence([
          Animated.timing(headTiltAnim, { toValue: tilt, duration: 420, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.delay(900 + Math.random() * 600),
          Animated.timing(headTiltAnim, { toValue: 0,    duration: 420, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        ]).start(() => { if (!unmounted.current) scheduleMicro(); });
      } else {
        Animated.sequence([
          Animated.timing(scratchY, { toValue: -16, duration: 180, useNativeDriver: true }),
          Animated.timing(scratchY, { toValue: -11, duration: 110, useNativeDriver: true }),
          Animated.timing(scratchY, { toValue: -16, duration: 110, useNativeDriver: true }),
          Animated.timing(scratchY, { toValue: -11, duration: 110, useNativeDriver: true }),
          Animated.timing(scratchY, { toValue: 0,   duration: 200, useNativeDriver: true }),
        ]).start(() => { if (!unmounted.current) scheduleMicro(); });
      }
    }, 4500 + Math.random() * 4000);
  };
  const stopMicro = () => {
    if (microTimer.current) { clearTimeout(microTimer.current); microTimer.current = null; }
    lookX.setValue(0);
    scratchY.setValue(0);
    headTiltAnim.setValue(0);
  };

  // ── State-driven animations ────────────────────────────────────────────────
  useEffect(() => {
    breathRef.current?.stop();
    legRef.current?.stop();
    mouthRef.current?.stop();
    leanRef.current?.stop();
    dotsRef.current?.stop();
    stopBlink();
    stopMicro();

    mouthAnim.setValue(0.3);
    leanAnim.setValue(1);
    dot1.setValue(0); dot2.setValue(0); dot3.setValue(0);
    blinkAnim.setValue(1);

    const breath = (dur: number) => Animated.loop(Animated.sequence([
      Animated.timing(breathAnim, { toValue: 1, duration: dur / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(breathAnim, { toValue: 0, duration: dur / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));

    const legLoop = (dur: number) => Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(legSwayL, { toValue: 1,  duration: dur / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(legSwayL, { toValue: -1, duration: dur / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(legSwayR, { toValue: -1, duration: dur / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(legSwayR, { toValue: 1,  duration: dur / 2, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      ])
    );

    if (state === 'idle') {
      breathRef.current = breath(3400); breathRef.current.start();
      legRef.current    = legLoop(2300); legRef.current.start();
      scheduleBlink();
      scheduleMicro();
    } else if (state === 'speaking') {
      breathRef.current = breath(1400); breathRef.current.start();
      mouthRef.current  = Animated.loop(Animated.sequence([
        Animated.timing(mouthAnim, { toValue: 1,    duration: 175, useNativeDriver: true }),
        Animated.timing(mouthAnim, { toValue: 0.22, duration: 175, useNativeDriver: true }),
      ]));
      mouthRef.current.start();
      scheduleBlink();
    } else if (state === 'listening') {
      leanRef.current = Animated.loop(Animated.sequence([
        Animated.timing(leanAnim, { toValue: 1.045, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(leanAnim, { toValue: 1,     duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]));
      leanRef.current.start();
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
      Animated.timing(blinkAnim, { toValue: 1.15, duration: 300, useNativeDriver: true }).start();
    } else if (state === 'happy') {
      breathRef.current = breath(950);  breathRef.current.start();
      legRef.current    = legLoop(750); legRef.current.start();
      scheduleBlink();
    }

    return () => {
      breathRef.current?.stop();
      legRef.current?.stop();
      mouthRef.current?.stop();
      leanRef.current?.stop();
      dotsRef.current?.stop();
      stopBlink();
      stopMicro();
    };
  }, [state]);

  // ── Derived interpolations ─────────────────────────────────────────────────
  const bodyScaleY = breathAnim.interpolate({ inputRange: [0, 1], outputRange: [1,     1.026] });
  const bodyTransY = breathAnim.interpolate({ inputRange: [0, 1], outputRange: [0,     -3]    });
  const legRotL     = legSwayL.interpolate({ inputRange: [-1, 1],  outputRange: ['-16deg', '16deg'] });
  const legRotR     = legSwayR.interpolate({ inputRange: [-1, 1],  outputRange: ['-16deg', '16deg'] });
  const headTiltRot = headTiltAnim.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-5deg', '0deg', '5deg'] });

  // Milo color cycle — lavender → soft teal → soft orange → lavender
  const CYCLE_IN  = [0, 1, 2, 3];
  const miloBase  = colorCycle.interpolate({ inputRange: CYCLE_IN, outputRange: ['#AFA9EC', '#7DCFC9', '#F4A878', '#AFA9EC'] });
  const miloMid   = colorCycle.interpolate({ inputRange: CYCLE_IN, outputRange: ['#9890D0', '#5BBAB4', '#E89060', '#9890D0'] });
  const miloLight = colorCycle.interpolate({ inputRange: CYCLE_IN, outputRange: ['#C5BFEE', '#9DDFDA', '#FAC8A0', '#C5BFEE'] });
  const miloDark  = colorCycle.interpolate({ inputRange: CYCLE_IN, outputRange: ['#8278C4', '#4BA8A2', '#D4784E', '#8278C4'] });

  // ════════════════════════════════════════════════════════════════════════════
  return (
    <View style={styles.root}>

      {/* ═══ LAYER 1 — Static background SVG ═══════════════════════════════════ */}
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          {/* Sky: cool blue top → warm honey at horizon */}
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0"    stopColor="#1A5FA8" stopOpacity="1" />
            <Stop offset="0.38" stopColor="#5598CC" stopOpacity="1" />
            <Stop offset="0.72" stopColor="#A8CDE8" stopOpacity="1" />
            <Stop offset="1"    stopColor="#EDD98A" stopOpacity="1" />
          </LinearGradient>
          {/* Ground */}
          <LinearGradient id="gBack" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#4B8C22" stopOpacity="1" />
            <Stop offset="1" stopColor="#2C5810" stopOpacity="1" />
          </LinearGradient>
          <LinearGradient id="gFront" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#5CA428" stopOpacity="1" />
            <Stop offset="1" stopColor="#386814" stopOpacity="1" />
          </LinearGradient>
          {/* Stump */}
          <LinearGradient id="stumpSide" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0"    stopColor="#52280A" stopOpacity="1" />
            <Stop offset="0.42" stopColor="#C47E1C" stopOpacity="1" />
            <Stop offset="0.70" stopColor="#A86A14" stopOpacity="1" />
            <Stop offset="1"    stopColor="#52280A" stopOpacity="1" />
          </LinearGradient>
          {/* Tree trunk */}
          <LinearGradient id="trunk" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0"   stopColor="#3E1E06" stopOpacity="1" />
            <Stop offset="0.3" stopColor="#7A3C0C" stopOpacity="1" />
            <Stop offset="1"   stopColor="#3E1E06" stopOpacity="1" />
          </LinearGradient>
          {/* Sun soft glow */}
          <RadialGradient id="sunGlow" cx={`${SUN_X}`} cy={`${SUN_Y}`} r="130"
            gradientUnits="userSpaceOnUse">
            <Stop offset="0"   stopColor="#FFF5B0" stopOpacity="0.60" />
            <Stop offset="0.4" stopColor="#FFD97A" stopOpacity="0.22" />
            <Stop offset="1"   stopColor="#FFD97A" stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Sky */}
        <Rect x={0} y={0} width={width} height={height} fill="url(#sky)" />
        {/* Sun glow halo */}
        <Ellipse cx={SUN_X} cy={SUN_Y} rx={130} ry={130} fill="url(#sunGlow)" />
        {/* Sun disc */}
        <Circle cx={SUN_X} cy={SUN_Y} r={30} fill="#FFE566" opacity={0.95} />
        <Circle cx={SUN_X} cy={SUN_Y} r={22} fill="#FFF5B0" opacity={1} />
        {/* Inner shimmer */}
        <Circle cx={SUN_X - 5} cy={SUN_Y - 5} r={8} fill="#FFFFFF" opacity={0.30} />

        {/* ── Far background trees (desaturated for depth) ── */}
        {/* Far-left cluster */}
        <Rect x={-6}  y={height*0.38} width={10} height={height*0.28} rx={3} fill="#3D5A1C" opacity={0.55} />
        <Ellipse cx={-1}  cy={height*0.355} rx={22} ry={29} fill="#2E4D14" opacity={0.50} />
        <Rect x={30}  y={height*0.41} width={9}  height={height*0.23} rx={3} fill="#3D5A1C" opacity={0.48} />
        <Ellipse cx={34}  cy={height*0.39}  rx={18} ry={23} fill="#3A5A1A" opacity={0.44} />
        {/* Far-right cluster */}
        <Rect x={width-14} y={height*0.38} width={10} height={height*0.28} rx={3} fill="#3D5A1C" opacity={0.55} />
        <Ellipse cx={width-9}  cy={height*0.355} rx={22} ry={29} fill="#2E4D14" opacity={0.50} />
        <Rect x={width-42}  y={height*0.42} width={9} height={height*0.22} rx={3} fill="#3D5A1C" opacity={0.48} />
        <Ellipse cx={width-38} cy={height*0.40}  rx={18} ry={22} fill="#3A5A1A" opacity={0.44} />

        {/* ── Back hill ── */}
        <Path
          d={`M0,${height*0.61} Q${width*0.15},${height*0.46} ${width*0.33},${height*0.53} Q${width*0.52},${height*0.61} ${width*0.70},${height*0.48} Q${width*0.86},${height*0.38} ${width},${height*0.49} L${width},${height} L0,${height} Z`}
          fill="url(#gBack)"
        />

        {/* ── Main ground ── */}
        <Path
          d={`M0,${GROUND_Y+2} Q${width*0.20},${GROUND_Y-14} ${width*0.42},${GROUND_Y} Q${width*0.62},${GROUND_Y+14} ${width*0.82},${GROUND_Y-6} Q${width*0.93},${GROUND_Y-10} ${width},${GROUND_Y} L${width},${height} L0,${height} Z`}
          fill="url(#gFront)"
        />

        {/* ── Left frame tree (large, close, frames scene) ── */}
        <Rect x={-2} y={height*0.26} width={20} height={height*0.40} rx={6} fill="url(#trunk)" />
        {/* Shadow side */}
        <Rect x={-2} y={height*0.26} width={7}  height={height*0.40} rx={6} fill="#1E0E04" opacity={0.40} />
        {/* Light catch */}
        <Rect x={9}  y={height*0.28} width={5}  height={height*0.36} rx={3} fill="#C87830" opacity={0.12} />
        {/* Foliage — layered for depth */}
        <Ellipse cx={16}  cy={height*0.215} rx={54} ry={60} fill="#244E0E" />
        <Ellipse cx={16}  cy={height*0.175} rx={44} ry={50} fill="#2E6612" />
        <Ellipse cx={10}  cy={height*0.140} rx={35} ry={40} fill="#388018" />
        {/* Sunlit highlight patch */}
        <Ellipse cx={26}  cy={height*0.135} rx={18} ry={14} fill="#52A022" opacity={0.60} />
        <Ellipse cx={30}  cy={height*0.130} rx={10} ry={8}  fill="#6FC030" opacity={0.35} />

        {/* ── Right frame tree ── */}
        <Rect x={width-18} y={height*0.24} width={20} height={height*0.42} rx={6} fill="url(#trunk)" />
        <Rect x={width-10} y={height*0.24} width={8}  height={height*0.42} rx={6} fill="#1E0E04" opacity={0.40} />
        <Rect x={width-18} y={height*0.26} width={5}  height={height*0.38} rx={3} fill="#C87830" opacity={0.12} />
        <Ellipse cx={width-14} cy={height*0.195} rx={56} ry={62} fill="#244E0E" />
        <Ellipse cx={width-14} cy={height*0.155} rx={46} ry={52} fill="#2E6612" />
        <Ellipse cx={width-10} cy={height*0.120} rx={36} ry={42} fill="#388018" />
        <Ellipse cx={width-22} cy={height*0.115} rx={17} ry={13} fill="#52A022" opacity={0.60} />
        <Ellipse cx={width-26} cy={height*0.110} rx={9}  ry={7}  fill="#6FC030" opacity={0.35} />

        {/* ── Ground foliage: grass blades (left) ── */}
        <Path d={`M${width*0.165},${GROUND_Y+4} C${width*0.158},${GROUND_Y-20} ${width*0.170},${GROUND_Y-26} ${width*0.174},${GROUND_Y-30}`} stroke="#4A8C22" strokeWidth={2.8} fill="none" strokeLinecap="round" />
        <Path d={`M${width*0.196},${GROUND_Y+4} C${width*0.191},${GROUND_Y-16} ${width*0.202},${GROUND_Y-21} ${width*0.210},${GROUND_Y-24}`} stroke="#58A228" strokeWidth={2.2} fill="none" strokeLinecap="round" />
        <Path d={`M${width*0.224},${GROUND_Y+4} C${width*0.228},${GROUND_Y-12} ${width*0.220},${GROUND_Y-17} ${width*0.214},${GROUND_Y-20}`} stroke="#4A8C22" strokeWidth={2.2} fill="none" strokeLinecap="round" />
        {/* Grass right */}
        <Path d={`M${width*0.762},${GROUND_Y+4} C${width*0.756},${GROUND_Y-18} ${width*0.768},${GROUND_Y-23} ${width*0.774},${GROUND_Y-27}`} stroke="#4A8C22" strokeWidth={2.8} fill="none" strokeLinecap="round" />
        <Path d={`M${width*0.798},${GROUND_Y+4} C${width*0.793},${GROUND_Y-14} ${width*0.804},${GROUND_Y-19} ${width*0.811},${GROUND_Y-22}`} stroke="#58A228" strokeWidth={2.2} fill="none" strokeLinecap="round" />
        <Path d={`M${width*0.830},${GROUND_Y+4} C${width*0.836},${GROUND_Y-10} ${width*0.828},${GROUND_Y-14} ${width*0.820},${GROUND_Y-18}`} stroke="#4A8C22" strokeWidth={2.2} fill="none" strokeLinecap="round" />

        {/* ── Small ground plants ── */}
        <Path d={`M${width*0.12},${GROUND_Y+2} C${width*0.113},${GROUND_Y-22} ${width*0.118},${GROUND_Y-28} ${width*0.122},${GROUND_Y-32}`} stroke="#357015" strokeWidth={3.2} fill="none" strokeLinecap="round" />
        <Ellipse cx={width*0.120} cy={GROUND_Y-33} rx={9}  ry={5.5} fill="#3C8A18" opacity={0.88} />
        <Ellipse cx={width*0.132} cy={GROUND_Y-27} rx={7}  ry={4.5} fill="#52A022" opacity={0.75} />
        <Path d={`M${width*0.875},${GROUND_Y+2} C${width*0.880},${GROUND_Y-20} ${width*0.873},${GROUND_Y-25} ${width*0.869},${GROUND_Y-29}`} stroke="#357015" strokeWidth={3.2} fill="none" strokeLinecap="round" />
        <Ellipse cx={width*0.872} cy={GROUND_Y-30} rx={9}  ry={5.5} fill="#3C8A18" opacity={0.88} />
        <Ellipse cx={width*0.860} cy={GROUND_Y-24} rx={7}  ry={4.5} fill="#52A022" opacity={0.75} />

        {/* ── Flowers ── */}
        {/* Left flowers */}
        <Rect x={width*0.26}  y={GROUND_Y-22} width={3} height={24} rx={1.5} fill="#4A8C22" />
        <Circle cx={width*0.261} cy={GROUND_Y-24} r={9}  fill="#F4A0C0" />
        <Circle cx={width*0.261} cy={GROUND_Y-24} r={4.5} fill="#FFE8F0" />
        <Rect x={width*0.30}  y={GROUND_Y-16} width={3} height={18} rx={1.5} fill="#4A8C22" />
        <Circle cx={width*0.301} cy={GROUND_Y-18} r={7}  fill="#B39DDB" />
        <Circle cx={width*0.301} cy={GROUND_Y-18} r={3.5} fill="#EDE8FF" />
        {/* Right flowers */}
        <Rect x={width*0.68}  y={GROUND_Y-20} width={3} height={22} rx={1.5} fill="#4A8C22" />
        <Circle cx={width*0.681} cy={GROUND_Y-22} r={8.5} fill="#FFD54F" />
        <Circle cx={width*0.681} cy={GROUND_Y-22} r={4}   fill="#FFFDE7" />
        <Rect x={width*0.72}  y={GROUND_Y-14} width={3} height={16} rx={1.5} fill="#4A8C22" />
        <Circle cx={width*0.721} cy={GROUND_Y-16} r={6.5} fill="#80DEEA" />
        <Circle cx={width*0.721} cy={GROUND_Y-16} r={3}   fill="#E0FAFC" />

        {/* ── Ground mushrooms ── */}
        <Rect x={width*0.332} y={GROUND_Y} width={12} height={14} rx={3} fill="#EDE8DC" />
        <Ellipse cx={width*0.338} cy={GROUND_Y}   rx={17} ry={9}  fill="#C62828" />
        <Circle  cx={width*0.330} cy={GROUND_Y-2} r={2.8} fill="#FFFFFF" opacity={0.85} />
        <Circle  cx={width*0.346} cy={GROUND_Y-1} r={2}   fill="#FFFFFF" opacity={0.85} />
        <Rect x={width*0.638} y={GROUND_Y+1} width={10} height={11} rx={2.5} fill="#EDE8DC" />
        <Ellipse cx={width*0.643} cy={GROUND_Y+1} rx={14} ry={7.5} fill="#D81B60" />
        <Circle  cx={width*0.636} cy={GROUND_Y-1} r={2.2} fill="#FFFFFF" opacity={0.85} />

        {/* ── Ground shadow under stump ── */}
        <Ellipse cx={STUMP_CX} cy={STUMP_BASE+8} rx={58} ry={11} fill="#000000" opacity={0.12} />

        {/* ══ STUMP ══════════════════════════════════════════════════════════════ */}
        {/* Body */}
        <Rect x={STUMP_CX - STUMP_W/2} y={STUMP_TOP + 9} width={STUMP_W} height={STUMP_H + 2} rx={8} fill="url(#stumpSide)" />
        {/* Dark shadow side (left) */}
        <Rect x={STUMP_CX - STUMP_W/2} y={STUMP_TOP + 9} width={18} height={STUMP_H + 2} rx={8} fill="#2A1004" opacity={0.28} />
        {/* Subtle light streak (right of center) */}
        <Rect x={STUMP_CX + 8} y={STUMP_TOP + 16} width={7} height={STUMP_H - 12} rx={3.5} fill="#FFFFFF" opacity={0.055} />
        {/* Bark lines */}
        <Path d={`M${STUMP_CX-STUMP_W/2+14},${STUMP_TOP+16} Q${STUMP_CX-STUMP_W/2+12},${STUMP_BASE-22} ${STUMP_CX-STUMP_W/2+16},${STUMP_BASE+2}`} stroke="#3A1808" strokeWidth={1.6} strokeOpacity={0.30} fill="none" />
        <Path d={`M${STUMP_CX+2},${STUMP_TOP+12} Q${STUMP_CX+4},${STUMP_BASE-28} ${STUMP_CX},${STUMP_BASE+2}`} stroke="#3A1808" strokeWidth={1.5} strokeOpacity={0.28} fill="none" />
        <Path d={`M${STUMP_CX+STUMP_W/2-16},${STUMP_TOP+16} Q${STUMP_CX+STUMP_W/2-14},${STUMP_BASE-24} ${STUMP_CX+STUMP_W/2-18},${STUMP_BASE+2}`} stroke="#3A1808" strokeWidth={1.3} strokeOpacity={0.28} fill="none" />
        {/* Top face */}
        <Ellipse cx={STUMP_CX} cy={STUMP_TOP + 10} rx={STUMP_W/2}    ry={11}   fill="#7A4610" />
        <Ellipse cx={STUMP_CX} cy={STUMP_TOP + 10} rx={STUMP_W/2}    ry={11}   fill="none" stroke="#E8A040" strokeWidth={1} strokeOpacity={0.20} />
        {/* Tree rings */}
        <Ellipse cx={STUMP_CX} cy={STUMP_TOP + 10} rx={STUMP_W/2-10} ry={7.5}  fill="none" stroke="#5A2E08" strokeWidth={0.9} strokeOpacity={0.45} />
        <Ellipse cx={STUMP_CX} cy={STUMP_TOP + 10} rx={STUMP_W/2-21} ry={5}    fill="none" stroke="#5A2E08" strokeWidth={0.9} strokeOpacity={0.45} />
        <Ellipse cx={STUMP_CX} cy={STUMP_TOP + 10} rx={STUMP_W/2-31} ry={2.8}  fill="none" stroke="#5A2E08" strokeWidth={0.7} strokeOpacity={0.40} />
        {/* Sunlit sheen on top */}
        <Ellipse cx={STUMP_CX + 8} cy={STUMP_TOP + 8} rx={18} ry={6} fill="#FFFFFF" opacity={0.10} />
        {/* Moss patches on top */}
        <Ellipse cx={STUMP_CX - 14} cy={STUMP_TOP + 8}  rx={10} ry={4.5} fill="#4A8C22" opacity={0.52} />
        <Ellipse cx={STUMP_CX + 18} cy={STUMP_TOP + 9}  rx={8}  ry={3.5} fill="#5AA028" opacity={0.48} />
        <Ellipse cx={STUMP_CX + 5}  cy={STUMP_TOP + 11} rx={6}  ry={2.5} fill="#4A8C22" opacity={0.40} />

        {/* Stump mushrooms (left side) */}
        <Rect x={STUMP_CX-STUMP_W/2-4} y={STUMP_BASE-28} width={9}  height={18} rx={3}   fill="#EDE8DC" />
        <Ellipse cx={STUMP_CX-STUMP_W/2+1} cy={STUMP_BASE-28} rx={15} ry={8}   fill="#D81B60" />
        <Circle  cx={STUMP_CX-STUMP_W/2-3} cy={STUMP_BASE-30} r={2.2} fill="#FFF" opacity={0.85} />
        <Circle  cx={STUMP_CX-STUMP_W/2+6} cy={STUMP_BASE-29} r={1.7} fill="#FFF" opacity={0.85} />
        {/* Stump mushrooms (right side) */}
        <Rect x={STUMP_CX+STUMP_W/2-5} y={STUMP_BASE-34} width={8}  height={14} rx={2.5} fill="#EDE8DC" />
        <Ellipse cx={STUMP_CX+STUMP_W/2-1} cy={STUMP_BASE-34} rx={13} ry={7}   fill="#C62828" />
        <Circle  cx={STUMP_CX+STUMP_W/2-5} cy={STUMP_BASE-36} r={1.8} fill="#FFF" opacity={0.85} />
        {/* Stump top sprout */}
        <Path d={`M${STUMP_CX+24},${STUMP_TOP+6} C${STUMP_CX+28},${STUMP_TOP-10} ${STUMP_CX+33},${STUMP_TOP-15} ${STUMP_CX+31},${STUMP_TOP-20}`} stroke="#4A8C22" strokeWidth={2.8} fill="none" strokeLinecap="round" />
        <Ellipse cx={STUMP_CX+30} cy={STUMP_TOP-21} rx={7} ry={4.5} fill="#58A228" opacity={0.92} />

        {/* Milo ground shadow */}
        <Ellipse cx={MILO_CX} cy={STUMP_TOP + 14} rx={38} ry={7} fill="#000000" opacity={0.09} />
      </Svg>

      {/* ═══ LAYER 2 — Light rays (animated opacity) ═══════════════════════════ */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: rayOp }]} pointerEvents="none">
        <Svg width={width} height={height}>
          {RAY_DEFS.map((r, i) => (
            <Path key={i}
              d={`M${r.x1},${r.y1} L${r.x2},${r.y2} L${r.x3},${r.y3} Z`}
              fill="#FFE8A0"
              opacity={0.55}
            />
          ))}
        </Svg>
      </Animated.View>

      {/* ═══ LAYER 3 — Clouds ═══════════════════════════════════════════════════ */}
      {([
        { anim: cloud1X, top: height * 0.055, s: 1.00 },
        { anim: cloud2X, top: height * 0.120, s: 0.72 },
        { anim: cloud3X, top: height * 0.030, s: 0.86 },
      ] as const).map(({ anim, top, s }, i) => (
        <Animated.View key={i} style={{ position: 'absolute', top, transform: [{ translateX: anim }] }} pointerEvents="none">
          <Svg width={170 * s} height={66 * s}>
            <G>
              <Ellipse cx={85*s}  cy={42*s} rx={54*s} ry={23*s} fill="rgba(255,255,255,0.86)" />
              <Ellipse cx={54*s}  cy={39*s} rx={34*s} ry={22*s} fill="rgba(255,255,255,0.86)" />
              <Ellipse cx={116*s} cy={39*s} rx={30*s} ry={20*s} fill="rgba(255,255,255,0.86)" />
              <Ellipse cx={85*s}  cy={28*s} rx={42*s} ry={24*s} fill="rgba(255,255,255,0.90)" />
              <Ellipse cx={80*s}  cy={22*s} rx={24*s} ry={16*s} fill="rgba(255,255,255,0.94)" />
            </G>
          </Svg>
        </Animated.View>
      ))}

      {/* ═══ LAYER 4 — Parrots ══════════════════════════════════════════════════ */}
      {PARROTS.map((p, i) => {
        const s = p.size;
        return (
          <Animated.View key={i} pointerEvents="none"
            style={{ position: 'absolute', top: p.y, transform: [{ translateX: parrotAnims[i] }] }}
          >
            <Svg width={46*s} height={28*s}>
              {/* Wing (upper) */}
              <Path d={`M${15*s},${13*s} Q${20*s},${2*s} ${28*s},${11*s} Q${24*s},${14*s} ${15*s},${15*s}`} fill={p.wing} />
              {/* Body */}
              <Ellipse cx={21*s} cy={16*s} rx={13*s} ry={8*s} fill={p.color} />
              {/* Head */}
              <Circle  cx={32*s} cy={13*s} r={7*s}   fill={p.color} />
              {/* Head highlight */}
              <Ellipse cx={30*s} cy={11*s} rx={3*s}  ry={2*s} fill="#FFFFFF" opacity={0.20} />
              {/* Beak */}
              <Path d={`M${38*s},${13*s} L${46*s},${14.5*s} L${38*s},${16*s} Z`} fill="#E89A10" />
              {/* Eye */}
              <Circle cx={33.5*s} cy={12*s} r={2.5*s} fill="#FFFFFF" />
              <Circle cx={33.5*s} cy={12*s} r={1.2*s} fill="#111111" />
              {/* Tail feathers */}
              <Path d={`M${8*s},${15*s} L${0},${11*s} L${7*s},${19*s} Z`} fill={p.wing} />
              <Path d={`M${8*s},${16*s} L${2*s},${22*s} L${10*s},${20*s} Z`} fill={p.wing} opacity={0.75} />
            </Svg>
          </Animated.View>
        );
      })}

      {/* ═══ LAYER 5 — Pollen / dust particles ══════════════════════════════════ */}
      {POLLEN.map((p, i) => (
        <Animated.View key={i} pointerEvents="none"
          style={{
            position: 'absolute',
            left:  p.x - p.size,
            top:   p.startY - p.size,
            width: p.size * 2,
            height:p.size * 2,
            borderRadius: p.size,
            backgroundColor: '#FFE08A',
            opacity: pollenOp[i],
            transform: [{ translateY: pollenY[i] }],
          }}
        />
      ))}

      {/* ═══ LAYER 6 — Milo body ═════════════════════════════════════════════════ */}
      <Animated.View pointerEvents="none"
        style={{
          position: 'absolute',
          left:   MILO_CX - MILO_W / 2,
          top:    MILO_CY - MILO_H / 2,
          width:  MILO_W,
          height: MILO_H + 32,
          transform: [{ scaleY: leanAnim }, { scaleY: bodyScaleY }, { translateY: bodyTransY }, { rotate: headTiltRot }],
        }}
      >
        <Svg width={MILO_W} height={MILO_H + 32}>
          {/* Drop shadow */}
          <Ellipse cx={MILO_W/2+3} cy={MILO_H*0.50} rx={MILO_W*0.44} ry={MILO_H*0.43} fill="#000000" opacity={0.10} />
          {/* Ear nubs (behind body) */}
          <AnimatedEllipse cx={MILO_W*0.21} cy={MILO_H*0.16} rx={10}  ry={8}   fill={miloLight} />
          <Ellipse          cx={MILO_W*0.21} cy={MILO_H*0.16} rx={5.5} ry={4}   fill="#FFFFFF" opacity={0.35} />
          <AnimatedEllipse cx={MILO_W*0.79} cy={MILO_H*0.16} rx={10}  ry={8}   fill={miloLight} />
          <Ellipse          cx={MILO_W*0.79} cy={MILO_H*0.16} rx={5.5} ry={4}   fill="#FFFFFF" opacity={0.35} />
          {/* Left arm */}
          <AnimatedEllipse cx={MILO_W*0.11} cy={MILO_H*0.58} rx={11}  ry={7.5} fill={miloMid} />
          <AnimatedCircle  cx={MILO_W*0.06} cy={MILO_H*0.61} r={6}             fill={miloMid} />
          {/* Right arm base */}
          <AnimatedEllipse cx={MILO_W*0.89} cy={MILO_H*0.58} rx={11}  ry={7.5} fill={miloMid} />
          <AnimatedCircle  cx={MILO_W*0.94} cy={MILO_H*0.61} r={6}             fill={miloMid} />
          {/* Main body */}
          <AnimatedEllipse cx={MILO_W/2} cy={MILO_H*0.46} rx={MILO_W*0.46} ry={MILO_H*0.44} fill={miloBase} />
          {/* Bottom-right shadow overlay for 2.5D depth */}
          <Ellipse cx={MILO_W/2+10} cy={MILO_H*0.56} rx={MILO_W*0.36} ry={MILO_H*0.34} fill="#000000" opacity={0.10} />
          {/* Belly soft highlight */}
          <Ellipse cx={MILO_W/2}    cy={MILO_H*0.58} rx={MILO_W*0.28} ry={MILO_H*0.18} fill="#FFFFFF" opacity={0.18} />
          {/* Top-left sheen */}
          <Ellipse cx={MILO_W*0.32} cy={MILO_H*0.25} rx={16} ry={11}                    fill="#FFFFFF" opacity={0.24} />
          {/* Cheeks */}
          <Circle cx={MILO_W*0.21} cy={MILO_H*0.56} r={12} fill="#F4A0C0" opacity={0.50} />
          <Circle cx={MILO_W*0.79} cy={MILO_H*0.56} r={12} fill="#F4A0C0" opacity={0.50} />
        </Svg>

        {/* Eyes — blink (scaleY) + look (translateX) */}
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scaleY: blinkAnim }, { translateX: lookX }] }]}>
          <Svg width={MILO_W} height={MILO_H} style={StyleSheet.absoluteFill}>
            {/* Eyebrows */}
            <Path d={`M${MILO_W*0.27},${MILO_H*0.264} Q${MILO_W*0.35},${MILO_H*0.235} ${MILO_W*0.43},${MILO_H*0.264}`} stroke="#5050A0" strokeWidth={2.2} fill="none" strokeLinecap="round" opacity={0.55} />
            <Path d={`M${MILO_W*0.57},${MILO_H*0.264} Q${MILO_W*0.65},${MILO_H*0.235} ${MILO_W*0.73},${MILO_H*0.264}`} stroke="#5050A0" strokeWidth={2.2} fill="none" strokeLinecap="round" opacity={0.55} />
            {/* Left eye */}
            <Ellipse cx={MILO_W*0.345} cy={MILO_H*0.384} rx={8}   ry={9.5} fill="#1A1828" />
            <Circle  cx={MILO_W*0.345+3.5} cy={MILO_H*0.384-3.5} r={3.2}  fill="#FFFFFF" />
            <Circle  cx={MILO_W*0.345+1}   cy={MILO_H*0.384+2}   r={1.4}  fill="#FFFFFF" opacity={0.45} />
            {/* Right eye */}
            <Ellipse cx={MILO_W*0.655} cy={MILO_H*0.384} rx={8}   ry={9.5} fill="#1A1828" />
            <Circle  cx={MILO_W*0.655+3.5} cy={MILO_H*0.384-3.5} r={3.2}  fill="#FFFFFF" />
            <Circle  cx={MILO_W*0.655+1}   cy={MILO_H*0.384+2}   r={1.4}  fill="#FFFFFF" opacity={0.45} />
          </Svg>
        </Animated.View>

        {/* Mouth — scaleY pulse when speaking */}
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scaleY: mouthAnim }] }]}>
          <Svg width={MILO_W} height={MILO_H} style={StyleSheet.absoluteFill}>
            {state === 'speaking' ? (
              <>
                <Ellipse cx={MILO_W/2} cy={MILO_H*0.628} rx={9.5} ry={8}  fill="#1A1828" />
                <Ellipse cx={MILO_W/2} cy={MILO_H*0.628} rx={7.5} ry={5}  fill="#C06080" opacity={0.55} />
                <Ellipse cx={MILO_W/2} cy={MILO_H*0.613} rx={6}   ry={2}  fill="#FFFFFF" opacity={0.14} />
              </>
            ) : state === 'happy' ? (
              <Path d={`M${MILO_W*0.31},${MILO_H*0.575} Q${MILO_W*0.5},${MILO_H*0.745} ${MILO_W*0.69},${MILO_H*0.575}`}
                stroke="#1A1828" strokeWidth={2.8} fill="none" strokeLinecap="round" />
            ) : (
              // Default idle/listening smile — wide and genuinely happy
              <Path d={`M${MILO_W*0.28},${MILO_H*0.555} Q${MILO_W*0.5},${MILO_H*0.840} ${MILO_W*0.72},${MILO_H*0.555}`}
                stroke="#1A1828" strokeWidth={2.8} fill="none" strokeLinecap="round" />
            )}
          </Svg>
        </Animated.View>

        {/* Listening dots */}
        <View style={{ position: 'absolute', top: -28, left: MILO_W / 2 - 24, flexDirection: 'row', gap: 7 }}>
          <Animated.View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: '#AFA9EC', opacity: dot1 }} />
          <Animated.View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: '#AFA9EC', opacity: dot2 }} />
          <Animated.View style={{ width: 9, height: 9, borderRadius: 4.5, backgroundColor: '#AFA9EC', opacity: dot3 }} />
        </View>
      </Animated.View>

      {/* ═══ LAYER 7 — Scratch arm (micro-animation) ══════════════════════════ */}
      <Animated.View pointerEvents="none"
        style={{
          position: 'absolute',
          left: MILO_CX + MILO_W * 0.36,
          top:  MILO_CY - MILO_H * 0.04,
          transform: [{ translateY: scratchY }],
        }}
      >
        <Svg width={26} height={26}>
          <AnimatedEllipse cx={10} cy={15} rx={9}   ry={6.5} fill={miloMid} />
          <AnimatedCircle  cx={5}  cy={20} r={5.5}           fill={miloMid} />
        </Svg>
      </Animated.View>

      {/* ═══ LAYER 8 — Legs ════════════════════════════════════════════════════ */}
      <Animated.View pointerEvents="none"
        style={{
          position: 'absolute',
          left:  MILO_CX - 32,
          top:   MILO_CY + MILO_H * 0.25,
          transform: [{ rotate: legRotL }],
        }}
      >
        <Svg width={22} height={42}>
          <AnimatedRect x={4} y={0} width={14} height={30} rx={7} fill={miloMid} />
          <Ellipse cx={11} cy={14} rx={5}  ry={3} fill="#FFFFFF" opacity={0.18} />
          <AnimatedEllipse cx={11} cy={32} rx={10} ry={7} fill={miloDark} />
          <Ellipse         cx={11} cy={32} rx={7}  ry={4} fill="#FFFFFF"  opacity={0.14} />
        </Svg>
      </Animated.View>
      <Animated.View pointerEvents="none"
        style={{
          position: 'absolute',
          left:  MILO_CX + 10,
          top:   MILO_CY + MILO_H * 0.25,
          transform: [{ rotate: legRotR }],
        }}
      >
        <Svg width={22} height={42}>
          <AnimatedRect x={4} y={0} width={14} height={30} rx={7} fill={miloMid} />
          <Ellipse cx={11} cy={14} rx={5}  ry={3} fill="#FFFFFF" opacity={0.18} />
          <AnimatedEllipse cx={11} cy={32} rx={10} ry={7} fill={miloDark} />
          <Ellipse         cx={11} cy={32} rx={7}  ry={4} fill="#FFFFFF"  opacity={0.14} />
        </Svg>
      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  root: { width, height, overflow: 'hidden', backgroundColor: '#1A5FA8' },
});
