import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../theme';

// Catches render-time crashes anywhere in the tree so a thrown error shows a
// recoverable fallback instead of a blank screen. Network/API errors are handled
// inline by the screens; this is the last-resort guard for unexpected failures.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    this.reset = this.reset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  reset() {
    this.setState({ error: null });
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Đã xảy ra lỗi</Text>
          <Text style={styles.message}>Ứng dụng gặp sự cố ngoài dự kiến. Vui lòng thử lại.</Text>
          <Pressable testID="error-reset" onPress={this.reset} style={styles.button}>
            <Text style={styles.buttonText}>Thử lại</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: theme.surface },
  title: { fontSize: 20, fontWeight: '700', color: theme.ink, marginBottom: 8 },
  message: { fontSize: 14, color: theme.inkSubtle, textAlign: 'center', marginBottom: 20 },
  button: { backgroundColor: theme.brand600, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 20 },
  buttonText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
});
