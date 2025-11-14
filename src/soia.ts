import type {
  Express as ExpressApp,
  Request as ExpressRequest,
  Response as ExpressResponse,
  text as ExpressText,
} from "express";

/**
 * A single moment in time represented in a platform-independent format, with a
 * precision of one millisecond.
 *
 * A `Timestamp` object can represent a maximum of ±8,640,000,000,000,000
 * milliseconds, or ±100,000,000 (one hundred million) days, relative to the
 * Unix epoch. This is the range from April 20, 271821 BC to September 13,
 * 275760 AD.
 *
 * Unlike the Javascript built-in `Date` type, a `Timestamp` is immutable.
 * Like a `Date`, a `Timestamp` object does not contain a timezone.
 */
export class Timestamp {
  /**
   * Returns a `Timestamp` representing the same moment in time as the given
   * Javascript `Date` object.
   *
   * @throws if the given `Date` object has a timestamp value of NaN
   */
  static from(date: Date): Timestamp {
    return this.fromUnixMillis(date.getTime());
  }

  /**
   * Creates a `Timestamp` object from a number of milliseconds from the Unix
   * epoch.
   *
   * If the given number if outside the valid range (±8,640,000,000,000,000),
   * this function will return `Timestamp.MAX` or `Timestamp.MIN` depending on
   * the sign of the number.
   *
   * @throws if the given number is NaN
   */
  static fromUnixMillis(unixMillis: number): Timestamp {
    if (unixMillis <= this.MIN.unixMillis) {
      return Timestamp.MIN;
    } else if (unixMillis < Timestamp.MAX.unixMillis) {
      return new Timestamp(Math.round(unixMillis));
    } else if (Number.isNaN(unixMillis)) {
      throw new Error("Cannot construct Timestamp from NaN");
    } else {
      return Timestamp.MAX;
    }
  }

  /**
   * Creates a `Timestamp` object from a number of seconds from the Unix epoch.
   *
   * If the given number if outside the valid range (±8,640,000,000,000), this
   * function will return `Timestamp.MAX` or `Timestamp.MIN` depending on the
   * sign of the number.
   *
   * @throws if the given number is NaN
   */
  static fromUnixSeconds(unixSeconds: number): Timestamp {
    return this.fromUnixMillis(unixSeconds * 1000);
  }

  /**
   * Parses a date in the date time string format.
   *
   * @throws if the given string is not a date in the date time string format
   * @see https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-date-time-string-format
   */
  static parse(date: string): Timestamp {
    return this.fromUnixMillis(Date.parse(date));
  }

  /** Returns a `Timestamp` representing the current moment in time. */
  static now(): Timestamp {
    return this.fromUnixMillis(Date.now());
  }

  /** Thursday, 1 January 1970. */
  static readonly UNIX_EPOCH = new Timestamp(0);

  /**
   * Earliest moment in time representable as a `Timestamp`, namely April 20,
   * 271821 BC.

   * @see https://262.ecma-international.org/5.1/#sec-15.9.1.1
   */
  static readonly MIN = new Timestamp(-8640000000000000);

  /**
   * Latest moment in time representable as a `Timestamp`, namely September 13,
   * 275760 AD.

   * @see https://262.ecma-international.org/5.1/#sec-15.9.1.1
   */
  static readonly MAX = new Timestamp(8640000000000000);

  private constructor(
    /** Number of milliseconds ellapsed since the Unix epoch. */
    readonly unixMillis: number,
  ) {
    Object.freeze(this);
  }

  /** Number of seconds ellapsed since the Unix epoch. */
  get unixSeconds(): number {
    return this.unixMillis / 1000.0;
  }

  /**
   * Returns a `Date` object representing the same moment in time as this
   * `Timestamp`.
   */
  toDate(): Date {
    return new Date(this.unixMillis);
  }

  toString(): string {
    return this.toDate().toISOString();
  }
}

/** An immutable array of bytes. */
export class ByteString {
  /**
   * Returns an immutable byte string containing all the bytes of `input` from
   * `start`, inclusive, up to `end`, exclusive.
   *
   * If `input` is an `ArrayBuffer`, this function copies the bytes. Otherwise
   * this function returns a sliced view of the input `ByteString`.
   *
   * @example <caption>Copy an array buffer into a byte string</caption>
   * const byteString = ByteString.sliceOf(arrayBuffer);
   */
  static sliceOf(
    input: ArrayBuffer | SharedArrayBuffer | ByteString,
    start = 0,
    end?: number,
  ): ByteString {
    const { byteLength } = input;
    if (start < 0) {
      start = 0;
    }
    if (end === undefined || end > byteLength) {
      end = byteLength;
    }
    if (end <= start) {
      return ByteString.EMPTY;
    }
    if (input instanceof ByteString) {
      if (start <= 0 && byteLength <= end) {
        // Don't copy the ByteString itself.
        return input;
      } else {
        // Don't copy the ArrayBuffer.
        const newByteOffset = input.byteOffset + start;
        const newByteLength = end - start;
        return new ByteString(input.arrayBuffer, newByteOffset, newByteLength);
      }
    } else if (input instanceof ArrayBuffer) {
      return new ByteString(input.slice(start, end));
    } else if (input instanceof SharedArrayBuffer) {
      const slice = input.slice(start, end);
      const newBuffer = new ArrayBuffer(slice.byteLength);
      new Uint8Array(newBuffer).set(new Uint8Array(slice));
      return new ByteString(newBuffer);
    } else {
      const _: never = input;
      throw new TypeError(_);
    }
  }

  /**
   * Decodes a Base64 string, which can be obtained by calling `toBase64()`.
   *
   * @throws if the given string is not a valid Base64 string.
   * @see https://en.wikipedia.org/wiki/Base64
   */
  static fromBase64(base64: string): ByteString {
    // See https://developer.mozilla.org/en-US/docs/Glossary/Base64
    const binaryString: string = atob(base64);
    const array = Uint8Array.from(binaryString, (m) => m.codePointAt(0)!);
    return new this(array.buffer);
  }

  /**
   * Decodes a hexadecimal string, which can be obtained by calling
   * `toBase16()`.
   *
   * @throws if the given string is not a valid Base64 string.
   */
  static fromBase16(base16: string): ByteString {
    const bytes = new Uint8Array(base16.length / 2);
    for (let i = 0; i < bytes.length; ++i) {
      const byte = parseInt(base16.substring(i * 2, i * 2 + 2), 16);
      if (Number.isNaN(byte)) {
        throw new Error("Not a valid Base64 string");
      }
      bytes[i] = byte;
    }
    return new ByteString(bytes.buffer);
  }

  /** An empty byte string. */
  static readonly EMPTY = new ByteString(new ArrayBuffer(0));

  /** Copies the contents of this byte string into the given array buffer. */
  copyTo(target: ArrayBuffer, targetOffset = 0): void {
    new Uint8Array(target).set(this.uint8Array, targetOffset);
  }

  /** Copies the contents of this byte string into a new array buffer. */
  toBuffer(): ArrayBuffer {
    return this.arrayBuffer.slice(
      this.byteOffset,
      this.byteOffset + this.byteLength,
    );
  }

  /**
   * Encodes this byte string into a Base64 string.
   *
   * @see https://en.wikipedia.org/wiki/Base64
   */
  toBase64(): string {
    // See https://developer.mozilla.org/en-US/docs/Glossary/Base64
    const binaryString = Array.from(this.uint8Array, (x) =>
      String.fromCodePoint(x),
    ).join("");
    return btoa(binaryString);
  }

  /** Encodes this byte string into a hexadecimal string. */
  toBase16(): string {
    return [...this.uint8Array]
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("");
  }

  at(index: number): number | undefined {
    return this.uint8Array[index < 0 ? index + this.byteLength : index];
  }

  toString(): string {
    return `ByteString(${this.byteLength})`;
  }

  private constructor(
    private readonly arrayBuffer: ArrayBuffer,
    private readonly byteOffset = 0,
    /** The length of this byte string. */
    readonly byteLength = arrayBuffer.byteLength,
  ) {
    this.uint8Array = new Uint8Array(arrayBuffer, byteOffset, byteLength);
    Object.freeze(this);
  }

  private readonly uint8Array: Uint8Array;
}

/** A read-only JSON value. */
export type Json =
  | null
  | boolean
  | number
  | string
  | readonly Json[]
  | Readonly<{ [name: string]: Json }>;

/**
 * Resolves to the generated mutable class for a struct.
 * The type parameter is the generated frozen class.
 */
export type MutableForm<Frozen> = //
  Frozen extends _FrozenBase
    ? ReturnType<Frozen["toMutable"]> & Freezable<Frozen>
    : Freezable<Frozen>;

/** Result of encoding a struct using binary encoding format. */
export interface BinaryForm {
  /** Length (in bytes) of the binary form. */
  readonly byteLength: number;
  /** Copies the contents of the binary form into the given array buffer. */
  copyTo(target: ArrayBuffer, offset?: number): void;
  /** Copies the contents of this byte string into a new array buffer. */
  toBuffer(): ArrayBuffer;
}

/**
 * When using the JSON serialization format, you can chose between two flavors.
 *
 * The dense flavor is the default flavor and is preferred in most cases.
 * Structs are converted to JSON arrays, where the number of each field
 * corresponds to the index of the value in the array. This results in a more
 * compact representation than when using JSON objects, and this makes
 * serialization and deserialization a bit faster. Because field names are left
 * out of the JSON, it is a representation which allows persistence: you can
 * safely rename a field in a `.soia` file without breaking backwards
 * compatibility.
 * One con of this representation is that it is harder to tell, just by looking
 * at the JSON, what field of the struct each value in the array corresponds to.
 *
 * When using the readable flavor, structs are converted to JSON objects. The
 * name of each field in the `.soia` file is used as-is in the JSON. This
 * results in a representation which is much more readable by humans, but also
 * not suited for persistence: when you rename a field in a `.soia` file, you
 * will no lonnger be able to deserialize old JSONs.
 *
 * @example
 * const jane = Person.create({firstName: "Jane", lastName: "Doe"});
 *
 * console.log(Person.SERIALIZER.toJson(jane, "dense"));
 * // Output: ["Jane","Doe"]
 *
 * console.log(Person.SERIALIZER.toJson(jane));
 * // Output: ["Jane","Doe"]
 *
 * console.log(Person.SERIALIZER.toJson(jane, "readable"));
 * // Output: {
 * //   "firstName": "Jane",
 * //   "lastName": "Doe"
 * // }
 */
export type JsonFlavor = "dense" | "readable";

/**
 * Serializes and deserializes instances of `T`. Supports two serialization
 * formats: JSON and binary.
 *
 * All deserialization methods return a deeply-immutable `T`. If `T` is the
 * generated frozen class for a struct, all serialization methods accept either
 * a `T` or a `T.Mutable`.
 *
 * Do NOT create your own `Serializer` implementation. Only use implementations
 * provided by Soia.
 *
 * @example
 * let jane = Person.create({firstName: "Jane", lastName: "Doe"});
 * const json = Person.SERIALIZER.toJson(jane);
 * jane = Person.SERIALIZER.fromJson(json);
 * expect(jane.firstName).toBe("Jane");
 */
export interface Serializer<T> {
  /**
   * Converts back the given stringified JSON to `T`.
   * Works with both [flavors]{@link JsonFlavor} of JSON.
   *
   * Pass in "keep-unrecognized-fields" if and only if the input JSON comes
   * from a trusted program which might have been built from more recent
   * source files.
   */
  fromJsonCode(code: string, keep?: "keep-unrecognized-fields"): T;
  /**
   * Converts back the given JSON to `T`.
   * Works with both [flavors]{@link JsonFlavor} of JSON.
   *
   * Pass in "keep-unrecognized-fields" if and only if the input JSON comes
   * from a trusted program which might have been built from more recent
   * source files.
   */
  fromJson(json: Json, keep?: "keep-unrecognized-fields"): T;
  /**
   * Converts back the given binary form to `T`.
   *
   * Pass in "keep-unrecognized-fields" if and only if the input JSON comes
   * from a trusted program which might have been built from more recent
   * source files.
   */
  fromBytes(bytes: ArrayBuffer, keep?: "keep-unrecognized-fields"): T;
  /**
   * Converts the given `T` to JSON and returns the stringified JSON. Same as
   * calling `JSON.stringify()` on the result of `toJson()`.
   *
   * @param flavor dense or readable, defaults to dense
   * @see JsonFlavor
   */
  toJsonCode(input: T | MutableForm<T>, flavor?: JsonFlavor): string;
  /**
   * Converts the given `T` to JSON. If you only need the stringified JSON, call
   * `toJsonCode()` instead.
   *
   * @param flavor dense or readable, defaults to dense
   * @see JsonFlavor
   */
  toJson(input: T | MutableForm<T>, flavor?: JsonFlavor): Json;
  /** Converts the given `T` to binary format. */
  toBytes(input: T | MutableForm<T>): BinaryForm;
  /** An object describing the type `T`. Enables reflective programming. */
  typeDescriptor: TypeDescriptorSpecialization<T>;
}

