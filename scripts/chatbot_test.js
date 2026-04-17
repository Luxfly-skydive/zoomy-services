(function () {
'use strict';

/* ── Language ─────────────────────────────────────────────────────────── */
function lang() {
  return localStorage.getItem('zmy_lang') ||
    (['fr','es'].includes((navigator.language||'').slice(0,2))
      ? (navigator.language||'').slice(0,2) : 'en');
}
function t(en, fr, es) {
  const l = lang();
  if (l === 'fr') return fr;
  if (l === 'es') return es;
  return en;
}

/* ── Business facts ───────────────────────────────────────────────────── */
const BIZ = {
  name:  'Zoomy.services',
  email: 'contact@zoomy.services',
  url:   'zoomy.services',
  contact: 'contact@zoomy.services',
};

/* ── Conversation memory ──────────────────────────────────────────────── */
const memory = {
  history: [], topics: new Set(),
  phase: 'greeting', turnCount: 0,
  push(role, text, entryId) {
    this.history.push({ role, text: text.slice(0,200), entry: entryId||null, ts: Date.now() });
    if (this.history.length > 20) this.history.shift();
    if (role === 'user') this.turnCount++;
    if (entryId) this.topics.add(entryId);
    if (this.turnCount >= 1 && this.phase === 'greeting') this.phase = 'browsing';
    if (this.turnCount >= 3 && this.topics.size >= 2) this.phase = 'interested';
    if (['quote','pricing','start','contact'].some(t => this.topics.has(t))) this.phase = 'converting';
  },
  lastBotEntry() { return [...this.history].reverse().find(h => h.role==='bot' && h.entry); },
  discussed(id)  { return this.topics.has(id); },
};

/* ── Context ──────────────────────────────────────────────────────────── */
const ctx = { service: null, topic: null, lastEntry: null };

/* ── Synonym expansion ────────────────────────────────────────────────── */
const SYNONYMS = {
  /* Price intent */
  'how much': 'price', 'what does it cost': 'price', 'what will it cost': 'price',
  'pricing': 'price', 'cost': 'price', 'fees': 'price', 'tarif': 'price', 'tarrifs': 'price', 'tariffs': 'price',
  'combien': 'price', 'quel prix': 'price', 'cuanto cuesta': 'price',
  'cuanto cobran': 'price', 'precio': 'price',
  /* Quote intent */
  'get a quote': 'quote', 'request a quote': 'quote', 'send a quote': 'quote',
  'project brief': 'quote', 'start a project': 'quote', 'new project': 'quote',
  'devis': 'quote', 'obtenir un devis': 'quote', 'presupuesto': 'quote',
  /* Campaign intents */
  'facebook ads': 'meta', 'instagram ads': 'meta', 'fb ads': 'meta',
  'social media ads': 'meta', 'paid social': 'meta',
  'google ads': 'google', 'search ads': 'google', 'ppc': 'google',
  'pay per click': 'google', 'google adwords': 'google', 'adwords': 'google',
  'seo': 'seo', 'search engine': 'seo', 'organic': 'seo',
  /* Website intents */
  'build me a website': 'website', 'make a website': 'website', 'create a website': 'website',
  'web design': 'website', 'website design': 'website', 'new website': 'website',
  'site web': 'website', 'créer un site': 'website', 'hacer un sitio': 'website',
  'wordpress': 'wordpress', 'wix': 'notemplate', 'squarespace': 'notemplate',
  'shopify': 'ecommerce', 'online store': 'ecommerce', 'sell online': 'ecommerce',
  'landing page': 'landing', 'single page': 'landing',
  'booking system': 'booking', 'reservation system': 'booking', 'online booking': 'booking',
  'système de réservation': 'booking', 'sistema de reservas': 'booking',
  /* Phone agent intents */
  'phone bot': 'phoneagent', 'voice bot': 'phoneagent', 'call bot': 'phoneagent',
  'answer calls': 'phoneagent', 'auto answer': 'phoneagent', 'robot call': 'phoneagent',
  'ai receptionist': 'phoneagent', 'virtual receptionist': 'phoneagent',
  'agent vocal': 'phoneagent', 'agente telefonico': 'phoneagent', 'agent telephonique': 'phoneagent',
  /* Chatbot intents */
  'chat bot': 'chatbot', 'chat widget': 'chatbot', 'website assistant': 'chatbot',
  'bot de chat': 'chatbot', 'chatbot website': 'chatbot',
  /* Process intents */
  'how does it work': 'process', 'how long': 'timeline', 'how fast': 'timeline',
  'when will it be ready': 'timeline', 'delivery time': 'timeline',
  'turnaround': 'timeline', 'délai': 'timeline', 'plazo': 'timeline',
  /* Contact intents */
  'email you': 'contact', 'call you': 'contact', 'reach you': 'contact',
  'speak to someone': 'contact', 'talk to a human': 'contact', 'speak to human': 'contact',
  /* Fuzzy collision fixes */
  'feed': 'price', 'fee ': 'price',
  /* Phone intents */
  'missed calls': 'phoneagent', 'inbound calls': 'phoneagent', 'outbound calls': 'phoneagent',
  'ai calling': 'phoneagent', 'never miss a call': 'phoneagent', 'phone answering': 'phoneagent',
  'handle phone calls': 'phoneagent', 'receptionist ai': 'phoneagent', 'ai for inbound': 'phoneagent',
  'ai for outbound': 'phoneagent', 'missed call': 'phoneagent', 'calls after hours': 'phoneagent',
  'repondre aux appels': 'phoneagent', 'receptionniste virtuel': 'phoneagent',
  'recepcionista virtual': 'phoneagent', 'agente de llamadas': 'phoneagent',
  /* Social + Google FR/ES */
  'réseaux sociaux payants': 'meta', 'reseaux sociaux payants': 'meta',
  'annonces google': 'google', 'google publicite': 'google', 'publicite google': 'google',
  'annonces recherche': 'google', 'anuncios de google': 'google', 'anuncios en buscadores': 'google',
  /* Google extras */
  'google display': 'google', 'google leads': 'google', 'broad match': 'google',
  /* Chatbot FR */
  'chat en ligne': 'chatbot', 'agent conversationnel': 'chatbot', 'ai chat': 'chatbot',
  /* Analytics */
  'conversion pixel': 'analytics', 'suivi des conversions': 'analytics',
  'track form': 'analytics', 'track button': 'analytics', 'track page': 'analytics',
  'configurer suivi': 'analytics',
  /* Email tools */
  'klaviyo': 'email-marketing', 'mailchimp': 'email-marketing', 'brevo': 'email-marketing',
  'subject line': 'email-marketing', 'email open rate': 'email-marketing',
  /* Contact FR/ES */
  'coordonnees': 'contact', 'joindre votre equipe': 'contact', 'su email': 'contact',
  'votre email': 'contact', 'what is your email': 'contact', 'send you a message': 'contact',
  /* Process */
  'how do you work': 'process', 'how to get started': 'process', 'comment vous travaillez': 'process',
  'como empezamos': 'process', 'how quickly can you': 'process',
  /* SEO */
  'get found on google': 'seo', 'xml sitemap': 'seo', 'robots txt': 'seo',
  'title tag': 'seo', 'image alt': 'seo', 'lighthouse': 'seo', 'pagespeed': 'seo',
  'canonical tag': 'seo', 'schema markup': 'seo',
  /* Ad management */
  'manage my ads': 'campaigns', 'digital ads': 'campaigns', 'ad management': 'campaigns',
  /* App store */
  'google play app': 'app-dev', 'google play store': 'app-dev', 'google play': 'app-dev',
  /* Follow-up utility */
  'very helpful': 'thanks', 'got what i needed': 'thanks', 'appreciate it': 'thanks',
  /* SEO */
  'schema markup': 'seo', 'schema org': 'seo', 'sitemap': 'seo', 'xml sitemap': 'seo',
  'track conversions': 'analytics', 'android development': 'app-dev',
  /* Phone extras */
  'phone calls': 'phoneagent', 'handle calls': 'phoneagent',
  'agent d appel': 'phoneagent', 'llamadas': 'phoneagent',
  /* Meta */
  'behavior targeting': 'meta', 'behavioral targeting': 'meta',
  /* Google */
  'phrase match': 'google',
  /* Automation */
  'connect my apps': 'automation', 'connect apps': 'automation',
  'api connection': 'automation', 'spreadsheet': 'automation',
  /* Process / Contact */
  'get started': 'process', 'kick off': 'process', 'brief you': 'process',
  'how do i get started': 'process', 'how do we kick': 'process',
  'schedule a call': 'contact', 'nda': 'process',
  'nouveau projet': 'process', 'disponible': 'process',
  /* FR/ES natural */
  'developper': 'about', 'en ligne': 'websites', 'aimerais': 'about',
  'agente que': 'phoneagent', 'responda': 'phoneagent',
  /* Email */
  'mailinglist': 'newsletter',
  /* More analytics */
  'seguimiento de conversiones': 'analytics', 'seguimiento': 'analytics',
  /* More automation */
  'n8nn': 'automation',
  /* Phone */
  'ai handles my calls': 'phoneagent', 'handles my calls': 'phoneagent', 'keep calling': 'chatbot',
  /* Email */
  'triggered emails': 'email-marketing', 'trigger email': 'email-marketing',
  /* FR/ES digital presence */
  'presencia digital': 'about', 'mejorar presencia': 'about', 'presencia en linea': 'about',
  'nuestra presencia': 'about',
  /* Follow-up direct fallthrough */
  'what does that include': 'about', 'whats included': 'about',
  'more details please': 'about', 'would you recommend': 'about',
  'which should i choose': 'campaigns', 'case studies': 'about',
  'same questions': 'chatbot',
  'fuzzy maching': 'chatbot-training', 'fuzzy matching': 'chatbot-training',
  'set up pixel': 'analytics', 'pixel setup': 'analytics', 'install pixel': 'analytics',
  /* Fuzzy-safe aliases (fuzzy changes words, so we add post-fuzzy versions) */
  'whats include': 'about', 'included': 'about',
  'presence digital': 'about', 'mejorar': 'about', 'nuestra presencia': 'about',
  'negocio online': 'campaigns', 'negocio': 'campaigns', 'crecer nuestro': 'campaigns',
  'deroule': 'process', 'projet avec': 'process', 'comment se': 'process',
  'workflow integration': 'automation', 'intelligent phone': 'phoneagent',
  'phone system': 'phoneagent',
  'exact match': 'google', 'phrase match': 'google',
  /* Intent SYNONYMS — edge cases & natural language */
  'tell me everything': 'about', 'i have a question': 'contact',
  'product launch': 'campaigns', 'launching': 'campaigns', 'new product': 'campaigns',
  'miss calls': 'phone agent', 'missed my calls': 'phone agent', 'always busy': 'phone agent',
  'busy phone': 'phone agent', 'phone is busy': 'phone agent',
  'book appointments over phone': 'phone booking', 'appointments by phone': 'phone booking',
  'virtual call': 'phone agent', 'robot answering': 'phone agent', 'ai answering': 'phone agent',
  'ai answers': 'phone agent', 'answers my phone': 'phone agent', 'after hours': 'phone agent',
  'backlink': 'seo', 'backlinks': 'seo', 'link building': 'seo',
  'rank for': 'seo', 'keyword rank': 'seo', 'on page optimization': 'seo',
  'display network': 'google', 'maximize conversions': 'google', 'maximise conversions': 'google',
  'impression share': 'google', 'smart bidding': 'google', 'target roas': 'google',
  'target cpa': 'google',
  'lead nurture': 'email marketing', 'nurture email': 'email marketing', 'lead nurturing': 'email marketing',
  'email deliverability': 'email marketing', 'deliverability': 'email marketing',
  'spam filter': 'email marketing', 'spam email': 'email marketing', 'gdpr email': 'email marketing',
  'email compliance': 'email marketing',
  'digital product': 'ecommerce', 'digital download': 'ecommerce', 'digital goods': 'ecommerce',
  'cancellation system': 'booking', 'cancel booking': 'booking', 'reschedule booking': 'booking',
  'short form video': 'tiktok', 'short form ads': 'tiktok',
  'ssl certificate': 'domain', 'ssl cert': 'domain', 'https setup': 'domain',
  'professional audience': 'linkedin', 'professional network ads': 'linkedin',
  'promotional video': 'video production', 'video creation': 'video production', 'promo video creation': 'video production',
  'pixel installation': 'analytics', 'pixel install': 'analytics',
  'thx': 'greeting',
  /* More edge-case SYNONYMS */
  'dynamic product': 'facebook', 'dynamic ads': 'facebook',
  'robots answering': 'phone agent', '24 hour phone': 'phone agent', '24h phone': 'phone agent',
  'bounce rate': 'analytics', 'session recording': 'analytics', 'heatmap tool': 'analytics',
  'promotional email': 'email marketing', 'transactional email': 'email marketing',
  'email segmentation': 'email marketing', 'segment email': 'email marketing',
  'appointment scheduler': 'booking', 'book an appointment': 'booking', 'schedule an appointment': 'booking',
  'lead capture': 'landing', 'capture leads': 'landing',
  'digital marketing': 'campaigns', 'manage our marketing': 'campaigns', 'full marketing': 'campaigns',
  'quick question': 'contact', 'got a question': 'contact', 'have a question': 'contact',
  'book appointment over phone': 'phone booking', 'phone appointment': 'phone booking',
  'try before you buy': 'free', 'no commitment': 'free', 'test it first': 'free',
  'book a call': 'contact', 'schedule a call': 'contact', 'jump on a call': 'contact',
  'phone you': 'contact', 'call you': 'contact', 'ring you': 'contact',
  'who works at': 'about', 'where are you based': 'about', 'your team': 'about',
  'your clients': 'about', 'client examples': 'about', 'past clients': 'about',
  'discovery call': 'process', 'kickoff meeting': 'process', 'kickoff': 'process',
  'agencia de marketing': 'campaigns', 'agencia digital': 'campaigns', 'agencia publicidad': 'campaigns',
  'spam calls': 'phone agent', 'nuisance calls': 'phone agent', 'unwanted calls': 'phone agent',
  'everything in one': 'about', 'one package': 'about', 'all in one': 'about', 'full package': 'about',
  /* Fuzzy false-positive recovery (fuzzy corrupts these words, so we catch the corrupted form) */
  '24 hours phone': 'phone agent',           /* "hour" → "hours" */
  'bonne rate': 'analytics',                  /* "bounce" → "bonne" (bonne journee in vocab) */
  'first getting': 'process',                 /* "meeting" → "getting" */
  'revision found': 'process',                /* "rounds" → "found" */
  'contracts signing': 'process', 'contract signing': 'process',
  /* More coverage */
  'ad copy': 'facebook', 'copy writing': 'campaigns', 'ad copywriting': 'facebook',
  'callback': 'contact', 'call back': 'contact', 'request a call': 'contact',
  'work internationally': 'about', 'internationally': 'about', 'international clients': 'about',
  'testimonials': 'about', 'testimonial': 'about', 'reviews': 'about',
  'payment terms': 'process', 'payment schedule': 'process', 'upfront payment': 'process',
  'je recherche': 'campaigns', 'prestataire digital': 'about', 'prestataire': 'about',
  'agente de marketing': 'campaigns', 'agency de marketing': 'campaigns',
  'anuncios en': 'campaigns', 'redes sociales': 'campaigns', 'anuncios': 'campaigns',
  'reservas online': 'booking', 'reservas': 'booking',
  /* Final fuzzy-corruption recovery */
  'search network': 'google',                 /* "search network ads" → no expansion without this */
  'ai answer my phone': 'phone agent',        /* "answers"→"answer" fuzzy drop-s */
  'ai answer': 'phone agent',                 /* same short form */
  'promocional email': 'email marketing',     /* "promotional"→"promocional" fuzzy t→c */
  'promocional': 'email marketing',
  'appointment schedule': 'booking',          /* "scheduler"→"schedule" fuzzy drop-r */
  'who work at': 'about',                     /* "works"→"work" fuzzy drop-s */
  'there are you base': 'about',              /* "where"→"there", "based"→"base" */
  'there are you': 'about',
  'send you an email': 'contact', 'send an email': 'contact', 'email you': 'contact',
  'your expertise': 'about', 'your experience': 'about', 'expertise': 'about',
  'your clientes': 'about', 'clientes': 'about', /* "clients"→"clientes" fuzzy +e */
  'projet management': 'process', 'management approach': 'process',
  'start working together': 'contact', 'start working': 'contact', 'working together': 'process',
};

function expandSynonyms(text) {
  let ex = text;
  for (const [phrase, rep] of Object.entries(SYNONYMS)) {
    if (text.includes(phrase)) ex += ' ' + rep;
  }
  return ex;
}

/* ── Text helpers ─────────────────────────────────────────────────────── */
function norm(s) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim();
}
function kwMatch(n, kw) {
  const nk = norm(kw);
  if (nk.length <= 4) {
    const re = new RegExp('(?:^|\\s)' + nk.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '(?:\\s|$)');
    return re.test(n);
  }
  return n.includes(nk);
}
function anyKw(n, arr) { return arr.some(k => kwMatch(n, k)); }

/* ── Follow-up detection ──────────────────────────────────────────────── */
function isFollowUp(n) {
  return anyKw(n, [
    'which one','that one','this one','the one','pick one','choose one',
    'which is better','which is best','best option','better option',
    'tell me more','more details','more info','explain more','go on',
    'can you elaborate','what else','more about it','more about that',
    'how much is it','its price','the price','cost of it','price for that',
    'your recommendation','recommend','what would you recommend',
    'should i get','should i choose','which should i',
    'is it worth','good deal','worth it',
    'how does it work','how does that work','explain how',
    'can i see an example','any examples','show me an example',
    'what is included','whats included','what do i get',
    'versus','vs','compared to','difference between','vs the',
    'what about','and what about',
    'which option','which platform','which service','which plan','which solution',
    'is best for me','is better for me','for my business','for my type',
    'any case studies','case studies','see examples','can i see examples',
    'can you explain','whats included','more details','more info please',
    'what does that include','which should i choose','would you recommend',
    'how long does that','and the price','price for that',
    'can i see a demo','show me a demo',
  ]);
}

/* ── Levenshtein fuzzy correction ────────────────────────────────────────── */
function lev(a, b) {
  const m = a.length, n2 = b.length;
  if (!m) return n2; if (!n2) return m;
  const dp = Array.from({length:m+1},(_,i)=>Array.from({length:n2+1},(_,j)=>j?0:i));
  for(let j=0;j<=n2;j++) dp[0][j]=j;
  for(let i=1;i<=m;i++) for(let j=1;j<=n2;j++){
    const c=a[i-1]===b[j-1]?0:1;
    dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+c);
    if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1]) dp[i][j]=Math.min(dp[i][j],dp[i-2][j-2]+c);
  }
  return dp[m][n2];
}

let _vocab = null;
function getVocab() {
  if (_vocab) return _vocab;
  const seen = new Set();
  for (const e of KB) for (const kw of e.kw) kw.split(/\s+/).forEach(w=>{if(w.length>=3) seen.add(norm(w));});
  return (_vocab = [...seen]);
}

