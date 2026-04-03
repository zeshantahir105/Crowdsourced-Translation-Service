import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

export type LoadingButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  /** While loading, replaces label next to the spinner (defaults to `children` if omitted). */
  loadingLabel?: ReactNode;
};

/**
 * Disables the control while `loading` is true and shows an inline spinner so users see the request is in flight.
 */
export function LoadingButton({
  loading = false,
  loadingLabel,
  children,
  className = "",
  disabled,
  ...rest
}: LoadingButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 ${className}`.trim()}
    >
      {loading && <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />}
      {loading ? (loadingLabel ?? children) : children}
    </button>
  );
}
