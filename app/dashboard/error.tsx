"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex-1 flex items-center justify-center py-16">
      <div className="text-center">
        <p className="text-[15px] font-bold text-text mb-2">
          Erro ao carregar pagina
        </p>
        <p className="text-[13px] text-text3 mb-4">
          Algo deu errado nesta secao do dashboard.
        </p>
        <button
          onClick={reset}
          className="bg-transparent text-neutral border border-[#e0e0de] rounded-[6px] text-[13px] font-semibold px-[14px] py-[6px] cursor-pointer hover:border-text3 transition-colors"
          style={{ fontFamily: "inherit" }}
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