function fuzzy(text) {
  return text.replace(/[a-zA-Z\u00C0-\u00FF]{4,}/g, word => {
    const w = norm(word), vocab = getVocab();
    if (vocab.includes(w)) return word;
    const maxD = w.length <= 5 ? 1 : 2;
    let best = null, bestD = maxD + 1;
    for (const v of vocab) {
      if (Math.abs(v.length - w.length) > maxD) continue;
      const d = lev(w, v);
      if (d < bestD || (d === bestD && best && v.length > best.length)) { bestD = d; best = v; }
    }
    return best || word;
  });
}

/* ── Score-based classifier ───────────────────────────────────────────────── */
function scoreKB(normalizedText) {
  let best = null, bestScore = 0;
  for (const entry of KB) {
    let score = 0;
    for (const kw of entry.kw) {
      if (kwMatch(normalizedText, kw)) {
        const wc = norm(kw).split(/\s+/).length;
        score += wc * wc;
      }
    }
    if (score > bestScore) { bestScore = score; best = entry; }
  }
  return best;
}

/* ── Filler strip + pronoun resolution ───────────────────────────────────── */
function stripFillers(text) {
  return text
    .replace(/\b(please|can you|could you|would you|i want to know|i want to|i need to|i want|i need|i would like|tell me about|tell me|show me|what is|what are|what do you|what does|how do you|how does|how can i|how can|do you have|does it|is there a|are there|i am looking for|looking for|interested in|can i get|have you got|vous avez|je voudrais|je veux|je cherche|puedo saber|quiero saber|me gustaria|quisiera|dime sobre|tienen|pouvez vous|pourriez vous|est ce que vous|avez vous)\b/gi, ' ')
    .replace(/\s+/g, ' ').trim();
}

function resolvePronouns(text) {
  if (!/\b(it|that|that one|this one|them|those|these)\b/i.test(text)) return text;
  if (!ctx.lastEntry) return text;
  return text + ' ' + ctx.lastEntry;
}

/* ── Response variations ─────────────────────────────────────────────────── */
const VARIATIONS = {
  greeting: {
    en: [
      'Hello! \u{1F44B} I\'m the Zoomy assistant. Ask me about campaigns, websites, chatbots, phone agents, or anything else we do.',
      'Hey! What can I help you with \u2014 running ads, a new website, an AI chatbot, or something else?',
      'Hi there! I\'m here to answer anything about Zoomy.services. What are you working on?',
      'Hello! Ready to help. What are you looking for \u2014 campaigns, a website build, or one of our AI tools?',
    ],
    fr: [
      'Bonjour ! \u{1F44B} Je suis l\'assistant Zoomy. Posez-moi une question sur nos campagnes, sites web, chatbots ou agents t\u00E9l\u00E9phoniques.',
      'Salut ! Comment puis-je vous aider \u2014 publicit\u00E9, site web, chatbot, ou autre chose ?',
      'Bonjour ! Pr\u00EAt \u00E0 vous aider. Que cherchez-vous \u2014 campagnes, site sur-mesure, ou nos outils IA ?',
    ],
    es: [
      '\u00A1Hola! \u{1F44B} Soy el asistente de Zoomy. Preg\u00FAntame sobre campa\u00F1as, sitios web, chatbots o agentes telef\u00F3nicos.',
      '\u00A1Hola! \u00BFEn qu\u00E9 puedo ayudarte \u2014 publicidad, un nuevo sitio web, chatbot, u otra cosa?',
      '\u00A1Hola! Listo para ayudar. \u00BFQu\u00E9 buscas \u2014 campa\u00F1as, construcci\u00F3n de sitio web, o nuestras herramientas IA?',
    ]
  },
  thanks: {
    en: ['Happy to help!', 'My pleasure!', 'Of course! Let me know if you need anything else.', 'Glad that helped!'],
    fr: ['Avec plaisir !', 'Je vous en prie !', 'Bien s\u00FBr ! N\'h\u00E9sitez pas si vous avez d\'autres questions.'],
    es: ['\u00A1Con mucho gusto!', '\u00A1De nada!', '\u00A1Por supuesto! Av\u00EDsame si necesitas algo m\u00E1s.']
  },
  fallback: {
    en: [
      'I didn\'t quite catch that. Try asking me:\n\n\u2022 _"How do Meta Ads work?"_\n\u2022 _"What does a website cost?"_\n\u2022 _"How does the phone agent handle bookings?"_\n\nOr email **contact@zoomy.services**.',
      'Hmm, not sure I understood that. I can help with campaigns, websites, chatbots, phone agents, or pricing. Could you rephrase?',
      'I didn\'t get that one. What are you trying to figure out \u2014 running ads, building something, or pricing?',
    ],
    fr: [
      'Je n\'ai pas bien compris. Essayez :\n\n\u2022 _"Comment fonctionnent les Meta Ads ?"_\n\u2022 _"Combien co\u00FBte un site web ?"_\n\nOu \u00E9crivez \u00E0 **contact@zoomy.services**.',
      'Je ne suis pas s\u00FBr d\'avoir compris. Puis-je vous aider avec les campagnes, les sites web, les chatbots ou les tarifs ? Pouvez-vous reformuler ?',
    ],
    es: [
      'No entend\u00ED bien eso. Intenta con:\n\n\u2022 _"\u00BFC\u00F3mo funcionan los anuncios de Meta?"_\n\u2022 _"\u00BFCu\u00E1nto cuesta un sitio web?"_\n\nO escribe a **contact@zoomy.services**.',
      'No estoy seguro de haber entendido eso. \u00BFPuedes reformularlo? Puedo ayudar con campa\u00F1as, sitios web, chatbots o precios.',
    ]
  }
};

function vary(id) {
  const v = VARIATIONS[id]; if (!v) return null;
  const l = lang(); const pool = l === 'fr' ? v.fr : l === 'es' ? v.es : v.en;
  return pool[Math.floor(Math.random() * pool.length)];
}


