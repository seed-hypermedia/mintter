import Layout from 'components/layout'
import Topbar from 'components/topbar'
import Container from './container'
import {ErrorBoundary} from 'react-error-boundary'
import {FullPageErrorMessage} from './errorMessage'

export function MainLayout({children}) {
  return (
    <ErrorBoundary FallbackComponent={FullPageErrorMessage}>
      <Layout className="flex flex-col">
        <Topbar />
        <div className="flex-1 overflow-y-auto">
          <Container>{children}</Container>
        </div>
      </Layout>
    </ErrorBoundary>
  )
}
