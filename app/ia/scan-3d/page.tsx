"use client";

import { useState } from "react";
import { ArrowRight, Play, X } from "lucide-react";

export default function Scan3DPage() {
  const [showModal, setShowModal] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  return (
    <main className="bg-white text-slate-900">
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600">IA</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">De la photo au plan 3D en 30 secondes</h1>
            <p className="mt-5 max-w-xl text-lg text-slate-700">
              Scannez votre chantier avec votre smartphone. Notre IA calcule automatiquement les dimensions, les surfaces et génère un modèle exploitable par vos logiciels de CAO.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-3 text-base font-bold text-white shadow-lg shadow-orange-200"
              >
                Télécharger l'application
              </button>
              <button
                onClick={() => setShowVideo(true)}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3 text-base font-semibold text-slate-900 hover:bg-slate-50"
              >
                <Play className="h-4 w-4" />
                Voir une démo
              </button>
            </div>
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-slate-50 p-5 shadow-sm">
            <div className="aspect-[4/3] overflow-hidden rounded-[24px] bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_38%),linear-gradient(135deg,#eff6ff,#dbeafe)] p-4">
              <div className="flex h-full items-center justify-center rounded-[20px] border border-dashed border-slate-300 bg-white/80 text-7xl">📐</div>
            </div>
          </div>
        </div>
      </section>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-xl rounded-[32px] bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-900">Télécharger l'application</h2>
              <button onClick={() => setShowModal(false)} className="rounded-full border border-slate-200 p-2 text-slate-700 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <button className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left font-semibold text-slate-900 hover:bg-slate-100">
                App Store
              </button>
              <button className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left font-semibold text-slate-900 hover:bg-slate-100">
                Google Play
              </button>
            </div>
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-2xl bg-white text-4xl shadow-sm">📱</div>
              <p className="mt-3 text-sm text-slate-600">QR code de téléchargement</p>
            </div>
          </div>
        </div>
      )}

      {showVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" onClick={() => setShowVideo(false)}>
          <div className="w-full max-w-4xl rounded-[32px] bg-white p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900">Démo Scan 3D</h2>
              <button onClick={() => setShowVideo(false)} className="rounded-full border border-slate-200 p-2 text-slate-700 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-slate-950">
              <div className="aspect-video w-full bg-[linear-gradient(135deg,#0f172a,#1e293b)] p-6">
                <div className="flex h-full items-center justify-center text-5xl text-white">▶️</div>
              </div>
            </div>
            <div className="mt-4 flex justify-between gap-3">
              <p className="text-sm text-slate-600">Vidéo de démonstration — 45 à 60 secondes</p>
              <button className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                Démarrer l'essai
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
