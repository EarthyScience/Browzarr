import Link from "next/link";

export const metadata = {
  title: "browzarr.io/docs",
  description: "Tutorial and documentation for BrowZarr",
};

export default function DocsPage() {
  return (
    <div className="px-4 py-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4 mt-8">Browzarr — Quick Tutorial</h1>

      <section className="mb-6">
        <h2 className="text-xl font-semibold">Getting started</h2>
        <p className="mt-2">
          Open a dataset via the UI, pick a variable and use the controls to pan, zoom and animate.
          This page is a good place to add step-by-step guides and screenshots.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold">Animation</h2>
        <ol className="list-decimal ml-5 mt-2">
          <li>Click the play icon in the top-right to open animation controls.</li>
          <li>Use the slider or FPS controls to adjust playback.</li>
          <li>Use &quot;Grab Prev/Next Chunk&quot; to load additional time chunks.</li>
        </ol>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold">Contributing</h2>
        <p className="mt-2">
          Add docs in this folder (src/app/docs). For larger docs, add sub-pages or a layout at <code>src/app/docs/layout.tsx</code>.
        </p>
      </section>

      <div className="mt-8">
        <Link href="/" className="text-sm text-primary underline">
        ← Back to app
        </Link>
      </div>
    </div>
  );
}