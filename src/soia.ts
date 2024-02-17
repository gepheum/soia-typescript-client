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
    input: ArrayBuffer | ByteString,
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
    } else {
      throw new TypeError();
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
   */
  fromJsonCode(code: string): T;
  /**
   * Converts back the given JSON to `T`.
   * Works with both [flavors]{@link JsonFlavor} of JSON.
   */
  fromJson(json: Json): T;
  /** Converts back the given binary form to `T`. */
  fromBytes(bytes: ArrayBuffer): T;
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
): Serializer<ReadonlyArray<Item>> {
  return new ArraySerializerImpl(item as InternalSerializer<Item>);
}

/** Returns a serializer of nullable `T`s. */
export function nullableSerializer<T>(
  other: Serializer<T>,
): Serializer<T | null> {
  return other instanceof NullableSerializerImpl
    ? other
    : new NullableSerializerImpl(other as InternalSerializer<T>);
}

/**
 * Describes the type `T`, where `T` is the TypeScript equivalent of a Soia
 * type. Enables reflective programming.
 *
 * Every `TypeDescriptor` instance has a `kind` field which can take one of
 * these 5 values: `"primitive"`, `"nullable"`, `"array"`, `"struct"`, `"enum"`.
 */
export type TypeDescriptor<T = unknown> =
  | NullableDescriptor<T>
  | ArrayDescriptor<T>
  | StructDescriptor<T>
  | EnumDescriptor<T>
  | PrimitiveDescriptor<T>;

/** Specialization of `TypeDescriptor<T>` when `T` is known. */
export type TypeDescriptorSpecialization<T> = //
  [T] extends [_FrozenBase]
    ? StructDescriptor<T>
    : [T] extends [_EnumBase]
      ? EnumDescriptor<T>
      : TypeDescriptor<T>;

