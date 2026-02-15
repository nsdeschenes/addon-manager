export interface AddonItem {
  type: string;
  content: string;
  revision: number;
}

export interface Addon {
  title: string;
  creator: string;
  size: number;
  packageName: string;
  packageVersion: string;
  minimumGameVersion: string;
  items: AddonItem[];
}
