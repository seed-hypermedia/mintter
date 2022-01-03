import "wasi"
import { Console } from "as-wasi"
import { JSON, JSONEncoder } from "assemblyscript-json"

export function menu(): void {
    let input = JSON.parse(Console.readAll()!);

    Console.error(input.toString());

    let encoder = new JSONEncoder();

    encoder.pushArray("");
    encoder.pushObject("");
    encoder.setString("title", "foobar");
    encoder.popObject();
    encoder.popArray();

    Console.log(encoder.toString());
}