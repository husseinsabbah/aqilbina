# Assistant IA Vendeur — Spécification technique

## 1. Objectif

L’assistant IA vendeur aide le vendeur à :
- analyser les projets des artisans ;
- proposer des produits adaptés depuis le catalogue du vendeur ;
- recommander des tutoriels pertinents ;
- poser des questions pour affiner les besoins ;
- partager des ressources avec l’artisan ;
- être configurable en production sans redéploiement complet.

## 2. Architecture

Le principe est la séparation des responsabilités :

- Moteur IA : appels API, prompt building, validation, parsing.
- Données métier : configuration, catalogue, tutoriels, projets, historique.
- Front : visualisation des recommandations et chat.
- Admin : modification des prompts, règles et activation.

## 3. Modèles Prisma

### 3.1 Relations ajoutées

```prisma
model User {
  // ... relations existantes ...
  assistantConfigs AssistantConfig[]
  assistantLogs    AssistantLog[]
  chatMessages     ChatMessage[]
  userTutorials    UserTutorial[]
}

model Agent {
  // ... relations existantes ...
  assistantConfigs AssistantConfig[]
  assistantLogs    AssistantLog[]
  chatMessages     ChatMessage[]
}

model Project {
  // ... relations existantes ...
  chatMessages    ChatMessage[]
  userTutorials   UserTutorial[]
}
```

### 3.2 Nouveaux modèles

```prisma
model AssistantConfig {
  id          String   @id @default(cuid())
  agentId     String
  agent       Agent    @relation(fields: [agentId], references: [id], onDelete: Cascade)
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  name        String
  role        String
  tone        String
  systemPrompt String @db.Text
  rules       String @db.Text
  isActive    Boolean @default(true)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  versions    AssistantConfigVersion[]
}

model AssistantConfigVersion {
  id            String   @id @default(cuid())
  configId      String
  config        AssistantConfig @relation(fields: [configId], references: [id], onDelete: Cascade)

  version       Int
  systemPrompt  String   @db.Text
  role          String
  tone          String
  rules         String   @db.Text
  status        String   // "draft" | "active" | "archived"
  testedAt      DateTime?
  createdBy     String
  createdAt     DateTime @default(now())
}

model ChatMessage {
  id          String   @id @default(cuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  agentId     String?
  agent       Agent?   @relation(fields: [agentId], references: [id], onDelete: SetNull)

  role        String   // "user" | "assistant"
  content     String   @db.Text
  context     String?  @db.Text
  metadata    String?  @db.Text
  createdAt   DateTime @default(now())
}

model AssistantLog {
  id          String   @id @default(cuid())
  agentId     String
  agent       Agent    @relation(fields: [agentId], references: [id], onDelete: Cascade)

  projectId   String?
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  action      String   // "analyze" | "ask" | "share" | "send_question"
  prompt      String?  @db.Text
  response    String?  @db.Text
  durationMs  Int
  tokensUsed  Int?
  error       String?  @db.Text
  status      String   // "success" | "error" | "rejected"
  createdAt   DateTime @default(now())
}

model Tutorial {
  id          String   @id @default(cuid())
  title       String
  type        String   // "video" | "text" | "link"
  content     String?
  url         String?
  thumbnail   String?
  description String?
  keywords    String
  tags        String?
  projectType String?
  difficulty  String?  // "beginner" | "intermediate" | "expert"
  trade       String?
  source      String?
  sourceId    String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  userTutorials UserTutorial[]
}

model UserTutorial {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  tutorialId  String
  tutorial    Tutorial @relation(fields: [tutorialId], references: [id], onDelete: Cascade)

  projectId   String?
  project     Project? @relation(fields: [projectId], references: [id], onDelete: SetNull)

  savedAt     DateTime @default(now())
  sharedAt    DateTime?
  sharedWith  String?
  createdAt   DateTime @default(now())

  @@unique([userId, tutorialId])
}
```

## 4. API à implémenter

### 4.1 Admin
- GET /api/admin/assistant-config
- POST /api/admin/assistant-config
- GET /api/admin/assistant-config/[id]
- PUT /api/admin/assistant-config/[id]
- POST /api/admin/assistant-config/[id]/version
- POST /api/admin/assistant-config/[id]/activate
- GET /api/admin/assistant-logs

### 4.2 Agent / vendeur
- POST /api/agent/analyze
- POST /api/agent/ask
- GET /api/agent/conversation
- POST /api/agent/share-tutorial
- POST /api/agent/send-question

## 5. Format resposta de l’IA (standardisé)

```json
{
  "summary": "Résumé du projet et du besoin principal.",
  "recommendedProducts": [
    {
      "productId": "prod_123",
      "name": "Carrelage céramique",
      "brand": "MarcaX",
      "price": 34.5,
      "stock": 14,
      "justification": "Compatible avec une salle de bain et un budget moyen."
    }
  ],
  "recommendedTutorials": [
    {
      "tutorialId": "tut_456",
      "title": "Pose du carrelage en salle de bain",
      "type": "video",
      "url": "https://...",
      "description": "Guide de pose et préparation du support."
    }
  ],
  "questions": [
    "Souhaitez-vous une finition mate ou brillante ?"
  ],
  "nextAction": "Valider la recommandation avant le devis final."
}
```

## 6. Règles de sécurité

- vérifier la session
- vérifier l’accès au projet
- vérifier l’agent actif
- vérifier que la config est active
- vérifier les permissions par rôle
- ne jamais exposer des données hors périmètre

## 7. Prompt système recommandé

```text
Tu es {role}. Tu as un ton {tone}.

Règles de fonctionnement :
- Tu ne proposes QUE des produits présents dans le catalogue fourni.
- Tu n’inventes JAMAIS de prix, stock ou délais.
- Tu restes dans le contexte du projet.
- Si une information manque, tu poses une question.
- Tu réponds uniquement en JSON valide.
- Tu dois respecter les règles métier suivantes :
{rules}

Contexte du projet :
- Type : {project.type}
- Surface : {project.surface}
- Budget estimé : {project.budgetEstimate}
- Description : {project.description}
- Besoins : {project.needs}

Catalogue du vendeur :
{products}

Tutoriels disponibles :
{tutorials}

Historique récent de conversation :
{history}

Objectif :
1. Décrire brièvement le besoin principal.
2. Proposer 3 à 5 produits adaptés.
3. Proposer 2 à 3 tutoriels utiles.
4. Poser 2 à 3 questions si besoin.
5. Donner une prochaine action claire.

Réponds uniquement en JSON.
```

## 8. Validation post-réponse

Avant d’afficher la réponse :
- les produits doivent exister en base
- les tutoriels doivent exister en base
- le JSON doit avoir les bons champs
- si invalide, utiliser un fallback

## 9. Fallback recommandé

```json
{
  "summary": "Je n’ai pas pu analyser ce projet avec assez de précision. Pouvez-vous préciser votre besoin principal ?",
  "recommendedProducts": [],
  "recommendedTutorials": [],
  "questions": [
    "Quel est le produit principal recherché ?",
    "Avez-vous une préférence de budget ou de finition ?"
  ],
  "nextAction": "Compléter les informations manquantes."
}
```

## 10. Prochaine étape

La prochaine étape est la mise en place des routes API concrètes :
- POST /api/agent/analyze
- POST /api/agent/ask
- GET /api/agent/conversation
- POST /api/admin/assistant-config
- POST /api/admin/assistant-config/[id]/version

