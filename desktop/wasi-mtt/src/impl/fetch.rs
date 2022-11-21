use crate::{ctx::Table, Context, Error, ErrorKind};
use std::time::Duration;
use tauri::{
  api::http::{Body, HttpRequestBuilder, ResponseType},
  Runtime,
};

wit_bindgen_host_wasmtime_rust::generate!({
  tracing: true,
  async: true,
  import: "./wit/fetch.wit",
  name: "fetch",
});

impl From<ErrorKind> for fetch::Error {
  fn from(e: ErrorKind) -> fetch::Error {
    match e {
      ErrorKind::Ilseq => fetch::Error::Ilseq,
      ErrorKind::Inval => fetch::Error::Inval,
      ErrorKind::Overflow => fetch::Error::Overflow,
      ErrorKind::Io => fetch::Error::Io,
      ErrorKind::Badf => fetch::Error::Badf,
      ErrorKind::Perm => fetch::Error::Perm,
    }
  }
}

impl TryFrom<Error> for fetch::Error {
  type Error = Error;
  fn try_from(e: Error) -> Result<fetch::Error, Error> {
    if e.is::<ErrorKind>() {
      let e = e.downcast::<ErrorKind>().unwrap();
      Ok(e.into())
    } else if e.is::<std::io::Error>() {
      Ok(fetch::Error::Io)
    } else if e.is::<std::num::TryFromIntError>() {
      Ok(fetch::Error::Overflow)
    } else if e.is::<std::str::Utf8Error>() {
      Ok(fetch::Error::Ilseq)
    } else {
      Err(e)
    }
  }
}

#[wit_bindgen_host_wasmtime_rust::async_trait]
impl<R: Runtime> fetch::Fetch for Context<R> {
  async fn fetch(
    &mut self,
    url: String,
    opts: std::option::Option<fetch::FetchOptions>,
  ) -> wit_bindgen_host_wasmtime_rust::Result<u32, fetch::Error> {
    fetch_inner(&mut self.resource_table, url, opts)
      .await
      .map_err(Into::into)
  }
}

async fn fetch_inner(
  table: &mut Table,
  url: String,
  opts: std::option::Option<fetch::FetchOptions>,
) -> crate::Result<u32> {
  let mut req = HttpRequestBuilder::new("Get", url)?;

  if let Some(opts) = opts {
    req.method = opts.method;

    if let Some(timeout) = opts.timeout {
      let duration = match timeout {
        fetch::Timeout::Duration(duration) => Duration::new(duration.secs, duration.nanos),
        fetch::Timeout::U64(duration) => Duration::from_millis(duration),
      };

      req = req.timeout(duration);
    }

    if let Some(headers) = &opts.headers {
      for (k, v) in headers {
        req = req.header(k, v)?;
      }
    }

    if let Some(query) = opts.query {
      req = req.query(query.into_iter().collect());
    }

    if let Some(response_type) = &opts.response_type {
      let response_type = match response_type {
        fetch::ResponseType::Json => ResponseType::Json,
        fetch::ResponseType::Text => ResponseType::Text,
        fetch::ResponseType::Binary => ResponseType::Binary,
      };

      req = req.response_type(response_type);
    }

    if let Some(body) = opts.body {
      req = req.body(Body::Bytes(body));
    }
  }

  let client = tauri::api::http::ClientBuilder::default().build()?;

  let response = client.send(req).await?;

  table.push(Box::new(response))
}
