// This file was automatically generated. Edits will be overwritten

export interface Typegen0 {
  '@@xstate/typegen': true
  eventsCausingActions: {
    assignPublicationID: 'TIPPING.SET.TIP.DATA'
    assignAccountID: 'TIPPING.SET.TIP.DATA'
    assignAmount: 'TIPPING.UPDATE.AMOUNT'
    clearError: 'RETRY' | 'TIPPING.REQUEST.INVOICE'
    assignInvoice: 'REPORT.TIPPING.REQUEST.INVOICE.SUCCESS'
    assignError: 'REPORT.TIPPING.REQUEST.INVOICE.ERROR' | 'REPORT.TIPPING.PAYMENT.ERROR'
  }
  internalEvents: {
    'xstate.init': {type: 'xstate.init'}
  }
  invokeSrcNameMap: {}
  missingImplementations: {
    actions: never
    services: never
    guards: never
    delays: never
  }
  eventsCausingServices: {}
  eventsCausingGuards: {}
  eventsCausingDelays: {}
  matchesStates:
    | 'close'
    | 'open'
    | 'open.setAmount'
    | 'open.errored'
    | 'open.requestInvoice'
    | 'open.readyToPay'
    | 'open.paying'
    | 'open.success'
    | 'open.paid'
    | {open?: 'setAmount' | 'errored' | 'requestInvoice' | 'readyToPay' | 'paying' | 'success' | 'paid'}
  tags: 'pending'
}
