import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center p-6 text-center">
      <div className="card max-w-md p-10">
        <p className="eyebrow">Error 404</p>
        <h1 className="mt-4 text-[28px] font-[620] tracking-[-0.035em]">
          Off the route.
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          The studio or demo page you followed is no longer available.
        </p>
        <Link href="/new" className="btn btn-primary mt-6 inline-flex no-underline">
          Back to the studio
        </Link>
      </div>
    </main>
  );
}
