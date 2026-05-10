/**
 * This screen will eventually be triggered remotely when a clinician schedules
 * a call from the doctor dashboard. The "Test Call" button on HomeScreen is
 * temporary for demo and development purposes only.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Ellipse, Circle } from 'react-native-svg';
import MascotScene from '@/components/mascot/MascotScene';
import { RootStackParamList } from '@/navigation/types';
import { useCheckinStore } from '@/store/checkinStore';
import { useCheckin } from '@/hooks/useCheckin';

const { height } = Dimensions.get('window');
const AVATAR_SIZE = 116;

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ── Milo face profile picture ─────────────────────────────────────────────────
function MiloFace({ size }: { size: number }) {
  // Draws Milo's face scaled into a `size`×`size` box.
  // Colors match his idle lavender palette from MascotScene.
  const s = size / 96; // scale factor from 96-unit viewbox to target size
  const cx = 48 * s, cy = 54 * s;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Ear nubs (behind body) */}
      <Ellipse cx={18*s} cy={24*s} rx={10*s} ry={8*s}  fill="#C5BFEE" />
      <Ellipse cx={18*s} cy={24*s} rx={5.5*s} ry={4*s} fill="#fff" opacity={0.32} />
      <Ellipse cx={78*s} cy={24*s} rx={10*s} ry={8*s}  fill="#C5BFEE" />
      <Ellipse cx={78*s} cy={24*s} rx={5.5*s} ry={4*s} fill="#fff" opacity={0.32} />

      {/* Main body */}
      <Ellipse cx={cx} cy={cy} rx={42*s} ry={40*s} fill="#AFA9EC" />

      {/* Depth shadow */}
      <Ellipse cx={cx+6*s} cy={cy+8*s} rx={32*s} ry={28*s} fill="#000" opacity={0.09} />

      {/* Belly soft highlight */}
      <Ellipse cx={cx} cy={cy+12*s} rx={24*s} ry={14*s} fill="#fff" opacity={0.17} />

      {/* Top-left sheen */}
      <Ellipse cx={cx-13*s} cy={cy-18*s} rx={15*s} ry={10*s} fill="#fff" opacity={0.22} />

      {/* Cheeks */}
      <Circle cx={20*s} cy={60*s} r={11*s} fill="#F4A0C0" opacity={0.50} />
      <Circle cx={76*s} cy={60*s} r={11*s} fill="#F4A0C0" opacity={0.50} />

      {/* Eyebrows */}
      <Path
        d={`M${27*s},${30*s} Q${35*s},${26.5*s} ${43*s},${30*s}`}
        stroke="#5050A0" strokeWidth={2.2*s} fill="none" strokeLinecap="round" opacity={0.55}
      />
      <Path
        d={`M${53*s},${30*s} Q${61*s},${26.5*s} ${69*s},${30*s}`}
        stroke="#5050A0" strokeWidth={2.2*s} fill="none" strokeLinecap="round" opacity={0.55}
      />

      {/* Left eye */}
      <Ellipse cx={35*s} cy={41*s} rx={7.5*s} ry={9*s} fill="#1A1828" />
      <Circle  cx={38*s} cy={37.5*s} r={3*s}           fill="#fff" />
      <Circle  cx={36*s} cy={43*s}   r={1.3*s}         fill="#fff" opacity={0.42} />

      {/* Right eye */}
      <Ellipse cx={61*s} cy={41*s} rx={7.5*s} ry={9*s} fill="#1A1828" />
      <Circle  cx={64*s} cy={37.5*s} r={3*s}           fill="#fff" />
      <Circle  cx={62*s} cy={43*s}   r={1.3*s}         fill="#fff" opacity={0.42} />

      {/* Idle big smile */}
      <Path
        d={`M${27*s},${58*s} Q${48*s},${82*s} ${69*s},${58*s}`}
        stroke="#1A1828" strokeWidth={2.8*s} fill="none" strokeLinecap="round"
      />
    </Svg>
  );
}

// ── Haptic ringtone pattern ────────────────────────────────────────────────────
async function hapticRingOnce() {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  await new Promise(r => setTimeout(r, 80));
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  await new Promise(r => setTimeout(r, 100));
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
  await new Promise(r => setTimeout(r, 80));
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid);
}

// ── Pulse ring ────────────────────────────────────────────────────────────────
function PulseRing({ delayMs, size }: { delayMs: number; size: number }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let running = true;
    function pulse() {
      if (!running) return;
      scale.setValue(1);
      opacity.setValue(0.65);
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 2.9,
          duration: 2200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 2200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => { if (finished && running) pulse(); });
    }
    const t = setTimeout(pulse, delayMs);
    return () => {
      running = false;
      clearTimeout(t);
      scale.stopAnimation();
      opacity.stopAnimation();
    };
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.pulseRing,
        { width: size, height: size, borderRadius: size / 2 },
        { transform: [{ scale }], opacity },
      ]}
    />
  );
}

