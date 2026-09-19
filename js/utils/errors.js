export class DomainError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "DomainError";
    this.code = code;
  }
}
export function requireDomain(condition, code, message) {
  if (!condition) throw new DomainError(code, message);
}