/* ── KB (50+ entries, priority order) ────────────────────────────────── */
const KB = [

/* ───── CONVERSATIONAL ───── */
{ id:'greeting', kw:['hello','hi','hey','bonjour','salut','hola','buenos','ciao','bonsoir','bonne journee','buenos dias','buenas tardes','buenas noches','namaste','yo','sup','wassup','whats up','what up','howdy','good day','greetings','thx','thanks','thank you',
    'good morning','good afternoon','good evening','bonsoir','buenas tardes',
    'anyone there','you there','help me','help'],
  r:() => { ctx.lastEntry='greeting';
    return t(
      `Hello! 👋 I'm the Zoomy assistant. I can help you with **campaign management**, **custom websites**, **AI chatbots**, or **AI phone agents**.\n\nWhat are you looking to build?`,
      `Bonjour ! 👋 Je suis l'assistant Zoomy. Je peux vous aider avec la **gestion de campagnes**, les **sites web sur-mesure**, les **chatbots IA** ou les **agents téléphoniques IA**.\n\nQu'est-ce que vous souhaitez créer ?`,
      `¡Hola! 👋 Soy el asistente de Zoomy. Puedo ayudarte con **gestión de campañas**, **sitios web personalizados**, **chatbots IA** o **agentes telefónicos IA**.\n\n¿Qué quieres construir?`
    );
  }
},

{ id:'thanks', kw:['thank','thanks','thank you','merci','gracias','cheers','perfect','great',
    'awesome','amazing','wonderful','excellent','parfait','genial','helpful',
    'very helpful','appreciate it','got what i needed','that helped','great stuff'],
  r:() => { ctx.lastEntry='thanks';
    return t(
      `You're welcome! 😊 Is there anything else you'd like to know about our services?`,
      `Avec plaisir ! 😊 Y a-t-il autre chose que vous aimeriez savoir sur nos services ?`,
      `¡De nada! 😊 ¿Hay algo más que quieras saber sobre nuestros servicios?`
    );
  }
},

{ id:'bye', kw:['bye','goodbye','see you','au revoir','adios','hasta luego','ciao','take care'],
  r:() => { ctx.lastEntry='bye';
    return t(
      `Goodbye! 👋 Feel free to come back anytime. You can also reach us at **${BIZ.email}**.`,
      `Au revoir ! 👋 N'hésitez pas à revenir à tout moment. Vous pouvez aussi nous écrire à **${BIZ.email}**.`,
      `¡Hasta pronto! 👋 Puedes volver cuando quieras. También puedes escribirnos a **${BIZ.email}**.`
    );
  }
},

{ id:'tellmore', kw:['what can you do','what do you know','what can you help',
    'what do you offer','what services do you offer','services','what services','tell me about yourself','who are you','what are you',
    'tell me what you do','what do you do','what does zoomy do','what you do for'],
  r:() => { ctx.lastEntry='tellmore';
    return t(
      `I'm trained on everything Zoomy.services does. Ask me about:\n\n• **Campaign management** — Meta, Google, TikTok, LinkedIn\n• **Custom websites** — booking platforms, e-commerce, multilingual\n• **AI phone agents** — live call handling & booking\n• **Website chatbots** — trained on your business\n• **Process & pricing** — how we work, timelines, quotes\n\nWhat would you like to explore?`,
      `Je suis formé sur tout ce que fait Zoomy.services. Posez-moi des questions sur :\n\n• **Gestion de campagnes** — Meta, Google, TikTok, LinkedIn\n• **Sites web sur-mesure** — plateformes de réservation, e-commerce, multilingue\n• **Agents téléphoniques IA** — gestion d'appels et réservations\n• **Chatbots web** — entraînés sur votre entreprise\n• **Processus & tarifs** — comment nous travaillons, délais, devis\n\nPar où voulez-vous commencer ?`,
      `Estoy entrenado en todo lo que hace Zoomy.services. Pregúntame sobre:\n\n• **Gestión de campañas** — Meta, Google, TikTok, LinkedIn\n• **Sitios web personalizados** — plataformas de reservas, e-commerce, multilingüe\n• **Agentes telefónicos IA** — gestión de llamadas y reservas\n• **Chatbots web** — entrenados en tu negocio\n• **Proceso y precios** — cómo trabajamos, plazos, presupuestos\n\n¿Por dónde quieres empezar?`
    );
  }
},

{ id:'email-marketing', kw:['email marketing','email campaign','newsletter','email automation',
    'klaviyo','mailchimp','brevo','sendgrid','activecampaign',
    'email sequence','email list','liste email','email template','email broadcast','drip campaign',
    'email funnel','email blast','mailing list','email subscriber','welcome email',
    'subject line','email open rate','click through rate email',
    'triggered emails','trigger email','automated emails','email triggers',
    'marketing par email','emailing','campagne email',
    'marketing por correo','correo electronico','email comercial'],
  r:() => { ctx.lastEntry='email-marketing'; ctx.service='email-marketing';
    return t(
      `We build and manage **email marketing systems** for lead nurturing and customer retention:\n\n• **Campaign setup** — ESP integration (Mailchimp, Klaviyo, Brevo), list management, templates\n• **Email sequences** — welcome series, onboarding flows, re-engagement campaigns\n• **Broadcasts** — newsletter design, copywriting, send scheduling\n• **Automation** — trigger-based emails (behaviour, purchase, abandonment)\n• **Analytics** — open rate, click rate, unsubscribe, revenue attribution\n\nEmail marketing typically delivers the highest ROI of any digital channel when done consistently. Want to know about pricing or how we structure campaigns?`,
      `Nous construisons et gérons des **systèmes de marketing par email** pour la maturation de leads et la fidélisation :\n\n• **Configuration** — intégration ESP (Mailchimp, Klaviyo, Brevo), gestion de listes, templates\n• **Séquences email** — série de bienvenue, onboarding, re-engagement\n• **Envois réguliers** — design newsletter, rédaction, planification\n• **Automatisation** — emails déclenchés par comportement\n\nLe marketing par email délivre généralement le meilleur ROI de tous les canaux digitaux. Vous souhaitez en savoir plus sur les tarifs ?`,
      `Construimos y gestionamos **sistemas de email marketing** para nutrición de leads y retención:\n\n• **Configuración** — integración ESP (Mailchimp, Klaviyo, Brevo), gestión de listas, plantillas\n• **Secuencias de email** — serie de bienvenida, onboarding, re-engagement\n• **Envíos regulares** — diseño newsletter, redacción, programación\n• **Automatización** — emails activados por comportamiento\n\nEl email marketing típicamente ofrece el mayor ROI de cualquier canal digital. ¿Quieres saber sobre precios?`
    );
  }
},

/* ───── CONTACT & QUOTE ───── */
{ id:'contact', kw:['contact','reach','get in touch','write to','talk to','speak to',
    'human','person','team','send a message','send you a message',
    'your email','what is your email','email us','email address','schedule a call',
    'coordonnees','joindre','votre email','su email','contacter','contacto','escribe','correo'],
  r:() => { ctx.lastEntry='contact';
    return t(
      `You can reach us at **${BIZ.email}** — we reply within 24 hours on days.\n\nOr fill in the contact form at **${BIZ.url}/contact.html** to describe your project and we'll come back with a tailored proposal.`,
      `Vous pouvez nous contacter à **${BIZ.email}** — nous répondons dans les 24 heures les jours ouvrables.\n\nOu remplissez le formulaire sur **${BIZ.url}/contact.html** pour décrire votre projet et nous vous répondrons avec une proposition sur-mesure.`,
      `Puedes contactarnos en **${BIZ.email}** — respondemos en 24 horas en días laborables.\n\nO rellena el formulario en **${BIZ.url}/contact.html** para describir tu proyecto y te responderemos con una propuesta personalizada.`
    );
  }
},

{
  id:'website-pricing',
  kw:['website cost','website price','how much website','website fee','how much does a website','site cost',
      'prix site','combien site','coute un site','presupuesto sitio','cuanto cuesta un sitio'],
  r:() => {
    ctx.lastEntry='website-pricing';
    return t(
      'Website pricing depends on scope. We price per page plus feature costs:\n\n• **Standard content page** — from $200\n• **Complex page** (home, animated) — $300–400\n• **Functional page** (booking, checkout) — $400–600\n• **Booking system** — $600 · **Admin panel** — $400\n• **Each extra language** — $200\n\nA typical 6-page restaurant site in 2 languages: $1,800–$2,500. Email **contact@zoomy.services** for an exact quote.',
      'Le prix d\'un site dépend du périmètre. Nous tarifons par page plus les fonctionnalités :\n\n• **Page de contenu standard** — à partir de 200$\n• **Page complexe** — 300–400$\n• **Page fonctionnelle** — 400–600$\n• **Système de réservation** — 600$\n\nÉcrivez à **contact@zoomy.services** pour un devis.',
      'El precio de un sitio depende del alcance. Tarificamos por página más funcionalidades:\n\n• **Página estándar** — desde $200 · **Página funcional** — $400–600\n• **Sistema de reservas** — $600\n\nEscribe a **contact@zoomy.services** para un presupuesto.'
    );
  }
},
{
  id:'chatbot-pricing',
  kw:['chatbot cost','chatbot price','how much chatbot','chatbot fee','price of chatbot',
      'chatbot pricing','prix chatbot','combien chatbot','presupuesto chatbot'],
  r:() => {
    ctx.lastEntry='chatbot-pricing';
    return t(
      '**Chatbot pricing:**\n\n• Standard (1–2 languages, ~30 topics) — **$500**\n• Complex (multilingual, 50+ topics, booking/leads) — **$1,000–$1,500**\n• Monthly hosting (self-hosted) — **$50/month**\n• API-based — cost + 50%, min $40/month\n\nAs an add-on to a website: **$400**. Email **contact@zoomy.services** for an exact quote.',
      '**Tarification chatbot :**\n\n• Standard — **500$** · Complexe — **1 000–1 500$**\n• Hébergement mensuel — **50$/mois**\n• En complément site : **400$**\n\nÉcrivez à **contact@zoomy.services**.',
      '**Precio chatbot:**\n\n• Estándar — **$500** · Complejo — **$1.000–$1.500**\n• Hosting mensual — **$50/mes**\n• Como complemento de sitio: **$400**\n\nEscribe a **contact@zoomy.services**.'
    );
  }
},
{
  id:'phone-pricing',
  kw:['phone agent cost','phone agent price','how much phone agent','agent price','voice agent price',
      'phone agent fee','cost of phone agent','prix agent','combien agent','presupuesto agente'],
  r:() => {
    ctx.lastEntry='phone-pricing';
    return t(
      '**AI Phone Agent pricing:**\n\n• Standard (FAQ + availability) — from **$600**\n• With calendar booking — **$1,000–$1,500**\n• Custom integrations — **$1,500–$2,500**\n• Monthly: ElevenLabs usage + 40%, min **$60/month**\n\nEmail **contact@zoomy.services** for a quote.',
      '**Tarification agent téléphonique :**\n\n• Standard — à partir de **600$**\n• Avec réservation calendrier — **1 000–1 500$**\n• Mensuel — coût ElevenLabs + 40%, min **60$/mois**\n\nÉcrivez à **contact@zoomy.services**.',
      '**Precio agente telefónico:**\n\n• Estándar — desde **$600** · Con reservas — **$1.000–$1.500**\n• Mensual: coste ElevenLabs + 40%, mín **$60/mes**\n\nEscribe a **contact@zoomy.services**.'
    );
  }
},
{ id:'quote', kw:['quote','get a quote','pricing','price','pricng','pric','cost','how much','fee','fees','rates','your rates',
    'budget','devis','tarif','prix','presupuesto','cuanto','quanto','invoice','bill'],
  r:() => { ctx.lastEntry='quote';
    return t(
      `All projects are scoped and priced individually — there's no fixed public price list.\n\nTo get a quote, email **${BIZ.email}** or use the contact form at **${BIZ.url}/contact.html**. Describe what you need and we'll reply within 24 hours with a clear scope and fixed price.\n\nNo hourly billing — everything is a fixed project fee.`,
      `Tous les projets sont chiffrés individuellement — il n'y a pas de grille tarifaire publique fixe.\n\nPour obtenir un devis, écrivez à **${BIZ.email}** ou utilisez le formulaire sur **${BIZ.url}/contact.html**. Décrivez votre besoin et nous vous répondrons dans les 24 heures avec un périmètre clair et un prix fixe.\n\nPas de facturation horaire — tout est un forfait projet.`,
      `Todos los proyectos se cotizan individualmente — no hay una lista de precios pública fija.\n\nPara obtener un presupuesto, escribe a **${BIZ.email}** o usa el formulario en **${BIZ.url}/contact.html**. Describe lo que necesitas y te responderemos en 24 horas con un alcance claro y un precio fijo.\n\nSin facturación por horas — todo es un precio fijo por proyecto.`
    );
  }
},

{ id:'freepage', kw:['free','free page','first page','free sample','free website','free build',
    'trial','demo','demo site','can i see a demo','see a demo','gratuit','page gratuite','primera pagina','gratis'],
  r:() => { ctx.lastEntry='freepage';
    return t(
      `We offer a **free first page build** — no commitment, no credit card. 🎁\n\nWe design and code the full first page of your website at zero cost. If you love it, we build the rest. If not, you keep the page.\n\nTo claim it, email **${BIZ.email}** with a brief description of your business and what you're looking for.`,
      `Nous offrons une **première page gratuite** — sans engagement, sans carte de crédit. 🎁\n\nNous concevons et codons la première page complète de votre site à coût zéro. Si vous l'aimez, nous construisons le reste. Sinon, vous gardez la page.\n\nPour en bénéficier, écrivez à **${BIZ.email}** avec une courte description de votre activité et de ce que vous cherchez.`,
      `Ofrecemos una **primera página gratuita** — sin compromiso, sin tarjeta de crédito. 🎁\n\nDiseñamos y programamos la primera página completa de tu sitio web a coste cero. Si te gusta, construimos el resto. Si no, te quedas con la página.\n\nPara reclamarla, escribe a **${BIZ.email}** con una breve descripción de tu negocio y lo que buscas.`
    );
  }
},

/* ───── CAMPAIGNS ───── */
{ id:'campaigns', kw:['campaign','campaigns','paid media','paid ads','advertising',
    'digital advertising','ads management','manage my ads','ad management service','digital ads',
    'run my ads','social media advertising','run ads','manage ads','run campaigns',
    'which should i choose','which should i','which platform would you recommend',
    'campagne','campanas','publicidad'],
  r:() => { ctx.lastEntry='campaigns'; ctx.service='campaigns';
    return t(
      `We create and manage **paid media campaigns** across four platforms:\n\n• **Meta Ads** — Facebook & Instagram\n• **Google Ads** — Search, Display, YouTube\n• **TikTok Ads** — in-feed & TopFeed\n• **LinkedIn Ads** — B2B targeting\n\nThis covers the full setup (strategy, audiences, ad copy, pixel, tracking) **and** ongoing management — monitoring, optimising spend, and weekly/monthly reporting.\n\nCampaigns run in **your own ad account** — you own your data.\n\nWhich platform are you interested in?`,
      `Nous créons et gérons des **campagnes publicitaires** sur quatre plateformes :\n\n• **Meta Ads** — Facebook & Instagram\n• **Google Ads** — Search, Display, YouTube\n• **TikTok Ads** — in-feed & TopFeed\n• **LinkedIn Ads** — ciblage B2B\n\nCela couvre la mise en place complète (stratégie, audiences, annonces, pixel, tracking) **et** la gestion continue — surveillance, optimisation et reporting régulier.\n\nLes campagnes tournent sur **votre propre compte** — vos données restent les vôtres.\n\nQuelle plateforme vous intéresse ?`,
      `Creamos y gestionamos **campañas de publicidad digital** en cuatro plataformas:\n\n• **Meta Ads** — Facebook e Instagram\n• **Google Ads** — Search, Display, YouTube\n• **TikTok Ads** — in-feed y TopFeed\n• **LinkedIn Ads** — targeting B2B\n\nEsto incluye la configuración completa (estrategia, audiencias, anuncios, píxel, tracking) **y** la gestión continua — monitorización, optimización del gasto y reporting regular.\n\nLas campañas corren en **tu propia cuenta** — tus datos son tuyos.\n\n¿Qué plataforma te interesa?`
    );
  }
},

{ id:'meta-ads', kw:['meta','facebook','instagram','fb','ig','meta ads','facebook ads','facbook','facebok',
    'instagram ads','reels ads','story ads','carousel','dynamic ads','facebook campaign',
    'instagram campaign','meta campaign','meta pixel','facebook pixel','lookalike'],
  r:() => { ctx.lastEntry='meta-ads'; ctx.service='campaigns';
    return t(
      `**Meta Ads** (Facebook & Instagram) is where most of our campaign work runs. Here's what's included:\n\n• **Campaign structure** — objective, adset split, budget logic\n• **Audiences** — custom audiences, lookalikes, interest + behaviour targeting, retargeting\n• **Ad copy** — headlines, primary text, descriptions for every format (single image, carousel, video, story)\n• **Creative briefs** — exact specs and direction for each placement\n• **Pixel setup** — standard events, custom conversions, Conversions API\n• **UTM parameters** — full tracking sheet\n• **Ongoing management** — bid strategy, budget pacing, A/B testing, creative rotation\n\nFor retargeting, we configure custom audience exclusions and separate prospecting/retargeting adsets to avoid overlap.\n\nWant to know about Meta Ads pricing or the setup process?`,
      `**Meta Ads** (Facebook & Instagram) est là où la plupart de notre travail de campagne se déroule. Voici ce qui est inclus :\n\n• **Structure de campagne** — objectif, découpage des adsets, logique budgétaire\n• **Audiences** — audiences personnalisées, lookalikes, ciblage par intérêts et comportements, retargeting\n• **Annonces** — titres, textes, descriptions pour chaque format (image, carrousel, vidéo, story)\n• **Briefs créatifs** — specs exactes et direction pour chaque placement\n• **Configuration pixel** — événements standard, conversions personnalisées, API Conversions\n• **Paramètres UTM** — tableau de suivi complet\n• **Gestion continue** — stratégie d'enchères, rythme budgétaire, A/B testing, rotation créative\n\nVous souhaitez en savoir plus sur les tarifs Meta Ads ou le processus de mise en place ?`,
      `**Meta Ads** (Facebook e Instagram) es donde corre la mayor parte de nuestro trabajo de campaña. Esto es lo que incluye:\n\n• **Estructura de campaña** — objetivo, división de adsets, lógica de presupuesto\n• **Audiencias** — audiencias personalizadas, lookalikes, targeting por intereses y comportamientos, retargeting\n• **Anuncios** — titulares, textos, descripciones para cada formato (imagen, carrusel, vídeo, story)\n• **Briefs creativos** — especificaciones exactas y dirección para cada placement\n• **Configuración de píxel** — eventos estándar, conversiones personalizadas, API de Conversiones\n• **Parámetros UTM** — hoja de seguimiento completa\n• **Gestión continua** — estrategia de pujas, ritmo de presupuesto, A/B testing, rotación creativa\n\n¿Quieres saber sobre los precios de Meta Ads o el proceso de configuración?`
    );
  }
},

{ id:'google-ads', kw:['google','google ads','google adwords','adwords','adword','search ads','display ads','youtube ads',
    'ppc','pay per click','search campaign','shopping ads','performance max','pmax',
    'quality score','negative keywords','google display','rsa','responsive search ads',
    'exact match','phrase match','match type',
    'keyword planner','google keyword planner','broad match','google leads','leads from google',
    'annonces google','google publicite','publicite google','annonces recherche',
    'google search publicite','anuncios de google','anuncios buscadores','buscadores','google shopping'],
  r:() => { ctx.lastEntry='google-ads'; ctx.service='campaigns';
    return t(
      `**Google Ads** setup and management includes:\n\n• **Search campaigns** — keyword research, match types, ad groups, RSAs (Responsive Search Ads), negative keyword lists\n• **Display campaigns** — audience targeting, banner creative briefs, remarketing lists\n• **YouTube** — video brief, targeting strategy, skippable vs non-skippable\n• **Performance Max** — asset group setup, audience signals, final URL expansion\n• **Conversion tracking** — Google Tag Manager setup, goal configuration, import from GA4\n• **Bid strategy** — Target CPA, Target ROAS, Maximise Conversions based on campaign stage\n• **Quality Score optimisation** — ad relevance, landing page match, expected CTR\n• **Ongoing management** — search term review, bid adjustments, ad copy testing, budget reallocation\n\nFor Search campaigns, we typically see Quality Scores of 7–10 on target keywords within the first month. What type of Google Ads are you interested in?`,
      `La configuration et la gestion **Google Ads** comprend :\n\n• **Campagnes Search** — recherche de mots-clés, types de correspondance, groupes d'annonces, RSA, listes de mots-clés négatifs\n• **Campagnes Display** — ciblage par audience, briefs créatifs bannières, listes de remarketing\n• **YouTube** — brief vidéo, stratégie de ciblage, skippable vs non-skippable\n• **Performance Max** — configuration des groupes d'assets, signaux d'audience, expansion URL finale\n• **Suivi des conversions** — configuration GTM, paramétrage des objectifs, import depuis GA4\n• **Stratégie d'enchères** — CPA cible, ROAS cible, Maximiser les conversions selon la phase\n• **Optimisation du Quality Score** — pertinence des annonces, correspondance page de destination, CTR attendu\n• **Gestion continue** — analyse des termes de recherche, ajustements d'enchères, test d'annonces, réallocation budgétaire\n\nQuel type de Google Ads vous intéresse ?`,
      `La configuración y gestión de **Google Ads** incluye:\n\n• **Campañas de Search** — investigación de palabras clave, tipos de concordancia, grupos de anuncios, RSAs, listas de palabras clave negativas\n• **Campañas de Display** — targeting por audiencia, briefs creativos de banners, listas de remarketing\n• **YouTube** — brief de vídeo, estrategia de targeting, skippable vs non-skippable\n• **Performance Max** — configuración de grupos de assets, señales de audiencia, expansión de URL final\n• **Seguimiento de conversiones** — configuración de GTM, objetivos, importación desde GA4\n• **Estrategia de pujas** — CPA objetivo, ROAS objetivo, Maximizar conversiones según la fase\n• **Optimización del Quality Score** — relevancia del anuncio, coincidencia de landing page, CTR esperado\n• **Gestión continua** — revisión de términos de búsqueda, ajustes de pujas, pruebas de anuncios\n\n¿Qué tipo de Google Ads te interesa?`
    );
  }
},

{ id:'tiktok-ads', kw:['tiktok','tiktok ads','tiktok advertising','tik tok','short video ads',
    'vertical video','reels','tiktok campaign','spark ads','infeed','in feed ads','topfeed'],
  r:() => { ctx.lastEntry='tiktok-ads'; ctx.service='campaigns';
    return t(
      `**TikTok Ads** setup and management includes:\n\n• **Video brief** — hook structure (first 3 seconds), key messaging, CTA, recommended duration (9–15s is the sweet spot)\n• **Audience targeting** — interest categories, behaviour signals, demographic targeting, custom audiences\n• **Placement** — In-Feed vs TopFeed recommendation based on budget\n• **Spark Ads** — boosting organic content strategy\n• **Pixel & event setup** — TikTok Pixel, standard events, custom conversions\n• **Creative testing framework** — systematic hook/CTA/offer testing\n• **Ongoing management** — creative fatigue monitoring, audience refresh, budget pacing\n\nKey TikTok insight: the hook (first 3 seconds) determines 70%+ of performance. We brief this specifically for your audience. What's your product or service?`,
      `La configuration et gestion **TikTok Ads** comprend :\n\n• **Brief vidéo** — structure du hook (3 premières secondes), message clé, CTA, durée recommandée (9–15s est l'idéal)\n• **Ciblage** — catégories d'intérêts, signaux comportementaux, ciblage démographique, audiences personnalisées\n• **Placement** — recommandation In-Feed vs TopFeed selon le budget\n• **Spark Ads** — stratégie de boost de contenu organique\n• **Pixel & événements** — TikTok Pixel, événements standard, conversions personnalisées\n• **Framework de test créatif** — test systématique hook/CTA/offre\n• **Gestion continue** — surveillance de la fatigue créative, rafraîchissement d'audience, rythme budgétaire\n\nSur TikTok, le hook (3 premières secondes) détermine 70%+ des performances. Quel est votre produit ou service ?`,
      `La configuración y gestión de **TikTok Ads** incluye:\n\n• **Brief de vídeo** — estructura del hook (primeros 3 segundos), mensaje clave, CTA, duración recomendada (9–15s es lo ideal)\n• **Targeting** — categorías de intereses, señales de comportamiento, targeting demográfico, audiencias personalizadas\n• **Placement** — recomendación In-Feed vs TopFeed según presupuesto\n• **Spark Ads** — estrategia de impulso de contenido orgánico\n• **Píxel y eventos** — TikTok Pixel, eventos estándar, conversiones personalizadas\n• **Framework de prueba creativa** — pruebas sistemáticas de hook/CTA/oferta\n• **Gestión continua** — monitorización de fatiga creativa, renovación de audiencias\n\nEn TikTok, el hook (primeros 3 segundos) determina el 70%+ del rendimiento. ¿Cuál es tu producto o servicio?`
    );
  }
},

{ id:'linkedin-ads', kw:['linkedin','linkedin ads','b2b ads','b2b advertising','sponsored content',
    'inmail','lead gen form','job title targeting','linkedin campaign','professional targeting'],
  r:() => { ctx.lastEntry='linkedin-ads'; ctx.service='campaigns';
    return t(
      `**LinkedIn Ads** is the most precise B2B targeting platform available. Our setup includes:\n\n• **Audience segments** — job title, seniority level (Manager to C-Suite), company size, industry, specific companies\n• **Sponsored Content** — single image and document ads with full copy\n• **InMail** — personalised message templates with subject lines\n• **Lead Gen Forms** — field configuration, pre-fill settings, CRM integration recommendations\n• **Retargeting** — website visitor lists, company engagement lists, video views\n• **Bid strategy** — CPM vs CPC vs CPL based on objective\n• **Ongoing management** — audience performance analysis, creative refresh, bid adjustments\n\nLinkedIn CPCs are higher than Meta (£3–£8 typical), but the lead quality for B2B is unmatched. What industry or job title are you targeting?`,
      `**LinkedIn Ads** est la plateforme de ciblage B2B la plus précise disponible. Notre configuration comprend :\n\n• **Segments d'audience** — intitulé de poste, niveau hiérarchique (Manager à C-Suite), taille d'entreprise, secteur, entreprises spécifiques\n• **Sponsored Content** — annonces image unique et document avec copy complète\n• **InMail** — modèles de messages personnalisés avec lignes d'objet\n• **Lead Gen Forms** — configuration des champs, paramètres de pré-remplissage\n• **Retargeting** — listes de visiteurs, listes d'engagement entreprises, vues vidéo\n• **Stratégie d'enchères** — CPM vs CPC vs CPL selon l'objectif\n• **Gestion continue** — analyse de performance des audiences, rafraîchissement créatif\n\nQuel secteur ou intitulé de poste ciblez-vous ?`,
      `**LinkedIn Ads** es la plataforma de targeting B2B más precisa disponible. Nuestra configuración incluye:\n\n• **Segmentos de audiencia** — cargo, nivel de seniority (Manager a C-Suite), tamaño de empresa, industria, empresas específicas\n• **Sponsored Content** — anuncios de imagen única y documento con copy completa\n• **InMail** — plantillas de mensajes personalizados con líneas de asunto\n• **Lead Gen Forms** — configuración de campos, parámetros de auto-relleno\n• **Retargeting** — listas de visitantes web, listas de engagement de empresas\n• **Estrategia de pujas** — CPM vs CPC vs CPL según el objetivo\n• **Gestión continua** — análisis de rendimiento de audiencias, renovación creativa\n\n¿Qué industria o cargo estás segmentando?`
    );
  }
},

{ id:'ad-spend', kw:['budget','ad spend','spend','minimum budget','how much to spend',
    'media budget','advertising budget','minimum spend','roas','return on ad spend',
    'budget recommandé','budget minimum','presupuesto minimo'],
  r:() => { ctx.lastEntry='ad-spend'; ctx.service='campaigns';
    return t(
      `Ad spend is separate from our management fee — it goes directly to your ad account (Meta, Google, etc.) and we never touch it.\n\n**Minimum budget recommendations:**\n• Meta Ads — $1,500+/month to get meaningful data\n• Google Search — $1,000+/month (depends heavily on your keyword CPCs)\n• TikTok Ads — $1,000+/month for testing\n• LinkedIn Ads — $2,000+/month (higher CPCs, but precise B2B)\n\nBelow these thresholds, the algorithm doesn't get enough data to optimise and results are unreliable.\n\nWe charge a fixed monthly management fee on top — contact us for an exact quote based on your budget and platforms.`,
      `Le budget publicitaire est séparé de nos honoraires de gestion — il va directement sur votre compte (Meta, Google, etc.) et nous n'y touchons jamais.\n\n**Budgets minimum recommandés :**\n• Meta Ads — 1 500 $+/mois pour obtenir des données significatives\n• Google Search — 1 000 $+/mois (dépend fortement des CPC de vos mots-clés)\n• TikTok Ads — 1 000 $+/mois pour les tests\n• LinkedIn Ads — 2 000 $+/mois (CPC plus élevés, mais ciblage B2B précis)\n\nEn dessous de ces seuils, l'algorithme n'a pas assez de données pour optimiser et les résultats sont peu fiables.\n\nNous facturons des honoraires mensuels de gestion fixes en plus — contactez-nous pour un devis selon votre budget et vos plateformes.`,
      `El gasto publicitario es independiente de nuestra tarifa de gestión — va directamente a tu cuenta (Meta, Google, etc.) y nosotros nunca lo tocamos.\n\n**Presupuestos mínimos recomendados:**\n• Meta Ads — $1.500+/mes para obtener datos significativos\n• Google Search — $1.000+/mes (depende mucho de los CPCs de tus keywords)\n• TikTok Ads — $1.000+/mes para pruebas\n• LinkedIn Ads — $2.000+/mes (CPCs más altos, pero targeting B2B preciso)\n\nPor debajo de estos umbrales, el algoritmo no tiene suficientes datos para optimizar y los resultados son poco fiables.\n\nCobramos una tarifa de gestión mensual fija además — contáctanos para un presupuesto según tu budget y plataformas.`
    );
  }
},

{ id:'retargeting', kw:['retargeting','remarketing','retarget','website visitors','pixel data',
    'warm audience','custom audience','re-engage','lost customers','abandoned cart',
    'reengagement','reciblaje','remarketing'],
  r:() => { ctx.lastEntry='retargeting'; ctx.service='campaigns';
    return t(
      `**Retargeting** is one of the highest-ROI campaign types because you're targeting people who already know you.\n\nWe set up retargeting for:\n• **Website visitors** — people who visited specific pages (product, pricing, checkout)\n• **Video viewers** — people who watched 50%+ of your videos\n• **Email list** — custom audiences from CRM uploads\n• **Lookalike audiences** — similar profiles to your best customers\n\nKey principle: always **exclude** converters from retargeting audiences so you don't waste spend on people who already bought.\n\nWe also set up **exclusion lists** between prospecting and retargeting to prevent audience overlap and ad fatigue.`,
      `Le **retargeting** est l'un des types de campagnes avec le meilleur ROI car vous ciblez des personnes qui vous connaissent déjà.\n\nNous configurons le retargeting pour :\n• **Visiteurs du site** — personnes ayant visité des pages spécifiques (produit, tarifs, checkout)\n• **Vues vidéo** — personnes ayant regardé 50%+ de vos vidéos\n• **Liste email** — audiences personnalisées depuis des exports CRM\n• **Audiences similaires** — profils similaires à vos meilleurs clients\n\nPrincipe clé : toujours **exclure** les convertis des audiences de retargeting pour ne pas gaspiller le budget sur des personnes ayant déjà acheté.`,
      `El **retargeting** es uno de los tipos de campaña con mayor ROI porque te diriges a personas que ya te conocen.\n\nConfiguramos retargeting para:\n• **Visitantes del sitio web** — personas que visitaron páginas específicas (producto, precios, checkout)\n• **Visualizaciones de vídeo** — personas que vieron el 50%+ de tus vídeos\n• **Lista de emails** — audiencias personalizadas desde exportaciones de CRM\n• **Audiencias similares** — perfiles similares a tus mejores clientes\n\nPrincipio clave: siempre **excluir** a los convertidos de las audiencias de retargeting para no desperdiciar presupuesto en personas que ya compraron.`
    );
  }
},

{ id:'analytics', kw:['analytics','ga4','google analytics','tracking','conversion tracking','track conversions',
    'conversion pixel','suivi des conversions','suivi conversions','seguimiento de conversiones',
    'track form submissions','track button clicks','track page views',
    'tag manager','gtm','google tag manager','meta pixel','facebook pixel','heatmap','hotjar',
    'track visitors','website stats','traffic data','analyse'],
  r:() => { ctx.lastEntry='analytics';
    return t(
      `Analytics and conversion tracking are set up as part of every project.\n\n**What we configure:**\n• **Google Analytics 4** — page views, events, goals, e-commerce tracking where relevant\n• **Google Tag Manager** — all tracking managed through one container\n• **Meta Pixel** — standard events (PageView, Lead, Purchase, etc.), custom conversions\n• **Conversion tracking** — tied to specific actions (form submit, booking confirmed, purchase)\n\n**For campaigns** — we ensure that every conversion event fires correctly before campaigns go live. Campaigns optimising on broken pixel data are a very common and costly mistake.\n\n**Optional:** Hotjar or Microsoft Clarity for session recordings and heatmaps — useful for identifying UX issues after launch.`,
      `L'analyse et le suivi des conversions sont configurés dans le cadre de chaque projet.\n\n**Ce que nous configurons :**\n• **Google Analytics 4** — pages vues, événements, objectifs, suivi e-commerce\n• **Google Tag Manager** — tout le suivi géré via un seul conteneur\n• **Meta Pixel** — événements standard, conversions personnalisées\n• **Suivi des conversions** — lié à des actions spécifiques (soumission de formulaire, réservation confirmée, achat)\n\n**Pour les campagnes** — nous nous assurons que chaque événement de conversion se déclenche correctement avant le lancement. C'est une erreur très courante et coûteuse.`,
      `El análisis y seguimiento de conversiones se configura como parte de cada proyecto.\n\n**Lo que configuramos:**\n• **Google Analytics 4** — páginas vistas, eventos, objetivos, seguimiento de e-commerce\n• **Google Tag Manager** — todo el tracking gestionado a través de un contenedor\n• **Meta Pixel** — eventos estándar, conversiones personalizadas\n• **Seguimiento de conversiones** — vinculado a acciones específicas (envío de formulario, reserva confirmada, compra)\n\n**Para campañas** — nos aseguramos de que cada evento de conversión se dispare correctamente antes de que las campañas salgan en vivo. Es un error muy común y costoso.`
    );
  }
},

{ id:'reporting', kw:['report','reporting','results','performance','metrics','kpis',
    'roi','roas','ctr','cpc','cpa','cpl','conversion rate','dashboard','stats','data',
    'rapport','analyse','resultats','informe','resultados','metricas'],
  r:() => { ctx.lastEntry='reporting'; ctx.service='campaigns';
    return t(
      `Our reporting covers what matters, written to be understood without an ads background:\n\n• **Spend vs projection** — are we pacing correctly?\n• **Results** — clicks, leads, purchases depending on objective\n• **Cost per result** — CPL, CPA, or ROAS tracked vs your benchmark\n• **What changed since last report** — what we adjusted and why\n• **Next period focus** — what we're testing or changing next\n\nKey metrics we track by platform:\n• Meta: CPM, CPC, CTR, ROAS, Frequency (over 3 = creative fatigue)\n• Google: Quality Score, CTR, Impression Share, CPA\n• TikTok: Hook Rate (% who watch past 3s), Hold Rate, CTR\n• LinkedIn: CTR (0.4%+ is healthy), CPL, Lead form completion rate\n\nReports sent weekly or monthly — your choice.`,
      `Nos rapports couvrent ce qui compte, rédigés pour être compris sans expertise publicitaire :\n\n• **Dépense vs projection** — sommes-nous au bon rythme ?\n• **Résultats** — clics, leads, achats selon l'objectif\n• **Coût par résultat** — CPL, CPA ou ROAS suivis vs votre benchmark\n• **Ce qui a changé depuis le dernier rapport** — ce que nous avons ajusté et pourquoi\n• **Focus période suivante** — ce que nous testons ou modifions ensuite\n\nRapports envoyés hebdomadairement ou mensuellement — à votre choix.`,
      `Nuestros informes cubren lo que importa, escritos para ser entendidos sin conocimientos publicitarios:\n\n• **Gasto vs proyección** — ¿estamos al ritmo correcto?\n• **Resultados** — clics, leads, compras según el objetivo\n• **Coste por resultado** — CPL, CPA o ROAS seguidos vs tu benchmark\n• **Qué cambió desde el último informe** — qué ajustamos y por qué\n• **Enfoque del próximo período** — qué estamos probando o cambiando\n\nInformes enviados semanal o mensualmente — a tu elección.`
    );
  }
},

{ id:'chatbot', kw:['chatbot','chat bot','website chatbot','chat assistant','chat widget',
    'ai chat','chat popup','conversational ai','bot','assistant','chat window','live chat',
    'chat en ligne','agent conversationnel','answer customer questions','answer questions automatically',
    'chatbt','chat-bot','chabot','bot de chat','chatbot web','asistente de chat','assistant chat'],
  r:() => { ctx.lastEntry='chatbot'; ctx.service='chatbot';
    return t(
      `Our website chatbots are **completely custom** — not a third-party platform integration. 🤖\n\nHere's how they work:\n• Built on a **custom knowledge base** trained on your specific business — your services, prices, hours, booking process, FAQs\n• **Multilingual by default** — responds in whatever language the visitor uses\n• **Fuzzy matching** — understands typos and informal phrasing\n• **Lead capture** — collects email or phone when relevant\n• **Self-hosted** — runs on your own site, no monthly SaaS fees, no data sent to third parties\n\nThey don't improvise or make things up — they only answer based on what you've told us.\n\nAvailable standalone or as an add-on when you order a website. Want to see a live demo?`,
      `Nos chatbots web sont **entièrement sur-mesure** — pas une intégration de plateforme tierce. 🤖\n\nComment ils fonctionnent :\n• Construits sur une **base de connaissances personnalisée** entraînée sur votre entreprise spécifique\n• **Multilingue par défaut** — répond dans la langue du visiteur\n• **Correspondance floue** — comprend les fautes de frappe et le langage informel\n• **Capture de leads** — collecte email ou téléphone si pertinent\n• **Auto-hébergé** — tourne sur votre propre site, pas de frais SaaS mensuels\n\nDisponible seul ou en complément lors de la commande d'un site web.`,
      `Nuestros chatbots web son **completamente personalizados** — no es una integración de plataforma de terceros. 🤖\n\nCómo funcionan:\n• Construidos sobre una **base de conocimiento personalizada** entrenada en tu negocio específico\n• **Multilingüe por defecto** — responde en el idioma del visitante\n• **Coincidencia difusa** — entiende errores tipográficos y lenguaje informal\n• **Captación de leads** — recopila email o teléfono cuando es relevante\n• **Auto-alojado** — corre en tu propio sitio, sin tarifas SaaS mensuales\n\nDisponible solo o como complemento al pedir un sitio web.`
    );
  }
},


/* ───── WEBSITES ───── */
{ id:'websites', kw:['website','site','web','custom site','build site','new site','web design',
    'web development','websit','wesbite','webiste','webdesign','webdesing','site web','pagina web','sitio web',
    'crear sitio','hacer sitio','custom code','coded site','no template','from scratch'],
  r:() => { ctx.lastEntry='websites'; ctx.service='websites';
    return t(
      `Every website we build is **custom-coded from scratch** — HTML, CSS, JavaScript. No WordPress, no page builders, no templates. 🏗️\n\nWe've built:\n• **Booking platforms** — real-time slot availability, payment, admin panel\n• **E-commerce stores** — product catalogues, Stripe payments, order management\n• **Restaurant & venue sites** — menus, reservations, gallery, multilingual\n• **Service business sites** — lead capture, contact, clear service presentation\n• **Landing pages** — single-page conversion builds tied to ad campaigns\n\nAll sites include: SEO structure, mobile-first design, privacy/cookie banner, and analytics setup (GA4 + Meta Pixel where needed).\n\nWant to know about a specific type of site?`,
      `Chaque site que nous construisons est **codé sur-mesure de zéro** — HTML, CSS, JavaScript. Pas de WordPress, pas de constructeurs de pages, pas de templates. 🏗️\n\nNous avons construit :\n• **Plateformes de réservation** — disponibilité en temps réel, paiement, panneau admin\n• **Boutiques e-commerce** — catalogues produits, paiements Stripe, gestion des commandes\n• **Sites restaurants & lieux** — menus, réservations, galerie, multilingue\n• **Sites d'entreprises de services** — capture de leads, contact, présentation claire\n• **Landing pages** — builds single-page de conversion liés aux campagnes\n\nTous les sites incluent : structure SEO, design mobile-first, bannière cookies confidentialité, et configuration analytics.\n\nVoulez-vous en savoir plus sur un type de site spécifique ?`,
      `Cada sitio que construimos está **programado a medida desde cero** — HTML, CSS, JavaScript. Sin WordPress, sin constructores de páginas, sin plantillas. 🏗️\n\nHemos construido:\n• **Plataformas de reservas** — disponibilidad en tiempo real, pagos, panel de administración\n• **Tiendas e-commerce** — catálogos de productos, pagos con Stripe, gestión de pedidos\n• **Sitios de restaurantes y locales** — menús, reservas, galería, multilingüe\n• **Sitios de empresas de servicios** — captación de leads, contacto, presentación clara\n• **Landing pages** — builds de conversión de una sola página vinculados a campañas\n\nTodos los sitios incluyen: estructura SEO, diseño mobile-first, banner de cookies de privacidad, y configuración de analytics.\n\n¿Quieres saber sobre un tipo de sitio específico?`
    );
  }
},

{ id:'wordpress', kw:['wordpress','wix','squarespace','webflow','shopify site','template',
    'page builder','elementor','divi','woocommerce','cms','content management',
    'why not wordpress','why custom','do you use wordpress'],
  r:() => { ctx.lastEntry='wordpress'; ctx.service='websites';
    return t(
      `We don't use WordPress, Wix, Squarespace, Webflow, or any page builder. Here's why:\n\n**Custom code gives us:**\n• Full control over performance (no plugin bloat slowing load times)\n• Exact design — pixel-perfect, not constrained by themes\n• Real mobile optimisation, not just responsive resizing\n• No ongoing plugin licensing fees\n• Security — no WordPress CVEs, no exposed admin panels\n• Animations and interactions that page builders can't produce\n\nFor a booking platform with real-time availability, multilingual support, and a custom admin panel, WordPress would require 15+ plugins that conflict, break on updates, and create performance issues.\n\nCustom code is the only way to build what we build properly.`,
      `Nous n'utilisons pas WordPress, Wix, Squarespace, Webflow ou tout autre constructeur de pages. Voici pourquoi :\n\n**Le code sur-mesure nous donne :**\n• Contrôle total sur les performances (pas de plugins qui ralentissent le chargement)\n• Design exact — pixel-perfect, non contraint par des thèmes\n• Optimisation mobile réelle, pas juste un redimensionnement\n• Pas de frais de licence de plugins continus\n• Sécurité — pas de CVE WordPress, pas de panneaux admin exposés\n• Animations et interactions qu'aucun constructeur de pages ne peut produire\n\nLe code sur-mesure est la seule façon de construire correctement ce que nous construisons.`,
      `No usamos WordPress, Wix, Squarespace, Webflow ni ningún constructor de páginas. Por qué:\n\n**El código personalizado nos da:**\n• Control total sobre el rendimiento (sin plugins que ralentizan la carga)\n• Diseño exacto — pixel-perfect, sin restricciones de temas\n• Optimización móvil real, no solo redimensionado responsive\n• Sin tarifas de licencia de plugins recurrentes\n• Seguridad — sin CVEs de WordPress, sin paneles de administración expuestos\n• Animaciones e interacciones que ningún constructor de páginas puede producir\n\nEl código personalizado es la única forma de construir correctamente lo que nosotros construimos.`
    );
  }
},

{ id:'ecommerce', kw:['ecommerce','e-commerce','online shop','online store','sell products',
    'product catalogue','payment gateway','mollie','shop','boutique','tienda online',
    'sell online','checkout','basket','cart','buy online','purchase'],
  r:() => { ctx.lastEntry='ecommerce'; ctx.service='websites';
    return t(
      `Our e-commerce sites include:\n\n• **Product catalogue** — filterable, with variants (size, colour, etc.)\n• **Payment integration** — via **Stripe**, supporting cards, ACH, Apple Pay, Google Pay, and 20+ payment methods\n• **Order management** — admin panel for viewing, processing, and managing orders\n• **Inventory tracking** — optional, via Supabase backend\n• **Multilingual** — product descriptions and checkout in multiple languages\n• **SEO** — product schema markup, category pages, sitemap\n\nStripe is the standard payment processor for US businesses — supports cards, ACH, Apple Pay, Google Pay, and buy-now-pay-later methods.\n\nWhat kind of products are you selling?`,
      `Nos sites e-commerce incluent :\n\n• **Catalogue produits** — filtrable, avec variantes (taille, couleur, etc.)\n• **Intégration paiement** — via **Stripe**, supportant cartes, ACH, Apple Pay, Google Pay et 20+ méthodes\n• **Gestion des commandes** — panneau admin pour voir, traiter et gérer les commandes\n• **Suivi des stocks** — optionnel, via backend Supabase\n• **Multilingue** — descriptions produits et checkout en plusieurs langues\n• **SEO** — balisage schema produit, pages catégories, sitemap\n\nStripe est le processeur de paiement standard pour les entreprises américaines. Quel type de produits vendez-vous ?`,
      `Nuestros sitios de e-commerce incluyen:\n\n• **Catálogo de productos** — filtrable, con variantes (talla, color, etc.)\n• **Integración de pagos** — via **Stripe**, soportando tarjetas, ACH, Apple Pay, Google Pay y 20+ métodos\n• **Gestión de pedidos** — panel de administración para ver, procesar y gestionar pedidos\n• **Seguimiento de inventario** — opcional, via backend Supabase\n• **Multilingüe** — descripciones de productos y checkout en múltiples idiomas\n• **SEO** — schema markup de productos, páginas de categorías, sitemap\n\nStripe es el procesador de pagos estándar para empresas en EE.UU. ¿Qué tipo de productos vendes?`
    );
  }
},

{ id:'booking', kw:['booking','reservation','reserve','schedule appointment','book online',
    'booking system','appointment booking','slot booking','availability','calendar',
    'bookng','reservaton','réservation','sistema de reservas','citas','reservar'],
  r:() => { ctx.lastEntry='booking'; ctx.service='websites';
    return t(
      `Our booking systems are fully custom — built on Supabase (PostgreSQL) with:\n\n• **Real-time slot availability** — visitors see live availability, slots lock on selection\n• **Date & time picker** — custom calendar, no third-party booking widgets\n• **Group size** — capacity management per slot\n• **Payment at booking** — collect deposits or full payment via Stripe\n• **Booking confirmation** — email confirmation sent automatically\n• **Admin panel** — view all bookings, manage slots, export data, mark as attended\n• **Cancellation & rescheduling** — with or without penalty rules\n• **Multilingual** — booking flow in as many languages as needed\n\nWe've built booking systems for venues, activity centres, and restaurants. They handle hundreds of concurrent users without slowdown.\n\nWhat type of business needs the booking system?`,
      `Nos systèmes de réservation sont entièrement sur-mesure — construits sur Supabase (PostgreSQL) avec :\n\n• **Disponibilité des créneaux en temps réel** — les visiteurs voient la disponibilité en direct\n• **Sélection de date & heure** — calendrier personnalisé, sans widgets de réservation tiers\n• **Taille du groupe** — gestion de capacité par créneau\n• **Paiement à la réservation** — collecte d'acomptes ou paiement complet via Stripe\n• **Confirmation de réservation** — email envoyé automatiquement\n• **Panneau admin** — voir toutes les réservations, gérer les créneaux, exporter les données\n• **Annulation & reprogrammation** — avec ou sans règles de pénalité\n• **Multilingue** — flux de réservation dans autant de langues que nécessaire\n\nPour quel type d'entreprise avez-vous besoin du système de réservation ?`,
      `Nuestros sistemas de reservas son completamente personalizados — construidos sobre Supabase (PostgreSQL) con:\n\n• **Disponibilidad de slots en tiempo real** — los visitantes ven disponibilidad en vivo\n• **Selector de fecha y hora** — calendario personalizado, sin widgets de reservas de terceros\n• **Tamaño de grupo** — gestión de capacidad por slot\n• **Pago al reservar** — cobro de depósitos o pago completo via Stripe\n• **Confirmación de reserva** — email enviado automáticamente\n• **Panel de administración** — ver todas las reservas, gestionar slots, exportar datos\n• **Cancelación y reprogramación** — con o sin reglas de penalización\n• **Multilingüe** — flujo de reservas en tantos idiomas como sea necesario\n\n¿Para qué tipo de negocio necesitas el sistema de reservas?`
    );
  }
},

{ id:'multilingual', kw:['multilingual','multi language','multiple languages','translation','hreflang',
    'french','french website','spanish website','dutch website','german website',
    'multilingue','plusieurs langues','idiomas','traduccion','languages supported',
    'how many languages','which languages','several languages','multilangue'],
  r:() => { ctx.lastEntry='multilingual'; ctx.service='websites';
    return t(
      `We build **multilingual websites** across as many languages as needed. We've built in EN, FR, DE, NL, ES, and LB (Luxembourgish).\n\nTechnically, we use a **static site generator** that produces separate HTML pages per language. This means:\n• Each language gets its own fully-optimised URL (e.g. /fr/, /es/)\n• Proper **hreflang tags** for search engine language indexing\n• **Language switcher** integrated into the navigation\n• **Fallback logic** — if a page isn't translated yet, it falls back gracefully\n• **No translation plugin lag** — pages load at full speed\n\nFor a 10-page site in 5 languages, we produce 50 optimised HTML pages. All content is reviewed by native speakers where possible.\n\nHow many languages do you need?`,
      `Nous construisons des **sites web multilingues** dans autant de langues que nécessaire. Nous avons construit en FR, EN, DE, NL, ES et LB (luxembourgeois).\n\nTechniquement, nous utilisons un **générateur de site statique** qui produit des pages HTML séparées par langue. Cela signifie :\n• Chaque langue obtient sa propre URL optimisée (ex. /fr/, /es/)\n• **Balises hreflang** correctes pour l'indexation par les moteurs de recherche\n• **Sélecteur de langue** intégré à la navigation\n• **Logique de fallback** — si une page n'est pas encore traduite, repli élégant\n• **Pas de lag de plugin de traduction** — les pages se chargent à pleine vitesse\n\nDe combien de langues avez-vous besoin ?`,
      `Construimos **sitios web multilingüe** en tantos idiomas como sea necesario. Hemos construido en EN, FR, DE, NL, ES y LB (luxemburgués).\n\nTécnicamente, usamos un **generador de sitio estático** que produce páginas HTML separadas por idioma. Esto significa:\n• Cada idioma obtiene su propia URL optimizada (ej. /fr/, /es/)\n• **Etiquetas hreflang** correctas para indexación por motores de búsqueda\n• **Selector de idioma** integrado en la navegación\n• **Lógica de fallback** — si una página no está traducida aún, respaldo elegante\n• **Sin lag de plugin de traducción** — las páginas cargan a máxima velocidad\n\n¿Cuántos idiomas necesitas?`
    );
  }
},

{ id:'domain-hosting', kw:['domain','hosting','host','deploy','server','go live','domain name',
    'register domain','setup hosting','cloudflare','netlify','vercel','dns',
    'domaine','hébergement','dominio','alojamiento','publicar'],
  r:() => { ctx.lastEntry='domain-hosting'; ctx.service='websites';
    return t(
      `Domain registration and hosting setup are available as an **option** on any website project.\n\n**If you already have a domain and hosting** — we deploy to those. We just need FTP/DNS access.\n\n**If you don't** — we handle everything:\n• Register your domain (typically $12–$18/year for .com)\n• Configure hosting (we use Netlify, Vercel, or Cloudflare Pages for static sites — all free or low cost)\n• Set up DNS, SSL certificate, and email forwarding\n• You get the login credentials and own everything fully\n\nFor sites with a Supabase backend (booking, e-commerce), we also set up the database and auth configuration.\n\nDo you already have a domain or need one registered?`,
      `L'enregistrement de domaine et la configuration de l'hébergement sont disponibles en **option** sur tout projet de site web.\n\n**Si vous avez déjà un domaine et un hébergement** — nous déployons dessus.\n\n**Sinon** — nous gérons tout :\n• Enregistrement du domaine (typiquement 12–18 $/an pour un .com)\n• Configuration de l'hébergement (Netlify, Vercel ou Cloudflare Pages — gratuit ou peu coûteux)\n• Configuration DNS, certificat SSL et redirection email\n• Vous obtenez les identifiants et possédez tout entièrement\n\nAvez-vous déjà un domaine ou en avez-vous besoin d'un ?`,
      `El registro de dominio y la configuración del hosting están disponibles como **opción** en cualquier proyecto de sitio web.\n\n**Si ya tienes un dominio y hosting** — desplegamos en ellos.\n\n**Si no** — nos ocupamos de todo:\n• Registro del dominio (típicamente $12–$18/año para .com)\n• Configuración del hosting (Netlify, Vercel o Cloudflare Pages — gratis o bajo coste)\n• Configuración DNS, certificado SSL y reenvío de email\n• Recibes las credenciales y eres propietario de todo\n\n¿Ya tienes un dominio o necesitas registrar uno?`
    );
  }
},

{ id:'admin-panel', kw:['admin','admin panel','admin dashboard','cms','content management',
    'backend','manage content','manage bookings','control panel','backend access',
    'mfa','multi factor','totp','two factor','panneau admin','tableau de bord',
    'panel de administración','gestión','autenticacion'],
  r:() => { ctx.lastEntry='admin-panel'; ctx.service='websites';
    return t(
      `Our admin panels are **custom-built and MFA-secured**. No off-the-shelf CMS.\n\nTypical admin panels include:\n• **Booking management** — view, confirm, cancel, reschedule bookings\n• **Content management** — update text, images, prices without touching code\n• **User management** — staff roles, access levels\n• **Data export** — download bookings, orders, or leads as CSV\n• **Audit logging** — track who changed what and when\n\n**Security features:**\n• Multi-Factor Authentication (TOTP)\n• Row Level Security (RLS) via Supabase\n• Session timeout and inactivity lock\n• Role-based access (admin vs staff vs read-only)\n\nThe admin is accessible at a private URL — visitors never see it.`,
      `Nos panneaux d'administration sont **construits sur-mesure et sécurisés avec MFA**. Pas de CMS off-the-shelf.\n\nLes panneaux admin typiques incluent :\n• **Gestion des réservations** — voir, confirmer, annuler, reprogrammer\n• **Gestion de contenu** — mettre à jour textes, images, prix sans toucher au code\n• **Gestion des utilisateurs** — rôles du personnel, niveaux d'accès\n• **Export de données** — télécharger réservations, commandes ou leads en CSV\n• **Journal d'audit** — suivre qui a modifié quoi et quand\n\n**Fonctionnalités de sécurité :**\n• Authentification multi-facteurs (TOTP)\n• Row Level Security (RLS) via Supabase\n• Timeout de session et verrouillage par inactivité\n\nL'admin est accessible à une URL privée — les visiteurs ne le voient jamais.`,
      `Nuestros paneles de administración están **construidos a medida y asegurados con MFA**. Sin CMS genérico.\n\nLos paneles de administración típicos incluyen:\n• **Gestión de reservas** — ver, confirmar, cancelar, reprogramar\n• **Gestión de contenido** — actualizar textos, imágenes, precios sin tocar el código\n• **Gestión de usuarios** — roles del personal, niveles de acceso\n• **Exportación de datos** — descargar reservas, pedidos o leads como CSV\n• **Registro de auditoría** — rastrear quién cambió qué y cuándo\n\n**Funciones de seguridad:**\n• Autenticación multifactor (TOTP)\n• Row Level Security (RLS) via Supabase\n• Timeout de sesión y bloqueo por inactividad\n\nEl admin es accesible en una URL privada — los visitantes nunca lo ven.`
    );
  }
},

{ id:'landing', kw:['landing page','landing','single page','conversion page','lead page',
    'campaign page','product page','sales page','squeeze page','promo page',
    'page de destination','pagina de aterrizaje'],
  r:() => { ctx.lastEntry='landing'; ctx.service='websites';
    return t(
      `**Landing pages** are single-page conversion builds designed to work with a specific ad campaign or audience.\n\nWhat we include:\n• **Custom design** — built around your offer and target audience, not a generic template\n• **Conversion-focused layout** — above-the-fold CTA, social proof, objection handling\n• **Lead capture form** — connected to email, CRM, or booking system\n• **Mobile-first** — over 70% of paid traffic lands on mobile\n• **Page speed** — sub-3s load time, which directly affects Quality Score on Google\n• **UTM tracking** — landing page URL matches campaign UTMs for clean attribution\n• **A/B variant** — optional second version for split testing\n• **Domain & hosting** — included if needed\n• **Chatbot** — optional add-on\n\nBuilt to the same standard as our full websites — custom code, not a page builder.`,
      `Les **landing pages** sont des builds single-page de conversion conçus pour fonctionner avec une campagne ou audience spécifique.\n\nCe que nous incluons :\n• **Design personnalisé** — construit autour de votre offre et audience cible\n• **Mise en page orientée conversion** — CTA above-the-fold, preuve sociale, traitement des objections\n• **Formulaire de capture de leads** — connecté à l'email, CRM ou système de réservation\n• **Mobile-first** — plus de 70% du trafic payant arrive sur mobile\n• **Vitesse de page** — temps de chargement sub-3s, qui affecte directement le Quality Score Google\n\nConstruit au même standard que nos sites complets — code sur-mesure, pas un constructeur de pages.`,
      `Las **landing pages** son builds de conversión de una sola página diseñados para funcionar con una campaña o audiencia específica.\n\nQué incluimos:\n• **Diseño personalizado** — construido alrededor de tu oferta y audiencia objetivo\n• **Layout orientado a conversión** — CTA above-the-fold, prueba social, manejo de objeciones\n• **Formulario de captación de leads** — conectado a email, CRM o sistema de reservas\n• **Mobile-first** — más del 70% del tráfico de pago llega en móvil\n• **Velocidad de página** — tiempo de carga sub-3s, que afecta directamente al Quality Score de Google\n\nConstruido al mismo estándar que nuestros sitios completos — código personalizado, no un constructor de páginas.`
    );
  }
},

/* ───── PHONE AGENT ───── */
{ id:'phoneagent', kw:['phone agent','voice agent','ai phone','phone bot','voice bot','call bot',
    'ai call','ai calling','answer calls','missed calls','inbound calls','outbound calls',
    'phone answering','handle phone calls','never miss a call','after hours calls',
    'phone ai','answering service','virtual receptionist','receptionist ai',
    'ai for inbound calls','ai for outbound calls','24 7 phone','ai handles calls',
    'repondre aux appels','receptionniste virtuel','recepcionista virtual',
    'phone calls','phone call ai','handle calls','handle calls automatically',
    'phone system','intelligent phone','smart phone system',
    'ai handles my calls','handles my calls','handles calls',
    'agent d appel','llamadas','receptionist',
    'ai receptionist','elevenlabs','phoneagent','agent vocal','agente telefonico',
    'agente de llamadas','agent telephonique'],
  r:() => { ctx.lastEntry='phoneagent'; ctx.service='phone';
    return t(
      `Our **AI phone agents** answer every inbound call in any language — naturally, not robotically. 📞\n\nHere's what they do:\n• **Answer calls 24/7** — no missed calls, no voicemail\n• **Natural conversation** — not a phone tree, real back-and-forth dialogue\n• **Any language** — auto-detects the caller's language and responds in it\n• **Live calendar booking** — checks availability, books or cancels appointments in real time\n• **FAQ handling** — answers your most common questions accurately\n• **Lead collection** — captures caller name, phone, and email\n• **Call transcripts** — every call is transcribed for quality review\n\nThe agent is trained on your specific business — your services, prices, hours, policies. You can test a live demo on our phone agent page.\n\nWhat kind of business do you need the agent for?`,
      `Nos **agents téléphoniques IA** répondent à chaque appel entrant dans n'importe quelle langue — naturellement, pas de manière robotique. 📞\n\nVoici ce qu'ils font :\n• **Répondre aux appels 24h/24** — aucun appel manqué\n• **Conversation naturelle** — pas un menu vocal, un vrai dialogue\n• **N'importe quelle langue** — détecte automatiquement la langue de l'appelant\n• **Réservation calendrier en direct** — vérifie la disponibilité, prend ou annule des rendez-vous\n• **Gestion des FAQ** — répond précisément à vos questions les plus courantes\n• **Collecte de leads** — capture nom, téléphone et email\n• **Transcriptions des appels** — chaque appel est transcrit pour contrôle qualité\n\nL'agent est entraîné sur votre entreprise spécifique. Vous pouvez tester une démo en direct sur notre page d'agent téléphonique.\n\nPour quel type d'entreprise avez-vous besoin de l'agent ?`,
      `Nuestros **agentes telefónicos IA** responden cada llamada entrante en cualquier idioma — de forma natural, no robótica. 📞\n\nEsto es lo que hacen:\n• **Responder llamadas 24/7** — sin llamadas perdidas\n• **Conversación natural** — no un menú de voz, diálogo real\n• **Cualquier idioma** — detecta automáticamente el idioma del llamante\n• **Reservas de calendario en vivo** — verifica disponibilidad, hace o cancela citas en tiempo real\n• **Gestión de preguntas frecuentes** — responde tus preguntas más comunes con precisión\n• **Captación de leads** — captura nombre, teléfono y email\n• **Transcripciones de llamadas** — cada llamada se transcribe para control de calidad\n\nEl agente está entrenado en tu negocio específico. Puedes probar una demo en vivo en nuestra página de agente telefónico.\n\n¿Para qué tipo de negocio necesitas el agente?`
    );
  }
},

{ id:'phone-booking', kw:['phone booking','book by phone','phone reservation','call to book',
    'phone calendar','appointment booking phone','calendar integration','google calendar',
    'real time booking phone','webhook','crm phone'],
  r:() => { ctx.lastEntry='phone-booking'; ctx.service='phone';
    return t(
      `The calendar booking capability is one of the most powerful features of our phone agents.\n\nDuring a live call, the agent:\n1. **Checks your calendar** — real-time API call to see what's available\n2. **Presents options naturally** — "We have availability between 10 AM and 3 PM on Saturday — what works for you?"\n3. **Confirms the chosen slot** — "11 AM works perfectly, let me grab your details"\n4. **Writes the booking** — creates the appointment directly in your calendar\n5. **Handles rescheduling & cancellation** — same flow, looks up by name/number\n\nWe integrate with **Google Calendar** via webhook. If you use another booking system with an API, we can connect to that too.\n\nThe whole process takes about 2–3 minutes in a real call.`,
      `La capacité de réservation calendrier est l'une des fonctionnalités les plus puissantes de nos agents téléphoniques.\n\nPendant un appel en direct, l'agent :\n1. **Vérifie votre calendrier** — appel API en temps réel pour voir les disponibilités\n2. **Présente les options naturellement** — "Nous avons de la disponibilité entre 10h et 15h samedi — qu'est-ce qui vous convient ?"\n3. **Confirme le créneau choisi** — "11h, parfait, je prends vos coordonnées"\n4. **Écrit la réservation** — crée le rendez-vous directement dans votre calendrier\n5. **Gère les modifications & annulations** — même flux, recherche par nom/numéro\n\nNous intégrons avec **Google Calendar** via webhook. Si vous utilisez un autre système de réservation avec une API, nous pouvons nous y connecter.\n\nToute la procédure prend environ 2–3 minutes lors d'un vrai appel.`,
      `La capacidad de reserva de calendario es una de las funciones más potentes de nuestros agentes telefónicos.\n\nDurante una llamada en vivo, el agente:\n1. **Verifica tu calendario** — llamada API en tiempo real para ver disponibilidad\n2. **Presenta opciones naturalmente** — "Tenemos disponibilidad entre las 10 y las 15h del sábado — ¿qué te viene bien?"\n3. **Confirma el slot elegido** — "Las 11h perfecto, te tomo los datos"\n4. **Registra la reserva** — crea la cita directamente en tu calendario\n5. **Gestiona cambios y cancelaciones** — mismo flujo, busca por nombre/número\n\nIntegramos con **Google Calendar** via webhook. Si usas otro sistema de reservas con API, también podemos conectar con él.\n\nTodo el proceso toma unos 2–3 minutos en una llamada real.`
    );
  }
},

{ id:'phone-transcripts', kw:['transcript','call transcript','call recording','call log',
    'call history','review calls','quality control','monitor calls','listen back',
    'transcription','call notes'],
  r:() => { ctx.lastEntry='phone-transcripts'; ctx.service='phone';
    return t(
      `Every call generates a **full transcript** — a text record of everything said during the conversation. 📋\n\nThis is useful for:\n• **Quality review** — check how the agent handled complex questions\n• **Knowledge base improvement** — identify gaps in what the agent knows\n• **Staff training** — use real call examples for onboarding\n• **Compliance** — retain records of booking confirmations and caller instructions\n• **Missed opportunities** — see which questions the agent couldn't answer so you can train it to handle them\n\nTranscripts are stored in ElevenLabs (the platform we use) and accessible from your account dashboard. We review them with you during the first few weeks post-launch to improve the agent's responses.`,
      `Chaque appel génère une **transcription complète** — un enregistrement textuel de tout ce qui a été dit. 📋\n\nC'est utile pour :\n• **Contrôle qualité** — vérifier comment l'agent a géré des questions complexes\n• **Amélioration de la base de connaissances** — identifier les lacunes\n• **Formation du personnel** — utiliser de vrais exemples d'appels\n• **Conformité** — conserver des enregistrements des confirmations de réservation\n• **Opportunités manquées** — voir quelles questions l'agent n'a pas pu répondre\n\nLes transcriptions sont stockées dans ElevenLabs et accessibles depuis votre tableau de bord.`,
      `Cada llamada genera una **transcripción completa** — un registro de texto de todo lo que se dijo. 📋\n\nÉsto es útil para:\n• **Control de calidad** — ver cómo el agente manejó preguntas complejas\n• **Mejora de la base de conocimiento** — identificar lagunas\n• **Formación del personal** — usar ejemplos reales de llamadas\n• **Cumplimiento** — conservar registros de confirmaciones de reservas\n• **Oportunidades perdidas** — ver qué preguntas el agente no pudo responder\n\nLas transcripciones se almacenan en ElevenLabs y son accesibles desde tu panel de cuenta.`
    );
  }
},

{ id:'phone-number', kw:['phone number','link number','connect number','my number','existing number',
    'business number','forward calls','call forwarding','numero de telephone','numero de telefono'],
  r:() => { ctx.lastEntry='phone-number'; ctx.service='phone';
    return t(
      `Once the agent is built and tested, you connect your phone number to it.\n\nThe most common setup:\n• **Call forwarding** — your existing business number forwards to the agent after X rings, or always\n• **Dedicated number** — we can help you get a new number that routes directly to the agent\n\nWe configure the routing rules — for example: forward to agent outside business hours, or always use the agent and have it transfer complex calls to a human line.\n\nThe agent handles everything else — no changes needed to how customers reach you.`,
      `Une fois l'agent construit et testé, vous connectez votre numéro de téléphone à celui-ci.\n\nLa configuration la plus courante :\n• **Transfert d'appel** — votre numéro professionnel existant transfère vers l'agent après X sonneries, ou toujours\n• **Numéro dédié** — nous pouvons vous aider à obtenir un nouveau numéro qui route directement vers l'agent\n\nNous configurons les règles de routage — par exemple : transférer vers l'agent en dehors des heures de bureau, ou toujours utiliser l'agent.\n\nL'agent gère tout le reste — aucun changement pour la façon dont les clients vous contactent.`,
      `Una vez que el agente está construido y probado, conectas tu número de teléfono a él.\n\nLa configuración más común:\n• **Desvío de llamadas** — tu número de negocio existente desvía al agente después de X timbres, o siempre\n• **Número dedicado** — podemos ayudarte a obtener un nuevo número que rutee directamente al agente\n\nConfiguramos las reglas de enrutamiento — por ejemplo: desviar al agente fuera del horario de negocio, o siempre usar el agente.\n\nEl agente gestiona todo lo demás — sin cambios en cómo los clientes te contactan.`
    );
  }
},

/* ───── CHATBOT ───── */
{ id:'chatbot-training', kw:['how train','training','knowledge base','train chatbot','fuzzy matching','matching',
    'how do you train','what data','what information','feed chatbot','teach chatbot',
    'chatbot data','chatbot knowledge','what does chatbot know'],
  r:() => { ctx.lastEntry='chatbot-training'; ctx.service='chatbot';
    return t(
      `Training the chatbot is a structured process:\n\n**1. Knowledge extraction**\nWe go through your website, price lists, FAQs, and anything else you provide. We extract every question a visitor might ask and every answer you'd want to give.\n\n**2. Knowledge base build**\nWe organise this into 30–80 topic categories, each with keyword triggers (including typos and informal variants) and a crafted response.\n\n**3. Language versions**\nFor each language you want, we build the knowledge base separately — not auto-translated, written to sound natural in that language.\n\n**4. Fuzzy matching**\nWe implement Damerau-Levenshtein distance matching so typos like "reseravtion" still match "reservation".\n\n**5. Testing**\nWe run 500–2,000 test messages before deployment to verify coverage and accuracy.\n\nThe more complete the information you give us, the more accurate the chatbot. If you already have a website, we can work from that.`,
      `L'entraînement du chatbot est un processus structuré :\n\n**1. Extraction des connaissances**\nNous parcourons votre site web, listes de prix, FAQ, et tout ce que vous fournissez. Nous extrayons chaque question qu'un visiteur pourrait poser.\n\n**2. Construction de la base de connaissances**\nNous organisons cela en 30 à 80 catégories thématiques, chacune avec des mots-clés déclencheurs (incluant fautes de frappe et variantes informelles) et une réponse élaborée.\n\n**3. Versions linguistiques**\nPour chaque langue souhaitée, nous construisons la base de connaissances séparément — pas de traduction automatique.\n\n**4. Correspondance floue**\nNous implémentons la distance de Damerau-Levenshtein pour que les fautes de frappe fonctionnent quand même.\n\n**5. Tests**\nNous exécutons 500 à 2000 messages de test avant le déploiement.\n\nPlus les informations que vous nous donnez sont complètes, plus le chatbot est précis.`,
      `El entrenamiento del chatbot es un proceso estructurado:\n\n**1. Extracción de conocimiento**\nRepasamos tu sitio web, listas de precios, FAQs y cualquier cosa que proporciones. Extraemos cada pregunta que un visitante podría hacer.\n\n**2. Construcción de la base de conocimiento**\n30–80 categorías temáticas, cada una con palabras clave activadoras (incluyendo errores tipográficos y variantes informales) y una respuesta elaborada.\n\n**3. Versiones lingüísticas**\nPara cada idioma que quieras, construimos la base de conocimiento por separado — no auto-traducida.\n\n**4. Coincidencia difusa**\nImplementamos distancia de Damerau-Levenshtein para que los errores tipográficos funcionen.\n\n**5. Pruebas**\nEjecutamos 500–2.000 mensajes de prueba antes del despliegue.\n\nCuanto más completa sea la información que nos des, más preciso será el chatbot.`
    );
  }
},

{ id:'chatbot-api', kw:['api chatbot','openai chatbot','gpt chatbot','claude chatbot',
    'ai powered chatbot','llm chatbot','gpt4','chatgpt bot','openai integration',
    'which ai does it use','what ai','powered by'],
  r:() => { ctx.lastEntry='chatbot-api'; ctx.service='chatbot';
    return t(
      `We offer two chatbot approaches:\n\n**Self-hosted (our default)**\n• Custom knowledge base with keyword classification\n• No external API calls\n• No ongoing API costs\n• GDPR-compliant — no data leaves your server\n• Works for businesses with well-defined FAQs and services\n\n**API-based**\n• Connects to an external AI service (e.g. OpenAI GPT, Anthropic Claude)\n• Better for open-ended conversations with no fixed answer set\n• More flexible — handles unusual questions without explicit training\n• Monthly API costs apply — we pass these through with a management margin\n\n**Which is right for you?**\nIf your visitors mostly ask the same 30–60 questions, self-hosted is more reliable, cheaper, and faster. If you need the chatbot to handle genuinely unpredictable conversations, API-based makes more sense.\n\nWe'll recommend the right approach during the brief.`,
      `Nous proposons deux approches pour les chatbots :\n\n**Auto-hébergé (notre approche par défaut)**\n• Base de connaissances personnalisée avec classification par mots-clés\n• Pas d'appels API externes\n• Pas de coûts API continus\n• Conforme RGPD — aucune donnée ne quitte votre serveur\n\n**Basé sur API**\n• Se connecte à un service IA externe (ex. OpenAI GPT, Anthropic Claude)\n• Meilleur pour les conversations ouvertes sans ensemble de réponses fixe\n• Plus flexible — gère les questions inhabituelles sans entraînement explicite\n• Des coûts API mensuels s'appliquent\n\nNous recommanderons la bonne approche lors du brief.`,
      `Ofrecemos dos enfoques para chatbots:\n\n**Auto-alojado (nuestro enfoque por defecto)**\n• Base de conocimiento personalizada con clasificación por palabras clave\n• Sin llamadas API externas\n• Sin costes de API recurrentes\n• Cumple con GDPR — ningún dato sale de tu servidor\n\n**Basado en API**\n• Se conecta a un servicio de IA externo (ej. OpenAI GPT, Anthropic Claude)\n• Mejor para conversaciones abiertas sin conjunto de respuestas fijo\n• Más flexible — maneja preguntas inusuales sin entrenamiento explícito\n• Se aplican costes de API mensuales\n\nRecomendaremos el enfoque correcto durante el brief.`
    );
  }
},

/* ───── PROCESS & ABOUT ───── */
{ id:'automation', kw:['automation','workflow automation','workflow integration','workflow','process automation',
    'zapier','make','integromat','n8n','automate','automated','automate tasks',
    'integrate apps','integrate my tools','integrate tools','integrate my apps',
    'connect my apps','connect apps','connect my tools',
    'app integration','connect tools','api integration','api connection',
    'spreadsheet integration','payment integration',
    'automatisation','automatiser','automatisation des processus',
    'automatizacion','automatizar','flujo de trabajo'],
  r:() => { ctx.lastEntry='automation'; ctx.service='automation';
    return t(
      `We build **workflow automation** systems that connect your tools and eliminate manual repetitive tasks:\n\n• **Trigger-based workflows** — when X happens, do Y automatically\n• **App integrations** — connecting CRMs, email platforms, booking systems, payment processors\n• **Tools we work with:** Zapier, Make (Integromat), n8n, custom API integrations\n• **Common automations:** lead capture → CRM → email sequence, booking confirmed → calendar + notification, form submit → Slack alert + spreadsheet row\n\nGood automation removes 2–8 hours of manual work per week and eliminates human error in handoffs. Want to describe what you're currently doing manually?`,
      `Nous construisons des **systèmes d'automatisation de workflows** qui connectent vos outils et éliminent les tâches manuelles répétitives :\n\n• **Workflows déclenchés** — quand X se produit, Y s'exécute automatiquement\n• **Intégrations d'applications** — connexion CRM, plateformes email, systèmes de réservation, processeurs de paiement\n• **Outils utilisés :** Zapier, Make (Integromat), n8n, intégrations API personnalisées\n\nUne bonne automatisation élimine 2 à 8 heures de travail manuel par semaine. Voulez-vous décrire ce que vous faites manuellement ?`,
      `Construimos **sistemas de automatización de workflows** que conectan tus herramientas y eliminan tareas manuales repetitivas:\n\n• **Workflows activados** — cuando X ocurre, Y se ejecuta automáticamente\n• **Integraciones de aplicaciones** — conexión CRM, plataformas de email, sistemas de reservas\n• **Herramientas:** Zapier, Make (Integromat), n8n, integraciones API personalizadas\n\nUna buena automatización elimina 2–8 horas de trabajo manual semanal. ¿Quieres describir qué haces manualmente?`
    );
  }
},

{ id:'process', kw:['process','how does it work','how do we start','how do you work','how do we work','steps',
    'what happens next','next steps','how to start','how to get started','getting started','how to begin',
    'comment vous travaillez','are you available','can you start','how quickly',
    'previous work','can we see examples','experience in','retainer',
    'how do i get started','how do we get started','get started working','kick off',
    'brief you on','brief us','schedule a call to','nda','sign a nda',
    'nouveau projet','disponible pour','sign contracts',
    'processus','comment ca marche','como funciona','como empezamos'],
  r:() => { ctx.lastEntry='process';
    return t(
      `Our process is straightforward:\n\n**1. Brief (Day 0)**\nYou contact us at ${BIZ.email} or via the contact form. We ask a few specific questions to understand the full scope, then confirm a fixed price within 24 hours.\n\n**2. Build**\nWe handle everything — design, code, copy, integrations. You have a direct line for questions throughout.\n\n**3. Review & Revise**\nYou receive the finished deliverable. We handle one revision round as standard.\n\n**4. Launch**\nFor websites, we configure domain and hosting (if needed). For campaigns, we set up the accounts and go live. For AI agents, we test and deploy.\n\n**Payment:** 50% upfront before we start, 50% on delivery. For projects over $3,000 we can split into three.\n\nWhat would you like to build?`,
      `Notre processus est simple :\n\n**1. Brief (Jour 0)**\nVous nous contactez à ${BIZ.email}. Nous posons quelques questions précises pour comprendre le périmètre complet, puis confirmons un prix fixe dans les 24 heures.\n\n**2. Construction**\nNous gérons tout — design, code, rédaction, intégrations. Vous avez un interlocuteur direct pendant tout le projet.\n\n**3. Révision**\nVous recevez le livrable terminé. Nous gérons un tour de révision en standard.\n\n**4. Mise en ligne**\nPour les sites web, nous configurons domaine et hébergement si nécessaire.\n\n**Paiement :** 50% à l'avance avant de commencer, 50% à la livraison.\n\nQue souhaitez-vous construire ?`,
      `Nuestro proceso es sencillo:\n\n**1. Brief (Día 0)**\nNos contactas en ${BIZ.email}. Hacemos algunas preguntas específicas para entender el alcance completo, luego confirmamos un precio fijo en 24 horas.\n\n**2. Construcción**\nNos ocupamos de todo — diseño, código, contenido, integraciones.\n\n**3. Revisión**\nRecibes el entregable terminado. Gestionamos una ronda de revisión como estándar.\n\n**4. Lanzamiento**\nPara sitios web, configuramos dominio y hosting si es necesario.\n\n**Pago:** 50% por adelantado antes de empezar, 50% a la entrega.\n\n¿Qué quieres construir?`
    );
  }
},

{ id:'timeline', kw:['timeline','how long','turnaround','how fast','delivery','when ready',
    'how many days','weeks','months','deadline','urgency','urgent','rush',
    'délai','combien de temps','cuanto tiempo','plazo','entrega'],
  r:() => { ctx.lastEntry='timeline';
    return t(
      `Timelines depend on the scope. We agree on a realistic deadline at the brief stage and stick to it.\n\nGeneral ranges:\n• **Campaign setup** (1 platform) — 5–7 days from brief confirmation\n• **Landing page** — 5–10 days\n• **Standard website** (5–8 pages) — 2–3 weeks\n• **Complex site** (multilingual, booking system, admin) — 4–6 weeks\n• **AI phone agent** — 1–2 weeks from brief confirmation\n• **Website chatbot** — 1–2 weeks standalone, added to site timeline if combined\n\nThese are working timelines — we don't pad them. If you have a hard deadline, tell us in your brief and we'll tell you honestly whether it's achievable.`,
      `Les délais dépendent du périmètre. Nous convenons d'une deadline réaliste lors du brief et la respectons.\n\nFourchettes générales :\n• **Configuration de campagne** (1 plateforme) — 5–7 jours ouvrables\n• **Landing page** — 5–10 jours\n• **Site standard** (5–8 pages) — 2–3 semaines\n• **Site complexe** (multilingue, réservation, admin) — 4–6 semaines\n• **Agent téléphonique IA** — 1–2 semaines\n• **Chatbot web** — 1–2 semaines\n\nSi vous avez une deadline impérative, dites-le nous dans votre brief.`,
      `Los plazos dependen del alcance. Acordamos una fecha límite realista en el brief y la cumplimos.\n\nRangos generales:\n• **Configuración de campaña** (1 plataforma) — 5–7 días laborables\n• **Landing page** — 5–10 días\n• **Sitio estándar** (5–8 páginas) — 2–3 semanas\n• **Sitio complejo** (multilingüe, reservas, admin) — 4–6 semanas\n• **Agente telefónico IA** — 1–2 semanas\n• **Chatbot web** — 1–2 semanas\n\nSi tienes un plazo imprescindible, dinos en el brief y te diremos honestamente si es factible.`
    );
  }
},

{ id:'about', kw:['about','who are you','who is zoomy','zoomy services','what is zoomy',
    'your company','about you','about zoomy','the team','who made this',
    'parlez moi de vous','vous faites quoi','de que trata','de qué trata',
    'presence digitale','developper activite','faire croitre',
    'more details','what does it include','whats include','case studies','recommend',
    'presencia digital','negocio','deroule','projet avec',
    'a propos','qui etes vous','quienes son','sobre zoomy'],
  r:() => { ctx.lastEntry='about';
    return t(
      `**Zoomy.services** is a small, AI-augmented digital production studio.\n\nWe create and manage **paid media campaigns**, build **custom websites** (booking platforms, e-commerce, multilingual), develop **AI website chatbots**, and build **AI phone agents**.\n\nEvery project is built from scratch — no templates, no page builders. We work on a fixed-budget model: scope agreed upfront, fixed price, no hourly surprises.\n\nWe're remote-first and work with clients internationally.\n\nContact: **${BIZ.email}**`,
      `**Zoomy.services** est un petit studio de production digitale augmenté par l'IA.\n\nNous créons et gérons des **campagnes publicitaires**, construisons des **sites web sur-mesure**, développons des **chatbots IA** et créons des **agents téléphoniques IA**.\n\nChaque projet est construit de zéro — pas de templates. Nous travaillons en forfait fixe : périmètre convenu en amont, prix fixe.\n\nNous travaillons à distance et avec des clients internationaux.\n\nContact : **${BIZ.email}**`,
      `**Zoomy.services** es un pequeño estudio de producción digital aumentado con IA.\n\nCreamos y gestionamos **campañas de publicidad digital**, construimos **sitios web personalizados**, desarrollamos **chatbots IA** y creamos **agentes telefónicos IA**.\n\nCada proyecto se construye desde cero — sin plantillas. Trabajamos con precio fijo: alcance acordado de antemano, precio fijo, sin sorpresas.\n\nSomos un equipo remoto y trabajamos con clientes internacionalmente.\n\nContacto: **${BIZ.email}**`
    );
  }
},

{ id:'seo', kw:['seo','search engine','google ranking','organic search','organic traffic',
    'search ranking','google position','keyword ranking','on page seo','technical seo',
    'rank higher','rank on google','get found on google','schema markup','schema org',
    'sitemap','xml sitemap','sitemap xml','robots txt','canonical tags','title tag optimization',
    'image alt text','lighthouse score','pagespeed optimization',
    'keyword research','appear on google','référencement','posicionamiento'],
  r:() => { ctx.lastEntry='seo';
    return t(
      `**SEO is built into every website we build** — it's not an add-on.\n\nWhat we include by default:\n• **Semantic HTML** — proper heading hierarchy (H1→H2→H3), section structure\n• **Meta tags** — title, description, Open Graph for social sharing\n• **Structured data** — Schema.org markup (LocalBusiness, Product, FAQ, BreadcrumbList)\n• **hreflang tags** — for multilingual sites\n• **XML sitemap** — auto-generated and submitted to Google Search Console\n• **Core Web Vitals** — our sites score 90+ on PageSpeed Insights\n• **Image optimisation** — WebP format, proper alt text, lazy loading\n\n**What we don't do:** ongoing SEO content strategy, backlink building, or monthly SEO audits. Our sites are technically optimised from day one — sustained search ranking requires ongoing content work that we don't provide.`,
      `**Le SEO est intégré dans chaque site que nous construisons** — ce n'est pas un supplément.\n\nCe que nous incluons par défaut :\n• **HTML sémantique** — hiérarchie de titres correcte, structure de sections\n• **Balises meta** — titre, description, Open Graph\n• **Données structurées** — balisage Schema.org\n• **Balises hreflang** — pour les sites multilingues\n• **Sitemap XML** — généré automatiquement\n• **Core Web Vitals** — nos sites scorent 90+ sur PageSpeed Insights\n• **Optimisation des images** — format WebP, alt text, lazy loading\n\nNos sites sont optimisés techniquement dès le premier jour.`,
      `**El SEO está integrado en cada sitio que construimos** — no es un extra.\n\nLo que incluimos por defecto:\n• **HTML semántico** — jerarquía correcta de títulos, estructura de secciones\n• **Meta tags** — título, descripción, Open Graph\n• **Datos estructurados** — Schema.org markup\n• **Etiquetas hreflang** — para sitios multilingüe\n• **Sitemap XML** — generado automáticamente\n• **Core Web Vitals** — nuestros sitios puntúan 90+ en PageSpeed Insights\n• **Optimización de imágenes** — formato WebP, alt text, lazy loading\n\nNuestros sitios están optimizados técnicamente desde el primer día.`
    );
  }
},



/* ───── TECH TOOLS & SERVICE SCOPE ───── */
{ id:'crm', kw:['crm','customer relationship management','hubspot','salesforce','pipedrive',
    'zoho crm','monday crm','freshsales','close crm','nutshell crm','contact management',
    'lead management','deal pipeline','sales pipeline','sales crm','client database',
    'logiciel crm','gestion client','gestion leads','crm commercial',
    'crm para ventas','gestion de clientes','base de datos clientes'],
  r:() => { ctx.lastEntry='crm';
    return t(
      `CRM setup isn't currently in our standard offering, but it's something we can scope case by case. We work with lead capture, form integrations, and automation workflows that often connect to CRM platforms.\n\nIf you need CRM configuration (HubSpot, Pipedrive, Salesforce, Zoho, etc.), email **contact@zoomy.services** with your requirements and we'll tell you whether it fits our expertise or recommend someone who can.`,
      `La mise en place de CRM ne fait pas partie de notre offre standard, mais c'est quelque chose que nous pouvons étudier. Écrivez à **contact@zoomy.services** avec vos besoins et nous vous dirons si cela correspond à notre expertise.`,
      `La configuración de CRM no está en nuestra oferta estándar actualmente, pero es algo que podemos estudiar. Escribe a **contact@zoomy.services** con tus requerimientos.`
    );
  }
},

{ id:'app-dev', kw:['mobile app','ios app','android app','android development','react native','flutter','swift app',
    'kotlin app','app development','android app development','build an app','create an app','mobile application',
    'smartphone app','iphone app','ipad app','app store','google play store','google play app','google play',
    'native app','hybrid app','pwa','progressive web app',
    'application mobile','developper une app','creer une app','appli mobile',
    'app movil','desarrollar app','aplicacion movil','desarrollo movil'],
  r:() => { ctx.lastEntry='app-dev';
    return t(
      `We don't build native mobile apps (iOS/Android). Our work is web-based: websites, web apps, chatbots, and campaign management.\n\nThat said, if you need a mobile-accessible solution, a **progressive web app (PWA)** — a web app that installs to the home screen and works offline — can often achieve what you need without native app development. Email **contact@zoomy.services** to discuss whether a PWA fits your use case.`,
      `Nous ne développons pas d'applications mobiles natives (iOS/Android). Notre travail est basé sur le web.\n\nSi vous avez besoin d'une solution accessible sur mobile, une **progressive web app (PWA)** peut souvent couvrir le besoin. Écrivez à **contact@zoomy.services** pour en discuter.`,
      `No desarrollamos aplicaciones móviles nativas (iOS/Android). Nuestro trabajo es basado en web.\n\nSi necesitas una solución accesible en móvil, una **progressive web app (PWA)** puede cubrir la necesidad. Escribe a **contact@zoomy.services** para discutir.`
    );
  }
},

{ id:'social-organic', kw:['social media management','organic social','content calendar','social media posts',
    'instagram management','facebook management','posting schedule','social content strategy',
    'organic content','community management','social media strategy','influencer marketing',
    'tiktok content','reels content','social media agency','manage instagram','manage facebook',
    'manage social','social media content',
    'gestion reseaux sociaux','reseaux sociaux organiques','calendrier editorial',
    'gestion redes sociales','contenido organico','redes sociales organicas'],
  r:() => { ctx.lastEntry='social-organic';
    return t(
      `We manage **paid social** (Meta Ads, TikTok Ads, LinkedIn Ads) but we don't manage organic social media content or community management.\n\nFor paid campaigns driving real measurable results — reach, leads, purchases — that's exactly what we do. If you need organic content management alongside, email **contact@zoomy.services** and we can discuss what combination makes sense for your goals.`,
      `Nous gérons la **publicité sociale payante** (Meta Ads, TikTok Ads, LinkedIn Ads) mais pas la gestion de contenu organique ou le community management.\n\nPour des campagnes payantes avec des résultats mesurables, c'est exactement ce que nous faisons. Écrivez à **contact@zoomy.services** pour en discuter.`,
      `Gestionamos **publicidad social de pago** (Meta Ads, TikTok Ads, LinkedIn Ads) pero no el contenido orgánico ni la gestión de comunidades.\n\nPara campañas de pago con resultados medibles, eso es exactamente lo que hacemos. Escribe a **contact@zoomy.services** para discutir.`
    );
  }
},

{ id:'branding', kw:['logo','logo design','branding','brand identity','visual identity','brand guidelines',
    'brand kit','color palette','typography system','brand strategy','brand book','style guide',
    'graphic design','corporate identity','brand assets','brand colors','brand fonts',
    'identite visuelle','charte graphique','design logo','identite de marque','design graphique',
    'identidad visual','diseno logo','diseno grafico','marca visual','guia de marca'],
  r:() => { ctx.lastEntry='branding';
    return t(
      `Logo and brand identity design isn't a service we currently offer. Our focus is digital production: campaigns, websites, chatbots, and phone agents.\n\nFor branding, you'd want to brief a brand designer or studio. That said, if you have existing brand assets (logo, colors, fonts) and need them implemented across a website or ad campaign, we absolutely work with what you have. Email **contact@zoomy.services** if you have a brief.`,
      `Le design de logo et l'identité de marque ne font pas partie de nos services actuels. Notre focus est la production digitale.\n\nSi vous avez des assets de marque existants à implémenter, nous pouvons certainement travailler avec. Contactez **contact@zoomy.services**.`,
      `El diseño de logo e identidad de marca no es un servicio que ofrecemos actualmente. Nuestro enfoque es la producción digital.\n\nSi tienes assets de marca existentes para implementar, trabajamos con eso. Escribe a **contact@zoomy.services**.`
    );
  }
},

{ id:'video-prod', kw:['video production','video editing','explainer video','promo video','product video',
    'brand video','commercial video','video shoot','filming','videographer',
    'motion graphics','animation video','2d animation','3d animation','video content creation',
    'youtube video','video ads creative','ugc video','user generated content',
    'production video','montage video','tournage video','realisation video',
    'produccion video','video promocional','edicion video','video corporativo'],
  r:() => { ctx.lastEntry='video-prod';
    return t(
      `We don't do video production or video editing. When running paid campaigns, we write detailed creative briefs and can direct UGC or studio shoots — but the filming and editing happens with your production team or a dedicated video partner.\n\nIf you need video ad creatives, we can scope the brief and spec requirements for your campaign. Email **contact@zoomy.services**.`,
      `Nous ne faisons pas de production ni de montage vidéo. Pour les campagnes, nous pouvons rédiger des briefs créatifs détaillés. Écrivez à **contact@zoomy.services** pour en discuter.`,
      `No hacemos producción ni edición de video. Para campañas, podemos escribir briefs creativos detallados. Escribe a **contact@zoomy.services** para discutir.`
    );
  }
},

{ id:'whatsapp', kw:['whatsapp','whatsapp business','whatsapp api','whatsapp bot','whatsapp chatbot',
    'whatsapp automation','whatsapp marketing','whatsapp integration','whatsapp number',
    'messaging bot','sms bot','sms marketing','sms automation','text bot','text message bot',
    'bot whatsapp','chatbot whatsapp','automatisation whatsapp','api whatsapp',
    'bot de whatsapp','marketing por whatsapp','chatbot sms'],
  r:() => { ctx.lastEntry='whatsapp';
    return t(
      `WhatsApp Business API integration and WhatsApp bots are something we can scope. Our chatbot expertise extends to messaging platforms — same custom knowledge base approach, different delivery channel.\n\nEmail **contact@zoomy.services** with your use case: what the bot should handle, expected message volume, and whether you need outbound messaging or just inbound responses.`,
      `L'intégration WhatsApp Business API et les bots WhatsApp font partie de ce que nous pouvons étudier. Notre expertise en chatbots s'étend aux plateformes de messagerie.\n\nÉcrivez à **contact@zoomy.services** avec votre cas d'usage.`,
      `La integración de WhatsApp Business API y los bots de WhatsApp son algo que podemos estudiar. Nuestra experiencia en chatbots se extiende a plataformas de mensajería.\n\nEscribe a **contact@zoomy.services** con tu caso de uso.`
    );
  }
},

{ id:'content-writing', kw:['content writing','copywriting','blog writing','article writing','web copy',
    'website copy','seo copywriting','content strategy','ghostwriting','content marketing',
    'product descriptions','email copywriting','ad copywriting','landing page copy',
    'content writer','blog posts','write articles','write content',
    'redaction web','redaction seo','contenu web','redacteur web','strategie contenu',
    'redaccion web','contenido seo','redaccion de contenido','escribir articulos'],
  r:() => { ctx.lastEntry='content-writing';
    return t(
      `Ad copy and landing page copy are written as part of our campaign and website builds — that's included in scope. We don't offer standalone copywriting, blog writing, or content strategy services.\n\nIf copy is needed for a project you're building with us, it's covered. For a standalone content retainer or blog production, email **contact@zoomy.services** and we'll tell you honestly whether it fits.`,
      `La rédaction d'annonces et de landing pages est incluse dans nos projets. Nous ne proposons pas de rédaction indépendante ou de production de blogs.\n\nÉcrivez à **contact@zoomy.services** pour en discuter.`,
      `La redacción de anuncios y landing pages está incluida en nuestros proyectos. No ofrecemos redacción independiente o producción de blogs.\n\nEscribe a **contact@zoomy.services** para discutir.`
    );
  }
},

{ id:'shopify', kw:['shopify','shopify store','shopify theme','shopify setup','shopify development',
    'shopify customization','shopify app','shopify plugin','shopify checkout','shopify plus',
    'shopify expert','shopify partner','shopify liquid','boutique shopify','site shopify',
    'tienda shopify','desarrollo shopify','personalizar shopify','tema shopify'],
  r:() => { ctx.lastEntry='shopify'; ctx.service='websites';
    return t(
      `We don't build on Shopify. We build **custom-coded e-commerce stores** — HTML, CSS, JavaScript with Stripe payment integration, custom product catalogues, and full admin panels. No platform fees, no Shopify subscription.\n\nIf you specifically need a Shopify theme or app, that requires a Shopify Partner, which we're not. But if you're open to a custom build that gives you full ownership and no recurring platform costs, email **contact@zoomy.services**.`,
      `Nous ne développons pas sur Shopify. Nous construisons des boutiques e-commerce **codées sur-mesure** sans dépendance à une plateforme et sans frais mensuels Shopify.\n\nÉcrivez à **contact@zoomy.services** pour en discuter.`,
      `No desarrollamos en Shopify. Construimos tiendas e-commerce **custom** desde cero sin dependencia de plataforma y sin tarifas mensuales de Shopify.\n\nEscribe a **contact@zoomy.services** para discutirlo.`
    );
  }
},

{ id:'pr-influencer', kw:['pr','public relations','press release','media outreach','influencer marketing',
    'influencer campaign','brand ambassador','sponsored posts','press coverage','media relations',
    'journalist outreach','magazine feature','newspaper article','earned media',
    'relations presse','communique de presse','influenceur','marketing influenceur','rp',
    'relaciones publicas','relaciones con medios','influencer','prensa','notas de prensa'],
  r:() => { ctx.lastEntry='pr-influencer';
    return t(
      `PR, press releases, and influencer marketing aren't services we offer. Our focus is paid digital media — where results are measurable, trackable, and controllable — rather than earned media or influencer outreach.\n\nEmail **contact@zoomy.services** if you want to discuss how paid media fits into your broader marketing mix.`,
      `Les relations presse et le marketing d'influence ne font pas partie de nos services. Notre focus est les médias payants digitaux où les résultats sont mesurables.\n\nÉcrivez à **contact@zoomy.services** pour discuter de votre stratégie marketing globale.`,
      `Las relaciones públicas y el marketing de influencers no son servicios que ofrecemos. Nuestro enfoque son los medios digitales de pago donde los resultados son medibles.\n\nEscribe a **contact@zoomy.services** para discutir tu estrategia de marketing.`
    );
  }
},

{ id:'request-service', kw:['do you do','can you do','do you offer','can you make','can you build',
    'do you provide','do you handle','can you help with','do you work with','what about',
    'request a service','new service','custom request','something else','other services',
    'faites vous','proposez vous','pouvez vous faire','travaillez vous sur','autre chose',
    'hacen','pueden hacer','ofrecen','trabajan con','algo mas','otros servicios'],
  r:() => { ctx.lastEntry='request-service';
    return t(
      `Here's what we do:\n\n• **Paid campaigns** — Meta, Google, TikTok, LinkedIn\n• **Custom websites** — booking platforms, e-commerce, multilingual\n• **AI chatbots** — custom-trained, self-hosted, multilingual\n• **AI phone agents** — live call handling, booking, outbound\n• **SEO** — built into every website build\n• **Analytics & tracking** — GA4, Meta Pixel, GTM\n• **Email marketing & automation** — Zapier, Make, n8n\n\nIf you're asking about something not on the list, email **contact@zoomy.services** — we'll tell you whether we can do it or point you in the right direction.`,
      `Voici ce que nous faisons :\n\n• **Campagnes payantes** — Meta, Google, TikTok, LinkedIn\n• **Sites web sur-mesure** — plateformes de réservation, e-commerce, multilingue\n• **Chatbots IA** — entraînés sur-mesure, auto-hébergés, multilingues\n• **Agents téléphoniques IA** — gestion d'appels, réservations\n• **SEO, Analytics, Automatisation**\n\nÉcrivez à **contact@zoomy.services** pour tout le reste.`,
      `Esto es lo que hacemos:\n\n• **Campañas de pago** — Meta, Google, TikTok, LinkedIn\n• **Sitios web personalizados** — plataformas de reservas, e-commerce, multilingüe\n• **Chatbots IA** — entrenados a medida, auto-alojados\n• **Agentes telefónicos IA** — gestión de llamadas, reservas\n• **SEO, Analytics, Automatización**\n\nEscribe a **contact@zoomy.services** para cualquier otra cosa.`
    );
  }
},


/* ───── FALLBACK ───── */
{ id:'fallback', kw:[''],
  r:() => {
    ctx.lastEntry = 'fallback';
    return vary('fallback') || t(
      'fallback_unused',
      'fallback_unused_fr',
      'fallback_unused_es'
    );
    const suggestions = t(
      ['_"How do Meta Ads work?"_', '_"What does a website cost?"_', '_"How does the phone agent handle bookings?"_'],
      ['_"Comment fonctionnent les Meta Ads ?"_', '_"Que comprend un site web ?"_', '_"Comment l\'agent téléphonique gère-t-il les réservations ?"_'],
      ['_"¿Cómo funcionan los Meta Ads?"_', '_"¿Qué incluye un sitio web?"_', '_"¿Cómo gestiona el agente telefónico las reservas?"_']
    );
    return t(
      `I didn't quite catch that. Try asking me:\n\n• ${suggestions[0]}\n• ${suggestions[1]}\n• ${suggestions[2]}\n\nOr email us directly: **${BIZ.email}**`,
      `Je n'ai pas bien saisi. Essayez de me demander :\n\n• ${suggestions[0]}\n• ${suggestions[1]}\n• ${suggestions[2]}\n\nOu écrivez-nous directement : **${BIZ.email}**`,
      `No entendí bien. Intenta preguntarme:\n\n• ${suggestions[0]}\n• ${suggestions[1]}\n• ${suggestions[2]}\n\nO escríbenos directamente: **${BIZ.email}**`
    );
  }
},

]; /* end KB */

