use std::{future::Future, pin::Pin};

use crate::{
  ctx::MttCtx,
  witx::{mtt_ephemeral_poll::MttEphemeralPoll, types},
  Error, ErrorExt,
};
use futures_util::future::select_ok;
use tauri::Runtime;
use tracing::debug;
use wiggle::GuestPtr;

enum SubscriptionResult {
  WindowEvent,
}

#[wiggle::async_trait]
impl<R: Runtime> MttEphemeralPoll for MttCtx<R> {
  #[tracing::instrument(skip(self))]
  async fn oneoff<'a>(
    &mut self,
    subs: &GuestPtr<'a, types::Subscription<'a>>,
    nsubscriptions: types::Size,
  ) -> Result<types::Event, Error> {
    if nsubscriptions == 0 {
      return Err(Error::invalid_argument().context("nsubscriptions must be nonzero"));
    }

    debug!("subs {:?}", subs);

    let subs = subs.as_array(nsubscriptions);

    debug!("subs {:?}", subs);

    let mut futs: Vec<Pin<Box<dyn Future<Output = crate::Result<SubscriptionResult>> + Send>>> =
      vec![];

    for sub_elem in subs.iter() {
      let sub_ptr = sub_elem?;
      let sub = sub_ptr.read()?;

      debug!("{:?}", sub);

      let fut = match sub.u {
        types::SubscriptionU::WindowEvent(weventsub) => {
          debug!("{:?}", weventsub);
          let event_buf = weventsub.event.as_array(weventsub.event_len).as_slice()?;
          debug!("Read buffer {:?}", &event_buf as &[u8]);

          let event_name = std::str::from_utf8(&event_buf)?;

          let (tx, rx) = tokio::sync::oneshot::channel::<()>();

          debug!("Settung up listener for event {}...", event_name);
          self.window.once(event_name, move |_| {
            debug!("Received event!");
            tx.send(()).unwrap();
          });

          Box::pin(async move {
            rx.await?;
            Ok(SubscriptionResult::WindowEvent)
          })
        }
      };

      futs.push(fut);
    }

    debug!("Awaiting poll futures...");
    let (result, _) = select_ok(futs).await?;

    let event = match result {
      SubscriptionResult::WindowEvent => types::Event {
        error: types::MttErrno::Success,
        u: types::EventU::WindowEvent,
      },
    };

    Ok(event)
  }
}
