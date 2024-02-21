import {LanguageFn, createLowlight} from 'lowlight'
import {useRef} from 'react'

export const useLowlight = (languages: Record<string, LanguageFn>) => {
  const lowlightRef = useRef<any | null>()
  if (!lowlightRef.current) {
    lowlightRef.current = createLowlight(languages)
  }
  return lowlightRef.current
}
