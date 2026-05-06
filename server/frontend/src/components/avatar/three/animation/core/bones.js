export function getBone(vrm, name) {
  return (
    vrm.humanoid?.getNormalizedBoneNode?.(name) ||
    vrm.humanoid?.getRawBoneNode?.(name) ||
    null
  );
}

export function getExpressionNames(vrm) {
  const expressions = vrm.expressionManager?.expressions || [];
  return new Set(expressions.map((expression) => expression.expressionName));
}
