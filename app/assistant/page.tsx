// app/page.js
"use client";
import { useState } from "react";

export default function Home() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur inconnue");
      }
      setResult(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "2rem auto", padding: "1rem" }}>
      <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>
        🧑‍🔧 Assistant Carreleur IA
      </h1>
      <p style={{ color: "#555", marginBottom: "2rem" }}>
        Uploadez une photo de votre chantier (salon, terrasse, salle de bain...)
        et laissez l’IA générer un devis technique.
      </p>

      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          maxWidth: "500px",
        }}
      >
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setFile(e.target.files[0])}
          disabled={loading}
          style={{ padding: "0.5rem", border: "1px solid #ccc", borderRadius: "4px" }}
        />
        <button
          type="submit"
          disabled={!file || loading}
          style={{
            padding: "0.75rem 1.5rem",
            backgroundColor: !file || loading ? "#aaa" : "#1E40AF",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: !file || loading ? "not-allowed" : "pointer",
            fontWeight: "bold",
          }}
        >
          {loading ? "⏳ Analyse en cours (jusqu'à 1 min)..." : "📤 Lancer l'analyse"}
        </button>
      </form>

      {error && (
        <div
          style={{
            marginTop: "2rem",
            padding: "1rem",
            backgroundColor: "#fee",
            border: "1px solid #fcc",
            borderRadius: "4px",
            color: "#c00",
          }}
        >
          <strong>Erreur :</strong> {error}
        </div>
      )}

      {loading && (
        <div style={{ marginTop: "2rem", color: "#555" }}>
          🔄 L’IA analyse votre photo, applique les règles métier et calcule les
          quantités... Veuillez patienter.
        </div>
      )}

      {result && (
        <div style={{ marginTop: "2rem" }}>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
            📋 Devis généré
          </h2>
          <div
            style={{
              backgroundColor: "#f8f9fa",
              padding: "1.5rem",
              borderRadius: "8px",
              border: "1px solid #e0e0e0",
              whiteSpace: "pre-wrap",
              fontFamily: "monospace",
              fontSize: "0.9rem",
              maxHeight: "600px",
              overflowY: "auto",
            }}
          >
            {result.devis}
          </div>

          <details style={{ marginTop: "2rem" }}>
            <summary style={{ cursor: "pointer", fontWeight: "bold", color: "#1E40AF" }}>
              🔍 Voir les données techniques détaillées (JSON)
            </summary>
            <pre
              style={{
                backgroundColor: "#2d2d2d",
                color: "#f8f8f2",
                padding: "1rem",
                borderRadius: "4px",
                overflowX: "auto",
                fontSize: "0.8rem",
              }}
            >
              {JSON.stringify(result.details, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}