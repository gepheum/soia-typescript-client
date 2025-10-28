import { expect } from "buckwheat";
import { describe, it } from "mocha";
import { SerializerTester } from "./serializer_tester.js";
import * as soia from "./soia.js";

describe("Timestamp", () => {
  it("#MIN is min timestamp rerpresentable as Date objects", () => {
    expect(new Date(soia.Timestamp.MIN.unixMillis).getTime()).toBe(
      -8640000000000000,
    );
    expect(new Date(soia.Timestamp.MIN.unixMillis - 1).getTime()).toBe(
      Number.NaN,
    );
  });

  it("#MAX is max timestamp rerpresentable as Date objects", () => {
    expect(new Date(soia.Timestamp.MAX.unixMillis).getTime()).toBe(
      8640000000000000,
    );
    expect(new Date(soia.Timestamp.MAX.unixMillis + 1).getTime()).toBe(
      Number.NaN,
    );
  });

  describe("#fromUnixMillis()", () => {
    it("works", () => {
      expect(soia.Timestamp.fromUnixMillis(3000).unixMillis).toBe(3000);
      expect(soia.Timestamp.fromUnixMillis(3001).unixSeconds).toBe(3.001);
    });
    it("clamp timestamps outside of valid range", () => {
      expect(
        soia.Timestamp.fromUnixMillis(soia.Timestamp.MAX.unixMillis + 1)
          .unixMillis,
      ).toBe(soia.Timestamp.MAX.unixMillis);
    });
    it("truncates to millisecond precision", () => {
      expect(soia.Timestamp.fromUnixMillis(2.8).unixMillis).toBe(3);
    });
  });

  describe("#fromUnixSeconds()", () => {
    it("works", () => {
      expect(soia.Timestamp.fromUnixSeconds(3).unixMillis).toBe(3000);
      expect(soia.Timestamp.fromUnixSeconds(3).unixSeconds).toBe(3);
    });
    it("truncates to millisecond precision", () => {
      expect(soia.Timestamp.fromUnixSeconds(2.0061).unixSeconds).toBe(2.006);
    });
  });

  describe("#toDate()", () => {
    it("works", () => {
      expect(
        soia.Timestamp.fromUnixMillis(1694467279837).toDate().getTime(),
      ).toBe(1694467279837);
    });
  });

  describe("#now()", () => {
    it("works", () => {
      const now = soia.Timestamp.now();
      expect(now.toDate().getFullYear()).toCompare(">=", 2023);
      expect(now.toDate().getFullYear()).toCompare(
        "<=",
        new Date().getFullYear() + 1,
      );
    });
  });

  describe("#toString()", () => {
    it("works", () => {
      const timestamp = soia.Timestamp.fromUnixMillis(1694467279837);
      expect(timestamp.toString()).toBe("2023-09-11T21:21:19.837Z");
    });
  });

  describe("#parse()", () => {
    it("works", () => {
      const timestamp = soia.Timestamp.fromUnixMillis(1694467279837);
      const parseResult = soia.Timestamp.parse(timestamp.toString());
      expect(parseResult.unixMillis).toBe(timestamp.unixMillis);
    });
  });
});

describe("timestamp serializer", () => {
  const serializer = soia.primitiveSerializer("timestamp");
  const tester = new SerializerTester(serializer);

  it("#typeDescriptor", () => {
    expect(serializer.typeDescriptor).toMatch({
      kind: "primitive",
      primitive: "timestamp",
    });
  });

  it("TypeDescriptor#asJson()", () => {
    expect(serializer.typeDescriptor.asJson()).toMatch({
      type: {
        kind: "primitive",
        value: "timestamp",
      },
      records: [],
    });
    tester.reserializeTypeAdapterAndAssertNoLoss();
  });

  it("can deserialize any number", () => {
    expect(serializer.fromJson("888888888888").unixMillis).toBe(888888888888);
  });

  tester.reserializeAndAssert(
    soia.Timestamp.UNIX_EPOCH,
    {
      denseJson: 0,
      readableJson: {
        unix_millis: 0,
        formatted: "1970-01-01T00:00:00.000Z",
      },
      bytesAsBase16: "00",
    },
    "reserialize Unix EPOCH",
  );

  tester.reserializeAndAssert(
    soia.Timestamp.fromUnixMillis(1692999034586),
    {
      denseJson: 1692999034586,
      readableJson: {
        unix_millis: 1692999034586,
        formatted: "2023-08-25T21:30:34.586Z",
      },
      bytesAsBase16: "efda269b2e8a010000",
    },
    "reserialize normal timestamp",
  );

  tester.reserializeAndAssert(
    soia.Timestamp.fromUnixMillis(-1692999034586),
    {
      denseJson: -1692999034586,
      readableJson: {
        unix_millis: -1692999034586,
        formatted: "1916-05-09T02:29:25.414Z",
      },
      bytesAsBase16: "ef26d964d175feffff",
    },
    "reserialize negative timestamp",
  );

  it("default JSON flavor is dense", () => {
    expect(serializer.toJson(soia.Timestamp.UNIX_EPOCH)).toBe(0);
  });
});