/**
 * Returns a serializer of instances of the given Soia primitive type.
 *
 * @example
 * expect(
 *   primitiveSerializer("string").toJsonCode("foo")
 * ).toBe(
 *   '"foo"'
 * );
 */
export function primitiveSerializer<P extends keyof PrimitiveTypes>(
  primitiveType: P,
): Serializer<PrimitiveTypes[P]> {
  return PRIMITIVE_SERIALIZERS[primitiveType];
}

/**
 * Returns a serializer of arrays of `Item`s.
 *
 * @example
 * expect(
 *   arraySerializer(User.SERIALIZER).toJsonCode([JANE, JOE])
 * ).toBe(
 *   '[["jane"],["joe"]]'
 * );
 */
export function arraySerializer<Item>(
  item: Serializer<Item>,
  keyChain?: string,
): Serializer<ReadonlyArray<Item>> {
  if (
    keyChain !== undefined &&
    !/^[a-z_][a-z0-9_]*(\.[a-z_][a-z0-9_]*)*$/.test(keyChain)
  ) {
    throw new Error(`Invalid keyChain "${keyChain}"`);
  }
  return new ArraySerializerImpl(item as InternalSerializer<Item>, keyChain);
}

/** Returns a serializer of nullable `T`s. */
export function optionalSerializer<T>(
  other: Serializer<T>,
): Serializer<T | null> {
  return other instanceof OptionalSerializerImpl
    ? other
    : new OptionalSerializerImpl(other as InternalSerializer<T>);
}

/**
 * Describes the type `T`, where `T` is the TypeScript equivalent of a Soia
 * type. Enables reflective programming.
 *
 * Every `TypeDescriptor` instance has a `kind` field which can take one of
 * these 5 values: `"primitive"`, `"optional"`, `"array"`, `"struct"`, `"enum"`.
 */
export type TypeDescriptor<T = unknown> =
  | OptionalDescriptor<T>
  | ArrayDescriptor<T>
  | StructDescriptor<T>
  | EnumDescriptor<T>
  | PrimitiveDescriptor;

/** Specialization of `TypeDescriptor<T>` when `T` is known. */
export type TypeDescriptorSpecialization<T> = //
  [T] extends [_FrozenBase]
    ? StructDescriptor<T>
    : [T] extends [_EnumBase]
      ? EnumDescriptor<T>
      : TypeDescriptor<T>;

interface TypeDescriptorBase {
  /** Returns the JSON representation of this `TypeDescriptor`. */
  asJson(): Json;

  /**
   * Returns the JSON code representation of this `TypeDescriptor`.
   * Same as calling `JSON.stringify()` on the result of `asJson()`.
   */
  asJsonCode(): string;

  /**
   * Converts from one serialized form to another.
   *
   * @example
   * const denseJson = User.SERIALIZER.toJson(user, "dense");
   * expect(
   *   User.SERIALIZER.typeDescriptor.transform(denseJson, "readable")
   * ).toMatch(
   *   User.SERIALIZER.toJson(user, "readable")
   * );
   */
  transform(json_or_bytes: Json | ArrayBuffer, out: JsonFlavor): Json;
  transform(json: Json, out: "bytes"): ArrayBuffer;
  transform(
    json_or_bytes: Json | ArrayBuffer,
    out: JsonFlavor | "bytes",
  ): Json | ArrayBuffer;
}

/** Describes a primitive Soia type. */
export interface PrimitiveDescriptor extends TypeDescriptorBase {
  kind: "primitive";
  primitive: keyof PrimitiveTypes;
}

/**
 * An interface mapping a primitive Soia type to the corresponding TypeScript
 * type.
 */
export interface PrimitiveTypes {
  bool: boolean;
  int32: number;
  int64: bigint;
  uint64: bigint;
  float32: number;
  float64: number;
  timestamp: Timestamp;
  string: string;
  bytes: ByteString;
}

/**
 * Describes an optional type. In a `.soia` file, an optional type is
 * represented with a question mark at the end of another type.
 */
export interface OptionalDescriptor<T> extends TypeDescriptorBase {
  readonly kind: "optional";
  /** Describes the other (non-optional) type. */
  readonly otherType: TypeDescriptor<NonNullable<T>>;
}

/** Describes an array type. */
export interface ArrayDescriptor<T> extends TypeDescriptorBase {
  readonly kind: "array";
  /** Describes the type of the array items. */
  readonly itemType: TypeDescriptor<
    T extends ReadonlyArray<infer Item> ? Item : unknown
  >;
  readonly keyChain?: string;
}

/**
 * Describes a Soia struct.
 * The type parameter `T` refers to the generated frozen class for the struct.
 */
export interface StructDescriptor<T = unknown> extends TypeDescriptorBase {
  readonly kind: "struct";
  /** Name of the struct as specified in the `.soia` file. */
  readonly name: string;
  /**
   * A string containing all the names in the hierarchic sequence above and
   * including the struct. For example: "Foo.Bar" if "Bar" is nested within a
   * type called "Foo", or simply "Bar" if "Bar" is defined at the top-level of
   * the module.
   */
  readonly qualifiedName: string;
  /**
   * Path to the module where the struct is defined, relative to the root of the
   * project.
   */
  readonly modulePath: string;
  /**
   * If the struct is nested within another type, the descriptor for that type.
   * Undefined if the struct is defined at the top-level of the module.
   */
  readonly parentType: StructDescriptor | EnumDescriptor | undefined;
  /** The fields of the struct in the order they appear in the `.soia` file. */
  readonly fields: ReadonlyArray<StructField<T>>;
  /** The field numbers marked as removed. */
  readonly removedNumbers: ReadonlySet<number>;

  /**
   * Looks up a field. The key can be one of: the field name (e.g. "user_id");
   * the name of the property in the generated class (e.g. "userId"), the field
   * number.
   *
   * The return type is `StructField<T> | undefined` unless the key is known at
   * compile-time to be the name of the property in the generated class, in
   * which case it is `StructField<T>`.
   */
  getField<K extends string | number>(key: K): StructFieldResult<T, K>;

  /**
   * Returns a new instance of the generated mutable class for a struct.
   * Performs a shallow copy of `initializer` if `initializer` is specified.
   */
  newMutable(initializer?: T | MutableForm<T>): MutableForm<T>;
}

/** Field of a Soia struct. */
export interface StructField<Struct = unknown, Value = unknown> {
  /** Field name as specified in the `.soia` file, e.g. "user_id". */
  readonly name: string;
  /** Name of the property in the generated class, e.g. "userId". */
  readonly property: string;
  /** Field number. */
  readonly number: number;
  /** Describes the field type. */
  readonly type: TypeDescriptor<Value>;

  /** Extracts the value of the field from the given struct. */
  get(struct: Struct | MutableForm<Struct>): Value;
  /** Assigns the given value to the field of the given struct. */
  set(struct: MutableForm<Struct>, value: Value): void;
}

/**
 * Return type of the `StructDescriptor.getField` method. If the argument is
 * known at compile-time to be the name of a property of the generated class,
 * resolves to `StructField<Struct>`. Otherwise, resolves to
 * `StructField<Struct> | undefined`.
 *
 * @example <caption>The field is kown at compile-time</caption>
 * const fieldNumber: number =
 *   User.SERIALIZER.typeDescriptor.getField("userId").number;
 *
 * @example <caption>The field is not kown at compile-time</caption>
 * const fieldNumber: number | undefined =
 *   User.SERIALIZER.typeDescriptor.getField(variable)?.number;
 */
export type StructFieldResult<Struct, Key extends string | number> =
  | StructField<Struct>
  | (Struct extends _FrozenBase
      ? Key extends keyof NonNullable<Struct[typeof _INITIALIZER]>
        ? never
        : undefined
      : undefined);

/** Describes a Soia enum. */
export interface EnumDescriptor<T = unknown> extends TypeDescriptorBase {
  readonly kind: "enum";
  /** Name of the enum as specified in the `.soia` file. */
  readonly name: string;
  /**
   * A string containing all the names in the hierarchic sequence above and
   * including the enum. For example: "Foo.Bar" if "Bar" is nested within a type
   * called "Foo", or simply "Bar" if "Bar" is defined at the top-level of the
   * module.
   */
  readonly qualifiedName: string;
  /**
   * Path to the module where the enum is defined, relative to the root of the
   * project.
   */
  readonly modulePath: string;
  /**
   * If the enum is nested within another type, the descriptor for that type.
   * Undefined if the struct is defined at the top-level of the module.
   */
  readonly parentType: StructDescriptor | EnumDescriptor | undefined;
  /**
   * Includes the UNKNOWN field, followed by the other fields in the order they
   * appear in the `.soia` file.
   */
  readonly fields: ReadonlyArray<EnumField<T>>;
  /** The field numbers marked as removed. */
  readonly removedNumbers: ReadonlySet<number>;

  /**
   * Looks up a field. The key can be one of the field name or the field number.
   *
   * The return type is `EnumField<T> | undefined` unless the key is known at
   * compile-time to be a field name of the struct, in which case it is
   * `EnumField<T>`.
   */
  getField<K extends string | number>(key: K): EnumFieldResult<T, K>;
}

/**
 * Field of a Soia enum. Fields which don't hold any value are called constant
 * fields. Their name is always in UPPER_CASE. Fields which hold value of a
 * given type are called value fields, and their name is always in lower_case.
 */
export type EnumField<Enum = unknown> =
  | EnumConstantField<Enum>
  | EnumValueField<Enum, unknown>;

/** Field of a Soia enum which does not hold any value. */
export interface EnumConstantField<Enum = unknown> {
  /**
   * Field name as specified in the `.soia` file, e.g. "MONDAY".
   * Always in UPPER_CASE format.
   */
  readonly name: string;
  /** Field number. */
  readonly number: number;
  /** The instance of the generated class which corresponds to this field. */
  readonly constant: Enum;
  /** Always undefined, unlike the `type` field of `EnumValueField`. */
  readonly type?: undefined;
}

/** Field of a Soia enum which holds a value of a given type. */
export interface EnumValueField<Enum = unknown, Value = unknown> {
  /**
   * Field name as specified in the `.soia` file, e.g. "v4".
   * Always in lower_case format.
   */
  readonly name: string;
  /** Field number. */
  readonly number: number;
  /** Describes the type of the value held by the field. */
  readonly type: TypeDescriptor<Value>;
  /** Always undefined, unlike the `type` field of `EnumConstantField`. */
  readonly constant?: undefined;

  /**
   * Extracts the value held by the given enum instance if it matches this
   * enum field. Returns undefined otherwise.
   */
  get(e: Enum): Value | unknown;
  /**
   * Returns a new enum instance matching this enum field and holding the given
   * value.
   */
  wrap(value: Value): Enum;
}

/**
 * Return type of the `EnumDescriptor.getField` method. If the argument is known
 * at compile-time to be the name of field, resolves to `EnumField<Enum>`.
 * Otherwise, resolves to `EnumField<Struct> | undefined`.
 *
 * @example <caption>The field is known at compile-time</caption>
 * const fieldNumber: number =
 *   Weekday.SERIALIZER.typeDescriptor.getField("MONDAY").number;
 *
 * @example <caption>The field is not known at compile-time</caption>
 * const fieldNumber: number | undefined =
 *   Weekday.SERIALIZER.typeDescriptor.getField(variable)?.number;
 */
export type EnumFieldResult<Enum, Key extends string | number> =
  | EnumField<Enum>
  | (Enum extends _EnumBase
      ? Key extends Enum["kind"]
        ? never
        : undefined
      : undefined);

/**
 * Identifies a procedure (the "P" in "RPC") on both the client side and the
 * server side.
 */
export interface Method<Request, Response> {
  /** Name of the procedure as specified in the `.soia` file. */
  name: string;
  /**
   * A number which uniquely identifies this procedure.
   * When it is not specified in the `.soia` file, it is obtained by hashing the
   * procedure name.
   */
  number: number;
  /** Serializer of request objects. */
  requestSerializer: Serializer<Request>;
  /** Serializer of response objects. */
  responseSerializer: Serializer<Response>;
}

/**
 * Interface implemented by both the frozen and mutable classes generated for a
 * struct. `T` is always the generated frozen class.
 */
export interface Freezable<T> {
  /**
   * Returns a deeply-immutable object, either by making a copy of `this` if
   * `this` is mutable, or by returning `this` as-is if `this` is already
   * immutable.
   */
  toFrozen(): T;
}

// =============================================================================
// Implementation of serializers and type descriptors
// =============================================================================