/* ── FOLLOW_UP handlers ─────────────────────────────────────────── */
const FOLLOW_UP = {

  'campaigns': (n) => {
    if (anyKw(n, ['which','best','recommend','should i','start with','pick'])) {
      return t(
        `For most businesses starting with paid media, **Meta Ads** is the best starting point — largest audience, most targeting options, and lower CPCs than Google for brand awareness.\n\nIf you have a specific search intent (people actively looking for your product), **Google Search** pairs well with Meta.\n\nLinkedIn only makes sense for B2B with a clear job-title audience. TikTok for brands targeting under-35s with strong visual content.\n\nWhat's your product and target audience?`,
        `Pour la plupart des entreprises qui démarrent avec la publicité payante, **Meta Ads** est le meilleur point de départ — plus grande audience, le plus d'options de ciblage, et CPC plus bas que Google pour la notoriété.\n\nQuel est votre produit et votre audience cible ?`,
        `Para la mayoría de negocios que empiezan con publicidad digital, **Meta Ads** es el mejor punto de partida — mayor audiencia, más opciones de targeting, y CPCs más bajos que Google para notoriedad de marca.\n\n¿Cuál es tu producto y audiencia objetivo?`
      );
    }
    if (anyKw(n, ['both','all','multiple','more than one','combination','several platforms'])) {
      return t(
        `We can manage campaigns across multiple platforms simultaneously. The most common combo:\n• **Meta + Google** — Meta for awareness + retargeting, Google for capturing search intent\n• **Meta + TikTok** — for consumer brands with strong visual content\n• **Meta + LinkedIn** — for B2B brands that also sell B2C\n\nEach additional platform has a separate setup fee and is added to the monthly management. We recommend starting with one platform, proving ROI, then expanding.`,
        `Nous pouvons gérer des campagnes sur plusieurs plateformes simultanément. La combinaison la plus courante : **Meta + Google** — Meta pour la notoriété et le retargeting, Google pour capturer l'intention de recherche. Nous recommandons de commencer par une plateforme, prouver le ROI, puis étendre.`,
        `Podemos gestionar campañas en múltiples plataformas simultáneamente. La combinación más común: **Meta + Google** — Meta para notoriedad y retargeting, Google para capturar intención de búsqueda. Recomendamos empezar con una plataforma, probar el ROI, luego expandir.`
      );
    }
    return null;
  },

  'meta-ads': (n) => {
    if (anyKw(n, ['how much','price','cost','fee','what does it cost'])) {
      return t(
        `**Campaign pricing** has three components:\n\n**1. Setup fee** (one-time) — campaign structure, audiences, ad copy, pixel & tracking setup. Starting from **$400**.\n\n**2. Monthly management fee** — monitoring, optimisation, bid strategy, reporting. Based on ad spend level.\n\n**3. Media editing** _(optional add-on)_ — if you have raw footage or images you'd like edited into ad-ready creatives:\n• **$75 per asset** — cuts, captions, resizing, basic motion graphics\n• **$250/month** — up to 5 assets/month (best value for ongoing campaigns)\n\nAd spend goes directly to your ad account — we never touch it.\n\nEmail **${BIZ.email}** for an exact quote.`,
        `**Tarification campagne** — trois composantes :\n\n**1. Frais de mise en place** (unique) — structure, audiences, copy, pixel, tracking. À partir de **400$**.\n\n**2. Honoraires de gestion mensuelle** — suivi, optimisation, reporting.\n\n**3. Montage médias** _(option)_ — si vous avez des vidéos ou images brutes à transformer en créatifs pub :\n• **75$ par asset** — montage, sous-titres, recadrage\n• **250$/mois** — jusqu'à 5 assets/mois\n\nÉcrivez à **${BIZ.email}** pour un devis.`,
        `**Pricing de campaña** — tres componentes:\n\n**1. Tarifa de configuración** (única) — estructura, audiencias, copy, pixel, tracking. Desde **$400**.\n\n**2. Tarifa de gestión mensual** — monitorización, optimización, informes.\n\n**3. Edición de medios** _(opcional)_ — si tienes material en bruto para convertir en creatividades:\n• **$75 por asset** — cortes, subtítulos, redimensionado\n• **$250/mes** — hasta 5 assets/mes\n\nEscribe a **${BIZ.email}** para un presupuesto.`
      );
    }
    if (anyKw(n, ['roas','return','roi','results','performance','what results'])) {
      return t(
        `ROAS (Return on Ad Spend) varies heavily by industry, product margin, and targeting quality. Realistic benchmarks:\n\n• **E-commerce** — 3–6x ROAS in the first 90 days, improving as the pixel gets data\n• **Lead generation** — CPL varies by industry; a realistic first-month CPL is 2–4x your eventual optimised CPL\n• **Brand awareness** — CPM $5–$25 depending on audience and creative\n\nThe most common reason for poor Meta performance: bad creative (not the targeting). The ad has to stop the scroll in the first 2 seconds.\n\nWe address this in the creative brief — specific hook, format, and messaging direction per audience.`,
        `Le ROAS varie beaucoup selon le secteur, la marge produit et la qualité du ciblage. Benchmarks réalistes pour l'e-commerce : 3–6x ROAS dans les premiers 90 jours.\n\nLa raison la plus courante de mauvaises performances Meta : le créatif (pas le ciblage). L'annonce doit arrêter le scroll dans les 2 premières secondes.`,
        `El ROAS varía mucho según la industria, el margen del producto y la calidad del targeting. Benchmarks realistas para e-commerce: 3–6x ROAS en los primeros 90 días.\n\nLa razón más común de mal rendimiento en Meta: el creativo (no el targeting). El anuncio tiene que detener el scroll en los primeros 2 segundos.`
      );
    }
    return null;
  },

  'websites': (n) => {
    if (anyKw(n, ['how much','price','cost','quote','fee','what does it cost'])) {
      return t(
        `Website pricing depends on the scope. We price per page and then add feature costs:\n\n• **Standard content page** — from $200\n• **Complex page** (home, heavily animated) — $300–400\n• **Functional page** (booking flow, checkout) — $400–600\n• **Booking system** — $600\n• **Admin panel** — $400\n• **Payment integration** — $300\n• **Each extra language** — $200\n• **Domain & hosting** — $100 one-time\n\nA typical 6-page restaurant site in 2 languages with a reservation form: $1,800–$2,500.\n\nFor an exact quote, email **${BIZ.email}** with your page list and features.`,
        `Le prix des sites web dépend du périmètre. Tarification par page plus coûts de fonctionnalités :\n\n• **Page de contenu standard** — à partir de 200$\n• **Page complexe** — 300–400$\n• **Page fonctionnelle** (réservation, checkout) — 400–600$\n• **Système de réservation** — 600$\n• **Panneau admin** — 400$\n• **Chaque langue supplémentaire** — 200$\n\nPour un devis exact, écrivez à **${BIZ.email}**.`,
        `El precio de los sitios web depende del alcance. Tarificación por página más costes de funcionalidades:\n\n• **Página de contenido estándar** — desde $200\n• **Página compleja** — $300–400\n• **Página funcional** (reservas, checkout) — $400–600\n• **Sistema de reservas** — $600\n• **Panel de administración** — $400\n• **Cada idioma adicional** — $200\n\nPara un presupuesto exacto, escribe a **${BIZ.email}**.`
      );
    }
    if (anyKw(n, ['example','examples','portfolio','work','show me','can i see'])) {
      return t(
        `We don't publish client work publicly to protect their privacy. But we can describe what we've built:\n\n• A **60-page multilingual booking platform** across 5 languages for an indoor activity venue — with real-time slot availability, Stripe payments, MFA admin panel, and AI chatbot\n• A **luxury e-commerce store** with Stripe payments and product filtering\n• A **restaurant site** with online reservation system, full menu, and Google Maps integration in multiple languages\n\nIf you want to see the quality of our code and design, we can share a demo or discuss your specific type of site. Email **${BIZ.email}**.`,
        `Nous ne publions pas les travaux clients publiquement pour protéger leur confidentialité. Mais nous pouvons décrire ce que nous avons construit :\n\n• Une **plateforme de réservation multilingue de 60 pages** sur 5 langues pour un lieu d'activité\n• Une **boutique e-commerce de luxe** avec paiements Stripe\n• Un **site de restaurant** avec système de réservation en ligne\n\nSi vous souhaitez voir la qualité de notre code et design, contactez-nous à **${BIZ.email}**.`,
        `No publicamos el trabajo de los clientes públicamente para proteger su privacidad. Pero podemos describir lo que hemos construido:\n\n• Una **plataforma de reservas multilingüe de 60 páginas** en 5 idiomas para un local de actividades\n• Una **tienda e-commerce de lujo** con pagos Stripe\n• Un **sitio de restaurante** con sistema de reservas online\n\nSi quieres ver la calidad de nuestro código y diseño, contáctanos en **${BIZ.email}**.`
      );
    }
    return null;
  },

  'phoneagent': (n) => {
    if (anyKw(n, ['how much','cost','price','fee','what does it cost','pricing'])) {
      return t(
        `AI phone agent pricing has two components:\n\n**1. Build fee** (one-time)\n• Standard (FAQ + availability) — from $600\n• With calendar booking integration — $1,000–$1,500\n• With custom CRM/webhook integrations — $1,500–$2,500\n\n**2. Monthly operational cost**\n• ElevenLabs call minutes (billed at provider rate) + our management margin\n• Estimate: $3–$8 per call depending on call length\n• We pass through the exact cost + 40%, minimum $60/month\n\nFor a business handling 100 calls/month, typical monthly cost: $80–$150.\n\nEmail **${BIZ.email}** for a specific quote.`,
        `La tarification de l'agent téléphonique IA a deux composantes :\n\n**1. Frais de construction** (unique)\n• Standard — à partir de 600$\n• Avec intégration calendrier — 1 000–1 500$\n• Avec intégrations webhook personnalisées — 1 500–2 500$\n\n**2. Coût mensuel d'exploitation**\n• Minutes d'appel ElevenLabs + notre marge de gestion\n• Estimation : 3–8$ par appel selon la durée\n\nÉcrivez à **${BIZ.email}** pour un devis précis.`,
        `El precio del agente telefónico IA tiene dos componentes:\n\n**1. Tarifa de construcción** (única)\n• Estándar — desde $600\n• Con integración de calendario — $1.000–$1.500\n• Con integraciones webhook personalizadas — $1.500–$2.500\n\n**2. Coste operativo mensual**\n• Minutos de llamada ElevenLabs + nuestra margen de gestión\n• Estimación: $3–$8 por llamada según duración\n\nEscribe a **${BIZ.email}** para un presupuesto específico.`
      );
    }
    if (anyKw(n, ['try','demo','test','hear','listen','sample','example call'])) {
      return t(
        `You can test a live demo of our phone agent right now! 🎙️\n\nGo to **${BIZ.url}/phone-agent.html** and click "Test the Agent" — no phone required, it runs directly in your browser. Ask it anything about Zoomy's services, request a booking, or try switching languages mid-conversation.`,
        `Vous pouvez tester une démo en direct de notre agent téléphonique maintenant ! 🎙️\n\nAllez sur **${BIZ.url}/phone-agent.html** et cliquez sur "Test de l'Agent" — sans téléphone, ça fonctionne directement dans votre navigateur.`,
        `¡Puedes probar una demo en vivo de nuestro agente telefónico ahora mismo! 🎙️\n\nVe a **${BIZ.url}/phone-agent.html** y haz clic en "Test the Agent" — sin teléfono, funciona directamente en tu navegador.`
      );
    }
    return null;
  },

  'chatbot': (n) => {
    if (anyKw(n, ['how much','cost','price','fee','pricing'])) {
      return t(
        `Chatbot pricing:\n\n• **Standard** (1–2 languages, up to ~30 topics) — **$500**\n• **Complex** (multilingual, 50+ topics, booking/lead capture) — **$1,000–$1,500**\n• **Monthly hosting** (self-hosted) — **$50/month** for maintenance\n• **API-based** — pass-through cost + 50%, minimum $40/month\n\nAs an add-on to a website build, the chatbot is discounted to **$400**.\n\nEmail **${BIZ.email}** for an exact quote based on your business complexity.`,
        `Tarification du chatbot :\n\n• **Standard** (1–2 langues, ~30 sujets) — **500$**\n• **Complexe** (multilingue, 50+ sujets, réservation/leads) — **1 000–1 500$**\n• **Hébergement mensuel** — **50$/mois**\n• En complément d'un site : **400$**\n\nÉcrivez à **${BIZ.email}** pour un devis selon la complexité de votre entreprise.`,
        `Precios del chatbot:\n\n• **Estándar** (1–2 idiomas, ~30 temas) — **$500**\n• **Complejo** (multilingüe, 50+ temas, reservas/leads) — **$1.000–$1.500**\n• **Hosting mensual** — **$50/mes**\n• Como complemento de un sitio web: **$400**\n\nEscribe a **${BIZ.email}** para un presupuesto según la complejidad de tu negocio.`
      );
    }
    return null;
  },

  'quote': (n) => {
    if (anyKw(n, ['campaign','meta','google','ads','advertising'])) {
      return t(
        `For a campaign quote, email **${BIZ.email}** and include:\n• Which platform(s) — Meta, Google, TikTok, LinkedIn\n• Your monthly ad budget\n• What you're promoting\n• Your target audience\n• Whether you need media editing (we can edit your raw footage/images into ad creatives — $75/asset or $250/month for up to 5)\n\nWe'll come back with a scope and fixed management fee within 24 hours.`,
        `Pour un devis campagne, écrivez à **${BIZ.email}** en incluant :\n• Quelle(s) plateforme(s)\n• Votre budget publicitaire mensuel\n• Ce que vous promouvez\n• Votre audience cible`,
        `Para un presupuesto de campaña, escribe a **${BIZ.email}** e incluye:\n• Qué plataforma(s)\n• Tu presupuesto publicitario mensual\n• Qué estás promocionando\n• Tu audiencia objetivo`
      );
    }
    if (anyKw(n, ['website','site','landing','page','build'])) {
      return t(
        `For a website quote, email **${BIZ.email}** and include:\n• Type of site (booking, e-commerce, restaurant, etc.)\n• Number of pages roughly\n• Languages needed\n• Key features (booking system, payments, admin panel, chatbot)\n\nWe'll scope it and reply with a fixed price within 24 hours.`,
        `Pour un devis site web, écrivez à **${BIZ.email}** en incluant :\n• Type de site\n• Nombre de pages approximatif\n• Langues souhaitées\n• Fonctionnalités clés`,
        `Para un presupuesto de sitio web, escribe a **${BIZ.email}** e incluye:\n• Tipo de sitio\n• Número aproximado de páginas\n• Idiomas necesarios\n• Funcionalidades clave`
      );
    }
    return null;
  },

};

