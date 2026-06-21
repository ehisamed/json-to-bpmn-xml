/**
 * A utility that gets and sets properties of model elements.
 *
 */
export default class Properties {
    /**
     * @param model
     */
    constructor(model: Moddle);
    model: Moddle;
    /**
     * Sets a named property on the target element.
     * If the value is undefined, the property gets deleted.
     *
     * @param target
     * @param name
     * @param value
     */
    set(target: ModdleElement, name: string, value: any): void;
    /**
     * Returns the named property of the given element
     *
     * @param  target
     * @param  name
     *
     * @return
     */
    get(target: ModdleElement, name: string): any;
    /**
     * Define a property on the target element
     * @param  target
     * @param  name
     * @param  options
     */
    define<T = any>(target: NonNullable<T>, name: string, options: PropertyDescriptor): void;
    /**
     * Define the descriptor for an element
     * @param target
     * @param descriptor
     */
    defineDescriptor<T = any>(target: NonNullable<T>, descriptor: EffectiveDescriptor | AnyTypeDescriptor): void;
    /**
     * Define the model for an element
     * @param target
     * @param model
     */
    defineModel<T = any>(target: NonNullable<T>, model: Moddle): void;
    /**
     * Return property with the given name on the element.
     *
     * @param target
     * @param name
     *
     * @return property
     */
    getProperty(target: ModdleElement, name: string): PropertyDesc | null;
}

type Moddle = import("./moddle.js").default;
type PropertyDesc = import("./descriptor-builder.js").PropertyDescriptor;
type EffectiveDescriptor = import("./registry.js").EffectiveDescriptor;
type ModdleElement = import("./factory.js").ModdleElement;
type AnyTypeDescriptor = import("./descriptor-builder.js").AnyTypeDescriptor;
