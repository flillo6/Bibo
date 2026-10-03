/**
 * BIBO Engine - Pre-seeded Starter Pack Knowledge Base
 * 
 * 100% verified foundational concepts across common academic subjects.
 * Provides bilingual support (Italian & English) for global community alignment.
 */

export const STARTER_PACK = [
  // Chimica Generale / General Chemistry
  {
    id: 'chem_01',
    topic: { it: 'Chimica Generale', en: 'General Chemistry' },
    question: {
      it: 'Qual è il tipo di legame chimico formato dalla condivisione di una coppia di elettroni tra due atomi?',
      en: 'What type of chemical bond is formed by the sharing of an electron pair between two atoms?'
    },
    options: {
      it: ['Legame covalente', 'Legame ionico', 'Legame metallico', 'Legame a idrogeno'],
      en: ['Covalent bond', 'Ionic bond', 'Metallic bond', 'Hydrogen bond']
    },
    correctIndex: 0,
    answer: {
      it: 'Legame covalente',
      en: 'Covalent bond'
    }
  },
  {
    id: 'chem_02',
    topic: { it: 'Chimica Generale', en: 'General Chemistry' },
    question: {
      it: 'Cosa misura la scala del pH in una soluzione acquosa?',
      en: 'What does the pH scale measure in an aqueous solution?'
    },
    options: {
      it: ['La concentrazione di ioni idrogeno (H+)', 'La pressione osmotica', 'La densità molecolare', 'Il punto di ebollizione'],
      en: ['Hydrogen ion concentration (H+)', 'Osmotic pressure', 'Molecular density', 'Boiling point']
    },
    correctIndex: 0,
    answer: {
      it: 'La concentrazione di ioni idrogeno (H+)',
      en: 'Hydrogen ion concentration (H+)'
    }
  },
  {
    id: 'chem_03',
    topic: { it: 'Chimica Generale', en: 'General Chemistry' },
    question: {
      it: 'Nel modello della tavola periodica, gli elementi dello stesso gruppo presentano:',
      en: 'In the periodic table model, elements of the same group share:'
    },
    options: {
      it: ['Stesso numero di elettroni di valenza', 'Stesso numero atomico', 'Stessa massa nucleare', 'Stesso raggio atomico'],
      en: ['Same number of valence electrons', 'Same atomic number', 'Same nuclear mass', 'Same atomic radius']
    },
    correctIndex: 0,
    answer: {
      it: 'Stesso numero di elettroni di valenza',
      en: 'Same number of valence electrons'
    }
  },

  // Matematica / Mathematics / Calculus
  {
    id: 'math_01',
    topic: { it: 'Analisi Matematica', en: 'Calculus' },
    question: {
      it: 'In base al Teorema di Weierstrass, una funzione continua su un intervallo chiuso e limitato:',
      en: 'According to the Extreme Value Theorem (Weierstrass), a continuous function on a closed and bounded interval:'
    },
    options: {
      it: ['Assume sempre massimo e minimo assoluti', 'È sempre derivabile in ogni punto', 'È strettamente crescente', 'Ha derivata seconda nulla'],
      en: ['Always attains absolute maximum and minimum', 'Is always differentiable at every point', 'Is strictly increasing', 'Has zero second derivative']
    },
    correctIndex: 0,
    answer: {
      it: 'Assume sempre massimo e minimo assoluti',
      en: 'Always attains absolute maximum and minimum'
    }
  },
  {
    id: 'math_02',
    topic: { it: 'Analisi Matematica', en: 'Calculus' },
    question: {
      it: 'Qual è la derivata della funzione esponenziale f(x) = e^x?',
      en: 'What is the derivative of the exponential function f(x) = e^x?'
    },
    options: {
      it: ['e^x', 'x * e^(x-1)', 'ln(x)', 'e^(2x)'],
      en: ['e^x', 'x * e^(x-1)', 'ln(x)', 'e^(2x)']
    },
    correctIndex: 0,
    answer: {
      it: 'e^x',
      en: 'e^x'
    }
  },
  {
    id: 'math_03',
    topic: { it: 'Analisi Matematica', en: 'Calculus' },
    question: {
      it: 'Cosa rappresenta geometricamente l\'integrale definito di una funzione positiva f(x)?',
      en: 'What does the definite integral of a positive function f(x) represent geometrically?'
    },
    options: {
      it: ['L\'area della regione compresa tra il grafico e l\'asse x', 'La pendenza della retta tangente', 'La lunghezza dell\'arco di curva', 'Il volume del solido di rotazione'],
      en: ['The area bounded between the graph and the x-axis', 'The slope of the tangent line', 'The arc length of the curve', 'The volume of the solid of revolution']
    },
    correctIndex: 0,
    answer: {
      it: 'L\'area della regione compresa tra il grafico e l\'asse x',
      en: 'The area bounded between the graph and the x-axis'
    }
  },

  // Fisica / Physics
  {
    id: 'phys_01',
    topic: { it: 'Fisica', en: 'Physics' },
    question: {
      it: 'Cosa sancisce il Secondo Principio della Termodinamica per un sistema isolato?',
      en: 'What does the Second Law of Thermodynamics state for an isolated system?'
    },
    options: {
      it: ['L\'entropia totale tende spontaneamente ad aumentare', 'L\'energia totale si riduce col tempo', 'Il calore si trasferisce spontaneamente da corpi freddi a caldi', 'Il lavoro meccanico si converte integralmente in calore senza perdite'],
      en: ['Total entropy spontaneously tends to increase', 'Total energy decreases over time', 'Heat spontaneously flows from cold to hot bodies', 'Mechanical work converts completely into heat with zero losses']
    },
    correctIndex: 0,
    answer: {
      it: 'L\'entropia totale tende spontaneamente ad aumentare',
      en: 'Total entropy spontaneously tends to increase'
    }
  },
  {
    id: 'phys_02',
    topic: { it: 'Fisica', en: 'Physics' },
    question: {
      it: 'Nel vuoto, la velocità di propagazione della luce (c) è approssimativamente pari a:',
      en: 'In a vacuum, the speed of light propagation (c) is approximately:'
    },
    options: {
      it: ['300.000 km/s', '150.000 km/s', '3.000 km/s', '30.000 km/s'],
      en: ['300,000 km/s', '150,000 km/s', '3,000 km/s', '30,000 km/s']
    },
    correctIndex: 0,
    answer: {
      it: '300.000 km/s',
      en: '300,000 km/s'
    }
  },

  // Diritto Privato / Law
  {
    id: 'law_01',
    topic: { it: 'Diritto Privato', en: 'Private Law' },
    question: {
      it: 'Nel codice civile, a quale età si acquista la capacità di agire?',
      en: 'In civil law, at what age is full legal capacity to act acquired?'
    },
    options: {
      it: ['Al compimento della maggiore età (18 anni)', 'Al momento della nascita', 'A 16 anni con consenso genitoriale', 'A 25 anni con l\'indipendenza economica'],
      en: ['Upon reaching majority (18 years)', 'At the moment of birth', 'At 16 with parental consent', 'At 25 with economic independence']
    },
    correctIndex: 0,
    answer: {
      it: 'Al compimento della maggiore età (18 anni)',
      en: 'Upon reaching majority (18 years)'
    }
  },

  // Filosofia / Philosophy
  {
    id: 'phil_01',
    topic: { it: 'Filosofia', en: 'Philosophy' },
    question: {
      it: 'Chi è l\'autore dell\'opera "Critica della ragion pura"?',
      en: 'Who is the author of the philosophical work "Critique of Pure Reason"?'
    },
    options: {
      it: ['Immanuel Kant', 'Georg Wilhelm Friedrich Hegel', 'Friedrich Nietzsche', 'Arthur Schopenhauer'],
      en: ['Immanuel Kant', 'Georg Wilhelm Friedrich Hegel', 'Friedrich Nietzsche', 'Arthur Schopenhauer']
    },
    correctIndex: 0,
    answer: {
      it: 'Immanuel Kant',
      en: 'Immanuel Kant'
    }
  },

  // Medicina / Medicine
  {
    id: 'med_01',
    topic: { it: 'Medicina', en: 'Medicine' },
    question: {
      it: 'Quale ormone viene secreto dalle cellule beta del pancreas per abbassare la glicemia?',
      en: 'Which hormone is secreted by pancreatic beta cells to lower blood glucose?'
    },
    options: {
      it: ['Insulina', 'Glucagone', 'Cortisolo', 'Adrenalina'],
      en: ['Insulin', 'Glucagon', 'Cortisol', 'Adrenaline']
    },
    correctIndex: 0,
    answer: {
      it: 'Insulina',
      en: 'Insulin'
    }
  }
];
