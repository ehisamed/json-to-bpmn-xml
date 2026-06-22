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
    const elements = this.buildElements(model);
    const elementById = this.buildElementMap(elements);

    const flows = this.buildFlows(model, elementById);
    const flowMeta = this.buildFlowMeta(model, flows);
    const laneSets = this.buildLaneSets(model, elementById);

    const process = this.processBuilder.build(
      model.id,
      model.name,
      elements,
      flows,
      laneSets,
    );

    const collaboration = this.buildCollaboration(process);
    const definitions = this.definitionsBuilder.build(process, collaboration);

    definitions.diagrams = [
      await this.diagramBuilder.build(collaboration, process, elements, flowMeta, model.lanes ?? []),
    ];

    const { xml } = await this.moddle.toXML(definitions);
    return this.normalizeXml(xml);
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
    if (!model.lanes?.length) return [];

    const lanes = model.lanes.map((lane) => {
      const flowNodeRef = lane.nodeIds
        .map((nodeId) => elementById.get(String(nodeId)))
        .filter(Boolean);

      return this.moddle.create("bpmn:Lane", {
        id: lane.id,
        name: lane.name,
        flowNodeRef,
      });
    });

    return [
      this.moddle.create("bpmn:LaneSet", {
        id: "LaneSet_1",
        lanes,
      }),
    ];
  }

  private buildCollaboration(process: any) {
    const participant = this.moddle.create("bpmn:Participant", {
      id: `Participant_${process.id}`,
      name: "",
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
