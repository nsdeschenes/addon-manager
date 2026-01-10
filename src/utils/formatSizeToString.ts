const KILOBYTE = 1_000;
const MEGABYTE = 1_000_000;
const GIGABYTE = 1_000_000_000;

const formatSettings = {
  style: "unit",
  unitDisplay: "narrow",
  maximumFractionDigits: 2,
} as const;

export const formatSizeToString = (bytes: number) => {
  switch (true) {
    case bytes < KILOBYTE:
      return Intl.NumberFormat("en-US", {
        ...formatSettings,
        maximumFractionDigits: 0,
        unit: "byte",
      }).format(bytes);
    case bytes >= KILOBYTE && bytes < MEGABYTE:
      return Intl.NumberFormat("en-US", {
        ...formatSettings,
        unit: "kilobyte",
      }).format(bytes / KILOBYTE);
    case bytes >= MEGABYTE && bytes < GIGABYTE:
      return Intl.NumberFormat("en-US", {
        ...formatSettings,
        unit: "megabyte",
      }).format(bytes / MEGABYTE);
    default:
      return Intl.NumberFormat("en-US", {
        ...formatSettings,
        unit: "gigabyte",
      }).format(bytes / GIGABYTE);
  }
};
