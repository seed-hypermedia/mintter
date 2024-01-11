import {NextRequest, NextResponse} from 'next/server'

export const middleware = async (req: NextRequest) => {
  const url = req.nextUrl.clone()
  const search = new URLSearchParams(url.search)
  const versionParam = search.get('v')

  // possible paths with version
  // /
  // /[pathName]
  // /d/[docId]
  // /g/[groupId]
  // /g/[groupId]/[pathName]

  const originalPathName = url.pathname
  const pathTerms = originalPathName.split('/')
  const [_zeroTerm, term1, term2, term3] = pathTerms

  console.log('originalPathName', originalPathName)
  if (originalPathName === '/.well-known/hypermedia-site') {
    url.pathname = '/api/well-known-hypermedia-site'
    return NextResponse.rewrite(url)
  }

  if (term1 === 'ipfs') return NextResponse.next()

  // rewrite front document to the special pathName `-`
  if (pathTerms.length === 2 && term1 === '') {
    if (versionParam) {
      url.pathname = `/-/${versionParam}`
    } else {
      url.pathname = `/-`
    }
  } else if (pathTerms.length === 2) {
    if (versionParam) {
      url.pathname = `/${term1}/${versionParam}`
    } else {
      url.pathname = `/${term1}`
    }
  } else if (pathTerms.length === 3 && term1 === 'd') {
    if (versionParam) {
      url.pathname = `/d/${term2}/${versionParam}`
    } else {
      url.pathname = `/d/${term2}`
    }
  } else if (term1 === 'g') {
    const pathName = term3 || '-'
    if (versionParam) {
      url.pathname = `/g/${term2}/${pathName}/${versionParam}`
    } else {
      url.pathname = `/g/${term2}/${pathName}`
    }
  }

  if (url.pathname !== originalPathName) {
    console.log(`rewriting ${originalPathName} to ${url.pathname}`)
  }

  return NextResponse.rewrite(url)
}
