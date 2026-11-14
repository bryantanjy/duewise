import type { RepeatType } from './recurrence';

type ReminderTemplate = {
  id: string;
  label: string;
  summary: string;
  name: string;
  categoryName: string;
  dateType: 'expiry' | 'renewal' | 'birthday';
  repeatType: RepeatType;
  reminderDays: readonly number[];
};

export const REMINDER_TEMPLATES: readonly ReminderTemplate[] = [
  { id: 'passport', label: 'Passport', summary: 'One-time · 180, 90, 30 days before and due day',
    name: 'Passport expiry', categoryName: 'Document', dateType: 'expiry', repeatType: 'none', reminderDays: [180, 90, 30, 0] },
  { id: 'insurance', label: 'Insurance', summary: 'Yearly · 30, 7, 1 days before and due day',
    name: 'Insurance renewal', categoryName: 'Document', dateType: 'renewal', repeatType: 'yearly', reminderDays: [30, 7, 1, 0] },
  { id: 'subscription', label: 'Subscription', summary: 'Monthly · 3, 1 days before and due day',
    name: 'Subscription renewal', categoryName: 'Subscription', dateType: 'renewal', repeatType: 'monthly', reminderDays: [3, 1, 0] },
  { id: 'warranty', label: 'Warranty', summary: 'One-time · 30, 7 days before and due day',
    name: 'Warranty expiry', categoryName: 'Warranty', dateType: 'expiry', repeatType: 'none', reminderDays: [30, 7, 0] },
  { id: 'birthday', label: 'Birthday', summary: 'Yearly · 7, 1 days before and due day',
    name: 'Birthday', categoryName: 'Other', dateType: 'birthday', repeatType: 'yearly', reminderDays: [7, 1, 0] },
];

export function templateFormValues(templateId: string, categories: readonly { id: number; name: string }[],
  current: { name: string; categoryId: number | undefined; previousTemplateId?: string }) {
  const template = REMINDER_TEMPLATES.find(({ id }) => id === templateId);
  if (!template) return undefined;
  const previousName = REMINDER_TEMPLATES.find(({ id }) => id === current.previousTemplateId)?.name;
  return {
    name: current.name.trim() && current.name !== previousName ? current.name : template.name,
    categoryId: categories.find(({ name }) => name === template.categoryName)?.id ?? current.categoryId,
    dateType: template.dateType,
    repeatType: template.repeatType,
    repeatInterval: '1',
    reminderDays: [...template.reminderDays],
  };
}
