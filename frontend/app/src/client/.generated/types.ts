export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  /**
   * Lightning Network payment request encoded as a string.
   * Ready to be encoded as a QR code for wallets to scan and pay.
   */
  LightningPaymentRequest: any;
  /**
   * Bitcoin amount in sats.
   * Should be interpreted as a large-enough unsigned integer type.
   */
  Satoshis: any;
};

/** Input to delete a wallet. */
export type DeleteWalletInput = {
  /** ID of the wallet to be deleted. */
  id: Scalars['ID'];
};

/** Response after deleting a wallet. */
export type DeleteWalletPayload = {
  __typename?: 'DeleteWalletPayload';
  /** ID of the deleted wallet. */
  id: Scalars['ID'];
};

/** Common interface for Lightning wallets. We support different types. */
export type LightningWallet = {
  /** Balance in Satoshis. */
  balanceSats: Scalars['Satoshis'];
  /** Globally unique ID of the wallet. Public key. */
  id: Scalars['ID'];
  /** If this wallet is the default wallet to send/receive automatic payments */
  isDefault: Scalars['Boolean'];
  /** Local-only name of the wallet. For user's convenience. */
  name: Scalars['String'];
};

/** Lightning wallet compatible with LndHub. */
export type LndHubWallet = LightningWallet & {
  __typename?: 'LndHubWallet';
  /** URL of the LndHub server this wallet is connected to. */
  apiURL: Scalars['String'];
  /** Balance in Satoshis. */
  balanceSats: Scalars['Satoshis'];
  /**
   * Globally unique ID of the wallet. Since this type of wallet doesn't have unique addresses
   * we decided to use the cryptographic hash of the credentials URL as an ID.
   */
  id: Scalars['ID'];
  /** If this wallet is the default wallet to send/receive automatic payments */
  isDefault: Scalars['Boolean'];
  /** Name of the wallet. */
  name: Scalars['String'];
};

/** Information about the current user. */
export type Me = {
  __typename?: 'Me';
  /** List configured Lightning wallets. */
  wallets?: Maybe<Array<LightningWallet>>;
};

/** Top-level mutations. */
export type Mutation = {
  __typename?: 'Mutation';
  /** Delete existing wallet. */
  deleteWallet: DeleteWalletPayload;
  /** Pay invoice with a previously configured wallet. */
  payInvoice: PayInvoicePayload;
  /**
   * Request an invoice from another user in order to pay them with a separate Lightning Wallet.
   * The user from which the invoice is requested must be currently connected, otherwise this call will fail.
   */
  requestInvoice: RequestInvoicePayload;
  /**
   * Set an existing wallet to be the default one. Initially, the first configured wallet
   * automatically becomes the default one.
   */
  setDefaultWallet: SetDefaultWalletPayload;
  /** Configure an LndHub compatible Lightning Wallet, e.g. BlueWallet. */
  setupLndHubWallet: SetupLndHubWalletPayload;
  /** Update existing wallet. */
  updateWallet: UpdateWalletPayload;
};


/** Top-level mutations. */
export type MutationDeleteWalletArgs = {
  input: DeleteWalletInput;
};


/** Top-level mutations. */
export type MutationPayInvoiceArgs = {
  input: PayInvoiceInput;
};


/** Top-level mutations. */
export type MutationRequestInvoiceArgs = {
  input: RequestInvoiceInput;
};


/** Top-level mutations. */
export type MutationSetDefaultWalletArgs = {
  input: SetDefaultWalletInput;
};


/** Top-level mutations. */
export type MutationSetupLndHubWalletArgs = {
  input: SetupLndHubWalletInput;
};


/** Top-level mutations. */
export type MutationUpdateWalletArgs = {
  input: UpdateWalletInput;
};

/** Input to pay an invoice. */
export type PayInvoiceInput = {
  /**
   * Optional amount in satoshis to pay. In case this is not defined,
   * The amount showed in the invoice will be paid. If amountSats is
   * provided, then the invoice amount will be override. This will cause
   * an error unless both amounts are the same or the invoice amount is 0.
   */
  amountSats?: InputMaybe<Scalars['Satoshis']>;
  /** Previously obtained payment request we want to pay for. */
  paymentRequest: Scalars['LightningPaymentRequest'];
  /** Optional ID of the wallet to pay with. Otherwise the default one will be used. */
  walletID?: InputMaybe<Scalars['ID']>;
};

/** Response after paying an invoice. */
export type PayInvoicePayload = {
  __typename?: 'PayInvoicePayload';
  /** Wallet ID that was used to pay the invoice. */
  walletID: Scalars['ID'];
};

/** Top-level queries. */
export type Query = {
  __typename?: 'Query';
  /** Information about the current user. */
  me: Me;
};

/** Input for requesting an invoice for tipping. */
export type RequestInvoiceInput = {
  /** Mintter Account ID we want to tip. */
  accountID: Scalars['ID'];
  /** Amount in Satoshis the invoice should be created for. */
  amountSats: Scalars['Satoshis'];
  /** Optional ID of the publication we want to tip for. */
  publicationID?: InputMaybe<Scalars['ID']>;
};

/** Response with the invoice to pay. */
export type RequestInvoicePayload = {
  __typename?: 'RequestInvoicePayload';
  /**
   * Payment request is a string-encoded Lightning Network Payment Request.
   * It's ready to be used in a wallet app to pay.
   */
  paymentRequest: Scalars['LightningPaymentRequest'];
};

/** Input for setting the default wallet. */
export type SetDefaultWalletInput = {
  /** ID of the wallet to become the default one. */
  id: Scalars['ID'];
};

/** Response after setting default wallet. */
export type SetDefaultWalletPayload = {
  __typename?: 'SetDefaultWalletPayload';
  /** The new default wallet. */
  wallet: LightningWallet;
};

/** Input to setup LndHub wallet. */
export type SetupLndHubWalletInput = {
  /** Local name for this wallet. */
  name: Scalars['String'];
  /** Configuration URL with credentials for an LndHub wallet. */
  url: Scalars['String'];
};

/** Response from setting up LndHub wallet. */
export type SetupLndHubWalletPayload = {
  __typename?: 'SetupLndHubWalletPayload';
  /** The newly created wallet. */
  wallet: LndHubWallet;
};

/** Input to update Lightning wallets. */
export type UpdateWalletInput = {
  /** ID of the wallet to be updated. */
  id: Scalars['ID'];
  /** New name for the wallet. */
  name: Scalars['String'];
};

/** Response with the updated wallet. */
export type UpdateWalletPayload = {
  __typename?: 'UpdateWalletPayload';
  /** Updated wallet. */
  wallet: LightningWallet;
};