interface TypeDescriptorBase {
  /** Returns a JSON representation of this `TypeDescriptor`. */
  asJson(): Json;

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
export interface PrimitiveDescriptor<T> extends TypeDescriptorBase {
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
 * Describes a nullable type. In a `.soia` file, a nullable type is represented
 * with a question mark at the end of another type.
 */
export interface NullableDescriptor<T> extends TypeDescriptorBase {
  readonly kind: "nullable";
  /** Describes the other (non-nullable) type. */
  readonly otherType: TypeDescriptor<NonNullable<T>>;
}

/** Describes an array type. */
export interface ArrayDescriptor<T> extends TypeDescriptorBase {
  readonly kind: "array";
  /** Describes the type of the array items. */
  readonly itemType: TypeDescriptor<
    T extends ReadonlyArray<infer Item> ? Item : unknown
  >;
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
  readonly removedNumbers: readonly number[];

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
   * Performs a shallow copy of `copyable` if `copyable` is specified.
   */
  newMutable(copyable?: T | MutableForm<T>): MutableForm<T>;
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
      ? Key extends keyof NonNullable<Struct[typeof _COPYABLE]>
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
  /** The fields of the enum in the order they appear in the `.soia` file. */
  readonly fields: ReadonlyArray<EnumField<T>>;
  /** The field numbers marked as removed. */
  readonly removedNumbers: readonly number[];

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

/**
 * Every generated frozen class has a `create` static method which expects a
 * `WholeOrPartial<Struct.Copyable, Accept>` parameter. If `Accept` is
 * `"whole"`, then the compiler requires the object parameter to have a value
 * set for each field of the struct. Otherwise (the default), the compiler
 * accepts any subset of the fields of the struct. Every missing field will be
 * assigned a default value (zero, empty string, etc.) in the returned object.
 *
 * @example
 * console.log(
 *   FullName.create({first: "Jane"}).toString(),
 * );
 * // Output: {
 * //   "first": "Jane",
 * //   "last": ""
 * // }
 *
 * // COMPILE-TIME ERROR
 * // FullName.create<"whole">({first: "Jane"});
 *
 * console.log(
 *   FullName.create<"whole">({first: "Jane", last: "Doe"}).toString(),
 * );
 * // Output: {
 * //   "first": "Jane",
 * //   "last": "Doe"
 * // }
 */
export type WholeOrPartial<
  Copyable,
  Accept extends "partial" | "whole",
> = Accept extends "partial" ? Copyable : Required<Copyable>; //

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
      kind: "nullable";
      other: TypeSignature;
    }
  | {
      kind: "array";
      item: TypeSignature;
    }
  | {
      kind: "record";
      name: string;
      module: string;
    }
  | {
      kind: "primitive";
      primitive: keyof PrimitiveTypes;
    };

/** Definition of a record in the JSON representation of a `TypeDescriptor`. */
type RecordDefinition =
  | {
      kind: "struct";
      name: string;
      module: string;
      fields: ReadonlyArray<{
        name: string;
        type: TypeSignature;
        number: number;
      }>;
      removed?: ReadonlyArray<number>;
    }
  | {
      kind: "enum";
      name: string;
      module: string;
      fields: ReadonlyArray<{
        name: string;
        type?: TypeSignature;
        number: number;
      }>;
      removed?: ReadonlyArray<number>;
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
  constructor(readonly dataView: DataView) {
    this.buffer = dataView.buffer;
  }

  readonly buffer: ArrayBuffer;
  offset = 0;

  readUint8(): number {
    return this.dataView.getUint8(this.offset++);
  }
}

type DecodeNumberFn = (stream: InputStream) => number | bigint;

// For wires [232, 241]
const DECODE_NUMBER_FNS: readonly DecodeNumberFn[] = [
  (s: InputStream) => s.dataView.getUint16((s.offset += 2) - 2, true),
  (s: InputStream) => s.dataView.getUint32((s.offset += 4) - 4, true),
  (s: InputStream) => s.dataView.getBigUint64((s.offset += 8) - 8, true),
  (stream: InputStream) => stream.readUint8() - 256,
  (s: InputStream) => s.dataView.getUint16((s.offset += 2) - 2, true) - 65536,
  (s: InputStream) => s.dataView.getInt32((s.offset += 4) - 4, true),
  (s: InputStream) => s.dataView.getBigInt64((s.offset += 8) - 8, true),
  (s: InputStream) => s.dataView.getBigInt64((s.offset += 8) - 8, true),
  (s: InputStream) => s.dataView.getFloat32((s.offset += 4) - 4, true),
  (s: InputStream) => s.dataView.getFloat64((s.offset += 8) - 8, true),
];

function decodeNumber(stream: InputStream): number | bigint {
  const wire = stream.readUint8();
  return wire < 232 ? wire : DECODE_NUMBER_FNS[wire - 232]!(stream);
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
    let { dataView } = this;
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
    const { dataView } = this;
    const bytesLeftInCurrentBuffer = dataView.buffer.byteLength - this.offset;
    const head = ByteString.sliceOf(bytes, 0, bytesLeftInCurrentBuffer);
    head.copyTo(dataView.buffer, this.offset);
    this.offset += head.byteLength;
    const remainingBytes = bytes.byteLength - head.byteLength;
    if (remainingBytes <= 0) {
      // Everything was written.
      return;
    }
    const tail = ByteString.sliceOf(bytes, remainingBytes);
    tail.copyTo(this.reserve(remainingBytes).buffer, this.offset);
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
    const { dataView } = this;
    if (this.offset < dataView.buffer.byteLength - bytes) {
      // Enough room in the current data view.
      return dataView;
    }
    this.flush();
    const lengthInBytes = Math.max(this.byteLength, bytes);
    this.offset = 0;
    return (this.dataView = new DataView(new ArrayBuffer(lengthInBytes)));
  }

  /** Adds the current buffer to `pieces`. Updates `byteLength` accordingly. */
  private flush(): void {
    const { offset } = this;
    this.pieces.push(new Uint8Array(this.dataView.buffer, 0, offset));
    this.byteLength += offset;
  }

  dataView = new DataView(new ArrayBuffer(128));
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
  } else {
    stream.writeUint32(length);
  }
}

abstract class AbstractSerializer<T> implements InternalSerializer<T> {
  fromJsonCode(code: string): T {
    return this.fromJson(JSON.parse(code));
  }

  fromBytes(bytes: ArrayBuffer): T {
    return this.decode(new InputStream(new DataView(bytes)));
  }

  toJsonCode(input: T, flavor?: JsonFlavor): string {
    const indent = flavor === "readable" ? "  " : undefined;
    return JSON.stringify(this.toJson(input, flavor), undefined, indent);
  }

