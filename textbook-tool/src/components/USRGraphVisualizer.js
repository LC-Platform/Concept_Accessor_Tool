import React, { useState, useMemo, useCallback } from 'react';

// ─── Relation → display label ─────────────────────────────────────────────────
const EDGE_LABELS = {
  k1:"Who / What", k1s:"Who / What", k1u:"Who / What",
  pk1:"Who / What", jk1:"Who / What", mk1:"Who / What",
  k2:"Whom / What", k2s:"Whom / What", k2u:"Whom / What", k2g:"Whom / What",
  k4:"To whom", k4a:"To whom",
  k3:"With what", k3a:"With what",
  k5:"From where", k5prk:"From where",
  k2p:"To where", k7p:"Where", k7a:"Where",
  k7t:"When", k7:"When/Where", rkl:"During",
  krvn:"How",
  rh:"Why", rt:"Purpose",
  rv:"Compared to", ru:"Like what", ras:"Like what",
  r6:"of", r6v:"of", r6n:"of",
  rprop:"proportinate to",
  re:"includes", rs:"related to", rbks:"because of", rvks:"because of",
  mod:"describes", dem:"which",
  quant:"How many", card:"How many",
  kriyamula:"", verbalizer:"", neg:"not",
  op1:"", op2:"", op3:"", op4:"", op5:"", op6:"", op7:"", op8:"",
  main:"", begin:"", start:"", end:"", pof:"", pofinv:"",
  viroxi_xyowaka:"contrast",
};

const TAM_MAPPING = {
  yA_WA_2:"had", nA_cAhie_4:"must", nA_hE_1:"have to", past:"was",
  yA_1:"", "0_gayA_1":"went", "0_xiyA_1":"gave", "0_sakA_1":"could",
  yA_WA_1:"", yA_hE_2:"is being", wA_hE_1:"is", pres:"is",
  wA_WA_1:"used to", gA_2:"would", o_1:"should", o_2:"must",
  nA_hE_2:"have to", nA_hogA_1:"must", nA_cAhie_1:"should", gA_1:"will",
  yA_gayA_1:"got", yA_hE_1:"was", aw_1:"is", awi_4:"are",
  a_1:"has", wA_1:"will", syaw_1:"", syawi_1:"", awu_1:"", ew_1:"should", AI_xI_1:"",
};

const HELPER_VERBS   = new Set(["do","kara","ka"]);
const BRACKET_LABELS = { involve:"involving", cause:"causing", result:"resulting", purpose:"purpose", reason:"reason" };
const NUMBER_WORDS   = new Set([
  "one","two","three","four","five","six","seven","eight","nine","ten",
  "eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen",
  "twenty","thirty","forty","fifty","sixty","seventy","eighty","ninety","hundred","thousand","million","billion",
]);

const ARC_COLORS = {
  "Who / What":"#2563eb", "Who":"#2563eb",
  "Whom / What":"#059669", "What":"#059669",
  "To whom":"#0891b2", "With what":"#7c3aed",
  "From where":"#dc2626", "Where":"#dc2626",
  "To where":"#ef4444", "When":"#d97706", "When/Where":"#d97706",
  "How":"#7c3aed", "Why":"#0891b2", "Purpose":"#0891b2",
  "describes":"#94a3b8", "not":"#be123c", "of":"#64748b",
  "includes":"#059669", "related to":"#6366f1", "During":"#d97706",
  "because of":"#0891b2", "How many":"#64748b", "contrast":"#f97316",
  "coref":"#a855f7",
};
const getArcColor = lbl => ARC_COLORS[lbl] ?? "#6366f1";

const REL_TO_ROLE = {
  k1:"subject", k2:"object", k7t:"time", k7p:"place",
  krvn:"manner", rt:"purpose", rh:"purpose", k3:"manner",
  neg:"negation", mod:"modifier", dem:"modifier",
};
const NODE_THEME = {
  root:     "#1e40af",
  subject:  "#1e40af",
  object:   "#065f46",
  time:     "#92400e",
  place:    "#991b1b",
  manner:   "#5b21b6",
  purpose:  "#164e63",
  negation: "#9f1239",
  modifier: "#475569",
  default:  "#475569",
};
const getNodeColor = (parentRel, isRoot) => {
  if (isRoot) return NODE_THEME.root;
  const role = REL_TO_ROLE[normRel(parentRel)];
  return role ? NODE_THEME[role] : NODE_THEME.default;
};

const MODIFIER_AUTO_RELS = new Set([
  "mod","dem","re","quant","card","ord","r6","r6v","r6n",
]);

const KARAK_INITIAL_RELS = new Set([
  "k1","k1s","k1u","pk1","jk1","mk1",
  "k2","k2s","k2u","k2g",
  "k4","k4a","k3","k3a","k5","k5prk",
  "k2p","k7p","k7a","k7t","k7",
  "neg","main","krvn","krvnu","krvnp",
]);

// ─── Layout constants ─────────────────────────────────────────────────────────
const WORD_FONT  = 15;
const WORD_PAD   = 24;
const MIN_COL_W  = 64;
const SVG_PAD    = 28;
const LBL_FONT   = 10.5;
const LBL_H      = 15;
const ARC_BASE_H = 28;
const ARC_TIER_H = 28;

// ─── NE grouping gap constant ─────────────────────────────────────────────────
const NE_GROUP_GAP = 10;

// ─── Utilities ────────────────────────────────────────────────────────────────
const normRel = s => (s || "").toLowerCase();

const getEdgeLabel = (rel, isAnimate = false) => {
  if (!rel) return "";
  const r = normRel(rel);
  if (r.startsWith("k1")) return isAnimate ? "Who" : "What";
  if (r.startsWith("k2")) return isAnimate ? "Whom" : "What";
  if (r in EDGE_LABELS) return EDGE_LABELS[r];
  for (let len = r.length - 1; len >= 1; len--) {
    const pfx = r.slice(0, len);
    if (pfx in EDGE_LABELS) return EDGE_LABELS[pfx];
  }
  return "";
};

const IRREG = {
  go:["went","gone"], eat:["ate","eaten"], have:["had"], give:["gave","given"],
  take:["took","taken"], come:["came"], see:["saw","seen"], know:["knew","known"],
  get:["got","gotten"], make:["made"], say:["said"], tell:["told"],
  think:["thought"], feel:["felt"], keep:["kept"], run:["ran"],
  bring:["brought"], buy:["bought"], catch:["caught"], find:["found"],
  leave:["left"], meet:["met"], send:["sent"], sit:["sat"], stand:["stood"],
  win:["won"], write:["wrote","written"], speak:["spoke","spoken"],
  break:["broke","broken"], do:["did","done"],
  be:["was","were","been","is","are","am"], read:["read"], cut:["cut"], put:["put"],
};
const FORM_TO_BASE = {};
Object.entries(IRREG).forEach(([b, fs]) => fs.forEach(f => { FORM_TO_BASE[f] = b; }));

const stem = w => {
  const s = w.toLowerCase();
  if (s.length < 4) return s;
  if (s.endsWith("ing") && s.length > 5) return s.slice(0, -3);
  if (s.endsWith("ied") && s.length > 4) return s.slice(0, -3) + "y";
  if (s.endsWith("ed")  && s.length > 4) return s.slice(0, -2);
  if (s.endsWith("es")  && s.length > 4) return s.slice(0, -2);
  if (s.endsWith("s")   && s.length > 3) return s.slice(0, -1);
  return s;
};

const lev = (a, b) => {
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 3) return 99;
  const p = Array.from({ length: n + 1 }, (_, i) => i), c = new Array(n + 1);
  for (let i = 1; i <= m; i++) {
    c[0] = i;
    for (let j = 1; j <= n; j++)
      c[j] = a[i-1] === b[j-1] ? p[j-1] : 1 + Math.min(p[j], c[j-1], p[j-1]);
    p.splice(0, n + 1, ...c);
  }
  return p[n];
};

