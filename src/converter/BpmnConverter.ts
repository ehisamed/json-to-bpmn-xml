import { BpmnModdle } from "bpmn-moddle";
import { NodeBuilder } from "../builders/node.builder";
import { FlowBuilder, type FlowMeta } from "../builders/flow.builder";
import { ProcessBuilder } from "../builders/process.builder";
import { DefinitionsBuilder } from "../builders/definitions.builder";
import { DiagramBuilder, type ProcessDiagramInput } from "../builders/diagram.builder";
import type { ProcessModel } from "../types/process";
import type { BPMNModdle, FlowNode } from "bpmn-moddle";
import format from "xml-formatter";
import { normalizeModel } from "../utils/normalize-model";
import type { DiColor } from "../types/di-color";

export class BpmnConverter {
  private moddle: BPMNModdle;
  private nodeBuilder: NodeBuilder;
  private flowBuilder: FlowBuilder;
  private processBuilder: ProcessBuilder;
  private definitionsBuilder: DefinitionsBuilder;
  private diagramBuilder: DiagramBuilder;

  constructor() {
    this.moddle = new BpmnModdle();
    this.nodeBuilder = new NodeBuilder(this.moddle);
    this.flowBuilder = new FlowBuilder(this.moddle);
    this.processBuilder = new ProcessBuilder(this.moddle);
    this.definitionsBuilder = new DefinitionsBuilder(this.moddle);
    this.diagramBuilder = new DiagramBuilder(this.moddle);
  }

