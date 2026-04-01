import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-[22px] font-bold text-text tracking-[-0.3px] mb-2">
          Pagina nao encontrada
        </p>
        <p className="text-[13px] text-text3 mb-6">
          A pagina que voce procura nao existe ou foi movida.
        </p>
        <Link
          href="/"
          className="bg-text text-white border-none rounded-[6px] text-[13px] font-semibold px-[14px] py-[8px] no-underline hover:opacity-90 transition-opacity"
        >
          Voltar ao inicio
        </Link>
      </div>
    </div>
  );
}
