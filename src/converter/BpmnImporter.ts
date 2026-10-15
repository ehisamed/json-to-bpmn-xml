import { BpmnModdle } from "bpmn-moddle";
import { BpmnConverter } from "./BpmnConverter";
import type { ProcessModel, IProcessDef } from "../types/process";
import type { INode, NodeType, EventDefinition, EventDefinitionOptions } from "../types/node";
import type { IEdge } from "../types/edge";

type Element = {
  $type: string;
  id?: string;
  name?: string;
  [key: string]: any;
};
type DataKind = "store" | "object";

export interface ImportWarning {
  code: "parse" | "unsupported" | "dropped-flow" | "missing-reference" | "diagram-rebuilt" | "conversion-failed";
  message: string;
  elementId?: string;
}

export interface ImportResult {
  /** Null when the XML contains no process that can be represented by our JSON model. */
  model: ProcessModel | null;
  warnings: ImportWarning[];
  /** The exact input, retained so unsupported BPMN content is never lost. */
  sourceXml: string;
}

const NODE_TYPES: Record<string, NodeType> = {
  "bpmn:StartEvent": "start",
  "bpmn:EndEvent": "end",
  "bpmn:Task": "task",
  "bpmn:ManualTask": "manualTask",
  "bpmn:UserTask": "userTask",
  "bpmn:ServiceTask": "serviceTask",
  "bpmn:SendTask": "sendTask",
  "bpmn:ReceiveTask": "receiveTask",
  "bpmn:ScriptTask": "scriptTask",
  "bpmn:BusinessRuleTask": "businessRuleTask",
  "bpmn:CallActivity": "callActivity",
  "bpmn:SubProcess": "subProcess",
  "bpmn:Transaction": "subProcess",
  "bpmn:AdHocSubProcess": "subProcess",
  "bpmn:ExclusiveGateway": "exclusiveGateway",
  "bpmn:InclusiveGateway": "inclusiveGateway",
  "bpmn:ParallelGateway": "parallelGateway",
  "bpmn:ComplexGateway": "complexGateway",
  "bpmn:EventBasedGateway": "eventBasedGateway",
  "bpmn:IntermediateCatchEvent": "intermediateCatch",
  "bpmn:IntermediateThrowEvent": "intermediateThrow",
  "bpmn:BoundaryEvent": "boundaryEvent",
};

const EVENT_TYPES: Record<string, EventDefinition> = {
  "bpmn:TimerEventDefinition": "timer",
  "bpmn:MessageEventDefinition": "message",
  "bpmn:SignalEventDefinition": "signal",
  "bpmn:ConditionalEventDefinition": "conditional",
  "bpmn:ErrorEventDefinition": "error",
  "bpmn:EscalationEventDefinition": "escalation",
  "bpmn:TerminateEventDefinition": "terminate",
  "bpmn:CancelEventDefinition": "cancel",
  "bpmn:CompensateEventDefinition": "compensation",
  "bpmn:LinkEventDefinition": "link",
};

function refId(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id;
    if (typeof id === "string") return id;
  }
  return undefined;
}

function body(value: unknown): string | undefined {
  if (value && typeof value === "object" && "body" in value) {
    const text = (value as { body?: unknown }).body;
    if (typeof text === "string") return text;
  }
  return undefined;
}

