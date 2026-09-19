export type ItemFormField = 'category' | 'name' | 'reminderDays' | 'targetDate';

export type ItemFormInput = {
  categoryId: number | undefined;
  name: string;
  reminderDays: string;
  targetDate: string;
};

export type ItemFormValidation = {
  fieldErrors: Partial<Record<ItemFormField, string>>;
  parsedReminderDays?: number[];
};

export function toStoredDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseStoredDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined;
  }

  return date;
}

export function formatDateForDisplay(value: string, locale?: string) {
  const date = parseStoredDate(value);
  if (!date) return 'Choose a date';

  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function parseReminderDays(value: string) {
  if (!value.trim()) return { values: [] };

  const parts = value.split(',').map((part) => part.trim());
  if (parts.some((part) => !/^\d+$/.test(part))) {
    return { error: 'Use whole numbers separated by commas.' };
  }

  const values = parts.map(Number);
  if (values.some((days) => days < 0 || days > 3650)) {
    return { error: 'Use values from 0 to 3650 days.' };
  }

  return { values: [...new Set(values)].sort((left, right) => right - left) };
}

export function validateItemForm(input: ItemFormInput): ItemFormValidation {
  const fieldErrors: ItemFormValidation['fieldErrors'] = {};

  if (!input.name.trim()) fieldErrors.name = 'Enter an item name.';
  if (input.categoryId === undefined) fieldErrors.category = 'Choose a category.';
  if (!parseStoredDate(input.targetDate)) {
    fieldErrors.targetDate = 'Choose a valid target date.';
  }

  const reminderResult = parseReminderDays(input.reminderDays);
  if (reminderResult.error) fieldErrors.reminderDays = reminderResult.error;

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  return {
    fieldErrors,
    parsedReminderDays: reminderResult.values ?? [],
  };
}