/** JSON representation of a `TypeDescriptor`. */
type TypeDefinition = {
  type: TypeSignature;
  records: readonly RecordDefinition[];
};

/** A type in the JSON representation of a `TypeDescriptor`. */
type TypeSignature =
  | {
      kind: "optional";
      value: TypeSignature;
    }
  | {
      kind: "array";
      value: {
        item: TypeSignature;
        key_extractor?: string;
      };
    }
  | {
      kind: "record";
      value: string;
    }
  | {
      kind: "primitive";
      value: keyof PrimitiveTypes;
    };

/**
 * Definition of a record field in the JSON representation of a
 * `TypeDescriptor`.
 */
type FieldDefinition = {
  name: string;
  type?: TypeSignature;
  number: number;
};

/** Definition of a record in the JSON representation of a `TypeDescriptor`. */
type RecordDefinition = {
  kind: "struct" | "enum";
  id: string;
  fields: readonly FieldDefinition[];
  removed_numbers?: ReadonlyArray<number>;
};

interface InternalSerializer<T = unknown> extends Serializer<T> {
  readonly defaultValue: T;
  isDefault(input: T): boolean;
  decode(stream: InputStream): T;
  encode(input: T, stream: OutputStream): void;
  readonly typeSignature: TypeSignature;
  addRecordDefinitionsTo(out: { [k: string]: RecordDefinition }): void;
}

/** Parameter of the {@link InternalSerializer.decode} method. */
class InputStream {
  constructor(
    readonly buffer: ArrayBuffer,
    keep?: "keep-unrecognized-fields",
  ) {
    this.dataView = new DataView(buffer);
    this.keepUnrecognizedFields = !!keep;
  }

  readonly dataView: DataView;
  readonly keepUnrecognizedFields: boolean;
  offset = 0;

  readUint8(): number {
    return this.dataView.getUint8(this.offset++);
  }
}

type DecodeNumberFn = (stream: InputStream) => number | bigint;

// For wires [232, 241]
const DECODE_NUMBER_FNS: readonly DecodeNumberFn[] = [
  (s: InputStream): number => s.dataView.getUint16((s.offset += 2) - 2, true),
  (s: InputStream): number => s.dataView.getUint32((s.offset += 4) - 4, true),
  (s: InputStream): bigint =>
    s.dataView.getBigUint64((s.offset += 8) - 8, true),
  (stream: InputStream): number => stream.readUint8() - 256,
  (s: InputStream): number =>
    s.dataView.getUint16((s.offset += 2) - 2, true) - 65536,
  (s: InputStream): number => s.dataView.getInt32((s.offset += 4) - 4, true),
  (s: InputStream): bigint => s.dataView.getBigInt64((s.offset += 8) - 8, true),
  (s: InputStream): bigint => s.dataView.getBigInt64((s.offset += 8) - 8, true),
  (s: InputStream): number => s.dataView.getFloat32((s.offset += 4) - 4, true),
  (s: InputStream): number => s.dataView.getFloat64((s.offset += 8) - 8, true),
];

function decodeNumber(stream: InputStream): number | bigint {
  const wire = stream.readUint8();
  return wire < 232 ? wire : DECODE_NUMBER_FNS[wire - 232]!(stream);
}

function decodeBigInt(stream: InputStream): bigint {
  const number = decodeNumber(stream);
  return typeof number === "bigint" ? number : BigInt(Math.round(number));
}

/** Parameter of the {@link InternalSerializer.encode} method. */
class OutputStream implements BinaryForm {
  writeUint8(value: number): void {
    const dataView = this.reserve(1);
    dataView.setUint8(++this.offset - 1, value);
  }

  writeUint16(value: number): void {
    const dataView = this.reserve(2);
    dataView.setUint16((this.offset += 2) - 2, value, true);
  }

  writeUint32(value: number): void {
    const dataView = this.reserve(4);
    dataView.setUint32((this.offset += 4) - 4, value, true);
  }

  writeInt32(value: number): void {
    const dataView = this.reserve(4);
    dataView.setInt32((this.offset += 4) - 4, value, true);
  }

  writeUint64(value: bigint): void {
    const dataView = this.reserve(8);
    dataView.setBigUint64((this.offset += 8) - 8, value, true);
  }

  writeInt64(value: bigint): void {
    const dataView = this.reserve(8);
    dataView.setBigInt64((this.offset += 8) - 8, value, true);
  }

  writeFloat32(value: number): void {
    const dataView = this.reserve(4);
    dataView.setFloat32((this.offset += 4) - 4, value, true);
  }

  writeFloat64(value: number): void {
    const dataView = this.reserve(8);
    dataView.setFloat64((this.offset += 8) - 8, value, true);
  }

  /**
   * Encodes the given string to UTF-8 and writes the bytes to this stream.
   * Returns the number of bytes written.
   */
  putUtf8String(string: string): number {
    // We do at most 3 writes:
    //   - First, fill the current buffer as much as possible
    //   - If there is not enough room, allocate a new buffer of N bytes, where
    //       N is twice the number of remaining UTF-16 characters in the string,
    //       and write to it. This new buffer is very likely to have enough
    //       room.
    //   - If there was not enough room, try again one last time.
    //
    // See https://developer.mozilla.org/en-US/docs/Web/API/TextEncoder
    let dataView: DataView = this.dataView;
    let result = 0;
    while (string) {
      const encodeResult = textEncoder.encodeInto(
        string,
        new Uint8Array(dataView.buffer, this.offset),
      );
      this.offset += encodeResult.written;
      result += encodeResult.written;
      string = string.substring(encodeResult.read);
      if (string) {
        dataView = this.reserve(string.length * 2);
      }
    }
    return result;
  }

  putBytes(bytes: ByteString): void {
    // We do at most 2 writes:
    //   - First, fill the current buffer as much as possible
    //   - If there is not enough room, allocate a new buffer of N bytes, where
    //       N is at least the number of bytes left in the byte string.
    const { buffer } = this;
    const bytesLeftInCurrentBuffer = buffer.byteLength - this.offset;
    const head = ByteString.sliceOf(bytes, 0, bytesLeftInCurrentBuffer);
    head.copyTo(buffer, this.offset);
    this.offset += head.byteLength;
    const remainingBytes = bytes.byteLength - head.byteLength;
    if (remainingBytes <= 0) {
      // Everything was written.
      return;
    }
    const tail = ByteString.sliceOf(bytes, remainingBytes);
    this.reserve(remainingBytes);
    tail.copyTo(buffer, this.offset);
    this.offset += remainingBytes;
  }

  finalize(): BinaryForm {
    this.flush();
    Object.freeze(this.pieces);
    Object.freeze(this);
    return this;
  }

  copyTo(target: ArrayBuffer, offset = 0): void {
    const targetArea = new Uint8Array(target);
    for (const piece of this.pieces) {
      targetArea.set(piece, offset);
      offset += piece.length;
    }
  }

  toBuffer(): ArrayBuffer {
    const result = new ArrayBuffer(this.byteLength);
    this.copyTo(result);
    return result;
  }

  /** Returns a data view with enough capacity for `bytes` more bytes. */
  private reserve(bytes: number): DataView {
    if (this.offset < this.buffer.byteLength - bytes) {
      // Enough room in the current data view.
      return this.dataView;
    }
    this.flush();
    const lengthInBytes = Math.max(this.byteLength, bytes);
    this.offset = 0;
    this.buffer = new ArrayBuffer(lengthInBytes);
    return (this.dataView = new DataView(this.buffer));
  }

  /** Adds the current buffer to `pieces`. Updates `byteLength` accordingly. */
  private flush(): void {
    const { offset } = this;
    this.pieces.push(new Uint8Array(this.dataView.buffer, 0, offset));
    this.byteLength += offset;
  }

  buffer = new ArrayBuffer(128);
  dataView = new DataView(this.buffer);
  offset = 0;
  // The final binary form is the result of concatenating these arrays.
  // The length of each array is approximately twice the length of the previous
  // array.
  private readonly pieces: Uint8Array[] = [];
  // Updated each time `flush()` is called.
  byteLength = 0;
}

function encodeUint32(length: number, stream: OutputStream): void {
  if (length < 232) {
    stream.writeUint8(length);
  } else if (length < 65536) {
    stream.writeUint8(232);
    stream.writeUint16(length);
  } else if (length < 4294967296) {
    stream.writeUint8(233);
    stream.writeUint32(length);
  } else {
    throw new Error(`max length exceeded: ${length}`);
  }
}

abstract class AbstractSerializer<T> implements InternalSerializer<T> {
  fromJsonCode(code: string, keep?: "keep-unrecognized-fields"): T {
    return this.fromJson(JSON.parse(code), keep);
  }

  fromBytes(bytes: ArrayBuffer, keep?: "keep-unrecognized-fields"): T {
    const inputStream = new InputStream(bytes, keep);
    inputStream.offset = 4; // Skip the "soia" header.
    return this.decode(inputStream);
  }

  toJsonCode(input: T, flavor?: JsonFlavor): string {
    const indent = flavor === "readable" ? "  " : undefined;
    return JSON.stringify(this.toJson(input, flavor), undefined, indent);
  }

  toBytes(input: T): BinaryForm {
    const stream = new OutputStream();
    stream.putUtf8String("soia");
    this.encode(input, stream);
    return stream.finalize();
  }

  // Default implementation; this behavior is not correct for all subclasses.
  isDefault(input: T): boolean {
    return !input;
  }

  get typeDescriptor(): TypeDescriptorSpecialization<T> {
    return this as unknown as TypeDescriptorSpecialization<T>;
  }

  abstract readonly defaultValue: T;
  abstract fromJson(json: Json, keep?: "keep-unrecognized-fields"): T;
  abstract toJson(input: T, flavor?: JsonFlavor): Json;
  abstract decode(stream: InputStream): T;
  abstract encode(input: T, stream: OutputStream): void;

  abstract readonly typeSignature: TypeSignature;
  abstract addRecordDefinitionsTo(out: { [k: string]: RecordDefinition }): void;

  asJson(): Json {
    const recordDefinitions: { [k: string]: RecordDefinition } = {};
    this.addRecordDefinitionsTo(recordDefinitions);
    const result: TypeDefinition = {
      type: this.typeSignature,
      records: Object.values(recordDefinitions),
    };
    return result;
  }

  asJsonCode(): string {
    return JSON.stringify(this.asJson(), undefined, "  ");
  }

  transform(json_or_bytes: Json | ArrayBuffer, out: JsonFlavor): Json;
  transform(json: Json, out: "bytes"): ArrayBuffer;
  transform(
    json_or_bytes: Json | ArrayBuffer,
    out: JsonFlavor | "bytes",
  ): Json | ArrayBuffer {
    const decoded: T =
      json_or_bytes instanceof ArrayBuffer
        ? this.fromBytes(json_or_bytes)
        : this.fromJson(json_or_bytes);
    return out === "bytes"
      ? this.toBytes(decoded).toBuffer()
      : this.toJson(decoded, out);
  }
}

// The UNKNOWN field is common to all enums.
const UNKNOWN_FIELD_DEFINITION: FieldDefinition = {
  name: "?",
  number: 0,
};

/**
 * Returns a `TypeDescriptor` from its JSON representation as returned by
 * `asJson()`.
 */