describe("ByteString", () => {
  const makeTestByteArray = (length = 4, start = 0): Uint8Array => {
    const array: number[] = [];
    for (let i = 0; i < length; ++i) {
      array[i] = start + i;
    }
    return new Uint8Array(array);
  };

  const makeTestByteString = (length = 4, start = 0): soia.ByteString => {
    return soia.ByteString.sliceOf(makeTestByteArray(length, start).buffer);
  };

  const makeSlicedTestByteString = (length = 4): soia.ByteString => {
    const superByteString = makeTestByteString(length + 2, -1);
    return soia.ByteString.sliceOf(superByteString, 1, length + 1);
  };

  const toArray = (byteString: soia.ByteString): number[] => {
    return Array.from(new Uint8Array(byteString.toBuffer()));
  };

  describe("#EMPTY", () => {
    it("works", () => {
      expect(soia.ByteString.EMPTY.byteLength).toBe(0);
      expect(soia.ByteString.EMPTY.toBuffer().byteLength).toBe(0);
    });
  });

  describe("#sliceOf", () => {
    it("works when no start/end is specified", () => {
      let byteString = makeTestByteString();
      byteString = soia.ByteString.sliceOf(byteString);
      expect(byteString.byteLength).toBe(4);
      expect(toArray(byteString)).toMatch([0, 1, 2, 3]);
    });

    it("works when only start is specified", () => {
      let byteString = makeTestByteString();
      byteString = soia.ByteString.sliceOf(byteString, 1);
      expect(byteString.byteLength).toBe(3);
      expect(toArray(byteString)).toMatch([1, 2, 3]);
    });

    it("works when both start/end are specified", () => {
      let byteString = makeTestByteString();
      byteString = soia.ByteString.sliceOf(byteString, 1, 3);
      expect(byteString.byteLength).toBe(2);
      expect(toArray(byteString)).toMatch([1, 2]);
    });

    it("copies ArrayBuffer slice", () => {
      const byteString = makeTestByteString();
      expect(byteString.byteLength).toBe(4);
      expect(toArray(byteString)).toMatch([0, 1, 2, 3]);
    });

    it("returns empty when start === end", () => {
      const byteString = makeTestByteString();
      expect(soia.ByteString.sliceOf(byteString, 3, 3)).toBe(
        soia.ByteString.EMPTY,
      );
    });

    it("returns empty when start > end", () => {
      const byteString = makeTestByteString();
      expect(soia.ByteString.sliceOf(byteString, 3, 0)).toBe(
        soia.ByteString.EMPTY,
      );
    });

    it("doesn't copy ByteString if it doesn't need to", () => {
      const byteString = makeTestByteString();
      expect(soia.ByteString.sliceOf(byteString, 0, 4)).toBe(byteString);
    });

    it("start can be < 0", () => {
      const byteString = makeTestByteString();
      expect(soia.ByteString.sliceOf(byteString, -1, 4)).toBe(byteString);
    });

    it("end can be > byteLength", () => {
      const byteString = makeTestByteString();
      expect(soia.ByteString.sliceOf(byteString, 0, 5)).toBe(byteString);
    });

    it("copies bytes in the ArrayBuffer", () => {
      const array = makeTestByteArray();
      const byteString = soia.ByteString.sliceOf(array.buffer);
      array[3] = 4;
      expect(toArray(byteString)).toMatch([0, 1, 2, 3]);
    });

    it("works with SharedArrayBuffer", () => {
      const sharedBuffer = new SharedArrayBuffer(4);
      const view = new Uint8Array(sharedBuffer);
      view[0] = 10;
      view[1] = 20;
      view[2] = 30;
      view[3] = 40;
      const byteString = soia.ByteString.sliceOf(sharedBuffer);
      expect(byteString.byteLength).toBe(4);
      expect(toArray(byteString)).toMatch([10, 20, 30, 40]);
    });
  });

  for (const sliced of [false, true]) {
    const description = sliced ? "on sliced instance" : "on normal instance";
    const byteString = //
      sliced ? makeSlicedTestByteString(20) : makeTestByteString(20);
    describe(description, () => {
      describe("#byteLength", () => {
        it("works", () => {
          expect(byteString.byteLength).toBe(20);
        });
      });

      describe("#toBuffer", () => {
        it("works", () => {
          const buffer = byteString.toBuffer();
          expect(buffer.byteLength).toBe(20);
          expect(new Uint8Array(buffer)[2]).toBe(2);
        });
      });

      describe("#copyTo", () => {
        it("works", () => {
          const buffer = new ArrayBuffer(22);
          byteString.copyTo(buffer, 1);
          const array = new Uint8Array(buffer);
          expect(array[5]).toBe(4);
        });
      });

      describe("#at()", () => {
        it("works with normal index", () => {
          expect(byteString.at(2)).toBe(2);
        });

        it("works with negative index", () => {
          expect(byteString.at(-1)).toBe(19);
        });
      });

      describe("base64", () => {
        const base64 = byteString.toBase64();
        it("#toBase64() works", () => {
          expect(base64).toBe("AAECAwQFBgcICQoLDA0ODxAREhM=");
        });
        const fromBase64 = soia.ByteString.fromBase64(base64);
        it("#fromBase64() works", () => {
          expect(toArray(fromBase64)).toMatch(toArray(byteString));
        });
      });

      describe("base16", () => {
        const array = toArray(byteString);
        const base16 = byteString.toBase16();
        it("#toBase16() works", () => {
          expect(base16).toBe("000102030405060708090a0b0c0d0e0f10111213");
        });
        it("#fromBase16() works", () => {
          const fromBase64 = soia.ByteString.fromBase16(base16);
          expect(toArray(fromBase64)).toMatch(array);
        });
        it("#fromBase16() accepts uppercase", () => {
          const fromBase64 = soia.ByteString.fromBase16(base16.toUpperCase());
          expect(toArray(fromBase64)).toMatch(array);
        });
      });
    });
  }
});

