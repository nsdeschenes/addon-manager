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

export interface Airport {
  id?: number;
  ident: string;
  type: string | null;
  name: string;
  latitudeDeg: number | null;
  longitudeDeg: number | null;
  elevationFt: number | null;
  isoCountry: string | null;
  municipality: string | null;
  icaoCode: string | null;
  iataCode: string | null;
}
