/// <reference types="assemblyscript/std/assembly" />

import 'wasi'
import {
  oneoff,
  Subscription,
  SubscriptionU,
  SubscriptionWindowEvent,
  WasiString,
} from './mtt_ephemeral_poll'

function waitFor(ev: string): void {
  let sub = new Subscription()

  const str = new WasiString(ev)

  const sub_payload = new SubscriptionWindowEvent()
  sub_payload.event = str.ptr
  sub_payload.event_len = str.length

  sub.u = SubscriptionU.windowEvent(sub_payload)

  // Create our output event
  // @ts-ignore
  let event = memory.data(offsetof<Event>() + 3)

  oneoff(
    changetype<usize>(sub), // Pointer to the subscription
    event,
    1,
  )
}

console.log('going to sleep')

waitFor('exts://wake')

console.log('awake again')
