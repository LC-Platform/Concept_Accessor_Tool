// import React, { useState, useMemo, useCallback } from 'react';

// // ─── Exact maps from usr_visualizer.py ───────────────────────────────────────

// const DEPENDENCY_TO_WH = {
//   "k1": "What/Who",
//   "k2": "What/Whom",
//   "k7": "about",
//   "k7t": "When",
//   "k7p": "Where",
//   "krvn": "How",
//   "k5": "From where",
//   "k2p": "To where",
//   "rt": "purpose",
//   "rh": "reason",
//   "ru": "Like what",
//   "k3": "With what",
//   "rv": "Compared to what",
//   "rprop": "over",
//   "mod": "Modifier",
//   "quant": "Quantity",
//   "quantmore": "more than",
//   "quantless": "less than",
//   "r6": "Of",
//   "freq": "how often",
//   "rkl": "before/after",
//   "kriyaMUla": "Root Verb",
//   "verbalizer": "Verbalizer",
//   "rbks": "mod",
//   "rvks": "mod",
//   "rreason": "because",
//   "begin": "begin",
//   "inside": "inside",
//   "end": "end",
//   "head": "head",
// };

// const TAM_MAPPING = {
//   "yA_WA_2": "had",
//   "nA_cAhie_4": "must",
//   "nA_hE_1": "have_to",
//   "past": "was",
//   "yA_1": "ed",
//   "0_gayA_1": "went",
//   "0_xiyA_1": "gave",
//   "0_sakA_1": "could",
//   "yA_WA_1": "did",
//   "yA_hE_2": "is_being",
//   "wA_hE_1": "is",
//   "0_rahA_hogA_1": "will_have_been",
//   "pres": "is",
//   "wA_WA_1": "used_to",
//   "0_jAwA_WA_1": "used_to_go",
//   "gA_2": "would",
//   "o_1": "should",
//   "o_2": "must",
//   "nA_hE_2": "have_to",
//   "nA_hogA_1": "must",
//   "nA_cAhie_2": "must",
//   "nA_cAhie_1": "should",
//   "0_sakawA_hE_3": "may",
//   "nA_padZawA_hE_1": "have_to",
//   "nA_padZawA_WA_1": "had_to",
//   "nA_padZA_1": "had_to",
//   "yA_gayA_WA_1": "was",
//   "0_cukA_hE_1": "have",
//   "AI_xI_1": "",
//   "0_cukA_WA_1": "had",
//   "0_gayA_WA_1": "had_gone",
//   "0_rahA_hE_2": "has_been",
//   "yA_gayA_hE_2": "has_been",
//   "0_rahA_WA_2": "had_been",
//   "0_cukA_hogA_1": "will_have",
//   "yA_gayA_1": "got",
//   "wA_rahawA_hE_1": "keeps",
//   "0_rahA_wA_1": "was",
//   "0_rahA_hE_1": "is",
//   "yA_jAyegA_1": "will_be",
//   "gA_1": "will",
//   "0_rahA_hogA_2": "shall_be",
//   "yA_hogA_1": "will_have",
//   "nA_cAhie_3": "have_to",
//   "nA_padZawA_hE_2": "must",
//   "nA_padZA_2": "must",
//   "nA_padZawA_WA_2": "have_to",
//   "nA_padZegA_1": "had_to",
//   "yA_hogA_2": "had_to",
//   "0_sakawA_1": "will_have_to",
//   "0_sakawA_WA_1": "might_have",
//   "0_sakawA_hE_1": "can",
//   "0_sakawA_hE_2": "could",
//   "yA_gayA_WA_2": "could",
//   "yA_jAwA_WA_1": "might",
//   "yA_jAwA_hE_1": "could",
//   "yA_gayA_hE_1": "can",
//   "yA_hE_1": "was",
//   "yA_hogA_3": "was",
//   "yAw_1": "had_been",
//   "aw_1": "is",
//   "awi_4": "are",
//   "a_1": "has",
//   "Iw_1": "must_have",
//   "wA_1": "will",
//   "syaw_1": "ed",
//   "syawi_1": "ed",
//   "awu_1": "ed",
//   "ew_1": "should",
// };

// // ─── Colors — exact from Python ───────────────────────────────────────────────
// const DEP_COLORS = ["#2255cc","#1a8833","#cc2222","#996600","#006688","#884411","#aa3377","#337755"];
// const CXN_COLORS = ["#7733bb","#9944cc","#5522aa","#bb55dd","#6633aa","#8844bb"];

// // ─── Layout constants — exact from Python ─────────────────────────────────────
// const TH        = 30;
// const HPAD      = 16;
// const ARC_STEP  = 30;
// const ARC_PAD   = 14;
// const R         = 6;
// const ARC_NUDGE = 12;

// // ─── extractTam — exact Python logic ─────────────────────────────────────────
// function extractTam(wordRaw) {
//   const w = wordRaw.replace(/^[$[\]]+/, "");
//   const dash = w.indexOf("-");
//   if (dash < 0) return null;
//   const cand = w.slice(dash + 1);
//   if (TAM_MAPPING[cand] !== undefined) return TAM_MAPPING[cand] || cand;
//   return cand;
// }

// // ─── resolveWyax — exact Python logic ────────────────────────────────────────
// function resolveWyax(node) {
//   const base = (node.name || "").toLowerCase();
//   if (base !== "wyax" && base !== "yax") return null;
//   const rel = (node.relation || "").toLowerCase();
//   const sv  = (node.speakerView || "").toLowerCase();
//   if (node.corefRef != null) {
//     const isSubj = rel === "k1" || rel.startsWith("k1")
//                 || rel === "pk1" || rel === "jk1" || rel === "mk1";
//     return isSubj ? "he/she/it" : "him/her/it";
//   }
//   if (rel === "dem") return sv === "proximal" ? "this" : "that";
//   if (sv === "proximal") return "this";
//   if (sv === "distal")   return "that";
//   return null;
// }

// function nodeDisplayName(node) { return resolveWyax(node) || node.name; }

// function nodeWidth(node, hasChildren) {
//   const text = nodeDisplayName(node);
//   return Math.max(80, text.length * 7.5 + 20 + (hasChildren ? 18 : 0));
// }

// // ─── parseUSR — exact Python parse_usr + build_graph ─────────────────────────
// function parseUSR(text) {
//   let segId = "—", sentence = "";
//   const segMatch  = text.match(/<segment_id=([^>]+)>/);
//   if (segMatch) segId = segMatch[1].trim();
//   const sentMatch = text.match(/^#(.+)/m);
//   if (sentMatch) sentence = sentMatch[1].trim();

//   const lines = text.split("\n").map(l => l.trim()).filter(l =>
//     l && !l.startsWith("#") && !l.startsWith("<") && !l.startsWith("%")
//   );

//   const nodes    = {};
//   const children = {};

//   for (const line of lines) {
//     const parts = line.split("\t");
//     if (parts.length < 5) continue;

//     const wordRaw           = parts[0];
//     const nodeId            = parseInt(parts[1]);
//     if (isNaN(nodeId)) continue;

//     const morpho_semantic   = (parts[2] || "-").trim();
//     const semantic_category = (parts[3] || "-").trim();
//     const relField          = parts[4].trim();
//     const col5              = parts.length > 5 ? parts[5].trim() : "";
//     // compField = parts[-1] if len(parts) >= 9 else ""
//     const compField         = parts.length >= 9 ? parts[parts.length - 1].trim() : "";