export class BpmnImporter {
  async import(xml: string): Promise<ImportResult> {
    if (typeof xml !== "string" || !xml.trim()) {
      throw new Error("BPMN XML must be a non-empty string");
    }

    const moddle = new BpmnModdle();
    const parsed = await moddle.fromXML(xml);
    const definitions = parsed.rootElement as Element;
    if (definitions.$type !== "bpmn:Definitions") {
      throw new Error("XML root must be bpmn:Definitions");
    }

    const warnings: ImportWarning[] = (parsed.warnings ?? []).map((warning) => ({
      code: "parse",
      message: String(warning),
    }));
    const warn = (code: ImportWarning["code"], message: string, elementId?: string) => {
      warnings.push({ code, message, ...(elementId ? { elementId } : {}) });
    };

    const roots = (definitions.rootElements ?? []) as Element[];
    const processElements = roots.filter((element) => element.$type === "bpmn:Process");
    const collaboration = roots.find((element) => element.$type === "bpmn:Collaboration");
    const modelId = definitions.id?.replace(/_definitions$/, "") ?? processElements[0]?.id ?? "Imported_Bpmn";

    if (definitions.diagrams?.length) {
      warn("diagram-rebuilt", "BPMNDI coordinates are not represented in JSON; converting the model back to XML recalculates the layout");
    }
    const expandedById = new Map<string, boolean>();
    for (const diagram of (definitions.diagrams ?? []) as Element[]) {
      for (const shape of (diagram.plane?.planeElement ?? []) as Element[]) {
        if (shape.$type !== "bpmndi:BPMNShape" || typeof shape.isExpanded !== "boolean") continue;
        const id = refId(shape.bpmnElement);
        if (id) expandedById.set(id, shape.isExpanded);
      }
    }
    if (definitions.extensionElements) {
      warn("unsupported", "Definitions extension elements are retained only in sourceXml", definitions.id);
    }

    const model: ProcessModel = { id: modelId };
    const rootArrays = [
      ["bpmn:Message", "messages", ["id", "name"]],
      ["bpmn:Signal", "signals", ["id", "name"]],
      ["bpmn:Error", "errors", ["id", "name", "errorCode"]],
      ["bpmn:Escalation", "escalations", ["id", "name", "escalationCode"]],
    ] as const;
    for (const [type, key, fields] of rootArrays) {
      const values = roots.filter((root) => root.$type === type && root.id).map((root) =>
        Object.fromEntries(fields.filter((field) => root[field] !== undefined).map((field) => [field, root[field]])),
      );
      if (values.length) (model as any)[key] = values;
    }
    for (const root of roots) {
      if (
        root.$type !== "bpmn:Process" && root.$type !== "bpmn:Collaboration" &&
        !rootArrays.some(([type]) => type === root.$type)
      ) {
        warn("unsupported", `Root element ${root.$type} is retained only in sourceXml`, root.id);
      }
    }

    const participants = ((collaboration?.participants ?? []) as Element[]);
    const dataKindById = new Map<string, DataKind>();
    for (const process of processElements) {
      for (const element of (process.flowElements ?? []) as Element[]) {
        const kind: DataKind | undefined = element.$type === "bpmn:DataStoreReference" ? "store"
          : element.$type === "bpmn:DataObjectReference" ? "object" : undefined;
        if (!kind) continue;
        if (!element.id) {
          warn("unsupported", `${element.$type} without id was skipped`);
          continue;
        }
        if (dataKindById.has(element.id)) {
          warn("unsupported", `Duplicate data reference ${element.id} was skipped`, element.id);
          continue;
        }
        dataKindById.set(element.id, kind);
        if (kind === "store") {
          (model.dataStores ??= []).push({
            id: element.id,
            ...(element.name !== undefined ? { name: element.name } : {}),
          });
        } else {
          (model.dataObjects ??= []).push({
            id: element.id,
            ...(element.name !== undefined ? { name: element.name } : {}),
            ...(element.isCollection !== undefined ? { isCollection: element.isCollection === true } : {}),
          });
        }
        if (element.extensionElements || (element.$attrs && Object.keys(element.$attrs).length)) {
          warn("unsupported", "Data reference extensions are retained only in sourceXml", element.id);
        }
      }
    }
    const processModels: IProcessDef[] = [];
    const importedNodeIds = new Set<string>();
    for (const process of processElements) {
      if (!process.id) {
        warn("unsupported", "Process without id was skipped");
        continue;
      }
      const participant = participants.find((item) => refId(item.processRef) === process.id);
      const converted = this.importProcess(process, warn, expandedById, dataKindById);
      if (!converted) continue;
      if (participant?.id) converted.participantId = participant.id;
      if (participant?.name !== undefined) converted.participantName = participant.name;
      processModels.push(converted);
      for (const node of converted.nodes) importedNodeIds.add(node.id);
    }

    if (collaboration) {
      for (const flow of (collaboration.messageFlows ?? []) as Element[]) {
        const source = refId(flow.sourceRef);
        const target = refId(flow.targetRef);
        if (!source || !target || !importedNodeIds.has(source) || !importedNodeIds.has(target)) {
          warn("dropped-flow", "Message flow references an unsupported or missing node", flow.id);
          continue;
        }
        (model.messageFlows ??= []).push({
          ...(flow.id ? { id: flow.id } : {}), source, target,
          ...(flow.name !== undefined ? { name: flow.name } : {}),
        });
      }
      for (const participant of participants) {
        if (!processModels.some((process) => process.id === refId(participant.processRef))) {
          warn("unsupported", "Participant without an imported process was skipped", participant.id);
        }
      }
    }

    const artifactIds = new Set<string>();
    const associations: Element[] = [];
    for (const process of processElements) {
      for (const artifact of (process.artifacts ?? []) as Element[]) {
        if (!artifact.id) {
          warn("unsupported", `Artifact ${artifact.$type} without id was skipped`);
          continue;
        }
        if (artifact.$type === "bpmn:Association") {
          associations.push(artifact);
          continue;
        }
        if (artifactIds.has(artifact.id) || dataKindById.has(artifact.id)) {
          warn("unsupported", "Duplicate artifact id was skipped", artifact.id);
          continue;
        }
        if (artifact.$type === "bpmn:TextAnnotation") {
          (model.textAnnotations ??= []).push({ id: artifact.id, text: String(artifact.text ?? "") });
        } else if (artifact.$type === "bpmn:Group") {
          (model.groups ??= []).push({ id: artifact.id });
          if (artifact.categoryValueRef) {
            warn("unsupported", "Group categoryValueRef is retained only in sourceXml", artifact.id);
          }
        } else {
          warn("unsupported", `Artifact ${artifact.$type} is retained only in sourceXml`, artifact.id);
          continue;
        }
        artifactIds.add(artifact.id);
        if (process !== processElements[0]) {
          warn("unsupported", "Artifact process placement is not represented in JSON", artifact.id);
        }
        if (artifact.extensionElements || (artifact.$attrs && Object.keys(artifact.$attrs).length)) {
          warn("unsupported", "Artifact extensions are retained only in sourceXml", artifact.id);
        }
      }
    }
    const associationEndpoints = new Set([...importedNodeIds, ...artifactIds]);
    for (const association of associations) {
      const source = refId(association.sourceRef);
      const target = refId(association.targetRef);
      if (!association.id || !source || !target || !associationEndpoints.has(source) || !associationEndpoints.has(target)) {
        warn("missing-reference", "Association references an unsupported or missing node/artifact", association.id);
        continue;
      }
      if (association.associationDirection && !["None", "One", "Both"].includes(association.associationDirection)) {
        warn("unsupported", "Association direction is retained only in sourceXml", association.id);
      }
      (model.associations ??= []).push({
        id: association.id,
        source,
        target,
        ...(["None", "One", "Both"].includes(association.associationDirection)
          ? { associationDirection: association.associationDirection } : {}),
      });
    }

    if (processModels.length === 0) {
      warn("unsupported", "No process with supported nodes could be imported");
      return { model: null, warnings, sourceXml: xml };
    }
    if (processModels.length === 1 && !collaboration) {
      const process = processModels[0]!;
      model.id = process.id;
      if (process.name !== undefined) model.name = process.name;
      model.nodes = process.nodes;
      model.edges = process.edges;
      if (process.lanes?.length) model.lanes = process.lanes;
    } else {
      model.processes = processModels;
    }

    // The source XML may be valid BPMN while the supported projection violates
    // our stricter JSON constraints. Never hand callers a model that cannot be
    // converted back; retain the original document and explain why instead.
    try {
      await new BpmnConverter().convert(model);
    } catch (error) {
      warn("conversion-failed", `Imported JSON cannot be regenerated: ${String(error)}`);
      return { model: null, warnings, sourceXml: xml };
    }
    return { model, warnings, sourceXml: xml };
  }

