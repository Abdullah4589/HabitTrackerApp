import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

const PARTICLES = ['✨', '⭐', '🎉', '💫', '✨', '⭐', '🎉', '💫', '✨', '⭐', '🎉', '💫'];

interface Props {
  trigger: boolean;
  onDone?: () => void;
}

export default function ParticleBurst({ trigger, onDone }: Props) {
  const particles = useRef(
    PARTICLES.map(() => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    if (!trigger) return;

    const anims = particles.map((p, i) => {
      const angle = (i / particles.length) * 2 * Math.PI;
      const distance = 60 + Math.random() * 40;
      p.x.setValue(0);
      p.y.setValue(0);
      p.opacity.setValue(1);
      p.scale.setValue(0);

      return Animated.parallel([
        Animated.timing(p.x, {
          toValue: Math.cos(angle) * distance,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(p.y, {
          toValue: Math.sin(angle) * distance - 20,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(p.scale, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.timing(p.scale, { toValue: 0.6, duration: 400, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.delay(300),
          Animated.timing(p.opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]),
      ]);
    });

    Animated.parallel(anims).start(() => onDone?.());
  }, [trigger]);

  if (!trigger) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            styles.particle,
            {
              transform: [{ translateX: p.x }, { translateY: p.y }, { scale: p.scale }],
              opacity: p.opacity,
            },
          ]}
        >
          <Text style={styles.emoji}>{PARTICLES[i]}</Text>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    left: '50%',
    top: '50%',
  },
  emoji: {
    fontSize: 18,
  },
});