describe("bool serializer", () => {
  const serializer = soia.primitiveSerializer("bool");
  const tester = new SerializerTester(serializer);

  it("#typeDescriptor", () => {
    expect(serializer.typeDescriptor).toMatch({
      kind: "primitive",
      primitive: "bool",
    });
  });

  it("TypeDescript#asJson()", () => {
    expect(serializer.typeDescriptor.asJson()).toMatch({
      type: {
        kind: "primitive",
        value: "bool",
      },
      records: [],
    });
    tester.reserializeTypeAdapterAndAssertNoLoss();
  });

  tester.reserializeAndAssert(true, {
    denseJson: 1,
    readableJson: true,
    bytesAsBase16: "01",
  });
  tester.reserializeAndAssert(false, {
    denseJson: 0,
    readableJson: false,
    bytesAsBase16: "00",
  });
  tester.deserializeZeroAndAssert((input) => input === false);
});

describe("int32 serializer", () => {
  const serializer = soia.primitiveSerializer("int32");
  const tester = new SerializerTester(serializer);

  it("#typeDescriptor", () => {
    expect(serializer.typeDescriptor).toMatch({
      kind: "primitive",
      primitive: "int32",
    });
  });

  it("TypeDescript#asJson()", () => {
    expect(serializer.typeDescriptor.asJson()).toMatch({
      type: {
        kind: "primitive",
        value: "int32",
      },
      records: [],
    });
    tester.reserializeTypeAdapterAndAssertNoLoss();
  });

  tester.reserializeAndAssert(2, {
    denseJson: 2,
    bytesAsBase16: "02",
  });
  tester.reserializeAndAssert(0, {
    denseJson: 0,
    bytesAsBase16: "00",
  });
  tester.reserializeAndAssert(-1, {
    denseJson: -1,
    bytesAsBase16: "ebff",
  });
  tester.reserializeAndAssert(2.8, {
    denseJson: 2,
    bytesAsBase16: "02",
  });
  tester.reserializeAndAssert(-3.8, {
    denseJson: -3,
    bytesAsBase16: "ebfc",
    denseJsonFromReserialized: -4,
    lossy: true,
  });
  tester.reserializeAndAssert(231, {
    denseJson: 231,
    bytesAsBase16: "e7",
  });
  tester.reserializeAndAssert(232, {
    denseJson: 232,
    bytesAsBase16: "e8e800",
  });
  tester.reserializeAndAssert(65535, {
    denseJson: 65535,
    bytesAsBase16: "e8ffff",
  });
  tester.reserializeAndAssert(65536, {
    denseJson: 65536,
    bytesAsBase16: "e900000100",
  });
  tester.reserializeAndAssert(2147483647, {
    denseJson: 2147483647,
    bytesAsBase16: "e9ffffff7f",
  });
  tester.reserializeAndAssert(-255, {
    denseJson: -255,
    bytesAsBase16: "eb01",
  });
  tester.reserializeAndAssert(-256, {
    denseJson: -256,
    bytesAsBase16: "eb00",
  });
  tester.reserializeAndAssert(-257, {
    denseJson: -257,
    bytesAsBase16: "ecfffe",
  });
  tester.reserializeAndAssert(-65536, {
    denseJson: -65536,
    bytesAsBase16: "ec0000",
  });
  tester.reserializeAndAssert(-65537, {
    denseJson: -65537,
    bytesAsBase16: "edfffffeff",
  });
  tester.reserializeAndAssert(-2147483648, {
    denseJson: -2147483648,
    bytesAsBase16: "ed00000080",
  });

  it("accepts string", () => {
    expect(serializer.fromJson("0")).toBe(0);
  });

  it("transforms to integer", () => {
    expect(serializer.fromJson("2.3")).toBe(2);
  });

  it("accepts NaN", () => {
    expect(serializer.fromJson("NaN")).toBe(0);
  });

  it("accepts Infinity", () => {
    expect(serializer.fromJson("Infinity")).toBe(0);
  });

  it("accepts -Infinity", () => {
    expect(serializer.fromJson("-Infinity")).toBe(0);
  });

  it("accepts numbers out of int32 range", () => {
    expect(serializer.fromJson(2147483648)).toBe(-2147483648);
    expect(serializer.fromJson(-2147483649)).toBe(2147483647);
    expect(
      serializer.fromBytes(
        soia
          .primitiveSerializer("int64")
          .toBytes(BigInt(2147483648))
          .toBuffer(),
      ),
    ).toBe(-2147483648);
  });

  it("accepts booleans", () => {
    expect(serializer.fromJson(false)).toBe(0);
    expect(serializer.fromJson(true)).toBe(1);
  });
});

