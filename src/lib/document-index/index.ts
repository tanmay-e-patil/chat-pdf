import "server-only";

export {
  ensureIndexed,
  indexStateOf,
  deleteDocumentIndex,
} from "./internal/lifecycle";
export type { IndexTrigger } from "./internal/lifecycle";
export { openIndex, prepareGroundedTurn } from "./internal/grounding";
export type {
  ReadyIndex,
  GroundedTurn,
  Conversation,
} from "./internal/grounding";
export type {
  IndexState,
  IndexFailureCode,
  Citation,
  ChatUIMessage,
  ChatMessageMetadata,
} from "./shared";
