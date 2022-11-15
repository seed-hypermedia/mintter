wit_bindgen_guest_rust::generate!({
  export: "../../desktop/wasi-mtt/wit/client.wit",
  name: "client",
});

wit_bindgen_guest_rust::generate!({
  import: "../../desktop/wasi-mtt/wit/poll.wit",
  name: "poll",
});

fn wait_for(event: &str) {
  let sub = poll::Subscription {
    userdata: 0,
    inner: poll::SubscriptionInner::SubscriptionWindowEvent(poll::SubscriptionWindowEvent {
      event,
    }),
  };

  poll::oneoff(&vec![sub]).expect("failed poll");
}

struct Ext;
impl client::Client for Ext {
  fn start() -> () {
    println!("going to sleep");

    wait_for("exts://wake");

    println!("awake again");
  }
}

export_client!(Ext);
