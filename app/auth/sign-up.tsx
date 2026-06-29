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
import { Link, useRouter } from 'expo-router';
import { supabase } from '../../src/supabase';
import { Colors, Radii, Spacing } from '../../src/theme';

export default function SignUp() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleSignUp = async () => {
    if (!email.trim() || !password) return;
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError('');
    setInfo('');
    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (authError) {
      setError(authError.message);
    } else if (data.session) {
      // Email confirmation is disabled — signed in immediately
      router.replace('/');
    } else {
      // Email confirmation is enabled — user must verify before signing in
      setInfo('Check your email to confirm your account, then sign in.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <Text style={styles.logo}>🌱</Text>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Start building better habits today</Text>
        </View>

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
            returnKeyType="next"
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.inputWithIcon}
              placeholder="Min. 6 characters"
              placeholderTextColor={Colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              returnKeyType="next"
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword(v => !v)}
              activeOpacity={0.7}
            >
              <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Confirm Password</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.inputWithIcon}
              placeholder="••••••••"
              placeholderTextColor={Colors.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              returnKeyType="done"
              onSubmitEditing={handleSignUp}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowConfirmPassword(v => !v)}
              activeOpacity={0.7}
            >
              <Text style={styles.eyeIcon}>{showConfirmPassword ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          {!!error && <Text style={styles.error}>{error}</Text>}
          {!!info && <Text style={styles.info}>{info}</Text>}

          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
            onPress={handleSignUp}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryBtnText}>Create Account</Text>
            }
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <Link href="/auth" asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink}> Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
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
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logo: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textMuted,
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
    marginTop: Spacing.md,
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
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputWithIcon: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 16,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  eyeBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
  },
  eyeIcon: {
    fontSize: 18,
  },
  error: {
    color: Colors.rose,
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  info: {
    color: Colors.accent,
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  primaryBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radii.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: Spacing.lg,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  footerText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
  footerLink: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
});