  private importProcess(
    process: Element,
    warn: (code: ImportWarning["code"], message: string, elementId?: string) => void,
    expandedById: Map<string, boolean>,
    dataKindById: Map<string, DataKind>,
  ): IProcessDef | null {
    const scope = this.importFlowElements((process.flowElements ?? []) as Element[], warn, expandedById, dataKindById, true);
    if (!scope.nodes.length) {
      warn("unsupported", "Process has no supported nodes and was skipped", process.id);
      return null;
    }
    const result: IProcessDef = {
      id: process.id!,
      ...(process.name !== undefined ? { name: process.name } : {}),
      nodes: scope.nodes,
      edges: scope.edges,
    };
    const lanes = ((process.laneSets ?? []) as Element[]).flatMap((set) => (set.lanes ?? []) as Element[]);
    const laneModels = lanes.filter((lane) => lane.id).map((lane) => ({ id: lane.id!, name: lane.name ?? "" }));
    if (laneModels.length) result.lanes = laneModels;
    for (const lane of lanes) {
      for (const ref of (lane.flowNodeRef ?? []) as unknown[]) {
        const id = refId(ref);
        const node = scope.nodes.find((candidate) => candidate.id === id);
        if (node && lane.id) node.laneId = lane.id;
      }
      if (lane.childLaneSet) warn("unsupported", "Nested lane sets are retained only in sourceXml", lane.id);
    }
    return result;
  }