//     const isGroup = wordRaw.startsWith("[") && wordRaw.endsWith("]");

//     let parentId = null, relation = "";
//     if (relField.includes(":")) {
//       const idx = relField.indexOf(":");
//       const pid = parseInt(relField.slice(0, idx));
//       if (!isNaN(pid)) { parentId = pid; relation = relField.slice(idx + 1); }
//     }

//     const tam = extractTam(wordRaw);

//     const rawBase = wordRaw.replace(/^[$[\]]+/, "").split("_")[0].toLowerCase();
//     let speakerView = "", corefRef = null;
//     if (rawBase === "wyax" || rawBase === "yax") {
//       const sv    = col5.toLowerCase();
//       const col6v = parts.length > 6 ? parts[6].trim().toLowerCase() : "";
//       if      (col6v === "proximal" || col6v === "prox") speakerView = "proximal";
//       else if (col6v === "distal")                       speakerView = "distal";
//       else if (sv === "proximal" || sv === "prox")       speakerView = "proximal";
//       else if (sv === "distal")                          speakerView = "distal";
//       else if (sv.includes(":")) {
//         const ref = parseInt(sv.split(":")[0]);
//         if (!isNaN(ref)) corefRef = ref;
//       }
//     }

//     // Group nodes: keep full name "ne_1" etc; Normal nodes: base word only
//     const name = isGroup
//       ? wordRaw.replace(/[$[\]]/g, "")
//       : wordRaw.replace(/[$[\]]/g, "").split("_")[0];

//     nodes[nodeId] = {
//       id: nodeId, name,
//       parent: (parentId === 0 || parentId === null) ? null : parentId,
//       relation, isGroup, isCxn: isGroup,
//       tam, speakerView, corefRef,
//       morpho_semantic, semantic_category,
//     };

//     if (parentId !== null && parentId !== 0) {
//       if (!children[parentId]) children[parentId] = [];
//       children[parentId].push(nodeId);
//     }

//     // Component field: "7:begin" → node belongs to group node 7
//     if (compField.includes(":")) {
//       const ci = compField.indexOf(":");
//       const cp = parseInt(compField.slice(0, ci));
//       const cr = compField.slice(ci + 1);
//       if (!isNaN(cp)) {
//         if (!children[cp]) children[cp] = [];
//         if (!children[cp].includes(nodeId)) children[cp].push(nodeId);
//         if (nodes[nodeId].parent === null) {
//           nodes[nodeId].parent   = cp;
//           nodes[nodeId].relation = cr;
//         }
//       }
//     }
//   }

//   // build_graph: all nodes visible, build edges directly
//   const edgeSet   = new Set();
//   const flatEdges = [];
//   for (const [pid, childList] of Object.entries(children)) {
//     const parentId = parseInt(pid);
//     if (parentId === 0) continue;
//     for (const cid of childList) {
//       const rel = nodes[cid]?.relation || "";
//       const key = `${parentId}-${cid}-${rel}`;
//       if (!edgeSet.has(key)) {
//         edgeSet.add(key);
//         const srcCxn = nodes[parentId]?.isCxn || false;
//         const tgtCxn = nodes[cid]?.isCxn      || false;
//         flatEdges.push({
//           source: parentId, target: cid, relation: rel,
//           label: DEPENDENCY_TO_WH[rel] || rel,
//           isCxnEdge: srcCxn || tgtCxn,
//         });
//       }
//     }
//   }

//   // Find root — exact Python
//   let rootId = null;
//   for (const node of Object.values(nodes)) {
//     if (node.relation === "main" || node.parent === null) { rootId = node.id; break; }
//   }
//   if (rootId === null && Object.keys(nodes).length)
//     rootId = Math.min(...Object.keys(nodes).map(Number));

//   const nodeList = Object.values(nodes).sort((a, b) => a.id - b.id);
//   return { nodes: nodeList, edges: flatEdges, root: rootId, sentence, segId };
// }

// // ─── Segment splitter ─────────────────────────────────────────────────────────
// function splitSegments(text) {
//   if (!text) return [];
//   const segs = [];
//   const re = /<(?:segment_id|sent_id)=([^>]+)>([\s\S]*?)<\/(?:segment_id|sent_id)>/g;
//   let m;
//   while ((m = re.exec(text)) !== null) segs.push(m[0]);
//   if (!segs.length) segs.push(text);
//   return segs;
// }

// // ─── Arc layout — exact Python assignLevels ───────────────────────────────────
// function assignLevels(edges, colOf) {
//   const sorted = [...edges].sort((a, b) =>
//     Math.abs(colOf[a.source] - colOf[a.target]) - Math.abs(colOf[b.source] - colOf[b.target])
//   );
//   sorted.forEach(e => {
//     const span  = Math.abs(colOf[e.source] - colOf[e.target]);
//     const left  = Math.min(colOf[e.source], colOf[e.target]);
//     const right = Math.max(colOf[e.source], colOf[e.target]);
//     let h = Math.max(span, 1) * ARC_STEP;
//     let conflicts = (h) => sorted.some(o => {
//     if (o === e || o._arcH === undefined) return false;
//     const ol  = Math.min(colOf[o.source], colOf[o.target]);
//     const or_ = Math.max(colOf[o.source], colOf[o.target]);
//     return ol < right && or_ > left && o._arcH === h;
//   });
//   while (conflicts(h)) h += ARC_NUDGE;
//     e._arcH = h;
//   });
//   return sorted;
// }

// // ─── computeAttachOffsets — exact Python ──────────────────────────────────────
// function computeAttachOffsets(edges, colOf, allChildren, nodeById) {
//   const byNode = {};
//   edges.forEach((e, i) => {
//     [e.source, e.target].forEach(nid => {
//       if (!byNode[nid]) byNode[nid] = [];
//       byNode[nid].push(i);
//     });
//   });
//   const srcOff = new Array(edges.length).fill(0);
//   const tgtOff = new Array(edges.length).fill(0);
//   Object.entries(byNode).forEach(([nid, idxList]) => {
//     const n = idxList.length; if (n <= 1) return;
//     const nidInt = parseInt(nid);
//     const hasCh  = !!(allChildren[nidInt]?.length);
//     const tw     = nodeWidth(nodeById[nidInt] || { name:"", id:0 }, hasCh);
//     const maxSpread = (tw - 16) / 2;
//     const step      = (2 * maxSpread) / (n - 1);
//     idxList.forEach((idx, rank) => {
//       const off = -maxSpread + rank * step;
//       const e   = edges[idx];
//       if (e.source === nidInt) srcOff[idx] = off; else tgtOff[idx] = off;
//     });
//   });
//   return { srcOff, tgtOff };
// }

// // ─── SegmentView ──────────────────────────────────────────────────────────────
// function SegmentView({ data, segmentIndex, showIds, resetKey }) {
//   const { nodes: nodeList, edges: flatEdges, root: rootId, sentence, segId } = data;

//   const nodeById = useMemo(() => {
//     const m = {};
//     nodeList.forEach(n => { m[n.id] = n; });
//     return m;
//   }, [nodeList]);

