import type { Conversation } from '../types';

export interface ConversationGroup {
  label: string;
  items: Conversation[];
}

/** Buckets conversations like ChatGPT's sidebar: Today, Yesterday, Previous 7 days, ... */
export function groupByDate(items: Conversation[], now = new Date()): ConversationGroup[] {
  const day = 24 * 60 * 60 * 1000;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const buckets: ConversationGroup[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Previous 7 days', items: [] },
    { label: 'Previous 30 days', items: [] },
    { label: 'Older', items: [] },
  ];
  for (const c of items) {
    const t = new Date(c.updated_at).getTime();
    if (t >= startOfToday) buckets[0].items.push(c);
    else if (t >= startOfToday - day) buckets[1].items.push(c);
    else if (t >= startOfToday - 7 * day) buckets[2].items.push(c);
    else if (t >= startOfToday - 30 * day) buckets[3].items.push(c);
    else buckets[4].items.push(c);
  }
  return buckets.filter((b) => b.items.length > 0);
}
