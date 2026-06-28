import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '../theme';

const FIREWORKS = ['🎆', '🎇', '✨', '🎉', '🏆', '⭐', '💥', '🌟', '🎊', '💫', '🥳', '🔥'];

interface Props {
  visible: boolean;
  title: string;
  subtitle: string;
  buttonLabel?: string;
  onDismiss: () => void;
}

export default function CelebrationOverlay({
  visible,
  title,
  subtitle,
  buttonLabel = 'Claim Reward',
  onDismiss,
}: Props) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const particles = useRef(
    FIREWORKS.map((_, i) => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
      delay: i * 80,
    }))
  ).current;

  useEffect(() => {
    if (!visible) return;
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.7);

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, tension: 80, friction: 7, useNativeDriver: true }),
    ]).start();

    const burstAnims = particles.map((p, i) => {
      const angle = (i / particles.length) * 2 * Math.PI;
      const r = 120 + Math.random() * 80;
      p.x.setValue(0);
      p.y.setValue(0);
      p.opacity.setValue(0);
      p.scale.setValue(0);
      return Animated.sequence([
        Animated.delay(p.delay),
        Animated.parallel([
          Animated.timing(p.opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
          Animated.timing(p.scale, { toValue: 1.4, duration: 400, useNativeDriver: true }),
          Animated.timing(p.x, { toValue: Math.cos(angle) * r, duration: 800, useNativeDriver: true }),
          Animated.timing(p.y, { toValue: Math.sin(angle) * r - 60, duration: 800, useNativeDriver: true }),
          Animated.sequence([
            Animated.delay(500),
            Animated.timing(p.opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
          ]),
        ]),
      ]);
    });
    Animated.loop(Animated.parallel(burstAnims), { iterations: 3 }).start();
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onDismiss}>
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <View style={styles.particleContainer} pointerEvents="none">
          {particles.map((p, i) => (
            <Animated.Text
              key={i}
              style={[
                styles.firework,
                {
                  transform: [{ translateX: p.x }, { translateY: p.y }, { scale: p.scale }],
                  opacity: p.opacity,
                },
              ]}
            >
              {FIREWORKS[i % FIREWORKS.length]}
            </Animated.Text>
          ))}
        </View>

        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={styles.trophy}>🏆</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <TouchableOpacity style={styles.button} onPress={onDismiss} activeOpacity={0.85}>
            <Text style={styles.buttonText}>{buttonLabel}</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  particleContainer: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  firework: {
    position: 'absolute',
    fontSize: 28,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 28,
    padding: 36,
    alignItems: 'center',
    width: '80%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  trophy: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  button: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  buttonText: {
    color: Colors.bg,
    fontSize: 16,
    fontWeight: '700',
  },
});