//   const allChildren = useMemo(() => {
//     const m = {};
//     flatEdges.forEach(e => {
//       if (!m[e.source]) m[e.source] = [];
//       m[e.source].push(e.target);
//     });
//     return m;
//   }, [flatEdges]);

//   // initCollapsed — exact Python: all nodes with children except root
//   const makeInitCollapsed = useCallback(() => {
//     const c = new Set();
//     Object.keys(allChildren).forEach(id => {
//       if (parseInt(id) !== rootId) c.add(parseInt(id));
//     });
//     return c;
//   }, [allChildren, rootId]);

//   const [collapsed, setCollapsed] = useState(() => makeInitCollapsed());
//   const [hovNode,   setHovNode]   = useState(null);
//   const [hovEdge,   setHovEdge]   = useState(null);

//   // Reset collapse state when resetKey changes (Collapse All button)
//   const prevResetKey = React.useRef(resetKey);
//   if (prevResetKey.current !== resetKey) {
//     prevResetKey.current = resetKey;
//     setCollapsed(makeInitCollapsed());
//   }

//   // visibleNodes — exact Python BFS
//   const visSet = useMemo(() => {
//     const vis = new Set([rootId]);
//     let changed = true;
//     while (changed) {
//       changed = false;
//       for (const e of flatEdges) {
//         if (vis.has(e.source) && !collapsed.has(e.source) && !vis.has(e.target)) {
//           vis.add(e.target);
//           changed = true;
//         }
//       }
//     }
//     return vis;
//   }, [rootId, collapsed, flatEdges]);

//   // sentenceOrder = original nodeList order (sorted by id)
//   const sentenceOrder = useMemo(() => {
//     const m = {};
//     nodeList.forEach((n, i) => { m[n.id] = i; });
//     return m;
//   }, [nodeList]);

//   const visNodes = useMemo(() =>
//     nodeList.filter(n => visSet.has(n.id)).sort((a, b) => sentenceOrder[a.id] - sentenceOrder[b.id]),
//     [nodeList, visSet, sentenceOrder]
//   );
//   const visEdges = useMemo(() =>
//     flatEdges.filter(e => visSet.has(e.source) && visSet.has(e.target)),
//     [flatEdges, visSet]
//   );

//   // Column x centers — exact Python
//   const { nw, cx, totalW } = useMemo(() => {
//     const nw = {}, cx = {};
//     let curX = HPAD;
//     visNodes.forEach(n => {
//       const hasCh = !!(allChildren[n.id]?.length);
//       const w = nodeWidth(n, hasCh);
//       nw[n.id] = w;
//       cx[n.id] = curX + w / 2;
//       curX += w + HPAD;
//     });
//     return { nw, cx, totalW: curX };
//   }, [visNodes, allChildren]);

//   // colOf = index in visNodes (used for span calculation, exact Python)
//   const colOf = useMemo(() => {
//     const m = {};
//     visNodes.forEach((n, i) => { m[n.id] = i; });
//     return m;
//   }, [visNodes]);

//   const leveledEdges = useMemo(() =>
//     assignLevels(visEdges.map(e => ({ ...e })), colOf),
//     [visEdges, colOf]
//   );

//   const { srcOff, tgtOff } = useMemo(() =>
//     computeAttachOffsets(leveledEdges, colOf, allChildren, nodeById),
//     [leveledEdges, colOf, allChildren, nodeById]
//   );

//   const maxArcH = leveledEdges.length ? Math.max(...leveledEdges.map(e => e._arcH)) : 0;
//   const arcAreaH = maxArcH + ARC_PAD;
//   const tokenY   = arcAreaH;
//   const totalH   = arcAreaH + TH + (showIds ? 20 : 10);

//   // Color counters cycle per render, dep vs cxn (exact Python)
//   let depIdx = 0, cxnIdx = 0;

//   const accentColor = segmentIndex % 2 === 0 ? "#4a2c8a" : "#15803d";
//   const headerBg    = segmentIndex % 2 === 0 ? "#f5f3ff" : "#f0fdf4";
//   const headerBd    = segmentIndex % 2 === 0 ? "#ddd6fe" : "#bbf7d0";

//   return (
//     <div style={{ marginBottom: 0 }}>
//       <div style={{
//         display:"flex", alignItems:"center", gap:8, flexWrap:"wrap",
//         padding:"5px 14px", background:headerBg, borderBottom:`1px solid ${headerBd}`,
//         fontSize:10, fontWeight:700, letterSpacing:.5, color:accentColor,
//       }}>
//         <span>SEG {segId}</span>
//         {sentence && <span style={{ fontSize:11, fontWeight:"normal", color:"#475569" }}>{sentence}</span>}
//       </div>

//       <div style={{ overflowX:"auto", background:"#fff", padding:"8px 0 10px 0" }}>
//         <svg
//           width={Math.max(totalW, 300)} height={totalH}
//           viewBox={`0 0 ${Math.max(totalW, 300)} ${totalH}`}
//           style={{ display:"block", fontFamily:"'Segoe UI',Arial,sans-serif", overflow:"visible" }}
//           onMouseLeave={() => { setHovNode(null); setHovEdge(null); }}
//         >
//           {/* Arcs — exact Python rendering */}
//           {leveledEdges.map((edge, ei) => {
//             const x1 = cx[edge.source], x2 = cx[edge.target];
//             if (x1 === undefined || x2 === undefined) return null;

//             const isCxnEdge = edge.isCxnEdge;
//             const color = isCxnEdge
//               ? CXN_COLORS[(cxnIdx++) % CXN_COLORS.length]
//               : DEP_COLORS[(depIdx++) % DEP_COLORS.length];

//             const arcTopY = tokenY - edge._arcH;
//             const ax1     = x1 + srcOff[ei];
//             const ax2     = x2 + tgtOff[ei];
//             const dir     = ax2 >= ax1 ? 1 : -1;

//             // Exact Python path
//             const pathD = [
//               `M ${ax1} ${tokenY}`,
//               `L ${ax1} ${arcTopY + R}`,
//               `Q ${ax1} ${arcTopY} ${ax1 + R * dir} ${arcTopY}`,
//               `L ${ax2 - R * dir} ${arcTopY}`,
//               `Q ${ax2} ${arcTopY} ${ax2} ${arcTopY + R}`,
//               `L ${ax2} ${tokenY - 12}`,
//             ].join(" ");

//             const lbl = edge.label || edge.relation || "";
//             const lw  = Math.max(lbl.length * 6.5 + 10, 22);
//             const lh  = 15;
//             const lx  = (ax1 + ax2) / 2;
//             const ly  = arcTopY;

//             const hov    = hovEdge === ei;
//             const nodeHl = hovNode !== null && (hovNode === edge.source || hovNode === edge.target);
//             const dimmed = (hovNode !== null || hovEdge !== null) && !hov && !nodeHl;

