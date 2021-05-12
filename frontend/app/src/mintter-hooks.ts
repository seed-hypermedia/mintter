import * as React from 'react';
import {
  useQuery,
  useMutation,
  UseQueryResult,
  useInfiniteQuery,
  UseInfiniteQueryResult,
  QueryFunctionContext,
  UseQueryOptions,
} from 'react-query';
import type mintter from '@mintter/api/v2/mintter_pb';
import type documents from '@mintter/api/documents/v1alpha/documents_pb';
import type networking from '@mintter/api/networking/v1alpha/networking_pb';
import * as apiClient from '@mintter/client';
import type { QueryOptions } from '@testing-library/dom';
import type { Account } from '@mintter/api/accounts/v1alpha/accounts_pb';
import type { Info } from '@mintter/api/daemon/v1alpha/daemon_pb';

export function useAccount<TData = Account.AsObject>(
  accountId?: string,
  options: UseQueryOptions<Account.AsObject, unknown, TData> = {},
) {
  const accountQuery = useQuery(
    accountId ? ['Account', accountId] : ['Account'],
    async ({ queryKey: [_key, id] }) => {
      return await apiClient.getAccount(id);
    },
    options,
  );

  const data: Account.AsObject = React.useMemo(
    () => accountQuery.data?.toObject?.(),
    [accountQuery.data],
  );

  return {
    ...accountQuery,
    data,
  };
}

export function useInfo<TData = Info.AsObject>(
  options: UseQueryOptions<Info.AsObject, unknown, TData> = {},
) {
  const infoQuery = useQuery(['GetInfo'], apiClient.getInfo, options);

  const data: Info.AsObject = React.useMemo(() => infoQuery.data?.toObject(), [
    infoQuery.data,
  ]);

  return {
    ...infoQuery,
    data,
  };
}

export function usePeerAddrs(
  peerId?: string,
  options?: UseQueryOptions<string[], unknown, TData>,
) {
  // query getInfo if peerId is undefined
  // query peerAddrs if peerId is defined or if getInfo is done
  const {
    data: { peerId: currentPeerId },
  } = useInfo();

  const peerAddrsQuery = useQuery<
    networking.GetPeerAddrsResponse,
    unknown,
    networking.GetPeerAddrsResponse
  >(
    ['PeerAddrs', peerId],
    async ({ queryKey: [_key, peerId] }) => {
      let peerIdRequest = peerId;
      if (!peerId) {
        peerIdRequest = currentPeerId;
      }
      return await apiClient.listPeerAddrs(peerIdRequest);
    },
    {
      refetchInterval: 5000,
      enabled: !!peerId || !!currentPeerId,
      ...options,
    },
  );

  const data: string[] = React.useMemo(
    () => peerAddrsQuery.data?.toObject().addrsList,
    [peerAddrsQuery.data],
  );

  return {
    ...peerAddrsQuery,
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
