// src/converter/BpmnConverter.ts
import { BpmnModdle } from "bpmn-moddle";

// src/constants/node-map.ts
var NODE_MAP = {
  start: "bpmn:StartEvent",
  end: "bpmn:EndEvent",
  userTask: "bpmn:UserTask",
  serviceTask: "bpmn:ServiceTask",
  exclusiveGateway: "bpmn:ExclusiveGateway",
  parallelGateway: "bpmn:ParallelGateway"
};

// src/builders/node.builder.ts
var NodeBuilder = class {
  constructor(moddle) {
    this.moddle = moddle;
  }
  moddle;
  build(node) {
    const type = NODE_MAP[node.type];
    return this.moddle.create(type, {
      id: node.id,
      name: node.name
    });
  }
};

// src/builders/flow.builder.ts
var FlowBuilder = class {
  constructor(moddle) {
    this.moddle = moddle;
  }
  moddle;
  build(edge, elementById, index) {
    const source = elementById.get(String(edge.source));
    const target = elementById.get(String(edge.target));
    const flow = this.moddle.create("bpmn:SequenceFlow", {
      id: edge.id ?? `Flow_${index + 1}`,
      name: edge.name,
      sourceRef: source,
      targetRef: target
    });
    if (source) {
      source.outgoing = [...source.outgoing ?? [], flow];
    }
    if (target) {
      target.incoming = [...target.incoming ?? [], flow];
    }
    return flow;
  }
  buildMeta(edge, flow, index) {
    return {
      id: String(edge.id ?? `Flow_${index + 1}`),
      source: String(edge.source),
      target: String(edge.target),
      flow
    };
  }
};

// src/builders/process.builder.ts
var ProcessBuilder = class {
  constructor(moddle) {
    this.moddle = moddle;
  }
  moddle;
  build(id, name, elements, flows) {
    return this.moddle.create("bpmn:Process", {
      id,
      name,
      isExecutable: false,
      flowElements: [...elements, ...flows]
    });
  }
};

// src/builders/definitions.builder.ts
var DefinitionsBuilder = class {
  constructor(moddle) {
    this.moddle = moddle;
  }
  moddle;
  build(process) {
    return this.moddle.create("bpmn:Definitions", {
      id: `${process.id}_definitions`,
      targetNamespace: "http://bpmn.io/schema/bpmn",
      rootElements: [process],
      $attrs: {
        "xsi:schemaLocation": "http://www.omg.org/spec/BPMN/20100524/MODEL BPMN20.xsd"
      }
    });
  }
};

// src/elk.layout.ts
import ELK from "elkjs";
var elk = new ELK();
async function layoutGraph(nodes, edges) {
  const graph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.layered.spacing.nodeNodeBetweenLayers": "120",
      "elk.spacing.nodeNode": "80",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
      "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
      "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES"
    },
    children: nodes.map((n) => ({
      id: n.id,
      width: n.width ?? 120,
      height: n.height ?? 80
    })),
    edges: edges.map((e) => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
      junctionPoints: []
    }))
  };
  return await elk.layout(graph);
}

