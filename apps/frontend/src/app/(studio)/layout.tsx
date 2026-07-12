import { Brand } from "@/components/brand";

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b hair bg-[color-mix(in_srgb,var(--paper)_88%,transparent)] backdrop-blur-xl">
        <div className="wrap flex h-16 items-center justify-between">
          <Brand />
          <div className="flex items-center gap-2.5">
            <span className="size-1.5 rounded-full bg-[var(--focus)]" />
            <span className="eyebrow">Demo studio</span>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
