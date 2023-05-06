import {Account, Publication, SiteInfo} from '@mintter/shared'
import {GetServerSideProps} from 'next'
import {setAllowAnyHostGetCORS} from 'server/cors'
import {accountsClient, localWebsiteClient} from '../client'
import {getSiteInfo} from '../get-site-info'
import PublicationPage from '../ssr-publication-page'

export default function PathPublicationPage({
  publication,
  author,
  editors,
  siteInfo = null,
}: {
  publication?: Publication
  author?: Account | null
  editors: Array<Account>
  siteInfo: SiteInfo | null
}) {
  return (
    <PublicationPage
      publication={publication}
      author={author}
      siteInfo={siteInfo}
      editors={editors}
    />
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const {res} = context
  const path = (context.params?.pageSlug as string) || ''
  const siteInfo = await getSiteInfo()
  let author: Account | null = null
  let editors: Array<Account> = []
  let publication: Publication | null = null
  let pathRecord
  try {
    pathRecord = await localWebsiteClient.getPath({path})
    publication = pathRecord.publication
    if (!publication || !publication.document)
      return {
        notFound: true,
      }
    setAllowAnyHostGetCORS(res)

    res.setHeader('x-mintter-document-id', publication.document.id)
    res.setHeader('x-mintter-version', publication.version)
    const definedPublisher = publication.document?.publisher
    if (definedPublisher)
      res.setHeader('x-mintter-publisher-id', definedPublisher)

    author = publication.document?.author
      ? await accountsClient.getAccount({id: publication.document?.author})
      : null

    editors = publication.document?.editors.length
      ? await Promise.all(
          publication.document?.editors.map((id) =>
            accountsClient.getAccount({id}),
          ),
        )
      : []

    console.log('🚀 ~ file: [...ids].tsx:75 ~ editors:', editors)

    return {
      props: {
        publication: publication ? publication.toJson() : null,
        author: author ? author.toJson() : null,
        siteInfo: siteInfo ? siteInfo.toJson() : null,
        editors: editors ? editors.map((e) => e.toJson()) : [],
      },
    }
  } catch (error) {
    const isNotFound = !!error.rawMessage.match('Could not get record for path')
    if (isNotFound)
      return {
        notFound: true,
      }

    if (!publication || !publication.document) {
      throw error
    }

    return {
      props: {
        publication: publication ? publication.toJson() : null,
        author: null,
        siteInfo: siteInfo ? siteInfo.toJson() : null,
        editors: [],
      },
    }
  }
}

// export const getServerSideProps: GetServerSideProps = async (context) => {
//   const {res} = context
//   const path = (context.params?.pageSlug as string) || ''
//   const siteInfo = await getSiteInfo()
//   let author: Account | null = null
//   let editors: Array<Account> = []
//   let pathRecord
//   try {
//     pathRecord = await localWebsiteClient.getPath({path})
//   } catch (e) {
//     const isNotFound = !!e.rawMessage.match('Could not get record for path')
//     if (isNotFound)
//       return {
//         notFound: true,
//       }
//     throw e
//   }
//   const publication = pathRecord.publication
//   if (!publication)
//     return {
//       notFound: true,
//     }

//   setAllowAnyHostGetCORS(res)

//   res.setHeader('x-mintter-document-id', publication.document.id)
//   res.setHeader('x-mintter-version', publication.version)
//   const definedPublisher = publication.document?.publisher
//   if (definedPublisher)
//     res.setHeader('x-mintter-publisher-id', definedPublisher)

//   author = publication.document?.author
//       ? await accountsClient.getAccount({id: publication.document?.author})
//       : null

//     editors = publication.document?.editors.length
//       ? await Promise.all(
//           publication.document?.editors.map((id) =>
//             accountsClient.getAccount({id}),
//           ),
//         )
//       : []

//     console.log('🚀 ~ file: [...ids].tsx:75 ~ editors:', editors)
//   return {
//     props: {
//       publication: publication.toJson(),
//       author: author ? author.toJson() : null,
//       siteInfo: siteInfo ? siteInfo.toJson() : null,
//     },
//   }
// }
