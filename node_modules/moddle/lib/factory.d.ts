/**
 * A model element factory.
 *
 */
export default class Factory {
  /**
   * @param model
   * @param properties
   */
  constructor(model: Moddle, properties: Properties);

  /**
   * @param descriptor
   * @return
   */
  createType<T = Record<string, any>>(descriptor: EffectiveDescriptor): ModdleElementType<T>;
}

type Namespace = import("./ns.js").Namespace;
type Moddle = import("./moddle.js").default;
type Properties = import("./properties.js").default;
type EffectiveDescriptor = import("./registry.js").EffectiveDescriptor;
type BaseElement = import("./base.js").default;
type AnyTypeDescriptor = import("./descriptor-builder.js").AnyTypeDescriptor;

export type ModdleElementType<T = Record<string, any>> = {
    new (attrs?: Partial<T>): ModdleElement<T>;
    prototype: ModdleElement<T>;
    readonly $model: Moddle;
    readonly $descriptor: EffectiveDescriptor;
};

export type ModdleElement<T = Record<string, any>> = BaseElement & T & {
    readonly $model: Moddle;
    readonly $descriptor: EffectiveDescriptor;
    readonly $type: Namespace["name"];
    readonly $attrs: Record<string, any>;
    $parent?: ModdleElement | AnyModdleElement;
    hasType: Moddle["hasType"];
    $instanceOf: Moddle["hasType"];
};

export type AnyModdleElement<T = Record<string, any>> = BaseElement & T & {
    $type: string;
    $instanceOf: (type: string) => boolean;
    $parent?: ModdleElement | AnyModdleElement;
    readonly $model: Moddle;
    readonly $descriptor: AnyTypeDescriptor;
};
