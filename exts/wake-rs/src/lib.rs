mod mtt_ephemeral_poll;

use mtt_ephemeral_poll::{
  oneoff, Subscription, SubscriptionU, SubscriptionWindowEvent, WasiString,
};

fn wait_for(event: &str) {
  let str = WasiString::from(event);

  println!("{:?}", str);

  let sub = Subscription {
    u: SubscriptionU::new_window_event(SubscriptionWindowEvent {
      event: str.ptr,
      event_len: str.len,
    }),
  };

  oneoff(&sub, 1).expect("failed poll");
}

#[no_mangle]
pub extern "C" fn _start() {
  println!("going to sleep");

  wait_for("exts://wake");

  println!("awake again");
}
