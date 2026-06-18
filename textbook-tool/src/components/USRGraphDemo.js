import React, { useState, useMemo, useCallback, useRef } from 'react';

// ─── Relation label map (extended for real biology USR) ───────────────────────
const DEPENDENCY_TO_WH = {
  "k1": "Who/What",   "k2": "Whom/What",  "k7": "About",      "k7t": "When",
  "k7p": "Where",     "krvn": "How",      "k5": "From where", "k2p": "To where",
  "rt": "Purpose",    "rh": "Reason",     "ru": "Like what",  "k3": "With what",
  "rv": "Vs what",    "rprop": "Over",    "mod": "Modifier",  "quant": "Quantity",
  "quantmore": "More than", "quantless": "Less than",
  "r6": "Of",         "freq": "How often","rkl": "Bef/Aft",
  "kriyaMUla": "Root verb", "verbalizer": "Verbalizer",
  "rbks": "mod",      "rvks": "mod",      "rreason": "Because",
  "begin": "begin",   "inside": "inside", "end": "end",       "head": "head",
  // ── new relations from biology corpus ──
  "with_since": "Since",   "k1s": "Subject-pred",
  "parataxis": "And/But",  "nmod_such_as": "Such as",
  "op1": "Option 1",       "op2": "Option 2",  "op3": "Option 3",
  "op4": "Option 4",       "op5": "Option 5",
  "coref": "Corefers",     "nmod": "Noun-mod",
};

const TAM_MAPPING = {
  "yA_WA_2":"had","nA_cAhie_4":"must","nA_hE_1":"have_to","past":"was","yA_1":"ed",
  "0_gayA_1":"went","0_xiyA_1":"gave","0_sakA_1":"could","yA_WA_1":"did","yA_hE_2":"is_being",
  "wA_hE_1":"is","0_rahA_hogA_1":"will_have_been","pres":"is","wA_WA_1":"used_to",
  "0_jAwA_WA_1":"used_to_go","gA_2":"would","o_1":"should","o_2":"must","nA_hE_2":"have_to",
  "nA_hogA_1":"must","nA_cAhie_2":"must","nA_cAhie_1":"should","0_sakawA_hE_3":"may",
  "nA_padZawA_hE_1":"have_to","nA_padZawA_WA_1":"had_to","nA_padZA_1":"had_to",
  "yA_gayA_WA_1":"was","0_cukA_hE_1":"have","AI_xI_1":"","0_cukA_WA_1":"had",
  "0_gayA_WA_1":"had_gone","0_rahA_hE_2":"has_been","yA_gayA_hE_2":"has_been",
  "0_rahA_WA_2":"had_been","0_cukA_hogA_1":"will_have","yA_gayA_1":"got",
  "wA_rahawA_hE_1":"keeps","0_rahA_wA_1":"was","0_rahA_hE_1":"is","yA_jAyegA_1":"will_be",
  "gA_1":"will","0_rahA_hogA_2":"shall_be","yA_hogA_1":"will_have","nA_cAhie_3":"have_to",
  "nA_padZawA_hE_2":"must","nA_padZA_2":"must","nA_padZawA_WA_2":"have_to",
  "nA_padZegA_1":"had_to","yA_hogA_2":"had_to","0_sakawA_1":"will_have_to",
  "0_sakawA_WA_1":"might_have","0_sakawA_hE_1":"can","0_sakawA_hE_2":"could",
  "yA_gayA_WA_2":"could","yA_jAwA_WA_1":"might","yA_jAwA_hE_1":"could",
  "yA_gayA_hE_1":"can","yA_hE_1":"was","yA_hogA_3":"was","yAw_1":"had_been",
  "aw_1":"is","awi_4":"are","a_1":"has","Iw_1":"must_have","wA_1":"will",
  "syaw_1":"ed","syawi_1":"ed","awu_1":"ed","ew_1":"should",
  // TAM for biology corpus
  "tried_have_1":"have tried","ed_1":"were","ed_is":"is",
};

const DEP_COLORS = ["#2255cc","#1a8833","#cc2222","#996600","#006688","#884411","#aa3377","#337755"];
const CXN_COLORS = ["#7733bb","#9944cc","#5522aa","#bb55dd","#6633aa","#8844bb"];

const TH        = 30;
const HPAD      = 18;
const ARC_STEP  = 32;
const ARC_PAD   = 16;
const R         = 6;
const ARC_NUDGE = 14;

// ─── TAM extractor ────────────────────────────────────────────────────────────
function extractTam(wordRaw) {
  const w = wordRaw.replace(/^[$[\]]+/, "");
  const dash = w.indexOf("-");
  if (dash < 0) return null;
  const cand = w.slice(dash + 1);
  if (TAM_MAPPING[cand] !== undefined) return TAM_MAPPING[cand] || cand;
  return cand;
}

