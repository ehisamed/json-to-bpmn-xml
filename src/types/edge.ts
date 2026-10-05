export interface IEdge {
  id?: string;
  source: string;
  target: string;
  name?: string;
  /** Expression evaluated when this sequence flow is taken. */
  condition?: string;
  /** Marks this flow as the source node's default outgoing flow. */
  isDefault?: boolean;
}
