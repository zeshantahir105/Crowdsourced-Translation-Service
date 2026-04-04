import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Max width of the content column (card lives inside). */
  maxWidthClass?: "max-w-md" | "max-w-lg";
  /** When true, center content vertically and horizontally (e.g. OAuth callback). */
  centered?: boolean;
};

/**
 * Full-viewport auth shell: matches body background so no half-height banding on mobile / nested routes.
 */
export function AuthScaffold({ children, maxWidthClass = "max-w-md", centered }: Props) {
  if (centered) {
    return (
      <div className="flex min-h-dvh flex-1 w-full flex-col items-center justify-center bg-lh-sidebar px-4 py-8">
        {children}
      </div>
    );
  }
  return (
    <div className="flex min-h-dvh flex-1 w-full flex-col justify-center bg-lh-sidebar px-4 py-8 sm:py-10">
      <div className={`mx-auto w-full ${maxWidthClass}`}>{children}</div>
    </div>
  );
}