describe("int64 serializer", () => {
  const serializer = soia.primitiveSerializer("int64");
  const tester = new SerializerTester(serializer);

  it("#typeDescriptor", () => {
    expect(serializer.typeDescriptor).toMatch({
      kind: "primitive",
      primitive: "int64",
    });
  });

  it("TypeDescript#asJson()", () => {
    expect(serializer.typeDescriptor.asJson()).toMatch({
      type: {
        kind: "primitive",
        value: "int64",
      },
      records: [],
    });
    tester.reserializeTypeAdapterAndAssertNoLoss();
  });

  it("can deserialize any number", () => {
    expect(serializer.fromJson(3.14)).toBe(BigInt(3));
  });

  tester.reserializeAndAssert(BigInt("888888888888"), {
    denseJson: 888888888888,
    bytesAsBase16: "ee380ee8f5ce000000",
  });
  // Numbers outside of bounds are clamped.
  tester.reserializeAndAssert(BigInt("9223372036854775808"), {
    denseJson: "9223372036854775807",
    bytesAsBase16: "eeffffffffffffff7f",
  });
  tester.reserializeAndAssert(BigInt("-9223372036854775809"), {
    denseJson: "-9223372036854775808",
    bytesAsBase16: "ee0000000000000080",
  });
  tester.reserializeAndAssert(BigInt("0"), {
    denseJson: 0,
    bytesAsBase16: "00",
  });
  tester.deserializeZeroAndAssert(
    (i) => typeof i === "bigint" && Number(i) === 0,
  );
  it("accepts number", () => {
    expect(serializer.fromJson(123)).toBe(BigInt(123));
  });
  it("accepts number outside of range", () => {
    expect(serializer.fromJson("-99999999999999999999999999")).toBe(
      BigInt("-99999999999999999999999999"),
    );
  });
});

