import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/supabase';
import { Colors, Radii, Spacing } from '../../src/theme';

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError('');
    const { error: authError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase()
    );
    setLoading(false);
    if (authError) {
      setError(authError.message);
    } else {
      setSent(true);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Forgot password?</Text>
          <Text style={styles.subtitle}>
            Enter your email and we'll send you a link to reset your password.
          </Text>
        </View>

        {sent ? (
          <View style={styles.successBox}>
            <Text style={styles.successIcon}>📬</Text>
            <Text style={styles.successTitle}>Check your email</Text>
            <Text style={styles.successBody}>
              We sent a password reset link to{' '}
              <Text style={styles.successEmail}>{email.trim().toLowerCase()}</Text>.
              {'\n\n'}It may take a minute to arrive. Check your spam folder if you don't see it.
            </Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.replace('/auth')}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleReset}
            />

            {!!error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              style={[styles.primaryBtn, (!email.trim() || loading) && styles.primaryBtnDisabled]}
              onPress={handleReset}
              disabled={!email.trim() || loading}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryBtnText}>Send Reset Link</Text>
              }
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.sm,
  },
  backText: {
    color: Colors.accent,
    fontSize: 15,
    fontWeight: '600',
  },
  header: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textMuted,
    lineHeight: 22,
  },
  form: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    color: Colors.textPrimary,
    fontSize: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  error: {
    color: Colors.rose,
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  primaryBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radii.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  primaryBtnDisabled: {
    opacity: 0.4,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  successBox: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    gap: 12,
  },
  successIcon: {
    fontSize: 56,
    marginBottom: Spacing.sm,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  successBody: {
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  successEmail: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
});
