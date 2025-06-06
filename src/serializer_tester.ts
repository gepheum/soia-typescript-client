import {
  type Json,
  type JsonFlavor,
  type MutableForm,
  type Serializer,
  type TypeDescriptor,
  parseTypeDescriptor,
} from "./soia.js";
import { expect } from "buckwheat";
import { describe, it } from "mocha";

export class SerializerTester<T> {
  constructor(readonly serializer: Serializer<T>) {}

  reserializeAndAssert(
    input: T | MutableForm<T>,
    expected: {
      denseJson: Json;
      /** Defaults to `denseJson`. */
      readableJson?: Json;
      bytesAsBase16: string;
      /** Defaults to `denseJson`. */
      denseJsonFromReserialized?: Json;
      lossy?: true;
    },
    description?: string,
  ) {
    const { serializer } = this;

    describe(description ?? `reserialize ${input}`, () => {
      // Test JSON serialization.
      const jsonFlavors: JsonFlavor[] = ["dense", "readable"];
      for (const flavor of jsonFlavors) {
        const expectedJson =
          flavor === "dense"
            ? expected.denseJson
            : expected.readableJson ?? expected.denseJson;

        describe(`${flavor} JSON`, () => {
          const actualJson = serializer.toJson(input, flavor);

          it("#toJson()", () => {
            expect(actualJson).toMatch(expectedJson);
          });

          it("#toJsonCode()", () => {
            const actualJsonCode = serializer.toJsonCode(input, flavor);
            const expectedJsonCode = JSON.stringify(
              expectedJson,
              undefined,
              flavor === "dense" ? "" : "  ",
            );
            expect(actualJsonCode).toBe(expectedJsonCode);
          });

          it("#toJson() -> #fromJson() -> #toJson()", () => {
            serializer.fromJson(actualJson);
            const reserialized: T = serializer.fromJson(
              actualJson,
              "keep-unrecognized-fields",
            );
            expect(serializer.toJson(reserialized, flavor)).toMatch(
              expectedJson,
            );
          });

          it("#toJsonCode() -> #fromJsonCode() -> #toJson()", () => {
            const reserialized = serializer.fromJsonCode(
              serializer.toJsonCode(input, flavor),
              "keep-unrecognized-fields",
            );
            expect(serializer.toJson(reserialized, flavor)).toMatch(
              expectedJson,
            );
          });
        });
      }

      // Test binary serialization.
      const actualBytes = serializer.toBytes(input).toBuffer();
      it("#toBytes()", () => {
        const actualBase16 = toBase16(actualBytes);
        expect(actualBase16).toBe(expected.bytesAsBase16);
      });
      serializer.fromBytes(actualBytes);
      const reserialized = serializer.fromBytes(
        actualBytes,
        "keep-unrecognized-fields",
      );
      it("#toBytes() -> #fromBytes() -> #toBytes()", () => {
        const actualBase16 = toBase16(
          serializer.toBytes(reserialized).toBuffer(),
        );
        expect(actualBase16).toBe(expected.bytesAsBase16);
      });
      it("#toBytes() -> #fromBytes() -> #toJson()", () => {
        const actualDenseJson = serializer.toJson(reserialized, "dense");
        const expectedDenseJson =
          expected.denseJsonFromReserialized ?? expected.denseJson;
        expect(actualDenseJson).toMatch(expectedDenseJson);
      });

      // Test the #transform method of TypeDescriptor.
      if (!expected.lossy) {
        type Format = JsonFlavor | "bytes";
        const transformAndAssert = (
          reparse: boolean,
          sourceFormat: Format,
          targetFormat: Format,
        ) => {
          let typeDescriptor: TypeDescriptor = serializer.typeDescriptor;
          if (reparse) {
            typeDescriptor = parseTypeDescriptor(typeDescriptor.asJson());
          }
          const serialize = (format: JsonFlavor | "bytes") =>
            format === "bytes"
              ? serializer.toBytes(input).toBuffer()
              : serializer.toJson(input, format);
          const source = serialize(sourceFormat);
          const target = serialize(targetFormat);
          const transformed = typeDescriptor.transform(source, targetFormat);
          const arrayBufferToBase16 = (a: unknown) =>
            a instanceof ArrayBuffer ? toBase16(a) : a;
          const parsedPrefix = reparse ? "parseTypeDescriptor then " : "";
          it(`${parsedPrefix}transform ${sourceFormat} -> ${targetFormat}`, () => {
            expect(arrayBufferToBase16(transformed)).toMatch(
              arrayBufferToBase16(target),
            );
          });
        };
        const formats: Format[] = ["dense", "readable", "bytes"];
        for (const reparse of [false, true]) {
          for (const source of formats) {
            for (const target of formats) {
              transformAndAssert(reparse, source, target);
            }
          }
        }
      }

      serializer.fromJson(serializer.toJson(input));
      return serializer.fromJson(
        serializer.toJson(input),
        "keep-unrecognized-fields",
      );
    });
  }

  deserializeZeroAndAssert(isDefaultFn: (input: T) => boolean): void {
    const { serializer } = this;

    describe("deserialize zero", () => {
      it("from JSON", () => {
        expect(isDefaultFn(serializer.fromJson(0))).toBe(true);
      });
      it("from bytes", () => {
        const bytes = new ArrayBuffer(5);
        new TextEncoder().encodeInto("soia", new Uint8Array(bytes, 0, 4));
        expect(isDefaultFn(serializer.fromBytes(bytes))).toBe(true);
      });
    });
  }

  reserializeTypeAdapterAndAssertNoLoss(): void {
    it("reserialize type adapter", () => {
      const json = this.serializer.typeDescriptor.asJson();
      const reserialized = parseTypeDescriptor(json);
      expect(reserialized.asJson()).toMatch(json);
      expect(json).toMatch(reserialized.asJson());
    });
  }
}

export function toBase16(buffer: ArrayBuffer): string {
  const prefix = new TextDecoder().decode(new Uint8Array(buffer).slice(0, 4));
  expect(prefix).toBe("soia");
  return [...new Uint8Array(buffer)]
    .slice(4)
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