  async convert(model: ProcessModel): Promise<string> {
    const normalized = normalizeModel(model);
    this.validate(normalized);

    const globalElementById = new Map<string, FlowNode>();
    const processDiagramInputs: ProcessDiagramInput[] = [];
    const bpmnProcesses: any[] = [];
    const participants: any[] = [];

    const dataStoreById = new Map<string, any>();
    const colorsById = new Map<string, DiColor>();

    for (const store of normalized.dataStores) {
      const attrs: Record<string, unknown> = { id: store.id };
      if (store.name !== undefined) attrs.name = store.name;
      dataStoreById.set(
        store.id,
        this.moddle.create("bpmn:DataStoreReference", attrs),
      );
      if (store.color) colorsById.set(store.id, store.color);
    }

    // Attach each data store to the first process that references it (or the first process).
    const storeOwner = new Map<string, string>();
    for (const processDef of normalized.processes) {
      for (const node of processDef.nodes) {
        for (const id of [
          ...(node.dataInputs ?? []),
          ...(node.dataOutputs ?? []),
        ]) {
          if (!storeOwner.has(id)) storeOwner.set(id, processDef.id);
        }
      }
    }

    for (const processDef of normalized.processes) {
      const elements = processDef.nodes.map((node) =>
        this.nodeBuilder.build(node),
      );
      for (const node of processDef.nodes) {
        if (node.color) colorsById.set(node.id, node.color);
      }
      const elementById = new Map(
        elements.map((el) => [String(el.id), el] as [string, FlowNode]),
      );

      for (const [id, el] of elementById) {
        globalElementById.set(id, el);
      }

      // Data associations
      for (const node of processDef.nodes) {
        const el: any = elementById.get(node.id);
        if (!el) continue;

        if (node.dataOutputs?.length) {
          el.dataOutputAssociations = node.dataOutputs.map((storeId) => {
            const store = dataStoreById.get(storeId);
            if (!store) {
              throw new Error(
                `Node "${node.id}" dataOutputs references unknown data store "${storeId}"`,
              );
            }
            return this.moddle.create("bpmn:DataOutputAssociation", {
              id: `DataOutput_${node.id}_${storeId}`,
              targetRef: store,
            });
          });
        }

        if (node.dataInputs?.length) {
          const property = this.moddle.create("bpmn:Property", {
            id: `Property_${node.id}_target`,
            name: "__targetRef_placeholder",
          });
          el.properties = [...(el.properties ?? []), property];
          el.dataInputAssociations = node.dataInputs.map((storeId) => {
            const store = dataStoreById.get(storeId);
            if (!store) {
              throw new Error(
                `Node "${node.id}" dataInputs references unknown data store "${storeId}"`,
              );
            }
            return this.moddle.create("bpmn:DataInputAssociation", {
              id: `DataInput_${node.id}_${storeId}`,
              sourceRef: [store],
              targetRef: property,
            });
          });
        }
      }

      const flows = processDef.edges.map((edge, index) =>
        this.flowBuilder.build(edge, elementById, index),
      );
      const flowMeta = processDef.edges.map((edge, index) =>
        this.flowBuilder.buildMeta(edge, flows[index], index),
      );

      const { laneSets, laneElements } = this.buildLaneSets(
        processDef,
        elementById,
      );

      const ownedStores = [...dataStoreById.entries()]
        .filter(([storeId]) => (storeOwner.get(storeId) ?? normalized.processes[0]!.id) === processDef.id)
        .map(([, store]) => store);

      const process = this.processBuilder.build(
        processDef.id,
        processDef.name,
        [...elements, ...ownedStores, ...flows],
        laneSets,
      );
      bpmnProcesses.push(process);

      const participant = this.moddle.create("bpmn:Participant", {
        id: processDef.participantId ?? `Participant_${processDef.id}`,
        name:
          processDef.participantName ??
          processDef.name ??
          normalized.name ??
          "",
        processRef: process,
      });
      participants.push(participant);

      processDiagramInputs.push({
        process,
        participant,
        elements,
        flows: flowMeta,
        laneElements,
        sourceLanes: processDef.lanes ?? [],
        sourceNodes: processDef.nodes,
        dataStoreElements: ownedStores,
      });
    }

    const messageFlowMetas = normalized.messageFlows.map((mf, index) => {
      const flow = this.flowBuilder.buildMessageFlow(
        mf,
        globalElementById,
        index,
      );
      return {
        id: String(mf.id ?? `MessageFlow_${index + 1}`),
        source: mf.source,
        target: mf.target,
        flow,
      };
    });

    const needsCollaboration =
      normalized.processes.length > 1 ||
      normalized.messageFlows.length > 0 ||
      normalized.processes.some((p) => (p.lanes?.length ?? 0) > 0);

    let collaboration: any = null;
    if (needsCollaboration) {
      collaboration = this.moddle.create("bpmn:Collaboration", {
        id: `Collab_${normalized.id}`,
        participants,
        messageFlows: messageFlowMetas.map((m) => m.flow),
      });
    }

    const rootElements = collaboration
      ? [collaboration, ...bpmnProcesses]
      : [...bpmnProcesses];

    const definitions = this.definitionsBuilder.build(
      normalized.id,
      rootElements,
      { withDiColors: colorsById.size > 0 },
    );

    const dataAssociationMetas = this.collectDataAssociationMetas(
      normalized,
      globalElementById,
      dataStoreById,
    );

    definitions.diagrams = [
      await this.diagramBuilder.build({
        collaboration,
        processes: processDiagramInputs,
        messageFlows: messageFlowMetas,
        dataAssociations: dataAssociationMetas,
        colorsById,
      }),
    ];

    const { xml } = await this.moddle.toXML(definitions);
    return this.normalizeXml(xml);
  }

  private collectDataAssociationMetas(
    normalized: ReturnType<typeof normalizeModel>,
    elementById: Map<string, FlowNode>,
    dataStoreById: Map<string, any>,
  ) {
    const metas: Array<{
      id: string;
      association: any;
      fromId: string;
      toId: string;
    }> = [];

    for (const processDef of normalized.processes) {
      for (const node of processDef.nodes) {
        const el: any = elementById.get(node.id);
        if (!el) continue;

        for (const assoc of el.dataOutputAssociations ?? []) {
          const storeId = String(assoc.targetRef?.id ?? "");
          metas.push({
            id: String(assoc.id),
            association: assoc,
            fromId: node.id,
            toId: storeId,
          });
        }

        for (const assoc of el.dataInputAssociations ?? []) {
          const source = assoc.sourceRef?.[0] ?? assoc.sourceRef;
          const storeId = String(source?.id ?? "");
          metas.push({
            id: String(assoc.id),
            association: assoc,
            fromId: storeId,
            toId: node.id,
          });
        }
      }
    }

    // Ensure stores exist
    for (const meta of metas) {
      if (!dataStoreById.has(meta.fromId) && !elementById.has(meta.fromId)) {
        // from is store for input, node for output — already validated at build
      }
    }

    return metas;
  }

