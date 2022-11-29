use futures_util::future::select_ok;
use std::{future::Future, pin::Pin};
use tauri::Runtime;
use wit_bindgen_host_wasmtime_rust::Result as HostResult;
use crate::{Context, Error, ErrorKind, Promises, r#impl::pledge::contains};

wit_bindgen_host_wasmtime_rust::generate!({
    tracing: true,
    async: true,
    import: "./wit/poll.wit",
    name: "poll",
});

impl From<ErrorKind> for poll::Error {
  fn from(e: ErrorKind) -> poll::Error {
    match e {
      ErrorKind::Ilseq => poll::Error::Ilseq,
      ErrorKind::Inval => poll::Error::Inval,
      ErrorKind::Overflow => poll::Error::Overflow,
      ErrorKind::Io => poll::Error::Io,
      ErrorKind::Badf => poll::Error::Badf,
      ErrorKind::Perm => poll::Error::Perm,
    }
  }
}

impl TryFrom<Error> for poll::Error {
  type Error = Error;
  fn try_from(e: Error) -> Result<poll::Error, Error> {
    if e.is::<ErrorKind>() {
      let e = e.downcast::<ErrorKind>().unwrap();
      Ok(e.into())
    } else if e.is::<std::io::Error>() {
      Ok(poll::Error::Io)
    } else if e.is::<std::num::TryFromIntError>() {
      Ok(poll::Error::Overflow)
    } else if e.is::<std::str::Utf8Error>() {
      Ok(poll::Error::Ilseq)
    } else {
      Err(e)
    }
  }
}

#[wit_bindgen_host_wasmtime_rust::async_trait]
impl<R: Runtime> poll::Poll for Context<R> {
  async fn oneoff(
    &mut self,
    subs: Vec<poll::Subscription>,
  ) -> HostResult<poll::Event, poll::Error> {
    if !contains(self.promises, Promises::STDIO) {
      Err(poll::Error::Perm)?
    }

    ::log::debug!("{:?}", subs);

    let mut futs: Vec<Pin<Box<dyn Future<Output = crate::Result<poll::Event>> + Send>>> = vec![];

    for sub in subs {
      let fut = match sub.inner {
        poll::SubscriptionInner::SubscriptionWindowEvent(weventsub) => {
          let (tx, rx) = tokio::sync::oneshot::channel::<()>();

          ::log::debug!("Settung up listener for event {}...", weventsub.event);

          self.window.once(weventsub.event, move |_| {
            ::log::debug!("Received event!");
            tx.send(()).unwrap();
          });

          Box::pin(async move {
            rx.await?;
            Ok(poll::Event {
              userdata: sub.userdata,
              inner: poll::EventInner::WindowEvent,
            })
          })
        }
      };

      futs.push(fut);
    }

    ::log::debug!("Awaiting poll futures...");
    let (result, _) = select_ok(futs).await?;

    Ok(result)
  }
}
