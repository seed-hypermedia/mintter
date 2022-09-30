use log::{error, info};
use std::sync::Mutex;
use tauri::{
  api::{
    cli::get_matches,
    dialog::blocking::confirm,
    process::{Command, CommandEvent},
  },
  plugin::{Builder as PluginBuilder, TauriPlugin},
  AppHandle, Manager, Runtime,
};
use tokio::sync::mpsc::{self, Sender};

#[tracing::instrument]
pub fn start_daemon<R: Runtime>(
  app_handle: AppHandle<R>,
  connection: tauri::State<Connection>,
  daemon_flags: tauri::State<Flags>,
) {
  let mut lock = connection.0.lock().unwrap();
  let (tx, mut rx) = mpsc::channel::<()>(1);

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

              let message = format!("The Daemon crashed with exit code {} \n You need to restart the app now.", reason.code.unwrap_or(0));

              if confirm::<R>(None, "Daemon crashed", message) {
                app_handle.restart();
              }

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

#[tracing::instrument]
pub fn stop_daemon(connection: tauri::State<'_, Connection>) {
  let mut lock = connection.0.lock().unwrap();
  *lock = None;
}

#[derive(Debug, Default)]
pub struct Connection(Mutex<Option<Sender<()>>>);

#[derive(Debug, Default)]
pub struct Flags(pub(crate) Vec<String>);

pub fn init<R: Runtime>() -> TauriPlugin<R> {
  PluginBuilder::new("daemon")
    .setup(|app_handle| {
      app_handle.manage(Connection::default());

      let cli_config = app_handle.config().tauri.cli.clone().unwrap();

      let mut flags = get_matches(&cli_config, app_handle.package_info())
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

      let repo_path = app_handle.path_resolver().app_dir().unwrap();

      flags.push(format!("--repo-path={}", repo_path.as_path().display()));

      app_handle.manage(Flags(flags));
      Ok(())
    })
    .build()
}