  toBytes(input: T): BinaryForm {
    const stream = new OutputStream();
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
  abstract fromJson(json: Json): T;
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

/**
 * Returns a `TypeDescriptor` from its JSON representation as returned by
 * `asJson()`.
 */
export function parseTypeDescriptor(json: Json): TypeDescriptor {
  const typeDefinition = json as TypeDefinition;

  type RecordBundle = {
    readonly definition: RecordDefinition;
    readonly defaultValue: Json;
    readonly serializer: StructSerializerImpl<Json> | EnumSerializerImpl<Json>;
  };
  const recordBundles: { [k: string]: RecordBundle } = {};

  // First loop: create the serializer for each record.
  // It's not yet initialized.
  for (const record of typeDefinition.records) {
    const recordKey = `${record.module}:${record.name}`;
    let defaultValue: Json;
    let serializer: StructSerializerImpl<Json> | EnumSerializerImpl<Json>;
    switch (record.kind) {
      case "struct":
        defaultValue = {};
        serializer = new StructSerializerImpl<Json>(
          defaultValue,
          (copyable: AnyRecord) => Object.freeze({ ...copyable }) as Json,
          (() => ({})) as NewMutableFn<Json>,
        );
        break;
      case "enum":
        defaultValue = "?";
        serializer = new EnumSerializerImpl<Json>(
          defaultValue,
          (name: string, value: unknown) =>
            value !== undefined
              ? Object.freeze({ kind: name, value: value as Json })
              : name,
        );
        break;
    }
    const recordBundle: RecordBundle = {
      definition: record,
      defaultValue: defaultValue,
      serializer: serializer,
    };
    recordBundles[recordKey] = recordBundle;
  }

  function parse(ts: TypeSignature): InternalSerializer {
    switch (ts.kind) {
      case "array":
        return new ArraySerializerImpl(parse(ts.item));
      case "nullable":
        return new NullableSerializerImpl(parse(ts.other));
      case "primitive":
        return primitiveSerializer(ts.primitive) as InternalSerializer;
      case "record":
        const recordKey = `${ts.module}:${ts.name}`;
        return recordBundles[recordKey]!.serializer;
    }
  }

  // Second loop: initialize each serializer.
  for (const recordBundle of Object.values(recordBundles)) {
    const { definition, defaultValue, serializer } = recordBundle;
    const { module, removed } = definition;
    const qualifiedName = definition.name;
    const nameParts = qualifiedName.split(".");
    const name = nameParts[nameParts.length - 1]!;
    const parentType =
      recordBundles[nameParts.slice(0, -1).join(".")]?.serializer;
    switch (definition.kind) {
      case "struct":
        const fields: Array<[string, string, number, InternalSerializer]> = [];
        for (const f of definition.fields) {
          const fieldSerializer = parse(f.type);
          fields.push([f.name, f.name, f.number, fieldSerializer]);
          (defaultValue as AnyRecord)[f.name] = fieldSerializer.defaultValue;
        }
        (serializer as StructSerializerImpl<Json>).init(
          name,
          qualifiedName,
          module,
          parentType,
          fields,
          removed || [],
        );
        Object.freeze(defaultValue);
        break;
      case "enum":
        (serializer as EnumSerializerImpl<Json>).init(
          name,
          qualifiedName,
          module,
          parentType,
          definition.fields.map((f) => [
            f.name,
            f.number,
            f.type ? parse(f.type) : f.name,
          ]),
          removed || [],
        );
        break;
    }
  }

  return parse(typeDefinition.type).typeDescriptor;
}

abstract class AbstractPrimitiveSerializer<P extends keyof PrimitiveTypes>
  extends AbstractSerializer<PrimitiveTypes[P]>
  implements PrimitiveDescriptor<PrimitiveTypes[P]>
{
  readonly kind = "primitive";

  get typeSignature(): TypeSignature {
    return {
      kind: "primitive",
      primitive: this.primitive,
    };
  }

  addRecordDefinitionsTo(out: { [k: string]: RecordDefinition }) {}

  abstract readonly primitive: P;
}

class BoolSerializer extends AbstractPrimitiveSerializer<"bool"> {
  readonly primitive = "bool";
  readonly defaultValue = false;

  toJson(input: boolean): boolean {
    return !!input;
  }

  fromJson(json: Json): boolean {
    return !!json;
  }

  encode(input: boolean, stream: OutputStream): void {
    stream.writeUint8(input ? 1 : 0);
  }

  decode(stream: InputStream): boolean {
    return !!stream.readUint8();
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
        stream.writeInt32(input);
      }
    } else if (input < 232) {
      stream.writeUint8(input);
    } else if (input < 65536) {
      stream.writeUint8(232);
      stream.writeUint16(input);
    } else {
      stream.writeUint8(233);
      stream.writeInt32(input);
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
    return BigInt(json as string | number);
  }
}

const MIN_INT64 = BigInt("-9223372036854775808");
const MAX_INT64 = BigInt("9223372036854775807");

class Int64Serializer extends AbstractBigIntSerializer<"int64"> {
  readonly primitive = "int64";

