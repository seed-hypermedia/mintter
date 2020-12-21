import React from 'react'
import {AppLayout} from 'components/layout'
import Topbar from 'components/topbar'
import Publication from './publication'

export default function PublicPublication() {
  return (
    <AppLayout>
      <Topbar isPublic />
      <Publication />
    </AppLayout>
  )
}