describe("uint64 serializer", () => {
  const serializer = soia.primitiveSerializer("uint64");
  const tester = new SerializerTester(serializer);

  it("#typeDescriptor", () => {
    expect(serializer.typeDescriptor).toMatch({
      kind: "primitive",
      primitive: "uint64",
    });
  });

  it("TypeDescript#asJson()", () => {
    expect(serializer.typeDescriptor.asJson()).toMatch({
      type: {
        kind: "primitive",
        value: "uint64",
      },
      records: [],
    });
    tester.reserializeTypeAdapterAndAssertNoLoss();
  });

  it("can deserialize any number", () => {
    expect(serializer.fromJson(3.14)).toBe(BigInt(3));
  });

  tester.reserializeAndAssert(BigInt("888888888888"), {
    denseJson: 888888888888,
    bytesAsBase16: "ea380ee8f5ce000000",
  });
  // Numbers outside of bounds are clamped.
  tester.reserializeAndAssert(BigInt("18446744073709551616"), {
    denseJson: "18446744073709551615",
    bytesAsBase16: "eaffffffffffffffff",
  });
  tester.reserializeAndAssert(BigInt("-1"), {
    denseJson: 0,
    bytesAsBase16: "00",
  });
  tester.reserializeAndAssert(BigInt("0"), {
    denseJson: 0,
    bytesAsBase16: "00",
  });
  tester.deserializeZeroAndAssert(
    (i) => typeof i === "bigint" && Number(i) === 0,
  );
  it("accepts number", () => {
    expect(serializer.fromJson(123)).toBe(BigInt(123));
  });
  it("accepts number outside of range", () => {
    expect(serializer.fromJson("-99999999999999999999999999")).toBe(
      BigInt("-99999999999999999999999999"),
    );
  });
});

describe("float32 serializer", () => {
  const serializer = soia.primitiveSerializer("float32");
  const tester = new SerializerTester(serializer);

  it("#typeDescriptor", () => {
    expect(serializer.typeDescriptor).toMatch({
      kind: "primitive",
      primitive: "float32",
    });
  });

  it("TypeDescript#asJson()", () => {
    expect(serializer.typeDescriptor.asJson()).toMatch({
      type: {
        kind: "primitive",
        value: "float32",
      },
      records: [],
    });
    tester.reserializeTypeAdapterAndAssertNoLoss();
  });

  it("can deserialize any number", () => {
    expect(serializer.fromJson("1111111111")).toMatch(1111111111);
    expect(
      serializer.fromJson("1111111111111111111111111111111111111111"),
    ).toMatch(1.1111111111111112e39);
  });

  tester.reserializeAndAssert(2, {
    denseJson: 2,
    bytesAsBase16: "f000000040",
  });
  tester.reserializeAndAssert(0, {
    denseJson: 0,
    bytesAsBase16: "00",
  });
  tester.reserializeAndAssert(-1, {
    denseJson: -1,
    bytesAsBase16: "f0000080bf",
  });
  tester.reserializeAndAssert(-1.5, {
    denseJson: -1.5,
    bytesAsBase16: "f00000c0bf",
  });
  tester.reserializeAndAssert(2.8, {
    denseJson: 2.8,
    bytesAsBase16: "f033333340",
    denseJsonFromReserialized: 2.799999952316284,
    lossy: true,
  });
  tester.reserializeAndAssert(-3.8, {
    denseJson: -3.8,
    bytesAsBase16: "f0333373c0",
    denseJsonFromReserialized: -3.799999952316284,
    lossy: true,
  });
  tester.reserializeAndAssert(Number.NaN, {
    denseJson: "NaN",
    bytesAsBase16: "f00000c07f",
  });
  tester.reserializeAndAssert(Number.POSITIVE_INFINITY, {
    denseJson: "Infinity",
    bytesAsBase16: "f00000807f",
  });
  tester.reserializeAndAssert(Number.NEGATIVE_INFINITY, {
    denseJson: "-Infinity",
    bytesAsBase16: "f0000080ff",
  });
  it("accepts string", () => {
    expect(serializer.fromJson("0")).toBe(0);
    expect(serializer.fromJson("2.5")).toBe(2.5);
  });
});

