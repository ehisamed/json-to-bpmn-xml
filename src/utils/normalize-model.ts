import type { ProcessModel, IProcessDef } from "../types/process";
import type { IMessageFlow } from "../types/message-flow";
import type { IDataStore } from "../types/data-store";
import type { IDataObject } from "../types/data-object";
import type { ITextAnnotation, IGroup, IAssociation } from "../types/artifact";
import type { IMessage } from "../types/message";
import type { ISignal } from "../types/signal";

export type NormalizedModel = {
  id: string;
  name?: string;
  processes: IProcessDef[];
  messageFlows: IMessageFlow[];
  messages: IMessage[];
  signals: ISignal[];
  dataStores: IDataStore[];
  dataObjects: IDataObject[];
  textAnnotations: ITextAnnotation[];
  groups: IGroup[];
  associations: IAssociation[];
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
      messages: model.messages ?? [],
      signals: model.signals ?? [],
      dataStores: model.dataStores ?? [],
      dataObjects: model.dataObjects ?? [],
      textAnnotations: model.textAnnotations ?? [],
      groups: model.groups ?? [],
      associations: model.associations ?? [],
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
    messages: model.messages ?? [],
    signals: model.signals ?? [],
    dataStores: model.dataStores ?? [],
    dataObjects: model.dataObjects ?? [],
    textAnnotations: model.textAnnotations ?? [],
    groups: model.groups ?? [],
    associations: model.associations ?? [],
  };
}
