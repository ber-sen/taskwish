export function uppercaseFirst(value: string): string {
  return value ? `${value[0]!.toUpperCase()}${value.slice(1)}` : value;
}

export function sentenceFromIdentifier(value: string): string {
  const sentence = value
    .replace(/[_-]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  return uppercaseFirst(sentence || value);
}
