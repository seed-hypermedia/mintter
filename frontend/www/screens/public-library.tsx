import React from 'react'
import {useProfile} from 'shared/profile-context'
import {PublicLayout} from 'components/layout'
import {Page} from 'components/page'
import {MainColumn} from 'components/main-column'
import Seo from 'components/seo'
import {CustomLogo} from 'components/custom-logo'
import {Link} from 'components/link'

const MyPublications = React.lazy(
  () => import(/* webpackPrefetch: true */ './my-publications'),
)

// TODO: Think if there's a better way  to disable SSR, so that access to localStorage doesn't blow up the whole app.
export default function Library() {
  return (
    <PublicLayout>
      <Seo title="Homepage" />
      <MainHeader />
      <Page>
        <MainColumn className="md:mx-16 max-w-xl">
          <div className="mx-0 mt-4">
            <MyPublications noSeo isPublic />
          </div>
        </MainColumn>
      </Page>
    </PublicLayout>
  )
}

function MainHeader() {
  const {data: profile} = useProfile()

  return profile ? (
    <div className="px-4 md:px-16 pt-4 pb-20 bg-brand-primary">
      <div className="flex flex-col max-w-xl w-full px-4 box-content">
        <a
          href="https://ethosfera.org"
          className="text-sm font-medium hover:underline text-brand-secondary inline-block"
        >
          Go to Ethosfera&apos;s website →
        </a>
        <Link to="/">
          <CustomLogo className="mt-16" />
        </Link>
        <p className="text-brand-secondary mt-6 w-3/4">{profile.bio}</p>
      </div>
    </div>
  ) : null
}