//             return (
//               <g key={`arc-${edge.source}-${edge.target}-${ei}`}
//                 style={{ opacity: dimmed ? 0.07 : 1, transition:"opacity 0.12s" }}
//                 onMouseEnter={() => setHovEdge(ei)}
//                 onMouseLeave={() => setHovEdge(null)}>
//                 <path d={pathD} fill="none" stroke="transparent" strokeWidth={12} />
//                 <path d={pathD} fill="none" stroke={color}
//                   strokeWidth={isCxnEdge ? 1.5 : 2}
//                   strokeDasharray={isCxnEdge ? "5 3" : undefined} />
//                 {/* Exact Python arrowhead polygon */}
//                 <polygon
//                   points={`${ax2 - 4},${tokenY - 12} ${ax2 + 4},${tokenY - 12} ${ax2},${tokenY}`}
//                   fill={color} />
//                 {lbl && <>
//                   <rect x={lx - lw/2} y={ly - lh/2} width={lw} height={lh}
//                     rx={3} fill={isCxnEdge ? "#f5f0ff" : "white"}
//                     stroke={color} strokeWidth={1} />
//                   <text x={lx} y={ly + 1}
//                     textAnchor="middle" dominantBaseline="middle"
//                     fontSize={10} fontFamily="'Courier New',monospace"
//                     fontStyle={isCxnEdge ? "italic" : "normal"}
//                     fill={color} style={{ pointerEvents:"none" }}>
//                     {lbl}
//                   </text>
//                 </>}
//               </g>
//             );
//           })}

//           {/* Tokens — exact Python rendering */}
//           {visNodes.map(node => {
//             const x     = cx[node.id];
//             const tw    = nw[node.id];
//             const isRoot = node.id === rootId;
//             const hasCh  = !!(allChildren[node.id]?.length);
//             const isCol  = collapsed.has(node.id);
//             const isCxn  = node.isCxn;
//             const hov    = hovNode === node.id;
//             const displayText = nodeDisplayName(node);

//             const connected = hovNode !== null && flatEdges.some(e =>
//               (e.source === hovNode && e.target === node.id) ||
//               (e.target === hovNode && e.source === node.id));
//             const dimmed = hovNode !== null && hovNode !== node.id && !connected;

//             // Exact Python CSS classes → inline styles
//             let fill = "white", stroke = "#c0aee0", sw = 1.5, dash = undefined;
//             if (isRoot) { stroke = "#4a2c8a"; sw = 2.5; }
//             if (isCol)  { fill = "#fff8ee"; stroke = "#cc8800"; sw = 2; }
//             if (isCxn)  { fill = "#ede8ff"; stroke = "#7733bb"; sw = 2; dash = "5 3"; }

//             let textFill = "#222", fw = "normal";
//             if (isRoot) { textFill = "#4a2c8a"; fw = "700"; }
//             if (isCxn)  { textFill = "#5a1aaa"; fw = "700"; }
//             if (isCol)  { textFill = "#994400"; fw = "700"; }

//             const badgeFill = isCol ? "#cc8800" : (isCxn ? "#7733bb" : "#4a2c8a");
//             const badgeChar = isCol ? "+" : "−";

//             return (
//               <g key={`tok-${node.id}`}
//                 style={{ cursor: hasCh ? "pointer" : "default", opacity: dimmed ? 0.12 : 1, transition:"opacity 0.12s" }}
//                 onMouseEnter={() => setHovNode(node.id)}
//                 onMouseLeave={() => setHovNode(null)}
//                 onClick={e => {
//                   e.stopPropagation();
//                   if (!hasCh) return;
//                   setCollapsed(prev => {
//                     const next = new Set(prev);
//                     if (next.has(node.id)) next.delete(node.id); else next.add(node.id);
//                     return next;
//                   });
//                 }}>
//                 <rect
//                   x={x - tw/2 + 2} y={tokenY} width={tw - 4} height={TH} rx={5}
//                   fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={dash} />
//                 <text
//                   x={x} y={tokenY + TH / 2}
//                   textAnchor="middle" dominantBaseline="middle"
//                   fontSize={12} fontWeight={fw} fill={textFill}
//                   style={{ userSelect:"none", pointerEvents:"none" }}>
//                   {displayText}
//                 </text>
//                 {hasCh && (
//                   <text
//                     x={x + tw/2 - 8} y={tokenY + 8}
//                     textAnchor="middle" dominantBaseline="middle"
//                     fontSize={13} fontWeight="700" fill={badgeFill}
//                     style={{ userSelect:"none", pointerEvents:"none" }}>
//                     {badgeChar}
//                   </text>
//                 )}
//                 {showIds && (
//                   <text
//                     x={x} y={tokenY + TH + 4}
//                     fontSize={9} fill="#aaa"
//                     textAnchor="middle" dominantBaseline="hanging"
//                     style={{ pointerEvents:"none" }}>
//                     {node.id}
//                   </text>
//                 )}
//               </g>
//             );
//           })}
//         </svg>
//       </div>
//     </div>
//   );
// }

// // ─── Main ─────────────────────────────────────────────────────────────────────
// const SAMPLE = `<segment_id=biology_chapter3_plantkingdom_0003>
// #In this chapter, we will study the detailed classification of Kingdom Plantae, which is commonly called the plant kingdom.
// $wyax\t15\t-\t-\t14:dem\tproximal\t-\t-\t-
// chapter_1\t14\t-\t-\t2:k7p\t-\t-\t-\t-
// $speaker\t1\tanim\tpl\t2:k1\t-\t-\t-\t-
// study_1-0_will_1\t2\t-\t-\t0:main\t-\t-\t-\t-
// detailed_1\t3\t-\t-\t4:mod\t-\t-\t-\t-
// classification_1\t4\t-\t-\t2:k2\t-\t-\t-\t-
// Kingdom\t5\t-\t-\t-\t-\t-\t-\t7:begin
// Plantae\t6\t-\t-\t-\t-\t-\t-\t7:inside
// [ne_1]\t7\tne\t-\t4:r6\t-\t-\t-\t-
// $yax\t8\t-\t-\t10:k2\t7:coref\t-\t-\t-
// common_1\t9\t-\t-\t10:vkvn\t-\t-\t-\t-
// call_1-en_is\t10\t-\t-\t7:rcelab\t-\t-\t-\t-
// plant_1\t11\t-\t-\t-\t-\t-\t-\t13:mod
// kingdom_1\t12\t-\t-\t-\t-\t-\t-\t13:head
// [nc_1]\t13\t-\t-\t10:k2s\t-\t-\t-\t-
// %affirmative
// </segment_id>`;

// const btnStyle = {
//   background:"#f0ecff", color:"#4a2c8a", border:"1px solid #c0aee0",
//   padding:"3px 12px", borderRadius:14, cursor:"pointer", fontSize:12,
// };

// function LegendItem({ sw, label }) {
//   return (
//     <div style={{ display:"flex", alignItems:"center", gap:5 }}>
//       <div style={{ width:26, height:14, borderRadius:3, flexShrink:0, ...sw }} />
//       <span>{label}</span>
//     </div>
//   );
// }

// const USRGraphVisualizer = ({ initialText = "" }) => {
//   const [inputText,   setInputText]   = useState(initialText || SAMPLE);
//   const [submitted,   setSubmitted]   = useState(initialText || SAMPLE);
//   const [showInput,   setShowInput]   = useState(!initialText);
//   const [showIds,     setShowIds]     = useState(false);
//   const [scale,       setScale]       = useState(1.0);
//   const [resetKey,    setResetKey]    = useState(0);
//   const [parseError,  setParseError]  = useState("");

//   const parsedSegments = useMemo(() => {
//     if (!submitted) return [];
//     const segs = splitSegments(submitted);
//     const out = [];
//     for (const raw of segs) {
//       try {
//         const p = parseUSR(raw);
//         if (p.nodes.length) out.push(p);
//       } catch(e) {
//         setParseError("Parse error: " + e.message);
//       }
//     }
//     return out;
//   }, [submitted]);

