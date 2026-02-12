import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FEFCF9] to-cream text-textDark">
      <div className="mx-auto flex w-full max-w-md flex-col px-5 pb-24 pt-4">
        {children}
      </div>
    </div>
  );
}

export function AppBar({
  title,
  right,
}: {
  title: string | ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="sticky top-0 z-30 -mx-5 mb-6 flex items-center justify-between border-b border-creamDark bg-[#FEFCF9]/95 px-5 py-4 backdrop-blur-sm">
      <div className="text-base font-semibold uppercase tracking-wider text-gold">NR</div>
      <div className="text-base font-semibold text-textDark">{title}</div>
      <div className="flex min-w-[32px] items-center justify-end text-gold">
        {right}
      </div>
    </div>
  );
}

export function SectionCard({
  title,
  children,
  action,
}: {
  title?: string | ReactNode;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl3 border border-creamDark bg-white p-5 shadow-soft mb-4">
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between">
          {title && <h3 className="text-heading text-textDark">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="w-full rounded-xl bg-gold px-6 py-4 text-base font-semibold text-white shadow-medium transition-all hover:bg-goldLight active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ minHeight: '56px' }}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl border-2 border-gold px-6 py-4 text-base font-semibold text-gold transition-all hover:bg-gold/5 active:scale-[0.98]"
      style={{ minHeight: '56px' }}
    >
      {children}
    </button>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rounded-full border border-creamDark bg-cream px-4 py-2 text-sm text-textMedium">
      {children}
    </span>
  );
}

export function Field({
  label,
  children,
  required,
  hint,
}: {
  label: string;
  children: ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-3">
      <span className="text-base font-semibold text-textDark">
        {label}
        {required && <span className="text-gold ml-1">*</span>}
      </span>
      {hint && <span className="text-sm text-textLight">{hint}</span>}
      {children}
    </label>
  );
}

export function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  disabled,
  autoFocus,
  autoComplete,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  autoComplete?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      autoFocus={autoFocus}
      autoComplete={autoComplete}
      className="w-full rounded-xl border-2 border-creamDark bg-white px-4 py-4 text-base text-textDark placeholder:text-textLight outline-none transition-all focus:border-gold focus:shadow-soft disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ minHeight: '56px' }}
    />
  );
}

export function StickyFooter({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-creamDark bg-white/95 px-5 py-4 backdrop-blur-sm shadow-medium">
      <div className="mx-auto w-full max-w-md">{children}</div>
    </div>
  );
}
