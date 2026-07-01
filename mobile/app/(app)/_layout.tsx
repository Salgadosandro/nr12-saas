import { Stack } from 'expo-router'
import { Colors } from '../../lib/colors'

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.white },
        headerTintColor: Colors.navy,
        headerTitleStyle: { fontWeight: '700', color: Colors.navy },
        headerShadowVisible: false,
        headerBackTitle: 'Voltar',
        contentStyle: { backgroundColor: Colors.slate100 },
      }}
    />
  )
}