export function parseTypeDescriptorFromJson(json: Json): TypeDescriptor {
  const typeDefinition = json as TypeDefinition;

  type RecordBundle = {
    readonly definition: RecordDefinition;
    readonly serializer: StructSerializerImpl<Json> | EnumSerializerImpl<Json>;
  };
  const recordBundles: { [k: string]: RecordBundle } = {};

  // First loop: create the serializer for each record.
  // It's not yet initialized.
  for (const record of typeDefinition.records) {
    let serializer: StructSerializerImpl<Json> | EnumSerializerImpl<Json>;
    switch (record.kind) {
      case "struct":
        serializer = new StructSerializerImpl<Json>(
          {},
          (initializer: AnyRecord) => Object.freeze({ ...initializer }) as Json,
          (() => ({})) as NewMutableFn<Json>,
        );
        break;
      case "enum":
        serializer = new EnumSerializerImpl<Json>((o: unknown) =>
          o instanceof UnrecognizedEnum
            ? Object.freeze({ kind: "?" })
            : (Object.freeze({
                kind: (o as AnyRecord).kind,
                value: (o as AnyRecord).value,
              }) as Json),
        );
        break;
    }
    const recordBundle: RecordBundle = {
      definition: record,
      serializer: serializer,
    };
    recordBundles[record.id] = recordBundle;
  }

  function parse(ts: TypeSignature): InternalSerializer {
    switch (ts.kind) {
      case "array": {
        const { item, key_extractor } = ts.value;
        return new ArraySerializerImpl(parse(item), key_extractor);
      }
      case "optional":
        return new OptionalSerializerImpl(parse(ts.value));
      case "primitive":
        return primitiveSerializer(ts.value) as InternalSerializer;
      case "record": {
        const recordId = ts.value;
        return recordBundles[recordId]!.serializer;
      }
    }
  }

  // Second loop: initialize each serializer.
  const initOps: Array<() => void> = [];
  for (const recordBundle of Object.values(recordBundles)) {
    const { definition, serializer } = recordBundle;
    const { defaultValue } = serializer;
    const { id, removed_numbers } = definition;
    const idParts = id.split(":");
    const module = idParts[0]!;
    const qualifiedName = idParts[1]!;
    const nameParts = qualifiedName.split(".");
    const name = nameParts[nameParts.length - 1]!;
    const parentId = module + ":" + nameParts.slice(0, -1).join(".");
    const parentType = recordBundles[parentId]?.serializer;
    switch (definition.kind) {
      case "struct": {
        const fields: StructFieldImpl[] = [];
        for (const f of definition.fields) {
          const fieldSerializer = parse(f.type!);
          fields.push(
            new StructFieldImpl(f.name, f.name, f.number, fieldSerializer),
          );
          (defaultValue as AnyRecord)[f.name] = fieldSerializer.defaultValue;
        }
        const s = serializer as StructSerializerImpl<Json>;
        initOps.push(() =>
          s.init(name, module, parentType, fields, removed_numbers ?? []),
        );
        break;
      }
      case "enum": {
        const s = serializer as EnumSerializerImpl<Json>;
        const fields = [UNKNOWN_FIELD_DEFINITION]
          .concat(definition.fields)
          .map((f) =>
            f.type
              ? new EnumValueFieldImpl<Json>(
                  f.name,
                  f.number,
                  parse(f.type),
                  serializer.createFn,
                )
              : ({
                  name: f.name,
                  number: f.number,
                  constant: Object.freeze({ kind: f.name }),
                } as EnumConstantField<Json>),
          );
        initOps.push(() =>
          s.init(name, module, parentType, fields, removed_numbers ?? []),
        );
        break;
      }
    }
  }
  // We need to actually initialize the serializers *after* the default values
  // were constructed, because `init` calls `freezeDeeply` and this might result
  // in freezing the default of another serializer.
  initOps.forEach((op) => op());

  return parse(typeDefinition.type).typeDescriptor;
}

/**
 * Returns a `TypeDescriptor` from its JSON code representation as returned by
 * `asJsonCode()`.
 */
export function parseTypeDescriptorFromJsonCode(code: string): TypeDescriptor {
  return parseTypeDescriptorFromJson(JSON.parse(code));
}

abstract class AbstractPrimitiveSerializer<P extends keyof PrimitiveTypes>
  extends AbstractSerializer<PrimitiveTypes[P]>
  implements PrimitiveDescriptor
{
  readonly kind = "primitive";

  get typeSignature(): TypeSignature {
    return {
      kind: "primitive",
      value: this.primitive,
    };
  }

  addRecordDefinitionsTo(_out: { [k: string]: RecordDefinition }): void {}

  abstract readonly primitive: P;
}

class BoolSerializer extends AbstractPrimitiveSerializer<"bool"> {
  readonly primitive = "bool";
  readonly defaultValue = false;

  toJson(input: boolean, flavor?: JsonFlavor): boolean | number {
    return flavor === "readable" ? !!input : input ? 1 : 0;
  }

  fromJson(json: Json): boolean {
    return !!json && json !== "0";
  }

  encode(input: boolean, stream: OutputStream): void {
    stream.writeUint8(input ? 1 : 0);
  }

  decode(stream: InputStream): boolean {
    return !!decodeNumber(stream);
  }
}

class Int32Serializer extends AbstractPrimitiveSerializer<"int32"> {
  readonly primitive = "int32";
  readonly defaultValue = 0;

  toJson(input: number): number {
    return input | 0;
  }

  fromJson(json: Json): number {
    // `+value` will work if the input JSON value is a string, which is
    // what the int64 serializer produces.
    return +(json as number | string) | 0;
  }

  encode(input: number, stream: OutputStream): void {
    if (input < 0) {
      if (input >= -256) {
        stream.writeUint8(235);
        stream.writeUint8(input + 256);
      } else if (input >= -65536) {
        stream.writeUint8(236);
        stream.writeUint16(input + 65536);
      } else {
        stream.writeUint8(237);
        stream.writeInt32(input >= -2147483648 ? input : -2147483648);
      }
    } else if (input < 232) {
      stream.writeUint8(input);
    } else if (input < 65536) {
      stream.writeUint8(232);
      stream.writeUint16(input);
    } else {
      stream.writeUint8(233);
      stream.writeUint32(input <= 2147483647 ? input : 2147483647);
    }
  }

  decode(stream: InputStream): number {
    return Number(decodeNumber(stream)) | 0;
  }
}

const INT32_SERIALIZER = new Int32Serializer();

abstract class FloatSerializer<
  P extends "float32" | "float64",
> extends AbstractPrimitiveSerializer<P> {
  readonly defaultValue = 0;

  toJson(input: number): number | string {
    if (Number.isFinite(input)) {
      return input;
    } else if (typeof input === "number") {
      // If the number is NaN or +/- Infinity, return a JSON string.
      return input.toString();
    }
    throw new TypeError();
  }

  fromJson(json: Json): number {
    return +(json as number | string);
  }

  decode(stream: InputStream): number {
    return Number(decodeNumber(stream));
  }

  isDefault(input: number): boolean {
    // Needs to work for NaN.
    return input === 0;
  }
}

class Float32Serializer extends FloatSerializer<"float32"> {
  readonly primitive = "float32";

  encode(input: number, stream: OutputStream): void {
    if (input === 0) {
      stream.writeUint8(0);
    } else {
      stream.writeUint8(240);
      stream.writeFloat32(input);
    }
  }
}

class Float64Serializer extends FloatSerializer<"float64"> {
  readonly primitive = "float64";

  encode(input: number, stream: OutputStream): void {
    if (input === 0) {
      stream.writeUint8(0);
    } else {
      stream.writeUint8(241);
      stream.writeFloat64(input);
    }
  }
}

abstract class AbstractBigIntSerializer<
  P extends "int64" | "uint64",
> extends AbstractPrimitiveSerializer<P> {
  readonly defaultValue = BigInt(0);

  fromJson(json: Json): bigint {
    try {
      return BigInt(json as number | string);
    } catch (e) {
      if (typeof json === "number") {
        return BigInt(Math.round(json));
      } else {
        throw e;
      }
    }
  }
}

const MIN_INT64 = BigInt("-9223372036854775808");
const MAX_INT64 = BigInt("9223372036854775807");

class Int64Serializer extends AbstractBigIntSerializer<"int64"> {
  readonly primitive = "int64";

  toJson(input: bigint): number | string {
    // 9007199254740991 == Number.MAX_SAFE_INTEGER
    if (-9007199254740991 <= input && input <= 9007199254740991) {
      return Number(input);
    }
    const s = BigInt(input).toString();
    // Clamp the number if it's out of bounds.
    return s.length <= 18
      ? // Small optimization for "small" numbers. The max int64 has 19 digits.
        s
      : input < MIN_INT64
        ? MIN_INT64.toString()
        : input < MAX_INT64
          ? s
          : MAX_INT64.toString();
  }

  encode(input: bigint, stream: OutputStream): void {
    if (input) {
      if (-2147483648 <= input && input <= 2147483647) {
        INT32_SERIALIZER.encode(Number(input), stream);
      } else {
        stream.writeUint8(238);
        // Clamp the number if it's out of bounds.
        stream.writeInt64(
          input < MIN_INT64 ? MIN_INT64 : input < MAX_INT64 ? input : MAX_INT64,
        );
      }
    } else {
      stream.writeUint8(0);
    }
  }

  decode(stream: InputStream): bigint {
    return decodeBigInt(stream);
  }
}

const MAX_UINT64 = BigInt("18446744073709551615");

class Uint64Serializer extends AbstractBigIntSerializer<"uint64"> {
  readonly primitive = "uint64";

  toJson(input: bigint): number | string {
    if (input <= 9007199254740991) {
      return input <= 0 ? 0 : Number(input);
    }
    input = BigInt(input);
    return MAX_UINT64 < input ? MAX_UINT64.toString() : input.toString();
  }

  encode(input: bigint, stream: OutputStream): void {
    if (input < 232) {
      stream.writeUint8(input <= 0 ? 0 : Number(input));
    } else if (input < 4294967296) {
      if (input < 65536) {
        stream.writeUint8(232);
        stream.writeUint16(Number(input));
      } else {
        stream.writeUint8(233);
        stream.writeUint32(Number(input));
      }
    } else {
      stream.writeUint8(234);
      stream.writeUint64(input <= MAX_UINT64 ? input : MAX_UINT64);
    }
  }

  decode(stream: InputStream): bigint {
    return decodeBigInt(stream);
  }
}

type TimestampReadableJson = {
  unix_millis: number;
  formatted: string;
};

class TimestampSerializer extends AbstractPrimitiveSerializer<"timestamp"> {
  readonly primitive = "timestamp";
  readonly defaultValue = Timestamp.UNIX_EPOCH;

  toJson(
    input: Timestamp,
    flavor?: JsonFlavor,
  ): number | TimestampReadableJson {
    return flavor === "readable"
      ? {
          unix_millis: input.unixMillis,
          formatted: input.toDate().toISOString(),
        }
      : input.unixMillis;
  }

  fromJson(json: Json): Timestamp {
    return Timestamp.fromUnixMillis(
      typeof json === "number"
        ? json
        : typeof json === "string"
          ? +json
          : (json as TimestampReadableJson)["unix_millis"],
    );
  }

  encode(input: Timestamp, stream: OutputStream): void {
    const { unixMillis } = input;
    if (unixMillis) {
      stream.writeUint8(239);
      stream.writeInt64(BigInt(unixMillis));
    } else {
      stream.writeUint8(0);
    }
  }

  decode(stream: InputStream): Timestamp {
    const unixMillis = decodeNumber(stream);
    return Timestamp.fromUnixMillis(Number(unixMillis));
  }

  isDefault(input: Timestamp): boolean {
    return !input.unixMillis;
  }
}

class StringSerializer extends AbstractPrimitiveSerializer<"string"> {
  readonly primitive = "string";
  readonly defaultValue = "";

  toJson(input: string): string {
    if (typeof input === "string") {
      return input;
    }
    throw this.newTypeError(input);
  }

  fromJson(json: Json): string {
    if (typeof json === "string") {
      return json;
    }
    if (json === 0) {
      return "";
    }
    throw this.newTypeError(json);
  }

  encode(input: string, stream: OutputStream): void {
    if (!input) {
      stream.writeUint8(242);
      return;
    }
    stream.writeUint8(243);
    // We don't know the length of the UTF-8 string until we actually encode the
    // string. We just know that it's at most 3 times the length of the input
    // string.
    const maxEncodedLength = input.length * 3;
    // Write zero in place of the UTF-8 sequence length. We will override this
    // number later.
    if (maxEncodedLength < 232) {
      stream.writeUint8(0);
    } else if (maxEncodedLength < 65536) {
      stream.writeUint8(232);
      stream.writeUint16(0);
    } else {
      stream.writeUint8(233);
      stream.writeUint32(0);
    }
    const { dataView, offset } = stream;
    // Write the UTF-8 string and record the number of bytes written.
    const encodedLength = stream.putUtf8String(input);
    // Write the length of the UTF-8 string where we wrote 0.
    if (maxEncodedLength < 232) {
      dataView.setUint8(offset - 1, encodedLength);
    } else if (maxEncodedLength < 65536) {
      dataView.setUint16(offset - 2, encodedLength, true);
    } else {
      dataView.setUint32(offset - 4, encodedLength, true);
    }
  }

  decode(stream: InputStream): string {
    const wire = stream.readUint8();
    if (wire === 0 || wire === 242) {
      return "";
    }
    const encodedLength = decodeNumber(stream) as number;
    return textDecoder.decode(
      new Uint8Array(
        stream.buffer,
        (stream.offset += encodedLength) - encodedLength,
        encodedLength,
      ),
    );
  }

  private newTypeError(actual: unknown): TypeError {
    return new TypeError(`expected: string; actual: ${typeof actual}`);
  }
}

class ByteStringSerializer extends AbstractPrimitiveSerializer<"bytes"> {
  readonly primitive = "bytes";
  readonly defaultValue = ByteString.EMPTY;

  toJson(input: ByteString, flavor?: JsonFlavor): string {
    return flavor === "readable" ? "hex:" + input.toBase16() : input.toBase64();
  }

