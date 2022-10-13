#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

#[macro_use]
extern crate lazy_static;

use async_std::net::TcpStream;
use serde_json::{Map, Value};
use sqlx::{Connection, MssqlConnection};
use std::{error::Error, string, sync::Arc};
use tiberius::time::chrono::*;
use tiberius::{AuthMethod, Client, Column, Config, Query, Row};
use tiberius::{ColumnData, FromSql, FromSqlOwned, SqlBrowser};

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
        .invoke_handler(tauri::generate_handler![draw_pdf, rt_data])
        .run(context)
        .expect("error while running tauri application");
}

pub trait BullShit {
    fn my_string(&self) -> String;
}

impl<'a, T: FromSql<'a>> BullShit for T {
    fn my_string(&self) -> String {
        return "".to_string();
    }
}

#[tauri::command]
async fn rt_data(search: &str) -> Result<Vec<Vec<String>>, String> {
    let block = async {
        let config = Config::from_ado_string(
            "SERVER=tcp:192.168.111.215\\REALTRACSQL;UID=realtracsql;PWD=realtracsql;
            DATABASE=Realtrac;TrustServerCertificate=true",
        )?;
        let tcp = TcpStream::connect_named(&config).await?;
        tcp.set_nodelay(true)?;
        let mut client = Client::connect(config, tcp).await?;
        let mut query = client.query(search, &[]).await?;
        let cols: Vec<String> = {
            query.columns().await?.unwrap().into_iter().map(
                |col| col.name().to_string()
            ).collect()
        };
        let rows = query.into_first_result().await?;
        println!("got data");
        let mut data: Vec<Vec<String>> = rows
            .into_iter()
            .map(|row| {
                row.into_iter().map(|item|
                    match item {
                        ColumnData::U8(val) => val.unwrap_or_default().to_string(),
                        ColumnData::I16(val) => val.unwrap_or_default().to_string(),
                        ColumnData::I32(val) => val.unwrap_or_default().to_string(),
                        ColumnData::I64(val) => val.unwrap_or_default().to_string(),
                        ColumnData::F32(val) => val.unwrap_or_default().to_string(),
                        ColumnData::F64(val) => val.unwrap_or_default().to_string(),
                        ColumnData::Bit(val) => val.unwrap_or_default().to_string(),
                        ColumnData::String(val) => val.unwrap_or_default().as_ref().into(),
                        ColumnData::Guid(val) => val.unwrap_or_default().to_string(),
                        ColumnData::Binary(val) => "<binary data>".into(),
                        ColumnData::Numeric(val) => val.unwrap().to_string(),
                        ColumnData::Xml(val) => val.unwrap().as_ref().to_string(),
                        ColumnData::DateTime(ref val) => val
                            .map(|dt| {
                                let datetime = NaiveDateTime::from_sql(&item).unwrap().unwrap();
                                datetime.format("%Y/%m/%d %H:%M:%S").to_string()
                            })
                            .unwrap_or_default(),
                        ColumnData::SmallDateTime(ref val) => val
                            .map(|dt| {
                                let datetime = NaiveDateTime::from_sql(&item).unwrap().unwrap();
                                datetime.format("%Y/%m/%d %H:%M:%S").to_string()
                            })
                            .unwrap_or_default(),
                        ColumnData::Time(ref val) => val
                            .map(|time| {
                                let time = NaiveTime::from_sql(&item).unwrap().unwrap();
                                time.format("%H:%M:%S").to_string()
                            })
                            .unwrap_or_default(),
                        ColumnData::Date(ref val) => val
                            .map(|date| {
                                let date = NaiveDate::from_sql(&item).unwrap().unwrap();
                                date.format("%Y/%m/%d").to_string()
                            })
                            .unwrap_or_default(),
                        ColumnData::DateTime2(ref val) => val
                            .map(|dt| {
                                let datetime = NaiveDateTime::from_sql(&item).unwrap().unwrap();
                                datetime.format("%Y/%m/%d %H:%M:%S").to_string()
                            })
                            .unwrap_or_default(),
                        ColumnData::DateTimeOffset(ref val) => val
                            .map(|dt| {
                                let datetime =
                                    DateTime::<FixedOffset>::from_sql(&item).unwrap().unwrap();
                                datetime.format("%Y/%m/%d %H:%M:%S").to_string()
                            })
                            .unwrap_or_default(),
                    }
                ).collect()
            })
            .collect();
        data.insert(0, cols);
        Ok::<Vec<Vec<String>>, Box<dyn Error>>(data)
    };
    
    match block.await {
        Ok(res) => return Ok(res),
        Err(e) => return Err(e.to_string())
    }
}

#[tauri::command]
fn draw_pdf(pdfdata: &[u8], index: u32) {
    /*
    let file = File::from_data(pdfdata).unwrap();
    let page = file.get_page(index).unwrap();

    let mut cache = Cache::new();
    let mut backend = SceneBackend::new(&mut cache);

    render_page(&mut backend, &file, &page, Transform2F::from_scale(300.0 / 25.4)).unwrap();

    let image = Rasterizer::new().rasterize(backend.finish(), None);
    return image.to_vec();
     */

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