describe("float64 serializer", () => {
  const serializer = soia.primitiveSerializer("float64");
  const tester = new SerializerTester(serializer);

  it("#typeDescriptor", () => {
    expect(serializer.typeDescriptor).toMatch({
      kind: "primitive",
      primitive: "float64",
    });
  });

  it("TypeDescript#asJson()", () => {
    expect(serializer.typeDescriptor.asJson()).toMatch({
      type: {
        kind: "primitive",
        value: "float64",
      },
      records: [],
    });
    tester.reserializeTypeAdapterAndAssertNoLoss();
  });

  tester.reserializeAndAssert(2, {
    denseJson: 2,
    bytesAsBase16: "f10000000000000040",
  });
  tester.reserializeAndAssert(0, {
    denseJson: 0,
    bytesAsBase16: "00",
  });
  tester.reserializeAndAssert(-1, {
    denseJson: -1,
    bytesAsBase16: "f1000000000000f0bf",
  });
  tester.reserializeAndAssert(2.8, {
    denseJson: 2.8,
    bytesAsBase16: "f16666666666660640",
  });
  tester.reserializeAndAssert(-3.8, {
    denseJson: -3.8,
    bytesAsBase16: "f16666666666660ec0",
  });
  tester.reserializeAndAssert(Number.NaN, {
    denseJson: "NaN",
    bytesAsBase16: "f1000000000000f87f",
  });
  tester.reserializeAndAssert(Number.POSITIVE_INFINITY, {
    denseJson: "Infinity",
    bytesAsBase16: "f1000000000000f07f",
  });
  tester.reserializeAndAssert(Number.NEGATIVE_INFINITY, {
    denseJson: "-Infinity",
    bytesAsBase16: "f1000000000000f0ff",
  });
  it("accepts string", () => {
    expect(serializer.fromJson("0")).toBe(0);
    expect(serializer.fromJson("2.5")).toBe(2.5);
  });
});

describe("string serializer", () => {
  const serializer = soia.primitiveSerializer("string");
  const tester = new SerializerTester(serializer);

  it("#typeDescriptor", () => {
    expect(serializer.typeDescriptor).toMatch({
      kind: "primitive",
      primitive: "string",
    });
  });

  it("TypeDescript#asJson()", () => {
    expect(serializer.typeDescriptor.asJson()).toMatch({
      type: {
        kind: "primitive",
        value: "string",
      },
      records: [],
    });
    tester.reserializeTypeAdapterAndAssertNoLoss();
  });

  tester.reserializeAndAssert("", {
    denseJson: "",
    bytesAsBase16: "f2",
  });
  tester.reserializeAndAssert("Foôbar", {
    denseJson: "Foôbar",
    bytesAsBase16: "f307466fc3b4626172",
  });
  tester.reserializeAndAssert('Foo\n"bar"', {
    denseJson: 'Foo\n"bar"',
    bytesAsBase16: "f309466f6f0a2262617222",
  });
  tester.reserializeAndAssert(
    "é".repeat(5000),
    {
      denseJson: "é".repeat(5000),
      bytesAsBase16: `f3e81027${"c3a9".repeat(5000)}`,
    },
    'reserialize "é".repeat(5000)',
  );
  // See https://stackoverflow.com/questions/55056322/maximum-utf-8-string-size-given-utf-16-size
  tester.reserializeAndAssert(
    "\uFFFF".repeat(5000),
    {
      denseJson: "\uFFFF".repeat(5000),
      bytesAsBase16: `f3e8983a${"efbfbf".repeat(5000)}`,
    },
    'reserialize "\\uFFFF".repeat(5000)',
  );
  tester.deserializeZeroAndAssert((s) => s === "");
});

describe("bytes serializer", () => {
  const serializer = soia.primitiveSerializer("bytes");
  const tester = new SerializerTester(serializer);

  it("#typeDescriptor", () => {
    expect(serializer.typeDescriptor).toMatch({
      kind: "primitive",
      primitive: "bytes",
    });
  });

  it("TypeDescript#asJson()", () => {
    expect(serializer.typeDescriptor.asJson()).toMatch({
      type: {
        kind: "primitive",
        value: "bytes",
      },
      records: [],
    });
    tester.reserializeTypeAdapterAndAssertNoLoss();
  });

  tester.reserializeAndAssert(soia.ByteString.fromBase64("abc123"), {
    denseJson: "abc12w==",
    readableJson: "hex:69b735db",
    bytesAsBase16: "f50469b735db",
  });
  tester.reserializeAndAssert(soia.ByteString.EMPTY, {
    denseJson: "",
    readableJson: "hex:",
    bytesAsBase16: "f4",
  });
  tester.deserializeZeroAndAssert((s) => s.byteLength === 0);
});

