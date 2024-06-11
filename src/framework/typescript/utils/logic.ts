/**
 * Returns the logical XOR of two boolean values.
 *
 * @param a - The first boolean value.
 * @param b - The second boolean value.
 * @returns The logical XOR of the two boolean values.
 */
export const xor = (a: boolean, b: boolean) => a !== b;

/**
 * Returns the logical XNOR of two boolean values.
 *
 * @param a - The first boolean value.
 * @param b - The second boolean value.
 * @returns The logical XNOR of the two boolean values.
 */
export const xnor = (a: boolean, b: boolean) => a === b;
