#[link(name = "vcruntime")]
extern {}

#[link(name = "ucrt")]
extern {}

fn main() {
  tauri_build::build();
}
