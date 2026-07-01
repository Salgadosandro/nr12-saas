import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Colors } from '../../../lib/colors'
import {
  useChecklist,
  useChecklistAnswers,
  useCompleteChecklist,
  useDeleteAnswerPhoto,
  usePhotoSignedUrl,
  useUpdateAnswer,
  useUploadAnswerPhoto,
} from '../../../features/checklists/hooks'
import type { Answer, AnswerPhoto, AnswerStatus } from '../../../features/checklists/types'

const STATUS_OPTIONS: { value: AnswerStatus; label: string; color: string; bg: string }[] = [
  { value: 'compliant', label: '✓ Conforme', color: Colors.green, bg: Colors.greenBg },
  { value: 'non_compliant', label: '✗ NC', color: Colors.red, bg: Colors.redBg },
  { value: 'na', label: '— N/A', color: Colors.slate500, bg: Colors.slate100 },
]

function PhotoThumbnail({
  photo,
  onDelete,
}: {
  photo: AnswerPhoto
  onDelete: () => void
}) {
  const { data: url } = usePhotoSignedUrl(photo.storage_path)

  return (
    <View style={styles.photoSlot}>
      {url ? (
        <Image source={{ uri: url }} style={styles.photoImg} resizeMode="cover" />
      ) : (
        <View style={[styles.photoImg, styles.photoPlaceholder]}>
          <ActivityIndicator size="small" color={Colors.teal} />
        </View>
      )}
      <TouchableOpacity style={styles.photoDelete} onPress={onDelete} hitSlop={8}>
        <Text style={styles.photoDeleteText}>✕</Text>
      </TouchableOpacity>
    </View>
  )
}

function PhotoRow({
  answerId,
  photos,
  checklistId,
}: {
  answerId: string
  photos: AnswerPhoto[]
  checklistId: string
}) {
  const uploadMut = useUploadAnswerPhoto(checklistId)
  const deleteMut = useDeleteAnswerPhoto(checklistId)

  const sorted = [...photos].sort((a, b) => a.position - b.position)
  const nextPosition = (() => {
    const taken = new Set(sorted.map((p) => p.position))
    for (let i = 1; i <= 3; i++) if (!taken.has(i)) return i
    return null
  })()

  function handleAdd() {
    if (nextPosition === null) return
    Alert.alert('Adicionar foto', 'Escolha a origem', [
      {
        text: 'Câmera',
        onPress: () =>
          uploadMut.mutate(
            { answerId, position: nextPosition, source: 'camera' },
            { onError: (e) => Alert.alert('Erro', e.message) },
          ),
      },
      {
        text: 'Galeria',
        onPress: () =>
          uploadMut.mutate(
            { answerId, position: nextPosition, source: 'library' },
            { onError: (e) => Alert.alert('Erro', e.message) },
          ),
      },
      { text: 'Cancelar', style: 'cancel' },
    ])
  }

  function handleDelete(photo: AnswerPhoto) {
    Alert.alert('Remover foto', 'Deseja remover esta evidência?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () =>
          deleteMut.mutate(
            { photoId: photo.id, storagePath: photo.storage_path },
            { onError: (e) => Alert.alert('Erro', e.message) },
          ),
      },
    ])
  }

  const isMutating = uploadMut.isPending || deleteMut.isPending

  return (
    <View style={styles.photoRow}>
      {sorted.map((photo) => (
        <PhotoThumbnail key={photo.id} photo={photo} onDelete={() => handleDelete(photo)} />
      ))}
      {nextPosition !== null && (
        <TouchableOpacity
          style={[styles.photoSlot, styles.photoAdd, isMutating && { opacity: 0.4 }]}
          onPress={handleAdd}
          disabled={isMutating}
        >
          {uploadMut.isPending ? (
            <ActivityIndicator size="small" color={Colors.teal} />
          ) : (
            <Text style={styles.photoAddText}>＋</Text>
          )}
        </TouchableOpacity>
      )}
      <Text style={styles.photoHint}>{sorted.length}/3 fotos</Text>
    </View>
  )
}

