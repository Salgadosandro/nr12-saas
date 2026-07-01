import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors } from '../../../lib/colors'
import { useInspection, useUpdateInspectionStatus } from '../../../features/inspections/hooks'
import type { ChecklistSummary } from '../../../features/inspections/types'

const CL_STATUS: Record<string, { label: string; bg: string; text: string }> = {
  in_progress: { label: 'Em andamento', bg: Colors.amberBg, text: Colors.amber },
  completed: { label: 'Concluído', bg: Colors.greenBg, text: Colors.green },
}

function ChecklistCard({ item }: { item: ChecklistSummary }) {
  const router = useRouter()
  const st = CL_STATUS[item.status] ?? CL_STATUS.in_progress

  if (!item.nr_applies) {
    return (
      <View style={[styles.card, styles.cardNA]}>
        <Text style={styles.machineName}>{item.machine?.tag ?? '—'}</Text>
        <Text style={styles.machineCode}>{item.machine?.code ?? '—'}</Text>
        <View style={[styles.badge, { backgroundColor: Colors.slate100 }]}>
          <Text style={[styles.badgeText, { color: Colors.slate500 }]}>NR não se aplica</Text>
        </View>
      </View>
    )
  }

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(app)/checklist/${item.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.cardRow}>
        <View>
          <Text style={styles.machineName}>{item.machine?.tag ?? '—'}</Text>
          <Text style={styles.machineCode}>{item.machine?.code ?? '—'}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: st.bg }]}>
          <Text style={[styles.badgeText, { color: st.text }]}>{st.label}</Text>
        </View>
      </View>
      <Text style={styles.cta}>Abrir checklist →</Text>
    </TouchableOpacity>
  )
}

export default function InspectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data, isLoading, isError } = useInspection(id)
  const statusMut = useUpdateInspectionStatus(id)
  const router = useRouter()

  const done = data?.checklists.filter((c) => c.status === 'completed').length ?? 0
  const total = data?.checklists.length ?? 0
  const allDone = total > 0 && done === total
  const inspectionDone = data?.status === 'completed'

  function handleFinish() {
    Alert.alert('Finalizar inspeção', 'Todos os checklists foram concluídos. Deseja finalizar a inspeção?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Finalizar',
        onPress: () =>
          statusMut.mutate('completed', { onSuccess: () => router.back() }),
      },
    ])
  }

  function handleReopen() {
    Alert.alert('Reabrir inspeção', 'Deseja reabrir esta inspeção?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Reabrir', onPress: () => statusMut.mutate('in_field') },
    ])
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: data?.name ?? 'Inspeção',
          headerBackTitle: 'Inspeções',
        }}
      />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {isLoading && <ActivityIndicator style={{ marginTop: 40 }} color={Colors.teal} />}
        {isError && (
          <View style={styles.center}>
            <Text style={styles.errorText}>Erro ao carregar inspeção.</Text>
          </View>
        )}
        {data && (
          <>
            {/* Info bar */}
            <View style={styles.infoBar}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Cliente</Text>
                <Text style={styles.infoValue}>{data.client?.name ?? '—'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Data</Text>
                <Text style={styles.infoValue}>
                  {data.performed_on ? new Date(data.performed_on).toLocaleDateString('pt-BR') : '—'}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Progresso</Text>
                <Text style={styles.infoValue}>{done}/{total}</Text>
              </View>
            </View>

            {/* Botão de status */}
            {!inspectionDone && allDone && (
              <TouchableOpacity
                style={[styles.finishBtn, statusMut.isPending && { opacity: 0.5 }]}
                onPress={handleFinish}
                disabled={statusMut.isPending}
                activeOpacity={0.8}
              >
                <Text style={styles.finishBtnText}>
                  {statusMut.isPending ? 'Salvando…' : '✓ Finalizar inspeção'}
                </Text>
              </TouchableOpacity>
            )}
            {inspectionDone && (
              <TouchableOpacity
                style={styles.reopenBtn}
                onPress={handleReopen}
                disabled={statusMut.isPending}
                activeOpacity={0.8}
              >
                <Text style={styles.reopenBtnText}>Reabrir inspeção</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.sectionTitle}>Máquinas</Text>
            <FlatList
              data={data.checklists}
              keyExtractor={(c) => c.id}
              renderItem={({ item }) => <ChecklistCard item={item} />}
              contentContainerStyle={styles.list}
              ListEmptyComponent={
                <View style={styles.center}>
                  <Text style={styles.emptyText}>Nenhuma máquina adicionada.</Text>
                </View>
              }
            />
          </>
        )}
      </SafeAreaView>
    </>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.slate100 },
  infoBar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate200,
  },
  infoItem: { flex: 1 },
  infoLabel: { fontSize: 10, color: Colors.slate400, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 13, fontWeight: '600', color: Colors.navy, marginTop: 2 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.slate500,
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardNA: { opacity: 0.7 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  machineName: { fontSize: 16, fontWeight: '700', color: Colors.navy },
  machineCode: { fontSize: 13, color: Colors.slate500, marginTop: 2 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  cta: { fontSize: 12, color: Colors.teal, fontWeight: '600' },
  center: { alignItems: 'center', paddingTop: 60 },
  errorText: { color: Colors.red, fontSize: 14 },
  emptyText: { color: Colors.slate400, fontSize: 14 },
  finishBtn: {
    backgroundColor: Colors.teal,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  finishBtnText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  reopenBtn: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.slate300,
    paddingVertical: 12,
    alignItems: 'center',
  },
  reopenBtnText: { color: Colors.slate600, fontSize: 14, fontWeight: '600' },
})
