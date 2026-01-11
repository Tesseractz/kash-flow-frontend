import { useTranslation } from 'react-i18next'
import { changeLanguage } from '../lib/i18n'
import { Globe } from 'lucide-react'

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'am', name: 'አማርኛ', flag: '🇪🇹' },
]

export default function LanguageSwitcher({ compact = false }) {
  const { i18n } = useTranslation()
  const currentLang = i18n.language

  const handleChange = (langCode) => {
    changeLanguage(langCode)
  }

  if (compact) {
    // Compact toggle for mobile/small spaces
    return (
      <button
        onClick={() => handleChange(currentLang === 'en' ? 'am' : 'en')}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
        title={currentLang === 'en' ? 'Switch to አማርኛ' : 'Switch to English'}
      >
        <Globe size={18} />
        <span className="text-sm font-medium">
          {currentLang === 'en' ? '🇪🇹 አማ' : '🇬🇧 EN'}
        </span>
      </button>
    )
  }

  // Full dropdown/toggle for sidebar
  return (
    <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => handleChange(lang.code)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
            currentLang === lang.code
              ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <span>{lang.flag}</span>
          <span>{lang.code === 'en' ? 'EN' : 'አማ'}</span>
        </button>
      ))}
    </div>
  )
}

// Sidebar version with full text
export function LanguageSwitcherSidebar() {
  const { i18n } = useTranslation()
  const currentLang = i18n.language

  const handleChange = (langCode) => {
    changeLanguage(langCode)
  }

  return (
    <div className="px-4 py-2">
      <div className="flex items-center gap-2 mb-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        <Globe size={14} />
        Language / ቋንቋ
      </div>
      <div className="flex gap-1">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleChange(lang.code)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              currentLang === lang.code
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <span>{lang.flag}</span>
            <span>{lang.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

