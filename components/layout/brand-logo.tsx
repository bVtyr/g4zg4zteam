import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  priority = false
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/aqbobek-logo.jpeg"
      alt="Aqbobek Lyceum"
      width={225}
      height={225}
      priority={priority}
      className={cn("h-auto w-[180px] rounded-2xl", className)}
    />
  );
}
