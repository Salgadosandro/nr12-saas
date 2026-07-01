import * as ImagePicker from 'expo-image-picker'
import { supabase } from '../../lib/supabase'
import type { Answer, AnswerStatus, ChecklistDetail } from './types'

export async function getChecklist(id: string): Promise<ChecklistDetail> {
  const { data, error } = await supabase
    .from('checklists')
    .select('id,status,nr_applies,exclusion_code,exclusion_notes,machine:machines(tag,code),inspection:inspections(id,name)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data as ChecklistDetail
}

export async function getChecklistAnswers(checklistId: string): Promise<Answer[]> {
  const { data, error } = await supabase
    .from('answers')
    .select(`
      id, status, notes, checklist_template_item_id,
      answer_photos(id, storage_path, position),
      template_item:checklist_template_items(
        id,
        standard_item:standard_items(id, number, text, position, standard_section_id),
        checklist_template_section:checklist_template_sections(
          id,
          standard_section:standard_sections(id, code, title, position)
        )
      )
    `)
    .eq('checklist_id', checklistId)
    .order('checklist_template_item_id')
  if (error) throw error
  return (data ?? []) as Answer[]
}

export async function updateAnswer(
  answerId: string,
  patch: { status?: AnswerStatus; notes?: string | null },
): Promise<void> {
  const { error } = await supabase.from('answers').update(patch).eq('id', answerId)
  if (error) throw error
}

export async function completeChecklist(checklistId: string): Promise<void> {
  const { error } = await supabase
    .from('checklists')
    .update({ status: 'completed' })
    .eq('id', checklistId)
  if (error) throw error
}

async function getAccountId(): Promise<string> {
  const { data, error } = await supabase.rpc('current_account_id')
  if (error || !data) throw new Error('Conta não encontrada')
  return data as string
}

export async function uploadAnswerPhoto(
  answerId: string,
  position: number,
  source: 'camera' | 'library',
): Promise<void> {
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.75,
    allowsEditing: true,
    aspect: [4, 3],
  }

  let result: ImagePicker.ImagePickerResult

  if (source === 'camera') {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') throw new Error('Permissão de câmera negada')
    result = await ImagePicker.launchCameraAsync(options)
  } else {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') throw new Error('Permissão de galeria negada')
    result = await ImagePicker.launchImageLibraryAsync(options)
  }

  if (result.canceled) return

  const uri = result.assets[0].uri
  const accountId = await getAccountId()
  const storagePath = `${accountId}/${answerId}/${position}.jpg`

  const response = await fetch(uri)
  const blob = await response.blob()

  const { error: uploadError } = await supabase.storage
    .from('evidencias')
    .upload(storagePath, blob, { contentType: 'image/jpeg', upsert: true })
  if (uploadError) throw uploadError

  const { error: insertError } = await supabase.from('answer_photos').upsert(
    { answer_id: answerId, storage_path: storagePath, position },
    { onConflict: 'answer_id,position' },
  )
  if (insertError) throw insertError
}

export async function deleteAnswerPhoto(photoId: string, storagePath: string): Promise<void> {
  const { error: storageError } = await supabase.storage
    .from('evidencias')
    .remove([storagePath])
  if (storageError) throw storageError

  const { error } = await supabase.from('answer_photos').delete().eq('id', photoId)
  if (error) throw error
}

export function getPhotoUrl(storagePath: string): string {
  const { data } = supabase.storage.from('evidencias').getPublicUrl(storagePath)
  // bucket is private — use signed URLs for display
  return data.publicUrl
}

export async function getPhotoSignedUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('evidencias')
    .createSignedUrl(storagePath, 60 * 60) // 1h expiry
  if (error) throw error
  return data.signedUrl
}
