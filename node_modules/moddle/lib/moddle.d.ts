/**
 * Package definition
 */
/**
 * Set of extended parameters for package definition used in moddle-xml.
 */
/**
 * Type definition in declaration in package
 */
/**
 * Set of extended parameters for property definition used in moddle-xml.
 */
/**
 * Property definition of type definition
 */
/**
 *
 * A model that can be used to create elements of a specific type.
 *
 * @example
 *
 * import Moddle from 'moddle';
 *
 * var pkg = {
 *   name: 'mypackage',
 *   prefix: 'my',
 *   types: [
 *     { name: 'Root' }
 *   ]
 * };
 *
 * var moddle = new Moddle([pkg]);
 *
 */
export default class Moddle {
    /**
     * @param packages the packages to contain
     * @param config moddle configuration
     */
    constructor(packages: Array<PackageDefinition> | Record<string, PackageDefinition>, config?: {
        strict?: boolean;
    });
    properties: Readonly<Properties>;
    factory: Readonly<Factory>;
    registry: Readonly<Registry>;
    typeCache: Record<string, ModdleElementType>;
    config: Readonly<{
        readonly strict?: boolean;
    }>;
    /**
     * Create an instance of the specified type.
     *
     *
     * @example
     *
     * var foo = moddle.create('my:Foo');
     * var bar = moddle.create('my:Bar', { id: 'BAR_1' });
     *
     * @param  descriptor the type descriptor or name know to the model
     * @param  attrs a number of attributes to initialize the model instance with
     * @return model instance
     */
    create<T = Record<string, any>>(descriptor: string | EffectiveDescriptor, attrs?: Partial<T>): ModdleElement<T>;
    /**
     * Returns the type representing a given descriptor
     *
     *
     * @example
     *
     * var Foo = moddle.getType('my:Foo');
     * var foo = new Foo({ 'id' : 'FOO_1' });
     *
     * @param  descriptor the type descriptor or name know to the model
     * @return the type representing the descriptor
     */
    getType<T = Record<string, any>>(descriptor: string | EffectiveDescriptor): ModdleElementType<T>;
    /**
     * Creates an any-element type to be used within model instances.
     *
     * This can be used to create custom elements that lie outside the meta-model.
     * The created element contains all the meta-data required to serialize it
     * as part of meta-model elements.
     *
     *
     * @example
     *
     * var foo = moddle.createAny('vendor:Foo', 'http://vendor', {
     *   value: 'bar'
     * });
     *
     * var container = moddle.create('my:Container', 'http://my', {
     *   any: [ foo ]
     * });
     *
     * // go ahead and serialize the stuff
     *
     * @param  name  the name of the element
     * @param  nsUri the namespace uri of the element
     * @param  properties a map of properties to initialize the instance with
     * @return the any type instance
     */
    createAny<T = Record<string, any>>(name: string, nsUri: string, properties?: T): AnyModdleElement<T>;
    /**
     * Returns a registered package by uri or prefix
     * @param uriOrPrefix
     * @return the package
     */
    getPackage(uriOrPrefix: string): RegisteredPackage;
    /**
     * Returns a snapshot of all known packages
     *
     * @return the package
     */
    getPackages(): Readonly<Array<RegisteredPackage>>;
    /**
     * Returns the descriptor for an element
     * @param element
     * @return
     */
    getElementDescriptor(element: ModdleElement | ModdleElementType): EffectiveDescriptor;
    /**
     * Returns true if the given descriptor or instance
     * represents the given type.
     * @param element
     * @param type
     * @return
     */
    hasType(element: ModdleElement | ModdleElementType, type: string): boolean;
    /**
     * @param type
     * @return
     */
    hasType(type: string): boolean;
    /**
     * Returns the descriptor of an elements named property
     * @param element
     * @param property
     * @return
     */
    getPropertyDescriptor(element: ModdleElement | ModdleElementType, property: string): PropertyDescriptor;
    /**
     * Return registered type definition
     * @param type
     * @return
     */
    getTypeDescriptor(type: string): RegisteredTypeDef;
}

type RegisteredTypeDef = import("./registry.js").RegisteredTypeDef;
type RegisteredPackage = import("./registry.js").RegisteredPackage;
type BaseElement = import("./base.js").default;
type EffectiveDescriptor = import("./descriptor-builder.js").EffectiveDescriptor;
type AnyTypeDescriptor = import("./descriptor-builder.js").AnyTypeDescriptor;
type PropertyDescriptor = import("./descriptor-builder.js").PropertyDescriptor;
type ModdleElement<T = Record<string, any>> = import("./factory.js").ModdleElement<T>;
type ModdleElementType<T = Record<string, any>> = import("./factory.js").ModdleElementType<T>;
type AnyModdleElement<T = Record<string, any>> = import("./factory.js").AnyModdleElement<T>;

/**
 * Package definition
 */
export type PackageDefinition = {
    $schema?: string;
    name: string;
    prefix: string;
    types?: Array<TypeDefinition>;
    [key: string]: any;
} & PackageDefinitionXmlExtension;

/**
 * Set of extended parameters for package definition used in moddle-xml.
 */
export type PackageDefinitionXmlExtension = {
    uri?: string;
    xml?: {
        tagAlias?: "lowerCase";
        typePrefix?: string;
    };
};

/**
 * Type definition in declaration in package
 */
export type TypeDefinition = {
    name: string;
    isAbstract?: boolean;
    properties?: Array<PropertyDefinition>;
    superClass?: Array<string>;
    extends?: Array<string>;
    meta?: Record<string, any>;
    [key: string]: any;
};

/**
 * Set of extended parameters for property definition used in moddle-xml.
 */
export type PropertyDefinitionXmlExtension = {
    isBody?: boolean;
    isAttr?: boolean;
    xml?: {
        serialize?: string;
    };
};

/**
 * Property definition of type definition
 */
export type PropertyDefinition = {
    name: string;
    type: "String" | "Boolean" | "Integer" | "Real" | string;
    default?: string | boolean | number;
    isMany?: boolean;
    isReference?: boolean;
    isId?: boolean;
    redefines?: string;
    replaces?: string;
    [key: string]: any;
} & PropertyDefinitionXmlExtension;

import Properties from './properties.js';
import Factory from './factory.js';
import Registry from './registry.js';
