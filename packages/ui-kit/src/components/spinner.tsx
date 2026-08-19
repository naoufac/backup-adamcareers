export interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Spinner({ size = "md", className = "" }: SpinnerProps) {
  const sizes = {
    sm: "h-4 w-4 border-2",
    md: "h-6 w-6 border-2",
    lg: "h-8 w-8 border-[3px]",
  };

  return (
    <div
      className={`inline-block animate-spin rounded-full border-current border-t-transparent text-adam-700 ${sizes[size]} ${className}`}
      role="status"
      aria-label="Chargement"
    />
  );
}
