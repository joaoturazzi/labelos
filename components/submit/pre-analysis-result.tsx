"use client";

interface Improvement {
  area: string;
  problema: string;
  sugestao: string;
}

interface PreAnalysisData {
  score: number;
  pronta_para_enviar: boolean;
  resumo_executivo: string;
  pontos_fortes: string[];
  melhorias_necessarias: Improvement[];
  genero_detectado: string;
  bpm_estimado: number | null;
  energia: string;
  mensagem_para_artista: string;
  proximos_passos: string[];
}

interface Props {
  result: PreAnalysisData;
  accentColor?: string;
  onContinue: () => void;
  onReupload: () => void;
}

export function PreAnalysisResult({
  result,
  accentColor = "#1a1a1a",
  onContinue,
  onReupload,
}: Props) {
  const scoreColor =
    result.score >= 70
      ? "#1e8449"
      : result.score >= 50
        ? "#d68910"
        : "#c0392b";
  const scoreBg =
    result.score >= 70
      ? "#eafaf1"
      : result.score >= 50
        ? "#fef9e7"
        : "#fdf2f2";
  const scoreLabel =
    result.score >= 70
      ? "Pronta para enviar!"
      : result.score >= 50
        ? "Quase la — alguns ajustes podem ajudar"
        : "Precisa de melhorias antes de enviar";

  return (
    <div
      className="rounded-[10px] overflow-hidden"
      style={{ border: `2px solid ${scoreColor}` }}
    >
      {/* Header with score */}
      <div
        className="p-5 pb-4"
        style={{
          background: scoreBg,
          borderBottom: `1px solid ${scoreColor}20`,
        }}
      >
        <div className="flex items-center gap-4 mb-3">
          {/* Score circle */}
          <div
            className="flex flex-col items-center justify-center rounded-full flex-shrink-0"
            style={{
              width: 72,
              height: 72,
              background: "#fff",
              border: `3px solid ${scoreColor}`,
            }}
          >
            <span
              className="text-[22px] font-bold leading-none"
              style={{ color: scoreColor }}
            >
              {result.score}
            </span>
            <span className="text-[9px] text-text4">/100</span>
          </div>

          <div>
            <p className="text-[15px] font-bold text-text mb-1">
              {scoreLabel}
            </p>
            <p className="text-[12px] text-text2 leading-relaxed">
              {result.resumo_executivo}
            </p>
          </div>
        </div>

        {/* Detected metadata tags */}
        <div className="flex gap-2 flex-wrap">
          {result.genero_detectado && (
            <span className="text-[11px] bg-bg border border-border rounded-[4px] px-2 py-0.5 text-text3">
              {result.genero_detectado}
            </span>
          )}
          {result.bpm_estimado && (
            <span className="text-[11px] bg-bg border border-border rounded-[4px] px-2 py-0.5 text-text3">
              ~{result.bpm_estimado} BPM
            </span>
          )}
          {result.energia && (
            <span className="text-[11px] bg-bg border border-border rounded-[4px] px-2 py-0.5 text-text3">
              Energia {result.energia}
            </span>
          )}
        </div>
      </div>

      <div className="p-5">
        {/* Strong points */}
        {result.pontos_fortes?.length > 0 && (
          <div className="mb-4">
            <p className="text-[11px] font-bold text-success uppercase tracking-[0.08em] mb-2">
              Pontos fortes
            </p>
            {result.pontos_fortes.map((p, i) => (
              <p
                key={i}
                className="text-[12px] text-text2 mb-1 flex gap-1.5"
              >
                <span className="text-success flex-shrink-0">&#10003;</span>
                {p}
              </p>
            ))}
          </div>
        )}

        {/* Improvements needed */}
        {result.melhorias_necessarias?.length > 0 && (
          <div className="mb-4">
            <p className="text-[11px] font-bold text-danger uppercase tracking-[0.08em] mb-2">
              O que melhorar
            </p>
            {result.melhorias_necessarias.map((m, i) => (
              <div
                key={i}
                className="rounded-[6px] p-3 mb-2"
                style={{
                  background: "#fdf2f2",
                  border: "1px solid #f5c6c6",
                }}
              >
                <p className="text-[11px] font-bold text-danger mb-1">
                  {m.area}
                </p>
                <p className="text-[12px] text-text2 mb-2">{m.problema}</p>
                <p
                  className="text-[12px] rounded-[4px] p-2"
                  style={{
                    color: "#1a5276",
                    background: "#eaf2fb",
                  }}
                >
                  Sugestao: {m.sugestao}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Next steps */}
        {result.proximos_passos?.length > 0 && (
          <div className="mb-4">
            <p className="text-[11px] font-bold text-text3 uppercase tracking-[0.08em] mb-2">
              Proximos passos
            </p>
            {result.proximos_passos.map((p, i) => (
              <p
                key={i}
                className="text-[12px] text-text2 mb-1 flex gap-1.5"
              >
                <span className="text-text3 flex-shrink-0 font-bold">
                  {i + 1}.
                </span>
                {p}
              </p>
            ))}
          </div>
        )}

        {/* AI message to artist */}
        {result.mensagem_para_artista && (
          <p
            className="text-[13px] text-text2 italic leading-relaxed rounded-[6px] p-3 mb-4"
            style={{
              background: "#f7f6f3",
              borderLeft: `3px solid ${scoreColor}`,
            }}
          >
            &ldquo;{result.mensagem_para_artista}&rdquo;
          </p>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          {result.pronta_para_enviar ? (
            <>
              <button
                onClick={onContinue}
                className="flex-1 text-white border-none rounded-[6px] text-[13px] font-semibold py-2.5 cursor-pointer hover:opacity-90 transition-opacity"
                style={{ background: accentColor, fontFamily: "inherit" }}
              >
                Enviar para a gravadora
              </button>
              <button
                onClick={onReupload}
                className="px-4 bg-transparent text-text3 border border-[#e0e0de] rounded-[6px] text-[12px] cursor-pointer hover:border-text3 transition-colors"
                style={{ fontFamily: "inherit" }}
              >
                Analisar de novo
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onReupload}
                className="flex-[2] text-white border-none rounded-[6px] text-[13px] font-semibold py-2.5 cursor-pointer hover:opacity-90 transition-opacity"
                style={{ background: accentColor, fontFamily: "inherit" }}
              >
                Melhorar e reenviar arquivo
              </button>
              <button
                onClick={onContinue}
                className="flex-1 bg-transparent rounded-[6px] text-[12px] font-semibold py-2.5 cursor-pointer transition-colors"
                style={{
                  color: "#c0392b",
                  border: "1px solid #f5c6c6",
                  background: "#fdf2f2",
                  fontFamily: "inherit",
                }}
              >
                Enviar mesmo assim
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
