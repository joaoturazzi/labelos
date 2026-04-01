import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const EMAIL_FROM = process.env.EMAIL_FROM || "noreply@labelos.com.br";

function footer(labelName: string) {
  return `<hr style="border:none;border-top:1px solid #eceae5;margin:24px 0"/>
<p style="font-size:11px;color:#bbb;margin:0">
  Voce esta recebendo este email porque gerencia ${labelName} no LabelOS.
</p>`;
}

function wrap(body: string, labelName: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="font-family:'Plus Jakarta Sans',system-ui,sans-serif;color:#1a1a1a;font-size:14px;line-height:1.6;max-width:560px;margin:0 auto;padding:24px">
${body}
${footer(labelName)}
</body></html>`;
}

export async function sendSubmissionConfirmation(
  to: string,
  artistName: string,
  trackTitle: string,
  labelName: string
) {
  try {
    await getResend().emails.send({
      from: EMAIL_FROM,
      to,
      subject: `Sua demo foi recebida — ${labelName}`,
      html: wrap(
        `<h2 style="font-size:18px;font-weight:700;margin:0 0 16px">Demo recebida!</h2>
<p>Oi ${artistName},</p>
<p>Recebemos a track <strong>${trackTitle}</strong> na ${labelName}. Nossa equipe vai ouvir e avaliar em breve.</p>
<p style="color:#888;font-size:13px">Prazo estimado de resposta: 7 a 14 dias uteis.</p>`,
        labelName
      ),
      text: `Demo recebida! Oi ${artistName}, recebemos a track "${trackTitle}" na ${labelName}. Nossa equipe vai ouvir e avaliar em breve.`,
    });
  } catch (err) {
    console.error("Email (submission confirmation) failed:", err);
  }
}

export async function sendNewSubmissionNotification(
  to: string,
  artistName: string,
  trackTitle: string,
  labelName: string,
  dashboardUrl: string
) {
  try {
    await getResend().emails.send({
      from: EMAIL_FROM,
      to,
      subject: `Nova demo recebida: ${trackTitle} — ${artistName}`,
      html: wrap(
        `<h2 style="font-size:18px;font-weight:700;margin:0 0 16px">Nova demo!</h2>
<p><strong>${artistName}</strong> enviou a track <strong>${trackTitle}</strong>.</p>
<p><a href="${dashboardUrl}" style="color:#1a1a1a;font-weight:600">Ver no dashboard</a></p>`,
        labelName
      ),
      text: `Nova demo: ${artistName} enviou "${trackTitle}". Ver no dashboard: ${dashboardUrl}`,
    });
  } catch (err) {
    console.error("Email (new submission) failed:", err);
  }
}

export async function sendStatusUpdate(
  to: string,
  artistName: string,
  trackTitle: string,
  labelName: string,
  status: "approved" | "rejected",
  message?: string
) {
  try {
    const isApproved = status === "approved";
    const subject = isApproved
      ? `Boa noticia! Sua demo foi aprovada — ${labelName}`
      : `Atualizacao sobre sua demo — ${labelName}`;

    const body = isApproved
      ? `<h2 style="font-size:18px;font-weight:700;margin:0 0 16px;color:#1e8449">Demo aprovada!</h2>
<p>Oi ${artistName},</p>
<p>Temos uma otima noticia! A track <strong>${trackTitle}</strong> foi aprovada pela ${labelName}.</p>
<p>Em breve entraremos em contato para os proximos passos.</p>`
      : `<h2 style="font-size:18px;font-weight:700;margin:0 0 16px">Sobre sua demo</h2>
<p>Oi ${artistName},</p>
<p>Agradecemos por enviar a track <strong>${trackTitle}</strong> para a ${labelName}.</p>
<p>Infelizmente, neste momento a faixa nao se encaixa no que estamos buscando.</p>
${message ? `<p style="color:#555;font-size:13px;background:#f7f6f3;padding:12px;border-radius:6px">${message}</p>` : ""}
<p>Continue produzindo e nao hesite em enviar novas demos no futuro!</p>`;

    await getResend().emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      html: wrap(body, labelName),
      text: isApproved
        ? `Demo aprovada! Oi ${artistName}, a track "${trackTitle}" foi aprovada pela ${labelName}.`
        : `Sobre sua demo: Oi ${artistName}, a track "${trackTitle}" nao foi selecionada pela ${labelName} neste momento.`,
    });
  } catch (err) {
    console.error("Email (status update) failed:", err);
  }
}

export async function sendInsightAlert(
  to: string,
  artistName: string,
  insightTitle: string,
  insightBody: string,
  labelName: string,
  artistProfileUrl: string
) {
  try {
    await getResend().emails.send({
      from: EMAIL_FROM,
      to,
      subject: `Alerta: ${artistName} — ${insightTitle}`,
      html: wrap(
        `<h2 style="font-size:18px;font-weight:700;margin:0 0 16px">Alerta de artista</h2>
<p><strong>${artistName}</strong>: ${insightTitle}</p>
<p style="color:#555">${insightBody}</p>
<p><a href="${artistProfileUrl}" style="color:#1a1a1a;font-weight:600">Ver perfil do artista</a></p>`,
        labelName
      ),
      text: `Alerta: ${artistName} — ${insightTitle}. ${insightBody}`,
    });
  } catch (err) {
    console.error("Email (insight alert) failed:", err);
  }
}