/* ── Response router ────────────────────────────────────────────── */
function getResponse(userInput) {
  memory.push('user', userInput);

  // Handle empty / punctuation-only input → show help
  const raw = norm(userInput);
  if (!raw || raw.length <= 2) {
    const help = KB.find(e => e.id === 'tellmore');
    if (help) { const r = help.r(); ctx.lastEntry = 'tellmore'; memory.push('bot', r, 'tellmore'); return r; }
  }

  // Apply fuzzy correction then synonym expansion then pronoun resolution
  let n = expandSynonyms(norm(fuzzy(userInput)));
  n = resolvePronouns(n);

  // Check follow-up before classifier (only when lastEntry is meaningful)
  if (isFollowUp(n) && ctx.lastEntry && ctx.lastEntry !== 'fallback') {
    const handler = FOLLOW_UP[ctx.lastEntry];
    if (handler) {
      const r = handler(n);
      if (r) { memory.push('bot', r, ctx.lastEntry); return r; }
    }
    const last = KB.find(e => e.id === ctx.lastEntry);
    if (last) { const r = last.r(); ctx.lastEntry = last.id; memory.push('bot', r, last.id); return r; }
  }

  // Pass 1: full fuzzy+synonym text, score-based
  let best = scoreKB(n);
  if (best && best.id !== 'fallback') {
    const r = best.r(); ctx.lastEntry = best.id; memory.push('bot', r, best.id); return r;
  }

  // Pass 2: strip fillers, retry
  const stripped = stripFillers(n);
  if (stripped && stripped !== n) {
    best = scoreKB(stripped);
    if (best && best.id !== 'fallback') {
      const r = best.r(); ctx.lastEntry = best.id; memory.push('bot', r, best.id); return r;
    }
  }

  // Pass 3: individual content words (4+ chars)
  const words = stripped.split(' ').filter(w => w.length >= 4);
  let wordBest = null, wordBestScore = 0;
  for (const word of words) {
    const e = scoreKB(word);
    if (e && e.id !== 'fallback') {
      let s = 0;
      for (const kw of e.kw) { if (kwMatch(word, kw)) { const wc = norm(kw).split(/\s+/).length; s += wc*wc; } }
      if (s > wordBestScore) { wordBestScore = s; wordBest = e; }
    }
  }
  if (wordBest) {
    const r = wordBest.r(); ctx.lastEntry = wordBest.id; memory.push('bot', r, wordBest.id); return r;
  }

  // Fallback with variation
  const fbText = vary('fallback') || t(
    'I didn\'t quite catch that. Try asking about our campaigns, websites, chatbots, or phone agents. Or email **contact@zoomy.services**.',
    'Je n\'ai pas compris. Essayez nos campagnes, sites web, chatbots ou agents téléphoniques. Ou écrivez à **contact@zoomy.services**.',
    'No entendí. Prueba con nuestras campañas, sitios web, chatbots o agentes telefónicos. O escribe a **contact@zoomy.services**.'
  );
  ctx.lastEntry = 'fallback'; memory.push('bot', fbText, 'fallback'); return fbText;
}

