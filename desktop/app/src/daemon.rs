use log::{error, info};
use std::sync::Mutex;
use tauri::{
  api::{
    cli::get_matches,
    process::{Command, CommandEvent},
  },
  plugin::{Plugin, Result as PluginResult},
  AppHandle, Invoke, Manager, Runtime,
};
use tokio::sync::mpsc::{self, Sender};

pub struct DaemonPlugin<R: Runtime> {
  invoke_handler: Box<dyn Fn(Invoke<R>) + Send + Sync>,
}

#[derive(Debug, Default)]
pub struct Connection(Mutex<Option<Sender<()>>>);

#[derive(Debug, Default)]
pub struct Flags(pub(crate) Vec<String>);

pub fn start_daemon(connection: tauri::State<Connection>, daemon_flags: tauri::State<Flags>) {
  let mut lock = connection.0.lock().unwrap();
  let (tx, mut rx) = mpsc::channel::<()>(1);

  println!("{:?}", daemon_flags.inner());

  let (mut cx, child) = Command::new_sidecar("mintterd")
    .expect("failed to create `mintterd` binary command")
    .args(daemon_flags.inner().0.iter())
    .spawn()
    .expect("failed to spawn sidecar");

  tauri::async_runtime::spawn(async move {
    loop {
      tokio::select! {
        _ = rx.recv() => {
            child.kill().unwrap();
            break;
        }
        Some(event) = cx.recv() => {
          match event {
            CommandEvent::Stdout(out) => info!("{}", out),
            CommandEvent::Stderr(out) => info!("{}", out),
            CommandEvent::Error(err) => error!("{}", err),
            CommandEvent::Terminated(reason) => {
              match reason.code {
                Some(code) if code == 0 => error!("daemon terminated"),
                Some(code) => error!("daemon crashed with exit code {}", code),
                None => error!("daemon crashed without exit code")
              }
            },
            _ => {}
          }
        }
      }
    }
  });
  *lock = Some(tx);
}

pub fn stop_daemon(connection: tauri::State<'_, Connection>) {
  let mut lock = connection.0.lock().unwrap();
  *lock = None;
}

impl<R: Runtime> DaemonPlugin<R> {
  // you can add configuration fields here,
  // see https://doc.rust-lang.org/1.0.0/style/ownership/builders.html
  pub fn new() -> Self {
    Self {
      invoke_handler: Box::new(tauri::generate_handler![]),
    }
  }
}

impl<R: Runtime> Plugin<R> for DaemonPlugin<R> {
  /// The plugin name. Must be defined and used on the `invoke` calls.
  fn name(&self) -> &'static str {
    "daemon"
  }

  /// initialize plugin with the config provided on `tauri.conf.json > plugins > $yourPluginName` or the default value.
  fn initialize(&mut self, app: &AppHandle<R>, _: serde_json::Value) -> PluginResult<()> {
    app.manage(Connection::default());

    let cli_config = app.config().tauri.cli.clone().unwrap();

    let flags = get_matches(&cli_config)
      .ok()
      .and_then(|matches| {
        let str = matches.args.get("daemon-flags")?.value.as_str()?;
        Some(
          str[1..str.len() - 1]
            .split_whitespace()
            .map(ToString::to_string)
            .collect::<Vec<String>>(),
        )
      })
      .unwrap_or_default();

    app.manage(Flags(flags));
    Ok(())
  }

  /// Extend the invoke handler.
  fn extend_api(&mut self, message: Invoke<R>) {
    (self.invoke_handler)(message)
  }
}