  private validate(model: ReturnType<typeof normalizeModel>) {
    if (!model.id) {
      throw new Error("ProcessModel.id is required");
    }

    if (!model.processes.length) {
      throw new Error("ProcessModel must contain at least one process");
    }

    const allNodeIds = new Set<string>();
    const dataStoreIds = new Set(model.dataStores.map((d) => d.id));

    if (dataStoreIds.size !== model.dataStores.length) {
      throw new Error("ProcessModel.dataStores contains duplicate ids");
    }

    for (const processDef of model.processes) {
      if (!processDef.id) {
        throw new Error("Each process must have an id");
      }
      if (!processDef.nodes?.length) {
        throw new Error(`Process "${processDef.id}" must contain nodes`);
      }
      if (!Array.isArray(processDef.edges)) {
        throw new Error(`Process "${processDef.id}" edges must be an array`);
      }

      const nodeIds = new Set(processDef.nodes.map((n) => n.id));
      if (nodeIds.size !== processDef.nodes.length) {
        throw new Error(
          `Process "${processDef.id}" contains duplicate node ids`,
        );
      }

      for (const id of nodeIds) {
        if (allNodeIds.has(id)) {
          throw new Error(`Duplicate node id across processes: "${id}"`);
        }
        allNodeIds.add(id);
      }

      const laneIds = new Set((processDef.lanes ?? []).map((l) => l.id));
      if (laneIds.size !== (processDef.lanes?.length ?? 0)) {
        throw new Error(
          `Process "${processDef.id}" contains duplicate lane ids`,
        );
      }

      for (const node of processDef.nodes) {
        if (node.laneId && !laneIds.has(node.laneId)) {
          throw new Error(
            `Node "${node.id}" references unknown laneId "${node.laneId}"`,
          );
        }
        for (const storeId of [
          ...(node.dataInputs ?? []),
          ...(node.dataOutputs ?? []),
        ]) {
          if (!dataStoreIds.has(storeId)) {
            throw new Error(
              `Node "${node.id}" references unknown data store "${storeId}"`,
            );
          }
        }
      }

      for (const edge of processDef.edges) {
        if (!nodeIds.has(edge.source)) {
          throw new Error(
            `Edge "${edge.id ?? `${edge.source}->${edge.target}`}" has unknown source "${edge.source}"`,
          );
        }
        if (!nodeIds.has(edge.target)) {
          throw new Error(
            `Edge "${edge.id ?? `${edge.source}->${edge.target}`}" has unknown target "${edge.target}"`,
          );
        }
      }
    }

    for (const mf of model.messageFlows) {
      if (!allNodeIds.has(mf.source)) {
        throw new Error(
          `MessageFlow has unknown source "${mf.source}"`,
        );
      }
      if (!allNodeIds.has(mf.target)) {
        throw new Error(
          `MessageFlow has unknown target "${mf.target}"`,
        );
      }
    }
  }

  private buildLaneSets(
    processDef: { id: string; lanes?: { id: string; name: string }[]; nodes: { id: string; laneId?: string }[] },
    elementById: Map<string, FlowNode>,
  ) {
    if (!processDef.lanes?.length) {
      return { laneSets: [] as any[], laneElements: [] as any[] };
    }

    const laneElements = processDef.lanes.map((lane) => {
      const flowNodeRef = processDef.nodes
        .filter((node) => node.laneId === lane.id)
        .map((node) => elementById.get(node.id))
        .filter(Boolean);

      return this.moddle.create("bpmn:Lane", {
        id: lane.id,
        name: lane.name,
        flowNodeRef,
      });
    });

    const laneSets = [
      this.moddle.create("bpmn:LaneSet", {
        id: `LaneSet_${processDef.id}`,
        lanes: laneElements,
      }),
    ];

    return { laneSets, laneElements };
  }

  private normalizeXml(xml: string) {
    return format(xml, {
      indentation: "  ",
      collapseContent: true,
      lineSeparator: "\n",
    });
  }
}
