import { Flow } from "npm:pocketflow";
import {
  Actions,
  VisualCheckNode,
  UpdateNewsNode,
  DelaySnapshotNode,
  HTMLParseNode,
  AIGenerateNode,
  HumanFeedbackNode,
} from "./nodes.ts";

const MAX_RETRIES = 3;

const visualCheckNode = new VisualCheckNode(MAX_RETRIES);
const updateNewsNode = new UpdateNewsNode(MAX_RETRIES);
const delaySnapshotNode = new DelaySnapshotNode(MAX_RETRIES);
const htmlParseNode = new HTMLParseNode(MAX_RETRIES);
const aiGenerateNode = new AIGenerateNode(MAX_RETRIES);
const humanFeedbackNode = new HumanFeedbackNode(MAX_RETRIES);

visualCheckNode.on(Actions.CheckPassed, updateNewsNode);
visualCheckNode.on(Actions.FirstCheckFailed, delaySnapshotNode);
visualCheckNode.on(Actions.DelaySnapshotCheckFailed, htmlParseNode);
visualCheckNode.on(Actions.HTMLParseCheckFailed, humanFeedbackNode);
visualCheckNode.on(Actions.AIGenerateCheckFailed, humanFeedbackNode);

delaySnapshotNode.on(Actions.NeedCheck, visualCheckNode);

htmlParseNode.on(Actions.NeedCheck, visualCheckNode);
htmlParseNode.on(Actions.HTMLParseCheckFailed, humanFeedbackNode);

aiGenerateNode.on(Actions.NeedCheck, visualCheckNode);
aiGenerateNode.on(Actions.AIGenerateCheckFailed, humanFeedbackNode);

export const flow = new Flow(visualCheckNode);
