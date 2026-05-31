import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { scanTicket } from '../services/scanService';
import { getDeviceId } from '../storage/deviceId';
import { useAuth } from '../store/AuthContext';
import { describeScanError } from '../utils/scanOutcome';
import { friendlyError } from '../utils/errorMessage';
import { formatDateTime } from '../utils/datetime';
import { playScanBeep } from '../utils/beep';
import { theme } from '../theme';

// back = rear camera (phones), front = selfie camera. expo-camera switches the
// stream seamlessly when the facing prop changes; QR detection is unaffected by
// which camera is active, so there is no mirror/flip problem to correct for.
const FACING_OPTIONS = [
  { key: 'back', label: 'Camera sau' },
  { key: 'front', label: 'Camera trước' },
];

export default function ScanScreen() {
  const { signOut } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState('back');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [locked, setLocked] = useState(false);
  const [manualCode, setManualCode] = useState('');

  // Synchronous guard so two barcode frames fired before the next render cannot
  // both reach the API. setLocked drives the UI / camera pause separately.
  const lockRef = useRef(false);
  const deviceIdRef = useRef(null);

  useEffect(() => {
    let active = true;
    getDeviceId().then((id) => {
      if (active) deviceIdRef.current = id;
    });
    return () => {
      active = false;
    };
  }, []);

  // Shared path for both camera scans and manual code entry.
  const runScan = useCallback(async (code) => {
    const value = typeof code === 'string' ? code.trim() : code;
    if (lockRef.current || !value) return;
    lockRef.current = true;
    setLocked(true);
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const res = await scanTicket(value, deviceIdRef.current);
      setResult(res);
      playScanBeep();
    } catch (e) {
      setError({ code: e && e.code, message: e && e.message });
    } finally {
      setSubmitting(false);
    }
  }, []);

  const handleBarcode = useCallback((event) => runScan(event && event.data), [runScan]);
  const submitManual = () => runScan(manualCode);

  const scanNext = () => {
    lockRef.current = false;
    setLocked(false);
    setResult(null);
    setError(null);
    setManualCode('');
  };

  if (!permission) {
    return (
      <SafeAreaView style={[styles.page, styles.center]} edges={['top', 'bottom']}>
        <ActivityIndicator color={theme.brand600} />
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.page, styles.center]} edges={['top', 'bottom']}>
        <Text style={styles.permTitle}>Cần quyền truy cập camera</Text>
        <Text style={styles.permText}>Ứng dụng cần camera để quét mã QR trên vé.</Text>
        <Pressable testID="request-permission" onPress={requestPermission} style={styles.button}>
          <Text style={styles.buttonText}>Cấp quyền camera</Text>
        </Pressable>
        <Pressable testID="logout-button" onPress={signOut} style={styles.linkButton}>
          <Text style={styles.linkText}>Đăng xuất</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const notice = buildNotice(result, error);
  // While a result/error notice is up, freeze the preview so the camera stops
  // processing frames until the user taps "Quét vé khác".
  const frozen = Boolean(notice);

  return (
    <SafeAreaView style={styles.pageScroll} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        testID="keyboard-avoider"
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          testID="scan-scroll"
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.topBar}>
            <View style={styles.topBarText}>
              <Text style={styles.title}>Quét vé</Text>
              <Text style={styles.subtitle}>Hướng mã QR vào khung hình</Text>
            </View>
            <Pressable testID="logout-button" onPress={signOut} style={styles.linkButton}>
              <Text style={styles.linkText}>Đăng xuất</Text>
            </Pressable>
          </View>

          <View style={styles.segment}>
            {FACING_OPTIONS.map((opt) => {
              const active = facing === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  testID={`facing-${opt.key}`}
                  onPress={() => setFacing(opt.key)}
                  style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.cameraArea}>
            <View style={styles.cameraWrap}>
              <CameraView
                testID="camera"
                style={StyleSheet.absoluteFill}
                active={!frozen}
                facing={facing}
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={locked ? undefined : handleBarcode}
              />
              {submitting ? (
                <View style={styles.cameraOverlay}>
                  <ActivityIndicator color="#ffffff" />
                  <Text style={styles.cameraOverlayText}>Đang xác thực vé…</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View style={styles.manualSection}>
            <Text style={styles.manualLabel}>Nhập mã vé thủ công</Text>
            <View style={styles.manualRow}>
              <TextInput
                testID="manual-input"
                style={styles.manualInput}
                placeholder="Mã vé"
                placeholderTextColor={theme.inkFaint}
                autoCapitalize="characters"
                autoCorrect={false}
                value={manualCode}
                onChangeText={setManualCode}
                editable={!submitting}
                returnKeyType="done"
                onSubmitEditing={submitManual}
              />
              <Pressable testID="manual-submit" onPress={submitManual} disabled={submitting} style={styles.manualButton}>
                <Text style={styles.buttonText}>Kiểm tra</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {notice ? (
        <View style={styles.noticeOverlay}>
          <View style={[styles.notice, styles[`notice_${notice.tone}`]]}>
            <Text style={[styles.noticeTitle, styles[`noticeTitle_${notice.tone}`]]}>{notice.title}</Text>
            {notice.rows ? (
              <View style={styles.detailGrid}>
                {notice.rows.map((row) => (
                  <View key={row.label} style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{row.label}</Text>
                    <Text style={styles.detailValue}>{row.value}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.noticeMessage}>{notice.message}</Text>
            )}
            <Pressable testID="scan-next" onPress={scanNext} style={styles.button}>
              <Text style={styles.buttonText}>Quét vé khác</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

// Builds the validation notice descriptor from the current result/error.
function buildNotice(result, error) {
  if (error) {
    const described = describeScanError(error.code);
    return { tone: described.tone, title: described.title, message: friendlyError(error) };
  }
  if (result) {
    return {
      tone: 'success',
      title: 'Check-in thành công',
      rows: [
        { label: 'Sự kiện', value: result.eventTitle },
        { label: 'Ghế', value: `${result.section} · ${result.rowLabel}-${result.seatNumber}` },
        { label: 'Thời điểm', value: formatDateTime(result.checkedInAt) },
        { label: 'Mã vé', value: `#${result.ticketId}` },
      ],
    };
  }
  return null;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.surface, padding: 16 },
  pageScroll: { flex: 1, backgroundColor: theme.surface },
  flex: { flex: 1 },
  scrollContent: { padding: 16, flexGrow: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },

  topBar: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  topBarText: { flexShrink: 1 },
  title: { fontSize: 22, fontWeight: '700', color: theme.ink },
  subtitle: { fontSize: 13, color: theme.inkSubtle, marginTop: 2 },

  segment: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    marginTop: 16,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 8,
    overflow: 'hidden',
  },
  segmentBtn: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: theme.surfaceCard },
  segmentBtnActive: { backgroundColor: theme.brand600 },
  segmentText: { fontSize: 13, fontWeight: '600', color: theme.inkMuted },
  segmentTextActive: { color: '#ffffff' },

  // Camera sits directly below the facing buttons (top-aligned), centered
  // horizontally, as a 1:1 square capped at 640px.
  cameraArea: { marginTop: 16, alignItems: 'center' },
  cameraWrap: {
    width: '100%',
    maxWidth: 640,
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: theme.line,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(27,49,32,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cameraOverlayText: { color: '#ffffff', fontSize: 14 },

  manualSection: { marginTop: 16 },
  manualLabel: { fontSize: 13, color: theme.inkSubtle, marginBottom: 6 },
  manualRow: { flexDirection: 'row', gap: 8 },
  manualInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: theme.surfaceCard,
    color: theme.ink,
  },
  manualButton: {
    backgroundColor: theme.brand600,
    borderRadius: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  noticeOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(27,49,32,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  notice: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: theme.surfaceCard,
    borderRadius: 16,
    borderWidth: 2,
    padding: 20,
  },
  notice_success: { borderColor: theme.brand200, backgroundColor: theme.brand50 },
  notice_warn: { borderColor: theme.warn400, backgroundColor: theme.warn50 },
  notice_danger: { borderColor: theme.danger200, backgroundColor: theme.danger50 },
  noticeTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  noticeTitle_success: { color: theme.brand700 },
  noticeTitle_warn: { color: theme.warn700 },
  noticeTitle_danger: { color: theme.danger600 },
  noticeMessage: { fontSize: 14, color: theme.inkMuted, marginBottom: 16 },

  detailGrid: { marginBottom: 16, gap: 4 },
  detailRow: { flexDirection: 'row' },
  detailLabel: { width: 96, fontSize: 14, color: theme.inkSubtle },
  detailValue: { flex: 1, fontSize: 14, color: theme.ink, fontWeight: '500' },

  permTitle: { fontSize: 18, fontWeight: '700', color: theme.ink, marginBottom: 8 },
  permText: { fontSize: 14, color: theme.inkSubtle, textAlign: 'center', marginBottom: 20 },

  button: {
    backgroundColor: theme.brand600,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  buttonText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  linkButton: { paddingVertical: 6, paddingHorizontal: 4, marginTop: 8 },
  linkText: { color: theme.brand700, fontSize: 14, fontWeight: '600' },
});