  private importFlowElements(
    elements: Element[],
    warn: (code: ImportWarning["code"], message: string, elementId?: string) => void,
    expandedById: Map<string, boolean>,
    dataKindById: Map<string, DataKind>,
    importDataAssociations: boolean,
  ): { nodes: INode[]; edges: IEdge[] } {
    const nodes: INode[] = [];
    const flows: Element[] = [];
    for (const element of elements) {
      if (element.$type === "bpmn:SequenceFlow") {
        flows.push(element);
        continue;
      }
      if (element.$type === "bpmn:DataStoreReference" || element.$type === "bpmn:DataObjectReference") {
        if (!importDataAssociations) {
          warn("unsupported", "Nested data reference is retained only in sourceXml", element.id);
        }
        continue;
      }
      const node = this.importNode(element, warn, expandedById, dataKindById, importDataAssociations);
      if (node) nodes.push(node);
      else warn("unsupported", `Element ${element.$type} is retained only in sourceXml`, element.id);
    }
    // A supported boundary event can still point to a node we had to omit.
    // Drop it before constructing edges, otherwise the returned JSON is invalid.
    const ids = new Set(nodes.map((node) => node.id));
    for (let index = nodes.length - 1; index >= 0; index--) {
      const node = nodes[index]!;
      if (node.type === "boundaryEvent" && (!node.attachedTo || !ids.has(node.attachedTo))) {
        warn("missing-reference", "Boundary event attached to an unsupported or missing activity was skipped", node.id);
        ids.delete(node.id);
        nodes.splice(index, 1);
      }
    }
    const edges: IEdge[] = [];
    for (const flow of flows) {
      const source = refId(flow.sourceRef);
      const target = refId(flow.targetRef);
      if (!source || !target || !ids.has(source) || !ids.has(target)) {
        warn("dropped-flow", "Sequence flow references an unsupported or missing node", flow.id);
        continue;
      }
      const edge: IEdge = {
        ...(flow.id ? { id: flow.id } : {}), source, target,
        ...(flow.name !== undefined ? { name: flow.name } : {}),
      };
      const condition = body(flow.conditionExpression);
      if (condition !== undefined) edge.condition = condition;
      const sourceElement = elements.find((element) => element.id === source);
      if (refId(sourceElement?.default) === flow.id) edge.isDefault = true;
      edges.push(edge);
    }
    return { nodes, edges };
  }

