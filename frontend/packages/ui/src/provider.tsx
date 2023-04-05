import {TamaguiProvider, TamaguiProviderProps, Theme} from 'tamagui'
import {config} from './tamagui.config'

export function Provider({
  children,
  ...rest
}: Omit<TamaguiProviderProps, 'config'>) {
  return (
    <TamaguiProvider
      config={config}
      disableInjectCSS
      defaultTheme="light"
      {...rest}
    >
      <Theme name="blue">{children}</Theme>
    </TamaguiProvider>
  )
}
