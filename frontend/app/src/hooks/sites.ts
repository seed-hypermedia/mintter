import {appQueryClient} from '@app/query-client'
import {
  addSite,
  listWebPublications,
  listSites,
  removeSite,
  siteGetSiteInfo,
  siteUpdateSiteInfo,
  publishDoc,
  unpublish,
} from '@mintter/shared'
import {SiteConfig} from '@mintter/shared/dist/client/.generated/daemon/v1alpha/sites'
import {SiteInfo} from '@mintter/shared/dist/client/.generated/site/v1alpha/site'
import {
  useMutation,
  UseMutationOptions,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {queryKeys} from './index'

export function useDocPublications(docId: string) {
  return useQuery({
    queryKey: [queryKeys.GET_DOC_PUBLICATIONS],
    queryFn: async () => {
      return []
    },
  })
}

export function useSiteList() {
  return useQuery<SiteConfig[]>({
    queryKey: [queryKeys.GET_SITES],
    queryFn: async () => {
      const result = await listSites()
      return result.sites
      // temp init sites include this:
      // return [{id: 'ethosphera.org'}] as Site[]
    },
  })
}

export function useAddSite() {
  const queryClient = useQueryClient()

  return useMutation(
    async (hostname: string, token?: string) => {
      await addSite(hostname, token)
      return null
    },
    {
      onSuccess: (_result, _hostname) => {
        queryClient.invalidateQueries([queryKeys.GET_SITES])
        // queryClient.setQueryData(
        //   [queryKeys.GET_SITES],
        //   (oldSites: Site[] | undefined) => {
        //     const site = {id: hostname}
        //     if (oldSites) return [...oldSites, site]
        //     return [site]
        //   },
        // )
      },
    },
  )
}

export function useSiteInfo(siteId: string) {
  return useQuery<SiteInfo>({
    queryKey: [queryKeys.GET_SITE_INFO, siteId],
    queryFn: async () => {
      return await siteGetSiteInfo(siteId)
    },
  })
}

export function useWriteSiteInfo(
  hostname: string,
  opts?: UseMutationOptions<unknown, unknown, Partial<SiteInfo>>,
) {
  return useMutation(
    async (info: Partial<SiteInfo>) => {
      await siteUpdateSiteInfo(hostname, info.title, info.description)
    },
    {
      ...opts,
      onSuccess: (response, input, ctx) => {
        appQueryClient.invalidateQueries([queryKeys.GET_SITE_INFO, hostname])
        opts?.onSuccess?.(response, input, ctx)
      },
    },
  )
}

export function useRemoveSite(siteId: string, opts: UseMutationOptions) {
  const queryClient = useQueryClient()

  return useMutation(
    async () => {
      await removeSite(siteId)
    },
    {
      ...opts,
      onSuccess: (response, input, ctx) => {
        queryClient.invalidateQueries([queryKeys.GET_SITES])

        // queryClient.setQueryData(
        //   [queryKeys.GET_SITES],
        //   (oldSites: any[] | undefined) => {
        //     if (oldSites) return oldSites.filter((site) => site.id !== siteId)
        //     return undefined
        //   },
        // )
        opts?.onSuccess?.(response, input, ctx)
      },
    },
  )
}

export function useSitePublications(hostname: string | undefined) {
  return useQuery({
    queryKey: [queryKeys.GET_WEB_PUBLICATIONS, hostname],
    queryFn: async () => {
      if (!hostname) return {publications: []}
      return await listWebPublications(hostname)
    },
  })
}

export function useSitePublish() {
  const queryClient = useQueryClient()
  return useMutation(
    async ({
      hostname,
      docId,
      path,
    }: {
      hostname: string
      docId: string
      path: string
    }) => {
      await publishDoc(hostname, docId, path)
    },
    {
      onSuccess: (a, input) => {
        queryClient.invalidateQueries([
          queryKeys.GET_WEB_PUBLICATIONS,
          input.hostname,
        ])
      },
    },
  )
}

export function useSiteUnpublish() {
  const queryClient = useQueryClient()
  return useMutation(
    async ({
      hostname,
      publicationId,
    }: {
      hostname: string
      publicationId: string
    }) => {
      await unpublish(hostname, publicationId)
    },
    {
      onSuccess: (a, input) => {
        queryClient.invalidateQueries([
          queryKeys.GET_WEB_PUBLICATIONS,
          input.hostname,
        ])
      },
    },
  )
}
