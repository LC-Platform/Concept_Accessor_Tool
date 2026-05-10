// src/utils/usrParser.js

/**
 * Parse USR text to extract graph data
 * @param {string} usrText - Raw USR text from the file
 * @returns {object} Parsed graph data with nodes, edges, positions
 */
export const parseUSRToGraph = (usrText) => {
  if (!usrText) return null;

  // Extract segment ID and content
  const segmentMatch = usrText.match(/<segment_id=(.*?)>(.*?)<\/segment_id>/s);
  if (!segmentMatch) return null;

  const segmentId = segmentMatch[1];
  const content = segmentMatch[2];

  // Extract English sentence
  const sentenceMatch = content.match(/#(.*?)(?:\n|$)/);
  const englishSentence = sentenceMatch ? sentenceMatch[1].trim() : "";

  // Parse the USR lines
  const lines = content.split('\n');
  const nodes = [];
  const edges = [];
  let rootId = null;

  // Skip to after the # line
  let startIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('#')) {
      startIdx = i + 1;
      break;
    }
  }

  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('%')) continue;

    const parts = line.split('\t');
    if (parts.length < 5) continue;

    const predicate = parts[0];
    const index = parts[1];
    const tense = parts[2];
    const negation = parts[3];
    const argsStr = parts[4];
    const discourse = parts[5] || '-';
    const coref = parts[6] || '-';
    const aspect = parts[7] || '-';

    // Parse arguments
    const args = [];
    if (argsStr && argsStr !== '-') {
      const argParts = argsStr.split(',');
      argParts.forEach(arg => {
        const match = arg.match(/(\d+):(\w+)/);
        if (match) {
          args.push({
            target: match[1],
            role: match[2]
          });
        }
      });
    }

    // Add node
    nodes.push({
      id: index,
      label: predicate,
      predicate: predicate,
      tense: tense,
      negation: negation,
      args: args,
      discourse: discourse,
      coref: coref,
      aspect: aspect
    });

    // Add edges
    args.forEach(arg => {
      edges.push({
        from: index,
        to: arg.target,
        label: arg.role
      });
    });

    // Check if this is the root (has 0:main)
    if (argsStr.includes('0:main')) {
      rootId = index;
    }
  }

  // If no root found, try to find main predicate
  if (!rootId && nodes.length > 0) {
    const mainPredicate = nodes.find(n => n.label.includes('main') || n.args.some(a => a.role === 'main'));
    rootId = mainPredicate ? mainPredicate.id : nodes[0].id;
  }

  // Calculate node positions
  const nodePositions = calculateNodePositions(nodes, edges);

  return {
    segmentId: segmentId,
    sentence: englishSentence,
    nodes: nodes,
    edges: edges,
    rootId: rootId,
    nodePositions: nodePositions,
    rawUsr: usrText
  };
};

/**
 * Calculate node positions using hierarchical layout
 */
const calculateNodePositions = (nodes, edges) => {
  const positions = {};
  const startY = 80;
  const xSpacing = 160;
  const ySpacing = 100;

  // Build graph structure
  const graph = {};
  const inDegree = {};
  
  nodes.forEach(node => {
    graph[node.id] = [];
    inDegree[node.id] = 0;
  });
  
  edges.forEach(edge => {
    if (graph[edge.from]) {
      graph[edge.from].push(edge.to);
      inDegree[edge.to] = (inDegree[edge.to] || 0) + 1;
    }
  });

  // Find root nodes (inDegree = 0)
  const roots = nodes.filter(node => inDegree[node.id] === 0).map(n => n.id);
  
  // BFS to assign levels
  const levels = {};
  const queue = [...roots];
  const visited = new Set();
  
  roots.forEach(root => {
    levels[root] = 0;
    visited.add(root);
  });
  
  while (queue.length > 0) {
    const current = queue.shift();
    const currentLevel = levels[current];
    
    graph[current]?.forEach(child => {
      if (!visited.has(child)) {
        visited.add(child);
        levels[child] = currentLevel + 1;
        queue.push(child);
      }
    });
  }

  // Handle any remaining nodes
  nodes.forEach(node => {
    if (levels[node.id] === undefined) {
      levels[node.id] = 0;
    }
  });

  // Group nodes by level
  const nodesByLevel = {};
  nodes.forEach(node => {
    const level = levels[node.id];
    if (!nodesByLevel[level]) nodesByLevel[level] = [];
    nodesByLevel[level].push(node);
  });

  Object.keys(nodesByLevel).forEach(level => {
    const levelNum = parseInt(level);
    const levelNodes = nodesByLevel[levelNum];
    const y = startY + levelNum * ySpacing;
    
    // Center nodes horizontally
    const totalWidth = (levelNodes.length - 1) * xSpacing;
    const startXPos = Math.max(50, (800 - totalWidth) / 2);
    
    levelNodes.forEach((node, idx) => {
      positions[node.id] = {
        x: startXPos + idx * xSpacing,
        y: y
      };
    });
  });

  return positions;
};



export async function fetchAndParseUSR(chapterId, sentence, BASE_URL) {
  try {
    if (!sentence || !chapterId) return { graphs: [] };

    const cleanSentence = sentence.replace(/\n/g, " ").trim();

    // ✅ STEP 1: Fetch USR
    const res = await fetch(
      `${BASE_URL}/get-usr/?chapter_id=${chapterId}&sentence=${encodeURIComponent(cleanSentence)}`
    );

    if (!res.ok) return { graphs: [] };

    const data = await res.json();

    if (!data.usr_segments || data.usr_segments.length === 0) {
      return { graphs: [] };
    }

    const usrText = data.usr_segments
  .map(seg => {
    const cleanSentence = data.sentence.replace(/\n/g, " ").trim();

    return `<segment_id=${seg.segment_id}>
# source
# source
# ${cleanSentence}
${seg.usr_text}
</segment_id>`;
  })
  .join("\n");

    return {
      usrText,   // 🔥 IMPORTANT
    };

  } catch (err) {
    console.error("USR fetch error:", err);
    return { graphs: [] };
  }
}