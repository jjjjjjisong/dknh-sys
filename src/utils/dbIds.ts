export function toNullableDbId(value: string | number | null | undefined): string | number | null {
  if (value === null || value === undefined) return null;

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const normalized = value.trim();
  if (!normalized) return null;

  if (/^\d+$/.test(normalized)) {
    const asNumber = Number(normalized);
    return Number.isSafeInteger(asNumber) ? asNumber : normalized;
  }

  return normalized;
}
