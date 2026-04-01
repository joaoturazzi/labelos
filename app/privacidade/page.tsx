export const metadata = {
  title: "Politica de Privacidade — LabelOS",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-bg px-4 py-12">
      <div className="max-w-[640px] mx-auto">
        <h1 className="text-[22px] font-bold text-text tracking-[-0.3px] mb-6">
          Politica de Privacidade
        </h1>

        <div className="flex flex-col gap-6 text-[13px] text-text2 leading-relaxed">
          <section>
            <h2 className="text-[15px] font-bold text-text mb-2">
              1. Dados coletados
            </h2>
            <p>
              Ao submeter uma demo pelo portal, coletamos: nome artistico, e-mail,
              nome da track, genero musical, BPM, links de redes sociais (Instagram,
              TikTok, Spotify, YouTube) e o arquivo de audio da faixa.
            </p>
          </section>

          <section>
            <h2 className="text-[15px] font-bold text-text mb-2">
              2. Finalidade
            </h2>
            <p>
              Os dados sao utilizados exclusivamente para avaliacao da demo pela
              gravadora indicada. O arquivo de audio sera ouvido e analisado pela
              equipe e por ferramentas de inteligencia artificial para auxilio na
              curadoria.
            </p>
          </section>

          <section>
            <h2 className="text-[15px] font-bold text-text mb-2">
              3. Tempo de retencao
            </h2>
            <p>
              Seus dados serao mantidos por ate 24 meses apos a submissao. Apos
              esse periodo, serao automaticamente excluidos, salvo se houver relacao
              contratual ativa com a gravadora.
            </p>
          </section>

          <section>
            <h2 className="text-[15px] font-bold text-text mb-2">
              4. Compartilhamento
            </h2>
            <p>
              Seus dados nao sao compartilhados com terceiros, exceto com a
              gravadora para a qual voce enviou a demo e com provedores de
              infraestrutura necessarios para o funcionamento do servico.
            </p>
          </section>

          <section>
            <h2 className="text-[15px] font-bold text-text mb-2">
              5. Seus direitos (LGPD)
            </h2>
            <p>
              Voce tem direito a acessar, corrigir ou solicitar a exclusao dos seus
              dados a qualquer momento. Para exercer esses direitos, entre em
              contato pelo e-mail da gravadora ou por privacidade@labelos.com.br.
            </p>
          </section>

          <section>
            <h2 className="text-[15px] font-bold text-text mb-2">
              6. Responsavel
            </h2>
            <p>
              A gravadora que recebe a demo e a controladora dos dados. O LabelOS
              atua como operador, processando os dados em nome da gravadora
              conforme a Lei Geral de Protecao de Dados (Lei 13.709/2018).
            </p>
          </section>
        </div>

        <p className="text-[11px] text-text4 mt-8">
          Ultima atualizacao: abril de 2026
        </p>
      </div>
    </div>
  );
}
