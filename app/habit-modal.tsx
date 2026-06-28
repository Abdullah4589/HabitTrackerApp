import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useStore } from '../src/store';
import { Colors, HabitColors, Radii, Spacing } from '../src/theme';
import { requestNotificationPermissions, scheduleHabitReminders } from '../src/notifications';
import * as Haptics from 'expo-haptics';

const ICONS = ['🏃', '💧', '📖', '🧘', '💪', '🥗', '😴', '🚴', '✍️', '🎯',
               '🧠', '🎨', '🎵', '🌿', '☀️', '🏊', '🧹', '💊', '📵', '🙏',
               '🚶', '🍎', '💻', '💸', '🔋'];

function formatHour(h: number): string {
  const period = h >= 12 ? 'PM' : 'AM';
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display} ${period}`;
}

export default function HabitModal() {
  const router = useRouter();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const { addHabit, editHabit, habits } = useStore();

  const existing = editId ? habits.find(h => h.id === editId) : undefined;

  const [name, setName] = useState(existing?.name ?? '');
  const [icon, setIcon] = useState(existing?.icon ?? '🏃');
  const [color, setColor] = useState(existing?.color ?? HabitColors[0]);
  const [type, setType] = useState<'daily' | 'volume'>(existing?.type ?? 'daily');
  const [targetCount, setTargetCount] = useState(existing?.targetCount ?? 3);
  const [reminderEnabled, setReminderEnabled] = useState(
    existing?.reminderHour !== undefined
  );
  const [reminderHour, setReminderHour] = useState(existing?.reminderHour ?? 9);
  const [reminderMinute, setReminderMinute] = useState(existing?.reminderMinute ?? 0);
  const [reminderConfirmed, setReminderConfirmed] = useState(
    existing?.reminderHour !== undefined
  );

  const handleSave = async () => {
    if (!name.trim()) return;
    const data = {
      name: name.trim(),
      icon,
      color,
      type,
      targetCount: type === 'daily' ? 1 : targetCount,
      reminderHour: reminderEnabled ? reminderHour : undefined,
      reminderMinute: reminderEnabled ? reminderMinute : undefined,
    };
    if (existing) {
      editHabit(existing.id, data);
    } else {
      addHabit(data);
    }

    // Reschedule notifications with updated habits
    try {
      const granted = await requestNotificationPermissions();
      if (granted) {
        const updatedHabits = existing
          ? habits.map(h => h.id === existing.id ? { ...h, ...data } : h)
          : [...habits, { id: 'new', createdAt: new Date().toISOString(), ...data }];
        await scheduleHabitReminders(updatedHabits as any);
      }
    } catch {/* notifications optional */}

    router.back();
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.handle} />

        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.titleRow}>
            <Text style={styles.title}>{existing ? 'Edit Habit' : 'New Habit'}</Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Morning Run"
            placeholderTextColor={Colors.textMuted}
            value={name}
            onChangeText={setName}
            autoFocus
          />

          <Text style={styles.label}>Icon</Text>
          <View style={styles.iconGrid}>
            {ICONS.map(ic => (
              <TouchableOpacity
                key={ic}
                onPress={() => setIcon(ic)}
                style={[styles.iconCell, icon === ic && { backgroundColor: color + '33', borderColor: color }]}
              >
                <Text style={styles.iconEmoji}>{ic}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Color</Text>
          <View style={styles.colorRow}>
            {HabitColors.map(c => (
              <TouchableOpacity
                key={c}
                onPress={() => setColor(c)}
                style={[styles.colorSwatch, { backgroundColor: c }, color === c && styles.colorSwatchSelected]}
              />
            ))}
          </View>

          <Text style={styles.label}>Type</Text>
          <View style={styles.typeToggle}>
            {(['daily', 'volume'] as const).map(t => (
              <TouchableOpacity
                key={t}
                onPress={() => setType(t)}
                style={[styles.typeBtn, type === t && { backgroundColor: color }]}
              >
                <Text style={[styles.typeBtnText, type === t ? styles.typeBtnTextActive : styles.typeBtnTextInactive]}>
                  {t === 'daily' ? 'Once per day' : 'Volume (count)'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {type === 'volume' && (
            <View style={styles.counterRow}>
              <Text style={styles.counterLabel}>Daily target</Text>
              <View style={styles.counter}>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => setTargetCount(c => Math.max(2, c - 1))}
                >
                  <Text style={styles.counterBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.counterValue}>{targetCount}</Text>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => setTargetCount(c => Math.min(20, c + 1))}
                >
                  <Text style={styles.counterBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Reminder */}
          <Text style={styles.label}>Daily Reminder</Text>
          <View style={styles.reminderCard}>
            <View style={styles.reminderToggleRow}>
              <Text style={styles.reminderToggleLabel}>Enable reminder</Text>
              <Switch
                value={reminderEnabled}
                onValueChange={(val) => {
                  setReminderEnabled(val);
                  if (!val) setReminderConfirmed(false);
                }}
                trackColor={{ false: Colors.border, true: color }}
                thumbColor={reminderEnabled ? '#FFFFFF' : Colors.textMuted}
              />
            </View>

            {reminderEnabled && (
              <View style={styles.timePickerSection}>
                <View style={styles.timePicker}>
                  <View style={styles.timeUnit}>
                    <TouchableOpacity
                      style={styles.timeBtn}
                      onPress={() => {
                        setReminderHour(h => (h + 1) % 24);
                        setReminderConfirmed(false);
                      }}
                    >
                      <Text style={styles.timeBtnText}>▲</Text>
                    </TouchableOpacity>
                    <Text style={styles.timeValue}>{formatHour(reminderHour)}</Text>
                    <TouchableOpacity
                      style={styles.timeBtn}
                      onPress={() => {
                        setReminderHour(h => (h + 23) % 24);
                        setReminderConfirmed(false);
                      }}
                    >
                      <Text style={styles.timeBtnText}>▼</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.timeColon}>:</Text>

                  <View style={styles.timeUnit}>
                    <TouchableOpacity
                      style={styles.timeBtn}
                      onPress={() => {
                        setReminderMinute(m => (m + 5) % 60);
                        setReminderConfirmed(false);
                      }}
                    >
                      <Text style={styles.timeBtnText}>▲</Text>
                    </TouchableOpacity>
                    <Text style={styles.timeValue}>{String(reminderMinute).padStart(2, '0')}</Text>
                    <TouchableOpacity
                      style={styles.timeBtn}
                      onPress={() => {
                        setReminderMinute(m => (m - 5 + 60) % 60);
                        setReminderConfirmed(false);
                      }}
                    >
                      <Text style={styles.timeBtnText}>▼</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.confirmBtn,
                    {
                      backgroundColor: reminderConfirmed ? Colors.accent + '20' : color,
                      borderColor: reminderConfirmed ? Colors.accent : color,
                    }
                  ]}
                  onPress={() => {
                    setReminderConfirmed(true);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.confirmBtnText,
                    { color: reminderConfirmed ? Colors.accent : '#FFFFFF' }
                  ]}>
                    {reminderConfirmed ? '✓ Reminder Time Confirmed' : 'Confirm Reminder Time'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: color }, !name.trim() && { opacity: 0.4 }]}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={!name.trim()}
          >
            <Text style={styles.saveBtnText}>
              {existing ? 'Save Changes' : 'Add Habit'}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.card,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  container: {
    padding: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  cancelText: {
    fontSize: 16,
    color: Colors.textMuted,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: Spacing.md,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: Colors.bg,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    fontSize: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconCell: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg,
  },
  iconEmoji: {
    fontSize: 22,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 12,
  },
  colorSwatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorSwatchSelected: {
    borderWidth: 3,
    borderColor: Colors.textPrimary,
  },
  typeToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.bg,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  typeBtnTextActive: {
    color: '#FFFFFF',
  },
  typeBtnTextInactive: {
    color: Colors.textPrimary,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  counterLabel: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  counterBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnText: {
    fontSize: 20,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  counterValue: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    minWidth: 32,
    textAlign: 'center',
  },
  reminderCard: {
    backgroundColor: Colors.bg,
    borderRadius: Radii.lg,
    borderWidth: 1.2,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  reminderToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  reminderToggleLabel: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  timePickerSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    paddingTop: Spacing.sm,
    backgroundColor: Colors.bg,
    alignItems: 'center',
  },
  timePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: Spacing.md,
  },
  confirmBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  timeUnit: {
    alignItems: 'center',
    gap: 6,
  },
  timeBtn: {
    width: 44,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timeBtnText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  timeValue: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    minWidth: 68,
    textAlign: 'center',
  },
  timeColon: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    paddingTop: 4,
  },
  saveBtn: {
    borderRadius: Radii.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
