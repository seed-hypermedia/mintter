import {useContext, createContext, useState} from 'react'

export interface SeedContextInterface {
  seed: string[]
  setSeed?: React.Dispatch<React.SetStateAction<string[]>>
}

export interface SeedProviderProps
  extends React.HTMLAttributes<HTMLDivElement> {
  value: SeedContextInterface
}

export const SeedContext = createContext<SeedContextInterface>({seed: ['']})

export default function SeedProvider({children, value}: SeedProviderProps) {
  const [seed, setSeed] = useState<string[]>([''])

  const v = value || {seed, setSeed}
  return <SeedContext.Provider value={v}>{children}</SeedContext.Provider>
}

export function useSeed(): SeedContextInterface {
  return useContext<SeedContextInterface>(SeedContext)
}
