import { useTranslation } from 'react-i18next'

// Placeholder das telas que ainda vamos construir (Fases 2+).
export default function PlaceholderPage({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation()
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">{t(titleKey)}</h1>
      <p className="mt-2 text-slate-400">{t('auth.soon')}</p>
    </div>
  )
}
