export const locales = ['fr', 'en', 'ar'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'fr';

export const messages = {
  fr: {
    nav: {
      home: 'Accueil',
      ia: 'IA',
      casUsage: 'Cas d\'usage',
      tarifs: 'Tarifs',
      appareils: 'Appareils',
      aide: 'Aide',
      contact: 'Contact',
      login: 'Connexion',
      trial: 'Essai gratuit',
      logout: 'Déconnexion',
    },
    home: {
      badge: 'IA pour le BTP, au service des talents terrain',
      cta: 'Trouver un artisan',
      secondary: 'Rechercher',
      headline: "L'IA qui booste les talents du BTP, pas qui les remplace.",
      subheadline: "Aqil Bina s'adapte à votre métier, pas l'inverse.",
    },
    profile: {
      findArtisan: 'Trouver un artisan',
      findVendor: 'Trouver un vendeur',
    },
    settings: {
      title: 'Paramètres',
      servicesTitle: 'Paramètres – Prestations',
      infoTitle: 'Informations',
      profileTitle: 'Mon profil',
      save: 'Enregistrer',
      saving: 'Enregistrement...',
      firstName: 'Prénom',
      lastName: 'Nom',
      age: 'Âge',
      phone: 'Téléphone',
      email: 'Adresse e-mail',
      address: 'Adresse de l\'artisan',
      companyName: 'Nom de l\'entreprise',
      brandColor: 'Couleur principale',
      logo: 'Logo',
      upload: 'Téléchargement...',
      trade: 'Métier principal',
      selectTrade: 'Sélectionnez un métier...',
      artisanInfo: 'Informations artisan',
      noServices: 'Aucune prestation définie.',
      addService: 'Ajouter une prestation',
      manageAgents: 'Mes agents',
      addAgent: 'Ajouter un agent',
      noAgent: 'Aucun agent actif.',
      subscribe: 'Souscrivez à un abonnement pour accéder à vos fonctionnalités.',
      viewOffers: 'Voir les offres',
      loading: 'Chargement...',
      saveProfile: 'Enregistrer les paramètres',
    },
    auth: {
      signInTitle: 'Connectez-vous',
      signInSubtitle: 'Connectez-vous à votre espace',
      signInError: 'Email ou mot de passe incorrect',
      signInLoading: 'Connexion...',
      signInButton: 'Se connecter',
      noAccount: 'Pas encore de compte ?',
      createAccount: 'S\'inscrire',
      registerTitle: 'Créer un compte',
      registerSubtitle: 'Créez votre compte',
      email: 'Adresse email',
      password: 'Mot de passe',
      fullName: 'Nom complet',
      companyName: 'Nom de l\'entreprise',
      companyNameOptional: 'Nom de l\'entreprise (optionnel)',
      trade: 'Métier',
      selectTrade: 'Sélectionnez votre métier',
      createAccountButton: 'S\'inscrire',
      createAccountLoading: 'Inscription...',
      alreadyHaveAccount: 'Déjà un compte ?',
      login: 'Se connecter',
      createMyAccount: 'Créer mon compte',
      createMyAccountLoading: 'Création en cours...',
      loginUrl: '/login',
      signUpUrl: '/auth/signup',
      signInUrl: '/auth/signin',
      artisant: 'Artisan',
      vendeur: 'Vendeur',
      user: 'Utilisateur',
      emailPlaceholder: 'hassan@aqilbina.com',
      passwordPlaceholder: '••••••••',
    },
  },
  en: {
    nav: {
      home: 'Home',
      ia: 'AI',
      casUsage: 'Use cases',
      tarifs: 'Pricing',
      appareils: 'Devices',
      aide: 'Help',
      contact: 'Contact',
      login: 'Login',
      trial: 'Free trial',
      logout: 'Logout',
    },
    home: {
      badge: 'AI for construction, built for field experts',
      cta: 'Find an artisan',
      secondary: 'Search',
      headline: 'The AI that boosts construction talent instead of replacing it.',
      subheadline: 'Aqil Bina adapts to your trade, not the other way around.',
    },
    profile: {
      findArtisan: 'Find an artisan',
      findVendor: 'Find a vendor',
    },
    settings: {
      title: 'Settings',
      servicesTitle: 'Settings – Services',
      infoTitle: 'Information',
      profileTitle: 'My profile',
      save: 'Save',
      saving: 'Saving...',
      firstName: 'First name',
      lastName: 'Last name',
      age: 'Age',
      phone: 'Phone',
      email: 'Email address',
      address: 'Artisan address',
      companyName: 'Company name',
      brandColor: 'Primary color',
      logo: 'Logo',
      upload: 'Uploading...',
      trade: 'Main trade',
      selectTrade: 'Select a trade...',
      artisanInfo: 'Artisan information',
      noServices: 'No services defined.',
      addService: 'Add a service',
      manageAgents: 'My agents',
      addAgent: 'Add an agent',
      noAgent: 'No active agent.',
      subscribe: 'Subscribe to a plan to access your features.',
      viewOffers: 'View offers',
      loading: 'Loading...',
      saveProfile: 'Save settings',
    },
    auth: {
      signInTitle: 'Log in',
      signInSubtitle: 'Access your workspace',
      signInError: 'Invalid email or password',
      signInLoading: 'Logging in...',
      signInButton: 'Log in',
      noAccount: 'No account yet?',
      createAccount: 'Sign up',
      registerTitle: 'Create an account',
      registerSubtitle: 'Create your account',
      email: 'Email address',
      password: 'Password',
      fullName: 'Full name',
      companyName: 'Company name',
      companyNameOptional: 'Company name (optional)',
      trade: 'Profession',
      selectTrade: 'Select your profession',
      createAccountButton: 'Sign up',
      createAccountLoading: 'Signing up...',
      alreadyHaveAccount: 'Already have an account?',
      login: 'Log in',
      createMyAccount: 'Create my account',
      createMyAccountLoading: 'Creating account...',
      loginUrl: '/login',
      signUpUrl: '/auth/signup',
      signInUrl: '/auth/signin',
      artisant: 'Artisan',
      vendeur: 'Seller',
      user: 'User',
      emailPlaceholder: 'hassan@aqilbina.com',
      passwordPlaceholder: '••••••••',
    },
  },
  ar: {
    nav: {
      home: 'الرئيسية',
      ia: 'الذكاء الاصطناعي',
      casUsage: 'حالات الاستخدام',
      tarifs: 'الأسعار',
      appareils: 'الأجهزة',
      aide: 'المساعدة',
      contact: 'التواصل',
      login: 'تسجيل الدخول',
      trial: 'تجربة مجانية',
      logout: 'تسجيل الخروج',
    },
    home: {
      badge: 'ذكاء اصطناعي للبناء يدعم خبراء الميدان',
      cta: 'إيجاد حرفي',
      secondary: 'بحث',
      headline: 'الذكاء الاصطناعي الذي يرفع كفاءة خبراء البناء بدلًا من استبدالهم.',
      subheadline: 'تتكيف Aqil Bina مع مهنتك، وليس العكس.',
    },
    profile: {
      findArtisan: 'إيجاد حرفي',
      findVendor: 'إيجاد بائع',
    },
    settings: {
      title: 'الإعدادات',
      servicesTitle: 'الإعدادات – الخدمات',
      infoTitle: 'المعلومات',
      profileTitle: 'ملفي الشخصي',
      save: 'حفظ',
      saving: 'جارٍ الحفظ...',
      firstName: 'الاسم الأول',
      lastName: 'اسم العائلة',
      age: 'العمر',
      phone: 'الهاتف',
      email: 'البريد الإلكتروني',
      address: 'عنوان الحرفي',
      companyName: 'اسم الشركة',
      brandColor: 'اللون الأساسي',
      logo: 'الشعار',
      upload: 'جارٍ الرفع...',
      trade: 'المهنة الرئيسية',
      selectTrade: 'اختر مهنة...',
      artisanInfo: 'معلومات الحرفي',
      noServices: 'لا توجد خدمات محددة.',
      addService: 'إضافة خدمة',
      manageAgents: 'وكلائي',
      addAgent: 'إضافة وكيل',
      noAgent: 'لا توجد وكلاء نشطون.',
      subscribe: 'اشترك في خطة للوصول إلى ميزاتك.',
      viewOffers: 'عرض العروض',
      loading: 'جارٍ التحميل...',
      saveProfile: 'حفظ الإعدادات',
    },
    auth: {
      signInTitle: 'تسجيل الدخول',
      signInSubtitle: 'دخول إلى فضائك',
      signInError: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
      signInLoading: 'جارٍ تسجيل الدخول...',
      signInButton: 'تسجيل الدخول',
      noAccount: 'ليس لديك حساب؟',
      createAccount: 'إنشاء حساب',
      registerTitle: 'إنشاء حساب',
      registerSubtitle: 'أنشئ حسابك',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      fullName: 'الاسم الكامل',
      companyName: 'اسم المؤسسة',
      companyNameOptional: 'اسم المؤسسة (اختياري)',
      trade: 'المهنة',
      selectTrade: 'اختر مهنتك',
      createAccountButton: 'إنشاء حساب',
      createAccountLoading: 'جارٍ إنشاء الحساب...',
      alreadyHaveAccount: 'هل لديك حساب بالفعل؟',
      login: 'تسجيل الدخول',
      createMyAccount: 'إنشاء حسابي',
      createMyAccountLoading: 'جارٍ إنشاء الحساب...',
      loginUrl: '/login',
      signUpUrl: '/auth/signup',
      signInUrl: '/auth/signin',
      artisant: 'حرفي',
      vendeur: 'بائع',
      user: 'مستخدم',
      emailPlaceholder: 'hassan@aqilbina.com',
      passwordPlaceholder: '••••••••',
    },
  },
} as const;

export type Dictionary = (typeof messages)[Locale];

export function getDictionary(locale: Locale): Dictionary {
  return messages[locale];
}

export function resolveLocale(value?: string | null): Locale {
  if (value && locales.includes(value as Locale)) {
    return value as Locale;
  }
  return defaultLocale;
}

export function getLocaleFromStorage(): Locale {
  if (typeof window === 'undefined') {
    return defaultLocale;
  }

  const fromSearch = new URLSearchParams(window.location.search).get('lang');
  if (fromSearch) return resolveLocale(fromSearch);

  const stored = window.localStorage.getItem('aqil-locale');
  if (stored) return resolveLocale(stored);

  return defaultLocale;
}

export function setLocale(locale: Locale) {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem('aqil-locale', locale);
  const url = new URL(window.location.href);
  if (locale === defaultLocale) {
    url.searchParams.delete('lang');
  } else {
    url.searchParams.set('lang', locale);
  }

  window.history.replaceState({}, '', `${url.pathname}${url.search}`);
  window.location.reload();
}