/* ── Markdown renderer ──────────────────────────────────────────── */
function md(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\n/g, '<br>');
}

/* ── UI ─────────────────────────────────────────────────────────── */
function render() {
  const CSS = `
#zmy-bubble{position:fixed;bottom:24px;right:24px;z-index:9999;width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#a855f7,#06b6d4);border:none;cursor:pointer;box-shadow:0 4px 24px rgba(99,102,241,.5);display:flex;align-items:center;justify-content:center;transition:transform .2s,box-shadow .2s}
#zmy-bubble:hover{transform:scale(1.08);box-shadow:0 8px 32px rgba(99,102,241,.6)}
#zmy-bubble svg{width:26px;height:26px;fill:#fff;pointer-events:none}
#zmy-attn{position:fixed;bottom:90px;right:24px;z-index:9998;background:#fff;color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;padding:10px 14px;border-radius:12px 12px 4px 12px;box-shadow:0 4px 20px rgba(0,0,0,.15);max-width:200px;line-height:1.4;animation:zmyfade .4s ease}
@keyframes zmyfade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
#zmy-win{position:fixed;bottom:90px;right:24px;z-index:9998;width:360px;max-width:calc(100vw - 32px);border-radius:20px;background:#08080f;border:1px solid rgba(99,102,241,.2);box-shadow:0 20px 60px rgba(0,0,0,.5);display:none;flex-direction:column;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
#zmy-win.open{display:flex}
#zmy-head{background:linear-gradient(135deg,#6366f1,#a855f7);padding:14px 16px;display:flex;align-items:center;gap:12px}
#zmy-avatar{width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.2);border:2px solid rgba(255,255,255,.3);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
#zmy-name{font-weight:700;font-size:.9rem;color:#fff}
#zmy-status{font-size:.7rem;color:rgba(255,255,255,.7);display:flex;align-items:center;gap:5px;margin-top:2px}
#zmy-status::before{content:'';width:6px;height:6px;border-radius:50%;background:#4ade80;flex-shrink:0;animation:zmypulse 2s infinite}
@keyframes zmypulse{0%,100%{opacity:1}50%{opacity:.4}}
#zmy-close{margin-left:auto;background:none;border:none;color:rgba(255,255,255,.7);font-size:18px;cursor:pointer;padding:4px;line-height:1;border-radius:4px}
#zmy-close:hover{color:#fff;background:rgba(255,255,255,.1)}
#zmy-msgs{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;min-height:260px;max-height:340px;background:#0d0d1c;scroll-behavior:smooth}
.zmy-msg{max-width:86%;padding:10px 14px;border-radius:14px;font-size:.85rem;line-height:1.55;word-wrap:break-word}
.zmy-msg a{color:#a5b4fc;text-decoration:underline}
.zmy-bot{background:#111128;border:1px solid rgba(99,102,241,.18);color:#cbd5e1;align-self:flex-start;border-bottom-left-radius:4px}
.zmy-user{background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff;align-self:flex-end;border-bottom-right-radius:4px}
.zmy-typing{display:flex;gap:5px;align-items:center;padding:10px 14px}
.zmy-typing span{width:7px;height:7px;border-radius:50%;background:#6366f1;animation:zmybounce 1.2s infinite ease-in-out}
.zmy-typing span:nth-child(2){animation-delay:.2s}
.zmy-typing span:nth-child(3){animation-delay:.4s}
@keyframes zmybounce{0%,80%,100%{transform:scale(.7);opacity:.5}40%{transform:scale(1);opacity:1}}
#zmy-inp-row{padding:10px 12px;border-top:1px solid rgba(99,102,241,.15);display:flex;gap:8px;background:#08080f}
#zmy-input{flex:1;background:#111128;border:1px solid rgba(99,102,241,.2);border-radius:20px;padding:9px 14px;font-size:16px;color:#f1f5f9;outline:none;font-family:inherit;resize:none;max-height:80px}
#zmy-input:focus{border-color:rgba(99,102,241,.5)}
#zmy-input::placeholder{color:#64748b}
#zmy-send{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#a855f7);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:#fff;transition:transform .15s}
#zmy-send:hover{transform:scale(1.1)}
@media(max-width:480px){#zmy-win{right:0;bottom:0;width:100vw;border-radius:20px 20px 0 0;max-height:80vh}#zmy-bubble{bottom:16px;right:16px}}
`;

  const styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  // Bubble
  const bubble = document.createElement('button');
  bubble.id = 'zmy-bubble';
  bubble.setAttribute('aria-label', t('Open chat','Ouvrir le chat','Abrir chat'));
  bubble.innerHTML = `<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>`;

  // Chat window
  const win = document.createElement('div');
  win.id = 'zmy-win';
  win.innerHTML = `
    <div id="zmy-head">
      <div id="zmy-avatar">🤖</div>
      <div>
        <div id="zmy-name">${BIZ.name}</div>
        <div id="zmy-status">${t('Online — ask me anything','En ligne — posez-moi une question','En línea — pregúntame lo que sea')}</div>
      </div>
      <button id="zmy-close" aria-label="Close">✕</button>
    </div>
    <div id="zmy-msgs"></div>
    <div id="zmy-inp-row">
      <textarea id="zmy-input" rows="1" placeholder="${t('Ask about our services...','Posez votre question...','Pregunta sobre nuestros servicios...')}"></textarea>
      <button id="zmy-send" aria-label="Send">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>
  `;

  document.body.appendChild(bubble);
  document.body.appendChild(win);

  const msgs = document.getElementById('zmy-msgs');
  const input = document.getElementById('zmy-input');
  let isOpen = false;
  let savedScrollY = 0;

  function addMsg(html, role) {
    const d = document.createElement('div');
    d.className = 'zmy-msg ' + (role === 'bot' ? 'zmy-bot' : 'zmy-user');
    d.innerHTML = html;
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
    return d;
  }

  function showTyping() {
    const d = document.createElement('div');
    d.className = 'zmy-msg zmy-bot zmy-typing';
    d.innerHTML = '<span></span><span></span><span></span>';
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
    return d;
  }

  function send() {
    const text = input.value.trim();
    if (!text) return;
    addMsg(text, 'user');
    input.value = '';
    input.style.height = 'auto';
    const typing = showTyping();
    setTimeout(() => {
      typing.remove();
      const resp = getResponse(text);
      addMsg(md(resp), 'bot');
    }, 600 + Math.random() * 500);
  }

  function dismissAttn() {
    const a = document.getElementById('zmy-attn');
    if (a) a.remove();
  }

  function openChat() {
    if (isOpen) return;
    isOpen = true;
    dismissAttn();
    savedScrollY = window.scrollY;
    win.classList.add('open');
    bubble.innerHTML = `<svg viewBox="0 0 24 24" fill="#fff"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;
    if (msgs.children.length === 0) {
      addMsg(md(getResponse('hello')), 'bot');
    }
    setTimeout(() => input.focus(), 300);
  }

  function closeChat() {
    isOpen = false;
    win.classList.remove('open');
    bubble.innerHTML = `<svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>`;
  }

  bubble.addEventListener('click', () => isOpen ? closeChat() : openChat());
  document.getElementById('zmy-close').addEventListener('click', closeChat);
  document.getElementById('zmy-send').addEventListener('click', send);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  });
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 80) + 'px';
  });

  // Attention bubble — shown once ever (persists across pages via localStorage)
  setTimeout(() => {
    if (isOpen) return;
    if (localStorage.getItem('zmy_popup_seen')) return;
    localStorage.setItem('zmy_popup_seen', '1');
    const attn = document.createElement('div');
    attn.id = 'zmy-attn';
    attn.textContent = t('Have a question? Ask me! 💬','Une question ? Demandez-moi ! 💬','¿Tienes una pregunta? ¡Pregúntame! 💬');
    document.body.appendChild(attn);
    attn.addEventListener('click', openChat);
    setTimeout(() => { if (document.getElementById('zmy-attn')) attn.remove(); }, 8000);
  }, 2500);

  // Mobile viewport fix
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', () => {
      if (!isOpen) return;
      msgs.style.maxHeight = Math.max(120, window.visualViewport.height - 200) + 'px';
      msgs.scrollTop = msgs.scrollHeight;
    });
  }
}

// render() disabled for testing

/* Export for test runner */
if (typeof module !== 'undefined') {
  module.exports = { getResponse, KB, norm, anyKw, kwMatch, expandSynonyms, fuzzy, scoreKB };
}
/* Export for test runner */
if (typeof module !== 'undefined') {
  module.exports = { getResponse, KB, norm, anyKw, kwMatch, expandSynonyms, fuzzy, scoreKB };
}
// window export disabled for testing

})(); /* end IIFE */