const matchSent = (word, tokens) => {
  if (!word || !tokens.length) return word;
  const lo = word.toLowerCase();
  if (tokens.includes(lo)) return lo;
  for (const s of ["s","es","ed","d","ing","er","est","ly","ied","ies"])
    if (tokens.includes(lo + s)) return lo + s;
  for (const f of (IRREG[lo] || []))
    if (tokens.includes(f)) return f;
  const base = FORM_TO_BASE[lo];
  if (base) {
    if (tokens.includes(base)) return base;
    for (const s of ["s","es","ed","d","ing","er","est"])
      if (tokens.includes(base + s)) return base + s;
  }
  const ws = stem(lo);
  if (ws !== lo) {
    if (tokens.includes(ws)) return ws;
    for (const s of ["s","es","ed","d","ing","er","est","ied","ies"])
      if (tokens.includes(ws + s)) return ws + s;
  }
  if (lo.length >= 5) {
    let best = null, bd = 3;
    for (const t of tokens) {
      if (t.length < 3) continue;
      const d = lev(lo, t);
      if (d < bd) { bd = d; best = t; }
    }
    if (best) return best;
  }
  return word;
};

const extractEng = raw => {
  const m = raw.match(/\(([^)]+)\)/);
  if (m && m[1]) return m[1].replace(/[0-9]/g, "").replace(/_/g, " ").trim().toLowerCase();
  return raw.split("_")[0].replace(/[0-9()]/g, "").split("-")[0].toLowerCase();
};

const getTam = raw => {
  const norm = raw.replace(/-([a-zA-Z])/g, "_$1");
  for (const k in TAM_MAPPING) {
    if (norm.includes(`_${k}`)) { const v = TAM_MAPPING[k]; return v ? ` [${v}]` : ""; }
  }
  return "";
};

const isCopula = raw => /copula/i.test(raw) || /^\s*state\s*$/.test(extractEng(raw));

const extractLabel = raw => {
  if (isCopula(raw)) {
    const norm = raw.replace(/-([a-zA-Z])/g, "_$1");
    for (const k in TAM_MAPPING) {
      if (norm.includes(`_${k}`)) { const v = TAM_MAPPING[k]; if (v) return v; }
    }
    return "is";
  }
  return extractEng(raw);
};

const hasIngForm = (rawWord) => {
  const lo = rawWord.toLowerCase();
  if (lo.includes("ing")) return true;
  const eng = extractEng(rawWord);
  return eng.endsWith("ing");
};

