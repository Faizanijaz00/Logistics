// Wizard engine — walks the decision tree given a running answers map and
// turns a reached leaf into the structured patch that powers the tracker.
// Pure functions, no UI. Duplicated in mobile/src/features/fines/wizardEngine.js.

import { tree, START_NODE, resolveAction } from './decisionTree.js';

export function getNode(id) {
  return tree[id] || null;
}

export function isLeaf(node) {
  return !!node && node.type === 'action';
}

// Add `days` to today, return YYYY-MM-DD (or null).
export function deadlineFromToday(days) {
  if (days == null) return null;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Build the ticket fields a reached leaf writes back. `answers` is the running
// map of { field: value } collected while walking, plus free-form details the
// UI gathered (vehicle_id, issuer_name, amounts, etc.).
export function buildLeafPatch(leafNode, answers) {
  const recommended = resolveAction(leafNode, answers);
  const deadline = deadlineFromToday(leafNode.deadlineDays);
  return {
    ...(leafNode.patch || {}),
    recommended_action: recommended,
    recommended_action_title: leafNode.title || '',
    action_status: 'needs_action',
    ...(deadline ? { key_deadline_date: deadline } : {}),
  };
}

// Given the id of a question/grounds node and the chosen option, return the
// next node id. For grounds nodes, `choice` is 'contest' | 'pay'.
export function nextNodeId(node, choice) {
  if (!node) return null;
  if (node.type === 'grounds') {
    return choice === 'contest' ? node.onContest : node.onPay;
  }
  if (node.type === 'question') {
    const opt = node.options.find(o => o.value === choice || o.label === choice);
    return opt ? opt.next : null;
  }
  return null;
}

export { START_NODE };
