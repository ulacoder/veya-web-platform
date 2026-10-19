// "Why the AI answered so" and "what to do next" — rendered from the explanation and recommendations
// the VEYA API returns with every screening. Texts arrive already translated; only headings come from t().
import { useState } from "react";
import { AlarmClock, Brain, ClipboardList, Microscope, Siren, Stethoscope } from "lucide-react";
import { DISEASE_ORDER, type DiseaseKey, type Explanation, type Recommendations } from "@/lib/clinical";

type T = (key: string) => string;

const DISEASE_LABEL: Record<DiseaseKey, string> = { dr: "drName", glaucoma: "glaucomaName", cataract: "cataractName" };

export function ExplanationCard({ explanation, image, t }: { explanation: Explanation; image?: string; t: T }) {
  const maps = explanation.heatmaps ?? {};
  const available = DISEASE_ORDER.filter((key) => maps[key]);
  const [shown, setShown] = useState<DiseaseKey | undefined>(explanation.heatmap_disease ?? available[0]);
  const heatmap = (shown && maps[shown]) || explanation.heatmap;
  const flagged = explanation.findings.filter((f) => f.status !== "negative");
  const clear = explanation.findings.filter((f) => f.status === "negative");
  const issues = explanation.image_quality?.issues_text ?? [];

  return (
    <section className="panel explain">
      <div className="panel__head"><h3><Brain size={17} />{t("explainTitle")}</h3><span className="tag">Grad-CAM</span></div>
      <p className="explain__summary">{explanation.summary}</p>

      {heatmap && (
        <figure className="explain__maps">
          <div className="explain__pair">
            {image && <div><img src={image} alt={t("explainOriginal")} /><span>{t("explainOriginal")}</span></div>}
            <div><img src={heatmap} alt={t("explainHeatmap")} /><span>{t("explainHeatmap")}</span></div>
          </div>
          {available.length > 1 && (
            <div className="explain__tabs" role="tablist">
              {available.map((key) => (
                <button key={key} role="tab" aria-selected={key === shown} className={key === shown ? "is-active" : ""} onClick={() => setShown(key)}>{t(DISEASE_LABEL[key])}</button>
              ))}
            </div>
          )}
          <figcaption>{t("explainHeatmapHint")}</figcaption>
        </figure>
      )}

      <div className="explain__findings">
        {flagged.map((f) => (
          <article key={f.disease} className={`finding finding--${f.status}`}>
            <h4>{f.title}</h4>
            <ul>{f.evidence.map((line, i) => <li key={i}>{line}</li>)}</ul>
            {f.attention && f.attention.some((a) => a.share > 0) && (
              <div className="attention">
                <p>{t("explainAttention")}</p>
                {f.attention.map((a) => (
                  <div key={a.region} className="attention__row">
                    <span>{t(`region_${a.region}`)}</span>
                    <span className="attention__bar"><span style={{ width: `${Math.max(0, Math.min(100, a.share))}%` }} /></span>
                    <strong>{a.share}%</strong>
                  </div>
                ))}
              </div>
            )}
          </article>
        ))}
        {clear.length > 0 && (
          <details className="finding finding--negative" open={flagged.length === 0}>
            <summary>{t("explainClear")} ({clear.map((f) => f.name).join(", ")})</summary>
            {clear.map((f) => (
              <div key={f.disease} className="finding__clear"><strong>{f.title}</strong><ul>{f.evidence.map((line, i) => <li key={i}>{line}</li>)}</ul></div>
            ))}
          </details>
        )}
      </div>

      {issues.length > 0 && <p className="note explain__quality">{t("explainQuality")}: {issues.join(", ")}</p>}
    </section>
  );
}

export function RecommendationCard({ rec, t }: { rec: Recommendations; t: T }) {
  const blocks = DISEASE_ORDER.filter((key) => rec.by_disease[key]);
  return (
    <section className={`panel recx recx--${rec.urgency}`}>
      <h3>{t("recTitle")}</h3>
      <div className="recx__head">
        <span className={`recx__badge recx__badge--${rec.urgency}`}><AlarmClock size={15} />{rec.urgency_label}</span>
        <strong className="recx__when">{rec.timeframe}</strong>
      </div>
      <p className="recx__headline">{rec.headline}</p>

      {blocks.map((key) => {
        const block = rec.by_disease[key]!;
        return (
          <div key={key} className="recx__block">
            <h4><Stethoscope size={15} />{t(DISEASE_LABEL[key])} · <span>{block.timeframe}</span></h4>
            {blocks.length > 1 && <p className="recx__sub">{block.headline}</p>}
            {block.actions.length > 0 && <><p className="recx__label"><ClipboardList size={14} />{t("recActions")}</p><ul>{block.actions.map((a, i) => <li key={i}>{a}</li>)}</ul></>}
            {block.exams.length > 0 && <><p className="recx__label"><Microscope size={14} />{t("recExams")}</p><ul>{block.exams.map((a, i) => <li key={i}>{a}</li>)}</ul></>}
          </div>
        );
      })}

      {rec.general.length > 0 && <ul className="recx__general">{rec.general.map((a, i) => <li key={i}>{a}</li>)}</ul>}

      <div className="recx__flags">
        <p><Siren size={15} />{rec.red_flags_title}</p>
        <ul>{rec.red_flags.map((a, i) => <li key={i}>{a}</li>)}</ul>
      </div>
    </section>
  );
}
