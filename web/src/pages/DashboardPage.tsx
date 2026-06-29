import { useTranslation } from 'react-i18next'

export default function DashboardPage() {
  const { t } = useTranslation()
  return <h1 className="text-2xl font-bold text-slate-900">{t('dashboard.welcome')}</h1>
}
