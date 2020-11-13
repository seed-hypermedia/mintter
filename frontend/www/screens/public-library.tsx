import React from 'react'
import {useProfile} from 'shared/profileContext'
import {AppLayout} from 'components/layout'
import {Page} from 'components/page'
import {MainColumn} from 'components/main-column'
import Topbar from 'components/topbar'
import Seo from 'components/seo'

const MyPublications = React.lazy(() =>
  import(/* webpackPrefetch: true */ './my-publications'),
)

// TODO: Think if there's a better way  to disable SSR, so that access to localStorage doesn't blow up the whole app.
export default function Library() {
  return (
    <AppLayout>
      <Topbar isPublic />
      <Seo title="Homepage" />
      <Page>
        <MainColumn>
          <ProfileInfo />

          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-semibold text-heading">Articles</h3>
            <div className="flex-1" />
          </div>
          <div className="mx-0 md:-mx-4 mt-4">
            <MyPublications noSeo />
          </div>
        </MainColumn>
      </Page>
    </AppLayout>
  )
}

function ProfileInfo() {
  const {data: profile} = useProfile()

  return profile ? (
    <div className="text-left border-b mb-8 pb-8">
      <h1 className="font-bold text-4xl text-heading">{profile.username}</h1>
      <p className="text-body text-sm mt-2">{profile.bio}</p>
    </div>
  ) : (
    <div className="text-left border-b mb-8 pb-8">
      <h1 className="font-bold text-4xl text-heading bg-gray-300 w-1/2">
        &nbsp;
      </h1>
      <div className="mt-4">
        <div className="bg-gray-300 h-4 w-56" />
        <div className="bg-gray-300 h-4 w-48 mt-2" />
        <div className="bg-gray-300 h-4 w-48 mt-2" />
      </div>
    </div>
  )
}
