import {AppProvider} from '@app/app-providers'
import {MainPage} from '@app/pages/main-page'
import {QuickSwitcher} from '@components/quick-switcher'

export function App() {
  return (
    <AppProvider>
      <MainPage />
      <QuickSwitcher />
    </AppProvider>
  )
}
