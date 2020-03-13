import {useContext, createContext, useState} from 'react'

export interface SeedContextInterface {
  seed: string[]
  setSeed?: React.Dispatch<React.SetStateAction<string[]>>
}

export const SeedContext = createContext<SeedContextInterface>({seed: ['']})

export default function SeedProvider({
  children,
}: React.HTMLAttributes<HTMLDivElement>) {
  const [seed, setSeed] = useState<string[]>([''])

  return (
    <SeedContext.Provider value={{seed, setSeed}}>
      {children}
    </SeedContext.Provider>
  )
}

export function useSeed(): SeedContextInterface {
  return useContext<SeedContextInterface>(SeedContext)
}
