"use client";

import ProjectRequestForm from "@/app/client/[id]/ProjectRequestForm";

const defaultValues = {
  clientName: "",
  clientPhone: "",
  clientEmail: "",
  clientAddress: "",
  projectName: "",
  projectType: "",
  customProjectType: "",
  workType: "",
  description: "",
  solLongueur: "",
  solLargeur: "",
  solSurface: "",
  murLongueur: "",
  murHauteur: "",
  nbMurs: "",
  murSurface: "",
  surface: "",
  budgetEstimate: "",
  specialtyDetails: "",
};

export default function DevisNouveauPage() {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Je lance une demande de devis</h1>
          <p className="mt-2 text-slate-600">
            Remplissez le formulaire ci-dessous. Votre projet sera envoyé à tous les artisans correspondant aux métiers que vous sélectionnez.
          </p>
        </div>

        {/* Mode broadcast : artisanId = "broadcast" */}
        <ProjectRequestForm
          artisanId="broadcast"
          artisanName="tous les professionnels concernés"
          trade="general"
          broadcastMode={true}
          targetRole="all"
          defaultValues={defaultValues}
        />
      </div>
    </div>
  );
}