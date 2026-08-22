import { cn } from "@/lib/utils";

/** The centred title + subtitle every form in the auth card opens with. */
export function AuthHeader({
  title,
  description,
  className,
}: {
  title: string;
  description?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-1 text-center", className)}>
      <h1 className="text-2xl font-bold">{title}</h1>
      {description && (
        <p className="text-sm text-balance text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