  fromJson(json: Json): ByteString {
    if (json === 0) {
      return ByteString.EMPTY;
    }
    const string = json as string;
    return string.startsWith("hex:")
      ? ByteString.fromBase16(string.substring(4))
      : ByteString.fromBase64(string);
  }

  encode(input: ByteString, stream: OutputStream): void {
    const { byteLength } = input;
    if (byteLength) {
      stream.writeUint8(245);
      encodeUint32(byteLength, stream);
      stream.putBytes(input);
    } else {
      stream.writeUint8(244);
    }
  }

  decode(stream: InputStream): ByteString {
    const wire = stream.readUint8();
    if (wire === 0 || wire === 244) {
      return ByteString.EMPTY;
    }
    const lengthInBytes = decodeNumber(stream) as number;
    return ByteString.sliceOf(
      stream.buffer,
      stream.offset,
      (stream.offset += lengthInBytes),
    );
  }

  isDefault(input: ByteString): boolean {
    return !input.byteLength;
  }
}

type AnyRecord = Record<string, unknown>;

class StructFieldImpl<Struct = unknown, Value = unknown>
  implements StructField<Struct, Value>
{
  constructor(
    readonly name: string,
    readonly property: string,
    readonly number: number,
    readonly serializer: InternalSerializer<Value>,
  ) {}

  get type(): TypeDescriptor<Value> {
    return this.serializer.typeDescriptor;
  }

  get(struct: Struct | MutableForm<Struct>): Value {
    return Reflect.get(struct as AnyRecord, this.property) as Value;
  }

  set(struct: MutableForm<Struct>, value: Value): void {
    Reflect.set(struct, this.property, value);
  }
}

type EnumFieldImpl<Enum = unknown> =
  | EnumConstantFieldImpl<Enum>
  | EnumValueFieldImpl<Enum, unknown>;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

class ArraySerializerImpl<Item>
  extends AbstractSerializer<readonly Item[]>
  implements ArrayDescriptor<readonly Item[]>
{
  constructor(
    readonly itemSerializer: InternalSerializer<Item>,
    readonly keyExtractor?: string,
  ) {
    super();
  }

  readonly kind = "array";
  readonly defaultValue = _EMPTY_ARRAY;

  toJson(input: ReadonlyArray<Item>, flavor?: JsonFlavor): Json[] {
    return input.map((e) => this.itemSerializer.toJson(e, flavor));
  }

  fromJson(json: Json, keep?: "keep-unrecognized-fields"): ReadonlyArray<Item> {
    if (json === 0) {
      return _EMPTY_ARRAY;
    }
    return freezeArray(
      (json as readonly Json[]).map((e) =>
        this.itemSerializer.fromJson(e, keep),
      ),
    );
  }

  encode(input: ReadonlyArray<Item>, stream: OutputStream): void {
    const { length } = input;
    if (length <= 3) {
      stream.writeUint8(246 + length);
    } else {
      stream.writeUint8(250);
      encodeUint32(length, stream);
    }
    const { itemSerializer } = this;
    for (let i = 0; i < input.length; ++i) {
      itemSerializer.encode(input[i]!, stream);
    }
  }

  decode(stream: InputStream): readonly Item[] {
    const wire = stream.readUint8();
    if (wire === 0 || wire === 246) {
      return _EMPTY_ARRAY;
    }
    const length = wire === 250 ? (decodeNumber(stream) as number) : wire - 246;
    const { itemSerializer } = this;
    const result = new Array<Item>(length);
    for (let i = 0; i < length; ++i) {
      result[i] = itemSerializer.decode(stream);
    }
    return freezeArray(result);
  }

  isDefault(input: ReadonlyArray<Item>): boolean {
    return !input.length;
  }

  get itemType(): TypeDescriptor<Item> {
    return this.itemSerializer.typeDescriptor;
  }

  get typeSignature(): TypeSignature {
    return {
      kind: "array",
      value: {
        item: this.itemSerializer.typeSignature,
        key_extractor: this.keyExtractor,
      },
    };
  }

  addRecordDefinitionsTo(out: { [k: string]: RecordDefinition }): void {
    this.itemSerializer.addRecordDefinitionsTo(out);
  }
}

class OptionalSerializerImpl<Other>
  extends AbstractSerializer<Other | null>
  implements OptionalDescriptor<Other | null>
{
  constructor(readonly otherSerializer: InternalSerializer<Other>) {
    super();
  }

  readonly kind = "optional";
  readonly defaultValue = null;

  toJson(input: Other, flavor?: JsonFlavor): Json {
    return input !== null ? this.otherSerializer.toJson(input, flavor) : null;
  }

  fromJson(json: Json, keep?: "keep-unrecognized-fields"): Other | null {
    return json !== null ? this.otherSerializer.fromJson(json, keep) : null;
  }

  encode(input: Other | null, stream: OutputStream): void {
    if (input === null) {
      stream.writeUint8(255);
    } else {
      this.otherSerializer.encode(input, stream);
    }
  }

  decode(stream: InputStream): Other | null {
    const wire = stream.dataView.getUint8(stream.offset);
    if (wire === 255) {
      ++stream.offset;
      return null;
    }
    return this.otherSerializer.decode(stream);
  }

  isDefault(input: Other | null): boolean {
    return input === null;
  }

  get otherType(): TypeDescriptor<NonNullable<Other>> {
    return this.otherSerializer.typeDescriptor as TypeDescriptor<
      NonNullable<Other>
    >;
  }

  get typeSignature(): TypeSignature {
    return {
      kind: "optional",
      value: this.otherSerializer.typeSignature,
    };
  }

  addRecordDefinitionsTo(out: { [k: string]: RecordDefinition }): void {
    this.otherSerializer.addRecordDefinitionsTo(out);
  }
}

const PRIMITIVE_SERIALIZERS: {
  [P in keyof PrimitiveTypes]: Serializer<PrimitiveTypes[P]>;
} = {
  bool: new BoolSerializer(),
  int32: INT32_SERIALIZER,
  int64: new Int64Serializer(),
  uint64: new Uint64Serializer(),
  float32: new Float32Serializer(),
  float64: new Float64Serializer(),
  timestamp: new TimestampSerializer(),
  string: new StringSerializer(),
  bytes: new ByteStringSerializer(),
};

type NewMutableFn<Frozen> = (
  initializer?: Frozen | MutableForm<Frozen>,
) => MutableForm<Frozen>;

function decodeUnused(stream: InputStream): void {
  const wire = stream.readUint8();
  if (wire < 232) {
    return;
  }
  switch (wire - 232) {
    case 0: // uint16
    case 4: // uint16 - 65536
      stream.offset += 2;
      break;
    case 1: // uint32
    case 5: // int32
    case 8: // float32
      stream.offset += 4;
      break;
    case 2: // uint64
    case 6: // int64
    case 7: // uint64 timestamp
    case 9: // float64
      stream.offset += 8;
      break;
    case 3: // uint8 - 256
      ++stream.offset;
      break;
    case 11: // string
    case 13: {
      // bytes
      const length = decodeNumber(stream) as number;
      stream.offset += length;
      break;
    }
    case 15: // array length==1
    case 19: // enum value kind==1
    case 20: // enum value kind==2
    case 21: // enum value kind==3
    case 22: // enum value kind==4
      decodeUnused(stream);
      break;
    case 16: // array length==2
      decodeUnused(stream);
      decodeUnused(stream);
      break;
    case 17: // array length==3
      decodeUnused(stream);
      decodeUnused(stream);
      decodeUnused(stream);
      break;
    case 18: {
      // array length==N
      const length = decodeNumber(stream);
      for (let i = 0; i < length; ++i) {
        decodeUnused(stream);
      }
      break;
    }
  }
}

abstract class AbstractRecordSerializer<T, F> extends AbstractSerializer<T> {
  /** Uniquely identifies this record serializer. */
  readonly token: symbol = Symbol();
  abstract kind: "struct" | "enum";
  name = "";
  modulePath = "";
  parentType: StructDescriptor | EnumDescriptor | undefined;
  removedNumbers = new Set<number>();
  initialized?: true;

  init(
    name: string,
    modulePath: string,
    parentType: StructDescriptor | EnumDescriptor | undefined,
    fields: readonly F[],
    removedNumbers: readonly number[],
  ): void {
    this.name = name;
    this.modulePath = modulePath;
    this.parentType = parentType;
    this.removedNumbers = new Set(removedNumbers);
    this.registerFields(fields);
    this.initialized = true;
    freezeDeeply(this);
  }

  get qualifiedName(): string {
    const { name, parentType } = this;
    return parentType ? `${parentType.name}.${name}` : name;
  }

  abstract registerFields(fields: readonly F[]): void;

  addRecordDefinitionsTo(out: { [k: string]: RecordDefinition }): void {
    const recordId = `${this.modulePath}:${this.qualifiedName}`;
    if (out[recordId]) {
      return;
    }
    const recordDefinition: RecordDefinition = {
      kind: this.kind,
      id: recordId,
      fields: this.fieldDefinitions(),
    };
    if (this.removedNumbers.size) {
      recordDefinition.removed_numbers = [...this.removedNumbers];
    }
    out[recordId] = recordDefinition;
    for (const dependency of this.dependencies()) {
      dependency.addRecordDefinitionsTo(out);
    }
  }

  abstract fieldDefinitions(): FieldDefinition[];
  abstract dependencies(): InternalSerializer[];
}

/** Unrecognized fields found when deserializing a struct. */
class UnrecognizedFields {
  constructor(
    /** Uniquely identifies the struct. */
    readonly token: symbol,
    /** Total number of fields in the struct. */
    readonly totalSlots: number,
    readonly json?: ReadonlyArray<Json>,
    readonly bytes?: ByteString,
  ) {
    Object.freeze(this);
  }
}