// ── Phone icon ────────────────────────────────────────────────────────────────
function PhoneIcon({ rotated }: { rotated?: boolean }) {
  return (
    <View style={rotated ? { transform: [{ rotate: '135deg' }] } : undefined}>
      <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
        <Path
          d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"
          fill="#fff"
        />
      </Svg>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export function IncomingCallScreen() {
  const navigation = useNavigation<Nav>();
  const { setMoodScore } = useCheckinStore();
  const { initSession } = useCheckin();
  const [elapsed, setElapsed] = useState(0);
  const soundRef = useRef<Audio.Sound | null>(null);
  const hapticLoopRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const slideY = useRef(new Animated.Value(0)).current;

  async function runHapticLoop() {
    while (hapticLoopRef.current) {
      await hapticRingOnce();
      await new Promise(r => setTimeout(r, 1300));
    }
  }

  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);
    hapticLoopRef.current = true;
    runHapticLoop();

    (async () => {
      try {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false });
        const { sound } = await Audio.Sound.createAsync(
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          require('../../../assets/sounds/soft-chime.mp3'),
          { isLooping: true, volume: 0.55 }
        );
        soundRef.current = sound;
        await sound.playAsync();
      } catch {
        // placeholder file — haptics still run
      }
    })();

    return () => cleanup();
  }, []);

  function cleanup() {
    hapticLoopRef.current = false;
    if (timerRef.current) clearInterval(timerRef.current);
    const s = soundRef.current;
    soundRef.current = null;
    if (s) { s.stopAsync().catch(() => {}); s.unloadAsync().catch(() => {}); }
  }

  function goBack() { navigation.goBack(); }

  function handleAccept() {
    cleanup();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setMoodScore(5);
    const sessionId = initSession();
    navigation.replace('CheckinFlow', { sessionId });
  }

  function handleDecline() {
    cleanup();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    Animated.timing(slideY, {
      toValue: height,
      duration: 420,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => goBack());
  }

  const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const seconds = String(elapsed % 60).padStart(2, '0');

  return (
    <Animated.View style={[styles.root, { transform: [{ translateY: slideY }] }]}>
      <StatusBar style="light" />

      {/* Blurred nature scene background */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <MascotScene state="idle" />
      </View>
      <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View style={[StyleSheet.absoluteFill, styles.dimOverlay]} pointerEvents="none" />

      {/* Call content */}
      <View style={styles.topSection}>
        <Text style={styles.callLabel}>Incoming Call</Text>

        <View style={styles.avatarContainer}>
          <PulseRing delayMs={0}    size={AVATAR_SIZE} />
          <PulseRing delayMs={733}  size={AVATAR_SIZE} />
          <PulseRing delayMs={1466} size={AVATAR_SIZE} />
          <View style={styles.avatarCircle}>
            <MiloFace size={AVATAR_SIZE - 6} />
          </View>
        </View>

        <Text style={styles.callerName}>Milo is Calling</Text>
        <Text style={styles.callerSub}>Your doctor has scheduled a check-in</Text>
        <Text style={styles.timer}>{minutes}:{seconds}</Text>
      </View>

      {/* Accept / Decline */}
      <View style={styles.actions}>
        <View style={styles.actionItem}>
          <TouchableOpacity
            style={styles.declineBtn}
            onPress={handleDecline}
            accessibilityRole="button"
            accessibilityLabel="Decline call"
          >
            <PhoneIcon rotated />
          </TouchableOpacity>
          <Text style={styles.actionLabel}>Decline</Text>
        </View>
        <View style={styles.actionItem}>
          <TouchableOpacity
            style={styles.acceptBtn}
            onPress={handleAccept}
            accessibilityRole="button"
            accessibilityLabel="Accept call"
          >
            <PhoneIcon />
          </TouchableOpacity>
          <Text style={styles.actionLabel}>Accept</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 72,
    paddingBottom: 64,
  },
  dimOverlay: {
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  topSection: {
    alignItems: 'center',
    gap: 8,
  },
  callLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.4,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  avatarContainer: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  pulseRing: {
    position: 'absolute',
    backgroundColor: 'rgba(175, 169, 236, 0.40)',
  },
  avatarCircle: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    overflow: 'hidden',
    backgroundColor: '#D4D0F4',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.22)',
    shadowColor: '#AFA9EC',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 28,
    elevation: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callerName: {
    fontSize: 30,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  callerSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '400',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
    marginTop: 2,
  },
  timer: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.38)',
    letterSpacing: 2,
    marginTop: 8,
    fontVariant: ['tabular-nums'],
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 80,
    alignItems: 'center',
  },
  actionItem: {
    alignItems: 'center',
    gap: 10,
  },
  declineBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  acceptBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#34C759',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.65)',
  },
});