// ─── Pronoun resolution — plural-aware ───────────────────────────────────────
function resolveWyax(node) {
  const base = (node.name || "").toLowerCase();
  if (base !== "wyax" && base !== "yax") return null;
  const rel = (node.relation || "").toLowerCase();
  const sv  = (node.speakerView || "").toLowerCase();
  const isPlural = node.morpho_semantic === "pl";

  if (node.corefRef != null) {
    const isSubj = rel === "k1" || rel.startsWith("k1")
                || rel === "pk1" || rel === "jk1" || rel === "mk1";
    if (isPlural) return isSubj ? "they" : "them";
    return isSubj ? "he/she/it" : "him/her/it";
  }
  if (rel === "dem") return sv === "proximal" ? "this" : "that";
  if (sv === "proximal") return "this";
  if (sv === "distal")   return "that";
  return null;
}

function nodeDisplayName(node) { return resolveWyax(node) || node.name; }

function nodeWidth(node, hasChildren) {
  const text = nodeDisplayName(node);
  return Math.max(84, text.length * 7.8 + 22 + (hasChildren ? 20 : 0));
}

// ─── USR parser — handles dotted coref refs like "chapter2_002.2:coref" ──────
function parseUSR(text) {
  let segId = "—", sentence = "";
  const segMatch  = text.match(/<segment_id=([^>]+)>/);
  if (segMatch) segId = segMatch[1].trim();
  const sentMatch = text.match(/^#(.+)/m);
  if (sentMatch) sentence = sentMatch[1].trim();

  const lines = text.split("\n").map(l => l.trim()).filter(l =>
    l && !l.startsWith("#") && !l.startsWith("<") && !l.startsWith("%")
  );

  const nodes = {}, children = {};

  for (const line of lines) {
    const parts = line.split("\t");
    if (parts.length < 5) continue;
    const wordRaw = parts[0];
    const nodeId  = parseInt(parts[1]);
    if (isNaN(nodeId)) continue;

    const morpho_semantic   = (parts[2] || "-").trim();
    const semantic_category = (parts[3] || "-").trim();
    const relField  = parts[4].trim();
    const col5      = parts.length > 5 ? parts[5].trim() : "";
    const compField = parts.length >= 9 ? parts[parts.length - 1].trim() : "";
    const isGroup   = wordRaw.startsWith("[") && wordRaw.endsWith("]");

    let parentId = null, relation = "";
    if (relField.includes(":")) {
      const idx = relField.indexOf(":");
      const pid = parseInt(relField.slice(0, idx));
      if (!isNaN(pid)) { parentId = pid; relation = relField.slice(idx + 1); }
    }

    const tam    = extractTam(wordRaw);
    const rawBase = wordRaw.replace(/^[$[\]]+/, "").split("_")[0].toLowerCase();
    let speakerView = "", corefRef = null;

    if (rawBase === "wyax" || rawBase === "yax") {
      const sv    = col5.toLowerCase();
      const col6v = parts.length > 6 ? parts[6].trim().toLowerCase() : "";

      if      (col6v === "proximal" || col6v === "prox") speakerView = "proximal";
      else if (col6v === "distal")                        speakerView = "distal";
      else if (sv === "proximal" || sv === "prox")        speakerView = "proximal";
      else if (sv === "distal")                           speakerView = "distal";
      else if (sv !== "" && sv !== "-") {
        // handles "chapter2_002.2:coref" OR plain "7:coref" — just mark as coref'd
        // extract integer part before first ":" or "."
        const rawRef = sv.split(":")[0];
        const numPart = rawRef.split(".")[0].replace(/\D/g, "");
        const ref = parseInt(numPart);
        if (!isNaN(ref) && ref > 0) corefRef = ref;
        else corefRef = -1; // sentinel: has a coref but can't resolve to local id
      }
    }

    const name = isGroup
      ? wordRaw.replace(/[$[\]]/g, "")
      : wordRaw.replace(/[$[\]]/g, "").split("_")[0];

    nodes[nodeId] = {
      id: nodeId, name,
      parent: (parentId === 0 || parentId === null) ? null : parentId,
      relation, isGroup, isCxn: isGroup,
      tam, speakerView, corefRef,
      morpho_semantic, semantic_category,
    };

    if (parentId !== null && parentId !== 0) {
      if (!children[parentId]) children[parentId] = [];
      children[parentId].push(nodeId);
    }

    if (compField.includes(":")) {
      const ci = compField.indexOf(":");
      const cp = parseInt(compField.slice(0, ci));
      const cr = compField.slice(ci + 1);
      if (!isNaN(cp)) {
        if (!children[cp]) children[cp] = [];
        if (!children[cp].includes(nodeId)) children[cp].push(nodeId);
        if (nodes[nodeId].parent === null) {
          nodes[nodeId].parent   = cp;
          nodes[nodeId].relation = cr;
        }
      }
    }
  }

  const edgeSet = new Set(), flatEdges = [];
  for (const [pid, childList] of Object.entries(children)) {
    const parentId = parseInt(pid);
    if (parentId === 0) continue;
    for (const cid of childList) {
      const rel = nodes[cid]?.relation || "";
      const key = `${parentId}-${cid}-${rel}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        const srcCxn = nodes[parentId]?.isCxn || false;
        const tgtCxn = nodes[cid]?.isCxn || false;
        flatEdges.push({
          source: parentId, target: cid, relation: rel,
          label: DEPENDENCY_TO_WH[rel] || rel,
          isCxnEdge: srcCxn || tgtCxn,
        });
      }
    }
  }

  let rootId = null;
  for (const node of Object.values(nodes)) {
    if (node.relation === "main" || node.parent === null) { rootId = node.id; break; }
  }
  if (rootId === null && Object.keys(nodes).length)
    rootId = Math.min(...Object.keys(nodes).map(Number));

  const nodeList = Object.values(nodes).sort((a, b) => a.id - b.id);
  return { nodes: nodeList, edges: flatEdges, root: rootId, sentence, segId };
}

function splitSegments(text) {
  if (!text) return [];
  const segs = [];
  const re = /<(?:segment_id|sent_id)=([^>]+)>([\s\S]*?)<\/(?:segment_id|sent_id)>/g;
  let m;
  while ((m = re.exec(text)) !== null) segs.push(m[0]);
  if (!segs.length) segs.push(text);
  return segs;
}

// ─── Arc layout ───────────────────────────────────────────────────────────────
function assignLevels(edges, colOf) {
  const sorted = [...edges].sort((a, b) =>
    Math.abs(colOf[a.source] - colOf[a.target]) - Math.abs(colOf[b.source] - colOf[b.target])
  );
  sorted.forEach(e => {
    const span  = Math.abs(colOf[e.source] - colOf[e.target]);
    const left  = Math.min(colOf[e.source], colOf[e.target]);
    const right = Math.max(colOf[e.source], colOf[e.target]);
    let h = Math.max(span, 1) * ARC_STEP;
    const conflicts = (h) => sorted.some(o => {
      if (o === e || o._arcH === undefined) return false;
      const ol  = Math.min(colOf[o.source], colOf[o.target]);
      const or_ = Math.max(colOf[o.source], colOf[o.target]);
      return ol < right && or_ > left && o._arcH === h;
    });
    while (conflicts(h)) h += ARC_NUDGE;
    e._arcH = h;
  });
  return sorted;
}

function computeAttachOffsets(edges, colOf, allChildren, nodeById) {
  const byNode = {};
  edges.forEach((e, i) => {
    [e.source, e.target].forEach(nid => {
      if (!byNode[nid]) byNode[nid] = [];
      byNode[nid].push(i);
    });
  });
  const srcOff = new Array(edges.length).fill(0);
  const tgtOff = new Array(edges.length).fill(0);
  Object.entries(byNode).forEach(([nid, idxList]) => {
    const n = idxList.length; if (n <= 1) return;
    const nidInt = parseInt(nid);
    const hasCh  = !!(allChildren[nidInt]?.length);
    const tw     = nodeWidth(nodeById[nidInt] || { name:"", id:0 }, hasCh);
    const maxSpread = (tw - 16) / 2;
    const step      = (2 * maxSpread) / (n - 1);
    idxList.forEach((idx, rank) => {
      const off = -maxSpread + rank * step;
      const e   = edges[idx];
      if (e.source === nidInt) srcOff[idx] = off; else tgtOff[idx] = off;
    });
  });
  return { srcOff, tgtOff };
}

// ─── SegmentView (identical pipeline to USRGraphVisualizer) ───────────────────
function SegmentView({ data, segmentIndex, showIds, resetKey }) {
  const { nodes: nodeList, edges: flatEdges, root: rootId, sentence, segId } = data;

  const nodeById = useMemo(() => {
    const m = {};
    nodeList.forEach(n => { m[n.id] = n; });
    return m;
  }, [nodeList]);

  const allChildren = useMemo(() => {
    const m = {};
    flatEdges.forEach(e => {
      if (!m[e.source]) m[e.source] = [];
      m[e.source].push(e.target);
    });
    return m;
  }, [flatEdges]);

  const makeInitCollapsed = useCallback(() => {
    const c = new Set();
    Object.keys(allChildren).forEach(id => {
      if (parseInt(id) !== rootId) c.add(parseInt(id));
    });
    return c;
  }, [allChildren, rootId]);

  const [collapsed, setCollapsed] = useState(() => makeInitCollapsed());
  const [hovNode,   setHovNode]   = useState(null);
  const [hovEdge,   setHovEdge]   = useState(null);

  const prevResetKey = useRef(resetKey);
  if (prevResetKey.current !== resetKey) {
    prevResetKey.current = resetKey;
    setCollapsed(makeInitCollapsed());
  }

  const visSet = useMemo(() => {
    const vis = new Set([rootId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const e of flatEdges) {
        if (vis.has(e.source) && !collapsed.has(e.source) && !vis.has(e.target)) {
          vis.add(e.target); changed = true;
        }
      }
    }
    return vis;
  }, [rootId, collapsed, flatEdges]);

  const sentenceOrder = useMemo(() => {
    const m = {};
    nodeList.forEach((n, i) => { m[n.id] = i; });
    return m;
  }, [nodeList]);

  const visNodes = useMemo(() =>
    nodeList.filter(n => visSet.has(n.id)).sort((a, b) => sentenceOrder[a.id] - sentenceOrder[b.id]),
    [nodeList, visSet, sentenceOrder]
  );
  const visEdges = useMemo(() =>
    flatEdges.filter(e => visSet.has(e.source) && visSet.has(e.target)),
    [flatEdges, visSet]
  );

  const { nw, cx, totalW } = useMemo(() => {
    const nw = {}, cx = {};
    let curX = HPAD;
    visNodes.forEach(n => {
      const hasCh = !!(allChildren[n.id]?.length);
      const w = nodeWidth(n, hasCh);
      nw[n.id] = w;
      cx[n.id] = curX + w / 2;
      curX += w + HPAD;
    });
    return { nw, cx, totalW: curX };
  }, [visNodes, allChildren]);

  const colOf = useMemo(() => {
    const m = {};
    visNodes.forEach((n, i) => { m[n.id] = i; });
    return m;
  }, [visNodes]);

  const leveledEdges = useMemo(() =>
    assignLevels(visEdges.map(e => ({ ...e })), colOf),
    [visEdges, colOf]
  );

  const { srcOff, tgtOff } = useMemo(() =>
    computeAttachOffsets(leveledEdges, colOf, allChildren, nodeById),
    [leveledEdges, colOf, allChildren, nodeById]
  );

  const maxArcH  = leveledEdges.length ? Math.max(...leveledEdges.map(e => e._arcH)) : 0;
  const arcAreaH = maxArcH + ARC_PAD;
  const tokenY   = arcAreaH;
  const totalH   = arcAreaH + TH + (showIds ? 22 : 12);

  let depIdx = 0, cxnIdx = 0;

  const accentColor = segmentIndex % 2 === 0 ? "#4a2c8a" : "#15803d";
  const headerBg    = segmentIndex % 2 === 0 ? "#f5f3ff" : "#f0fdf4";
  const headerBd    = segmentIndex % 2 === 0 ? "#ddd6fe" : "#bbf7d0";

  return (
    <div style={{ marginBottom: 0 }}>
      <div style={{
        display:"flex", alignItems:"center", gap:8, flexWrap:"wrap",
        padding:"5px 14px", background:headerBg, borderBottom:`1px solid ${headerBd}`,
        fontSize:10, fontWeight:700, letterSpacing:.5, color:accentColor,
      }}>
        <span>SEG {segId}</span>
        {sentence && (
          <span style={{ fontSize:11, fontWeight:"normal", color:"#475569" }}>{sentence}</span>
        )}
      </div>

      <div style={{ overflowX:"auto", background:"#fff", padding:"8px 0 10px 0" }}>
        <svg
          width={Math.max(totalW, 320)} height={totalH}
          viewBox={`0 0 ${Math.max(totalW, 320)} ${totalH}`}
          style={{ display:"block", fontFamily:"'Segoe UI',Arial,sans-serif", overflow:"visible" }}
          onMouseLeave={() => { setHovNode(null); setHovEdge(null); }}
        >
          {/* Arcs */}
          {leveledEdges.map((edge, ei) => {
            const x1 = cx[edge.source], x2 = cx[edge.target];
            if (x1 === undefined || x2 === undefined) return null;
            const isCxnEdge = edge.isCxnEdge;
            const color = isCxnEdge
              ? CXN_COLORS[(cxnIdx++) % CXN_COLORS.length]
              : DEP_COLORS[(depIdx++) % DEP_COLORS.length];
            const arcTopY = tokenY - edge._arcH;
            const ax1 = x1 + srcOff[ei];
            const ax2 = x2 + tgtOff[ei];
            const dir = ax2 >= ax1 ? 1 : -1;
            const pathD = [
              `M ${ax1} ${tokenY}`,
              `L ${ax1} ${arcTopY + R}`,
              `Q ${ax1} ${arcTopY} ${ax1 + R * dir} ${arcTopY}`,
              `L ${ax2 - R * dir} ${arcTopY}`,
              `Q ${ax2} ${arcTopY} ${ax2} ${arcTopY + R}`,
              `L ${ax2} ${tokenY - 12}`,
            ].join(" ");
            const lbl = edge.label || edge.relation || "";
            const lw  = Math.max(lbl.length * 6.5 + 10, 24);
            const lh  = 15;
            const lx  = (ax1 + ax2) / 2;
            const ly  = arcTopY;
            const hov    = hovEdge === ei;
            const nodeHl = hovNode !== null && (hovNode === edge.source || hovNode === edge.target);
            const dimmed = (hovNode !== null || hovEdge !== null) && !hov && !nodeHl;
            return (
              <g key={`arc-${edge.source}-${edge.target}-${ei}`}
                style={{ opacity: dimmed ? 0.07 : 1, transition:"opacity 0.12s" }}
                onMouseEnter={() => setHovEdge(ei)}
                onMouseLeave={() => setHovEdge(null)}>
                <path d={pathD} fill="none" stroke="transparent" strokeWidth={12} />
                <path d={pathD} fill="none" stroke={color}
                  strokeWidth={isCxnEdge ? 1.5 : 2}
                  strokeDasharray={isCxnEdge ? "5 3" : undefined} />
                <polygon
                  points={`${ax2-4},${tokenY-12} ${ax2+4},${tokenY-12} ${ax2},${tokenY}`}
                  fill={color} />
                {lbl && <>
                  <rect x={lx-lw/2} y={ly-lh/2} width={lw} height={lh}
                    rx={3} fill={isCxnEdge ? "#f5f0ff" : "white"} stroke={color} strokeWidth={1} />
                  <text x={lx} y={ly+1}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={9.5} fontFamily="'Courier New',monospace"
                    fontStyle={isCxnEdge ? "italic" : "normal"}
                    fill={color} style={{ pointerEvents:"none" }}>
                    {lbl}
                  </text>
                </>}
              </g>
            );
          })}

          {/* Tokens */}
          {visNodes.map(node => {
            const x      = cx[node.id];
            const tw     = nw[node.id];
            const isRoot = node.id === rootId;
            const hasCh  = !!(allChildren[node.id]?.length);
            const isCol  = collapsed.has(node.id);
            const isCxn  = node.isCxn;
            const displayText = nodeDisplayName(node);
            const connected = hovNode !== null && flatEdges.some(e =>
              (e.source === hovNode && e.target === node.id) ||
              (e.target === hovNode && e.source === node.id));
            const dimmed = hovNode !== null && hovNode !== node.id && !connected;

            let fill = "white", stroke = "#c0aee0", sw = 1.5, dash = undefined;
            if (isRoot) { stroke = "#4a2c8a"; sw = 2.5; }
            if (isCol)  { fill = "#fff8ee"; stroke = "#cc8800"; sw = 2; }
            if (isCxn)  { fill = "#ede8ff"; stroke = "#7733bb"; sw = 2; dash = "5 3"; }

            let textFill = "#222", fw = "normal";
            if (isRoot) { textFill = "#4a2c8a"; fw = "700"; }
            if (isCxn)  { textFill = "#5a1aaa"; fw = "700"; }
            if (isCol)  { textFill = "#994400"; fw = "700"; }

            const badgeFill = isCol ? "#cc8800" : (isCxn ? "#7733bb" : "#4a2c8a");
            const badgeChar = isCol ? "+" : "−";

            return (
              <g key={`tok-${node.id}`}
                style={{ cursor: hasCh ? "pointer" : "default", opacity: dimmed ? 0.12 : 1, transition:"opacity 0.12s" }}
                onMouseEnter={() => setHovNode(node.id)}
                onMouseLeave={() => setHovNode(null)}
                onClick={e => {
                  e.stopPropagation();
                  if (!hasCh) return;
                  setCollapsed(prev => {
                    const next = new Set(prev);
                    if (next.has(node.id)) next.delete(node.id); else next.add(node.id);
                    return next;
                  });
                }}>
                <rect x={x-tw/2+2} y={tokenY} width={tw-4} height={TH} rx={5}
                  fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={dash} />
                <text x={x} y={tokenY+TH/2}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={12} fontWeight={fw} fill={textFill}
                  style={{ userSelect:"none", pointerEvents:"none" }}>
                  {displayText}
                </text>
                {hasCh && (
                  <text x={x+tw/2-8} y={tokenY+8}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={13} fontWeight="700" fill={badgeFill}
                    style={{ userSelect:"none", pointerEvents:"none" }}>
                    {badgeChar}
                  </text>
                )}
                {showIds && (
                  <text x={x} y={tokenY+TH+4}
                    fontSize={9} fill="#aaa"
                    textAnchor="middle" dominantBaseline="hanging"
                    style={{ pointerEvents:"none" }}>
                    {node.id}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ─── GraphPanel — toolbar + SegmentView renderer ─────────────────────────────
function GraphPanel({ usrText }) {
  const [showIds,  setShowIds]  = useState(false);
  const [scale,    setScale]    = useState(1.0);
  const [resetKey, setResetKey] = useState(0);

  const parsedSegments = useMemo(() => {
    if (!usrText) return [];
    return splitSegments(usrText)
      .map(raw => { try { const p = parseUSR(raw); return p.nodes.length ? p : null; } catch { return null; } })
      .filter(Boolean);
  }, [usrText]);

  const btnSt = {
    background:"#f0ecff", color:"#4a2c8a", border:"1px solid #c0aee0",
    padding:"3px 11px", borderRadius:12, cursor:"pointer", fontSize:11.5,
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%" }}>
      {parsedSegments[0]?.sentence && (
        <div style={{ padding:"7px 14px", fontSize:12, color:"#2d1f55", borderBottom:"1px solid #e8e4f5", background:"#faf9ff", fontStyle:"italic", lineHeight:1.5 }}>
          "{parsedSegments[0].sentence}"
        </div>
      )}
      <div style={{ padding:"5px 10px", display:"flex", gap:5, alignItems:"center", background:"white", borderBottom:"1px solid #eee", flexWrap:"wrap" }}>
        <button style={btnSt} onClick={() => setResetKey(k => k + 1)}>Expand All</button>
        <button style={btnSt} onClick={() => setResetKey(k => k + 1)}>Collapse All</button>
        <button style={btnSt} onClick={() => setScale(s => Math.min(s + 0.15, 2.5))}>＋ Zoom</button>
        <button style={btnSt} onClick={() => setScale(s => Math.max(s - 0.15, 0.35))}>－ Zoom</button>
        <label style={{ color:"#555", fontSize:11, marginLeft:3, display:"flex", alignItems:"center", gap:3 }}>
          <input type="checkbox" checked={showIds} onChange={e => setShowIds(e.target.checked)} /> IDs
        </label>
        <span style={{ marginLeft:"auto", fontSize:10, color:"#aaa" }}>{Math.round(scale*100)}%</span>
      </div>
      <div style={{ flex:1, overflow:"auto", background:"#fafafa" }}>
        {parsedSegments.length === 0
          ? <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:140, color:"#bbb", fontSize:13 }}>No USR loaded</div>
          : <div style={{ transform:`scale(${scale})`, transformOrigin:"top left" }}>
              {parsedSegments.map((seg, idx) => (
                <SegmentView key={`${seg.segId}-${idx}-${resetKey}`}
                  data={seg} segmentIndex={idx} showIds={showIds} resetKey={resetKey} />
              ))}
            </div>
        }
      </div>
    </div>
  );
}

// ─── Demo content ─────────────────────────────────────────────────────────────
const DEMO_SENTENCES = [
  {
    name: "Normal",
    label: "Since-clause sentence",
    usr: `<segment_id=chapter2_001>
#Since the beginning of civilisation , humans have tried to classify living organisms .
beginning_1\t3\t-\t-\t9:with_since\t-\t-\t-\t-
civilisation_1\t5\t-\t-\t3:r6\t-\t-\t-\t-
human_1\t7\tpl\t-\t9:k1\t-\t-\t-\t-
try_1-tried_have_1\t9\t-\t-\t0:main\t-\t-\t-\t-
classify_1\t11\t-\t-\t9:k2\t-\t-\t-\t-
live_1\t12\t-\t-\t13:mod\t-\t-\t-\t-
organism_1\t13\tpl\t-\t11:k2\t-\t-\t-\t-
%affirmative
</segment_id>`,
    explanation: "A real biology textbook sentence. 'beginning' attaches to the main verb 'try' via a with_since (temporal/causal) arc. Humans are the subject (k1) who tried (k2) to classify living organisms.",
    tips: [
      "'with_since' = temporal-causal link: 'since the beginning …'",
      "r6 = 'of' relation: civilisation is of the beginning",
      "mod links 'living' → 'organisms' (living organisms)",
      "k2 appears twice: classify is the k2 of try; organisms is the k2 of classify",
    ],
    highlight: "with_since arc and nested k2 chain",
  },
  {
    name: "Complex",
    label: "Parataxis + they (wyax)",
    usr: `<segment_id=chapter2_002>
#Early classifications were not scientific ; they were based on practical needs such as food , shelter , and clothing .
Early_1\t1\t-\t-\t3:mod\t-\t-\t-\t-
classification_1\t2\tpl\t-\t5:k1\t-\t-\t-\t-
be_1-ed_1\t3\tpl\t-\t0:main\t-\t-\t-\t-
not_1\t4\t-\t-\t5:krvn\t-\t-\t-\t-
scientific_1\t5\t-\t-\t3:k1s\t-\t-\t-\t-
$wyax\t7\tpl\t-\t9:k2\tchapter2_002.2:coref\t-\t-\t-
base_1\t9\t-\t-\t5:parataxis\t-\t-\t-\t-
practical_1\t11\t-\t-\t12:mod\t-\t-\t-\t-
need_1\t12\tpl\t-\t9:k7\t-\t-\t-\t-
food_1\t15\t-\t-\t-\t-\t-\t-\t21:op1
shelter_1\t17\t-\t-\t-\t-\t-\t-\t21:op2
clothing_1\t20\t-\t-\t-\t-\t-\t-\t21:op3
[conj_1]\t21\t-\t-\t12:nmod_such_as\t-\t-\t-\t-
%affirmative
</segment_id>`,
    explanation: "'they' is resolved from $wyax because it carries a cross-sentence coreference (chapter2_002.2:coref) and is marked plural (pl). [conj_1] groups food, shelter, clothing as a conjunction phrase with nmod_such_as.",
    tips: [
      "$wyax + plural morpho + dotted coref → resolved to 'they'",
      "parataxis links the second clause '; they were based …' to the first",
      "k1s = subject-predicate: 'classifications were scientific' (negated by krvn)",
      "Click [conj_1] to expand and see all three listed items (op1/op2/op3)",
      "nmod_such_as = 'needs such as food, shelter, clothing'",
    ],
    highlight: "$wyax→they resolution and [conj_1] construction",
  },
];

const STEPS = [
  {
    title: "Real Textbook USR",
    subtitle: "Biology Chapter 2 — two actual sentences",
    body: "These are real USR annotations from a biology textbook. Unlike toy examples, they contain nuanced relations like with_since, parataxis, and cross-sentence coreference. Let's walk through both.",
    demoIdx: 0,
    icon: "⬡",
  },
  {
    title: "Root & Temporal Clause",
    subtitle: "'try' is the main verb; 'since' introduces time context",
    body: "The root node 'try' is the anchor. 'beginning' attaches via with_since — a temporal-causal arc. 'Of civilisation' hangs below beginning via r6. Humans (k1) tried (k2) to classify (k2) living organisms.",
    demoIdx: 0,
    icon: "◉",
  },
  {
    title: "Nested k2 Chain",
    subtitle: "Object of an object",
    body: "Notice k2 appears twice: 'classify' is the k2 (object) of 'try', and 'organisms' is the k2 of 'classify'. This expresses the structure 'tried [to classify [living organisms]]' — a deeply nested object chain.",
    demoIdx: 0,
    icon: "⌒",
  },
  {
    title: "Pronoun: $wyax → they",
    subtitle: "Cross-sentence coreference, plural",
    body: "In the complex sentence, '$wyax' has the coref field 'chapter2_002.2:coref' and morpho 'pl'. The visualizer resolves this automatically: plural + coreference → 'they' (subject) or 'them' (object). Here it's the k2 of 'base', so it shows 'they'.",
    demoIdx: 1,
    icon: "⇢",
  },
  {
    title: "Parataxis & k1s",
    subtitle: "Two clauses, one semicolon",
    body: "'parataxis' links the second clause ('they were based…') to the first clause at the predicate level. 'k1s' marks the subject-predicate relationship (classifications were scientific), negated by 'krvn' (not).",
    demoIdx: 1,
    icon: "⧟",
  },
  {
    title: "Construction: [conj_1]",
    subtitle: "food, shelter, and clothing grouped",
    body: "[conj_1] is a conjunction construction node grouping three items: food (op1), shelter (op2), clothing (op3). It attaches to 'need' via nmod_such_as. Click the node in the graph to expand and collapse the group.",
    demoIdx: 1,
    icon: "⬡",
  },
  {
    title: "You're Ready",
    subtitle: "All real-corpus features covered",
    body: "You've seen with_since, r6, nested k2, $wyax plural resolution, parataxis, k1s, krvn, [conj_1] construction nodes, and op1/op2/op3 listing. The visualizer handles all of these through the exact same parsing pipeline.",
    demoIdx: 1,
    icon: "✓",
  },
];

// ─── Main USRGraphDemo ────────────────────────────────────────────────────────
const USRGraphDemo = ({ onClose, onComplete }) => {
  const [step,      setStep]      = useState(0);
  const [activeTab, setActiveTab] = useState(0);

  const currentStep = STEPS[step];
  const demoIdx     = currentStep.demoIdx ?? 0;

  const prevStep = useRef(step);
  if (prevStep.current !== step) {
    prevStep.current = step;
    setActiveTab(demoIdx);
  }

  const activeSentence = DEMO_SENTENCES[activeTab];
  const isLast = step === STEPS.length - 1;

  const handleNext = () => {
    if (isLast) { if (onComplete) onComplete(); onClose(); }
    else setStep(s => s + 1);
  };

  const S = {
    overlay: {
      position:"fixed", inset:0,
      background:"rgba(14,9,32,0.90)",
      backdropFilter:"blur(5px)",
      zIndex:20000,
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:14,
    },
    shell: {
      background:"#fff", borderRadius:16,
      width:"min(1380px,98vw)", height:"min(880px,95vh)",
      display:"flex", flexDirection:"column",
      boxShadow:"0 28px 90px rgba(0,0,0,.55)",
      overflow:"hidden",
    },
    header: {
      background:"linear-gradient(128deg,#311569,#5533a8)",
      color:"white", padding:"13px 20px",
      display:"flex", justifyContent:"space-between", alignItems:"center",
      flexShrink:0,
    },
    body: {
      flex:1, display:"flex", overflow:"hidden",
    },
    leftPanel: {
      flex:"0 0 360px", borderRight:"1px solid #e8e4f6",
      display:"flex", flexDirection:"column", overflow:"hidden",
      background:"#faf8ff",
    },
    rightPanel: {
      flex:1, display:"flex", flexDirection:"column", overflow:"hidden",
    },
    footer: {
      padding:"11px 20px", borderTop:"1px solid #ede9f8",
      display:"flex", justifyContent:"space-between", alignItems:"center",
      flexShrink:0, background:"#faf8ff",
    },
  };

  return (
    <div style={S.overlay}>
      <div style={S.shell}>

        {/* Header */}
        <div style={S.header}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ fontSize:24, opacity:.8, lineHeight:1 }}>{currentStep.icon}</div>
            <div>
              <div style={{ fontSize:16, fontWeight:700, letterSpacing:.2 }}>{currentStep.title}</div>
              <div style={{ fontSize:11, opacity:.72, marginTop:2 }}>{currentStep.subtitle}</div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <span style={{ fontSize:11, opacity:.6 }}>Step {step+1} / {STEPS.length}</span>
            <button
              onClick={() => { if (window.confirm("Exit the demo?")) onClose(); }}
              style={{ background:"rgba(255,255,255,.15)", border:"none", borderRadius:8,
                padding:"6px 13px", cursor:"pointer", color:"white", fontSize:14 }}>
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={S.body}>

          {/* Left: explanation */}
          <div style={S.leftPanel}>
            <div style={{ padding:"16px 18px", borderBottom:"1px solid #ede9f8" }}>
              <p style={{ margin:0, fontSize:13, lineHeight:1.75, color:"#2d1f55" }}>
                {currentStep.body}
              </p>
            </div>

            <div style={{ padding:"14px 18px", flex:1, overflow:"auto" }}>
              <div style={{ fontSize:10.5, fontWeight:700, color:"#7c5cbf", textTransform:"uppercase",
                letterSpacing:.9, marginBottom:8 }}>
                About this example
              </div>
              <div style={{ fontSize:12, color:"#3d2860", lineHeight:1.7, marginBottom:16 }}>
                {activeSentence.explanation}
              </div>

              <div style={{ fontSize:10.5, fontWeight:700, color:"#7c5cbf", textTransform:"uppercase",
                letterSpacing:.9, marginBottom:8 }}>
                Key things to notice
              </div>
              <ol style={{ margin:0, paddingLeft:17, fontSize:12, color:"#3d2860", lineHeight:1.85 }}>
                {activeSentence.tips.map((t, i) => <li key={i}>{t}</li>)}
              </ol>

              {/* Focused highlight badge */}
              <div style={{ marginTop:18, padding:"9px 13px", background:"#f0ebff",
                borderLeft:"3px solid #7c5cbf", borderRadius:6, fontSize:11.5, color:"#5a1aaa" }}>
                <strong>Focus:</strong> {activeSentence.highlight}
              </div>
            </div>

            {/* Progress */}
            <div style={{ padding:"10px 18px", display:"flex", gap:5, borderTop:"1px solid #ede9f8", alignItems:"center" }}>
              {STEPS.map((_, i) => (
                <div key={i} onClick={() => setStep(i)}
                  style={{ width:i===step?24:8, height:8, borderRadius:4,
                    background:i===step?"#5533a8":"#d4c9f0",
                    cursor:"pointer", transition:"all .22s" }} />
              ))}
            </div>
          </div>

          {/* Right: live graph */}
          <div style={S.rightPanel}>
            {/* Tabs */}
            <div style={{ display:"flex", gap:0, borderBottom:"1px solid #e8e4f6", background:"#f5f3ff", flexShrink:0 }}>
              {DEMO_SENTENCES.map((s, i) => (
                <button key={i} onClick={() => setActiveTab(i)}
                  style={{
                    padding:"9px 20px", border:"none",
                    borderBottom: i===activeTab ? "2.5px solid #5533a8" : "2.5px solid transparent",
                    background:"transparent", cursor:"pointer", fontSize:12.5,
                    color: i===activeTab ? "#311569" : "#8070b0",
                    fontWeight: i===activeTab ? 700 : 400,
                    transition:"all .15s",
                  }}>
                  {s.name}
                  <span style={{ marginLeft:6, fontSize:10, color: i===activeTab ? "#7c5cbf":"#bbaee0" }}>
                    {s.label}
                  </span>
                </button>
              ))}
              {activeTab === demoIdx && (
                <div style={{ marginLeft:"auto", padding:"9px 14px", fontSize:10.5, color:"#7c5cbf",
                  display:"flex", alignItems:"center", gap:5 }}>
                  <span style={{ width:7, height:7, borderRadius:"50%", background:"#5533a8",
                    display:"inline-block" }} />
                  Suggested for this step
                </div>
              )}
            </div>

            {/* Graph */}
            <div style={{ flex:1, overflow:"hidden" }}>
              <GraphPanel key={activeTab} usrText={activeSentence.usr} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={S.footer}>
          <button onClick={() => setStep(s => Math.max(0,s-1))}
            disabled={step===0}
            style={{ padding:"8px 22px", background:step===0?"#f2f0fa":"#ede8ff",
              color:step===0?"#c0b8dc":"#4a2c8a", border:"1px solid",
              borderColor:step===0?"#e0dcf0":"#b8a8e0",
              borderRadius:10, cursor:step===0?"not-allowed":"pointer",
              fontWeight:600, fontSize:13 }}>
            ← Back
          </button>

          <div style={{ fontSize:11, color:"#9988bb" }}>
            {step+1} of {STEPS.length}
          </div>

          <button onClick={handleNext}
            style={{ padding:"8px 28px",
              background:"linear-gradient(128deg,#311569,#5533a8)",
              color:"white", border:"none", borderRadius:10,
              cursor:"pointer", fontWeight:700, fontSize:13,
              boxShadow:"0 3px 14px rgba(74,44,138,.38)" }}>
            {isLast ? "Open Visualizer 🚀" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default USRGraphDemo;