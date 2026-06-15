import Link from "next/link";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { CheckIcon } from "@/components/site/icons";
import { Reveal } from "@/components/site/motion/Reveal";
import { SuccessTracker } from "./SuccessTracker";
import { PRODUCTION_DAYS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default function SuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string };
}) {
  const sessionId =
    typeof searchParams.session_id === "string" ? searchParams.session_id : null;

  return (
    <>
      <Header />
      <main className="container-content flex min-h-[62vh] max-w-xl flex-col items-center justify-center py-28 text-center">
        <Reveal className="flex flex-col items-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-sand text-amber-deep shadow-glow-amber-sm">
            <CheckIcon width={30} height={30} />
          </span>
          <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight text-balance">
            Payment received
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted text-pretty">
            Thank you — your custom photo lithophane is on its way into
            production. Your confirmation email is on its way to your inbox.
          </p>
          <p className="mt-2 text-muted">
            We hand-craft and ship within an estimated {PRODUCTION_DAYS} business
            days, with free shipping across Canada.
          </p>
          <Link href="/" className="btn-secondary mt-8">
            Back to home
          </Link>
        </Reveal>
      </main>
      <Footer />
      <SuccessTracker sessionId={sessionId} />
    </>
  );
}
