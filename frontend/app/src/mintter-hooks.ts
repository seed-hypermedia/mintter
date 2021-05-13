import * as React from 'react';
import {
  useQuery,
  useMutation,
  UseQueryResult,
  useInfiniteQuery,
  UseInfiniteQueryResult,
  QueryFunctionContext,
  UseQueryOptions,
  useQueryClient,
} from 'react-query';
import type mintter from '@mintter/api/v2/mintter_pb';
import type documents from '@mintter/api/documents/v1alpha/documents_pb';
import type accounts from '@mintter/api/accounts/v1alpha/accounts_pb'
import type networking from '@mintter/api/networking/v1alpha/networking_pb';
import * as apiClient from '@mintter/client';
import type { QueryOptions } from '@testing-library/dom';
import type daemon from '@mintter/api/daemon/v1alpha/daemon_pb';

export function useAccount<TData = accounts.Account>(
  accountId?: string,
  options: UseQueryOptions<accounts.Account.AsObject, unknown, TData> = {},
): UseQueryResult<accounts.Account.AsObject, unknown> {
  
  const accountQuery = useQuery<accounts.Account, unknown, accounts.Account>(
    accountId ? ['Account', accountId] : ['Account'],
    async ({ queryKey: [_key, id] }) => {
      return await apiClient.getAccount(id);
    },
    options,
  );

  const data: accounts.Account.AsObject = React.useMemo(
    () => accountQuery.data?.toObject(),
    [accountQuery.data],
  );

  return {
    ...accountQuery,
    data,
  };
}

export function useInfo(
  options?: UseQueryOptions<daemon.Info, unknown, daemon.Info>,
): UseQueryResult<daemon.Info.AsObject, unknown> {
  const infoQuery = useQuery<daemon.Info, unknown, daemon.Info>(['GetInfo'], apiClient.getInfo, options);

  const data: daemon.Info.AsObject = React.useMemo<daemon.Info.AsObject>(() => infoQuery.data?.toObject(), [
    infoQuery.data,
  ]);

  return {
    ...infoQuery,
    data,
  };
}

export function usePeerAddrs(
  peerId?: string,
  options?: UseQueryOptions<networking.GetPeerAddrsResponse, unknown, networking.GetPeerAddrsResponse.AsObject>,
) {
  // query getInfo if peerId is undefined
  // query peerAddrs if peerId is defined or if getInfo is done
  const queryClient = useQueryClient()

  let requestId = null;
  if (!peerId) {
    const info = queryClient.getQueryData<daemon.Info.AsObject>('GetInfo')
    console.log("🚀 ~ file: mintter-hooks.ts ~ line 68 ~ info", info)
    requestId = info?.peerId
  } else {
    requestId = peerId
  }
  

  const peerAddrsQuery = useQuery<
    networking.GetPeerAddrsResponse,
    unknown,
    networking.GetPeerAddrsResponse
  >(
    ['PeerAddrs', peerId],
    async ({ queryKey: [_key, peerId] }) => {
      return await apiClient.listPeerAddrs(peerId);
    },
    {
      refetchInterval: 5000,
      enabled: !!requestId,
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
export function useConnectionList({ page } = { page: 0 }, options = {}) {
  return {
    data: [],
    isLoading: false,
    isSuccess: true,
    isError: false,
    error: null,
  };
}

/**
 *
 * @deprecated
 */
export function useSuggestedConnections({ page } = { page: 0 }, options = {}) {
  return {
    data: [],
    isLoading: false,
    isSuccess: true,
    isError: false,
    error: null,
  };
}

export function useConnectionCreate() {
  return {
    connectToPeer: () => {},
  };
}

export function usePublicationsList(options = {}) {
  return {
    data: [],
    isLoading: false,
    isSuccess: true,
    error: null,
    isError: false,
  };
}

export function useOthersPublicationsList(options = {}) {
  return {
    data: [],
    isLoading: false,
    isSuccess: true,
    error: null,
    isError: false,
  };
}

export function useMyPublicationsList(options = {}) {
  return { data: [], isLoading: false, isSuccess: true, error: null, isError: false };
}

export function useDraftsList(options = {}) {
  return { data: [], isLoading: false, isSuccess: true, error: null, isError: false };
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
