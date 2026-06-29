import { useTranslation } from 'react-i18next'

// Botãozinho PT/EN reutilizável (mesma lógica que estava no App de teste).
export function LanguageSwitcher() {
  const { i18n } = useTranslation()
  return (
    <div className="flex gap-1">
      {(['pt', 'en'] as const).map((lng) => (
        <button
          key={lng}
          onClick={() => i18n.changeLanguage(lng)}
          className={`rounded px-2 py-1 text-xs font-semibold transition ${
            i18n.resolvedLanguage === lng
              ? 'bg-slate-900 text-white'
              : 'text-slate-500 hover:bg-slate-100'
          }`}
        >
          {lng.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
