import type { ProcessModel, IProcessDef } from "../types/process";
import type { IMessageFlow } from "../types/message-flow";
import type { IDataStore } from "../types/data-store";

export type NormalizedModel = {
  id: string;
  name?: string;
  processes: IProcessDef[];
  messageFlows: IMessageFlow[];
  dataStores: IDataStore[];
};

/**
 * Normalize simple single-process models into collaboration shape.
 */
export function normalizeModel(model: ProcessModel): NormalizedModel {
  if (model.processes?.length) {
    return {
      id: model.id,
      ...(model.name !== undefined ? { name: model.name } : {}),
      processes: model.processes,
      messageFlows: model.messageFlows ?? [],
      dataStores: model.dataStores ?? [],
    };
  }

  if (!model.nodes?.length) {
    throw new Error(
      "ProcessModel must provide either processes[] or top-level nodes[]",
    );
  }

  const process: IProcessDef = {
    id: model.id,
    ...(model.name !== undefined ? { name: model.name } : {}),
    ...(model.name !== undefined ? { participantName: model.name } : {}),
    ...(model.lanes !== undefined ? { lanes: model.lanes } : {}),
    nodes: model.nodes,
    edges: model.edges ?? [],
  };

  return {
    id: model.id,
    ...(model.name !== undefined ? { name: model.name } : {}),
    processes: [process],
    messageFlows: model.messageFlows ?? [],
    dataStores: model.dataStores ?? [],
  };
}
