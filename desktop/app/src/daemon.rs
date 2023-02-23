/// This file contains all the code that is responsible for starting and stopping the daemon,
/// as well as collecting it's logs into the shared logging system.
use log::{error, info};
use ringbuffer::{ConstGenericRingBuffer, RingBufferExt, RingBufferWrite};
use std::{collections::HashMap, sync::Mutex};
use tauri::{
  api::{
    dialog::blocking::confirm,
    process::{Command, CommandEvent},
  },
  plugin::{Builder as PluginBuilder, TauriPlugin},
  AppHandle, Manager, Runtime,
};
use tokio::sync::mpsc::{self, Sender};

/// This function starts the daemon with the given `Flags` and `sentry::ClientOptions` to hook into sentry error reporting.
#[tracing::instrument(skip(connection))]
pub fn start_daemon<R: Runtime>(
  app_handle: AppHandle<R>,
  connection: tauri::State<Connection>,
  daemon_flags: tauri::State<Flags>,
  sentry_options: tauri::State<sentry::ClientOptions>,
) {
  let mut lock = connection.0.lock().unwrap();
  let (tx, mut rx) = mpsc::channel::<()>(1);

  // building up all the environment variables exposed to the daemon.
  // These are used for th daemon to enable sentry error reporting.
  let mut envs = HashMap::new();
  if let Some(dsn) = &sentry_options.dsn {
    envs.insert("SENTRY_DSN".to_string(), dsn.to_string().replace(":@", "@"));
  }
  if let Some(release) = &sentry_options.release {
    envs.insert("SENTRY_RELEASE".to_string(), release.to_string());
  }
  if let Some(environment) = &sentry_options.environment {
    envs.insert("SENTRY_ENVIRONMENT".to_string(), environment.to_string());
  }

  // spawn the actual process
  let (mut cx, child) = Command::new_sidecar("mintterd")
    .expect("failed to create `mintterd` binary command")
    .args(daemon_flags.inner().0.iter())
    .envs(envs)
    .spawn()
    .expect("failed to spawn sidecar");

  tauri::async_runtime::spawn(async move {
    // keep a ringbuffer of the last 32 daemon logs around so we can include them in crash messages.
    let mut messages = ConstGenericRingBuffer::<_, 32>::new();

    // loop over the received messages.
    loop {
      tokio::select! {
        // if the channel is dropped (by the `terminate` command later on, we immeditately terminate the daemon)
        _ = rx.recv() => {
            child.kill().unwrap();
            break;
        }
        Some(event) = cx.recv() => {
          match event {
            CommandEvent::Stdout(out) => {
              info!("{}", out);
              messages.push(out);
            },
            CommandEvent::Stderr(out) => {
              info!("{}", out);
              messages.push(out);
            },
            CommandEvent::Error(err) => {
              error!("{}", err);
              messages.push(err);
            },
            // If the daemon terminated we prompt the user to restart the app, since Mintter just cannot work without the daemon
            // and it silently breaking in the background is a bad user experience-
            CommandEvent::Terminated(reason) => {
              match reason.code {
                Some(code) if code == 0 => error!("daemon terminated"),
                Some(code) => error!("daemon crashed with exit code {}", code),
                None => error!("daemon crashed without exit code")
              }

              let message = format!("You need to restart the app now. \n Last messages: \n {}", messages.iter().cloned().collect::<String>());

              if confirm::<R>(None, "The Daemon crashed", message) {
                app_handle.restart();
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

/// This command just drops the sending half of a channel to notify the loop running our end of the daemon handling to terminate it.
#[tracing::instrument]
pub fn stop_daemon(connection: tauri::State<'_, Connection>) {
  let mut lock = connection.0.lock().unwrap();
  *lock = None;
}

#[derive(Debug, Default)]
pub struct Connection(Mutex<Option<Sender<()>>>);

#[derive(Debug, Default)]
pub struct Flags(Vec<String>);

pub fn init<R: Runtime>() -> TauriPlugin<R> {
  PluginBuilder::new("daemon")
    .setup(move |app_handle| {
      app_handle.manage(Connection::default());

      let mut flags: Vec<String> = std::env::args().skip(1).collect();

      if flags.len() > 0 {
        flags = flags[..flags.len() - 1].to_vec();
      }

      // println!("FLAGS AFTER! ==== {:#?}", flags);

      let repo_path = app_handle.path_resolver().app_data_dir().unwrap();
      flags.push(format!("--repo-path={}", repo_path.as_path().display()));

      app_handle.manage(Flags(flags));

      Ok(())
    })
    .build()
}