// ─── Index mapping builder ────────────────────────────────────────────────────
const buildIndexMapping = (realWords, metadataRows) => {
  const map = {};
  realWords.forEach(r => { map[r.index] = extractEng(r.word); });
  metadataRows.forEach(row => {
    if (row.word.startsWith("[conj")) { map[row.index] = "and"; return; }
    const bt = row.word.match(/^\[([a-zA-Z]+)/)?.[1]?.toLowerCase();
    if (bt === "ne") {
      const refs = realWords.filter(rw => rw.lastColumn.split(":")[0] === String(row.index));
      const bw = refs.find(w => normRel(w.lastColumn).includes("begin")) || refs[0];
      if (bw) map[row.index] = extractEng(bw.word);
      return;
    }
    if (bt && bt !== "cp") { map[row.index] = BRACKET_LABELS[bt] ?? bt; return; }
    const refs = realWords.filter(rw => rw.lastColumn.split(":")[0] === String(row.index));
    if (!refs.length) return;
    let chosen = null;
    for (const p of ["kriyamula","verbalizer","begin"]) {
      const c = refs.find(w => normRel(w.lastColumn).includes(p));
      if (c) { chosen = c; break; }
    }
    if (!chosen) chosen = refs[0];
    const eng = extractEng(chosen.word);
    if (!HELPER_VERBS.has(eng.toLowerCase())) {
      map[row.index] = eng;
    } else {
      const nh = refs.find(w => !HELPER_VERBS.has(extractEng(w.word).toLowerCase()));
      map[row.index] = nh ? extractEng(nh.word) : eng;
    }
  });
  return map;
};

// ─── USR Parser ───────────────────────────────────────────────────────────────
export const parseSegment = segText => {
  if (!segText || !segText.trim())
    return { nodes:{}, edges:[], rootId:null, childrenOf:{}, corefLinks:[], englishSentence:"" };

  const allLines = segText.split(/\r?\n/);
  const hashLines = allLines.filter(l => l.startsWith("#"));
  const englishSentence = hashLines.length >= 3 ? hashLines[2].replace(/^#/, "").trim() : "";
  const sentenceWords = englishSentence.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(Boolean);
  
  const tokenPositions = {};
  sentenceWords.forEach((w, i) => {
    if (!tokenPositions[w]) tokenPositions[w] = [];
    tokenPositions[w].push(i);
  });

  const lines = allLines.filter(l => l.trim() && !l.startsWith("<") && !l.startsWith("#") && !l.startsWith("%"));

  const corefLinks = [];
  const findRel = toks => {
    for (const t of toks) { const [a, b] = t.split(":"); if (b && !isNaN(a)) return t; }
    return null;
  };

  lines.forEach(line => {
    const toks = line.split(/\s+/);
    toks.forEach(t => {
      if (t.includes(":coref")) {
        const ref = t.replace(":coref", ""); const di = ref.lastIndexOf(".");
        if (di !== -1) corefLinks.push({ type:"coref", fromLocalIndex:toks[1], toSegId:ref.slice(0,di), toNodeIndex:ref.slice(di+1) });
      }
      if (t.includes(".") && t.includes(":") && !t.includes(":coref")) {
        const ci = t.lastIndexOf(":"), ref = t.slice(0,ci), rel = t.slice(ci+1), di = ref.lastIndexOf(".");
        if (di !== -1) {
          const segId = ref.slice(0,di), nodeIdx = ref.slice(di+1);
          if (segId.includes("_")) corefLinks.push({ type:"cross", fromLocalIndex:toks[1], toSegId:segId, toNodeIndex:nodeIdx, relName:rel });
        }
      }
    });
  });

  const realWords = [], metadataRows = []; let rawRootId = null;
  lines.forEach(line => {
    const toks = line.split(/\s+/); if (toks.length < 2) return;
    const word = toks[0], index = toks[1];
    const rel = findRel(toks); if (!index || !rel) return;
    if (rel.split(":")[0] === "0") rawRootId = index;
    const animacy = (toks[2] || "-").toLowerCase().trim();
    const speakerView = (toks[6] || "").toLowerCase().trim();
    if (word.startsWith("[")) metadataRows.push({ word, index, lastColumn:rel, animacy, speakerView });
    else realWords.push({ word:word.replace(/^\$/, ""), index, lastColumn:rel, animacy, speakerView });
  });

  if (!rawRootId) return { nodes:{}, edges:[], rootId:null, childrenOf:{}, corefLinks, englishSentence };

  const indexMapping = buildIndexMapping(realWords, metadataRows);
  let rootId = rawRootId;
  const rootRow = metadataRows.find(r => r.index === rawRootId);
  if (rootRow) {
    const children = realWords.filter(rw => rw.lastColumn.split(":")[0] === String(rawRootId));
    const sc = children.find(rw => { const r = normRel(rw.lastColumn.split(":")[1]); return r !== "verbalizer" && !r.startsWith("k"); });
    if (sc) rootId = sc.index;
  }
  const cpRemapped = rootId !== rawRootId;

  const absorbedIndices = new Set(), absorbedBy = {};
  metadataRows.forEach(mrow => {
    realWords.filter(rw => rw.lastColumn.split(":")[0] === String(mrow.index)).forEach(rw => {
      const r = normRel(rw.lastColumn.split(":")[1] || "");
      if (["kriyamula","verbalizer","begin","card"].includes(r)) {
        absorbedIndices.add(rw.index);
        absorbedBy[rw.index] = mrow.index;
      }
    });
  });

  const childRelMap = {};
  [...realWords, ...metadataRows].forEach(row => {
    const [head, rawRel] = row.lastColumn.split(":");
    if (head && head !== "0") childRelMap[row.index] = normRel(rawRel);
  });

  const STRUCTURAL = new Set(["start","end","op1","op2","op3","op4","op5","op6","op7","op8"]);
  const spanRemap = {}, spanEdgeLbl = {};
  metadataRows.filter(r => /^\[span/i.test(r.word)).forEach(sr => {
    const [head, sRel] = sr.lastColumn.split(":");
    if (head && head !== "0") { spanRemap[sr.index] = head; spanEdgeLbl[sr.index] = getEdgeLabel(normRel(sRel)); }
  });

  const resolveFrom = id => {
    let cur = id, vis = new Set();
    while (!vis.has(cur)) {
      vis.add(cur);
      if (spanRemap[cur]) { cur = spanRemap[cur]; continue; }
      if (absorbedBy[cur]) { cur = absorbedBy[cur]; continue; }
      break;
    }
    return (cpRemapped && cur === rawRootId) ? rootId : cur;
  };
  const resolveEdgeLbl = (headId, childRel, childLabel) => {
    if (spanRemap[headId] !== undefined && STRUCTURAL.has(childRel) && spanEdgeLbl[headId]) return spanEdgeLbl[headId];
    return childLabel;
  };

  const nodes = {}, rawEdges = [], edgeIds = new Set();
  const addEdge = (fromRaw, to, label, isNeg) => {
    const from = resolveFrom(fromRaw);
    if (!from || !to || from === to) return;
    const eid = `e${from}-${to}`;
    if (edgeIds.has(eid)) return;
    edgeIds.add(eid);
    rawEdges.push({ id:eid, from, to, label:label??"", isNeg });
  };

  const nodeRawWord = {};

  const getStrictSentIndex = (label, rawWord) => {
    const cleanLabel = label.toLowerCase().replace(/\[.*?\]/g, "").trim();
    const cleanRaw = extractEng(rawWord).toLowerCase();
    
    if (tokenPositions[cleanRaw]) {
      return tokenPositions[cleanRaw][0];
    }
    
    if (tokenPositions[cleanLabel]) {
      return tokenPositions[cleanLabel][0];
    }
    
    const stemmedRaw = stem(cleanRaw);
    if (tokenPositions[stemmedRaw]) {
      return tokenPositions[stemmedRaw][0];
    }
    
    const stemmedLabel = stem(cleanLabel);
    if (stemmedLabel !== stemmedRaw && tokenPositions[stemmedLabel]) {
      return tokenPositions[stemmedLabel][0];
    }
    
    return -1;
  };

  realWords.forEach(row => {
    const [head, rawRelStr] = row.lastColumn.split(":");
    const rel = normRel(rawRelStr);
    if (["verbalizer","begin"].includes(rel)) return;
    if (absorbedIndices.has(row.index)) return;
    let label;
    if (/^\d+$/.test(row.word)) { 
      const nw = sentenceWords.find(t => NUMBER_WORDS.has(t)); 
      label = nw ?? row.word; 
    }
    else if (isCopula(row.word)) { 
      label = extractLabel(row.word); 
    }
    else { 
      label = extractEng(row.word); 
      label = matchSent(label, sentenceWords); 
      label += getTam(row.word); 
    }
    const parentRel = childRelMap[row.index] || "";
    
    let sentIndex = getStrictSentIndex(label, row.word);
    
    const isAnimate = ["per","mal","m","fem","f","male","female","anim","masc","animate"].includes((row.animacy||"-").toLowerCase());
    const gender = (row.animacy||"-").toLowerCase();
    nodes[row.index] = {
      id: row.index, label, parentRel, sentIndex,
      isRoot: row.index === rootId, isAnimate,
      speakerView: row.speakerView,
      gender,
      hasCoref: false, // Will be set later
      corefTarget: null,
    };
    nodeRawWord[row.index] = row.word;
    if (head && head !== "0") addEdge(
      head,
      row.index,
      resolveEdgeLbl(head, rel, getEdgeLabel(rel, nodes[row.index]?.isAnimate)),
      parentRel === "neg"
    );
  });

  metadataRows.forEach(row => {
    const [head, rawRelStr] = row.lastColumn.split(":");
    const rel = normRel(rawRelStr);
    if (["verbalizer","card"].includes(rel)) return;
    if (cpRemapped && row.index === rawRootId) return;
    if (/^\[span/i.test(row.word)) return;
    let label = indexMapping[row.index]; if (!label) return;
    label = matchSent(label, sentenceWords);
    const verbChild = realWords.find(rw =>
      rw.lastColumn.split(":")[0] === String(row.index) &&
      normRel(rw.lastColumn.split(":")[1]) === "verbalizer"
    );
    label += (verbChild ? getTam(verbChild.word) : getTam(row.word));
    const parentRel = childRelMap[row.index] || "";
    
    let sentIndex = getStrictSentIndex(label, row.word);
    
    const isAnimate = (row.animacy||"-") !== "-" && ["per","mal","m","fem","f","anim","male","female","masc","animate"].includes((row.animacy||"-").toLowerCase());
    const gender = (row.animacy||"-").toLowerCase();
    const isNe = /^\[ne/i.test(row.word);

    nodes[row.index] = {
      id: row.index, label, parentRel, sentIndex,
      isRoot: row.index === rootId, isAnimate,
      speakerView: row.speakerView,
      gender,
      isNe,
      hasCoref: false,
      corefTarget: null,
    };
    nodeRawWord[row.index] = row.word;
    if (head && head !== "0") addEdge(
      head,
      row.index,
      resolveEdgeLbl(head, rel, getEdgeLabel(rel, nodes[row.index]?.isAnimate)),
      false
    );
  });

  const describerNodes = {}, describerEdges = [];
  rawEdges.forEach(e => {
    const rel = normRel(
      childRelMap[e.to] || ""
    );
    if (rel !== "rbks" && rel !== "rvks") return;

    const parentNode = nodes[e.from];
    if (!parentNode) return;

    const rawWord = nodeRawWord[e.from] || "";
    if (!hasIngForm(rawWord)) return;

    const describerLabel = rel === "rbks" ? "whom" : "what";
    const descId = `describer_${e.from}_${rel}`;

    if (!describerNodes[descId]) {
      describerNodes[descId] = {
        id: descId,
        label: `${describerLabel}:describer`,
        parentRel: rel,
        sentIndex: -1,
        isRoot: false,
        isAnimate: false,
        speakerView: "",
        gender: "-",
        isDescriber: true,
        hasCoref: false,
        corefTarget: null,
      };
      describerEdges.push({
        id: `e${e.from}-${descId}`,
        from: e.from,
        to: descId,
        label: rel === "rbks" ? "whom" : "what",
        isNeg: false,
        isDescriber: true,
      });
    }
  });

  Object.assign(nodes, describerNodes);
  rawEdges.push(...describerEdges);

  const incomingMod = {};
  rawEdges.forEach(e => { if (e.label === "describes") incomingMod[e.to] = e.from; });
  const lcount = {};
  Object.values(nodes).forEach(n => { lcount[n.label] = (lcount[n.label]||0) + 1; });
  Object.keys(nodes).forEach(id => {
    const orig = nodes[id].label;
    if (lcount[orig] > 1 && incomingMod[id] != null) {
      const ml = nodes[incomingMod[id]]?.label; if (ml) nodes[id].label = `${ml} ${orig}`;
    }
  });
  const labelsA = {}; Object.keys(nodes).forEach(id => { labelsA[id] = nodes[id].label; });
  const countB = {}; Object.values(labelsA).forEach(l => { countB[l] = (countB[l]||0) + 1; });
  const toParentQ = {}; rawEdges.forEach(e => { toParentQ[e.to] = e.label; });
  Object.keys(nodes).forEach(id => {
    if ((countB[labelsA[id]]||0) > 1) { const q = toParentQ[id]; if (q) nodes[id].label = `${labelsA[id]} (${q})`; }
  });

  const TRANSPARENT_RE = /^\[(conj|nc|vg|s|adv|adj|rb|nmod|jj|nn|vmod|clu|intf|fragp|wp|pp)/i;
  const bypassIds = new Set(metadataRows.filter(r => TRANSPARENT_RE.test(r.word)).map(r => r.index));

  if (bypassIds.size > 0) {
    let changed = true;
    while (changed) {
      changed = false;
      for (const bId of bypassIds) {
        const parentEdge = rawEdges.find(e => e.to === bId);
        if (!parentEdge) continue;
        const parentId = parentEdge.from;
        let localChanged = false;
        rawEdges.forEach(e => {
          if (e.from === bId) { e.from = parentId; e.id = `e${parentId}-${e.to}-redir`; localChanged = true; }
        });
        const pIdx = rawEdges.indexOf(parentEdge);
        if (pIdx !== -1) rawEdges.splice(pIdx, 1);
        delete nodes[bId];
        if (localChanged) changed = true;
      }
    }
    const seen = new Set();
    for (let i = rawEdges.length - 1; i >= 0; i--) {
      const key = `${rawEdges[i].from}-${rawEdges[i].to}`;
      if (seen.has(key)) rawEdges.splice(i, 1); else seen.add(key);
    }
  }

  // Store coref info on nodes
  const corefMap = {};
  corefLinks.forEach(link => {
    if (link.type === "coref") {
      corefMap[link.fromLocalIndex] = link;
      if (nodes[link.fromLocalIndex]) {
        nodes[link.fromLocalIndex].hasCoref = true;
        nodes[link.fromLocalIndex].corefTarget = link.toNodeIndex;
      }
    }
  });

  rawEdges.forEach(e => {
    const child = nodes[e.to]; if (!child) return;
    const lbl = child.label?.toLowerCase().replace(/\s+/g, "");
    if (!lbl || !lbl.startsWith("yax")) return;
    const rel = normRel(child.parentRel);
    if (rel === "k2" || rel.startsWith("k2"))                       child.label = "which";
    else if (rel === "k7t")                                          child.label = "when";
    else if (rel === "k2p" || rel === "k7p" || rel === "k7a")       child.label = "where";
    else if (rel === "k1" || rel.startsWith("k1"))                  child.label = "who";
    else                                                             child.label = "which";
  });

  rawEdges.forEach(e => {
    const child = nodes[e.to]; if (!child) return;
    const lbl = child.label?.toLowerCase().replace(/\s+/g, "");
    if (!lbl || !lbl.startsWith("wyax")) return;

    const rel = normRel(child.parentRel);
    const view = (child.speakerView || "").toLowerCase();
    const isDem = rel === "dem";
    const corefInfo = corefMap[child.id];

    if (isDem) {
      if (view.includes("proximal")) { child.label = "this"; return; }
      if (view.includes("distal"))   { child.label = "that"; return; }
    }

    if (!isDem) {
      if (view.includes("proximal")) { child.label = "this"; return; }
      if (view.includes("distal"))   { child.label = "that"; return; }
    }

    if (corefInfo) {
      // Keep the coref info but change label for display
      child.hasCoref = true;
      child.corefTarget = corefInfo.toNodeIndex;
      
      // Don't change the label for wyax nodes - keep them as "wyax" so they remain clickable
      // The display label will be handled in the UI
      if (child.label === "wyax" || child.label === "$wyax") {
        // Keep as wyax for now, UI will show appropriate text
        return;
      }
    }

    if (rel === "k2" || rel.startsWith("k2")) {
      child.label = "which";
    } else if (rel === "k7t") {
      child.label = "when";
    } else if (rel === "k2p" || rel === "k7p" || rel === "k7a") {
      child.label = "where";
    } else if (rel === "k1" || rel.startsWith("k1")) {
      if (child.isAnimate) child.label = "he";
      else                 child.label = "it";
    } else {
      if (child.isAnimate) child.label = "he";
      else                 child.label = "it";
    }
  });

  const childrenOf = {};
  rawEdges.forEach(e => { if (!childrenOf[e.from]) childrenOf[e.from] = []; childrenOf[e.from].push(e.to); });

  const neNodeIds  = new Set(metadataRows.filter(r => /^\[ne/i.test(r.word)).map(r => r.index));
  const rcChildIds = new Set();
  rawEdges.forEach(e => { const rel = normRel(childRelMap[e.to]||""); if (rel.startsWith("rc")) rcChildIds.add(e.to); });

  return { nodes, edges:rawEdges, rootId, childrenOf, corefLinks, englishSentence, sentenceWords, neNodeIds, rcChildIds };
};

// ─── Segment splitter ─────────────────────────────────────────────────────────
export const splitSegments = text => {
  if (!text) return [];
  const segs = [], re = /<(?:segment_id|sent_id)=([^>]+)>([\s\S]*?)<\/(?:segment_id|sent_id)>/g;
  let m;
  while ((m = re.exec(text)) !== null) segs.push({ segId:m[1].trim(), text:m[2] });
  if (!segs.length) segs.push({ segId:"default", text });
  return segs;
};

// ─── Layout helpers ───────────────────────────────────────────────────────────
const wordWidth = label => Math.max(label.length * WORD_FONT * 0.60 + WORD_PAD * 2, MIN_COL_W);

const buildColCenters = (orderedIds, nodes, neNodeIds, childrenOf) => {
  const c = {};
  let x = SVG_PAD;

  const neGroupOf = {};

  if (neNodeIds) {
    neNodeIds.forEach(neId => {
      const neIdStr = String(neId);
      (childrenOf[neIdStr] || []).forEach(childId => {
        neGroupOf[String(childId)] = neIdStr;
      });
      neGroupOf[neIdStr] = neIdStr;
    });
  }

  let prevGroup = null;

  orderedIds.forEach((id, i) => {
    const idStr = String(id);
    const w = wordWidth(nodes[idStr]?.label ?? "");

    const curGroup = neGroupOf[idStr] || null;

    let gap = 16;

    if (i > 0 && curGroup && curGroup === prevGroup) {
      gap = NE_GROUP_GAP;
    }

    x += gap;
    c[idStr] = x + w / 2;
    x += w;

    prevGroup = curGroup;
  });

  c.__totalW = x + SVG_PAD;
  return c;
};

const assignArcTiers = (visEdges, colOf) => {
  const n = visEdges.length; if (n === 0) return {};
  const iv = visEdges.map(e => {
    const x1 = colOf[String(e.from)] ?? 0, x2 = colOf[String(e.to)] ?? 0;
    return [Math.min(x1, x2), Math.max(x1, x2)];
  });
  const adj = Array.from({ length:n }, () => []);
  const link = (i, j) => { adj[i].push(j); adj[j].push(i); };
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const [a1,a2] = iv[i], [b1,b2] = iv[j];
      const crosses = (a1<b1 && b1<a2 && a2<b2) || (b1<a1 && a1<b2 && b2<a2);
      const shared =
        String(visEdges[i].from) === String(visEdges[j].from) ||
        String(visEdges[i].to)   === String(visEdges[j].to)   ||
        String(visEdges[i].from) === String(visEdges[j].to)   ||
        String(visEdges[i].to)   === String(visEdges[j].from);
      if (crosses || shared) link(i, j);
    }
  }
  const order = Array.from({ length:n }, (_, i) => i).sort((a, b) => {
    const sa = iv[a][1] - iv[a][0], sb = iv[b][1] - iv[b][0];
    return sa !== sb ? sa - sb : a - b;
  });
  const tierMap = {};
  order.forEach(i => {
    const used = new Set(adj[i].map(j => tierMap[j]).filter(t => t !== undefined));
    let t = 0; while (used.has(t)) t++;
    tierMap[i] = t;
  });
  return tierMap;
};

const computeAttachPoints = (visEdges, colOf, nodes, orderedIds) => {
  const colW = {};
  orderedIds.forEach(id => { colW[String(id)] = wordWidth(nodes[id]?.label ?? "") / 2; });
  const fromGroup = {}, toGroup = {};
  visEdges.forEach((e, i) => {
    const f = String(e.from), t = String(e.to);
    (fromGroup[f] = fromGroup[f] || []).push(i);
    (toGroup[t]   = toGroup[t]   || []).push(i);
  });
  const fromX = {}, toX = {};
  const spreadGroup = (idxs, nid, getOtherX, outMap) => {
    const cx = colOf[nid] ?? 0, hw = colW[nid] ?? 30, n = idxs.length;
    if (n === 1) { outMap[idxs[0]] = cx; return; }
    const maxSpread = Math.min(hw * 0.80, 6 * n);
    const sorted = [...idxs].sort((a, b) => getOtherX(a) - getOtherX(b));
    sorted.forEach((idx, k) => { outMap[idx] = cx - maxSpread + (k / (n-1)) * maxSpread * 2; });
  };
  Object.entries(fromGroup).forEach(([nid, idxs]) => { spreadGroup(idxs, nid, i => colOf[String(visEdges[i].to)] ?? 0, fromX); });
  Object.entries(toGroup).forEach(([nid, idxs])   => { spreadGroup(idxs, nid, i => colOf[String(visEdges[i].from)] ?? 0, toX); });
  return { fromX, toX };
};

const smoothArcPath = (x1, x2, bot, peakH) => {
  const r = Math.min(6, peakH * 0.4);
  const topY = bot - peakH;
  if (Math.abs(x2 - x1) < 2) return `M ${x1} ${bot} L ${x1} ${topY}`;
  const goRight = x2 > x1;
  const ax1r = goRight ? x1 + r : x1 - r;
  const ax2r = goRight ? x2 - r : x2 + r;
  return `M ${x1} ${bot} L ${x1} ${topY+r} Q ${x1} ${topY} ${ax1r} ${topY} L ${ax2r} ${topY} Q ${x2} ${topY} ${x2} ${topY+r} L ${x2} ${bot}`;
};

function groupNeComponents(orderedIds, nodes, neNodeIds, childrenOf) {
  if (!neNodeIds || neNodeIds.size === 0) return orderedIds;

  const neChildSet = new Map();
  neNodeIds.forEach(neId => {
    const neIdStr = String(neId);
    (childrenOf[neIdStr] || []).forEach(cId => {
      neChildSet.set(String(cId), neIdStr);
    });
  });

  if (neChildSet.size === 0) return orderedIds;

  const result = [];
  const inserted = new Set();

  orderedIds.forEach(id => {
    const idStr = String(id);
    if (inserted.has(idStr)) return;

    result.push(idStr);
    inserted.add(idStr);

    if (neNodeIds.has(idStr) || neNodeIds.has(id)) {
      const children = childrenOf[idStr] || [];
      children.forEach(cId => {
        const cStr = String(cId);
        if (!inserted.has(cStr) && orderedIds.includes(cStr)) {
          result.push(cStr);
          inserted.add(cStr);
        }
      });
    }
  });

  orderedIds.forEach(id => {
    if (!inserted.has(String(id))) result.push(String(id));
  });

  return result;
}

// ─── SegmentArcRow ────────────────────────────────────────────────────────────
function SegmentArcRow({ segId, segLabel, nodes, edges, rootId, childrenOf, segmentIndex, neNodeIds, rcChildIds, englishSentence = "" }) {
  const [expanded, setExpanded] = useState(() => new Set());
  const [hovNode, setHovNode]   = useState(null);
  const [hovEdge, setHovEdge]   = useState(null);

  const neNodeIdsMemo  = useMemo(() => neNodeIds instanceof Set ? neNodeIds : new Set(), [neNodeIds]);
  const rcChildIdsMemo = useMemo(() => rcChildIds instanceof Set ? rcChildIds : new Set(), [rcChildIds]);

  const toggleExpand = useCallback(id => {
    const sid = String(id);
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(sid)) {
        const q = [sid];
        while (q.length) { const c = q.shift(); next.delete(c); (childrenOf[c]||[]).forEach(x => q.push(String(x))); }
      } else {
        next.add(sid);
        if (neNodeIdsMemo.has(sid)) {
          const q = [sid];
          while (q.length) { const c = q.shift(); (childrenOf[c]||[]).forEach(x => { next.add(String(x)); q.push(String(x)); }); }
        }
      }
      return next;
    });
  }, [childrenOf, neNodeIdsMemo]);

  const getNodeCorefConnections = useCallback((nodeId) => {
    const connections = [];
    edges.forEach(e => {
      if (!e.isCoref) return;
      if (String(e.from) === nodeId) {
        connections.push({ targetId: String(e.to), isOutgoing: true });
      }
      if (String(e.to) === nodeId) {
        connections.push({ targetId: String(e.from), isOutgoing: false });
      }
    });
    return connections;
  }, [edges]);

  const handleNodeClick = useCallback((id, hasKids) => {
    const corefConns = getNodeCorefConnections(id);
    
    if (corefConns.length > 0) {
      setExpanded(prev => {
        const next = new Set(prev);
        
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        
        corefConns.forEach(conn => {
  const targetId = conn.targetId;

  if (next.has(targetId)) {
    next.delete(targetId);
  } else {
    next.add(targetId);

    // 🔥 NEW: expand NE children also
    const targetNode = nodes[targetId];
    if (targetNode?.isNe) {
        const children = Object.values(nodes).filter(n =>
          n.segId === targetNode.segId &&
          n.id !== targetNode.id &&
          (n.parentRel === "begin" || n.parentRel === "inside") &&
          n.originalId && targetNode.originalId &&
          String(n.originalId) !== String(targetNode.originalId)
        );

        children.forEach(child => next.add(child.id));
      }
  }
});
        return next;
      });
    } else if (hasKids) {
      toggleExpand(id);
    }
  }, [getNodeCorefConnections, toggleExpand]);

  const hasExpandableKids = useCallback(id => {
    const sid = String(id);
    const allKids = childrenOf[sid] || [];

    const hasCoref = edges.some(e =>
      e.isCoref && (String(e.from) === sid || String(e.to) === sid)
    );

    if (sid === String(rootId)) {
      const normalKids = allKids.some(c => {
        const rel = normRel(nodes[String(c)]?.parentRel || "");
        return !KARAK_INITIAL_RELS.has(rel) &&
              !MODIFIER_AUTO_RELS.has(rel) &&
              !rcChildIdsMemo.has(String(c));
      });

      return normalKids || hasCoref;
    }

    const normalKids = allKids.some(c => {
      const rel = normRel(nodes[String(c)]?.parentRel || "");
      return !MODIFIER_AUTO_RELS.has(rel);
    });

    return normalKids || hasCoref;
  }, [childrenOf, nodes, rootId, rcChildIdsMemo, edges]);

  const visibleIds = useMemo(() => {
    const vis = new Set(); if (!rootId) return vis;
    const addWithMods = id => {
      const sid = String(id); if (vis.has(sid)) return; vis.add(sid);
      (childrenOf[sid]||[]).forEach(c => {
        const rel = normRel(nodes[String(c)]?.parentRel || "");
        if (MODIFIER_AUTO_RELS.has(rel)) addWithMods(String(c));
      });
    };
    const rootSid = String(rootId);
    const isExpRoot = expanded.has(rootSid);
    addWithMods(rootSid);
    (childrenOf[rootSid]||[]).forEach(c => {
      const rel = normRel(nodes[String(c)]?.parentRel || "");
      if (KARAK_INITIAL_RELS.has(rel) || isExpRoot) addWithMods(String(c));
    });
    (childrenOf[rootSid]||[]).forEach(c => {
      if (rcChildIdsMemo.has(String(c))) {
        addWithMods(String(c));
        (childrenOf[String(c)]||[]).forEach(gc => addWithMods(String(gc)));
      }
    });
    
    const currentVis = new Set(vis);
    currentVis.forEach(nodeId => {
      edges.forEach(e => {
        if (!e.isCoref) return;
        if (String(e.from) === nodeId) {
          addWithMods(String(e.to));
        }
        if (String(e.to) === nodeId) {
          addWithMods(String(e.from));
        }
      });
    });
    
    expanded.forEach(id => {
      if (id === rootSid) return;

      (childrenOf[id] || []).forEach(c => {
        addWithMods(String(c));
      });

      edges.forEach(e => {
        if (!e.isCoref) return;

        const from = String(e.from);
        const to   = String(e.to);

        if (from === id) {
          vis.add(to);
          addWithMods(to);
          (childrenOf[to] || []).forEach(c => {
            addWithMods(String(c));
          });
        }

        if (to === id) {
          vis.add(from);
          addWithMods(from);
          (childrenOf[from] || []).forEach(c => {
            addWithMods(String(c));
          });
        }
      });
    });
    return vis;
  }, [rootId, expanded, childrenOf, nodes, neNodeIdsMemo, rcChildIdsMemo, edges]);

  const orderedIds = useMemo(() => {
    const sorted = [...visibleIds].sort((a, b) => {
      const ia = nodes[a]?.sentIndex ?? 999;
      const ib = nodes[b]?.sentIndex ?? 999;
      return ia - ib;
    });
    
    return groupNeComponents(sorted, nodes, neNodeIdsMemo, childrenOf);
  }, [visibleIds, nodes, neNodeIdsMemo, childrenOf]);

  const colOf = useMemo(
    () => buildColCenters(orderedIds, nodes, neNodeIdsMemo, childrenOf),
    [orderedIds, nodes, neNodeIdsMemo, childrenOf]
  );

  const visEdges  = useMemo(() => edges.filter(e => visibleIds.has(String(e.from)) && visibleIds.has(String(e.to))), [edges, visibleIds]);
  const tierMap   = useMemo(() => assignArcTiers(visEdges, colOf), [visEdges, colOf]);
  const attachPts = useMemo(() => computeAttachPoints(visEdges, colOf, nodes, orderedIds), [visEdges, colOf, nodes, orderedIds]);

  const maxTier  = visEdges.length > 0 ? Math.max(0, ...Object.values(tierMap)) : 0;
  const arcAreaH = ARC_BASE_H + maxTier * ARC_TIER_H + LBL_H + 12;
  const wordY    = arcAreaH;
  const arcBot   = wordY - 2;
  const svgH     = wordY + WORD_FONT + 48;
  const svgW     = Math.max(colOf.__totalW ?? 400, 400);
  const peakOf   = i => ARC_BASE_H + (tierMap[i] ?? 0) * ARC_TIER_H;

  const coloredMarkers = [...new Set(visEdges.map(e => e.label || ""))];
  const accentColor = segmentIndex % 2 === 0 ? "#6d28d9" : "#15803d";
  const headerBg    = segmentIndex % 2 === 0 ? "#f5f3ff" : "#f0fdf4";
  const headerBd    = segmentIndex % 2 === 0 ? "#ddd6fe" : "#bbf7d0";

  return (
    <div style={{ marginBottom: 0 }}>
      <div style={{
        display:"flex", alignItems:"center", gap:8, flexWrap:"wrap",
        padding:"5px 14px", background:headerBg,
        borderBottom:`1px solid ${headerBd}`,
        fontSize:10, fontWeight:700, letterSpacing:.5, color:accentColor,
      }}>
        {segLabel && <span>{segLabel}</span>}
        {englishSentence && <span style={{ fontSize:11, fontWeight:"normal", color:"#475569" }}>{englishSentence}</span>}
      </div>

      <div style={{ 
        overflowX: "auto",
        overflowY: "auto",
        background: "#fff", 
        padding: "8px 0 10px 0",
        width: "100%",
        maxWidth: "100%",
        position: "relative"
      }}>
        <div style={{
          minWidth: "max-content",
          width: "max-content",
          maxWidth: "none",
        }}>
          <svg 
            width={svgW} 
            height={svgH}
            style={{ 
              display: "block", 
              fontFamily: "'DM Sans',Inter,sans-serif", 
              overflow: "visible"
            }}
            onMouseLeave={() => { setHovNode(null); setHovEdge(null); }}
          >
            <defs>
              {coloredMarkers.map(lbl => {
                const color = getArcColor(lbl);
                const safeId = `${segId}-a-${lbl.replace(/[^a-zA-Z]/g, "_")}`;
                return (
                  <marker key={safeId} id={safeId} markerWidth="7" markerHeight="7" refX="1" refY="3.5" orient="auto">
                    <path d="M0,0 L7,3.5 L0,7 z" fill={color} />
                  </marker>
                );
              })}
            </defs>

            {visEdges.map((edge, i) => {
              const color   = getArcColor(edge.label);
              const markId  = `${segId}-a-${(edge.label||"").replace(/[^a-zA-Z]/g,"_")}`;
              const ax1     = attachPts.fromX[i] ?? colOf[String(edge.from)] ?? 0;
              const ax2     = attachPts.toX[i]   ?? colOf[String(edge.to)]   ?? 0;
              if (ax2 === undefined) return null;
              const pH = peakOf(i) + (i % 3) * 6;
              const curveOffset = (i % 2 === 0 ? 1 : -1) * 12;
              const path = smoothArcPath(ax1 + curveOffset, ax2 + curveOffset, arcBot, pH);
              const lpos = {
                x: (ax1 + ax2) / 2,
                y: arcBot - pH - 5 - (i % 3) * 12
              };
              const lbl     = edge.label || "";
              const lblW    = lbl.length * LBL_FONT * 0.62 + 10;
              const hov     = hovEdge === i;
              const nodeHl  = hovNode && (String(edge.from)===hovNode || String(edge.to)===hovNode);
              const dimmed  = (hovNode || hovEdge !== null) && !hov && !nodeHl;
              const isCoref = edge.isCoref || edge.label === "coref";
              
              const hitAreaWidth = isCoref ? 16 : 12;
              const strokeWidth = (hov || nodeHl) ? 3 : (isCoref ? 2 : 1.7);

              return (
                <g key={edge.id || i}
                  style={{ opacity:dimmed?0.07:1, transition:"opacity 0.15s", cursor:"pointer" }}
                  onMouseEnter={() => setHovEdge(i)}
                  onMouseLeave={() => setHovEdge(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isCoref) {
                      handleNodeClick(edge.from, true);
                      handleNodeClick(edge.to, true);
                    }
                  }}>
                  <path d={path} fill="none" stroke="transparent" strokeWidth={hitAreaWidth} />
                  <path d={path} fill="none" stroke={color}
                    strokeWidth={strokeWidth}
                    strokeOpacity={0.9}
                    strokeDasharray={isCoref ? "6,4" : undefined}
                    markerEnd={`url(#${markId})`} />
                  {lbl && <>
                    <rect x={lpos.x - lblW/2} y={lpos.y - LBL_H + 1} width={lblW} height={LBL_H}
                      rx={3} fill="white" stroke={color} strokeWidth={0.8} strokeOpacity={0.8} />
                    <text x={lpos.x} y={lpos.y - 2} textAnchor="middle"
                      fontSize={LBL_FONT} fontWeight="700" fill={color}>{lbl}</text>
                  </>}
                </g>
              );
            })}

            {orderedIds.map(id => {
              const node    = nodes[id]; if (!node) return null;
              const cx      = colOf[String(id)] ?? 0;
              const isRoot  = String(id) === String(rootId);
              const kids    = hasExpandableKids(id);
              const corefConns = getNodeCorefConnections(id);
              const hasCoref = corefConns.length > 0 || node.hasCoref;
              const exp     = expanded.has(String(id));
              const hov     = hovNode === String(id);
              const wColor  = getNodeColor(node.parentRel, isRoot);
              const wWeight = isRoot ? "800" : hov ? "700" : "500";
              
              // Display label - if it's a wyax node with coref, show as "he/she/it" but keep it clickable
              let displayLabel = node.label;
              
              
              const wW      = wordWidth(displayLabel);
              const connected = hovNode && visEdges.some(e =>
                (String(e.from)===hovNode && String(e.to)===id) ||
                (String(e.to)===hovNode   && String(e.from)===id));
              const dimmed  = hovNode && hovNode !== id && !connected;
              const indColor = exp ? "#4338ca" : (isRoot ? "#f97316" : "#94a3b8");
              const isNe = node.isNe;
              const isDescriber = node.isDescriber;

              return (
                <g key={id}
                  onMouseEnter={() => setHovNode(String(id))}
                  onMouseLeave={() => setHovNode(null)}
                  onClick={() => handleNodeClick(id, kids || hasCoref)}
                  style={{ cursor:(kids || hasCoref)?"pointer":"default", opacity:dimmed?0.15:1, transition:"opacity 0.15s" }}>

                  {hasCoref && !isRoot && (
                    <>
                      <circle
                        cx={cx + wW/2 + 8}
                        cy={wordY - 2}
                        r="7"
                        fill="#a855f7"
                        stroke="white"
                        strokeWidth="2"
                      />
                      <title>Click to expand coref connection to {corefConns.map(c => nodes[c.targetId]?.label).join(', ')}</title>
                    </>
                  )}

                  {isRoot && (
                    <rect
                      x={cx - wW/2 - 8}
                      y={wordY - 8}
                      width={wW + 16}
                      height={WORD_FONT + 21}
                      rx={8}
                      fill="#fef3c7"
                      strokeWidth={2.5}
                      strokeDasharray="4,3"
                      fillOpacity={0.3}
                    />
                  )}

                  {isNe && (
                    <rect
                      x={cx - wW/2 - 2}
                      y={wordY - 5}
                      width={wW + 4}
                      height={WORD_FONT + 12}
                      rx={5}
                      fill="none"
                      stroke="#0891b2"
                      strokeWidth={1.5}
                      strokeDasharray="3,2"
                    />
                  )}

                  {isDescriber && (
                    <rect
                      x={cx - wW/2 - 2}
                      y={wordY - 5}
                      width={wW + 4}
                      height={WORD_FONT + 12}
                      rx={5}
                      fill="#fdf4ff"
                      stroke="#a855f7"
                      strokeWidth={1.5}
                    />
                  )}

                  <rect
                    x={cx - wW/2}
                    y={wordY - 4}
                    width={wW}
                    height={WORD_FONT + 10}
                    rx={6}
                    fill={isRoot ? "#eef2ff" : "#ffffff"}
                    stroke={hasCoref ? "#a855f7" : (isRoot ? "#4f46e5" : "transparent")}
                    strokeWidth={hasCoref ? 2 : (isRoot ? 2 : 0)}
                    strokeDasharray={hasCoref ? "4,3" : undefined}
                  />
                  {hov && <line
                    x1={cx - wW/2 + 4} y1={wordY + WORD_FONT + 3}
                    x2={cx + wW/2 - 4} y2={wordY + WORD_FONT + 3}
                    stroke={wColor} strokeWidth={2} />}
                  <text x={cx} y={wordY + WORD_FONT - 1} textAnchor="middle"
                    fontSize={isRoot ? WORD_FONT + 2 : WORD_FONT}
                    fontWeight={wWeight}
                    fill={isDescriber ? "#a855f7" : wColor}
                    style={{ userSelect:"none" }}>
                    {displayLabel}
                  </text>
                  {(kids || hasCoref) && (
                    <text x={cx} y={wordY + WORD_FONT + 16} textAnchor="middle"
                      fontSize={9} fontWeight="800" fill={indColor}
                      style={{ userSelect:"none" }}>{exp ? "▲" : "▼"}</text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}

const getNeChildren = (neNode, allNodes) => {
  return Object.values(allNodes).filter(n =>
    String(n.originalId) !== String(neNode.originalId) &&
    n.parentRel &&
    ["begin", "inside"].includes(n.parentRel) &&
    String(n.parentOf) === String(neNode.originalId) // ← YOU NEED THIS
  );
};

// ─── Main USRGraphVisualizer ──────────────────────────────────────────────────
const USRGraphVisualizer = ({ initialText = "" }) => {

    console.log("🎨 USRGraphVisualizer rendering with text length:", initialText?.length);
  console.log("🎨 First 200 chars:", initialText?.substring(0, 200));
  
  const [submitted, setSubmitted] = useState(initialText);

  const segments = useMemo(() => splitSegments(submitted), [submitted]);

  const combinedGraph = useMemo(() => {
    const graph = {
      nodes: {},
      edges: [],
      rootIds: [],
      neNodeIds: new Set(),
      rcChildIds: new Set(),
      englishSentence: "",
    };
    const pendingCorefs = [];
    
    segments.forEach(seg => {
      const parsedSeg = parseSegment(seg.text);

      if (parsedSeg.englishSentence && !graph.englishSentence) {
        graph.englishSentence = parsedSeg.englishSentence;
      }

      Object.values(parsedSeg.nodes).forEach(node => {
        const newId = `${seg.segId}_${node.id}`;
        graph.nodes[newId] = {
          ...node,
          id: newId,
          originalId: node.id,
          segId: seg.segId,
        };
      });

      parsedSeg.edges.forEach(e => {
        graph.edges.push({
          ...e,
          from: `${seg.segId}_${e.from}`,
          to: `${seg.segId}_${e.to}`,
        });
      });

      if (parsedSeg.rootId) {
        graph.rootIds.push(`${seg.segId}_${parsedSeg.rootId}`);
      }

      if (parsedSeg.neNodeIds) {
        parsedSeg.neNodeIds.forEach(id => {
          graph.neNodeIds.add(`${seg.segId}_${id}`);
        });
      }

      if (parsedSeg.rcChildIds) {
        parsedSeg.rcChildIds.forEach(id => {
          graph.rcChildIds.add(`${seg.segId}_${id}`);
        });
      }

      parsedSeg.corefLinks?.forEach(link => {
  const fromId = `${seg.segId}_${link.fromLocalIndex}`;
  
  // Extract just the numeric part from toSegId if it contains underscores
  let targetSegId = link.toSegId;
  if (targetSegId.includes('_')) {
    // Try to find segment by matching the numeric suffix
    const numericMatch = targetSegId.match(/(\d+)$/);
    if (numericMatch) {
      const numSuffix = numericMatch[1];
      const matchingSeg = segments.find(s => 
        s.segId.endsWith(numSuffix) || 
        s.segId.includes(numSuffix)
      );
      if (matchingSeg) {
        targetSegId = matchingSeg.segId;
      }
    }
  }
  
  // If no match found, try to find by index
  if (!segments.find(s => s.segId === targetSegId)) {
    // Assume it's the next segment or previous segment
    const currentIndex = segments.findIndex(s => s.segId === seg.segId);
    if (link.toNodeIndex < 10 && currentIndex > 0) {
      targetSegId = segments[currentIndex - 1].segId; // Previous segment
    } else if (currentIndex < segments.length - 1) {
      targetSegId = segments[currentIndex + 1].segId; // Next segment
    }
  }
  
  pendingCorefs.push({
    fromId,
    toSegId: targetSegId,
    toNodeIndex: link.toNodeIndex,
  });
});
    });

    pendingCorefs.forEach(({ fromId, toSegId, toNodeIndex }) => {
  const fromExists = !!graph.nodes[fromId];
  if (!fromExists) {
    console.warn("Missing source node:", fromId);
    return;
  }

  // Try multiple strategies to find the target node
  let targetNode = null;
  
  // Strategy 1: Exact match
  const exactId = `${toSegId}_${toNodeIndex}`;
  targetNode = graph.nodes[exactId];
  
  // Strategy 2: Search by originalId across all nodes in the target segment
  if (!targetNode) {
    targetNode = Object.values(graph.nodes).find(n => 
      n.segId === toSegId && 
      String(n.originalId) === String(toNodeIndex)
    );
  }
  
  // Strategy 3: Search by index range (if node index is close)
  if (!targetNode) {
    const targetNum = parseInt(toNodeIndex);
    const candidates = Object.values(graph.nodes).filter(n => 
      n.segId === toSegId && 
      n.originalId && 
      Math.abs(parseInt(n.originalId) - targetNum) <= 2
    );
    if (candidates.length === 1) {
      targetNode = candidates[0];
    }
  }
  
  if (targetNode) {
    graph.edges.push({
      id: `coref-${fromId}-${targetNode.id}`,
      from: fromId,
      to: targetNode.id,
      label: "coref",
      isCoref: true,
    });
    
    if (graph.nodes[fromId]) {
      graph.nodes[fromId].hasCoref = true;
    }
    return;
  }
  
  console.error("Failed to resolve coref:", toSegId, toNodeIndex, "Available segments:", segments.map(s => s.segId));
});

    // Update wyax node labels based on gender of coref target
    Object.values(graph.nodes).forEach(node => {
      if (node.hasCoref && (node.label === "wyax" || node.label === "$wyax")) {
        // Find the coref edge from this node
        const corefEdge = graph.edges.find(e => e.isCoref && e.from === node.id);
        if (corefEdge) {
  let targetNode = graph.nodes[corefEdge.to];

  if (targetNode) {
    let gender = (targetNode.gender || targetNode.speakerView || "").toLowerCase();

    // 🔥 CASE 1: Target is NE → extract ONLY its children (correctly)
    if (targetNode.isNe) {
      const children = getNeChildren(targetNode, graph.nodes);

      const genderChild = children.find(c =>
        ["male","female","m","f","masc","fem"].includes((c.gender || "").toLowerCase())
      );

      if (genderChild) {
        gender = genderChild.gender.toLowerCase();
      }
    }

    // 🔥 CASE 2: Target itself is NE child (Robert case)
    else if (targetNode.parentRel === "begin" || targetNode.parentRel === "inside") {
      gender = (targetNode.gender || "").toLowerCase();
    }

    // 🔥 FINAL FLAGS
    const isMale   = ["mal","m","male","masc"].some(g => gender.includes(g));
    const isFemale = ["fem","f","female"].some(g => gender.includes(g));
    const isPerson = ["per","person","human","anim","animate"].some(g => gender.includes(g));

    const rel = normRel(node.parentRel);

    // 🔥 SUBJECT
    if (rel === "k1" || rel.startsWith("k1")) {
      if (isMale) node.label = "he";
      else if (isFemale) node.label = "she";
      else if (isPerson) node.label = "they";
      else node.label = "it";
    }

    // 🔥 OBJECT
    else if (rel !== "dem") {
      if (isMale) node.label = "him";
      else if (isFemale) node.label = "her";
      else if (isPerson) node.label = "them";
      else node.label = "it";
    }

    // 🔥 DEMONSTRATIVE CASE
    else {
      if (isMale) node.label = "he";
      else if (isFemale) node.label = "she";
      else if (isPerson) node.label = "they";
      else node.label = "it";
    }
  }
}
      }
    });

    return graph;
  }, [segments]);

  const buildChildren = (edges) => {
    const map = {};
    edges.forEach(e => {
      if (!map[e.from]) map[e.from] = [];
      map[e.from].push(e.to);
    });
    return map;
  };

  const handleSubmit = useCallback(() => {
    const textarea = document.querySelector('textarea');
    if (textarea) {
      setSubmitted(textarea.value);
    }
  }, []);

  return (
    <div style={{ width:"100%", maxWidth:1500, margin:"0 auto", fontFamily:"'DM Sans',Inter,sans-serif" }}>
      <div style={{ marginBottom: 20 }}>
        <textarea
          rows={10}
          style={{
            width: "100%",
            padding: "12px",
            fontFamily: "monospace",
            fontSize: "13px",
            border: "1px solid #cbd5e1",
            borderRadius: "8px",
            marginBottom: "10px"
          }}
          placeholder="Paste USR data here..."
          defaultValue={initialText}
        />
        <button
          onClick={handleSubmit}
          style={{
            background: "#4f46e5",
            color: "white",
            border: "none",
            padding: "8px 16px",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: 600
          }}
        >
          Visualize graph
        </button>
      </div>

      {segments.length > 0 && submitted && (
        <div style={{
          background:"#fff",
          borderRadius:12,
          border:"1px solid #e2e8f0",
          overflow:"hidden",
          boxShadow:"0 4px 24px rgba(0,0,0,0.07)",
          minHeight:200,
        }}>
          <div style={{
            display:"flex",
            alignItems:"center",
            gap:12,
            padding:"10px 16px",
            background:"linear-gradient(135deg,#4338ca,#5b21b6)",
            borderBottom:"1px solid rgba(255,255,255,0.1)",
          }}>
            <span style={{ color:"#fff", fontWeight:700, fontSize:14 }}>
              📊 Sentence Analysis Graph
            </span>

            {segments.length > 1 && (
              <span style={{
                background:"rgba(255,255,255,0.25)",
                color:"#fff",
                fontSize:10,
                fontWeight:700,
                padding:"2px 8px",
                borderRadius:8
              }}>
                {segments.length} segments
              </span>
            )}
          </div>

          <div style={{
            padding:"4px 14px",
            background:"#eff6ff",
            borderBottom:"1px solid #bfdbfe",
            fontSize:11,
            color:"#3b82f6",
            display:"flex",
            alignItems:"center",
            gap:7,
            flexWrap:"wrap",
          }}>
            <span>🔍 Hover to highlight arcs</span>
            <span>•</span>
            <span>🟣 Purple nodes have coref connections - CLICK to expand!</span>
            <span>•</span>
            <span>Click ▼ to expand · Click ▲ to contract</span>
          </div>

          <div style={{ maxHeight:680, overflow:"auto" }}>
            <SegmentArcRow
              segId="combined"
              segLabel="Combined Graph"
              nodes={combinedGraph.nodes}
              edges={combinedGraph.edges}
              rootId={combinedGraph.rootIds?.[0]}
              childrenOf={buildChildren(combinedGraph.edges)}
              segmentIndex={0}
              neNodeIds={combinedGraph.neNodeIds}
              rcChildIds={combinedGraph.rcChildIds}
              englishSentence={combinedGraph.englishSentence}
            />
          </div>
        </div>
      )}

      {!submitted && (
        <div style={{
          textAlign:"center",
          color:"#475569",
          fontSize:13,
          marginTop:40,
          opacity:.7
        }}>
          Paste USR data above and click <strong>Visualize graph</strong> to get started.
        </div>
      )}
    </div>
  );
};

export default USRGraphVisualizer;