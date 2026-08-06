import type { DiColor } from "./di-color";

export interface IDataStore {
  id: string;
  name?: string;

  /** Optional DI fill/stroke (bpmn.io bioc + color extensions). */
  color?: DiColor;
}