//   const handleVisualize = () => {
//     setParseError("");
//     setScale(1.0);
//     setSubmitted(inputText);
//     setShowInput(false);
//   };

//   return (
//     <div style={{ width:"100%", maxWidth:1500, margin:"0 auto", fontFamily:"'Segoe UI',Arial,sans-serif", background:"#f0f1f8", minHeight:"100vh" }}>
//       {/* Header */}
//       <div style={{
//         background:"linear-gradient(135deg,#4a2c8a,#6a3fc0)", color:"white",
//         padding:"11px 20px", fontSize:15, fontWeight:600,
//         boxShadow:"0 2px 8px rgba(80,40,160,.3)",
//         display:"flex", alignItems:"center", gap:12,
//       }}>
//         < span>〜 USR Dependency Viewer</span>
//         <span style={{ opacity:.7, fontSize:12, fontWeight:400 }}>
//           Paste a USR segment on the left, then click Visualize
//         </span>
//         <button onClick={() => setShowInput(v => !v)}
//           style={{ marginLeft:"auto", background:"rgba(255,255,255,0.18)", color:"#fff", border:"none", borderRadius:16, padding:"4px 14px", fontSize:12, cursor:"pointer", fontWeight:600 }}>
//           {showInput ? "Hide Input" : "Edit Input"}
//         </button>
//       </div>

//       <div style={{ display:"flex", minHeight:"calc(100vh - 48px)" }}>
//         {/* Left panel */}
//         {showInput && (
//           <div style={{
//             width:320, minWidth:220, maxWidth:500, background:"#fff",
//             borderRight:"2px solid #d0c8f0", display:"flex", flexDirection:"column", flexShrink:0,
//           }}>
//             <div style={{ background:"#edeaf8", color:"#4a2c8a", fontSize:12, fontWeight:700, padding:"8px 14px", borderBottom:"1px solid #d0c8f0", textTransform:"uppercase", letterSpacing:".04em" }}>
//               USR Input
//             </div>
//             <textarea
//               value={inputText}
//               onChange={e => setInputText(e.target.value)}
//               onKeyDown={e => { if (e.ctrlKey && e.key === "Enter") handleVisualize(); }}
//               spellCheck={false}
//               style={{
//                 flex:1, width:"100%", border:"none", outline:"none", resize:"none",
//                 fontFamily:"'Courier New',monospace", fontSize:11.5, lineHeight:1.55,
//                 padding:"10px 12px", color:"#2a1a4a", background:"#fdfcff", tabSize:4,
//               }}
//               placeholder="Paste your USR segment here..."
//             />
//             {parseError && <div style={{ color:"#cc2222", fontSize:11, padding:"0 12px 8px" }}>{parseError}</div>}
//             <button onClick={handleVisualize} style={{
//               margin:"10px 12px", padding:"8px 0", border:"none", borderRadius:20,
//               background:"linear-gradient(135deg,#4a2c8a,#6a3fc0)",
//               color:"white", fontSize:13, fontWeight:600, cursor:"pointer",
//             }}>▶ Visualize</button>
//           </div>
//         )}

//         {/* Right panel */}
//         <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
//           {/* Segment ID bar */}
//           {parsedSegments.length > 0 && (
//             <div style={{ background:"#eef0f8", borderBottom:"1px solid #dde", padding:"5px 20px", fontSize:11.5, color:"#555" }}>
//               SEG <b style={{ color:"#4a2c8a" }}>{parsedSegments[0].segId}</b>
//               {parsedSegments.length > 1 && <span style={{ marginLeft:8, color:"#999" }}>+{parsedSegments.length - 1} more</span>}
//             </div>
//           )}
//           {/* Sentence display */}
//           {parsedSegments.length > 0 && (
//             <div style={{ padding:"9px 20px", fontSize:13, color:"#333", borderBottom:"1px solid #dde", background:"white", lineHeight:1.5, minHeight:34 }}>
//               {parsedSegments[0].sentence}
//             </div>
//           )}
//           {/* Toolbar */}
//           <div style={{ padding:"6px 16px", display:"flex", gap:7, alignItems:"center", background:"white", borderBottom:"1px solid #eee", fontSize:12, flexWrap:"wrap" }}>
//             <button style={btnStyle} onClick={() => {
//               // Expand all: clear all collapsed sets by remounting with empty collapsed
//               setResetKey(k => k + 1);
//               // We'll handle expand differently — set a flag via resetKey parity
//             }}>Expand All</button>
//             <button style={btnStyle} onClick={() => setResetKey(k => k + 1)}>Collapse All</button>
//             <button style={btnStyle} onClick={() => setScale(s => Math.min(s + 0.15, 3))}>+ Zoom</button>
//             <button style={btnStyle} onClick={() => setScale(s => Math.max(s - 0.15, 0.3))}>− Zoom</button>
//             <label style={{ color:"#555", fontSize:12, marginLeft:4 }}>
//               <input type="checkbox" checked={showIds} onChange={e => setShowIds(e.target.checked)} /> Show IDs
//             </label>
//             <div style={{ display:"flex", gap:14, alignItems:"center", marginLeft:"auto", fontSize:11, color:"#555" }}>
//               <LegendItem sw={{ border:"2.5px solid #4a2c8a", background:"#fff" }} label="Root" />
//               <LegendItem sw={{ border:"1.5px solid #c0aee0", background:"#fff" }} label="Word" />
//               <LegendItem sw={{ border:"2px dashed #7733bb", background:"#ede8ff" }} label="Construction" />
//               <LegendItem sw={{ border:"2px solid #cc8800", background:"#fff8ee" }} label="Collapsed" />
//             </div>
//           </div>

//           {/* Graph area */}
//           <div style={{ flex:1, overflow:"auto", padding:"20px 24px 28px", background:"white" }}>
//             {parsedSegments.length === 0 && (
//               <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:200, color:"#bbb", fontSize:14, flexDirection:"column", gap:10 }}>
//                 <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
//                   <circle cx="24" cy="24" r="22" stroke="#4a2c8a" strokeWidth="2.5"/>
//                   <path d="M16 24h16M24 16v16" stroke="#4a2c8a" strokeWidth="2.5" strokeLinecap="round"/>
//                 </svg>
//                 Paste a USR segment and click Visualize
//               </div>
//             )}
//             <div style={{ transform:`scale(${scale})`, transformOrigin:"top left" }}>
//               {parsedSegments.map((seg, idx) => (
//                 <SegmentView
//                   key={`${seg.segId}-${idx}-${submitted.length}`}
//                   data={seg}
//                   segmentIndex={idx}
//                   showIds={showIds}
//                   resetKey={resetKey}
//                 />
//               ))}
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default USRGraphVisualizer;

import React, { useState, useMemo, useCallback } from 'react';

// ─── Exact maps from usr_visualizer.py ───────────────────────────────────────

