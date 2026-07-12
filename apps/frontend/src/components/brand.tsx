import Link from "next/link";
import { Corners } from "@/components/frame";

export function BrandMark({ size = 24 }: { size?: number }) {
  return (
    <span
      className="relative inline-grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <Corners size={8} />
      <span className="block size-2 bg-[var(--focus)]" />
    </span>
  );
}

export function Brand() {
  return (
    <Link
      href="/new"
      className="inline-flex items-center gap-2.5 text-[15px] font-[590] tracking-[-0.02em] text-[var(--ink)] no-underline"
    >
      <BrandMark />
      <span>
        showcase<span className="text-[var(--faint)]">.ai</span>
      </span>
    </Link>
  );
}
