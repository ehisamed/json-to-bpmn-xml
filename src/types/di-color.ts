/**
 * Diagram (DI) colors compatible with bpmn.io bioc + OMG color extensions.
 *
 * Emitted on `bpmndi:BPMNShape` as:
 * - `bioc:stroke` / `bioc:fill`
 * - `color:border-color` / `color:background-color`
 */
export type DiColor = {
  /** Border / stroke (hex, e.g. `#0d4372`). */
  stroke?: string;
  /** Fill / background (hex, e.g. `#bbdefb`). */
  fill?: string;
};

/** Apply bioc + color attributes onto a BPMNShape (or any moddle element with $attrs). */
export function applyDiColor(shape: any, color?: DiColor) {
  if (!color) return;
  if (!shape.$attrs) shape.$attrs = {};

  if (color.stroke) {
    shape.$attrs["bioc:stroke"] = color.stroke;
    shape.$attrs["color:border-color"] = color.stroke;
  }
  if (color.fill) {
    shape.$attrs["bioc:fill"] = color.fill;
    shape.$attrs["color:background-color"] = color.fill;
  }
}

export const BIOC_NS = "http://bpmn.io/schema/bpmn/biocolor/1.0";
export const COLOR_NS = "http://www.omg.org/spec/BPMN/non-normative/color/1.0";
