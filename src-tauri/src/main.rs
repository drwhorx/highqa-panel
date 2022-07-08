#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

fn main() {
    std::env::set_var(
        "WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS",
        "--disable-web-security --allow-running-insecure-content",
    );
    let context = tauri::generate_context!();
    tauri::Builder::default()
        .menu(if cfg!(target_os = "macos") {
            tauri::Menu::os_default(&context.package_info().name)
        } else {
            tauri::Menu::default()
        })
        .invoke_handler(tauri::generate_handler![draw_pdf, test])
        .run(context)
        .expect("error while running tauri application");
}

#[tauri::command]
fn draw_pdf(pdfdata: String, index: u16) {

    /*
    println!("stage0");
    let bindings = Pdfium::bind_to_library(
        Pdfium::pdfium_platform_library_name_at_path("./")
    ).unwrap();
    println!("stage1");
    let pdfium = Pdfium::new(bindings);
    println!("stage2");
    let document = pdfium.load_pdf_from_bytes(&pdfdata.as_bytes().to_vec(), None).unwrap();
    println!("stage3");
    let config = PdfBitmapConfig::new()
        .set_target_height(600)
        .set_maximum_width(20000);
    let page = document.pages().get(index).unwrap();
    let mut bitmap = page.get_bitmap_with_config(&config).unwrap();
    println!("stage4");
    return bitmap.as_image().as_rgb8().unwrap().to_vec();
    */
}

#[tauri::command]
fn test() {
    println!("hmmm");
}