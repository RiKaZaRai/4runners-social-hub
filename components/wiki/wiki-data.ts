// Types for the structured Wiki

export interface WikiNode {
  id: string;
  type: 'doc' | 'folder';
  title: string;
  nodes?: WikiNode[];
}

export interface WikiSection {
  id: string;
  title: string;
  nodes: WikiNode[];
}

export interface WikiQuickLink {
  label: string;
  to: string;
}

export interface WikiPopularItem {
  title: string;
  to: string;
}

export interface WikiRecentItem {
  title: string;
  to: string;
}

export interface WikiHome {
  id: 'home';
  type: 'home';
  title: string;
  description: string;
  quickLinks: WikiQuickLink[];
  popular: WikiPopularItem[];
  recent: WikiRecentItem[];
}

export interface WikiDocMeta {
  updated: string;
  tags: string[];
  readingTime: string;
}

export interface WikiDocContent {
  h1: string;
  p1: string;
  steps: string[];
  links: { label: string; to: string }[];
}

export interface WikiDoc {
  id: string;
  title: string;
  meta: WikiDocMeta;
  content: WikiDocContent;
}

export interface WikiIndexItem {
  id: string;
  type: 'doc' | 'folder' | 'section';
  title: string;
  parents: { id: string; title: string; type: string }[];
}

// Build a flat index from sections for search
export function buildWikiIndex(sections: WikiSection[]): WikiIndexItem[] {
  const flat: WikiIndexItem[] = [];

  const walk = (
    nodes: WikiNode[],
    parents: { id: string; title: string; type: string }[] = []
  ) => {
    nodes.forEach((n) => {
      flat.push({ id: n.id, type: n.type, title: n.title, parents });
      if (n.nodes) {
        walk(n.nodes, [...parents, { id: n.id, title: n.title, type: n.type }]);
      }
    });
  };

  sections.forEach((s) => {
    walk(s.nodes, [{ id: s.id, title: s.title, type: 'section' }]);
  });

  return flat;
}

// Mock data
export const WIKI_HOME: WikiHome = {
  id: 'home',
  type: 'home',
  title: 'Wiki — Centre de connaissance',
  description:
    'Trouvez rapidement la bonne info par rôle, par process ou par module. Utilisez la recherche ou suivez un parcours recommandé.',
  quickLinks: [
    { label: 'Parcours Admin (15 min)', to: 'doc_admin_parcours' },
    { label: 'Process : Validation', to: 'proc_validation' },
    { label: 'Module : Facturation', to: 'tool_facturation' },
    { label: 'Templates & checklists', to: 'ref_templates' }
  ],
  popular: [
    { title: 'Créer un dossier client', to: 'doc_proc_creation_dossier' },
    { title: 'Règles de validation', to: 'doc_proc_validation_regles' },
    { title: 'Gestion des droits', to: 'doc_admin_droits' },
    { title: 'Checklist livraison', to: 'doc_ref_checklist_livraison' }
  ],
  recent: [
    { title: 'Modèle de compte-rendu', to: 'doc_ref_template_cr' },
    { title: 'Paramétrage notifications', to: 'doc_tool_notifications' },
    { title: 'FAQ — accès', to: 'doc_overview_acces' }
  ]
};

export const WIKI_SECTIONS: WikiSection[] = [
  {
    id: 'overview',
    title: 'Vue d\'ensemble',
    nodes: [
      { id: 'doc_overview_howto', type: 'doc', title: 'Comment utiliser ce Wiki' },
      { id: 'doc_overview_parcours', type: 'doc', title: 'Parcours recommandés' },
      { id: 'doc_overview_acces', type: 'doc', title: 'Accès & rôles' },
      { id: 'doc_overview_faq', type: 'doc', title: 'FAQ rapide' }
    ]
  },
  {
    id: 'byRole',
    title: 'Par rôle',
    nodes: [
      {
        id: 'role_admin',
        type: 'folder',
        title: 'Admin',
        nodes: [
          { id: 'doc_admin_parcours', type: 'doc', title: 'Parcours Admin' },
          { id: 'doc_admin_droits', type: 'doc', title: 'Gestion des droits' },
          { id: 'doc_admin_audit', type: 'doc', title: 'Audit & historique' }
        ]
      },
      {
        id: 'role_operateur',
        type: 'folder',
        title: 'Opérateur',
        nodes: [
          { id: 'doc_op_parcours', type: 'doc', title: 'Parcours Opérateur' },
          { id: 'doc_op_bonnes_pratiques', type: 'doc', title: 'Bonnes pratiques' }
        ]
      },
      {
        id: 'role_manager',
        type: 'folder',
        title: 'Manager',
        nodes: [
          { id: 'doc_mgr_parcours', type: 'doc', title: 'Parcours Manager' },
          { id: 'doc_mgr_reporting', type: 'doc', title: 'Reporting' }
        ]
      }
    ]
  },
  {
    id: 'byProcess',
    title: 'Par process',
    nodes: [
      {
        id: 'proc_creation',
        type: 'folder',
        title: 'Création',
        nodes: [
          { id: 'doc_proc_creation_dossier', type: 'doc', title: 'Créer un dossier client' },
          { id: 'doc_proc_creation_contacts', type: 'doc', title: 'Ajouter des contacts' }
        ]
      },
      {
        id: 'proc_validation',
        type: 'folder',
        title: 'Validation',
        nodes: [
          { id: 'doc_proc_validation_regles', type: 'doc', title: 'Règles de validation' },
          { id: 'doc_proc_validation_refus', type: 'doc', title: 'Gérer un refus' }
        ]
      },
      {
        id: 'proc_facturation',
        type: 'folder',
        title: 'Facturation',
        nodes: [
          { id: 'doc_proc_facturation_emettre', type: 'doc', title: 'Émettre une facture' },
          { id: 'doc_proc_facturation_avoir', type: 'doc', title: 'Créer un avoir' }
        ]
      },
      {
        id: 'proc_support',
        type: 'folder',
        title: 'Support',
        nodes: [
          { id: 'doc_proc_support_ticket', type: 'doc', title: 'Créer un ticket' },
          { id: 'doc_proc_support_escalade', type: 'doc', title: 'Escalade & priorités' }
        ]
      }
    ]
  },
  {
    id: 'byTool',
    title: 'Par module',
    nodes: [
      {
        id: 'tool_facturation',
        type: 'folder',
        title: 'Module Facturation',
        nodes: [
          { id: 'doc_tool_facturation_overview', type: 'doc', title: 'Vue d\'ensemble' },
          { id: 'doc_tool_facturation_param', type: 'doc', title: 'Paramétrage' },
          { id: 'doc_tool_facturation_erreurs', type: 'doc', title: 'Erreurs fréquentes' }
        ]
      },
      {
        id: 'tool_notifications',
        type: 'folder',
        title: 'Notifications',
        nodes: [
          { id: 'doc_tool_notifications', type: 'doc', title: 'Paramétrage notifications' },
          { id: 'doc_tool_notifications_regles', type: 'doc', title: 'Règles & déclencheurs' }
        ]
      },
      {
        id: 'tool_integrations',
        type: 'folder',
        title: 'Intégrations',
        nodes: [
          { id: 'doc_tool_integ_zapier', type: 'doc', title: 'Zapier' },
          { id: 'doc_tool_integ_webhooks', type: 'doc', title: 'Webhooks' }
        ]
      }
    ]
  },
  {
    id: 'refs',
    title: 'Références',
    nodes: [
      { id: 'ref_glossaire', type: 'doc', title: 'Glossaire' },
      { id: 'ref_templates', type: 'doc', title: 'Templates' },
      { id: 'doc_ref_template_cr', type: 'doc', title: 'Modèle — Compte-rendu' },
      { id: 'doc_ref_checklist_livraison', type: 'doc', title: 'Checklist — Livraison' },
      { id: 'ref_changelog', type: 'doc', title: 'Historique des changements' }
    ]
  }
];

