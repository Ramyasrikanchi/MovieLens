import { LoadingState } from "@/components/LoadingState";
import { Navbar } from "@/components/Navbar";

export default function Loading() {
  return (
    <main className="min-h-screen bg-warm-canvas">
      <Navbar />
      <section className="mx-auto max-w-[1200px] px-5 pb-24 pt-20 sm:px-8">
        <LoadingState label="Preparing search" skeleton />
      </section>
    </main>
  );
}
