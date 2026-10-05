import type { DiColor } from "./di-color";

export interface ITextAnnotation {
  id: string;
  text: string;
  color?: DiColor;
}

export interface IGroup {
  id: string;
  name?: string;
  categoryValue?: string;
  color?: DiColor;
}

export interface IAssociation {
  id: string;
  source: string;
  target: string;
  associationDirection?: "None" | "One" | "Both";
}