function AnswerRow({ answer, checklistId }: { answer: Answer; checklistId: string }) {
  const [showNotes, setShowNotes] = useState(answer.status === 'non_compliant')
  const [notes, setNotes] = useState(answer.notes ?? '')
  const updateMut = useUpdateAnswer(checklistId)

  function handleStatus(status: AnswerStatus) {
    updateMut.mutate({ answerId: answer.id, status })
    setShowNotes(status === 'non_compliant')
  }

  function handleNotesBlur() {
    if (notes !== (answer.notes ?? '')) {
      updateMut.mutate({ answerId: answer.id, notes: notes || null })
    }
  }

  const item = answer.template_item.standard_item
  const photos = answer.answer_photos ?? []

  return (
    <View style={styles.answerCard}>
      <Text style={styles.itemNumber}>{item.number}</Text>
      <Text style={styles.itemText}>{item.text}</Text>

      <View style={styles.btnRow}>
        {STATUS_OPTIONS.map((opt) => {
          const active = answer.status === opt.value
          return (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.statusBtn,
                active && { backgroundColor: opt.bg, borderColor: opt.color },
              ]}
              onPress={() => handleStatus(opt.value)}
              disabled={updateMut.isPending}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.statusBtnText, active && { color: opt.color, fontWeight: '700' }]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {showNotes && (
        <>
          <TextInput
            style={styles.notesInput}
            placeholder="Descreva a não-conformidade…"
            placeholderTextColor={Colors.slate400}
            value={notes}
            onChangeText={setNotes}
            onBlur={handleNotesBlur}
            multiline
            numberOfLines={3}
          />
          <PhotoRow answerId={answer.id} photos={photos} checklistId={checklistId} />
        </>
      )}
    </View>
  )
}

export default function ChecklistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()

  const { data: checklist, isLoading: loadingCL } = useChecklist(id)
  const { data: sections, isLoading: loadingAnswers } = useChecklistAnswers(id)
  const completeMut = useCompleteChecklist(id, checklist?.inspection?.id)

  const isLoading = loadingCL || loadingAnswers
  const alreadyDone = checklist?.status === 'completed'

  const totalAnswers = sections?.reduce((n, s) => n + s.answers.length, 0) ?? 0
  const ncCount = sections?.reduce(
    (n, s) => n + s.answers.filter((a) => a.status === 'non_compliant').length,
    0,
  ) ?? 0

  function handleComplete() {
    Alert.alert(
      'Concluir checklist',
      `${ncCount > 0 ? `${ncCount} NC(s) registrada(s). ` : ''}Deseja marcar como concluído?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Concluir',
          style: 'default',
          onPress: () =>
            completeMut.mutate(undefined, { onSuccess: () => router.back() }),
        },
      ],
    )
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: checklist ? `${checklist.machine?.tag ?? 'Checklist'}` : 'Checklist',
          headerBackTitle: 'Voltar',
        }}
      />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {isLoading && <ActivityIndicator style={{ marginTop: 40 }} color={Colors.teal} />}

        {!isLoading && checklist && sections && (
          <>
            <View style={styles.summary}>
              <Text style={styles.summaryText}>
                {checklist.machine?.code} · {totalAnswers} itens · {ncCount} NC
              </Text>
              {alreadyDone && (
                <View style={[styles.badge, { backgroundColor: Colors.greenBg }]}>
                  <Text style={[styles.badgeText, { color: Colors.green }]}>Concluído</Text>
                </View>
              )}
            </View>

            <ScrollView contentContainerStyle={styles.scroll}>
              {sections.map((section) => (
                <View key={section.sectionId} style={styles.section}>
                  <Text style={styles.sectionHeader}>
                    {section.code} — {section.title}
                  </Text>
                  {section.answers.map((answer) => (
                    <AnswerRow key={answer.id} answer={answer} checklistId={id} />
                  ))}
                </View>
              ))}

              {!alreadyDone && (
                <TouchableOpacity
                  style={[styles.completeBtn, completeMut.isPending && styles.completeBtnDisabled]}
                  onPress={handleComplete}
                  disabled={completeMut.isPending}
                  activeOpacity={0.8}
                >
                  <Text style={styles.completeBtnText}>
                    {completeMut.isPending ? 'Salvando…' : 'Marcar como concluído'}
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </>
        )}
      </SafeAreaView>
    </>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.slate100 },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate200,
  },
  summaryText: { fontSize: 13, color: Colors.slate500 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  scroll: { padding: 16, gap: 16, paddingBottom: 40 },
  section: { gap: 8 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.teal,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate200,
  },
  answerCard: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  itemNumber: { fontSize: 11, fontWeight: '700', color: Colors.teal },
  itemText: { fontSize: 13, color: Colors.navy, lineHeight: 18 },
  btnRow: { flexDirection: 'row', gap: 8 },
  statusBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.slate200,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  statusBtnText: { fontSize: 12, color: Colors.slate500 },
  notesInput: {
    borderWidth: 1,
    borderColor: Colors.slate200,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: Colors.navy,
    backgroundColor: Colors.slate50,
    textAlignVertical: 'top',
  },
  // Photos
  photoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  photoSlot: {
    width: 72,
    height: 72,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImg: {
    width: 72,
    height: 72,
    borderRadius: 8,
  },
  photoPlaceholder: {
    backgroundColor: Colors.slate100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoDelete: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoDeleteText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  photoAdd: {
    borderWidth: 1.5,
    borderColor: Colors.slate300,
    borderStyle: 'dashed',
    backgroundColor: Colors.slate50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoAddText: { fontSize: 22, color: Colors.teal, lineHeight: 26 },
  photoHint: { fontSize: 10, color: Colors.slate400, alignSelf: 'flex-end' },
  // Complete button
  completeBtn: {
    backgroundColor: Colors.navy,
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  completeBtnDisabled: { opacity: 0.5 },
  completeBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
})