class StructSerializerImpl<T = unknown>
  extends AbstractRecordSerializer<T, StructFieldImpl<T>>
  implements StructDescriptor<T>
{
  constructor(
    readonly defaultValue: T,
    readonly createFn: (initializer: AnyRecord) => T,
    readonly newMutableFn: NewMutableFn<T>,
  ) {
    super();
  }

  readonly kind = "struct";
  // Fields in the order they appear in the `.soia` file.
  readonly fields: Array<StructFieldImpl<T>> = [];
  readonly fieldMapping: { [key: string | number]: StructFieldImpl<T> } = {};
  // Fields sorted by number in descending order.
  private reversedFields: Array<StructFieldImpl<T>> = [];
  // This is *not* a dense array, missing slots correspond to removed fields.
  private readonly slots: Array<StructFieldImpl<T>> = [];
  private recognizedSlots = 0;
  // Contains one zero for every field number.
  private readonly zeros: Json[] = [];
  private readonly initializerTemplate: Record<string, unknown> = {};

  toJson(input: T, flavor?: JsonFlavor): Json {
    if (input === this.defaultValue) {
      return flavor === "readable" ? {} : [];
    }
    if (flavor === "readable") {
      const { fields } = this;
      const result: { [name: string]: Json } = {};
      for (const field of fields) {
        const { serializer } = field;
        const value = (input as AnyRecord)[field.property];
        if (field.serializer.isDefault(value)) {
          continue;
        }
        result[field.name] = serializer.toJson(value, flavor);
      }
      return result;
    } else {
      // Dense flavor.
      const { slots } = this;
      let result: Json[];
      const unrecognizedFields = //
        (input as AnyRecord)["^"] as UnrecognizedFields;
      if (
        unrecognizedFields &&
        unrecognizedFields.json &&
        unrecognizedFields.token === this.token
      ) {
        // We'll need to copy the unrecognized fields to the JSON.
        result = this.zeros.concat(unrecognizedFields.json);
        for (const field of this.fields) {
          result[field.number] = field.serializer.toJson(
            (input as AnyRecord)[field.property],
            flavor,
          );
        }
      } else {
        result = [];
        const arrayLength = this.getArrayLength(input);
        for (let i = 0; i < arrayLength; ++i) {
          const field = slots[i];
          result[i] = field
            ? field.serializer.toJson(
                (input as AnyRecord)[field.property],
                flavor,
              )
            : 0;
        }
      }
      return result;
    }
  }

  fromJson(json: Json, keep?: "keep-unrecognized-fields"): T {
    if (!json) {
      return this.defaultValue;
    }
    const initializer = { ...this.initializerTemplate };
    if (json instanceof Array) {
      const { slots, recognizedSlots } = this;
      // Dense flavor.
      if (json.length > recognizedSlots) {
        // We have some unrecognized fields.
        if (keep) {
          const unrecognizedFields = new UnrecognizedFields(
            this.token,
            json.length,
            copyJson(json.slice(recognizedSlots)),
          );
          initializer["^"] = unrecognizedFields;
        }
        // Now that we have stored the unrecognized fields in `initializer`, we
        // can remove them from `json`.
        json = json.slice(0, recognizedSlots);
      }
      for (let i = 0; i < json.length && i < slots.length; ++i) {
        const field = slots[i];
        if (field) {
          initializer[field.property] = field.serializer.fromJson(
            json[i]!,
            keep,
          );
        }
        // Else the field was removed.
      }
      return this.createFn(initializer);
    } else if (json instanceof Object) {
      // Readable flavor.
      const { fieldMapping } = this;
      for (const name in json) {
        const field = fieldMapping[name];
        if (field) {
          initializer[field.property] = field.serializer.fromJson(
            json[name]!,
            keep,
          );
        }
      }
      return this.createFn(initializer);
    }
    throw TypeError();
  }

  encode(input: T, stream: OutputStream): void {
    // Total number of slots to write. Includes removed and unrecognized fields.
    let totalSlots: number;
    let recognizedSlots: number;
    let unrecognizedBytes: ByteString | undefined;
    const unrecognizedFields = (input as AnyRecord)["^"] as UnrecognizedFields;
    if (
      unrecognizedFields &&
      unrecognizedFields.bytes &&
      unrecognizedFields.token === this.token
    ) {
      totalSlots = unrecognizedFields.totalSlots;
      recognizedSlots = this.recognizedSlots;
      unrecognizedBytes = unrecognizedFields.bytes;
    } else {
      // No unrecognized fields.
      totalSlots = recognizedSlots = this.getArrayLength(input);
    }

    if (totalSlots <= 3) {
      stream.writeUint8(246 + totalSlots);
    } else {
      stream.writeUint8(250);
      encodeUint32(totalSlots, stream);
    }
    const { slots } = this;
    for (let i = 0; i < recognizedSlots; ++i) {
      const field = slots[i];
      if (field) {
        field.serializer.encode((input as AnyRecord)[field.property], stream);
      } else {
        // Append '0' if the field was removed.
        stream.writeUint8(0);
      }
    }
    if (unrecognizedBytes) {
      // Copy the unrecognized fields.
      stream.putBytes(unrecognizedBytes);
    }
  }

  decode(stream: InputStream): T {
    const wire = stream.readUint8();
    if (wire === 0 || wire === 246) {
      return this.defaultValue;
    }
    const initializer = { ...this.initializerTemplate };
    const encodedSlots =
      wire === 250 ? (decodeNumber(stream) as number) : wire - 246;
    const { slots, recognizedSlots } = this;
    // Do not read more slots than the number of recognized slots.
    for (let i = 0; i < encodedSlots && i < recognizedSlots; ++i) {
      const field = slots[i];
      if (field) {
        initializer[field.property] = field.serializer.decode(stream);
      } else {
        // The field was removed.
        decodeUnused(stream);
      }
    }
    if (encodedSlots > recognizedSlots) {
      // We have some unrecognized fields.
      const start = stream.offset;
      for (let i = recognizedSlots; i < encodedSlots; ++i) {
        decodeUnused(stream);
      }
      if (stream.keepUnrecognizedFields) {
        const end = stream.offset;
        const unrecognizedBytes = ByteString.sliceOf(stream.buffer, start, end);
        const unrecognizedFields = new UnrecognizedFields(
          this.token,
          encodedSlots,
          undefined,
          unrecognizedBytes,
        );
        initializer["^"] = unrecognizedFields;
      }
    }
    return this.createFn(initializer);
  }

  /**
   * Returns the length of the JSON array for the given input, which is also the
   * number of slots and includes removed fields.
   * Assumes that `input` does not contain unrecognized fields.
   */
  private getArrayLength(input: T): number {
    const { reversedFields } = this;
    for (let i = 0; i < reversedFields.length; ++i) {
      const field = reversedFields[i]!;
      const isDefault = //
        field.serializer.isDefault((input as AnyRecord)[field.property]);
      if (!isDefault) {
        return field.number + 1;
      }
    }
    return 0;
  }

  isDefault(input: T): boolean {
    if (input === this.defaultValue) {
      return true;
    }
    // It's possible for a value of type T to be equal to T.DEFAULT but to not
    // be the reference to T.DEFAULT.
    if ((input as AnyRecord)["^"] as UnrecognizedFields) {
      return false;
    }
    return this.fields.every((f) =>
      f.serializer.isDefault((input as AnyRecord)[f.property]),
    );
  }

  get typeSignature(): TypeSignature {
    return {
      kind: "record",
      value: `${this.modulePath}:${this.qualifiedName}`,
    };
  }

  getField<K extends string | number>(key: K): StructFieldResult<T, K> {
    return this.fieldMapping[key]!;
  }

  newMutable(initializer?: T | MutableForm<T>): MutableForm<T> {
    return this.newMutableFn(initializer);
  }

  registerFields(fields: ReadonlyArray<StructFieldImpl<T>>): void {
    for (const field of fields) {
      const { name, number, property } = field;
      this.fields.push(field);
      this.slots[number] = field;
      this.fieldMapping[name] = field;
      this.fieldMapping[property] = field;
      this.fieldMapping[number] = field;
      this.initializerTemplate[property] = (this.defaultValue as AnyRecord)[
        field.property
      ];
    }
    // Removed numbers count as recognized slots.
    this.recognizedSlots =
      Math.max(this.slots.length - 1, ...this.removedNumbers) + 1;
    this.zeros.push(...Array<Json>(this.recognizedSlots).fill(0));
    this.reversedFields = [...this.fields].sort((a, b) => b.number - a.number);
  }

  fieldDefinitions(): FieldDefinition[] {
    return this.fields.map((f) => ({
      name: f.name,
      number: f.number,
      type: f.serializer.typeSignature,
    }));
  }

  dependencies(): InternalSerializer[] {
    return this.fields.map((f) => f.serializer);
  }
}

class UnrecognizedEnum {
  constructor(
    readonly token: symbol,
    readonly json?: Json,
    readonly bytes?: ByteString,
  ) {
    Object.freeze(this);
  }
}

interface EnumConstantFieldImpl<Enum> extends EnumConstantField<Enum> {
  readonly serializer?: undefined;
}

class EnumValueFieldImpl<Enum, Value = unknown> {
  constructor(
    readonly name: string,
    readonly number: number,
    readonly serializer: InternalSerializer<Value>,
    private createFn: (initializer: { kind: string; value: unknown }) => Enum,
  ) {}

  get type(): TypeDescriptor<Value> {
    return this.serializer.typeDescriptor;
  }

  readonly constant?: undefined;

  get(e: Enum): Value | undefined {
    return (e as _EnumBase).kind === this.name
      ? ((e as AnyRecord).value as Value)
      : undefined;
  }

  wrap(value: Value): Enum {
    return this.createFn({ kind: this.name, value: value });
  }
}

class EnumSerializerImpl<T = unknown>
  extends AbstractRecordSerializer<T, EnumFieldImpl<T>>
  implements EnumDescriptor<T>
{
  constructor(readonly createFn: (initializer: unknown) => T) {
    super();
    this.defaultValue = createFn("?");
  }

  readonly kind = "enum";
  readonly defaultValue: T;
  readonly fields: EnumFieldImpl<T>[] = [];
  private readonly fieldMapping: { [key: string | number]: EnumFieldImpl<T> } =
    {};

  toJson(input: T, flavor?: JsonFlavor): Json {
    const unrecognized = (input as AnyRecord)["^"] as
      | UnrecognizedEnum
      | undefined;
    if (
      unrecognized &&
      unrecognized.json &&
      unrecognized.token === this.token
    ) {
      // Unrecognized field.
      return unrecognized.json;
    }
    const kind = (input as AnyRecord).kind as string;
    if (kind === "?") {
      return flavor === "readable" ? "?" : 0;
    }
    const field = this.fieldMapping[kind]!;
    const serializer = field.serializer;
    if (serializer) {
      const value = (input as AnyRecord).value;
      if (flavor === "readable") {
        return {
          kind: field.name,
          value: serializer.toJson(value, flavor),
        };
      } else {
        // Dense flavor.
        return [field.number, serializer.toJson(value, flavor)];
      }
    } else {
      // A constant field.
      return flavor === "readable" ? field.name : field.number;
    }
  }

  fromJson(json: Json, keep?: "keep-unrecognized-fields"): T {
    const isNumber = typeof json === "number";
    if (isNumber || typeof json === "string") {
      const field = this.fieldMapping[isNumber ? json : String(json)];
      if (!field) {
        // Check if the field was removed, in which case we want to return
        // UNKNOWN, or is unrecognized.
        return !keep || (isNumber && this.removedNumbers.has(json))
          ? this.defaultValue
          : this.createFn(new UnrecognizedEnum(this.token, copyJson(json)));
      }
      if (field.serializer) {
        throw new Error(`refers to a value field: ${json}`);
      }
      return field.constant;
    }
    let fieldKey: number | string;
    let valueAsJson: Json;
    if (json instanceof Array) {
      fieldKey = json[0] as number;
      valueAsJson = json[1]!;
    } else if (json instanceof Object) {
      fieldKey = json["kind"] as string;
      valueAsJson = json["value"]!;
    } else {
      throw TypeError();
    }
    const field = this.fieldMapping[fieldKey];
    if (!field) {
      // Check if the field was removed, in which case we want to return
      // UNKNOWN, or is unrecognized.
      return !keep ||
        (typeof fieldKey === "number" && this.removedNumbers.has(fieldKey))
        ? this.defaultValue
        : this.createFn(
            new UnrecognizedEnum(this.token, copyJson(json), undefined),
          );
    }
    const { serializer } = field;
    if (!serializer) {
      throw new Error(`refers to a constant field: ${json}`);
    }
    return field.wrap(serializer.fromJson(valueAsJson, keep));
  }

  encode(input: T, stream: OutputStream): void {
    const unrecognized = //
      (input as AnyRecord)["^"] as UnrecognizedEnum | undefined;
    if (
      unrecognized &&
      unrecognized.bytes &&
      unrecognized.token === this.token
    ) {
      // Unrecognized field.
      stream.putBytes(unrecognized.bytes);
      return;
    }
    const kind = (input as AnyRecord).kind as string;
    if (kind === "?") {
      stream.writeUint8(0);
      return;
    }
    const field = this.fieldMapping[kind]!;
    const { number, serializer } = field;
    if (serializer) {
      // A value field.
      const value = (input as AnyRecord).value;
      if (number < 5) {
        // The number can't be 0 or else kind == "?".
        stream.writeUint8(250 + number);
      } else {
        stream.writeUint8(248);
        encodeUint32(number, stream);
      }
      serializer.encode(value, stream);
    } else {
      // A constant field.
      encodeUint32(number, stream);
    }
  }

  decode(stream: InputStream): T {
    const startOffset = stream.offset;
    const wire = stream.dataView.getUint8(startOffset);
    if (wire < 242) {
      // A number
      const number = decodeNumber(stream) as number;
      const field = this.fieldMapping[number];
      if (!field) {
        // Check if the field was removed, in which case we want to return
        // UNKNOWN, or is unrecognized.
        if (!stream.keepUnrecognizedFields || this.removedNumbers.has(number)) {
          return this.defaultValue;
        } else {
          const { offset } = stream;
          const bytes = ByteString.sliceOf(stream.buffer, startOffset, offset);
          return this.createFn(
            new UnrecognizedEnum(this.token, undefined, bytes),
          );
        }
      }
      if (field.serializer) {
        throw new Error(`refers to a value field: ${number}`);
      }
      return field.constant;
    } else {
      ++stream.offset;
      const number =
        wire === 248 ? (decodeNumber(stream) as number) : wire - 250;
      const field = this.fieldMapping[number];
      if (!field) {
        decodeUnused(stream);
        // Check if the field was removed, in which case we want to return
        // UNKNOWN, or is unrecognized.
        if (!stream.keepUnrecognizedFields || this.removedNumbers.has(number)) {
          return this.defaultValue;
        } else {
          const { offset } = stream;
          const bytes = ByteString.sliceOf(stream.buffer, startOffset, offset);
          return this.createFn(
            new UnrecognizedEnum(this.token, undefined, bytes),
          );
        }
      }
      const { serializer } = field;
      if (!serializer) {
        throw new Error(`refers to a constant field: ${number}`);
      }
      return field.wrap(serializer.decode(stream));
    }
  }

  get typeSignature(): TypeSignature {
    return {
      kind: "record",
      value: `${this.modulePath}:${this.qualifiedName}`,
    };
  }

  isDefault(input: T): boolean {
    type Kinded = { kind: string };
    return (input as Kinded).kind === "?" && !(input as AnyRecord)["^"];
  }

  getField<K extends string | number>(key: K): EnumFieldResult<T, K> {
    return this.fieldMapping[key]!;
  }

  registerFields(fields: ReadonlyArray<EnumFieldImpl<T>>): void {
    for (const field of fields) {
      this.fields.push(field);
      this.fieldMapping[field.name] = field;
      this.fieldMapping[field.number] = field;
    }
  }

  fieldDefinitions(): FieldDefinition[] {
    return (
      this.fields
        // Skip the UNKNOWN field.
        .filter((f) => f.number)
        .map((f) => {
          const result = {
            name: f.name,
            number: f.number,
          };
          const type = f?.serializer?.typeSignature;
          return type ? { ...result, type: type } : result;
        })
    );
  }

  dependencies(): InternalSerializer[] {
    const result: InternalSerializer[] = [];
    for (const f of this.fields) {
      if (f.serializer) {
        result.push(f.serializer);
      }
    }
    return result;
  }
}

