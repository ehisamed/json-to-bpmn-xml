/**
 * Registered package definition
 */
/**
 * Registered type definition
 */
/**
 * Registered property definition
 */
/**
 * A registry of Moddle packages.
 *
 */
export default class Registry {
  /**
   * @param packages
   * @param properties
   */
  constructor(packages: Array<PackageDefinition> | Record<string, PackageDefinition>, properties: Properties);

  typeMap: Record<string, RegisteredTypeDef>;

  /**
   * @param uriOrPrefix uri or prefix of package
   * @return registered package
   */
  getPackage(uriOrPrefix: string): RegisteredPackage;

  /**
   * @return all registered packages
   */
  getPackages(): Array<RegisteredPackage>;

  /**
   * Returns the effective descriptor for a type.
   * @param  name the namespaced name (ns:localName) of the type
   * @return the resulting effective descriptor
   */
  getEffectiveDescriptor(name: Namespace["name"]): EffectiveDescriptor;
}

type Namespace = import("./ns.js").Namespace;
type PackageDefinition = import("./moddle.js").PackageDefinition;
type TypeDefinition = import("./moddle.js").TypeDefinition;
type PropertyDefinition = import("./moddle.js").PropertyDefinition;
type Properties = import("./properties.js").default;
type EffectiveDescriptor = import("./descriptor-builder.js").EffectiveDescriptor;

/**
 * Registered package definition
 */
export type RegisteredPackage = Omit<PackageDefinition, "types"> & {
    types?: Array<RegisteredTypeDef>;
};

/**
 * Registered type definition
 */
export type RegisteredTypeDef = Omit<TypeDefinition, "properties"> & {
    properties?: Array<RegisteredPropertyDef>;
    propertiesByName?: Record<string, RegisteredPropertyDef>;
    superClass?: Array<string>;
    extends?: Array<string>;
    meta?: Record<string, any>;
    traits?: Array<string>;
    ns?: Namespace;
    readonly $pkg?: RegisteredPackage;
};

/**
 * Registered property definition
 */
export type RegisteredPropertyDef = PropertyDefinition & {
    ns: Namespace;
};
