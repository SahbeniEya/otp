"use client";
import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';

// Simple key-value dictionaries. Extend as needed.
const dictionaries = {
  en: {
    app_title: 'OTP Dashboard',
    app_subtitle: 'Secure Authentication Management',
    tab_generate: 'Generate OTP',
    tab_validate: 'Validate OTP',
    tab_services: 'Services',
    generate_title: 'Generate OTP',
    generate_desc: 'Generate a new OTP using your preferred method',
    delivery_method: 'Delivery Method',
    email_otp: 'Email OTP',
    totp: 'Time-based OTP (TOTP)',
    otp_format: 'OTP Format',
    numeric: 'Numeric (0-9)',
    alphanumeric: 'Alphanumeric (A-Z, 0-9)',
    alphabet: 'Alphabet only (A-Z)',
    advanced_settings: 'Advanced Settings',
    otp_length: 'OTP Length',
    expiry_time: 'Expiry Time',
    seconds_suffix: 's',
    email_address: 'Email Address',
    account_name: 'Account Name',
  // send_otp & setup_totp defined once (duplicates removed)
    totp_setup_title: 'TOTP Setup',
  // enter_first_code & verify_code defined once (duplicates removed)
    verifying: 'Verifying…',
    system_online: 'System Online',
    services_title: 'OTP Services',
    services_subtitle: 'Manage your OTP service configurations',
    degraded_banner: 'Redis unavailable – running in memory (non persistent).',
    all_systems_ok: 'All Systems Operational',
    totp_verify: 'Verify TOTP',
    totp_code_label: 'TOTP Code',
    totp_window_label: 'Tolerance window (± steps of 30s)',
    totp_window_hint: 'A larger window accepts codes slightly early or late.',
    secret_editable: 'Secret (editable)',
    verify: 'Verify',
    verifying_action: 'Verifying…',
    totp_explain_1: 'TOTP = Time-based One-Time Password: ephemeral code from shared secret + time.',
    totp_explain_2: 'Used for MFA — safer than email alone because it depends on a locally stored secret.',
    totp_explain_3: 'Algorithm (RFC 6238): code = Trunc(HMAC-SHA1(secret, floor(time/30))).',
    lang_switch: 'Français',
    enter_email_otp: 'Please enter both email and OTP code',
    no_valid_otp: 'No valid OTP found. Please generate a new OTP first.',
  otp_verified_success: 'OTP verified successfully',
    validate_failed: 'Failed to validate OTP',
    validate_desc: 'Enter the OTP you received to validate',
    otp_code: 'OTP Code',
    using_otp_for: 'Using OTP generated for',
    validating: 'Validating...',
    generating: 'Generating...',
    email_required: 'Please enter an email address',
    otp_sent_to: 'OTP sent to',
    totp_setup_success: 'TOTP setup successful. Scan the QR code to proceed.',
    failed_generate: 'Failed to generate OTP',
    send_otp: 'Send OTP',
    setup_totp: 'Setup TOTP',
    scan_with_auth_app: 'Scan with Google Authenticator / Authy',
    enter_first_code: 'Enter first 6-digit code',
    verifying_code: 'Verifying…',
    verify_code: 'Verify Code',
    totp_verified: 'TOTP verified ✔',
    invalid_token: 'Invalid token',
    verification_failed: 'Verification failed',
    configure: 'Configure',
    enable: 'Enable',
    disable: 'Disable',
    add_service: 'Add Service',
    add_new_service: 'Add New Service',
    service_type: 'Service Type',
    service_name: 'Service Name',
    select_service_type: 'Select service type',
    create_service: 'Create Service',
    history: 'History',
    stats: 'Stats',
    recent_activity: 'Recent Activity',
    otp_generated: 'OTP Generated',
  otp_verified_label: 'OTP Verified',
    sent_to: 'Sent to',
    for_account: 'For',
    total_otps: 'Total OTPs',
    total_generated: 'Total Generated',
    success_rate: 'Success Rate',
    verification_success_rate: 'Verification Success Rate',
    emails_sent: 'Emails Sent',
    successfully_sent: 'Successfully Sent',
    failed_emails: 'Failed Emails',
    delivery_failures: 'Delivery Failures'
    ,settings: 'Settings'
    ,email_service_desc: 'Email-based OTP service'
    ,totp_service_desc: 'Time-based OTP service'
    ,active_status: 'Active'
    ,disabled_status: 'Disabled'
    ,type: 'Type'
    ,length: 'Length'
    ,ttl: 'TTL'
    ,rate_limit: 'Rate Limit'
    ,digits: 'digits'
    ,default_otp_type: 'Default OTP Type'
    ,select_otp_type: 'Select OTP type'
    ,rate_limit_per_minute: 'Rate Limit (per minute)'
    ,time_step: 'Time Step'
    ,select_time_step: 'Select time step'
    ,thirty_seconds: '30 seconds'
    ,sixty_seconds: '60 seconds'
    ,configure_service_desc: 'Customize settings for this OTP service.'
    ,add_service_desc: 'Configure a new OTP service'
    ,add_service_explain: 'Configure a new OTP service type and its settings.'
    ,degraded_detail: 'Redis unavailable – running in memory (non persistent). No action required for tests.'
    ,two_min_ago: '2 min ago'
    ,five_min_ago: '5 min ago'
    ,refresh: 'Refresh'
    ,last_updated: 'Last updated'
    ,service_status: 'Service Status'
    ,current_status_services: 'Current status of OTP services'
    ,not_configured: 'Not Configured'
    ,totp_tab: 'TOTP'
    ,failed_service_load: 'Failed to load service data'
  },
  fr: {
    app_title: 'Tableau OTP',
    app_subtitle: 'Gestion sécurisée de l’authentification',
    tab_generate: 'Générer OTP',
    tab_validate: 'Valider OTP',
    tab_services: 'Services',
    generate_title: 'Générer OTP',
    generate_desc: 'Générer un nouvel OTP avec la méthode choisie',
    delivery_method: 'Méthode de livraison',
    email_otp: 'OTP Email',
    totp: 'OTP Temporel (TOTP)',
    otp_format: 'Format OTP',
    numeric: 'Numérique (0-9)',
    alphanumeric: 'Alphanumérique (A-Z, 0-9)',
    alphabet: 'Alphabet (A-Z)',
    advanced_settings: 'Paramètres avancés',
    otp_length: 'Longueur OTP',
    expiry_time: 'Durée de validité',
    seconds_suffix: 's',
    email_address: 'Adresse Email',
    account_name: 'Nom du compte',
  // send_otp & setup_totp duplicates removed fr
    totp_setup_title: 'Configuration TOTP',
  // enter_first_code & verify_code duplicates removed fr
    verifying: 'Vérification…',
    system_online: 'Système en ligne',
    services_title: 'Services OTP',
    services_subtitle: 'Gérer la configuration de vos services OTP',
    degraded_banner: 'Redis indisponible – fonctionnement en mémoire (non persistant).',
    all_systems_ok: 'Tous les systèmes opérationnels',
    totp_verify: 'Vérifier TOTP',
    totp_code_label: 'Code TOTP',
    totp_window_label: 'Fenêtre de tolérance (± pas de 30s)',
    totp_window_hint: 'Une fenêtre plus grande accepte des codes légèrement en avance ou retard.',
    secret_editable: 'Secret (modifiable)',
    verify: 'Vérifier',
    verifying_action: 'Vérification…',
    totp_explain_1: 'TOTP = Time-based One-Time Password : code éphémère basé sur un secret + l’heure.',
    totp_explain_2: 'Utilisé pour la MFA — plus sûr que l’email seul car dépend d’un secret local.',
    totp_explain_3: 'Algorithme (RFC 6238) : code = Trunc(HMAC-SHA1(secret, floor(time/30))).',
    lang_switch: 'English',
    enter_email_otp: 'Veuillez saisir email et code OTP',
    no_valid_otp: "Aucun OTP valide. Générez d'abord un nouvel OTP.",
  otp_verified_success: 'OTP vérifié avec succès',
    validate_failed: 'Échec de la vérification de l’OTP',
    validate_desc: 'Entrez le code OTP reçu pour valider',
    otp_code: 'Code OTP',
    using_otp_for: 'OTP généré pour',
    validating: 'Vérification...',
    generating: 'Génération...',
    email_required: 'Veuillez entrer une adresse email',
    otp_sent_to: 'OTP envoyé à',
    totp_setup_success: 'Configuration TOTP réussie. Scanne le QR.',
    failed_generate: 'Échec de génération OTP',
    send_otp: 'Envoyer OTP',
    setup_totp: 'Configurer TOTP',
    scan_with_auth_app: 'Scanne avec Google Authenticator / Authy',
    enter_first_code: 'Entrez le premier code à 6 chiffres',
    verifying_code: 'Vérification…',
    verify_code: 'Vérifier',
    totp_verified: 'TOTP vérifié ✔',
    invalid_token: 'Token invalide',
    verification_failed: 'Échec de la vérification',
    configure: 'Configurer',
    enable: 'Activer',
    disable: 'Désactiver',
    add_service: 'Ajouter Service',
    add_new_service: 'Nouveau Service',
    service_type: 'Type de service',
    service_name: 'Nom du service',
    select_service_type: 'Sélectionner le type',
    create_service: 'Créer',
    history: 'Historique',
    stats: 'Statistiques',
    recent_activity: 'Activité récente',
    otp_generated: 'OTP Généré',
  otp_verified_label: 'OTP Vérifié',
    sent_to: 'Envoyé à',
    for_account: 'Pour',
    total_otps: 'OTPs Totaux',
    total_generated: 'Total Générés',
    success_rate: 'Taux de succès',
    verification_success_rate: 'Taux de vérification',
    emails_sent: 'Emails envoyés',
    successfully_sent: 'Envoyés avec succès',
    failed_emails: 'Emails échoués',
    delivery_failures: 'Échecs de livraison'
    ,settings: 'Paramètres'
    ,email_service_desc: 'Service OTP par e-mail'
    ,totp_service_desc: 'Service OTP basé sur le temps'
    ,active_status: 'Actif'
    ,disabled_status: 'Désactivé'
    ,type: 'Type'
    ,length: 'Longueur'
    ,ttl: 'Durée'
    ,rate_limit: 'Limite de fréquence'
    ,digits: 'chiffres'
    ,default_otp_type: 'Type OTP par défaut'
    ,select_otp_type: 'Sélectionner type OTP'
    ,rate_limit_per_minute: 'Limite (par minute)'
    ,time_step: 'Pas de temps'
    ,select_time_step: 'Sélectionner pas de temps'
    ,thirty_seconds: '30 secondes'
    ,sixty_seconds: '60 secondes'
    ,configure_service_desc: 'Personnaliser les paramètres pour ce service OTP.'
    ,add_service_desc: 'Configurer un nouveau service OTP'
    ,add_service_explain: 'Configurer un nouveau type de service OTP et ses paramètres.'
    ,degraded_detail: 'Redis indisponible – fonctionnement en mémoire (non persistant). Aucune action requise pour les tests.'
    ,two_min_ago: 'il y a 2 min'
    ,five_min_ago: 'il y a 5 min'
    ,refresh: 'Rafraîchir'
    ,last_updated: 'Dernière mise à jour'
    ,service_status: 'Statut des services'
    ,current_status_services: 'Statut actuel des services OTP'
    ,not_configured: 'Non configuré'
    ,totp_tab: 'TOTP'
    ,failed_service_load: 'Échec du chargement des données de service'
  }
};

export type Locale = keyof typeof dictionaries;

interface I18nContextShape {
  locale: Locale;
  t: (key: string) => string;
  setLocale: (l: Locale) => void;
}

const I18nContext = createContext<I18nContextShape | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('locale');
      if (stored === 'en' || stored === 'fr') return stored;
    }
    return 'fr';
  });
  const setAndPersist = (l: Locale) => {
    setLocale(l);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('locale', l);
    }
  };
  const value = useMemo(() => ({
    locale,
    setLocale: setAndPersist,
    t: (key: string) => dictionaries[locale][key as keyof typeof dictionaries[typeof locale]] || key
  }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useT() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useT must be used within I18nProvider');
  return ctx;
}
