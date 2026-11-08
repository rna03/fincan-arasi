import { ArrowLeft, Coffee } from "lucide-react";
import { Link } from "react-router";
import { BrandMark } from "../components/BrandMark";

export function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-cream-100 p-5 text-center">
      <div className="max-w-md">
        <div className="flex justify-center"><BrandMark /></div>
        <span className="mx-auto mt-10 grid size-14 place-items-center rounded-full bg-petrol-50 text-petrol-700">
          <Coffee aria-hidden="true" size={25} />
        </span>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-copper-700">404</p>
        <h1 className="mt-2 font-display text-4xl text-espresso-950">Bu masa boş görünüyor.</h1>
        <p className="mt-3 leading-7 text-espresso-600">Aradığınız sayfa taşınmış veya hiç var olmamış olabilir.</p>
        <Link to="/" className="button-primary mt-7 inline-flex">
          <ArrowLeft aria-hidden="true" size={18} />
          Forma dön
        </Link>
      </div>
    </main>
  );
}
