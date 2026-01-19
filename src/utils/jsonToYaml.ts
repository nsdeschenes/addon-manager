type JsonLike =
  | null
  | boolean
  | number
  | string
  | JsonLike[]
  | { [key: string]: JsonLike };

export function toYaml(value: JsonLike, indentSize = 2): string {
  return `${serialize(value, 0, indentSize).trimEnd()}\n`;
}

function serialize(
  value: JsonLike,
  level: number,
  indentSize: number,
  inArray: boolean = false
): string {
  const indent = " ".repeat(level * indentSize);

  if (
    value === null ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return formatScalar(value, indent, inArray);
  }

  if (typeof value === "string") {
    return formatScalar(value, indent, inArray);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return `${indent}${inArray ? "- " : ""}[]\n`;
    }

    let out = "";
    for (const item of value) {
      const isScalar = isScalarValue(item);
      if (isScalar) {
        // `- value` on a single line
        out += serialize(item, level, indentSize, true);
      } else {
        // `-` on its own line, nested block below
        out += `${indent}-\n`;
        out += serialize(item, level + 1, indentSize, false);
      }
    }
    return out;
  }

  // object
  const keys = Object.keys(value);
  if (keys.length === 0) {
    return `${indent}${inArray ? "- " : ""}{ }\n`;
  }

  let out = "";
  for (const key of keys) {
    const v = value[key];

    if (v === undefined) continue;

    const isScalar = isScalarValue(v);

    if (isScalar) {
      // key: value
      const line = `${indent}${key}: ${scalarToYaml(v)}\n`;
      if (inArray) {
        // convert `indent` + `key: value` into `indent- key: value`
        out += `${indent}- ${key}: ${scalarToYaml(v)}\n`;
      } else {
        out += line;
      }
    } else {
      // key:
      if (inArray) {
        out += `${indent}- ${key}:\n`;
        out += serialize(v, level + 1, indentSize, false);
      } else {
        out += `${indent}${key}:\n`;
        out += serialize(v, level + 1, indentSize, false);
      }
    }
  }

  return out;
}

function isScalarValue(v: JsonLike): boolean {
  return (
    v === null ||
    typeof v === "boolean" ||
    typeof v === "number" ||
    typeof v === "string"
  );
}

function formatScalar(v: JsonLike, indent: string, inArray: boolean): string {
  const prefix = inArray ? `${indent}- ` : indent;
  return `${prefix}${scalarToYaml(v)}\n`;
}

function scalarToYaml(v: JsonLike): string {
  if (v === null) return "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "null";

  // string: quote via JSON.stringify to avoid YAML edge cases
  const s = v as string;
  // Simple strings without specials can be plain
  // eslint-disable-next-line no-useless-escape
  if (/^[a-zA-Z0-9_\-]+$/.test(s)) return s;
  return JSON.stringify(s);
}