function copyJson(input: readonly Json[]): Json[];
function copyJson(input: Json): Json;
function copyJson(input: Json): Json {
  if (input instanceof Array) {
    return Object.freeze(input.map(copyJson));
  } else if (input instanceof Object) {
    return Object.freeze(
      Object.fromEntries(Object.entries(input).map((k, v) => [k, copyJson(v)])),
    );
  }
  // A boolean, a number, a string or null.
  return input;
}

function freezeDeeply(o: unknown): void {
  if (!(o instanceof Object)) {
    return;
  }
  if (o instanceof _FrozenBase || o instanceof _EnumBase) {
    return;
  }
  if (o instanceof AbstractRecordSerializer && !o.initialized) {
    return;
  }
  if (Object.isFrozen(o)) {
    return;
  }
  Object.freeze(o);
  for (const v of Object.values(o)) {
    freezeDeeply(v);
  }
}

// =============================================================================
// Frozen arrays
// =============================================================================

interface FrozenArrayInfo {
  keyFnToIndexing?: Map<unknown, Map<unknown, unknown>>;
}

const frozenArrayRegistry = new WeakMap<
  ReadonlyArray<unknown>,
  FrozenArrayInfo
>();

function freezeArray<T>(array: readonly T[]): readonly T[] {
  if (!frozenArrayRegistry.has(array)) {
    frozenArrayRegistry.set(Object.freeze(array), {});
  }
  return array;
}

export const _EMPTY_ARRAY = freezeArray([]);

export function _toFrozenArray<T, Initializer>(
  initializers: readonly Initializer[],
  itemToFrozenFn?: (item: Initializer) => T,
): readonly T[] {
  if (!initializers.length) {
    return _EMPTY_ARRAY;
  }
  if (frozenArrayRegistry.has(initializers)) {
    // No need to make a copy: the given array is already deeply-frozen.
    return initializers as unknown as readonly T[];
  }
  const ret = Object.freeze(
    itemToFrozenFn
      ? initializers.map(itemToFrozenFn)
      : (initializers.slice() as unknown as readonly T[]),
  );
  frozenArrayRegistry.set(ret, {});
  return ret;
}

// =============================================================================
// Shared implementation of generated classes
// =============================================================================

export declare const _INITIALIZER: unique symbol;

const PRIVATE_KEY: unique symbol = Symbol();

function forPrivateUseError(t: unknown): Error {
  const clazz = Object.getPrototypeOf(t).constructor as AnyRecord;
  const { qualifiedName } = clazz.SERIALIZER as StructDescriptor;
  return Error(
    [
      "Do not call the constructor directly; ",
      `instead, call ${qualifiedName}.create(...)`,
    ].join(""),
  );
}

export abstract class _FrozenBase {
  protected constructor(privateKey: symbol) {
    if (privateKey !== PRIVATE_KEY) {
      throw forPrivateUseError(this);
    }
  }

  toMutable(): unknown {
    return new (Object.getPrototypeOf(this).constructor.Mutable)(this);
  }

  toFrozen(): this {
    return this;
  }

  toString(): string {
    return toStringImpl(this);
  }

  declare [_INITIALIZER]: unknown;
}

export abstract class _EnumBase {
  protected constructor(
    privateKey: symbol,
    readonly kind: string,
    readonly value?: unknown,
    unrecognized?: UnrecognizedEnum,
  ) {
    if (privateKey !== PRIVATE_KEY) {
      throw forPrivateUseError(this);
    }
    if (unrecognized) {
      if (!(unrecognized instanceof UnrecognizedEnum)) {
        throw new TypeError();
      }
      (this as AnyRecord)["^"] = unrecognized;
    }
    Object.freeze(this);
  }

  toString(): string {
    return toStringImpl(this);
  }
}

// The TypeScript compiler complains if we define the property within the class.
Object.defineProperty(_EnumBase.prototype, "union", {
  get: function () {
    return this;
  },
});

function toStringImpl<T>(value: T): string {
  const serializer = Object.getPrototypeOf(value).constructor
    .SERIALIZER as InternalSerializer<T>;
  return serializer.toJsonCode(value, "readable");
}

// =============================================================================
// Soia services
// =============================================================================

/** Metadata of an HTTP request sent by a service client. */
export type RequestMeta = Omit<RequestInit, "body" | "method">;

/** Sends RPCs to a soia service. */
export class ServiceClient {
  constructor(
    private readonly serviceUrl: string,
    private readonly getRequestMetadata: (
      m: Method<unknown, unknown>,
    ) => Promise<RequestMeta> | RequestMeta = (): RequestMeta => ({}),
  ) {
    const url = new URL(serviceUrl);
    if (url.search) {
      throw new Error("Service URL must not contain a query string");
    }
  }

  /** Invokes the given method on the remote server through an RPC. */
  async invokeRemote<Request, Response>(
    method: Method<Request, Response>,
    request: Request,
    httpMethod: "GET" | "POST" = "POST",
  ): Promise<Response> {
    this.lastRespHeaders = undefined;
    const requestJson = method.requestSerializer.toJsonCode(request);
    const requestBody = [method.name, method.number, "", requestJson].join(":");
    const requestInit: RequestInit = {
      ...(await Promise.resolve(this.getRequestMetadata(method))),
    };
    const url = new URL(this.serviceUrl);
    requestInit.method = httpMethod;
    if (httpMethod === "POST") {
      requestInit.body = requestBody;
    } else {
      url.search = requestBody.replace(/%/g, "%25");
    }
    const httpResponse = await fetch(url, requestInit);
    this.lastRespHeaders = httpResponse.headers;
    const responseData = await httpResponse.blob();
    if (httpResponse.ok) {
      const jsonCode = await responseData.text();
      return method.responseSerializer.fromJsonCode(
        jsonCode,
        "keep-unrecognized-fields",
      );
    } else {
      let message = "";
      if (/text\/plain\b/.test(responseData.type)) {
        message = `: ${await responseData.text()}`;
      }
      throw new Error(`HTTP status ${httpResponse.status}${message}`);
    }
  }

  get lastResponseHeaders(): Headers | undefined {
    return this.lastRespHeaders;
  }

  private lastRespHeaders: Headers | undefined;
}

/** Raw response returned by the server. */
export class RawResponse {
  constructor(
    readonly data: string,
    readonly type: "ok-json" | "ok-html" | "bad-request" | "server-error",
  ) {}

  get statusCode(): number {
    switch (this.type) {
      case "ok-json":
      case "ok-html":
        return 200;
      case "bad-request":
        return 400;
      case "server-error":
        return 500;
      default: {
        const _: never = this.type;
        throw new Error(_);
      }
    }
  }

  get contentType(): string {
    switch (this.type) {
      case "ok-json":
        return "application/json";
      case "ok-html":
        return "text/html; charset=utf-8";
      case "bad-request":
      case "server-error":
        return "text/plain; charset=utf-8";
      default: {
        const _: never = this.type;
        throw new Error(_);
      }
    }
  }
}

// Copied from
//   https://github.com/gepheum/restudio/blob/main/index.jsdeliver.html
const RESTUDIO_HTML = `<!DOCTYPE html>

<html>
  <head>
    <meta charset="utf-8" />
    <title>RESTudio</title>
    <script src="https://cdn.jsdelivr.net/npm/restudio/dist/restudio-standalone.js"></script>
  </head>
  <body style="margin: 0; padding: 0;">
    <restudio-app></restudio-app>
  </body>
</html>
`;

/**
 * Implementation of a soia service.
 *
 * Usage: call `.addMethod()` to register methods, then install the service on
 * an HTTP server either by:
 *   - calling the `installServiceOnExpressApp()` top-level function  if you are
 *       using ExpressJS
 *   - writing your own implementation of `installServiceOn*()` which calls
 *       `.handleRequest()` if you are using another web application framework
 */
export class Service<
  RequestMeta = ExpressRequest,
  ResponseMeta = ExpressResponse,
> {
  addMethod<Request, Response>(
    method: Method<Request, Response>,
    impl: (
      req: Request,
      reqMeta: RequestMeta,
      resMeta: ResponseMeta,
    ) => Promise<Response>,
  ): Service<RequestMeta, ResponseMeta> {
    const { number } = method;
    if (this.methodImpls[number]) {
      throw new Error(
        `Method with the same number already registered (${number})`,
      );
    }
    this.methodImpls[number] = {
      method: method,
      impl: impl,
    } as MethodImpl<unknown, unknown, RequestMeta, ResponseMeta>;
    return this;
  }

  /**
   * Parses the content of a user request and invokes the appropriate method.
   * If you are using ExpressJS as your web application framework, you don't
   * need to call this method, you can simply call the
   * `installServiceOnExpressApp()` top-level function.
   *
   * If the request is a GET request, pass in the decoded query string as the
   * request's body. The query string is the part of the URL after '?', and it
   * can be decoded with DecodeURIComponent.
   *
   * Pass in "keep-unrecognized-fields" if the request cannot come from a
   * malicious user.
   */
  async handleRequest(
    reqBody: string,
    reqMeta: RequestMeta,
    resMeta: ResponseMeta,
    keepUnrecognizedFields?: "keep-unrecognized-fields",
  ): Promise<RawResponse> {
    if (reqBody === "" || reqBody === "list") {
      const json = {
        methods: Object.values(this.methodImpls).map((methodImpl) => ({
          method: methodImpl.method.name,
          number: methodImpl.method.name,
          request: methodImpl.method.requestSerializer.typeDescriptor.asJson(),
          response:
            methodImpl.method.responseSerializer.typeDescriptor.asJson(),
        })),
      };
      const jsonCode = JSON.stringify(json, undefined, "  ");
      return new RawResponse(jsonCode, "ok-json");
    } else if (reqBody === "restudio") {
      return new RawResponse(RESTUDIO_HTML, "ok-html");
    }

    const match = reqBody.match(/^([^:]*):([^:]*):([^:]*):([\S\s]*)$/);
    if (!match) {
      return new RawResponse(
        "bad request: invalid request format",
        "bad-request",
      );
    }
    const methodName = match[1]!;
    const methodNumberStr = match[2]!;
    const format = match[3]!;
    const requestData = match[4]!;

    if (!/-?[0-9]+/.test(methodNumberStr)) {
      return new RawResponse(
        "bad request: can't parse method number",
        "bad-request",
      );
    }
    const methodNumber = parseInt(methodNumberStr);

    const methodImpl = this.methodImpls[methodNumber];
    if (!methodImpl) {
      return new RawResponse(
        `bad request: method not found: ${methodName}; number: ${methodNumber}`,
        "bad-request",
      );
    }

    let req: unknown;
    try {
      req = methodImpl.method.requestSerializer.fromJsonCode(
        requestData,
        keepUnrecognizedFields,
      );
    } catch (e) {
      return new RawResponse(
        `bad request: can't parse JSON: ${e}`,
        "bad-request",
      );
    }

    let res: unknown;
    try {
      res = await methodImpl.impl(req, reqMeta, resMeta);
    } catch (e) {
      return new RawResponse(`server error: ${e}`, "server-error");
    }

    let resJson: string;
    try {
      const flavor = format === "readable" ? "readable" : "dense";
      resJson = methodImpl.method.responseSerializer.toJsonCode(res, flavor);
    } catch (e) {
      return new RawResponse(
        `server error: can't serialize response to JSON: ${e}`,
        "server-error",
      );
    }

    return new RawResponse(resJson, "ok-json");
  }

  private readonly methodImpls: {
    [number: number]: MethodImpl<unknown, unknown, RequestMeta, ResponseMeta>;
  } = {};
}

interface MethodImpl<Request, Response, RequestMeta, ResponseMeta> {
  method: Method<Request, Response>;
  impl: (
    req: Request,
    reqMeta: RequestMeta,
    resMeta: ResponseMeta,
  ) => Promise<Response>;
}

