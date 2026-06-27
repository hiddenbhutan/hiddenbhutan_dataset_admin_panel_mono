/**
 * Drop-in "+ Add" submit button for list pages.
 *
 * Wraps a server action that creates a draft row and redirects to its detail page.
 * Server actions can be passed directly as the form's action prop.
 */

import { Plus } from 'lucide-react';

const titleSmStyle: React.CSSProperties = { fontSize: '16px', fontWeight: 600, lineHeight: '24px' };

export default function AddNewForm({
  action,
  label,
}: {
  action: () => void | Promise<void>;
  label: string;
}) {
  return (
    <form action={action}>
      <button type="submit"
        className="bg-on-primary-fixed-variant text-tertiary-fixed hover:opacity-90 rounded-lg flex items-center gap-2 px-5 py-2 h-auto shadow-sm cursor-pointer"
        style={titleSmStyle}>
        <Plus size={16} />
        <span>{label}</span>
      </button>
    </form>
  );
}
