import type { ReactNode } from 'react';

/** Labelled form field wrapper. Marks required fields with a red asterisk. */
export default function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="field-label">
        {label} {required && <span className="text-danger-600">*</span>}
      </div>
      {children}
    </div>
  );
}
