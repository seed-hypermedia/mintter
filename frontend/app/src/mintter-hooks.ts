import * as React from 'react';
import {
  useQuery,
  useMutation,
  UseQueryResult,
  useInfiniteQuery,
  UseInfiniteQueryResult,
  QueryFunctionContext,
} from 'react-query';
import type mintter from '@mintter/api/v2/mintter_pb';
import type documents from '@mintter/api/documents/v1alpha/documents_pb';
import * as apiClient from '@mintter/client';

export function useAccount(accountId?: string, options = {}) {
  const accountQuery = useQuery(
    accountId ? ['Account', accountId] : ['Account'],
    async ({ queryKey }) => {
      return await await apiClient.getAccount(queryKey[1]);
    },
    options,
  );

  const data = React.useMemo(() => accountQuery.data?.toObject?.(), [
    accountQuery.data,
  ]);

  return {
    ...accountQuery,
    data,
  };
}

export function useInfo(options = {}) {
  const infoQuery = useQuery(
    ['GetInfo'],
    async () => {
      return await apiClient.getInfo();
    },
    options,
  );

  const data = React.useMemo(() => infoQuery.data?.toObject(), [
    infoQuery.data,
  ]);

  return {
    ...infoQuery,
    data,
  };
}

/**
 *
 * @deprecated
 */
export function useProfile(options = {}) {
  const profileQuery = useQuery(
    ['Profile'],
    async (_ctx) => {
      return await (await apiClient.getProfile()).getProfile();
    },
    options,
  );

  const data = React.useMemo(() => profileQuery.data?.toObject?.(), [
    profileQuery.data,
  ]);

  return {
    ...profileQuery,
    data,
  };
}

/**
 *
 * @deprecated
 */
export function useAuthor(accountId?: string, options = {}) {
  if (!accountId) return useProfile(options);
  const profileQuery = useQuery(
    accountId && ['Author', accountId],
    async ({ queryKey }) => {
      return apiClient.getProfile(queryKey[1]);
    },
    options,
  );

  const data = React.useMemo(() => profileQuery.data?.toObject?.().profile, [
    profileQuery.data,
  ]);

  return {
    ...profileQuery,
    data,
  };
}

export function usePeerAddrs() {
  const peerAddrsQuery = useQuery(['PeerAddrs'], apiClient.listPeerAddrs, {
    refetchInterval: 5000,
  });

  const data = React.useMemo(() => peerAddrsQuery.data?.toObject().addrsList, [
    peerAddrsQuery.data,
  ]);

  return {
    ...peerAddrsQuery,
    data,
  };
}

/**
 *
 * @deprecated
 */
export function useProfileAddrs() {
  const profileAddrsQuery = useQuery(
    ['ProfileAddrs'],
    async () => {
      return await apiClient.getProfileAddress();
    },
    {
      refetchInterval: 5000,
    },
  );

  const data = React.useMemo(
    () => profileAddrsQuery.data?.toObject().addrsList,
    [profileAddrsQuery.data],
  );

  return {
    ...profileAddrsQuery,
    data,
  };
}

/**
 *
 * @deprecated
 */
export function useConnectionList({ page } = { page: 0 }, options = {}) {
  const connectionsQuery = useQuery(
    ['ListConnections'],
    async ({ queryKey }) => {
      return apiClient.listProfiles();
    },
    {
      refetchOnWindowFocus: true,
      refetchInterval: 5000,
      ...options,
    },
  );

  const data = React.useMemo(
    () => connectionsQuery.data?.toObject().profilesList,
    [connectionsQuery.data],
  );

  return {
    ...connectionsQuery,
    data,
  };
}

/**
 *
 * @deprecated
 */
export function useSuggestedConnections({ page } = { page: 0 }, options = {}) {
  const suggestionsQuery = useQuery(
    ['ListSuggestedConnections', page],
    async () => {
      return apiClient.listSuggestedProfiles();
    },
    {
      refetchOnWindowFocus: true,
      refetchInterval: 5000,
      ...options,
    },
  );

  const data = React.useMemo(
    () => suggestionsQuery.data?.toObject().profilesList,
    [suggestionsQuery.data],
  );

  return {
    ...suggestionsQuery,
    data,
  };
}

