/**
 * Re-export signals from @preact/signals-react
 * This allows us to switch implementation in the future if needed
 */
export { signal, computed, effect, batch } from '@preact/signals-react';
export type { Signal, ReadonlySignal } from '@preact/signals-react';
