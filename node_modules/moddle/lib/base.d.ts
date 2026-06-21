/**
 * Moddle base element.
 */
export default class Base {
    /**
     *
     * Get property value (typed)
     *
     *
     * @param name
     *
     * @return
     */
    get<K extends keyof this>(name: K): this[K];
    /**
     *
     * Get property value
     *
     *
     * @param name
     *
     * @return
     */
    get<T>(name: string): T;
    /**
     * Get property value
     *
     *
     * @param name
     *
     * @return
     */
    get(name: string): unknown;
    /**
     *
     * Set property value
     *
     *
     * @param name
     * @param value
     */
    set<K extends keyof this, V extends this[K]>(name: K, value: V): any;
    /**
     *
     * Set property value
     *
     *
     * @param name
     * @param value
     */
    set<S extends string>(name: S extends keyof this ? never : S, value: any): any;
}
