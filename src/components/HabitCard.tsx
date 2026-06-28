import React, { useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Habit, HabitLog } from '../types';
import { Colors, Radii } from '../theme';
import ParticleBurst from './ParticleBurst';
import { playChime } from '../sound';

interface Props {
  habit: Habit;
  log?: HabitLog;
  streak: number;
  onLog: () => 'incremented' | 'completed' | 'already_done';
  onLongPress?: () => void;
  onAllComplete?: () => void;
}


export default function HabitCard({ habit, log, streak, onLog, onLongPress, onAllComplete }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const [burst, setBurst] = useState(false);

  const completedCount = log?.completedCount ?? 0;
  const isComplete = completedCount >= habit.targetCount;

  const triggerReward = () => {
    setBurst(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    playChime();

    Animated.sequence([
      Animated.spring(scale, { toValue: 1.1, useNativeDriver: true, tension: 200, friction: 5 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 120, friction: 6 }),
    ]).start();

    Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 200, useNativeDriver: false }),
      Animated.timing(glow, { toValue: 0, duration: 600, useNativeDriver: false }),
    ]).start();
  };

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.96, duration: 70, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 130, useNativeDriver: true }),
    ]).start();

    const result = onLog();
    if (result === 'completed') {
      triggerReward();
    } else if (result === 'incremented') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const borderColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [isComplete ? habit.color + '55' : Colors.border, habit.color],
  });

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Animated.View style={[styles.card, { borderColor }]}>
        <ParticleBurst trigger={burst} onDone={() => setBurst(false)} />

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handlePress}
          onLongPress={onLongPress}
          style={styles.inner}
        >
          <View style={styles.left}>
            <View style={[styles.iconBg, { backgroundColor: habit.color + '22' }]}>
              <Text style={styles.icon}>{habit.icon}</Text>
            </View>
            <View style={styles.info}>
              <Text style={[styles.name, isComplete && styles.nameDone]}>
                {habit.name}
              </Text>
              <Text style={styles.streak}>🔥 {streak} day streak</Text>
            </View>
          </View>

          {habit.type === 'daily' ? (
            <View style={[styles.checkbox, isComplete && { backgroundColor: habit.color, borderColor: habit.color }]}>
              {isComplete && <Text style={styles.check}>✓</Text>}
            </View>
          ) : (
            <View style={styles.volumeContainer}>
              <Text style={[styles.volumeCount, { color: isComplete ? habit.color : Colors.textPrimary }]}>
                {completedCount}
                <Text style={styles.volumeTarget}>/{habit.targetCount}</Text>
              </Text>
              {!isComplete && (
                <View style={[styles.plusBtn, { backgroundColor: habit.color + '22', borderColor: habit.color + '55' }]}>
                  <Text style={[styles.plusText, { color: habit.color }]}>+</Text>
                </View>
              )}
              {isComplete && (
                <View style={[styles.checkSmall, { backgroundColor: habit.color }]}>
                  <Text style={styles.check}>✓</Text>
                </View>
              )}
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radii.md,
    marginBottom: 10,
    borderWidth: 1.5,
    overflow: 'visible',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 22,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  nameDone: {
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
  streak: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  volumeCount: {
    fontSize: 18,
    fontWeight: '700',
  },
  volumeTarget: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '400',
  },
  plusBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusText: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 22,
  },
  checkSmall: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
