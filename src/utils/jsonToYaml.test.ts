import { test, expect, describe } from "bun:test";
import { toYaml } from "./jsonToYaml";

describe("toYaml - scalars", () => {
  test("serializes null, booleans, and numbers", () => {
    expect(toYaml(null)).toBe("null");
    expect(toYaml(true)).toBe("true");
    expect(toYaml(false)).toBe("false");
    expect(toYaml(0)).toBe("0");
    expect(toYaml(42)).toBe("42");
  });

  test("serializes simple strings without quotes when possible", () => {
    expect(toYaml("hello")).toBe("hello");
    expect(toYaml("HelloWorld_123")).toBe("HelloWorld_123");
    expect(toYaml("with-dash")).toBe("with-dash");
  });

  test("serializes complex strings with JSON quoting", () => {
    expect(toYaml("hello world")).toBe('"hello world"');
    expect(toYaml("value:with:colon")).toBe('"value:with:colon"');
    expect(toYaml("line\nbreak")).toBe('"line\\nbreak"');
  });
});

describe("toYaml - objects", () => {
  test("serializes flat object with scalar values", () => {
    const obj = {
      name: "Airport",
      enabled: true,
      count: 3,
    };

    expect(toYaml(obj)).toBe(
      ["name: Airport", "enabled: true", "count: 3"].join("\n"),
    );
  });

  test("includes falsy values in objects", () => {
    const obj = {
      truthy: "yes",
      emptyString: "",
      zero: 0,
      falseValue: false,
      nullValue: null,
    };

    expect(toYaml(obj)).toBe(
      [
        "truthy: yes",
        'emptyString: ""',
        "zero: 0",
        "falseValue: false",
        "nullValue: null",
      ].join("\n"),
    );
  });

  test("serializes nested objects with indentation", () => {
    const obj = {
      parent: {
        child: "value",
        flag: false,
      },
    };

    expect(toYaml(obj)).toBe(
      // NOTE: falsy nested values are also skipped
      ["parent:", "  child: value", "  flag: false"].join("\n"),
    );
  });

  test("serializes empty object as { }", () => {
    expect(toYaml({})).toBe("{ }");
  });
});

describe("toYaml - arrays", () => {
  test("serializes array of scalars", () => {
    const arr = ["one", "two", "three"];

    expect(toYaml(arr)).toBe(["- one", "- two", "- three"].join("\n"));
  });

  test("serializes empty array as []", () => {
    expect(toYaml([])).toBe("[]");
  });

  test("serializes array of objects", () => {
    const arr = [
      { name: "A", value: 1 },
      { name: "B", value: 2 },
    ];

    expect(toYaml(arr)).toBe(
      [
        "-",
        "  name: A",
        "  value: 1",
        "-",
        "  name: B",
        "  value: 2",
      ].join("\n"),
    );
  });

  test("serializes array with nested objects", () => {
    const value = [
      {
        name: "A",
        nested: {
          key: "x",
        },
      },
    ];

    expect(toYaml(value)).toBe(
      ["-", "  name: A", "  nested:", "    key: x"].join("\n"),
    );
  });
});

describe("toYaml - indentation", () => {
  test("uses custom indentSize when provided", () => {
    const obj = {
      parent: {
        child: "value",
      },
    };

    expect(toYaml(obj, 4)).toBe(
      ["parent:", "    child: value"].join("\n"),
    );
  });
});

