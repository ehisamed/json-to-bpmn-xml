import { BpmnConverter } from "./converter/BpmnConverter";
import type { ProcessModel } from "./types/process";

export async function convert(model: ProcessModel): Promise<string> {
  const converter = new BpmnConverter();
  return await converter.convert(model);
}

export type { ProcessModel };