// src/builders/diagram.builder.ts
var NODE_SIZE = {
  default: { width: 100, height: 80 },
  start: { width: 36, height: 36 },
  end: { width: 36, height: 36 },
  gateway: { width: 50, height: 50 }
};
function getBounds(type) {
  if (type === "bpmn:StartEvent" || type === "bpmn:EndEvent") {
    return NODE_SIZE.start;
  }
  if (type.endsWith("Gateway")) {
    return NODE_SIZE.gateway;
  }
  return NODE_SIZE.default;
}
var DiagramBuilder = class {
  constructor(moddle) {
    this.moddle = moddle;
  }
  moddle;
  async build(process, elements, flows) {
    const nodes = elements.map((el) => {
      const bounds = getBounds(el.$type);
      return {
        id: String(el.id),
        width: bounds.width,
        height: bounds.height,
        bpmnElement: el
      };
    });
    const edges = flows.map((flow) => ({
      id: String(flow.id),
      source: String(flow.source),
      target: String(flow.target),
      flow: flow.flow
    }));
    const layout = await layoutGraph(nodes, edges);
    const nodeMap = new Map(
      (layout.children ?? []).filter((n) => n && n.id).map((n) => [String(n.id), n])
    );
    const shapes = elements.map((element) => {
      const pos = nodeMap.get(String(element.id));
      if (!pos) return null;
      const bounds = {
        x: Number(pos.x ?? 0),
        y: Number(pos.y ?? 0),
        width: Number(pos.width ?? NODE_SIZE.default.width),
        height: Number(pos.height ?? NODE_SIZE.default.height)
      };
      return this.moddle.create("bpmndi:BPMNShape", {
        id: `${element.id}_di`,
        bpmnElement: element,
        bounds: this.moddle.create("dc:Bounds", bounds)
      });
    }).filter(Boolean);
    const flowById = new Map(edges.map((f) => [String(f.id), f.flow]));
    const edgeWaypoints = (layout.edges ?? []).map((edge) => {
      if (!edge || !edge.id) return null;
      const section = edge.sections?.[0];
      if (!section) return null;
      const points = [
        section.startPoint,
        ...section.bendPoints ?? [],
        section.endPoint
      ].filter(
        (point) => point && point.x !== void 0 && point.y !== void 0 && !Number.isNaN(Number(point.x)) && !Number.isNaN(Number(point.y))
      ).map((point) => ({
        x: Number(point.x),
        y: Number(point.y)
      }));
      if (points.length < 2) return null;
      const flow = flowById.get(String(edge.id)) ?? edges.find(
        (f) => String(f.source) === String(edge.sources?.[0]) && String(f.target) === String(edge.targets?.[0])
      )?.flow;
      if (!flow) return null;
      return this.moddle.create("bpmndi:BPMNEdge", {
        id: `${edge.id}_di`,
        bpmnElement: flow,
        waypoint: points.map(
          (point) => this.moddle.create("dc:Point", {
            x: point.x,
            y: point.y
          })
        )
      });
    }).filter(Boolean);
    const plane = this.moddle.create("bpmndi:BPMNPlane", {
      id: "BPMNPlane_1",
      bpmnElement: process,
      planeElement: [...shapes, ...edgeWaypoints]
    });
    return this.moddle.create("bpmndi:BPMNDiagram", {
      id: "BPMNDiagram_1",
      plane
    });
  }
};

// src/converter/BpmnConverter.ts
import format from "xml-formatter";
var BpmnConverter = class {
  moddle;
  nodeBuilder;
  flowBuilder;
  processBuilder;
  definitionsBuilder;
  diagramBuilder;
  constructor() {
    this.moddle = new BpmnModdle();
    this.nodeBuilder = new NodeBuilder(this.moddle);
    this.flowBuilder = new FlowBuilder(this.moddle);
    this.processBuilder = new ProcessBuilder(this.moddle);
    this.definitionsBuilder = new DefinitionsBuilder(this.moddle);
    this.diagramBuilder = new DiagramBuilder(this.moddle);
  }
  async convert(model) {
    const elements = this.buildElements(model);
    const elementById = this.buildElementMap(elements);
    const flows = this.buildFlows(model, elementById);
    const flowMeta = this.buildFlowMeta(model, flows);
    const process = this.processBuilder.build(
      model.id,
      model.name,
      elements,
      flows
    );
    const definitions = this.definitionsBuilder.build(process);
    definitions.diagrams = [
      await this.diagramBuilder.build(process, elements, flowMeta)
    ];
    const { xml } = await this.moddle.toXML(definitions);
    return this.normalizeXml(xml);
  }
  buildElements(model) {
    return model.nodes.map((node) => this.nodeBuilder.build(node));
  }
  buildElementMap(elements) {
    return new Map(
      elements.map((el) => [String(el.id), el])
    );
  }
  buildFlows(model, elementById) {
    return model.edges.map(
      (edge, index) => this.flowBuilder.build(edge, elementById, index)
    );
  }
  buildFlowMeta(model, flows) {
    return model.edges.map(
      (edge, index) => this.flowBuilder.buildMeta(edge, flows[index], index)
    );
  }
  normalizeXml(xml) {
    return format(xml, {
      indentation: "  ",
      collapseContent: true,
      lineSeparator: "\n"
    });
  }
};

// src/index.ts
async function convert(model) {
  const converter = new BpmnConverter();
  return await converter.convert(model);
}
export {
  convert
};
//# sourceMappingURL=index.js.map