  toJson(input: bigint): string {
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
    return BigInt(decodeNumber(stream));
  }
}

const MAX_UINT64 = BigInt("18446744073709551615");

class Uint64Serializer extends AbstractBigIntSerializer<"uint64"> {
  readonly primitive = "uint64";

  toJson(input: bigint): string {
    input = BigInt(input);
    return input <= 0
      ? "0"
      : MAX_UINT64 < input
        ? MAX_UINT64.toString()
        : input.toString();
  }

  encode(input: bigint, stream: OutputStream): void {
    if (input <= 0) {
      stream.writeUint8(0);
    } else {
      // Don't optimize for small numbers.
      stream.writeUint8(234);
      stream.writeUint64(input < MAX_UINT64 ? input : MAX_UINT64);
    }
  }

  decode(stream: InputStream): bigint {
    return BigInt(decodeNumber(stream));
  }
}

class TimestampSerializer extends AbstractPrimitiveSerializer<"timestamp"> {
  readonly primitive = "timestamp";
  readonly defaultValue = Timestamp.UNIX_EPOCH;

  toJson(input: Timestamp, flavor?: JsonFlavor): string | number {
    return flavor === "readable"
      ? input.toDate().toISOString()
      : input.unixMillis;
  }

  fromJson(json: Json): Timestamp {
    return typeof json === "number"
      ? // A numeric timestamp.
        Timestamp.fromUnixMillis(json)
      : // An ISO date.
        Timestamp.from(new Date(Date.parse(json as string)));
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
    return Timestamp.fromUnixMillis(Number(BigInt(unixMillis)));
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

  toJson(input: ByteString): string {
    return input.toBase64();
  }

  fromJson(json: Json): ByteString {
    return json === 0
      ? ByteString.EMPTY
      : ByteString.fromBase64(json as string);
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

class StructFieldImpl<Struct, Value = unknown>
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

type EnumFieldImpl<Enum> =
  | EnumConstantFieldImpl<Enum>
  | EnumValueFieldImpl<Enum, unknown>;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

class ArraySerializerImpl<Item>
  extends AbstractSerializer<readonly Item[]>
  implements ArrayDescriptor<readonly Item[]>
{
  constructor(readonly itemSerializer: InternalSerializer<Item>) {
    super();
  }

  readonly kind = "array";
  readonly defaultValue = _EMPTY_ARRAY;

  toJson(input: ReadonlyArray<Item>, flavor?: JsonFlavor): Json[] {
    return input.map((e) => this.itemSerializer.toJson(e, flavor));
  }

  fromJson(json: Json): ReadonlyArray<Item> {
    if (json === 0) {
      return _EMPTY_ARRAY;
    }
    return freezeArray(
      (json as readonly Json[]).map((e) => this.itemSerializer.fromJson(e)),
    );
  }

  encode(input: ReadonlyArray<Item>, stream: OutputStream): void {
    const { length } = input;
    if (length <= 2) {
      stream.writeUint8(246 + length);
    } else {
      stream.writeUint8(249);
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
    const length = wire === 249 ? (decodeNumber(stream) as number) : wire - 246;
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
      item: this.itemSerializer.typeSignature,
    };
  }

  addRecordDefinitionsTo(out: { [k: string]: RecordDefinition }) {
    this.itemSerializer.addRecordDefinitionsTo(out);
  }
}

class NullableSerializerImpl<Other>
  extends AbstractSerializer<Other | null>
  implements NullableDescriptor<Other | null>
{
  constructor(readonly otherSerializer: InternalSerializer<Other>) {
    super();
  }

  readonly kind = "nullable";
  readonly defaultValue = null;

  toJson(input: Other, flavor?: JsonFlavor): Json {
    return input !== null ? this.otherSerializer.toJson(input, flavor) : null;
  }

  fromJson(json: Json): Other | null {
    return json !== null ? this.otherSerializer.fromJson(json) : null;
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
      //
      NonNullable<Other>
    >;
  }

  get typeSignature(): TypeSignature {
    return {
      kind: "nullable",
      other: this.otherSerializer.typeSignature,
    };
  }

  addRecordDefinitionsTo(out: { [k: string]: RecordDefinition }) {
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
  copyable?: Frozen | MutableForm<Frozen>,
) => MutableForm<Frozen>;

function decodeUnused(stream: InputStream): void {
  const wire = stream.readUint8();
  if (wire < 232) {
    return;
  }
  switch (wire - 232) {
    case 0:
    case 4:
      stream.offset += 2;
      break;
    case 1:
    case 5:
    case 8:
      stream.offset += 4;
      break;
    case 2:
    case 6:
    case 7:
    case 9:
      stream.offset += 8;
      break;
    case 3:
      ++stream.offset;
      break;
    case 11:
    case 13:
      stream.offset += decodeNumber(stream) as number;
      break;
    case 15:
    case 18:
    case 19:
    case 20:
    case 21:
    case 22:
      decodeUnused(stream);
      break;
    case 16:
      decodeUnused(stream);
      decodeUnused(stream);
      break;
    case 17: {
      const length = decodeNumber(stream);
      for (let i = 0; i < length; ++i) {
        decodeUnused(stream);
      }
      break;
    }
  }
}

class StructSerializerImpl<T>
  extends AbstractSerializer<T>
  implements StructDescriptor<T>
{
  static create<T>(frozenClass: AnyRecord): StructSerializerImpl<T> {
    const mutableCtor = frozenClass.Mutable as new (
      copyable?: T | MutableForm<T>,
    ) => MutableForm<T>;
    return new StructSerializerImpl(
      frozenClass.DEFAULT as T,
      frozenClass.create as (copyable: AnyRecord) => T,
      () => new mutableCtor(),
    );
  }

  constructor(
    readonly defaultValue: T,
    readonly createFn: (copyable: AnyRecord) => T,
    readonly newMutableFn: NewMutableFn<T>,
  ) {
    super();
  }

  readonly kind = "struct";
  name = "";
  qualifiedName = "";
  modulePath = "";
  parentType: StructDescriptor | EnumDescriptor | undefined;
  // Fields in the order they appear in the `.soia` file.
  readonly fields: Array<StructFieldImpl<T>> = [];
  readonly fieldMapping: { [key: string | number]: StructFieldImpl<T> } = {};
  removedNumbers: readonly number[] = [];
  // Fields sorted by number in descending order.
  private reversedFields: Array<StructFieldImpl<T>> = [];
  // The `undefined` slots correspond to removed fields.
  private readonly slots: Array<StructFieldImpl<T> | undefined> = [];
  private readonly copyableTemplate: Record<string, unknown> = {};
  initialized?: true;

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

      const arrayLength = this.getArrayLength(input);

      const result: Json[] = [];
      for (let i = 0; i < arrayLength; ++i) {
        const field = slots[i];
        result[i] = field
          ? field.serializer.toJson(
              (input as AnyRecord)[field.property],
              flavor,
            )
          : 0;
      }
      return result;
    }
  }

  fromJson(json: Json): T {
    if (!json) {
      return this.defaultValue;
    }
    const copyable = { ...this.copyableTemplate };
    if (json instanceof Array) {
      const { slots } = this;
      for (let i = 0; i < json.length && i < slots.length; ++i) {
        const field = slots[i];
        if (field) {
          copyable[field.property] = field.serializer.fromJson(json[i]!);
        }
        // Else the field was removed.
      }
      return this.createFn(copyable);
    } else if (json instanceof Object) {
      // A readable object.
      const { fieldMapping } = this;
      for (const name in json) {
        const field = fieldMapping[name];
        if (field) {
          copyable[field.property] = field.serializer.fromJson(json[name]!);
        }
      }
      return this.createFn(copyable);
    }
    throw TypeError();
  }

  encode(input: T, stream: OutputStream): void {
    const { slots } = this;
    const arrayLength = this.getArrayLength(input);
    if (arrayLength <= 2) {
      stream.writeUint8(246 + arrayLength);
    } else {
      encodeUint32(arrayLength, stream);
    }
    for (let i = 0; i < arrayLength; ++i) {
      const field = slots[i];
      if (field) {
        field.serializer.encode((input as AnyRecord)[field.property], stream);
      } else {
        // Append '0' if the field was removed.
        stream.writeUint8(0);
      }
    }
  }

  decode(stream: InputStream): T {
    const wire = stream.readUint8();
    if (wire === 0 || wire === 246) {
      return this.defaultValue;
    }
    const length = wire === 249 ? (decodeNumber(stream) as number) : wire - 246;
    const copyable = { ...this.copyableTemplate };
    const { slots } = this;
    for (let i = 0; i < length && i < slots.length; ++i) {
      const field = slots[i];
      if (field) {
        copyable[field.property] = field.serializer.decode(stream);
      } else {
        // The field was removed.
        decodeUnused(stream);
      }
    }
    return this.createFn(copyable);
  }

  /** Returns the length of the JSON array for the given input. */
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
    for (const field of this.fields) {
      if (!field.serializer.isDefault((input as AnyRecord)[field.property])) {
        return false;
      }
    }
    return true;
  }

  get typeSignature(): TypeSignature {
    return {
      kind: "record",
      name: this.qualifiedName,
      module: this.modulePath,
    };
  }

  addRecordDefinitionsTo(out: { [k: string]: RecordDefinition }): void {
    const recordKey = `${this.modulePath}:${this.qualifiedName}`;
    if (out[recordKey]) {
      return;
    }
    const structDefinition: RecordDefinition = {
      kind: "struct",
      name: this.qualifiedName,
      module: this.modulePath,
      fields: this.fields.map((f) => ({
        name: f.name,
        type: f.serializer.typeSignature,
        number: f.number,
      })),
    };
    if (this.removedNumbers.length) {
      structDefinition.removed = this.removedNumbers;
    }
    out[recordKey] = structDefinition;
    for (const f of this.fields) {
      f.serializer.addRecordDefinitionsTo(out);
    }
  }

  getField<K extends string | number>(key: K): StructFieldResult<T, K> {
    return this.fieldMapping[key]!;
  }

  newMutable(copyable?: T | MutableForm<T>): MutableForm<T> {
    return this.newMutableFn(copyable);
  }

  init(
    name: string,
    qualifiedName: string,
    modulePath: string,
    parentType: StructDescriptor | EnumDescriptor | undefined,
    fields: ReadonlyArray<[string, string, number, Serializer<unknown>]>,
    removedNumbers: readonly number[],
  ) {
    this.name = name;
    this.qualifiedName = qualifiedName;
    this.modulePath = modulePath;
    this.parentType = parentType;
    for (const f of fields) {
      const serializer = f[3] as InternalSerializer;
      const field = new StructFieldImpl<T>(f[0], f[1], f[2], serializer);
      this.fields.push(field);
      this.slots[field.number] = field;
      this.fieldMapping[field.name] = field;
      this.fieldMapping[field.property] = field;
      this.fieldMapping[field.number] = field;
      this.copyableTemplate[field.property] = (this.defaultValue as AnyRecord)[
        field.property
      ];
    }
    this.reversedFields = [...this.fields].sort((a, b) => b.number - a.number);
    this.removedNumbers = removedNumbers;
    this.initialized = true;
    freezeDeeply(this);
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
    private createFn: (k: string, v: unknown) => Enum,
  ) {
    this.wrappedDefault = createFn(name, serializer.defaultValue);
  }

  readonly wrappedDefault: Enum;

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
    return this.createFn(this.name, value) as Enum;
  }
}

class EnumSerializerImpl<T>
  extends AbstractSerializer<T>
  implements EnumDescriptor<T>
{
  static create<T>(enumClass: AnyRecord): EnumSerializerImpl<T> {
    return new EnumSerializerImpl<T>(
      enumClass["?"] as T,
      enumClass.create as (k: string, v: unknown) => T,
    );
  }

  constructor(
    readonly defaultValue: T,
    private readonly createFn?: (k: string, v: unknown) => T,
  ) {
    super();
  }

  readonly kind = "enum";
  name = "";
  qualifiedName = "";
  modulePath = "";
  parentType: StructDescriptor | EnumDescriptor | undefined;
  readonly fields: EnumFieldImpl<T>[] = [];
  readonly removedNumbers: number[] = [];
  private readonly fieldMapping: { [key: string | number]: EnumFieldImpl<T> } =
    {};
  initialized?: true;

  toJson(input: T, flavor?: JsonFlavor): Json {
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

  fromJson(json: Json): T {
    const isNumber = typeof json === "number";
    if (isNumber || typeof json === "string") {
      const field = this.fieldMapping[isNumber ? json : String(json)];
      if (!field) {
        // Unrecognized field.
        return this.defaultValue;
      }
      if (field.serializer) {
        return field.wrappedDefault;
      } else {
        return field.constant;
      }
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
      // Unknown field.
      return this.defaultValue;
    }
    const { serializer } = field;
    if (!serializer) {
      return field.constant;
    }
    return field.wrap(serializer.fromJson(valueAsJson));
  }

  encode(input: T, stream: OutputStream): void {
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
    const wire = stream.dataView.getUint8(stream.offset);
    if (wire < 242) {
      // A number
      const number = decodeNumber(stream) as number;
      const field = this.fieldMapping[number];
      if (!field) {
        // Unknown field.
        return this.defaultValue;
      }
      if (field.serializer) {
        return field.wrap(field.serializer.defaultValue);
      } else {
        return field.constant;
      }
    } else {
      ++stream.offset;
      const number =
        wire === 248 ? (decodeNumber(stream) as number) : wire - 250;
      const field = this.fieldMapping[number];
      if (!field) {
        // Unknown field.
        return this.defaultValue;
      }
      if (field.serializer) {
        return field.wrap(field.serializer.decode(stream));
      } else {
        return field.constant;
      }
    }
  }

  get typeSignature(): TypeSignature {
    return {
      kind: "record",
      name: this.qualifiedName,
      module: this.modulePath,
    };
  }

  addRecordDefinitionsTo(out: { [k: string]: RecordDefinition }): void {
    const recordKey = `${this.modulePath}:${this.qualifiedName}`;
    if (out[recordKey]) {
      return;
    }
    const enumDefinition: RecordDefinition = {
      kind: "enum",
      name: this.qualifiedName,
      module: this.modulePath,
      fields: this.fields.map((f) => {
        const result = {
          name: f.name,
          number: f.number,
        };
        const type = f?.serializer?.typeSignature;
        return type ? { ...result, type: type } : result;
      }),
    };
    if (this.removedNumbers.length) {
      enumDefinition.removed = this.removedNumbers;
    }
    out[recordKey] = enumDefinition;
    for (const f of this.fields) {
      if (f.serializer) {
        f.serializer.addRecordDefinitionsTo(out);
      }
    }
  }

  isDefault(input: T): boolean {
    return input === this.defaultValue;
  }

  getField<K extends string | number>(key: K): EnumFieldResult<T, K> {
    return this.fieldMapping[key]!;
  }

  init(
    name: string,
    qualifiedName: string,
    modulePath: string,
    parentType: StructDescriptor | EnumDescriptor | undefined,
    fields: ReadonlyArray<[string, number, T | Serializer<unknown>]>,
    removedNumbers: readonly number[],
  ) {
    this.name = name;
    this.qualifiedName = qualifiedName;
    this.modulePath = modulePath;
    this.parentType = parentType;
    for (const f of fields) {
      let field: EnumFieldImpl<T>;
      const constantOrSerializer = f[2];
      if (constantOrSerializer instanceof _EnumBase) {
        field = {
          name: f[0],
          number: f[1],
          constant: constantOrSerializer as T,
        };
      } else {
        const serializer = constantOrSerializer as InternalSerializer<T>;
        field = new EnumValueFieldImpl(f[0], f[1], serializer, this.createFn!);
      }
      this.fields.push(field);
      this.fieldMapping[field.name] = field;
      this.fieldMapping[field.number] = field;
    }
    this.removedNumbers.push(...removedNumbers);
    this.initialized = true;
    freezeDeeply(this);
  }
}

function freezeDeeply(o: unknown): void {
  if (!(o instanceof Object)) {
    return;
  }
  if (
    (o instanceof StructSerializerImpl || o instanceof EnumSerializerImpl) &&
    !o.initialized
  ) {
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

// We add the DEEPLY_FROZEN property to arrays which we know only contain frozen
// items. This allows us to avoid making copies in some cases.
const DEEPLY_FROZEN: unique symbol = Symbol();

// We add the MUTABLE property to arrays which were created within the
// implementation of a mutableX getter.
const MUTABLE: unique symbol = Symbol();

interface MaybeDeeplyFrozen {
  [DEEPLY_FROZEN]?: true;
}

interface MaybeMutable {
  [MUTABLE]?: true;
}

const ARRAY_PROPERTY: Readonly<PropertyDescriptor> = {
  value: true,
  writable: false,
};

function freezeArray<T>(array: readonly T[]): readonly T[] {
  return Object.freeze(
    Object.defineProperty(array, DEEPLY_FROZEN, ARRAY_PROPERTY),
  );
}

// =============================================================================
// Internal functions classes used by generated code
// =============================================================================

export declare const _COPYABLE: unique symbol;

export abstract class _FrozenBase {
  toMutable(): unknown {
    return new (Object.getPrototypeOf(this).constructor.Mutable)(this);
  }

  toFrozen(): this {
    return this;
  }

  toString(): string {
    return toStringImpl(this);
  }

  declare [_COPYABLE]: unknown;
}

export abstract class _MutableBase {
  toMutable(): this {
    return this;
  }

  toString(): string {
    const frozen = new (Object.getPrototypeOf(this).constructor)().toFrozen();
    const serializer = Object.getPrototypeOf(frozen).constructor
      .SERIALIZER as InternalSerializer<_FrozenBase>;
    return serializer.toJsonCode(
      this as unknown as Freezable<_FrozenBase>,
      "readable",
    );
  }
}

export abstract class _EnumBase {
  abstract readonly kind: string;

  protected as(kind: string): unknown {
    if ((this as AnyRecord).kind !== kind) {
      return undefined;
    }
    return (this as AnyRecord).value;
  }

  switch<T>(switcher: unknown): unknown {
    const callback =
      (switcher as AnyRecord)[(this as AnyRecord).kind as string] ||
      (switcher as AnyRecord)["*"];
    const { value } = this as AnyRecord;
    if (value !== undefined) {
      return (callback as (v: unknown) => T)(value);
    }
    return (callback as () => T)();
  }

  toString(): string {
    return toStringImpl(this);
  }
}

function toStringImpl<T>(value: T): string {
  const serializer = Object.getPrototypeOf(value).constructor
    .SERIALIZER as InternalSerializer<T>;
  return serializer.toJsonCode(value, "readable");
}

export const _EMPTY_ARRAY = freezeArray([]);

export function _identity<T>(arg: T): T {
  return arg;
}

export function _toFrozenArray<T, Copyable>(
  copyables: readonly Copyable[],
  itemToFrozenFn: (item: Copyable) => T,
): readonly T[] {
  if ((copyables as MaybeDeeplyFrozen)[DEEPLY_FROZEN]) {
    return copyables as unknown as readonly T[];
  }
  if (!copyables.length) {
    return _EMPTY_ARRAY;
  }
  return freezeArray(
    itemToFrozenFn === _identity
      ? (copyables.slice() as unknown as readonly T[])
      : copyables.map(itemToFrozenFn),
  );
}

export function _toFrozenOrMutableArray<T, Copyable>(
  copyables: readonly Copyable[],
  itemToFrozenFn?: (item: Copyable) => T,
): T[] {
  if ((copyables as MaybeDeeplyFrozen)[DEEPLY_FROZEN]) {
    return copyables as unknown as T[];
  }
  return itemToFrozenFn === _identity
    ? copyables.map(itemToFrozenFn)
    : (copyables.slice() as unknown as T[]);
}

export function _toMutableArray<T>(arg: readonly T[]): T[] {
  if ((arg as MaybeMutable)[MUTABLE]) {
    // Safe to cast the array.
    return arg as T[];
  }
  // Make a copy of the array, and add the MUTABLE property to the copy.
  return Object.defineProperty(arg.slice(), MUTABLE, ARRAY_PROPERTY);
}

export function _newStructSerializer<T extends _FrozenBase>(
  defaultValue: T,
): Serializer<T> {
  const clazz: AnyRecord = Object.getPrototypeOf(defaultValue).constructor;
  return StructSerializerImpl.create<T>(clazz);
}

export function _newEnumSerializer<T extends _EnumBase>(
  defaultValue: T,
): Serializer<T> {
  const clazz: AnyRecord = Object.getPrototypeOf(defaultValue).constructor;
  return EnumSerializerImpl.create<T>(clazz);
}

export function _initStructSerializer<T extends _FrozenBase>(
  serializer: Serializer<T>,
  name: string,
  qualifiedName: string,
  modulePath: string,
  parentType: StructDescriptor | EnumDescriptor | undefined,
  fields: ReadonlyArray<[string, string, number, Serializer<unknown>]>,
  removedNumbers: readonly number[],
) {
  (serializer as StructSerializerImpl<T>).init(
    name,
    qualifiedName,
    modulePath,
    parentType,
    fields,
    removedNumbers,
  );
}

export function _initEnumSerializer<T extends _EnumBase>(
  serializer: Serializer<T>,
  name: string,
  qualifiedName: string,
  modulePath: string,
  parentType: StructDescriptor | EnumDescriptor | undefined,
  fields: ReadonlyArray<[string, number, T | Serializer<unknown>]>,
  removedNumbers: readonly number[],
) {
  (serializer as EnumSerializerImpl<T>).init(
    name,
    qualifiedName,
    modulePath,
    parentType,
    fields,
    removedNumbers,
  );
}