  private importNode(
    element: Element,
    warn: (code: ImportWarning["code"], message: string, elementId?: string) => void,
    expandedById: Map<string, boolean>,
    dataKindById: Map<string, DataKind>,
    importDataAssociations: boolean,
  ): INode | null {
    const type = NODE_TYPES[element.$type];
    if (!type || !element.id) return null;
    const node: INode = {
      id: element.id,
      type,
      ...(element.name !== undefined ? { name: element.name } : {}),
    };
    if (element.extensionElements) {
      warn("unsupported", "Node extension elements are retained only in sourceXml", element.id);
    }
    if (element.$attrs && Object.keys(element.$attrs).length) {
      warn("unsupported", "Node vendor attributes are retained only in sourceXml", element.id);
    }
    if (importDataAssociations) this.importDataAssociations(element, node, dataKindById, warn);
    else if (element.dataInputAssociations?.length || element.dataOutputAssociations?.length) {
      warn("unsupported", "Nested activity data associations are retained only in sourceXml", element.id);
    }
    if (type === "boundaryEvent") {
      const attachedTo = refId(element.attachedToRef);
      if (!attachedTo) {
        warn("missing-reference", "Boundary event has no attached activity", element.id);
        return null;
      }
      node.attachedTo = attachedTo;
      if (element.cancelActivity === false) node.cancelActivity = false;
    }
    if (element.isForCompensation === true) node.isForCompensation = true;
    if (element.calledElement !== undefined) node.calledElement = String(element.calledElement);
    if (element.implementation !== undefined) node.implementation = String(element.implementation);
    if (element.script !== undefined) node.script = String(element.script);
    if (element.scriptFormat !== undefined) node.scriptFormat = String(element.scriptFormat);
    const messageRef = refId(element.messageRef);
    if (messageRef) node.messageRef = messageRef;

    const definitions = (element.eventDefinitions ?? []) as Element[];
    if (type === "boundaryEvent" && definitions.length !== 1) {
      warn("unsupported", "Boundary event must have exactly one event definition", element.id);
      return null;
    }
    if (type === "boundaryEvent" && definitions.some((definition) =>
      definition.$type === "bpmn:LinkEventDefinition" || definition.$type === "bpmn:TerminateEventDefinition")) {
      warn("unsupported", "Boundary event definition is not supported by the JSON converter", element.id);
      return null;
    }
    if (definitions.some((definition) => !EVENT_TYPES[definition.$type])) {
      warn("unsupported", "Event has an unsupported definition and was skipped", element.id);
      return null;
    }
    if (definitions.length) {
      const types = definitions.map((definition) => EVENT_TYPES[definition.$type]!);
      if (new Set(types).size !== types.length) {
        warn("unsupported", "Repeated event definitions cannot be represented by type-keyed options", element.id);
        return null;
      }
      if (types.length === 1) node.eventDefinition = types[0]!;
      else node.eventDefinitions = types;
      for (const definition of definitions) {
        const definitionType = EVENT_TYPES[definition.$type]!;
        const options = this.importEventOptions(definition, definitionType);
        if (Object.keys(options).length) {
          if (types.length === 1) node.eventDefinitionOptions = options;
          else (node.eventDefinitionOptionsByType ??= {})[definitionType] = options;
        }
      }
    }

    const loop = element.loopCharacteristics as Element | undefined;
    if (loop) {
      if (loop.$type !== "bpmn:MultiInstanceLoopCharacteristics") {
        warn("unsupported", "Unsupported loop characteristics are retained only in sourceXml", element.id);
      } else {
        node.multiInstance = {
          ...(loop.isSequential ? { sequential: true } : {}),
          ...(body(loop.loopCardinality) !== undefined ? { loopCardinality: body(loop.loopCardinality)! } : {}),
          ...(body(loop.completionCondition) !== undefined ? { completionCondition: body(loop.completionCondition)! } : {}),
          ...(loop.behavior && loop.behavior !== "All" ? { behavior: loop.behavior } : {}),
        };
      }
    }
    if (type === "subProcess") {
      const nestedElements = (element.flowElements ?? []) as Element[];
      const nested = this.importFlowElements(nestedElements, warn, expandedById, dataKindById, false);
      const isAdHoc = element.$type === "bpmn:AdHocSubProcess";
      if (!nested.nodes.length) {
        if (nestedElements.length) warn("unsupported", "Subprocess body has no supported nodes; only its outer node was imported", element.id);
        if (isAdHoc) {
          node.subProcess = {
            nodes: [],
            edges: [],
            expanded: expandedById.get(element.id) ?? false,
            subProcessType: "adHoc",
            ...(element.ordering !== undefined ? { ordering: element.ordering } : {}),
            ...(element.cancelRemainingInstances !== undefined ? { cancelRemainingInstances: element.cancelRemainingInstances === true } : {}),
            ...(body(element.completionCondition) !== undefined ? { completionCondition: body(element.completionCondition)! } : {}),
          };
        }
        if (element.triggeredByEvent || element.$type === "bpmn:Transaction") {
          warn("unsupported", "Empty event/transaction subprocess specialization is retained only in sourceXml", element.id);
        }
        return node;
      }
      node.subProcess = {
        nodes: nested.nodes,
        edges: nested.edges,
        expanded: expandedById.get(element.id) ?? false,
        ...(element.$type === "bpmn:Transaction" ? { subProcessType: "transaction" as const } : {}),
        ...(isAdHoc ? {
          subProcessType: "adHoc" as const,
          ...(element.ordering !== undefined ? { ordering: element.ordering } : {}),
          ...(element.cancelRemainingInstances !== undefined ? { cancelRemainingInstances: element.cancelRemainingInstances === true } : {}),
          ...(body(element.completionCondition) !== undefined ? { completionCondition: body(element.completionCondition)! } : {}),
        } : {}),
        ...(element.triggeredByEvent ? { subProcessType: "event" as const } : {}),
      };
      if (element.triggeredByEvent) {
        const starts = ((element.flowElements ?? []) as Element[]).filter((child) => child.$type === "bpmn:StartEvent");
        if (starts.length && starts.every((start) => start.isInterrupting === false)) {
          node.subProcess.interrupting = false;
        }
      }
    }
    return node;
  }