const DEPENDENCY_TO_WH = {
  "k1": "What/Who",
  "k2": "What/Whom",
  "k7": "about",
  "k7t": "When",
  "k7p": "Where",
  "krvn": "How",
  "k5": "From where",
  "k2p": "To where",
  "rt": "purpose",
  "rh": "reason",
  "ru": "Like what",
  "k3": "With what",
  "rv": "Compared to what",
  "rprop": "over",
  "mod": "Modifier",
  "quant": "Quantity",
  "quantmore": "more than",
  "quantless": "less than",
  "r6": "Of",
  "freq": "how often",
  "rkl": "before/after",
  "kriyaMUla": "Root Verb",
  "verbalizer": "Verbalizer",
  "rbks": "mod",
  "rvks": "mod",
  "rreason": "because",
  "begin": "begin",
  "inside": "inside",
  "end": "end",
  "head": "head",
};

const TAM_MAPPING = {
  "yA_WA_2": "had",
  "nA_cAhie_4": "must",
  "nA_hE_1": "have_to",
  "past": "was",
  "yA_1": "ed",
  "0_gayA_1": "went",
  "0_xiyA_1": "gave",
  "0_sakA_1": "could",
  "yA_WA_1": "did",
  "yA_hE_2": "is_being",
  "wA_hE_1": "is",
  "0_rahA_hogA_1": "will_have_been",
  "pres": "is",
  "wA_WA_1": "used_to",
  "0_jAwA_WA_1": "used_to_go",
  "gA_2": "would",
  "o_1": "should",
  "o_2": "must",
  "nA_hE_2": "have_to",
  "nA_hogA_1": "must",
  "nA_cAhie_2": "must",
  "nA_cAhie_1": "should",
  "0_sakawA_hE_3": "may",
  "nA_padZawA_hE_1": "have_to",
  "nA_padZawA_WA_1": "had_to",
  "nA_padZA_1": "had_to",
  "yA_gayA_WA_1": "was",
  "0_cukA_hE_1": "have",
  "AI_xI_1": "",
  "0_cukA_WA_1": "had",
  "0_gayA_WA_1": "had_gone",
  "0_rahA_hE_2": "has_been",
  "yA_gayA_hE_2": "has_been",
  "0_rahA_WA_2": "had_been",
  "0_cukA_hogA_1": "will_have",
  "yA_gayA_1": "got",
  "wA_rahawA_hE_1": "keeps",
  "0_rahA_wA_1": "was",
  "0_rahA_hE_1": "is",
  "yA_jAyegA_1": "will_be",
  "gA_1": "will",
  "0_rahA_hogA_2": "shall_be",
  "yA_hogA_1": "will_have",
  "nA_cAhie_3": "have_to",
  "nA_padZawA_hE_2": "must",
  "nA_padZA_2": "must",
  "nA_padZawA_WA_2": "have_to",
  "nA_padZegA_1": "had_to",
  "yA_hogA_2": "had_to",
  "0_sakawA_1": "will_have_to",
  "0_sakawA_WA_1": "might_have",
  "0_sakawA_hE_1": "can",
  "0_sakawA_hE_2": "could",
  "yA_gayA_WA_2": "could",
  "yA_jAwA_WA_1": "might",
  "yA_jAwA_hE_1": "could",
  "yA_gayA_hE_1": "can",
  "yA_hE_1": "was",
  "yA_hogA_3": "was",
  "yAw_1": "had_been",
  "aw_1": "is",
  "awi_4": "are",
  "a_1": "has",
  "Iw_1": "must_have",
  "wA_1": "will",
  "syaw_1": "ed",
  "syawi_1": "ed",
  "awu_1": "ed",
  "ew_1": "should",
};

// ─── Colors — exact from Python ───────────────────────────────────────────────
const DEP_COLORS = ["#2255cc","#1a8833","#cc2222","#996600","#006688","#884411","#aa3377","#337755"];
const CXN_COLORS = ["#7733bb","#9944cc","#5522aa","#bb55dd","#6633aa","#8844bb"];

// ─── Layout constants — exact from Python ─────────────────────────────────────
const TH        = 30;
const HPAD      = 16;
const ARC_STEP  = 30;
const ARC_PAD   = 14;
const R         = 6;
const ARC_NUDGE = 12;

// ─── extractTam — exact Python logic ─────────────────────────────────────────
function extractTam(wordRaw) {
  const w = wordRaw.replace(/^[$[\]]+/, "");
  const dash = w.indexOf("-");
  if (dash < 0) return null;
  const cand = w.slice(dash + 1);
  if (TAM_MAPPING[cand] !== undefined) return TAM_MAPPING[cand] || cand;
  return cand;
}

