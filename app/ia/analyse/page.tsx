"use client";

import { useRef, useState } from "react";
import { ArrowRight, AlertTriangle, CheckCircle2, ImageIcon, Loader2 } from "lucide-react";

const mockAnnotations = [
  { label: "Surface estimée : 12.5 m²", left: "18%", top: "22%", width: "26%", height: "18%", color: "#22c55e" },
  { label: "Fissure détectée", left: "40%", top: "48%", width: "18%", height: "10%", color: "#ef4444" },
  { label: "Câble visible", left: "60%", top: "22%", width: "16%", height: "14%", color: "#0ea5e9" },
];

export default function AnalyseIaPage() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzed, setIsAnalyzed] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPreview(url);
    setIsAnalyzed(false);
    setIsAnalyzing(true);

    window.setTimeout(() => {
      setIsAnalyzing(false);
      setIsAnalyzed(true);
    }, 1800);
  };

  const resetAnalysis = () => {
    setPreview(null);
    setIsAnalyzing(false);
    setIsAnalyzed(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <main className="bg-white text-slate-900">
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">IA</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">L'œil qui voit tout, même ce qui est caché</h1>
          <p className="mx-auto mt-5 max-w-3xl text-lg text-slate-700">
            L'IA analyse vos photos pour détecter les défauts, calculer les surfaces (m²) et générer automatiquement une liste de matériaux adaptés.
          </p>
        </div>

        <div className="flex flex-col items-center gap-4">
          <button
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-3 text-base font-bold text-white shadow-lg shadow-orange-200"
          >
            <ImageIcon className="h-4 w-4" />
            Tester l'analyse sur ma photo
          </button>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6 lg:px-8">
        {!preview ? (
          <div className="grid gap-6 rounded-[32px] border border-slate-200 bg-slate-50 p-8 shadow-sm lg:grid-cols-2">
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-8">
              <div className="mb-4 inline-flex rounded-2xl bg-blue-100 p-3 text-2xl">📷</div>
              <h2 className="text-2xl font-black text-slate-900">Avant</h2>
              <div className="mt-4 aspect-[4/3] rounded-2xl bg-[radial-gradient(circle_at_center,_rgba(14,165,233,0.15),_transparent_40%),linear-gradient(135deg,#eff6ff,#dbeafe)] p-4" />
            </div>
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-8">
              <div className="mb-4 inline-flex rounded-2xl bg-emerald-100 p-3 text-2xl">✨</div>
              <h2 className="text-2xl font-black text-slate-900">Après</h2>
              <div className="mt-4 aspect-[4/3] rounded-2xl bg-[linear-gradient(135deg,#f0fdf4,#dcfce7)] p-4" />
            </div>
          </div>
        ) : (
          <div className="rounded-[32px] border border-slate-200 bg-slate-50 p-4 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin text-blue-600" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                {isAnalyzing ? "L'IA analyse votre image..." : "Analyse terminée"}
              </div>
              <button
                onClick={resetAnalysis}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Analyser une autre image
              </button>
            </div>

            <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-white">
              <img
                src={preview}
                alt="Image analysée"
                className="block max-h-[620px] w-full object-contain"
                onContextMenu={(event) => event.preventDefault()}
              />

              {!isAnalyzing && isAnalyzed && (
                <div className="absolute inset-0">
                  {mockAnnotations.map((annotation, index) => (
                    <div key={index} className="absolute rounded-xl border-2 border-dashed" style={{
                      left: annotation.left,
                      top: annotation.top,
                      width: annotation.width,
                      height: annotation.height,
                      borderColor: annotation.color,
                      background: "rgba(255,255,255,0.08)",
                    }}>
                      <span
                        className="absolute -top-7 left-0 rounded-full px-2 py-1 text-[10px] font-bold text-white"
                        style={{ backgroundColor: annotation.color }}
                      >
                        {annotation.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {!isAnalyzing && isAnalyzed && (
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Surface</div>
                  <div className="mt-2 text-2xl font-black text-slate-900">12.5 m²</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Anomalies</div>
                  <div className="mt-2 text-2xl font-black text-red-600">3</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Matériaux</div>
                  <div className="mt-2 text-xl font-black text-emerald-700">9 éléments</div>
                </div>
              </div>
            )}

            {!isAnalyzing && isAnalyzed && (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="h-4 w-4" />
                  Légende :
                </div>
                <div className="mt-2 space-y-1">
                  <div>• Rouge = fissure détectée</div>
                  <div>• Vert = surface calculée</div>
                  <div>• Bleu = réseaux / câbles détectés</div>
                </div>
              </div>
            )}
          </div>
        )}

        {!isAnalyzing && isAnalyzed && (
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-3 text-base font-bold text-white shadow-lg shadow-blue-200">
              Obtenir un devis complet
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
