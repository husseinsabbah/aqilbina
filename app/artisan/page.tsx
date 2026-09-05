"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Plus, Eye, Loader2, Award, ShieldCheck, Star, CheckCircle2 } from "lucide-react";
import Sidebar from "@/components/Sidebar";

type Project = {
  id: string;
  name: string;
  description: string | null;
  type: string | null;
  surface: number | null;
  status: string;
  budgetEstimate: number | null;
  clientBudgetMax: number | null;
  depositAmount: number | null;
  depositPercent: number | null;
  depositProofUrl: string | null;
  depositValidated: boolean | null;
  createdAt: string;
  clientName: string | null;
  clientPhone: string | null;
  clientEmail: string | null;
  clientAddress: string | null;
  clientFeedbackStatus: string | null;
  startDate: string | null;
  endDate: string | null;
  sharePublicUrl: string | null;
  portfolioRating: number | null;
  items: { id: string; productName: string; quantity: number; unitPriceHtAtSale?: number; unitPrice?: number; product?: { name?: string }; service?: { name?: string } }[];
};

type Question = {
  id: number;
  question: string;
  options: string[];
  correct: string;
};

const certificationQuestions: Question[] = [
  {
    id: 1,
    question: "Quel élément doit être vérifié avant de poser un revêtement de sol sur une surface existante ?",
    options: ["La couleur des murs", "L'état de la sous-face et son planéité", "La météo de la semaine prochaine"],
    correct: "L'état de la sous-face et son planéité",
  },
  {
    id: 2,
    question: "En cas de chantier humide, quelle précaution est prioritaire ?",
    options: ["Raccourcir les délais", "Prévoir un système de drainage et des matériaux adaptés", "Négocier la main d'œuvre"],
    correct: "Prévoir un système de drainage et des matériaux adaptés",
  },
  {
    id: 3,
    question: "Quelle information est indispensable pour établir un devis fiable ?",
    options: ["Le nom du voisin", "La nature du projet, la surface et le budget client", "Le numéro de plaque d'immatriculation"],
    correct: "La nature du projet, la surface et le budget client",
  },
  {
    id: 4,
    question: "Qu'est-ce qui permet d'améliorer la qualité d'un chantier de rénovation ?",
    options: ["Faire les travaux sans plan", "S'assurer d'une préparation du support et d'un suivi de chantier", "Éviter les échanges avec le client"],
    correct: "S'assurer d'une préparation du support et d'un suivi de chantier",
  },
  {
    id: 5,
    question: "Quelle bonne pratique protège le client lors d'un chantier en cours ?",
    options: ["Publier uniquement des photos de fin de chantier", "Renseigner les étapes, les délais et les points de vigilance", "Ne rien documenter avant le paiement"],
    correct: "Renseigner les étapes, les délais et les points de vigilance",
  },
];

const STORAGE_KEY = "aqil-bina-artisan-certification";

const getCertificationState = (score: number) => {
  if (score >= 85) return { label: "Expert certifié", color: "text-emerald-700", badge: "bg-emerald-100 text-emerald-700 border-emerald-200" };
  if (score >= 70) return { label: "Professionnel certifié", color: "text-blue-700", badge: "bg-blue-100 text-blue-700 border-blue-200" };
  if (score >= 50) return { label: "Certificat en cours", color: "text-amber-700", badge: "bg-amber-100 text-amber-700 border-amber-200" };
  return { label: "À renforcer", color: "text-rose-700", badge: "bg-rose-100 text-rose-700 border-rose-200" };
};

const computeQcmScore = (answers: Record<number, string>) => {
  const total = certificationQuestions.length;
  let correct = 0;
  certificationQuestions.forEach((question) => {
    if (answers[question.id] === question.correct) correct += 1;
  });
  return Math.round((correct / total) * 100);
};

