import Beam from "@/components/Beam";
import Onboarding from "@/components/Onboarding";
import OrderConsole from "@/components/OrderConsole";
import Reveal from "@/components/Reveal";
import StickyNav from "@/components/StickyNav";
import Wordmark from "@/components/Wordmark";

const BEATS = [
  {
    n: "01",
    title: "Describe",
    body: "Say what your phone should do, in your own words. No action names, no syntax.",
  },
  {
    n: "02",
    title: "Analyze",
    body: "The request compiles against a curated catalog of real Shortcuts actions. You get an honest verdict — native, partial, or impossible — never a silently broken file.",
  },
  {
    n: "03",
    title: "Deploy",
    body: "Two ways out. Import the generated shortcut directly via shortcuts://, or follow exact numbered steps and assemble it by hand. The steps are always on the menu.",
  },
];

export default function Home() {
  return (
    <>
      <Onboarding />
      <Beam />
      <StickyNav />

      <main className="relative z-10">
        {/* ── Hero: the input is the thesis ─────────────────────────────── */}
        <section className="safe-x safe-top relative mx-auto flex min-h-[100svh] w-full max-w-2xl flex-col justify-center py-20">
          <h1>
            <Wordmark className="block text-[17vw] sm:text-8xl" />
          </h1>
          <p className="mt-3 mb-10 text-base text-silver sm:text-lg">
            Tell it what you want. Order up.
          </p>

          <div id="order" className="scroll-mt-28">
            <OrderConsole />
          </div>

          {/* StickyNav watches this: when it leaves, the field has "risen" into the nav */}
          <div id="hero-sentinel" aria-hidden="true" className="absolute bottom-0 h-px w-px" />
        </section>

        {/* ── How it works ──────────────────────────────────────────────── */}
        <section className="section-wash safe-x mx-auto w-full max-w-2xl py-24" aria-labelledby="how-heading">
          <hr className="beam-divider mb-16" />
          <Reveal>
            <p className="meta-mono mb-2 text-teal">The line</p>
            <h2 id="how-heading" className="display text-4xl sm:text-5xl">
              How it works
            </h2>
          </Reveal>
          <ol className="mt-10 space-y-10">
            {BEATS.map((beat, i) => (
              <Reveal key={beat.n} as="li" delay={i * 0.08}>
                <div className="flex gap-5">
                  <span className="font-mono text-sm text-beam">{beat.n}</span>
                  <div>
                    <h3 className="display text-2xl text-chalk">{beat.title}</h3>
                    <p className="mt-2 max-w-prose text-sm leading-relaxed text-silver">{beat.body}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </ol>
        </section>

        {/* ── What to expect on import ──────────────────────────────────── */}
        <section className="section-wash safe-x mx-auto w-full max-w-2xl py-24" aria-labelledby="trust-heading">
          <hr className="beam-divider mb-16" />
          <Reveal>
            <p className="meta-mono mb-2 text-teal">Straight talk</p>
            <h2 id="trust-heading" className="display text-4xl sm:text-5xl">
              &ldquo;Untrusted&rdquo; is normal
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="mt-6 max-w-prose space-y-4 text-sm leading-relaxed text-silver">
              <p>
                Since iOS 15, Apple cryptographically signs shortcuts on its own infrastructure.
                Nothing built outside the Gallery — including everything built here — can carry
                that signature, so iOS labels it untrusted and asks you to review it before adding.
              </p>
              <p>
                That review is the point: you see every action before it touches your phone. Flip{" "}
                <span className="font-mono text-chalk">
                  Settings → Shortcuts → Allow Untrusted Shortcuts
                </span>{" "}
                once, then tap <span className="text-chalk">Add Untrusted Shortcut</span> at the
                bottom of each import preview.
              </p>
              <p>
                Personal values — contacts, addresses, playlists — are never hardcoded. The
                shortcut asks for them as it installs, so the file you import is a tool, not a
                hardwired toy.
              </p>
            </div>
          </Reveal>
        </section>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <footer className="safe-x safe-bottom mx-auto w-full max-w-2xl py-16">
          <hr className="beam-divider mb-10" />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Wordmark className="text-2xl" />
            <p className="meta-mono">VASEY/AI · GPL-3.0</p>
          </div>
        </footer>
      </main>
    </>
  );
}
