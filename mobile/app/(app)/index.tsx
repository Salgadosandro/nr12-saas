import { useRouter } from 'expo-router'
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'
import { Colors } from '../../lib/colors'
import { useInspections } from '../../features/inspections/hooks'
import type { Inspection } from '../../features/inspections/types'

const STATUS_LABEL: Record<string, string> = {
  in_field: 'Em campo',
  completed: 'Concluída',
}

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  in_field: { bg: Colors.amberBg, text: Colors.amber },
  completed: { bg: Colors.greenBg, text: Colors.green },
}

function InspectionCard({ item }: { item: Inspection }) {
  const router = useRouter()
  const done = item.checklists.filter((c) => c.status === 'completed').length
  const total = item.checklists.length
  const colors = STATUS_COLOR[item.status] ?? STATUS_COLOR.in_field

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(app)/inspection/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.cardTop}>
        <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
        <View style={[styles.badge, { backgroundColor: colors.bg }]}>
          <Text style={[styles.badgeText, { color: colors.text }]}>
            {STATUS_LABEL[item.status] ?? item.status}
          </Text>
        </View>
      </View>
      <Text style={styles.cardClient}>{item.client?.name ?? '—'}</Text>
      {total > 0 && (
        <View style={styles.progressRow}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(done / total) * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>{done}/{total} checklists</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

export default function InspectionsScreen() {
  const { data, isLoading, isError, refetch } = useInspections()

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerSub}>RELATÓRIO</Text>
          <Text style={styles.headerMain}>Rápido</Text>
        </View>
        <TouchableOpacity onPress={() => supabase.auth.signOut()}>
          <Text style={styles.logout}>Sair</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Minhas inspeções</Text>

      {isLoading && (
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.teal} />
      )}

      {isError && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Erro ao carregar. Toque para tentar novamente.</Text>
          <TouchableOpacity onPress={() => refetch()}>
            <Text style={styles.retry}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isLoading && !isError && (
        <FlatList
          data={data}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => <InspectionCard item={item} />}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={isLoading}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Nenhuma inspeção atribuída.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.slate100 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate200,
  },
  headerSub: { fontSize: 9, fontWeight: '300', color: Colors.slate400, letterSpacing: 3 },
  headerMain: { fontSize: 20, fontWeight: '900', color: Colors.teal, marginTop: -2 },
  logout: { color: Colors.slate500, fontSize: 14 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.slate500,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
  },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: { fontSize: 16, fontWeight: '700', color: Colors.navy, flex: 1, marginRight: 8 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  cardClient: { fontSize: 13, color: Colors.slate500 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  progressBar: { flex: 1, height: 4, backgroundColor: Colors.slate200, borderRadius: 2 },
  progressFill: { height: 4, backgroundColor: Colors.teal, borderRadius: 2 },
  progressText: { fontSize: 11, color: Colors.slate400, minWidth: 70 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { color: Colors.slate400, fontSize: 14 },
  retry: { color: Colors.teal, fontSize: 14, fontWeight: '600' },
})
