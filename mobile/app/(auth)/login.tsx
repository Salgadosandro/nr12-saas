import { useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'
import { Colors } from '../../lib/colors'

export default function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!email || !password) return
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) Alert.alert('Erro ao entrar', error.message)
    setLoading(false)
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Logo */}
        <View style={styles.logoArea}>
          <View style={styles.circle}>
            <Text style={styles.check}>✓</Text>
          </View>
          <View>
            <Text style={styles.logoSub}>RELATÓRIO</Text>
            <View style={styles.logoRow}>
              <Text style={styles.logoMain}>Rápido</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>NR-12</Text>
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.tagline}>Inspeções em campo, sem complicação</Text>

        {/* Form */}
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="E-mail"
            placeholderTextColor={Colors.slate400}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Senha"
            placeholderTextColor={Colors.slate400}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading || !email || !password}
            activeOpacity={0.8}
          >
            <Text style={styles.btnText}>{loading ? 'Entrando…' : 'Entrar'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  logoArea: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 8 },
  circle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: { color: Colors.emerald, fontSize: 24, fontWeight: '700' },
  logoSub: { fontSize: 11, fontWeight: '300', color: Colors.slate400, letterSpacing: 3 },
  logoRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  logoMain: { fontSize: 28, fontWeight: '900', color: Colors.teal },
  badge: {
    backgroundColor: Colors.navy,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { color: Colors.white, fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  tagline: { color: Colors.slate500, fontSize: 14, marginBottom: 40 },
  form: { gap: 12 },
  input: {
    borderWidth: 1,
    borderColor: Colors.slate200,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.navy,
    backgroundColor: Colors.slate50,
  },
  btn: {
    backgroundColor: Colors.navy,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
})
