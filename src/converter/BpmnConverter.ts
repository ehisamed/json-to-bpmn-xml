import { BpmnModdle } from "bpmn-moddle";
import { NodeBuilder } from "../builders/node.builder";
import { FlowBuilder } from "../builders/flow.builder";
import { ProcessBuilder } from "../builders/process.builder";
import { DefinitionsBuilder } from "../builders/definitions.builder";
import { DiagramBuilder } from "../builders/diagram.builder";
import { ProcessModel } from "../types/process";
import type { BPMNModdle, FlowNode } from "bpmn-moddle";
import format from "xml-formatter";

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
    this.validate(model);

    const elements = this.buildElements(model);
    const elementById = this.buildElementMap(elements);

    const flows = this.buildFlows(model, elementById);
    const flowMeta = this.buildFlowMeta(model, flows);
    const { laneSets, laneElements } = this.buildLaneSets(model, elementById);

    const process = this.processBuilder.build(
      model.id,
      model.name,
      elements,
      flows,
      laneSets,
    );

    const hasLanes = laneElements.length > 0;
    const collaboration = hasLanes
      ? this.buildCollaboration(process, model.name)
      : null;

    const definitions = this.definitionsBuilder.build(
      process,
      collaboration ?? undefined,
    );

    definitions.diagrams = [
      await this.diagramBuilder.build({
        process,
        collaboration,
        elements,
        flows: flowMeta,
        laneElements,
        sourceLanes: model.lanes ?? [],
        sourceNodes: model.nodes,
      }),
    ];

    const { xml } = await this.moddle.toXML(definitions);
    return this.normalizeXml(xml);
  }

  private validate(model: ProcessModel) {
    if (!model.id) {
      throw new Error("ProcessModel.id is required");
    }

    if (!Array.isArray(model.nodes) || model.nodes.length === 0) {
      throw new Error("ProcessModel.nodes must contain at least one node");
    }

    if (!Array.isArray(model.edges)) {
      throw new Error("ProcessModel.edges must be an array");
    }

    const nodeIds = new Set(model.nodes.map((node) => node.id));
    if (nodeIds.size !== model.nodes.length) {
      throw new Error("ProcessModel.nodes contains duplicate ids");
    }

    const laneIds = new Set((model.lanes ?? []).map((lane) => lane.id));
    if (laneIds.size !== (model.lanes?.length ?? 0)) {
      throw new Error("ProcessModel.lanes contains duplicate ids");
    }

    for (const node of model.nodes) {
      if (node.laneId && !laneIds.has(node.laneId)) {
        throw new Error(
          `Node "${node.id}" references unknown laneId "${node.laneId}"`,
        );
      }
    }

    for (const edge of model.edges) {
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

  private buildElements(model: ProcessModel) {
    return model.nodes.map((node) => this.nodeBuilder.build(node));
  }

  private buildElementMap(elements: any[]) {
    return new Map(
      elements.map((el) => [String(el.id), el] as [string, FlowNode]),
    );
  }

  private buildFlows(model: ProcessModel, elementById: Map<string, FlowNode>) {
    return model.edges.map((edge, index) =>
      this.flowBuilder.build(edge, elementById, index),
    );
  }

  private buildFlowMeta(model: ProcessModel, flows: any[]) {
    return model.edges.map((edge, index) =>
      this.flowBuilder.buildMeta(edge, flows[index], index),
    );
  }

  private buildLaneSets(
    model: ProcessModel,
    elementById: Map<string, FlowNode>,
  ) {
    if (!model.lanes?.length) {
      return { laneSets: [] as any[], laneElements: [] as any[] };
    }

    const laneElements = model.lanes.map((lane) => {
      const flowNodeRef = model.nodes
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
        id: "LaneSet_1",
        lanes: laneElements,
      }),
    ];

    return { laneSets, laneElements };
  }

  private buildCollaboration(process: any, processName?: string) {
    const participant = this.moddle.create("bpmn:Participant", {
      id: `Participant_${process.id}`,
      name: processName ?? process.name ?? "",
      processRef: process,
    });

    return this.moddle.create("bpmn:Collaboration", {
      id: `Collab_${process.id}`,
      participants: [participant],
    });
  }

  private normalizeXml(xml: string) {
    return format(xml, {
      indentation: "  ",
      collapseContent: true,
      lineSeparator: "\n",
    });
  }
}
