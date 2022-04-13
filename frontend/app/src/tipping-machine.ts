import request, {gql} from 'graphql-request'
import {assign, createMachine} from 'xstate'
import {MINTTER_GRAPHQL_API_URL} from './wallet-machine'

type TippingContextType = {
  amount: number
  accountID: string
  publicationID: string
  invoice: string
  errorMessage: string
}

type TippingEvent =
  | {type: 'OPEN'}
  | {type: 'CLOSE'}
  | {type: 'RETRY'}
  | {type: 'TIPPING.SET.TIP.DATA'; publicationID: string; accountID: string}
  | {type: 'TIPPING.UPDATE.AMOUNT'; amount: number}
  | {type: 'TIPPING.REQUEST.INVOICE'}
  | {type: 'REPORT.TIPPING.REQUEST.INVOICE.SUCCESS'; invoice: string}
  | {type: 'REPORT.TIPPING.REQUEST.INVOICE.ERROR'; errorMessage: string}
  | {type: 'TIPPING.PAY.INVOICE'}
  | {type: 'REPORT.TIPPING.PAYMENT.SUCCESS'}
  | {type: 'REPORT.TIPPING.PAYMENT.ERROR'; errorMessage: string}

export const tippingMachine = createMachine(
  {
    tsTypes: {} as import('./tipping-machine.typegen').Typegen0,
    schema: {
      context: {} as TippingContextType,
      events: {} as TippingEvent,
    },
    initial: 'close',
    context: {
      amount: 0,
      invoice: '',
      accountID: '',
      publicationID: '',
      errorMessage: '',
    },
    on: {
      'TIPPING.SET.TIP.DATA': {
        actions: ['assignPublicationID', 'assignAccountID'],
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
              'TIPPING.REQUEST.INVOICE': {
                target: 'requestInvoice',
              },
              'TIPPING.UPDATE.AMOUNT': {
                actions: ['assignAmount'],
              },
            },
          },
          errored: {
            tags: ['pending'],
            on: {
              RETRY: {
                target: 'setAmount',
                actions: ['clearError'],
              },
              'TIPPING.REQUEST.INVOICE': {
                target: 'requestInvoice',
                actions: ['clearError'],
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
                    sendBack({
                      type: 'REPORT.TIPPING.REQUEST.INVOICE.SUCCESS',
                      invoice: response.requestInvoice.paymentRequest,
                    })
                  })
                  .catch((err) => {
                    sendBack({
                      type: 'REPORT.TIPPING.REQUEST.INVOICE.ERROR',
                      errorMessage: err.response.errors.map((e: any) => e.message).join(' | '),
                    })
                  })
              },
            },
            on: {
              'REPORT.TIPPING.REQUEST.INVOICE.SUCCESS': {
                target: 'readyToPay',
                actions: ['assignInvoice'],
              },
              'REPORT.TIPPING.REQUEST.INVOICE.ERROR': {
                target: 'errored',
                actions: ['assignError'],
              },
            },
          },
          readyToPay: {
            on: {
              'TIPPING.PAY.INVOICE': 'paying',
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
                    sendBack('REPORT.TIPPING.PAYMENT.SUCCESS')
                  })
                  .catch((err) => {
                    sendBack({
                      type: 'REPORT.TIPPING.PAYMENT.ERROR',
                      errorMessage: err.response.errors.map((e: any) => e.message).join(' | '),
                    })
                  })
              },
            },
            on: {
              'REPORT.TIPPING.PAYMENT.SUCCESS': 'success',
              'REPORT.TIPPING.PAYMENT.ERROR': {
                target: 'errored',
                actions: ['assignError'],
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
  },
  {
    actions: {
      assignAccountID: assign({
        accountID: (_, event) => event.accountID,
      }),
      assignAmount: assign({
        amount: (_, event) => event.amount,
      }),
      assignError: assign({
        errorMessage: (_, event) => event.errorMessage,
      }),
      assignInvoice: assign({
        invoice: (_, event) => event.invoice,
      }),
      assignPublicationID: assign({
        publicationID: (_, event) => event.publicationID,
      }),
      clearError: assign({
        errorMessage: (context) => '',
      }),
    },
  },
)