export const WIKI_DOCS: Record<string, WikiDoc> = {
  doc_admin_parcours: {
    id: 'doc_admin_parcours',
    title: 'Parcours Admin',
    meta: { updated: 'il y a 2 jours', tags: ['Rôle', 'Onboarding'], readingTime: '7 min' },
    content: {
      h1: 'Objectif',
      p1: 'Ce parcours vous guide pour prendre en main l\'administration : droits, paramètres clés et bonnes pratiques.',
      steps: [
        'Comprendre les rôles et permissions',
        'Configurer les notifications',
        'Vérifier l\'historique et l\'audit',
        'Appliquer les templates et standards'
      ],
      links: [
        { label: 'Gestion des droits', to: 'doc_admin_droits' },
        { label: 'Paramétrage notifications', to: 'doc_tool_notifications' },
        { label: 'Historique des changements', to: 'ref_changelog' }
      ]
    }
  },
  doc_admin_droits: {
    id: 'doc_admin_droits',
    title: 'Gestion des droits',
    meta: { updated: 'il y a 6 jours', tags: ['Rôle', 'Sécurité'], readingTime: '5 min' },
    content: {
      h1: 'Règles simples',
      p1: 'Limitez les accès par défaut. Ouvrez uniquement ce qui est nécessaire au rôle et au contexte.',
      steps: [
        'Créer/éditer un rôle',
        'Assigner des permissions',
        'Tester sur un compte de test',
        'Documenter toute exception'
      ],
      links: [{ label: 'Accès & rôles', to: 'doc_overview_acces' }]
    }
  },
  doc_proc_validation_regles: {
    id: 'doc_proc_validation_regles',
    title: 'Règles de validation',
    meta: { updated: 'hier', tags: ['Process', 'Qualité'], readingTime: '6 min' },
    content: {
      h1: 'Quand valider ?',
      p1: 'La validation sert à garantir la conformité avant passage à l\'étape suivante. Elle doit être rapide et traçable.',
      steps: [
        'Vérifier les champs obligatoires',
        'Contrôler les pièces jointes',
        'Valider ou refuser avec motif',
        'Notifier automatiquement les parties prenantes'
      ],
      links: [
        { label: 'Gérer un refus', to: 'doc_proc_validation_refus' },
        { label: 'Audit & historique', to: 'doc_admin_audit' }
      ]
    }
  },
  doc_tool_notifications: {
    id: 'doc_tool_notifications',
    title: 'Paramétrage notifications',
    meta: { updated: 'il y a 3 semaines', tags: ['Module', 'Paramétrage'], readingTime: '4 min' },
    content: {
      h1: 'Bon réflexe',
      p1: 'Commencez avec un set minimal. Ajoutez ensuite des règles en fonction des irritants (trop/pas assez de notifications).',
      steps: [
        'Activer les notifications essentielles',
        'Définir les déclencheurs',
        'Limiter les destinataires',
        'Tester sur un scénario réel'
      ],
      links: [{ label: 'Règles & déclencheurs', to: 'doc_tool_notifications_regles' }]
    }
  }
};

// Default open folders state
export const DEFAULT_OPEN_MAP: Record<string, boolean> = {
  overview: true,
  byRole: true,
  role_admin: true,
  byProcess: true,
  proc_validation: true,
  byTool: false,
  refs: true
};
