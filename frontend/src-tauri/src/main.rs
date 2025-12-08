#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .setup(|_app| {
            // Start llama.cpp + backend in the background
            std::thread::spawn(|| {
                let home = std::env::var("HOME").unwrap_or_else(|_| "/home/ryan".to_string());
                let script_path = format!("{home}/apps/Study/start_services.sh");

                let _ = std::process::Command::new("bash")
                    .arg("-lc")
                    .arg(script_path)
                    .spawn();
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
