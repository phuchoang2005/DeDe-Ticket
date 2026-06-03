import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { login as loginRequest } from '../services/authService';
import { hasScannerRole, useAuth } from '../store/AuthContext';
import { getApiBaseUrl, setApiBaseUrl } from '../config/env';
import { saveApiBaseUrl } from '../storage/serverConfig';
import { friendlyError } from '../utils/errorMessage';
import { theme } from '../theme';

// Exact copy required by the role gate below.
export const NO_ACCESS_MESSAGE = 'Bạn không có quyền truy cập ứng dụng này';

// Seeded accounts (see DataSeeder). The first three are allowed; "Người dùng" is
// a plain USER kept here so the role gate is easy to exercise by hand. Tag colors
// mirror the web login's role chips.
const DEMO_ACCOUNTS = [
  { key: 'Scanner', role: 'Soát vé', email: 'scanner@dede.test', password: 'scan1234', tagBg: theme.brand200, tagFg: theme.brand900 },
  { key: 'Organizer', role: 'Ban tổ chức', email: 'organizer@dede.test', password: 'org12345', tagBg: theme.warn50, tagFg: theme.warn700 },
  { key: 'Admin', role: 'Quản trị viên', email: 'admin@dede.test', password: 'admin1234', tagBg: theme.danger50, tagFg: theme.danger600 },
  { key: 'Khách', role: 'Người dùng', email: 'demo@dede.test', password: 'demo1234', tagBg: theme.brand100, tagFg: theme.brand700 },
];

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [focused, setFocused] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');

  const onSubmit = async () => {
    if (submitting) return;
    setError(null);
    if (!email.trim() || !password) {
      setError('Vui lòng nhập email và mật khẩu.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await loginRequest(email.trim(), password);
      const roles = (res && res.user && res.user.roles) || [];
      if (!hasScannerRole(roles)) {
        // Login succeeded but the account lacks a scanner role: reject in-app
        // and never persist the token, so the user is not logged in.
        setError(NO_ACCESS_MESSAGE);
        return;
      }
      await signIn(res.token, res.user);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setSubmitting(false);
    }
  };

  const openSettings = () => {
    setUrlDraft(getApiBaseUrl());
    setSettingsOpen(true);
  };

  const saveSettings = async () => {
    const applied = setApiBaseUrl(urlDraft);
    await saveApiBaseUrl(applied);
    setSettingsOpen(false);
  };

  const fillDemo = (account) => {
    setEmail(account.email);
    setPassword(account.password);
    setError(null);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <View style={styles.header}>
          <Image source={require('../../assets/icon.png')} style={styles.logo} />
          <Text style={styles.title}>Chào mừng trở lại</Text>
          <Text style={styles.subtitle}>Đăng nhập để soát vé sự kiện</Text>
        </View>

        <View style={styles.demoPanel}>
          <Text style={styles.demoLabel}>Tài khoản demo · nhấn để điền sẵn</Text>
          {DEMO_ACCOUNTS.map((account) => {
            const selected = email === account.email;
            return (
              <Pressable
                key={account.email}
                testID={`demo-${account.key}`}
                onPress={() => fillDemo(account)}
                disabled={submitting}
                style={[styles.demoRow, selected ? styles.demoRowSelected : styles.demoRowIdle]}
              >
                <View style={[styles.demoTag, { backgroundColor: account.tagBg }]}>
                  <Text style={[styles.demoTagText, { color: account.tagFg }]}>{account.role}</Text>
                </View>
                <View style={styles.demoMeta}>
                  <Text style={styles.demoEmail} numberOfLines={1}>{account.email}</Text>
                  <Text style={styles.demoPassword}>mật khẩu: {account.password}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput
            testID="email-input"
            style={[styles.input, focused === 'email' && styles.inputFocused]}
            placeholder="email@dede.test"
            placeholderTextColor={theme.inkFaint}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            onFocus={() => setFocused('email')}
            onBlur={() => setFocused(null)}
            editable={!submitting}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Mật khẩu</Text>
          <TextInput
            testID="password-input"
            style={[styles.input, focused === 'password' && styles.inputFocused]}
            placeholder="Mật khẩu"
            placeholderTextColor={theme.inkFaint}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            onFocus={() => setFocused('password')}
            onBlur={() => setFocused(null)}
            editable={!submitting}
          />
        </View>

        {error ? (
          <Text testID="login-error" style={styles.error}>
            {error}
          </Text>
        ) : null}

        <Pressable
          testID="login-button"
          onPress={onSubmit}
          disabled={submitting}
          style={[styles.button, submitting && styles.buttonDisabled]}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Đăng nhập</Text>
          )}
        </Pressable>

        <Pressable testID="open-server-settings" onPress={openSettings} style={styles.settingsLink}>
          <Text style={styles.settingsLinkText}>Cài đặt máy chủ</Text>
        </Pressable>
      </View>

      <Modal visible={settingsOpen} transparent animationType="fade" onRequestClose={() => setSettingsOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Địa chỉ máy chủ</Text>
            <Text style={styles.modalHint}>Nhập URL máy chủ (ví dụ http://192.168.1.10:8080). Không dùng localhost trên điện thoại.</Text>
            <TextInput
              testID="server-url-input"
              style={styles.input}
              placeholder="http://host:8080"
              placeholderTextColor={theme.inkFaint}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              value={urlDraft}
              onChangeText={setUrlDraft}
            />
            <View style={styles.modalActions}>
              <Pressable testID="cancel-server-url" onPress={() => setSettingsOpen(false)} style={[styles.modalButton, styles.modalButtonGhost]}>
                <Text style={styles.modalButtonGhostText}>Hủy</Text>
              </Pressable>
              <Pressable testID="save-server-url" onPress={saveSettings} style={[styles.modalButton, styles.modalButtonPrimary]}>
                <Text style={styles.buttonText}>Lưu</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.surface },
  page: { flex: 1, backgroundColor: theme.surface },
  pageContent: { flexGrow: 1, justifyContent: 'center', padding: 16 },
  card: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    backgroundColor: theme.surfaceCard,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.line,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  header: { alignItems: 'center', marginBottom: 24 },
  logo: { width: 48, height: 48, borderRadius: 12, marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '700', color: theme.ink },
  subtitle: { fontSize: 14, color: theme.inkSubtle, marginTop: 4 },

  demoPanel: {
    borderWidth: 1,
    borderColor: theme.line,
    backgroundColor: theme.surfaceAlt,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    gap: 8,
  },
  demoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.inkSubtle,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  demoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: theme.surfaceCard,
  },
  demoRowIdle: { borderColor: theme.line },
  demoRowSelected: { borderColor: theme.brand600 },
  demoTag: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  demoTagText: { fontSize: 10, fontWeight: '700' },
  demoMeta: { flex: 1, minWidth: 0 },
  demoEmail: { fontSize: 14, fontWeight: '500', color: theme.ink },
  demoPassword: { fontSize: 11, color: theme.inkSubtle },

  field: { marginBottom: 16 },
  fieldLabel: { fontSize: 14, fontWeight: '500', color: theme.ink, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: theme.surfaceCard,
    color: theme.ink,
  },
  inputFocused: { borderColor: theme.brand600 },
  error: { color: theme.danger600, fontSize: 14, marginBottom: 16 },

  button: {
    backgroundColor: theme.brand600,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },

  settingsLink: { alignSelf: 'center', marginTop: 16, paddingVertical: 6, paddingHorizontal: 8 },
  settingsLinkText: { color: theme.brand700, fontSize: 13, fontWeight: '600' },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(27,49,32,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: theme.surfaceCard,
    borderRadius: 16,
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: theme.ink, marginBottom: 6 },
  modalHint: { fontSize: 13, color: theme.inkSubtle, marginBottom: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 16 },
  modalButton: { borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center' },
  modalButtonPrimary: { backgroundColor: theme.brand600 },
  modalButtonGhost: { borderWidth: 1, borderColor: theme.line },
  modalButtonGhostText: { color: theme.inkMuted, fontSize: 16, fontWeight: '600' },
});
