import { distance } from "./fastest-levenshtein/index.js";

function iterable(v) {
  if (v instanceof String) return false;
  return !!v.__proto__.constructor?.prototype[Symbol.iterator];
}

function primitiveForHashing(v) {
  if (typeof v === `boolean`) return true;
  if (typeof v === `number`) return true;
  if (typeof v === `bigint`) return true;
  if (typeof v === `string` || v instanceof String) return true;
  if (iterable(v)) return true;
  return false;
}

export function findSubtree(subtree, tree) {
  const roots = getRoots("", tree);
  const matches = roots.map((node) => computeMatch(node, subtree));
  return matches.sort((a, b) => a.match - b.match)[0];
}

function getRoots(prop, tree, nodes = []) {
  if (!!prop) nodes.push([prop, tree]);
  Object.entries(tree).forEach(([k, v]) => {
    if (!primitiveForHashing(v)) {
      getRoots(`${prop}.${k}`, v, nodes);
    }
  });
  return nodes;
}

function computeMatch(node, subtree) {
  const jsonWithFunctions = (_, data) =>
    typeof data === `function` ? data.toString() : data;
  const nodeString = JSON.stringify(node[1], jsonWithFunctions);
  const subtreeString = JSON.stringify(subtree, jsonWithFunctions);
  const match = distance(subtreeString, nodeString);
  return { node, match };
}
