const unsafePathCharacters = /[\\\u0000-\u001f\u007f]|%5c/i;

export function safeInternalRedirect(value: unknown, fallback: string): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    unsafePathCharacters.test(value)
  ) {
    return fallback;
  }

  return value;
}
