use common::RenderElementProps;
use serde_json::Value as JsonValue;

#[no_mangle]
pub extern "C" fn render_element() {
  let mut str = String::new();
  std::io::stdin().read_line(&mut str).unwrap();

  eprintln!("unparsed render props {:?}", str);

  let props: RenderElementProps = serde_json::from_str(&str).unwrap();

  eprintln!("render props {:?}", props);

  if props.element.r#type == "extension:youtube" {
    let id = "jFold6aip6s";

    let html = format!(
      r#"
    <!DOCTYPE html>
    <html lang="en">
       <head>
          <meta charset="UTF-8" />
       </head>
       <body>
        <iframe 
          width="560" 
          height="315" 
          src="https://www.youtube.com/embed/{}" 
          title="YouTube video player" 
          frameborder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen>
        </iframe>
       </body>
    </html>
    "#,
      id,
    );

    let out = serde_json::to_string(&JsonValue::String(html)).unwrap();

    println!("{}", out)
  }
}