  private importDataAssociations(
    element: Element,
    node: INode,
    dataKindById: Map<string, DataKind>,
    warn: (code: ImportWarning["code"], message: string, elementId?: string) => void,
  ): void {
    for (const association of (element.dataInputAssociations ?? []) as Element[]) {
      const sources = (association.sourceRef ?? []) as unknown[];
      if (sources.length !== 1) {
        warn("unsupported", "Data input association requires exactly one source in JSON", association.id ?? element.id);
        continue;
      }
      const source = refId(sources[0]);
      const kind = source ? dataKindById.get(source) : undefined;
      if (!source || !kind) {
        warn("missing-reference", "Data input association source is not an imported data reference", association.id ?? element.id);
        continue;
      }
      const target = association.targetRef as Element | undefined;
      if (target?.$type !== "bpmn:Property" || !["__targetRef_placeholder", "__dataObject_targetRef_placeholder"].includes(target.name ?? "")) {
        warn("unsupported", "Data input target is not represented in JSON; only the source reference was imported", association.id ?? element.id);
      }
      if (association.assignment?.length || association.transformation) {
        warn("unsupported", "Data input transformation or assignment is retained only in sourceXml", association.id ?? element.id);
      }
      const refs = kind === "store" ? (node.dataInputs ??= []) : (node.dataObjectInputs ??= []);
      if (!refs.includes(source)) refs.push(source);
    }
    for (const association of (element.dataOutputAssociations ?? []) as Element[]) {
      const target = refId(association.targetRef);
      const kind = target ? dataKindById.get(target) : undefined;
      if (!target || !kind) {
        warn("missing-reference", "Data output association target is not an imported data reference", association.id ?? element.id);
        continue;
      }
      if (association.sourceRef?.length || association.assignment?.length || association.transformation) {
        warn("unsupported", "Data output source, transformation or assignment is retained only in sourceXml", association.id ?? element.id);
      }
      const refs = kind === "store" ? (node.dataOutputs ??= []) : (node.dataObjectOutputs ??= []);
      if (!refs.includes(target)) refs.push(target);
    }
  }

  private importEventOptions(definition: Element, type: EventDefinition): EventDefinitionOptions {
    const options: EventDefinitionOptions = {};
    if (type === "timer") {
      for (const key of ["timeDate", "timeDuration", "timeCycle"] as const) {
        const value = body(definition[key]);
        if (value !== undefined) options[key] = value;
      }
    }
    const messageRef = refId(definition.messageRef);
    const signalRef = refId(definition.signalRef);
    const errorRef = refId(definition.errorRef);
    const escalationRef = refId(definition.escalationRef);
    if (type === "message" && messageRef) options.messageRef = messageRef;
    if (type === "signal" && signalRef) options.signalRef = signalRef;
    if (type === "error" && errorRef) options.errorRef = errorRef;
    if (type === "escalation" && escalationRef) options.escalationRef = escalationRef;
    if (type === "compensation") {
      const activityRef = refId(definition.activityRef);
      if (activityRef) options.activityRef = activityRef;
      if (definition.waitForCompletion === false) options.waitForCompletion = false;
    }
    if (type === "link" && definition.name !== undefined) options.linkName = definition.name;
    return options;
  }
}