export default function ProjetsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [qcmValidated, setQcmValidated] = useState(false);

  const qcmScore = useMemo(() => computeQcmScore(answers), [answers]);
  const certification = useMemo(() => getCertificationState(qcmScore), [qcmScore]);

  const ratedProjects = useMemo(
    () => projects.filter((project) => typeof project.portfolioRating === 'number' && project.portfolioRating > 0),
    [projects]
  );
  const reviewedProjects = ratedProjects.length;
  const clientRating = ratedProjects.length > 0
    ? ratedProjects.reduce((sum, project) => sum + (project.portfolioRating ?? 0), 0) / ratedProjects.length
    : 4.9;
  const globalScore = Math.min(100, Math.round((qcmScore * 0.4) + ((clientRating / 5) * 100 * 0.4) + (Math.min(reviewedProjects, 20) / 20 * 100 * 0.2)));

  const fetchProjects = async (search = '') => {
    try {
      const res = await fetch(`/api/projects${search ? `?q=${encodeURIComponent(search)}` : ''}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      }
    } catch (error) {
      console.error("Erreur chargement projets:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (session.user.role !== 'artisan' && session.user.trade !== 'artisan') {
      router.push('/auth/signin');
      return;
    }

    const hydrateCertification = async () => {
      try {
        const profileRes = await fetch('/api/user/profile', { credentials: 'include' });
        if (profileRes.ok) {
          const data = await profileRes.json();
          const savedAnswers = data?.certificationAnswers ? JSON.parse(data.certificationAnswers) : null;
          if (savedAnswers && typeof savedAnswers === 'object') {
            setAnswers(savedAnswers);
            const hasValidation = Object.keys(savedAnswers).length > 0;
            setIsSubmitted(hasValidation);
            setQcmValidated(hasValidation);
          } else {
            const localSaved = window.localStorage.getItem(STORAGE_KEY);
            if (localSaved) {
              try {
                const parsed = JSON.parse(localSaved) as Record<number, string>;
                setAnswers(parsed);
                const hasValidation = Object.keys(parsed).length > 0;
                setIsSubmitted(hasValidation);
                setQcmValidated(hasValidation);
              } catch {
                setAnswers({});
              }
            }
          }
        } else {
          const localSaved = window.localStorage.getItem(STORAGE_KEY);
          if (localSaved) {
            try {
              const parsed = JSON.parse(localSaved) as Record<number, string>;
              setAnswers(parsed);
              const hasValidation = Object.keys(parsed).length > 0;
              setIsSubmitted(hasValidation);
              setQcmValidated(hasValidation);
            } catch {
              setAnswers({});
            }
          }
        }
      } catch {
        const localSaved = window.localStorage.getItem(STORAGE_KEY);
        if (localSaved) {
          try {
            const parsed = JSON.parse(localSaved) as Record<number, string>;
            setAnswers(parsed);
            const hasValidation = Object.keys(parsed).length > 0;
            setIsSubmitted(hasValidation);
            setQcmValidated(hasValidation);
          } catch {
            setAnswers({});
          }
        }
      }
    };

    void hydrateCertification();

    const checkAccess = async () => {
      try {
        const res = await fetch('/api/user/agents/check', { credentials: 'include' });
        const data = await res.json();
        const active = Boolean(res.ok && data?.hasActive);

        if (!active) {
          router.push('/abonnement');
          return;
        }
      } catch {
        router.push('/abonnement');
        return;
      }

      await fetchProjects();
    };

    void checkAccess();
  }, [session, router]);

  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
    }
  }, [answers]);

  const handleAnswer = (questionId: number, value: string) => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (qcmValidated || isSubmitted) return;

    setIsSubmitted(true);
    setQcmValidated(true);

    try {
      const score = computeQcmScore(answers);
      const nextLabel = getCertificationState(score).label;
      await fetch('/api/user/profile', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          certificationScore: score,
          certificationLabel: nextLabel,
          certificationAnswers: JSON.stringify(answers),
        }),
      });
    } catch (error) {
      console.error('Erreur sauvegarde certification:', error);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div className="flex-1 ml-64 p-8">
        <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
          <h1 className="text-2xl font-bold text-gray-800">📋 Mes projets</h1>
          <button
            onClick={() => router.push("/artisan/projets/nouveau")}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nouveau projet
          </button>
        </div>

        <div className="mb-6 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-sky-50 p-5 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Certification Aqil Bina</p>
                <h2 className="mt-1 text-2xl font-black text-slate-900">{certification.label}</h2>
                <p className="mt-1 text-sm text-slate-600">Badge public affiché à vos clients et partenaires.</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Score global</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">{globalScore}</span>
                <span className="text-sm text-slate-500">/ 100</span>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">QCM technique</p>
              <p className="mt-2 text-xl font-black text-blue-700">{qcmScore}%</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Avis clients</p>
              <p className="mt-2 text-xl font-black text-emerald-700">{clientRating.toFixed(1)}/5</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Volume</p>
              <p className="mt-2 text-xl font-black text-violet-700">{reviewedProjects} avis</p>
            </div>
          </div>
        </div>

        {!qcmValidated && (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-bold text-slate-900">Questionnaire de certification</h3>
              </div>
            </div>

            <div className="space-y-5">
              {certificationQuestions.map((question) => (
                <div key={question.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">{question.id}. {question.question}</p>
                  <div className="mt-3 grid gap-2 md:grid-cols-3">
                    {question.options.map((option) => {
                      const selected = answers[question.id] === option;
                      const isCorrect = isSubmitted && option === question.correct;
                      const isWrongSelected = isSubmitted && selected && option !== question.correct;

                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => handleAnswer(question.id, option)}
                          className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                            isCorrect
                              ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                              : isWrongSelected
                                ? "border-rose-300 bg-rose-100 text-rose-800"
                                : selected
                                  ? "border-blue-300 bg-blue-100 text-blue-700"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-blue-200"
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                {isSubmitted ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    Score actuel : <span className={`font-bold ${certification.color}`}>{qcmScore}%</span>
                  </>
                ) : (
                  <>
                    <Star className="h-4 w-4 text-amber-500" />
                    Répondez à chaque question pour calculer votre badge public.
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={handleSubmit}
                className="rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                disabled={qcmValidated || isSubmitted}
              >
                Valider mon QCM
              </button>
            </div>
          </div>
        )}

        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-3 shadow-sm mt-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <input
              type="text"
              value={query}
              onChange={(e) => {
                const next = e.target.value;
                setQuery(next);
                if (next.trim().length >= 2 || next.trim().length === 0) {
                  void fetchProjects(next);
                }
              }}
              placeholder="Rechercher par nom client, téléphone ou email"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none ring-0 focus:border-blue-500"
            />
          </div>
        </div>

        {projects.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Aucun projet créé.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((project) => {
              const depositPercent = Number(project.depositPercent ?? 0);
              const depositValid = Boolean(project.depositValidated) || depositPercent >= 25;

              return (
                <div key={project.id} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Projet</p>
                      <h3 className="mt-1 text-[15px] font-bold text-slate-900 sm:text-lg">{project.name}</h3>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] ${depositValid ? 'border border-emerald-200 bg-emerald-100 text-emerald-700' : 'border border-amber-200 bg-amber-100 text-amber-700'}`}>
                      {depositValid ? 'Paiement OK' : 'Paiement à valider'}
                    </span>
                  </div>

                  <div className="mt-4 space-y-3 text-sm text-slate-700">
                    <div><span className="font-medium text-slate-900">Nom du projet :</span> {project.name}</div>
                    <div><span className="font-medium text-slate-900">Type de projet :</span> {project.type || "Non spécifié"}</div>
                    <div><span className="font-medium text-slate-900">Statut de paiement :</span> {depositValid ? 'Validé' : 'À vérifier'}</div>
                  </div>

                  <button
                    onClick={() => router.push(`/artisan/projets/${project.id}`)}
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                  >
                    <Eye className="w-4 h-4" /> Voir l’offre
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}