export function useConnectionCreate() {
  const { mutateAsync: connectToPeer, ...mutationOptions } = useMutation(
    (peerIds: string[]) => apiClient.connectToPeer(peerIds),
    {
      onSuccess: () => {
        // TODO: refetch all these without queryCache
        // queryCache.refetchQueries(['ListConnections']);
        // queryCache.refetchQueries(['ListSuggestedConnections']);
        // queryCache.refetchQueries(['Documents']);
      },
      onError: (params) => {
        throw new Error(
          `Connection to Peer error -> ${JSON.stringify(params)}`,
        );
      },
    },
  );

  return {
    connectToPeer,
    ...mutationOptions,
  };
}

export function usePublicationsList(options = {}) {
  const docsQuery = useQuery(
    'Publications',
    async () => await apiClient.listPublications(),
    {
      ...options,
      refetchOnWindowFocus: true,
      // refetchInterval: 5000,
    },
  );

  const data = React.useMemo(
    () =>
      docsQuery.data
        ?.getPublicationsList()
        .map((publication: documents.Publication) => {
          return {
            ...publication.toObject(),
            publication,
          };
        }),
    [docsQuery.data],
  );

  return {
    ...docsQuery,
    data,
  };
}

export function useOthersPublicationsList(options = {}) {
  const docsQuery = usePublicationsList(options);
  const { data: profile } = useProfile();

  const userId = React.useMemo(() => profile?.accountId, [profile]);

  const data = React.useMemo(
    () =>
      docsQuery.data?.filter(({ document }) => {
        return document?.author !== userId;
      }),
    [docsQuery.data, userId],
  );

  return {
    ...docsQuery,
    data,
  };
}

export function useMyPublicationsList(options = {}) {
  const docsQuery = usePublicationsList(options);
  const { data: profile } = useProfile();

  const userId = React.useMemo(() => profile?.accountId, [profile]);

  const data = React.useMemo(
    () =>
      docsQuery.data?.filter(({ document }) => {
        // TODO: remove when API is ready
        // return document?.author === userId;
        return true;
      }),
    [docsQuery.data, userId],
  );

  return {
    ...docsQuery,
    data,
  };
}

export function useDraftsList(options = {}) {
  const draftsQuery = useQuery(
    'Drafts',
    async () => apiClient.listDrafts(),
    options,
  );

  const data = React.useMemo(() => draftsQuery.data?.getDocumentsList(), [
    draftsQuery.data,
  ]);

  return {
    ...draftsQuery,
    data,
  };
}

export function usePublication(
  documentId: string,
  version?: string,
  options = {},
) {
  if (!documentId) {
    throw new Error(`usePublication: parameter "documentId" is required`);
  }

  if (Array.isArray(documentId)) {
    throw new Error(
      `Impossible render: You are trying to access a document passing ${
        documentId.length
      } document Ids => ${documentId.map((q) => q).join(', ')}`,
    );
  }

  const pubQuery = useQuery(
    ['Publication', documentId, version],
    async ({ queryKey }) => {
      const [_key, documentId, version] = queryKey;
      return apiClient.getPublication(documentId, version);
    },
    {
      // initialData: () =>
      // queryCache
      //   .getQueryData<ListDocumentsResponse>('Documents')
      //   ?.toObject()
      //   ?.documentsList.find(doc => doc.version === version),
      // initialStale: true,
      refetchOnWindowFocus: false,
      ...options,
    },
  );

  const data = React.useMemo(() => pubQuery.data?.toObject?.(), [
    pubQuery.data,
  ]);

  return {
    ...pubQuery,
    data,
  };
}

export function useDraft(draftId: string, options = {}) {
  if (!draftId) {
    throw new Error(`useDraft: parameter "draftId" is required`);
  }

  if (Array.isArray(draftId)) {
    throw new Error(
      `Impossible render: You are trying to access a draft passing ${
        draftId.length
      } draft Ids => ${draftId.map((q) => q).join(', ')}`,
    );
  }

  const draftQuery = useQuery(
    ['Draft', draftId],
    async ({ queryKey }) => {
      const [_key, draftId] = queryKey;
      return apiClient.getDraft(draftId);
    },
    {
      // initialData: () =>
      // queryCache
      //   .getQueryData<ListDocumentsResponse>('Documents')
      //   ?.toObject()
      //   ?.documentsList.find(doc => doc.version === version),
      // initialStale: true,
      refetchOnWindowFocus: false,
      ...options,
    },
  );

  const data = React.useMemo(() => draftQuery.data?.toObject?.(), [
    draftQuery.data,
  ]);

  return {
    ...draftQuery,
    data,
  };
}
