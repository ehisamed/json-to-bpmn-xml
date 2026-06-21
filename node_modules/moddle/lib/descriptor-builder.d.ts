/**
 * Effective element descriptor
 * aka element type descriptor
 * aka element descriptor
 */
/**
 * Property descriptor
 */
/**
 * A utility to build element descriptors.
 */
export default class DescriptorBuilder {
  /**
   * @param nameNs
   */
  constructor(nameNs: Namespace);

  /**
   * @return
   */
  build(): EffectiveDescriptor;

  /**
   * Add property at given index.
   *
   * @param p
   * @param idx
   * @param validate
   */
  addProperty(p: PropertyDescriptor, idx?: number, validate?: boolean): void;

  /**
   * @param oldProperty
   * @param newProperty
   * @param replace
   */
  replaceProperty(oldProperty: PropertyDescriptor, newProperty: PropertyDescriptor, replace: string): void;

  /**
   * @param p
   * @param targetPropertyName
   * @param replace
   */
  redefineProperty(p: PropertyDescriptor, targetPropertyName: string, replace: string): void;

  /**
   * @param p
   * @param validate
   */
  addNamedProperty(p: PropertyDescriptor, validate: boolean): void;

  /**
   * @param p
   */
  removeNamedProperty(p: RegisteredPropertyDef): void;

  /**
   * @param p
   * @param validate
   */
  setBodyProperty(p: PropertyDescriptor, validate?: boolean): void;

  bodyProperty: PropertyDescriptor;

  /**
   * @param p
   * @param validate
   */
  setIdProperty(p: PropertyDescriptor, validate?: boolean): void;

  idProperty: PropertyDescriptor;

  /**
   * @param typeDescriptor
   */
  assertNotTrait(typeDescriptor: RegisteredTypeDef): void;

  /**
   * @param p
   */
  assertNotDefined(p: PropertyDescriptor): void;

  /**
   * @param name
   * @return
   */
  hasProperty(name: string): PropertyDescriptor;

  /**
   * @param t
   * @param inherited
   */
  addTrait(t: RegisteredTypeDef, inherited: boolean): void;
}

type Namespace = import("./ns.js").Namespace;
type RegisteredPackage = import("./registry.js").RegisteredPackage;
type RegisteredTypeDef = import("./registry.js").RegisteredTypeDef;
type RegisteredPropertyDef = import("./registry.js").RegisteredPropertyDef;

/**
 * Effective element descriptor
 * aka element type descriptor
 * aka element descriptor
 */
export type EffectiveDescriptor = {
    readonly ns: Namespace;
    readonly name: Namespace["name"];
    readonly allTypes: Array<RegisteredTypeDef>;
    readonly allTypesByName: Record<string, RegisteredTypeDef>;
    readonly properties: Array<PropertyDescriptor>;
    readonly propertiesByName: Record<string, PropertyDescriptor>;
    readonly bodyProperty?: PropertyDescriptor;
    readonly idProperty?: PropertyDescriptor;
    readonly $pkg?: RegisteredPackage;
};

/**
 * Property descriptor
 */
export type PropertyDescriptor = RegisteredPropertyDef & {
    localName: Namespace["localName"];
    inherited?: boolean;
    definedBy?: RegisteredTypeDef;
};

export type AnyTypeDescriptor = {
    name: string;
    isGeneric: true;
    ns: {
        prefix: string;
        localName: string;
        uri: string;
    };
};