describe("optional serializer", () => {
  const otherSerializer = soia.primitiveSerializer("int32");
  const serializer = soia.optionalSerializer(otherSerializer);
  it("is idempotent", () => {
    expect(soia.optionalSerializer(serializer)).toMatch(serializer);
  });

  const tester = new SerializerTester(serializer);

  it("#typeDescriptor", () => {
    expect(serializer.typeDescriptor).toMatch({
      kind: "optional",
      otherType: otherSerializer.typeDescriptor,
    });
  });

  it("TypeDescript#asJson()", () => {
    expect(serializer.typeDescriptor.asJson()).toMatch({
      type: {
        kind: "optional",
        value: {
          kind: "primitive",
          value: "int32",
        },
      },
      records: [],
    });
    tester.reserializeTypeAdapterAndAssertNoLoss();
  });

  tester.reserializeAndAssert(2, {
    denseJson: 2,
    bytesAsBase16: "02",
  });
  tester.reserializeAndAssert(null, {
    denseJson: null,
    bytesAsBase16: "ff",
  });
  tester.deserializeZeroAndAssert((i) => i === 0);
});

describe("array serializer", () => {
  const itemSerializer = soia.primitiveSerializer("int32");
  const serializer = soia.arraySerializer(itemSerializer, "foo.bar");
  const tester = new SerializerTester(serializer);

  it("#typeDescriptor", () => {
    expect(serializer.typeDescriptor).toMatch({
      kind: "array",
      itemType: itemSerializer.typeDescriptor,
    });
  });

  it("TypeDescript#asJson()", () => {
    expect(serializer.typeDescriptor.asJson()).toMatch({
      type: {
        kind: "array",
        value: {
          item: {
            kind: "primitive",
            value: "int32",
          },
          key_chain: "foo.bar",
        },
      },
      records: [],
    });
    tester.reserializeTypeAdapterAndAssertNoLoss();
  });

  tester.reserializeAndAssert([], {
    denseJson: [],
    bytesAsBase16: "f6",
  });

  tester.reserializeAndAssert([10], {
    denseJson: [10],
    bytesAsBase16: "f70a",
  });

  tester.reserializeAndAssert([10, 11], {
    denseJson: [10, 11],
    bytesAsBase16: "f80a0b",
  });

  tester.reserializeAndAssert([10, 11, 12], {
    denseJson: [10, 11, 12],
    bytesAsBase16: "f90a0b0c",
  });

  tester.reserializeAndAssert([10, 11, 12, 13], {
    denseJson: [10, 11, 12, 13],
    bytesAsBase16: "fa040a0b0c0d",
  });

  tester.deserializeZeroAndAssert((a) => a.length === 0);
});

describe("string array serializer", () => {
  const itemSerializer = soia.primitiveSerializer("string");
  const serializer = soia.arraySerializer(itemSerializer);
  const tester = new SerializerTester(serializer);

  it("TypeDescript#asJson()", () => {
    expect(serializer.typeDescriptor.asJson()).toMatch({
      type: {
        kind: "array",
        value: {
          item: {
            kind: "primitive",
            value: "string",
          },
          key_chain: undefined,
        },
      },
      records: [],
    });
    tester.reserializeTypeAdapterAndAssertNoLoss();
  });

  tester.reserializeAndAssert([], {
    denseJson: [],
    bytesAsBase16: "f6",
  });

  tester.reserializeAndAssert(["foo", "bar"], {
    denseJson: ["foo", "bar"],
    bytesAsBase16: "f8f303666f6ff303626172",
  });
});

describe("bytes array serializer", () => {
  const itemSerializer = soia.primitiveSerializer("bytes");
  const serializer = soia.arraySerializer(itemSerializer);
  const tester = new SerializerTester(serializer);

  tester.reserializeAndAssert([], {
    denseJson: [],
    bytesAsBase16: "f6",
  });

  const a = soia.ByteString.fromBase64("bGlnaHQgdw==");
  const b = soia.ByteString.fromBase64("bGlnaHQgd28=");

  tester.reserializeAndAssert([a, b], {
    denseJson: [a.toBase64(), b.toBase64()],
    readableJson: ["hex:6c696768742077", "hex:6c6967687420776f"],
    bytesAsBase16: "f8f5076c696768742077f5086c6967687420776f",
  });
});
