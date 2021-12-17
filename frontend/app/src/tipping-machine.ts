import request, {gql} from 'graphql-request'
import {createModel} from 'xstate/lib/model'
import {MINTTER_GRAPHQL_API_URL} from './wallet-machine'

export const tippingModel = createModel(
  {
    amount: 0,
    accountID: '',
    publicationID: '',
    invoice: '',
    errorMessage: '',
  },
  {
    events: {
      OPEN: () => ({}),
      CLOSE: () => ({}),
      RETRY: () => ({}),
      SET_TIP_DATA: (publicationID: string, accountID: string) => ({publicationID, accountID}),
      UPDATE_AMOUNT: (amount: number) => ({amount}),
      REQUEST_INVOICE: () => ({}),
      REPORT_INVOICE_RECEIVED: (invoice: string) => ({invoice}),
      REPORT_INVOICE_ERRORED: (errorMessage: string) => ({errorMessage}),
      PAY_INVOICE: () => ({}),
      REPORT_PAID: () => ({}),
      REPORT_PAID_ERRORED: (errorMessage: string) => ({errorMessage}),
    },
  },
)

export const tippingMachine = tippingModel.createMachine({
  initial: 'close',
  context: tippingModel.initialContext,
  on: {
    SET_TIP_DATA: {
      actions: [
        tippingModel.assign((_, event) => ({
          publicationID: event.publicationID,
          accountID: event.accountID,
        })),
      ],
    },
  },
  states: {
    close: {
      id: 'close',
      on: {
        OPEN: [
          {
            target: 'open',
          },
        ],
      },
    },
    open: {
      initial: 'setAmount',
      on: {
        CLOSE: 'close',
      },
      onDone: {
        target: 'close',
      },
      states: {
        setAmount: {
          on: {
            REQUEST_INVOICE: {
              target: 'requestInvoice',
            },
            UPDATE_AMOUNT: {
              actions: [
                tippingModel.assign({
                  amount: (_, event) => event.amount,
                }),
              ],
            },
          },
        },
        errored: {
          tags: ['pending'],
          on: {
            RETRY: {
              target: 'setAmount',
              actions: [
                tippingModel.assign({
                  errorMessage: '',
                }),
              ],
            },
            REQUEST_INVOICE: {
              target: 'requestInvoice',
              actions: [
                tippingModel.assign({
                  errorMessage: '',
                }),
              ],
            },
          },
        },
        requestInvoice: {
          tags: ['pending'],
          invoke: {
            src: (context) => (sendBack) => {
              let mutation = gql`
                mutation requestInvoice($input: RequestInvoiceInput!) {
                  requestInvoice(input: $input) {
                    paymentRequest
                  }
                }
              `
              request<{requestInvoice: {paymentRequest: string}}>(MINTTER_GRAPHQL_API_URL, mutation, {
                input: {
                  amountSats: context.amount,
                  accountID: context.accountID,
                  publicationID: context.publicationID,
                },
              })
                .then((response) => {
                  console.log('mutation response: ', response)
                  sendBack(tippingModel.events.REPORT_INVOICE_RECEIVED(response.requestInvoice.paymentRequest))
                })
                .catch((err) => {
                  console.log('ERROR: ', err)

                  sendBack(
                    tippingModel.events.REPORT_INVOICE_ERRORED(
                      err.response.errors.map((e: any) => e.message).join(' | '),
                    ),
                  )
                })
            },
          },
          on: {
            REPORT_INVOICE_RECEIVED: {
              target: 'readyToPay',
              actions: [
                tippingModel.assign({
                  invoice: (_, event) => {
                    console.log('INVOICE: ', event.invoice)
                    return event.invoice
                  },
                }),
              ],
            },
            REPORT_INVOICE_ERRORED: {
              target: 'errored',
              actions: [
                tippingModel.assign({
                  errorMessage: (_, event) => event.errorMessage,
                }),
              ],
            },
          },
        },
        readyToPay: {
          on: {
            PAY_INVOICE: {
              target: 'paying',
            },
          },
        },
        paying: {
          tags: ['pending'],
          invoke: {
            src: (context) => (sendBack) => {
              let mutation = gql`
                mutation payInvoice($input: PayInvoiceInput!) {
                  payInvoice(input: $input) {
                    walletID
                  }
                }
              `
              request<{walletID: string}>(MINTTER_GRAPHQL_API_URL, mutation, {
                input: {
                  paymentRequest: context.invoice,
                  amountSats: context.amount,
                },
              })
                .then((response) => {
                  console.log('mutation response: ', response)
                  sendBack(tippingModel.events.REPORT_PAID())
                })
                .catch((err) => {
                  console.log('ERROR: ', err)

                  sendBack(
                    tippingModel.events.REPORT_PAID_ERRORED(err.response.errors.map((e: any) => e.message).join(' | ')),
                  )
                })
            },
          },
          on: {
            REPORT_PAID: {
              target: 'success',
            },
            REPORT_PAID_ERRORED: {
              target: 'errored',
              actions: [
                tippingModel.assign({
                  errorMessage: (_, event) => event.errorMessage,
                }),
              ],
            },
          },
        },
        success: {
          after: {
            3000: {
              target: 'paid',
            },
          },
        },
        paid: {
          type: 'final',
        },
      },
    },
  },
})
