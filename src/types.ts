export interface AddonItem {
  type: "airport";
  content: string;
  revision: number;
}

export interface Addon {
  type: "scenery";
  title: string;
  creator: string;
  packageName: string;
  packageVersion: string;
  minimumGameVersion: string;
  releaseNotes: {
    neutral: {
      LastUpdate: string;
      OlderHistory: string;
    };
  };
  items: AddonItem[];
}
