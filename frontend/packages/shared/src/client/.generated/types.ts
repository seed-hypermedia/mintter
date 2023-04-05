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

/** Input to export a wallet. */
export type ExportWalletInput = {
  /** ID of the wallet to be exported. */
  id: Scalars['ID'];
};

/** Response after exporting a wallet. */
export type ExportWalletPayload = {
  __typename?: 'ExportWalletPayload';
  /** credentials of the exported wallet. */
  credentials: Scalars['String'];
};

/** Lightning Invoices */
export type Invoice = {
  __typename?: 'Invoice';
  /** Invoice quantity in satoshis. */
  Amount: Scalars['Satoshis'];
  /** Memo field of the invoice. */
  Description?: Maybe<Scalars['String']>;
  /** Memo hash in case its too long  */
  DescriptionHash?: Maybe<Scalars['String']>;
  /** Payee lightning node ID. */
  Destination?: Maybe<Scalars['String']>;
  /** Error of the invoice */
  ErrorMessage?: Maybe<Scalars['String']>;
  /** Expiring date. */
  ExpiresAt?: Maybe<Scalars['String']>;
  /** Fees incurred by the payer when paying the invoice */
  Fee?: Maybe<Scalars['Satoshis']>;
  /** If the invoice has been paid or not. */
  IsPaid?: Maybe<Scalars['Boolean']>;
  /** Whether or not this is a made up invoice corrensponding with a keysend payment */
  Keysend?: Maybe<Scalars['Boolean']>;
  /** Preimage hash of the payment. */
  PaymentHash?: Maybe<Scalars['String']>;
  /** Invoice secret known at settlement. Proof of payment */
  PaymentPreimage?: Maybe<Scalars['String']>;
  /** Bolt-11 encoded invoice. */
  PaymentRequest?: Maybe<Scalars['String']>;
  /** Settlement date */
  SettledAt?: Maybe<Scalars['String']>;
  /** Status of the invoice. (Settled, in-flight, expired, ...) */
  Status?: Maybe<Scalars['String']>;
  /** Invoice tyoe */
  Type?: Maybe<Scalars['String']>;
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
  /** Account-wide Lightning addres (lnaddress) */
  lnaddress?: Maybe<Scalars['String']>;
  /** List configured Lightning wallets. */
  wallets?: Maybe<Array<LightningWallet>>;
};

/** Top-level mutations. */
export type Mutation = {
  __typename?: 'Mutation';
  /** Delete existing wallet. */
  deleteWallet: DeleteWalletPayload;
  /** Export wallet to use it with an external application. */
  exportWallet: ExportWalletPayload;
  /** Pay invoice with a previously configured wallet. */
  payInvoice: PayInvoicePayload;
  /** Request an invoice from a user. The user can be either a Mintter Account ID or a ln address. */
  requestInvoice: RequestInvoicePayload;
  /**
   * Set an existing wallet to be the default one. Initially, the first configured wallet
   * automatically becomes the default one.
   */
  setDefaultWallet: SetDefaultWalletPayload;
  /** Configure an LndHub compatible Lightning Wallet, e.g. BlueWallet. */
  setupLndHubWallet: SetupLndHubWalletPayload;
  /** Update lnaddress' nickname. */
  updateNickname: UpdateNicknamePayload;
  /** Update existing wallet. */
  updateWallet: UpdateWalletPayload;
};


/** Top-level mutations. */
export type MutationDeleteWalletArgs = {
  input: DeleteWalletInput;
};


/** Top-level mutations. */
export type MutationExportWalletArgs = {
  input: ExportWalletInput;
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
export type MutationUpdateNicknameArgs = {
  input: UpdateNicknameInput;
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

/** Information about payments */
export type Payments = {
  __typename?: 'Payments';
  /** Payments received. They can be unconfirmed */
  received?: Maybe<Array<Maybe<Invoice>>>;
  /** Payments made. They can be unconfirmed */
  sent?: Maybe<Array<Maybe<Invoice>>>;
};

/** Top-level queries. */
export type Query = {
  __typename?: 'Query';
  /** Information about the current user. */
  me: Me;
  /** Information about payments. */
  payments: Payments;
};


/** Top-level queries. */
export type QueryPaymentsArgs = {
  excludeExpired?: InputMaybe<Scalars['Boolean']>;
  excludeKeysend?: InputMaybe<Scalars['Boolean']>;
  excludeUnpaid?: InputMaybe<Scalars['Boolean']>;
  walletID: Scalars['ID'];
};

/** Input for requesting an invoice. */
export type RequestInvoiceInput = {
  /** Amount in Satoshis the invoice should be created for. */
  amountSats: Scalars['Satoshis'];
  /** Optional description for the invoice. */
  memo?: InputMaybe<Scalars['String']>;
  /** Mintter Account ID or lnaddress we want the invoice from. Can be ourselves. */
  user: Scalars['String'];
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

/** Input to update lnaddress' nickname. */
export type UpdateNicknameInput = {
  /** New nickname to update. */
  nickname: Scalars['String'];
};

/** Response after updating the nickname. */
export type UpdateNicknamePayload = {
  __typename?: 'UpdateNicknamePayload';
  /** Updated Nickname. */
  nickname: Scalars['String'];
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
