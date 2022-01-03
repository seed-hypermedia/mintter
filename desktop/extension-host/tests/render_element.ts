import "wasi";
import { Console } from "as-wasi";
import { JSON, JSONEncoder } from "assemblyscript-json";

export function render_element(): void {
  let props = RenderElementProps.fromJSON(
    <JSON.Obj>JSON.parse(Console.readAll())
  );

  const encoder = new JSONEncoder()

  encoder.setString("", `<p ${props.attributes.toHTML()}>foobar</p>`);

  Console.log(encoder.toString());
}

class RenderElementProps {
  element: Element;
  attributes: RenderElementAttributes;

  constructor(element: Element, attributes: RenderElementAttributes) {
    this.element = element;
    this.attributes = attributes;
  }

  static fromJSON(json: JSON.Obj): RenderElementProps {
    return new RenderElementProps(
      Element.fromJSON(json.getObj("element")!),
      RenderElementAttributes.fromJSON(json.getObj("attributes")!)
    );
  }
}

class Element {
  type: string;
  children: JSON.Value[];

  constructor(type: string, children: JSON.Value[]) {
    this.type = type;
    this.children = children;
  }

  static fromJSON(json: JSON.Obj): Element {
    return new Element(
      json.getString("type")!.valueOf(),
      json.getArr("children")!.valueOf()
    );
  }
}

class RenderElementAttributes {
  dataSlateNode: string;
  dataSlateInline: boolean;
  dataSlateVoid: boolean;
  dir: string | null;
  ref: JSON.Value;

  constructor(
    dataSlateNode: string,
    dataSlateInline: boolean,
    dataSlateVoid: boolean,
    dir: string | null,
    ref: JSON.Value
  ) {
    this.dataSlateNode = dataSlateNode;
    this.dataSlateInline = dataSlateInline;
    this.dataSlateVoid = dataSlateVoid;
    this.dir = dir;
    this.ref = ref;
  }

  static fromJSON(json: JSON.Obj): RenderElementAttributes {
    let dir: string | null = null
    if (json.getString('dir') && json.getString('dir')!.isString) {
      dir = json.getString('dir')!.valueOf();
    }

    return new RenderElementAttributes(
      json.getString("data-slate-node")!.valueOf(),
      json.getBool("data-slate-inline")!.valueOf(),
      json.getBool("data-slate-void")!.valueOf(),
      dir,
      json.get("ref")!
    );
  }

  toHTML(): string {
    let str = `data-slate-node="${this.dataSlateNode.toString()}" data-slate-inline="${this.dataSlateInline.toString()}" data-slate-void="${this.dataSlateVoid.toString()}" ref="${this.ref.toString()}"`;
    if (this.dir) {
      str += ` dir="${this.dir!}"`
    }
    return str;
  }
}
