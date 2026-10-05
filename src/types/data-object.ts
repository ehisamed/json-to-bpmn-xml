import type { DiColor } from "./di-color";

export interface IDataObject {
  id: string;
  name?: string;
  isCollection?: boolean;
  color?: DiColor;
}
