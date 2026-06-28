import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../theme';
import { Habit } from '../types';

const WEEKS = 4;
const DOT_SIZE = 12;
const DOT_GAP = 5;

interface Props {
  habits: Habit[];
  getConsistencyData: (habitId: string, weeks: number) => boolean[];
}

export default function ConsistencyChart({ habits, getConsistencyData }: Props) {
  if (habits.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No habits yet to chart</Text>
      </View>
    );
  }

  return (
    <View>
      {habits.map(habit => {
        const data = getConsistencyData(habit.id, WEEKS);
        return (
          <View key={habit.id} style={styles.row}>
            <Text style={styles.habitLabel} numberOfLines={1}>
              {habit.icon} {habit.name}
            </Text>
            <View style={styles.circlesRow}>
              {data.map((done, i) => (
                <View
                  key={i}
                  style={[
                    styles.circle,
                    { backgroundColor: done ? habit.color : Colors.border }
                  ]}
                />
              ))}
            </View>
          </View>
        );
      })}
      <View style={styles.dayLabels}>
        {['4w', '3w', '2w', '1w'].map((l, i) => (
          <Text key={i} style={styles.dayLabel}>{l}</Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  habitLabel: {
    width: 110,
    fontSize: 12,
    color: Colors.textMuted,
    marginRight: 8,
  },
  circlesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: DOT_GAP,
    flex: 1,
    overflow: 'hidden',
  },
  circle: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  dayLabels: {
    flexDirection: 'row',
    marginLeft: 118,
    marginTop: 4,
  },
  dayLabel: {
    width: DOT_SIZE + DOT_GAP,
    fontSize: 9,
    color: Colors.border,
    textAlign: 'center',
  },
  empty: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
});
