"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-[22px] font-bold text-text tracking-[-0.3px] mb-2">
          Algo deu errado
        </p>
        <p className="text-[13px] text-text3 mb-6">
          Ocorreu um erro inesperado. Tente novamente.
        </p>
        <button
          onClick={reset}
          className="bg-text text-white border-none rounded-[6px] text-[13px] font-semibold px-[14px] py-[8px] cursor-pointer hover:opacity-90 transition-opacity"
          style={{ fontFamily: "inherit" }}
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
