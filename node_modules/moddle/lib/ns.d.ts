/**
 * Parses a namespaced attribute name of the form (ns:)localName to an object,
 * given a default prefix to assume in case no explicit namespace is given.
 *
 * @param name
 * @param defaultPrefix the default prefix to take, if none is present.
 *
 * @return the parsed name
 */
export function parseName(name: string, defaultPrefix?: string): Namespace;
export type Namespace = {
    name: string;
    prefix: string;
    localName: string;
};
