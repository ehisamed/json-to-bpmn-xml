/**
 * Convert given value to string
 * @param type
 * @param value
 * @return
 */
export function coerceType(type: StringType, value: any): string;

/**
 * Convert given value to boolean
 * @param type
 * @param value
 * @return
 */
export function coerceType(type: BooleanType, value: any): boolean;

/**
 * Convert given value to number
 * @param type
 * @param value
 * @return
 */
export function coerceType(type: IntegerType | RealType, value: any): number;

/**
 * Convert a type to its real representation
 * @param type
 * @param value
 * @return
 */
export function coerceType<T>(type: Exclude<string,BuiltInSimpleType>, value: T): T;

/**
 * Return whether the given type is built-in
 * @param type
 * @return
 */
export function isBuiltIn(type: BuiltInType): true;

/**
 * Return whether the given type is built-in
 * @param type
 * @return
 */
export function isBuiltIn(type: Exclude<string, BuiltInType>): false;

/**
 * Return true if the given type is simple
 * @param type
 * @return
 */
export function isSimple(type: BuiltInSimpleType): true;

/**
 * Return false the given type is not simple
 * @param type
 * @return
 */
export function isSimple(type: Exclude<string, BuiltInSimpleType>): false;

export type StringType = "String";
export type BooleanType = "Boolean";
export type IntegerType = "Integer";
export type RealType = "Real";
export type ElementType = "Element";
export type BuiltInSimpleType = StringType | BooleanType | IntegerType | RealType;
export type BuiltInType = BuiltInSimpleType | ElementType;