// ─── resolveWyax — exact Python logic ────────────────────────────────────────
function resolveWyax(node) {
  const base = (node.name || "").toLowerCase();
  if (base !== "wyax" && base !== "yax") return null;
  const rel = (node.relation || "").toLowerCase();
  const sv  = (node.speakerView || "").toLowerCase();
  if (node.corefRef != null) {
    const isSubj = rel === "k1" || rel.startsWith("k1")
                || rel === "pk1" || rel === "jk1" || rel === "mk1";
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
  return Math.max(80, text.length * 7.5 + 20 + (hasChildren ? 18 : 0));
}

// ─── parseUSR — exact Python parse_usr + build_graph ─────────────────────────
function parseUSR(text) {
  let segId = "—", sentence = "";
  const segMatch  = text.match(/<segment_id=([^>]+)>/);
  if (segMatch) segId = segMatch[1].trim();
  const sentMatch = text.match(/^#(.+)/m);
  if (sentMatch) sentence = sentMatch[1].trim();

  const lines = text.split("\n").map(l => l.trim()).filter(l =>
    l && !l.startsWith("#") && !l.startsWith("<") && !l.startsWith("%")
  );

  const nodes    = {};
  const children = {};

  for (const line of lines) {
    const parts = line.split("\t");
    if (parts.length < 5) continue;

    const wordRaw           = parts[0];
    const nodeId            = parseInt(parts[1]);
    if (isNaN(nodeId)) continue;

    const morpho_semantic   = (parts[2] || "-").trim();
    const semantic_category = (parts[3] || "-").trim();
    const relField          = parts[4].trim();
    const col5              = parts.length > 5 ? parts[5].trim() : "";
    // compField = parts[-1] if len(parts) >= 9 else ""
    const compField         = parts.length >= 9 ? parts[parts.length - 1].trim() : "";

    const isGroup = wordRaw.startsWith("[") && wordRaw.endsWith("]");

    let parentId = null, relation = "";
    if (relField.includes(":")) {
      const idx = relField.indexOf(":");
      const pid = parseInt(relField.slice(0, idx));
      if (!isNaN(pid)) { parentId = pid; relation = relField.slice(idx + 1); }
    }

    const tam = extractTam(wordRaw);

    const rawBase = wordRaw.replace(/^[$[\]]+/, "").split("_")[0].toLowerCase();
    let speakerView = "", corefRef = null;
    if (rawBase === "wyax" || rawBase === "yax") {
      const sv    = col5.toLowerCase();
      const col6v = parts.length > 6 ? parts[6].trim().toLowerCase() : "";
      if      (col6v === "proximal" || col6v === "prox") speakerView = "proximal";
      else if (col6v === "distal")                       speakerView = "distal";
      else if (sv === "proximal" || sv === "prox")       speakerView = "proximal";
      else if (sv === "distal")                          speakerView = "distal";
      else if (sv.includes(":")) {
        const ref = parseInt(sv.split(":")[0]);
        if (!isNaN(ref)) corefRef = ref;
      }
    }

    // Group nodes: keep full name "ne_1" etc; Normal nodes: base word only
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

    // Component field: "7:begin" → node belongs to group node 7
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

  // build_graph: all nodes visible, build edges directly
  const edgeSet   = new Set();
  const flatEdges = [];
  for (const [pid, childList] of Object.entries(children)) {
    const parentId = parseInt(pid);
    if (parentId === 0) continue;
    for (const cid of childList) {
      const rel = nodes[cid]?.relation || "";
      const key = `${parentId}-${cid}-${rel}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        const srcCxn = nodes[parentId]?.isCxn || false;
        const tgtCxn = nodes[cid]?.isCxn      || false;
        flatEdges.push({
          source: parentId, target: cid, relation: rel,
          label: DEPENDENCY_TO_WH[rel] || rel,
          isCxnEdge: srcCxn || tgtCxn,
        });
      }
    }
  }

  // Find root — exact Python
  let rootId = null;
  for (const node of Object.values(nodes)) {
    if (node.relation === "main" || node.parent === null) { rootId = node.id; break; }
  }
  if (rootId === null && Object.keys(nodes).length)
    rootId = Math.min(...Object.keys(nodes).map(Number));

  const nodeList = Object.values(nodes).sort((a, b) => a.id - b.id);
  return { nodes: nodeList, edges: flatEdges, root: rootId, sentence, segId };
}

// ─── Segment splitter ─────────────────────────────────────────────────────────
function splitSegments(text) {
  if (!text) return [];
  const segs = [];
  const re = /<(?:segment_id|sent_id)=([^>]+)>([\s\S]*?)<\/(?:segment_id|sent_id)>/g;
  let m;
  while ((m = re.exec(text)) !== null) segs.push(m[0]);
  if (!segs.length) segs.push(text);
  return segs;
}

// ─── Arc layout — exact Python assignLevels ───────────────────────────────────
function assignLevels(edges, colOf) {
  const sorted = [...edges].sort((a, b) =>
    Math.abs(colOf[a.source] - colOf[a.target]) - Math.abs(colOf[b.source] - colOf[b.target])
  );
  sorted.forEach(e => {
    const span  = Math.abs(colOf[e.source] - colOf[e.target]);
    const left  = Math.min(colOf[e.source], colOf[e.target]);
    const right = Math.max(colOf[e.source], colOf[e.target]);
    let h = Math.max(span, 1) * ARC_STEP;
    let conflicts = (h) => sorted.some(o => {
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

// ─── computeAttachOffsets — exact Python ──────────────────────────────────────
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

// ─── SegmentView ──────────────────────────────────────────────────────────────
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

  // initCollapsed — exact Python: all nodes with children except root
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

  // Reset collapse state when resetKey changes (Collapse All button)
  const prevResetKey = React.useRef(resetKey);
  if (prevResetKey.current !== resetKey) {
    prevResetKey.current = resetKey;
    setCollapsed(makeInitCollapsed());
  }

  // visibleNodes — exact Python BFS
  const visSet = useMemo(() => {
    const vis = new Set([rootId]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const e of flatEdges) {
        if (vis.has(e.source) && !collapsed.has(e.source) && !vis.has(e.target)) {
          vis.add(e.target);
          changed = true;
        }
      }
    }
    return vis;
  }, [rootId, collapsed, flatEdges]);

  // sentenceOrder = original nodeList order (sorted by id)
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

  // Column x centers — exact Python
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

  // colOf = index in visNodes (used for span calculation, exact Python)
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

  const maxArcH = leveledEdges.length ? Math.max(...leveledEdges.map(e => e._arcH)) : 0;
  const arcAreaH = maxArcH + ARC_PAD;
  const tokenY   = arcAreaH;
  const totalH   = arcAreaH + TH + (showIds ? 20 : 10);

  // Color counters cycle per render, dep vs cxn (exact Python)
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
        {sentence && <span style={{ fontSize:11, fontWeight:"normal", color:"#475569" }}>{sentence}</span>}
      </div>

      <div style={{ overflowX:"auto", background:"#fff", padding:"8px 0 10px 0" }}>
        <svg
          width={Math.max(totalW, 300)} height={totalH}
          viewBox={`0 0 ${Math.max(totalW, 300)} ${totalH}`}
          style={{ display:"block", fontFamily:"'Segoe UI',Arial,sans-serif", overflow:"visible" }}
          onMouseLeave={() => { setHovNode(null); setHovEdge(null); }}
        >
          {/* Arcs — exact Python rendering */}
          {leveledEdges.map((edge, ei) => {
            const x1 = cx[edge.source], x2 = cx[edge.target];
            if (x1 === undefined || x2 === undefined) return null;

            const isCxnEdge = edge.isCxnEdge;
            const color = isCxnEdge
              ? CXN_COLORS[(cxnIdx++) % CXN_COLORS.length]
              : DEP_COLORS[(depIdx++) % DEP_COLORS.length];

            const arcTopY = tokenY - edge._arcH;
            const ax1     = x1 + srcOff[ei];
            const ax2     = x2 + tgtOff[ei];
            const dir     = ax2 >= ax1 ? 1 : -1;

            // Exact Python path
            const pathD = [
              `M ${ax1} ${tokenY}`,
              `L ${ax1} ${arcTopY + R}`,
              `Q ${ax1} ${arcTopY} ${ax1 + R * dir} ${arcTopY}`,
              `L ${ax2 - R * dir} ${arcTopY}`,
              `Q ${ax2} ${arcTopY} ${ax2} ${arcTopY + R}`,
              `L ${ax2} ${tokenY - 12}`,
            ].join(" ");

            const lbl = edge.label || edge.relation || "";
            const lw  = Math.max(lbl.length * 6.5 + 10, 22);
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
                {/* Exact Python arrowhead polygon */}
                <polygon
                  points={`${ax2 - 4},${tokenY - 12} ${ax2 + 4},${tokenY - 12} ${ax2},${tokenY}`}
                  fill={color} />
                {lbl && <>
                  <rect x={lx - lw/2} y={ly - lh/2} width={lw} height={lh}
                    rx={3} fill={isCxnEdge ? "#f5f0ff" : "white"}
                    stroke={color} strokeWidth={1} />
                  <text x={lx} y={ly + 1}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={10} fontFamily="'Courier New',monospace"
                    fontStyle={isCxnEdge ? "italic" : "normal"}
                    fill={color} style={{ pointerEvents:"none" }}>
                    {lbl}
                  </text>
                </>}
              </g>
            );
          })}

          {/* Tokens — exact Python rendering */}
          {visNodes.map(node => {
            const x     = cx[node.id];
            const tw    = nw[node.id];
            const isRoot = node.id === rootId;
            const hasCh  = !!(allChildren[node.id]?.length);
            const isCol  = collapsed.has(node.id);
            const isCxn  = node.isCxn;
            const hov    = hovNode === node.id;
            const displayText = nodeDisplayName(node);

            const connected = hovNode !== null && flatEdges.some(e =>
              (e.source === hovNode && e.target === node.id) ||
              (e.target === hovNode && e.source === node.id));
            const dimmed = hovNode !== null && hovNode !== node.id && !connected;

            // Exact Python CSS classes → inline styles
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
                <rect
                  x={x - tw/2 + 2} y={tokenY} width={tw - 4} height={TH} rx={5}
                  fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={dash} />
                <text
                  x={x} y={tokenY + TH / 2}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={12} fontWeight={fw} fill={textFill}
                  style={{ userSelect:"none", pointerEvents:"none" }}>
                  {displayText}
                </text>
                {hasCh && (
                  <text
                    x={x + tw/2 - 8} y={tokenY + 8}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={13} fontWeight="700" fill={badgeFill}
                    style={{ userSelect:"none", pointerEvents:"none" }}>
                    {badgeChar}
                  </text>
                )}
                {showIds && (
                  <text
                    x={x} y={tokenY + TH + 4}
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

// ─── Main ─────────────────────────────────────────────────────────────────────
const SAMPLE = `<segment_id=biology_chapter3_plantkingdom_0003>
#In this chapter, we will study the detailed classification of Kingdom Plantae, which is commonly called the plant kingdom.
$wyax\t15\t-\t-\t14:dem\tproximal\t-\t-\t-
chapter_1\t14\t-\t-\t2:k7p\t-\t-\t-\t-
$speaker\t1\tanim\tpl\t2:k1\t-\t-\t-\t-
study_1-0_will_1\t2\t-\t-\t0:main\t-\t-\t-\t-
detailed_1\t3\t-\t-\t4:mod\t-\t-\t-\t-
classification_1\t4\t-\t-\t2:k2\t-\t-\t-\t-
Kingdom\t5\t-\t-\t-\t-\t-\t-\t7:begin
Plantae\t6\t-\t-\t-\t-\t-\t-\t7:inside
[ne_1]\t7\tne\t-\t4:r6\t-\t-\t-\t-
$yax\t8\t-\t-\t10:k2\t7:coref\t-\t-\t-
common_1\t9\t-\t-\t10:vkvn\t-\t-\t-\t-
call_1-en_is\t10\t-\t-\t7:rcelab\t-\t-\t-\t-
plant_1\t11\t-\t-\t-\t-\t-\t-\t13:mod
kingdom_1\t12\t-\t-\t-\t-\t-\t-\t13:head
[nc_1]\t13\t-\t-\t10:k2s\t-\t-\t-\t-
%affirmative
</segment_id>`;

const btnStyle = {
  background:"#f0ecff", color:"#4a2c8a", border:"1px solid #c0aee0",
  padding:"3px 12px", borderRadius:14, cursor:"pointer", fontSize:12,
};

function LegendItem({ sw, label }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
      <div style={{ width:26, height:14, borderRadius:3, flexShrink:0, ...sw }} />
      <span>{label}</span>
    </div>
  );
}

const USRGraphVisualizer = () => {
  const [submitted,   setSubmitted]   = useState(SAMPLE);
  const [showIds,     setShowIds]     = useState(false);
  const [scale,       setScale]       = useState(1.0);
  const [resetKey,    setResetKey]    = useState(0);
  const [parseError,  setParseError]  = useState("");

  const parsedSegments = useMemo(() => {
    if (!submitted) return [];
    const segs = splitSegments(submitted);
    const out = [];
    for (const raw of segs) {
      try {
        const p = parseUSR(raw);
        if (p.nodes.length) out.push(p);
      } catch(e) {
        setParseError("Parse error: " + e.message);
      }
    }
    return out;
  }, [submitted]);

  return (
    <div style={{ width:"100%", maxWidth:1500, margin:"0 auto", fontFamily:"'Segoe UI',Arial,sans-serif", background:"#f0f1f8", minHeight:"100vh" }}>
      {/* Header */}
      <div style={{
        background:"linear-gradient(135deg,#4a2c8a,#6a3fc0)", color:"white",
        padding:"11px 20px", fontSize:15, fontWeight:600,
        boxShadow:"0 2px 8px rgba(80,40,160,.3)",
        display:"flex", alignItems:"center", gap:12,
      }}>
        <span style={{ opacity:.7, fontSize:12, fontWeight:400 }}>
          USR Graph Visualization
        </span>
      </div>

      <div style={{ display:"flex", minHeight:"calc(100vh - 48px)" }}>
        {/* Main panel */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          {/* Segment ID bar */}
          {parsedSegments.length > 0 && (
            <div style={{ background:"#eef0f8", borderBottom:"1px solid #dde", padding:"5px 20px", fontSize:11.5, color:"#555" }}>
              SEG <b style={{ color:"#4a2c8a" }}>{parsedSegments[0].segId}</b>
              {parsedSegments.length > 1 && <span style={{ marginLeft:8, color:"#999" }}>+{parsedSegments.length - 1} more</span>}
            </div>
          )}
          {/* Sentence display */}
          {parsedSegments.length > 0 && (
            <div style={{ padding:"9px 20px", fontSize:13, color:"#333", borderBottom:"1px solid #dde", background:"white", lineHeight:1.5, minHeight:34 }}>
              {parsedSegments[0].sentence}
            </div>
          )}
          {/* Toolbar */}
          <div style={{ padding:"6px 16px", display:"flex", gap:7, alignItems:"center", background:"white", borderBottom:"1px solid #eee", fontSize:12, flexWrap:"wrap" }}>
            <button style={btnStyle} onClick={() => {
              // Expand all: clear all collapsed sets by remounting with empty collapsed
              setResetKey(k => k + 1);
            }}>Expand All</button>
            <button style={btnStyle} onClick={() => setResetKey(k => k + 1)}>Collapse All</button>
            <button style={btnStyle} onClick={() => setScale(s => Math.min(s + 0.15, 3))}>+ Zoom</button>
            <button style={btnStyle} onClick={() => setScale(s => Math.max(s - 0.15, 0.3))}>− Zoom</button>
            <label style={{ color:"#555", fontSize:12, marginLeft:4 }}>
              <input type="checkbox" checked={showIds} onChange={e => setShowIds(e.target.checked)} /> Show IDs
            </label>
            <div style={{ display:"flex", gap:14, alignItems:"center", marginLeft:"auto", fontSize:11, color:"#555" }}>
              <LegendItem sw={{ border:"2.5px solid #4a2c8a", background:"#fff" }} label="Root" />
              <LegendItem sw={{ border:"1.5px solid #c0aee0", background:"#fff" }} label="Word" />
              <LegendItem sw={{ border:"2px dashed #7733bb", background:"#ede8ff" }} label="Construction" />
              <LegendItem sw={{ border:"2px solid #cc8800", background:"#fff8ee" }} label="Collapsed" />
            </div>
          </div>

          {/* Graph area */}
          <div style={{ flex:1, overflow:"auto", padding:"20px 24px 28px", background:"white" }}>
            {parsedSegments.length === 0 && (
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:200, color:"#bbb", fontSize:14, flexDirection:"column", gap:10 }}>
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <circle cx="24" cy="24" r="22" stroke="#4a2c8a" strokeWidth="2.5"/>
                  <path d="M16 24h16M24 16v16" stroke="#4a2c8a" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
                Loading USR data...
              </div>
            )}
            <div style={{ transform:`scale(${scale})`, transformOrigin:"top left" }}>
              {parsedSegments.map((seg, idx) => (
                <SegmentView
                  key={`${seg.segId}-${idx}`}
                  data={seg}
                  segmentIndex={idx}
                  showIds={showIds}
                  resetKey={resetKey}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default USRGraphVisualizer;