export function toIsoBirthDate(displayDate: string): string | undefined {
  const parts = displayDate.trim().split('/');
  if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
    return undefined;
  }

  const [dayText, monthText, yearText] = parts;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);

  if (
    !Number.isSafeInteger(day) ||
    !Number.isSafeInteger(month) ||
    !Number.isSafeInteger(year) ||
    year < 1900 ||
    year > new Date().getUTCFullYear()
  ) {
    return undefined;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return undefined;
  }

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