export function installServiceOnExpressApp(
  app: ExpressApp,
  queryPath: string,
  service: Service<ExpressRequest, ExpressResponse>,
  text: typeof ExpressText,
  keepUnrecognizedFields?: "keep-unrecognized-fields",
): void {
  const callback = async (
    req: ExpressRequest,
    res: ExpressResponse,
  ): Promise<void> => {
    let body: string;
    const indexOfQuestionMark = req.originalUrl.indexOf("?");
    if (indexOfQuestionMark >= 0) {
      const queryString = req.originalUrl.substring(indexOfQuestionMark + 1);
      body = decodeURIComponent(queryString);
    } else {
      body = typeof req.body === "string" ? req.body : "";
    }
    const rawResponse = await service.handleRequest(
      body,
      req,
      res,
      keepUnrecognizedFields,
    );
    res
      .status(rawResponse.statusCode)
      .contentType(rawResponse.contentType)
      .send(rawResponse.data);
  };
  app.get(queryPath, callback);
  app.post(queryPath, text(), callback);
}

// =============================================================================
// Module classes initialization
// =============================================================================

interface StructSpec {
  kind: "struct";
  ctor: { new (privateKey: symbol): unknown };
  initFn: (target: unknown, initializer: unknown) => void;
  name: string;
  parentCtor?: { new (): unknown };
  fields: readonly StructFieldSpec[];
  removedNumbers?: readonly number[];
}

interface StructFieldSpec {
  name: string;
  property: string;
  number: number;
  type: TypeSpec;
  mutableGetter?: string;
  indexable?: IndexableSpec;
}

interface IndexableSpec {
  searchMethod: string;
  keyFn: (v: unknown) => unknown;
  keyToHashable?: (v: unknown) => unknown;
}

interface EnumSpec<Enum = unknown> {
  kind: "enum";
  ctor: {
    new (
      privateKey: symbol,
      kind: string,
      value?: unknown,
      unrecognized?: UnrecognizedEnum,
    ): Enum;
  };
  createValueFn?: (initializer: unknown) => unknown;
  name: string;
  parentCtor?: { new (): unknown };
  fields: EnumFieldSpec[];
  removedNumbers?: readonly number[];
}

interface EnumFieldSpec {
  name: string;
  number: number;
  type?: TypeSpec;
}

type TypeSpec =
  | {
      kind: "optional";
      other: TypeSpec;
    }
  | {
      kind: "array";
      item: TypeSpec;
      keyChain?: string;
    }
  | {
      kind: "record";
      ctor: { new (): unknown };
    }
  | {
      kind: "primitive";
      primitive: keyof PrimitiveTypes;
    };

// The UNKNOWN field is common to all enums.
const UNKNOWN_FIELD_SPEC: EnumFieldSpec = {
  name: "?",
  number: 0,
};

export function _initModuleClasses(
  modulePath: string,
  records: ReadonlyArray<StructSpec | EnumSpec>,
): void {
  const privateKey = PRIVATE_KEY;

  // First loop: add a SERIALIZER property to every record class.
  for (const record of records) {
    const clazz = record.ctor as unknown as AnyRecord;
    switch (record.kind) {
      case "struct": {
        const { ctor, initFn } = record;
        // Create the DEFAULT value. It will be initialized in a second loop.
        // To see why we can't initialize it in the first loop, consider this
        // example:
        //   struct Foo { bar: Bar; }
        //   struct Bar { foo: Foo; }
        // The default value for Foo must contain a reference to the default
        // value for Bar, and the default value for Bar also needs to contain
        // a reference to the default value for Foo.
        clazz.DEFAULT = new ctor(privateKey);
        // Expose the mutable class as a static property of the frozen class.
        const mutableCtor = makeMutableClassForRecord(record, clazz.DEFAULT);
        clazz.Mutable = mutableCtor;
        // Define the 'create' static factory function.
        const createFn = (initializer: unknown): unknown => {
          if (initializer instanceof ctor) {
            return initializer;
          }
          const ret = new ctor(privateKey);
          initFn(ret, initializer);
          if ((initializer as AnyRecord)["^"]) {
            (ret as AnyRecord)["^"] = (initializer as AnyRecord)["^"];
          }
          return Object.freeze(ret);
        };
        clazz.create = createFn;
        // Create the SERIALIZER. It will be initialized in a second loop.
        clazz.SERIALIZER = new StructSerializerImpl(
          clazz.DEFAULT,
          createFn as (initializer: AnyRecord) => unknown,
          () => new mutableCtor() as Freezable<unknown>,
        );
        break;
      }
      case "enum": {
        // Create the constants.
        // Prepend the UNKNOWN field to the array of fields specified from the
        // generated code.
        record.fields = [UNKNOWN_FIELD_SPEC].concat(record.fields);
        for (const field of record.fields) {
          if (field.type) {
            continue;
          }
          const property = enumConstantNameToProperty(field.name);
          clazz[property] = new record.ctor(PRIVATE_KEY, field.name);
        }
        // Define the 'create' static factory function.
        const createFn = makeCreateEnumFunction(record);
        clazz.create = createFn;
        // Create the SERIALIZER. It will be initialized in a second loop.
        clazz.SERIALIZER = new EnumSerializerImpl(createFn);
        break;
      }
    }
    // If the record is nested, expose the record class as a static property of
    // the parent class.
    if (record.parentCtor) {
      (record.parentCtor as unknown as AnyRecord)[record.name] = record.ctor;
    }
  }

  // Second loop: initialize the serializer of every record, initialize the
  // default value of every struct, and freeze every class so new properties
  // can't be added to it.
  for (const record of records) {
    const clazz = record.ctor as unknown as AnyRecord;
    const parentTypeDescriptor = (record.parentCtor as unknown as AnyRecord)
      ?.SERIALIZER as StructDescriptor | EnumDescriptor | undefined;
    switch (record.kind) {
      case "struct": {
        // Initializer SERIALIZER.
        const fields = record.fields.map(
          (f) =>
            new StructFieldImpl(
              f.name,
              f.property,
              f.number,
              getSerializerForType(f.type) as InternalSerializer,
            ),
        );
        const serializer = clazz.SERIALIZER as StructSerializerImpl;
        serializer.init(
          record.name,
          modulePath,
          parentTypeDescriptor,
          fields,
          record.removedNumbers ?? [],
        );
        // Initialize DEFAULT.
        const { DEFAULT } = clazz;
        record.initFn(DEFAULT as AnyRecord, {});
        Object.freeze(DEFAULT);
        // Define the mutable getters in the Mutable class.
        const mutableCtor = clazz.Mutable as new (i: unknown) => unknown;
        for (const field of record.fields) {
          if (field.mutableGetter) {
            Object.defineProperty(mutableCtor.prototype, field.mutableGetter, {
              get: makeMutableGetterFn(field),
            });
          }
        }
        // Define the search methods in the frozen class.
        for (const field of record.fields) {
          if (field.indexable) {
            record.ctor.prototype[field.indexable.searchMethod] =
              makeSearchMethod(field);
          }
        }
        // Freeze the frozen class and the mutable class.
        Object.freeze(record.ctor);
        Object.freeze(record.ctor.prototype);
        Object.freeze(clazz.Mutable);
        Object.freeze((clazz.Mutable as AnyRecord).prototype);
        break;
      }
      case "enum": {
        const serializer = clazz.SERIALIZER as EnumSerializerImpl;
        const fields = record.fields.map((f) =>
          f.type
            ? new EnumValueFieldImpl(
                f.name,
                f.number,
                getSerializerForType(f.type) as InternalSerializer,
                serializer.createFn,
              )
            : {
                name: f.name,
                number: f.number,
                constant: clazz[enumConstantNameToProperty(f.name)],
              },
        );
        serializer.init(
          record.name,
          modulePath,
          parentTypeDescriptor,
          fields,
          record.removedNumbers ?? [],
        );
        // Freeze the enum class.
        Object.freeze(record.ctor);
        Object.freeze(record.ctor.prototype);
        break;
      }
    }
  }
}

function enumConstantNameToProperty(name: string): string {
  switch (name) {
    case "?":
      return "UNKNOWN";
    case "SERIALIZER":
      return "SERIALIZER_";
  }
  return name;
}

function makeCreateEnumFunction(
  enumSpec: EnumSpec,
): (initializer: unknown) => unknown {
  const { ctor, createValueFn } = enumSpec;
  const createValue = createValueFn || ((): undefined => undefined);
  const privateKey = PRIVATE_KEY;
  return (initializer: unknown) => {
    if (initializer instanceof ctor) {
      return initializer;
    }
    if (typeof initializer === "string") {
      const maybeResult = (ctor as unknown as AnyRecord)[
        enumConstantNameToProperty(initializer)
      ];
      if (maybeResult instanceof ctor) {
        return maybeResult;
      }
      throw new Error(`Constant not found: ${initializer}`);
    }
    if (initializer instanceof UnrecognizedEnum) {
      return new ctor(privateKey, "?", undefined, initializer);
    }
    const kind = (initializer as { kind: string }).kind;
    if (kind === undefined) {
      throw new Error("Missing entry: kind");
    }
    const value = createValue(initializer);
    if (value === undefined) {
      throw new Error(`Value field not found: ${kind}`);
    }
    return new ctor(privateKey, kind, value);
  };
}

function makeMutableClassForRecord(
  structSpec: StructSpec,
  defaultFrozen: unknown,
): new (initializer?: unknown) => unknown {
  const { ctor: frozenCtor, initFn } = structSpec;
  const frozenClass = frozenCtor as unknown as AnyRecord;
  class Mutable {
    constructor(initializer: unknown = defaultFrozen) {
      initFn(this, initializer);
      if ((initializer as AnyRecord)["^"]) {
        (this as AnyRecord)["^"] = (initializer as AnyRecord)["^"];
      }
      Object.seal(this);
    }

    toFrozen(): unknown {
      return (frozenClass.create as (i: unknown) => unknown)(this);
    }

    toString(): string {
      const serializer = frozenClass.SERIALIZER as Serializer<unknown>;
      return serializer.toJsonCode(this, "readable");
    }
  }
  return Mutable;
}

function getSerializerForType(type: TypeSpec): Serializer<unknown> {
  switch (type.kind) {
    case "array":
      return arraySerializer(getSerializerForType(type.item), type.keyChain);
    case "optional":
      return optionalSerializer(getSerializerForType(type.other));
    case "primitive":
      return primitiveSerializer(type.primitive);
    case "record":
      return (type.ctor as unknown as AnyRecord)
        .SERIALIZER as Serializer<unknown>;
  }
}

// The `mutableArray()` getter of the Mutable class returns `this.array` if and
// only if `mutableArray()` was never called before or if `this.array` is the
// last value returned by `mutableArray()`.
// Otherwise, it makes a mutable copy of `this.array`, assigns it to
// `this.array` and returns it.
const arraysReturnedByMutableGetters = new WeakMap<
  ReadonlyArray<unknown>,
  unknown
>();

function makeMutableGetterFn(field: StructFieldSpec): () => unknown {
  const { property, type } = field;
  switch (type.kind) {
    case "array": {
      class Class {
        static ret(): unknown {
          const value = this[property] as readonly unknown[];
          if (arraysReturnedByMutableGetters.get(value) === this) {
            return value;
          }
          const copy = [...value];
          arraysReturnedByMutableGetters.set(copy, this);
          return (this[property] = copy);
        }

        static [_: string]: unknown;
      }
      return Class.ret;
    }
    case "record": {
      const mutableCtor = (type.ctor as unknown as AnyRecord).Mutable as new (
        i: unknown,
      ) => unknown;
      class Class {
        static ret(): unknown {
          const value = this[property];
          if (value instanceof mutableCtor) {
            return value;
          }
          return (this[property] = new mutableCtor(value));
        }

        static [_: string]: unknown;
      }
      return Class.ret;
    }
    default: {
      throw new Error();
    }
  }
}

function makeSearchMethod(field: StructFieldSpec): (key: unknown) => unknown {
  const { property } = field;
  const indexable = field.indexable!;
  const { keyFn } = indexable;
  const keyToHashable = indexable.keyToHashable ?? ((e: unknown): unknown => e);
  class Class {
    ret(key: unknown): unknown {
      const array = this[property] as ReadonlyArray<unknown>;
      const frozenArrayInfo = frozenArrayRegistry.get(array)!;
      let { keyFnToIndexing } = frozenArrayInfo;
      if (!keyFnToIndexing) {
        frozenArrayInfo.keyFnToIndexing = keyFnToIndexing = //
          new Map<unknown, Map<unknown, unknown>>();
      }
      let hashableToValue = keyFnToIndexing.get(keyFn);
      if (!hashableToValue) {
        // The array has not been indexed yet. Index it.
        hashableToValue = new Map<unknown, unknown>();
        for (const v of array) {
          const hashable = keyToHashable(keyFn(v));
          hashableToValue.set(hashable, v);
        }
        keyFnToIndexing.set(keyFn, hashableToValue);
      }
      return hashableToValue.get(keyToHashable(key));
    }

    [_: string]: unknown;
  }
  return Class.prototype.ret;
}
