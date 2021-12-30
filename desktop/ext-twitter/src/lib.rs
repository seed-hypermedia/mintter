use common::RenderElementProps;
use serde_json::Value as JsonValue;

#[no_mangle]
pub extern "C" fn render_element() {
  let mut str = String::new();
  std::io::stdin().read_line(&mut str).unwrap();

  eprintln!("unparsed render props {:?}", str);

  let props: RenderElementProps = serde_json::from_str(&str).unwrap();

  eprintln!("render props {:?}", props);

  if props.element.r#type == "extension:twitter" {
    let url = "https://twitter.com/hhg2288/status/1473470541080182793\\?s\\=21";

    let html = format!(
      r#"
    <!DOCTYPE html>
    <html lang="en">
       <head>
          <meta charset="UTF-8" />
       </head>
       <body>
       <iframe 
          border=0 
          frameborder=0
          src="https://twitframe.com/show?url={}">
        </iframe>
       </body>
    </html>
    "#,
      url,
    );

    let out = serde_json::to_string(&JsonValue::String(html)).unwrap();

    println!("{}", out)
  }
}
