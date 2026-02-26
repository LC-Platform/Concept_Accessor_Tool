import { useState, useEffect, useRef, useCallback } from "react";

// ─── Sample Document Data ────────────────────────────────────────────────────
const DOCUMENT = {
  title: "Neural Networks & Deep Learning",
  sections: [
    {
      id: "S1",
      heading: "Introduction to Neural Networks",
      text: [
        { id: "w1", word: "Neural networks", isDomain: true, sentence: 1 },
        { id: "w1b", word: " are computational models loosely inspired by the ", isDomain: false, sentence: 1 },
        { id: "w2", word: "biological neurons", isDomain: true, sentence: 1 },
        { id: "w2b", word: " in the human brain. They consist of layers of interconnected nodes that process ", isDomain: false, sentence: 1 },
        { id: "w3", word: "information", isDomain: false, sentence: 1 },
        { id: "w3b", word: " through mathematical transformations.", isDomain: false, sentence: 1 },
        { id: "nl1", word: "\n\n", isDomain: false, sentence: -1 },
        { id: "w4", word: "Each neuron", isDomain: false, sentence: 2 },
        { id: "w4b", word: " applies an ", isDomain: false, sentence: 2 },
        { id: "w5", word: "activation function", isDomain: true, sentence: 2 },
        { id: "w5b", word: " to its weighted inputs, producing an output that is passed to the next layer. The ", isDomain: false, sentence: 2 },
        { id: "w6", word: "backpropagation", isDomain: true, sentence: 2 },
        { id: "w6b", word: " algorithm adjusts these weights during training by computing ", isDomain: false, sentence: 2 },
        { id: "w7", word: "gradients", isDomain: true, sentence: 2 },
        { id: "w7b", word: " of the loss function.", isDomain: false, sentence: 2 },
      ],
      summary: "Neural networks are layered computational systems modeled after the brain, using activation functions and backpropagation to learn from data.",
      qa: [
        { q: "What are neural networks modeled after?", a: "Biological neurons in the human brain." },
        { q: "What does backpropagation do?", a: "It adjusts weights by computing gradients of the loss function during training." },
      ],
    },
    {
      id: "S2",
      heading: "Deep Learning Architecture",
      text: [
        { id: "w8", word: "Deep learning", isDomain: true, sentence: 3 },
        { id: "w8b", word: " refers to neural networks with many hidden layers — typically more than two. These ", isDomain: false, sentence: 3 },
        { id: "w9", word: "deep architectures", isDomain: true, sentence: 3 },
        { id: "w9b", word: " can automatically learn hierarchical ", isDomain: false, sentence: 3 },
        { id: "w10", word: "feature representations", isDomain: true, sentence: 3 },
        { id: "w10b", word: " from raw data.", isDomain: false, sentence: 3 },
        { id: "nl2", word: "\n\n", isDomain: false, sentence: -1 },
        { id: "w11", word: "Convolutional Neural Networks", isDomain: true, sentence: 4 },
        { id: "w11b", word: " (CNNs) excel at image tasks by using ", isDomain: false, sentence: 4 },
        { id: "w12", word: "convolutional filters", isDomain: true, sentence: 4 },
        { id: "w12b", word: " to detect spatial patterns. Meanwhile, ", isDomain: false, sentence: 4 },
        { id: "w13", word: "Transformers", isDomain: true, sentence: 4 },
        { id: "w13b", word: " revolutionized ", isDomain: false, sentence: 4 },
        { id: "w14", word: "natural language processing", isDomain: true, sentence: 4 },
        { id: "w14b", word: " through the ", isDomain: false, sentence: 4 },
        { id: "w15", word: "self-attention mechanism", isDomain: true, sentence: 4 },
        { id: "w15b", word: ".", isDomain: false, sentence: 4 },
      ],
      summary: "Deep learning uses multi-layered networks to learn complex representations. CNNs handle images via filters; Transformers handle language via self-attention.",
      qa: [
        { q: "What distinguishes deep learning from shallow networks?", a: "The presence of many hidden layers (typically more than two)." },
        { q: "How do Transformers process language differently?", a: "They use a self-attention mechanism to weigh relationships between all words simultaneously." },
      ],
    },
  ],
};

// ─── Domain Knowledge Base ───────────────────────────────────────────────────
const KNOWLEDGE = {
  "Neural networks": {
    definition: "Computational systems composed of interconnected layers of nodes that learn patterns from data through iterative training.",
    analogy: "Think of it like a team of specialists — each layer learns a progressively abstract feature, like edges → shapes → faces.",
    deeper: ["How does training actually work?", "What is the universal approximation theorem?"],
    relatedTo: ["backpropagation", "activation function", "deep learning"],
    realWorld: "Used in Gmail spam filters, Google Translate, and Tesla autopilot.",
    depth: { eli5: "A computer brain that learns by looking at lots of examples, like a child learning to recognize cats.", expert: "A parametric function approximator trained via stochastic gradient descent on a differentiable loss landscape." },
  },
  "biological neurons": {
    definition: "Specialized cells in the nervous system that transmit information via electrical and chemical signals.",
    analogy: "Like tiny switches in a massive circuit — each one either fires or stays silent based on incoming signals.",
    deeper: ["What is the action potential?", "How does synaptic plasticity relate to learning?"],
    relatedTo: ["Neural networks", "activation function"],
    realWorld: "The human brain has ~86 billion neurons, far more complex than any current AI model.",
    depth: { eli5: "Tiny cells in your brain that send messages to each other, like people passing notes.", expert: "Excitable cells with dendrites receiving synaptic inputs, integrating charge at the soma, firing via voltage-gated Na⁺ channels when threshold is reached." },
  },
  "activation function": {
    definition: "A mathematical function applied to a neuron's weighted input sum to introduce non-linearity, enabling complex pattern learning.",
    analogy: "Like a valve — it controls whether information flows forward and how much of it passes through.",
    deeper: ["Why does non-linearity matter?", "What is the vanishing gradient problem?"],
    relatedTo: ["Neural networks", "backpropagation", "gradients"],
    realWorld: "ReLU (Rectified Linear Unit) is the most common — it simply outputs max(0, x).",
    depth: { eli5: "A rule that decides how 'excited' a neuron gets — if barely stimulated, it stays quiet.", expert: "A differentiable (or sub-differentiable) nonlinear map σ: ℝ→ℝ, e.g., ReLU, GELU, Swish — chosen to preserve gradient flow and induce representational capacity." },
  },
  "backpropagation": {
    definition: "An algorithm that calculates gradients of the loss function with respect to each weight, enabling the network to learn by updating weights in the direction that reduces error.",
    analogy: "Like tracing blame backwards — if the output was wrong, backprop figures out which neurons were most responsible and fixes them.",
    deeper: ["What is the chain rule in calculus?", "How do optimizers like Adam improve on basic gradient descent?"],
    relatedTo: ["gradients", "activation function", "deep learning"],
    realWorld: "Invented by Rumelhart, Hinton & Williams in 1986 — the foundational algorithm behind all modern AI training.",
    depth: { eli5: "The network makes a guess, sees how wrong it was, and works backwards to fix its mistakes.", expert: "Efficient computation of ∂L/∂wᵢⱼ via the chain rule on the computation graph, with O(n) complexity using dynamic programming." },
  },
  "gradients": {
    definition: "Vectors indicating the direction and magnitude of the steepest increase in a function — used in reverse to minimize loss.",
    analogy: "Like a hiker finding the steepest slope downhill — the gradient points uphill, so you walk the opposite way.",
    deeper: ["What is gradient descent?", "What is the difference between local and global minima?"],
    relatedTo: ["backpropagation", "activation function"],
    realWorld: "All modern AI — GPT, DALL-E, Gemini — is trained by following gradients billions of times.",
    depth: { eli5: "A signal that tells the network 'you were wrong by THIS much in THAT direction — adjust!'", expert: "The Jacobian of the scalar loss L w.r.t. parameters θ ∈ ℝⁿ, computed via automatic differentiation (autograd)." },
  },
  "deep learning": {
    definition: "A subfield of machine learning using neural networks with many layers to automatically learn hierarchical representations from raw data.",
    analogy: "Like learning a language: first you learn letters, then words, then grammar, then meaning — each layer builds on the last.",
    deeper: ["What is representation learning?", "How did deep learning beat traditional computer vision?"],
    relatedTo: ["Neural networks", "backpropagation", "Transformers", "Convolutional Neural Networks"],
    realWorld: "Deep learning powers ChatGPT, AlphaFold (protein folding), and real-time language translation.",
    depth: { eli5: "Computers getting really good at tasks by stacking many 'thinking layers' on top of each other.", expert: "A compositional approach to learning where f(x) = fₙ(fₙ₋₁(...f₁(x; θ₁)...; θₙ₋₁); θₙ) with θ learned end-to-end." },
  },
  "deep architectures": {
    definition: "Neural network designs with multiple stacked hidden layers enabling hierarchical feature extraction.",
    analogy: "Like an assembly line — each station does one job, transforming the part until it's complete.",
    deeper: ["What is skip connection / residual learning?", "How deep is too deep?"],
    relatedTo: ["deep learning", "Convolutional Neural Networks", "Transformers"],
    realWorld: "ResNet has 152 layers; GPT-4 is estimated to have thousands of layers.",
    depth: { eli5: "Like a very tall tower of brain layers, each one looking at what the one below figured out.", expert: "Deep compositions with residual shortcuts (He et al., 2016) mitigating gradient vanishing via identity mappings." },
  },
  "feature representations": {
    definition: "Abstract, learned encodings of raw input data that capture meaningful patterns useful for downstream tasks.",
    analogy: "Like a translator that converts messy reality (pixels, words) into a clean language the model understands.",
    deeper: ["What is an embedding?", "What is the curse of dimensionality?"],
    relatedTo: ["deep learning", "Convolutional Neural Networks", "natural language processing"],
    realWorld: "Word2Vec turned words into 300-dimensional vectors where 'King - Man + Woman = Queen'.",
    depth: { eli5: "The model's own 'secret language' for describing things — like it invented its own categories.", expert: "Points in a learned manifold h ∈ ℝᵈ where geometry reflects semantic structure — key to transfer learning." },
  },
  "Convolutional Neural Networks": {
    definition: "Neural networks using sliding convolutional filters to detect spatial hierarchies — edges, textures, objects — in data like images.",
    analogy: "Like a flashlight scanning a painting — first spotting edges, then shapes, finally recognizing what it is.",
    deeper: ["What is pooling and why does it matter?", "How did AlexNet change the field in 2012?"],
    relatedTo: ["deep learning", "feature representations", "convolutional filters"],
    realWorld: "Face ID on your iPhone, medical image diagnosis, self-driving car perception all use CNNs.",
    depth: { eli5: "A network that looks at small patches of an image at a time, like scanning a Where's Waldo page piece by piece.", expert: "A network with weight-shared linear operators (convolutions) + pointwise nonlinearities, exploiting translation equivariance for O(HW·k²·C²) parameter efficiency." },
  },
  "convolutional filters": {
    definition: "Small learnable matrices that slide across input data, activating when they detect specific patterns like edges or colors.",
    analogy: "Like a stencil — when you slide it over an image, it lights up wherever its shape matches the pattern.",
    deeper: ["How does a filter learn its weights?", "What is feature map?"],
    relatedTo: ["Convolutional Neural Networks"],
    realWorld: "The first layer of a CNN typically learns edge detectors (horizontal, vertical, diagonal) spontaneously.",
    depth: { eli5: "Tiny pattern-matchers that slide across an image looking for their shape.", expert: "A learned kernel K ∈ ℝ^{k×k×Cin} applied as discrete cross-correlation: (I★K)[i,j] = ΣₘΣₙ I[i+m,j+n]·K[m,n]" },
  },
  "Transformers": {
    definition: "A neural network architecture relying entirely on attention mechanisms rather than convolutions or recurrence, enabling parallel processing of sequences.",
    analogy: "Like a room where everyone can talk to everyone else at once — instead of passing notes person to person.",
    deeper: ["What is the 'Attention Is All You Need' paper?", "How do positional encodings work?"],
    relatedTo: ["natural language processing", "self-attention mechanism", "deep learning"],
    realWorld: "GPT-4, Claude, Gemini, BERT — virtually every modern language AI is a Transformer.",
    depth: { eli5: "A smarter way for computers to understand sentences by letting every word pay attention to every other word.", expert: "A sequence-to-sequence model using multi-head scaled dot-product attention: Attn(Q,K,V) = softmax(QKᵀ/√dₖ)V with O(n²d) complexity." },
  },
  "natural language processing": {
    definition: "A field of AI focused on enabling computers to understand, interpret, and generate human language.",
    analogy: "Teaching a computer to speak human — not just words, but context, tone, and meaning.",
    deeper: ["What is tokenization?", "What is the difference between NLU and NLG?"],
    relatedTo: ["Transformers", "feature representations", "self-attention mechanism"],
    realWorld: "NLP powers Google Search autocomplete, Siri, email smart replies, and content moderation.",
    depth: { eli5: "Getting computers to understand and write human language like we do.", expert: "Computational modeling of natural language via symbolic, statistical, or neural methods — spanning morphology, syntax, semantics, and pragmatics." },
  },
  "self-attention mechanism": {
    definition: "A mechanism where each element in a sequence computes a weighted sum of all other elements, letting the model focus on relevant context dynamically.",
    analogy: "Like reading a sentence and instinctively knowing which earlier words are most relevant to understanding the current word.",
    deeper: ["What are query, key, and value in attention?", "What is multi-head attention?"],
    relatedTo: ["Transformers", "natural language processing"],
    realWorld: "In 'The animal didn't cross the street because it was tired' — attention links 'it' to 'animal', not 'street'.",
    depth: { eli5: "Each word in a sentence gets to 'look at' all other words and decide which ones matter most for understanding it.", expert: "For sequence X ∈ ℝ^{n×d}, compute Q=XWQ, K=XWK, V=XWV; output = softmax(QKᵀ/√d)V, learning contextual representations in O(n²) time." },
  },
};

// ─── AI Nudges ────────────────────────────────────────────────────────────────
const NUDGES = [
  { trigger: "backpropagation", message: "💡 You just explored backpropagation — it relies heavily on gradients. Want to see how they're computed?", suggestTerm: "gradients" },
  { trigger: "Neural networks", message: "🔗 Neural networks are inspired by biological neurons — curious how the real thing compares?", suggestTerm: "biological neurons" },
  { trigger: "activation function", message: "⚡ Activation functions exist because of a deeper math reason. Explore gradients to see why they matter.", suggestTerm: "gradients" },
  { trigger: "Transformers", message: "🚀 Transformers are what powers Claude and GPT — the self-attention mechanism is the secret. Explore it?", suggestTerm: "self-attention mechanism" },
  { trigger: "deep learning", message: "🏗️ Deep architectures are only possible because of smart training algorithms. Explore backpropagation to connect the dots.", suggestTerm: "backpropagation" },
  { trigger: "Convolutional Neural Networks", message: "🖼️ CNNs use convolutional filters as their secret weapon. See how they actually work?", suggestTerm: "convolutional filters" },
];

// ─── Sentences Map ────────────────────────────────────────────────────────────
const SENTENCES_MAP = {
  1: "Neural networks are computational models loosely inspired by the biological neurons in the human brain.",
  2: "Each neuron applies an activation function to its weighted inputs, producing an output passed to the next layer via backpropagation.",
  3: "Deep learning refers to neural networks with many hidden layers that learn hierarchical feature representations from raw data.",
  4: "Convolutional Neural Networks excel at image tasks, while Transformers revolutionized natural language processing through the self-attention mechanism.",
};

const TRANSLATIONS = {
  1: "Neural networks = computer systems that mimic how the brain processes information.",
  2: "Each unit in the network uses a formula to decide what signal to pass along, and an algorithm called backpropagation fixes mistakes.",
  3: "Deep learning = AI with many stacked processing layers that learn increasingly complex patterns.",
  4: "CNNs are great at images; Transformers are great at language — both are types of deep learning.",
};

// ─── Explore Modes Data ───────────────────────────────────────────────────────
const WONDER_QUESTIONS = {
  S1: [
    "If neurons are just math — why do neural networks sometimes behave in unexpected ways?",
    "Could a neural network ever develop genuine understanding, or just pattern matching?",
    "What happens inside a neural network when it makes a mistake?",
  ],
  S2: [
    "If Transformers rely on attention — what would a network without attention look like?",
    "Why do CNNs work better on images while Transformers work on text — what's the key difference?",
    "Could a single architecture eventually handle all types of data?",
  ],
};

// ─── Depth Level Labels ───────────────────────────────────────────────────────
const DEPTH_LABELS = ["ELI5", "Standard", "Expert"];

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ExploreToLearn() {
  const [mode, setMode] = useState("explore");
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [depthLevel, setDepthLevel] = useState(1); // 0=ELI5, 1=Standard, 2=Expert
  const [panelTab, setPanelTab] = useState("what");
  const [trail, setTrail] = useState([]);
  const [nudge, setNudge] = useState(null);
  const [selectedSentence, setSelectedSentence] = useState(null);
  const [translatedSentence, setTranslatedSentence] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [expandedQA, setExpandedQA] = useState({});
  const [connections, setConnections] = useState([]);
  const [trailOpen, setTrailOpen] = useState(true);
  const [sparkPos, setSparkPos] = useState({ x: 0, y: 0 });
  const [showSpark, setShowSpark] = useState(false);
  const nudgeTimeout = useRef(null);

  const openTerm = useCallback((term, e) => {
    if (!KNOWLEDGE[term]) return;
    setSelectedTerm(term);
    setPanelTab("what");
    if (e) {
      setSparkPos({ x: e.clientX, y: e.clientY });
      setShowSpark(true);
      setTimeout(() => setShowSpark(false), 600);
    }
    // Add to trail
    setTrail(prev => {
      if (prev.find(t => t.term === term)) return prev;
      return [...prev, { term, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }];
    });
    // Update connections
    const rel = KNOWLEDGE[term]?.relatedTo || [];
    setConnections(prev => {
      const newConns = [...prev];
      rel.forEach(r => { if (!newConns.find(c => c.a === term && c.b === r)) newConns.push({ a: term, b: r }); });
      return newConns;
    });
    // Nudge
    clearTimeout(nudgeTimeout.current);
    const n = NUDGES.find(n => n.trigger === term);
    if (n) {
      nudgeTimeout.current = setTimeout(() => { setNudge(n); setTimeout(() => setNudge(null), 6000); }, 2000);
    }
  }, []);

  const modes = [
    { id: "explore", label: "🔭 Explore", color: "#f59e0b" },
    { id: "word", label: "📖 Word", color: "#60a5fa" },
    { id: "sentence", label: "✏️ Sentence", color: "#34d399" },
    { id: "summary", label: "📋 Summary", color: "#a78bfa" },
    { id: "qa", label: "❓ Q&A", color: "#f472b6" },
  ];

  const activeMode = modes.find(m => m.id === mode);

  return (
    <div style={{
      fontFamily: "'Georgia', serif",
      background: "#0d1117",
      minHeight: "100vh",
      color: "#e6edf3",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Spark burst on term click */}
      {showSpark && (
        <div style={{
          position: "fixed", left: sparkPos.x - 20, top: sparkPos.y - 20,
          width: 40, height: 40, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(245,158,11,0.6) 0%, transparent 70%)",
          animation: "sparkBurst 0.6s ease-out forwards",
          zIndex: 9999, pointerEvents: "none",
        }} />
      )}

      {/* CSS Animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=JetBrains+Mono:wght@400;500&family=Lato:wght@300;400;700&display=swap');
        @keyframes sparkBurst { 0%{transform:scale(0);opacity:1} 100%{transform:scale(4);opacity:0} }
        @keyframes slideIn { from{transform:translateX(20px);opacity:0} to{transform:translateX(0);opacity:1} }
        @keyframes nudgeIn { from{transform:translateY(100px);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,0.4)} 50%{box-shadow:0 0 0 6px rgba(245,158,11,0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes glow { 0%,100%{text-shadow:0 0 8px rgba(245,158,11,0.5)} 50%{text-shadow:0 0 20px rgba(245,158,11,0.9),0 0 40px rgba(245,158,11,0.3)} }
        .term-chip:hover { background:#1e2d3d!important; border-color:#f59e0b!important; transform:translateY(-1px); }
        .mode-btn:hover { opacity:0.9; transform:translateY(-1px); }
        .panel-tab:hover { background:rgba(255,255,255,0.08)!important; }
        .sentence-hover:hover { background:rgba(52,211,153,0.1)!important; cursor:pointer; border-radius:4px; }
        .section-btn:hover { border-color:#a78bfa!important; background:rgba(167,139,250,0.1)!important; }
        .qa-item:hover { border-color:#f472b6!important; }
        .wonder-q:hover { border-color:#f59e0b!important; background:rgba(245,158,11,0.08)!important; }
        .explore-term { position:relative; cursor:pointer; }
        .explore-term::after { content:''; position:absolute; bottom:-2px; left:0; right:0; height:1px; background:rgba(245,158,11,0.4); transform:scaleX(0); transition:transform 0.2s; transform-origin:left; }
        .explore-term:hover::after { transform:scaleX(1); }
        .scrollable { scrollbar-width:thin; scrollbar-color:#2d3748 transparent; }
        .scrollable::-webkit-scrollbar { width:4px; } .scrollable::-webkit-scrollbar-thumb { background:#2d3748; border-radius:2px; }
      `}</style>

      {/* ── Header ── */}
      <header style={{ background: "#161b22", borderBottom: "1px solid #21262d", padding: "12px 24px", display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
        <div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, color: "#f59e0b", letterSpacing: 0.5 }}>
            {DOCUMENT.title}
          </div>
          <div style={{ fontFamily: "'Lato', sans-serif", fontSize: 11, color: "#6b7280", marginTop: 2 }}>
            {trail.length} concepts explored · {connections.length} connections discovered
          </div>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {modes.map(m => (
            <button key={m.id} className="mode-btn" onClick={() => setMode(m.id)} style={{
              fontFamily: "'Lato', sans-serif", fontSize: 12, fontWeight: 600,
              padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer",
              transition: "all 0.2s",
              background: mode === m.id ? m.color : "#21262d",
              color: mode === m.id ? "#0d1117" : "#8b949e",
            }}>{m.label}</button>
          ))}
        </div>

        <button onClick={() => setTrailOpen(o => !o)} style={{
          background: "#21262d", border: "1px solid #30363d", color: "#8b949e",
          padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontFamily: "'Lato', sans-serif",
        }}>
          {trailOpen ? "Hide" : "Show"} Trail
        </button>
      </header>

      {/* ── Body ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── Document Panel ── */}
        <main style={{ flex: 1, overflow: "auto", padding: "32px 40px" }} className="scrollable">
          {/* Mode Banner */}
          {mode === "explore" && (
            <div style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.1), rgba(251,191,36,0.05))", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, padding: "12px 20px", marginBottom: 28, display: "flex", alignItems: "center", gap: 12, animation: "fadeIn 0.4s" }}>
              <span style={{ fontSize: 24 }}>🔭</span>
              <div>
                <div style={{ fontFamily: "'Lato', sans-serif", fontWeight: 700, fontSize: 13, color: "#f59e0b" }}>Explore to Learn Mode</div>
                <div style={{ fontFamily: "'Lato', sans-serif", fontSize: 12, color: "#6b7280" }}>Click any highlighted term to dive deep · Follow AI nudges to discover connections · Build your knowledge trail</div>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 4, alignItems: "center" }}>
                <span style={{ fontFamily: "'Lato', sans-serif", fontSize: 11, color: "#6b7280", marginRight: 4 }}>Depth:</span>
                {DEPTH_LABELS.map((l, i) => (
                  <button key={l} onClick={() => setDepthLevel(i)} style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 10, padding: "3px 8px",
                    borderRadius: 4, border: "1px solid", cursor: "pointer", transition: "all 0.15s",
                    background: depthLevel === i ? "#f59e0b" : "transparent",
                    color: depthLevel === i ? "#0d1117" : "#6b7280",
                    borderColor: depthLevel === i ? "#f59e0b" : "#30363d",
                  }}>{l}</button>
                ))}
              </div>
            </div>
          )}
          {mode === "sentence" && (
            <div style={{ background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 12, padding: "12px 20px", marginBottom: 28, fontFamily: "'Lato', sans-serif", fontSize: 12, color: "#34d399", animation: "fadeIn 0.4s" }}>
              ✏️ <strong>Sentence Mode</strong> — Click any sentence to translate it into simpler language
            </div>
          )}
          {mode === "summary" && (
            <div style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 12, padding: "12px 20px", marginBottom: 28, fontFamily: "'Lato', sans-serif", fontSize: 12, color: "#a78bfa", animation: "fadeIn 0.4s" }}>
              📋 <strong>Summary Mode</strong> — Click a section ID to get its summary
            </div>
          )}
          {mode === "word" && (
            <div style={{ background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.2)", borderRadius: 12, padding: "12px 20px", marginBottom: 28, fontFamily: "'Lato', sans-serif", fontSize: 12, color: "#60a5fa", animation: "fadeIn 0.4s" }}>
              📖 <strong>Word Mode</strong> — Domain terms are highlighted. Click to see their definitions.
            </div>
          )}
          {mode === "qa" && (
            <div style={{ background: "rgba(244,114,182,0.08)", border: "1px solid rgba(244,114,182,0.2)", borderRadius: 12, padding: "12px 20px", marginBottom: 28, fontFamily: "'Lato', sans-serif", fontSize: 12, color: "#f472b6", animation: "fadeIn 0.4s" }}>
              ❓ <strong>Q&A Mode</strong> — Review key questions and answers for each section
            </div>
          )}

          {/* Sections */}
          {DOCUMENT.sections.map(section => (
            <section key={section.id} style={{ marginBottom: 48, animation: "fadeIn 0.5s" }}>
              {/* Section header */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                {(mode === "summary") && (
                  <button className="section-btn" onClick={() => setSelectedSection(selectedSection === section.id ? null : section.id)} style={{
                    fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600,
                    padding: "3px 10px", borderRadius: 6, border: "1px solid #a78bfa",
                    background: selectedSection === section.id ? "rgba(167,139,250,0.2)" : "transparent",
                    color: "#a78bfa", cursor: "pointer", transition: "all 0.2s", animation: "pulse 2s infinite",
                  }}>{section.id}</button>
                )}
                {mode !== "summary" && (
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#30363d", fontWeight: 600 }}>{section.id}</span>
                )}
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: "#e6edf3", margin: 0 }}>
                  {section.heading}
                </h2>
              </div>

              {/* Summary reveal */}
              {mode === "summary" && selectedSection === section.id && (
                <div style={{ background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.3)", borderRadius: 10, padding: "14px 18px", marginBottom: 16, fontFamily: "'Lato', sans-serif", fontSize: 14, color: "#d8b4fe", lineHeight: 1.7, animation: "slideIn 0.3s" }}>
                  <strong>Summary:</strong> {section.summary}
                </div>
              )}

              {/* Document Text */}
              {mode !== "qa" && (
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, lineHeight: 2, color: "#c9d1d9" }}>
                  {renderSentences(section, mode, selectedTerm, selectedSentence, translatedSentence, openTerm, setSelectedSentence, setTranslatedSentence, depthLevel)}
                </div>
              )}

              {/* Q&A Mode */}
              {mode === "qa" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {section.qa.map((item, i) => (
                    <div key={i} className="qa-item" onClick={() => setExpandedQA(p => ({ ...p, [`${section.id}-${i}`]: !p[`${section.id}-${i}`] }))} style={{
                      border: "1px solid #21262d", borderRadius: 10, padding: "14px 18px",
                      cursor: "pointer", transition: "all 0.2s", background: "#161b22",
                    }}>
                      <div style={{ fontFamily: "'Lato', sans-serif", fontSize: 14, fontWeight: 700, color: "#f472b6", marginBottom: 4 }}>Q: {item.q}</div>
                      {expandedQA[`${section.id}-${i}`] && (
                        <div style={{ fontFamily: "'Lato', sans-serif", fontSize: 14, color: "#c9d1d9", marginTop: 8, paddingTop: 8, borderTop: "1px solid #21262d", animation: "fadeIn 0.3s" }}>
                          <strong>A:</strong> {item.a}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Wonder Questions (Explore mode only) */}
              {mode === "explore" && WONDER_QUESTIONS[section.id] && (
                <div style={{ marginTop: 28, borderTop: "1px solid #1c2128", paddingTop: 20 }}>
                  <div style={{ fontFamily: "'Lato', sans-serif", fontSize: 11, fontWeight: 700, color: "#f59e0b", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
                    ✨ Wonder Questions
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {WONDER_QUESTIONS[section.id].map((q, i) => (
                      <div key={i} className="wonder-q" style={{
                        fontFamily: "'Playfair Display', serif", fontStyle: "italic",
                        fontSize: 14, color: "#8b949e", padding: "10px 16px",
                        border: "1px solid #21262d", borderRadius: 8, cursor: "pointer",
                        transition: "all 0.2s",
                      }}>"{q}"</div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          ))}
        </main>

        {/* ── Right Panel: Knowledge Detail ── */}
        {selectedTerm && KNOWLEDGE[selectedTerm] && (mode === "explore" || mode === "word") && (
          <aside style={{ width: 340, background: "#161b22", borderLeft: "1px solid #21262d", display: "flex", flexDirection: "column", animation: "slideIn 0.3s", flexShrink: 0 }}>
            <div style={{ padding: "20px 20px 0", borderBottom: "1px solid #21262d" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, color: "#f59e0b", lineHeight: 1.3, animation: "glow 2s infinite" }}>
                  {selectedTerm}
                </div>
                <button onClick={() => setSelectedTerm(null)} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
              </div>

              {/* Panel tabs */}
              <div style={{ display: "flex", gap: 4, marginTop: 12 }}>
                {[["what", "What"], ["why", "Analogy"], ["more", "Dig Deeper"], ["real", "Real World"]].map(([id, label]) => (
                  <button key={id} className="panel-tab" onClick={() => setPanelTab(id)} style={{
                    fontFamily: "'Lato', sans-serif", fontSize: 11, fontWeight: 600,
                    padding: "6px 10px", borderRadius: "6px 6px 0 0", border: "none",
                    cursor: "pointer", transition: "all 0.15s",
                    background: panelTab === id ? "#0d1117" : "transparent",
                    color: panelTab === id ? "#f59e0b" : "#6b7280",
                    borderBottom: panelTab === id ? "2px solid #f59e0b" : "2px solid transparent",
                  }}>{label}</button>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, overflow: "auto", padding: 20 }} className="scrollable">
              {panelTab === "what" && (
                <div style={{ animation: "fadeIn 0.3s" }}>
                  <div style={{ fontFamily: "'Lato', sans-serif", fontSize: 14, lineHeight: 1.8, color: "#c9d1d9" }}>
                    {depthLevel === 0 ? KNOWLEDGE[selectedTerm].depth.eli5
                      : depthLevel === 2 ? KNOWLEDGE[selectedTerm].depth.expert
                      : KNOWLEDGE[selectedTerm].definition}
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontFamily: "'Lato', sans-serif", fontSize: 10, fontWeight: 700, color: "#30363d", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>Related Concepts</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {KNOWLEDGE[selectedTerm].relatedTo.map(rel => (
                        <button key={rel} className="term-chip" onClick={(e) => openTerm(rel, e)} style={{
                          fontFamily: "'Lato', sans-serif", fontSize: 11, padding: "4px 10px",
                          borderRadius: 20, border: "1px solid #30363d", background: "#1c2128",
                          color: "#8b949e", cursor: "pointer", transition: "all 0.2s",
                        }}>{rel}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {panelTab === "why" && (
                <div style={{ animation: "fadeIn 0.3s" }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>💡</div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 15, lineHeight: 1.9, color: "#c9d1d9" }}>
                    "{KNOWLEDGE[selectedTerm].analogy}"
                  </div>
                </div>
              )}
              {panelTab === "more" && (
                <div style={{ animation: "fadeIn 0.3s" }}>
                  <div style={{ fontFamily: "'Lato', sans-serif", fontSize: 12, color: "#6b7280", marginBottom: 12 }}>Questions to explore next:</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {KNOWLEDGE[selectedTerm].deeper.map((q, i) => (
                      <div key={i} style={{ background: "#0d1117", border: "1px solid #21262d", borderRadius: 8, padding: "12px 14px", fontFamily: "'Playfair Display', serif", fontStyle: "italic", fontSize: 14, color: "#e6edf3", cursor: "pointer" }}>
                        {q}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {panelTab === "real" && (
                <div style={{ animation: "fadeIn 0.3s" }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>🌍</div>
                  <div style={{ fontFamily: "'Lato', sans-serif", fontSize: 14, lineHeight: 1.8, color: "#c9d1d9" }}>
                    {KNOWLEDGE[selectedTerm].realWorld}
                  </div>
                </div>
              )}
            </div>
          </aside>
        )}

        {/* ── Trail Sidebar ── */}
        {trailOpen && (
          <aside style={{ width: 220, background: "#0d1117", borderLeft: "1px solid #21262d", padding: "20px 16px", overflow: "auto", flexShrink: 0 }} className="scrollable">
            <div style={{ fontFamily: "'Lato', sans-serif", fontSize: 10, fontWeight: 700, color: "#30363d", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16 }}>
              Your Knowledge Trail
            </div>

            {trail.length === 0 ? (
              <div style={{ fontFamily: "'Lato', sans-serif", fontSize: 12, color: "#30363d", lineHeight: 1.7 }}>
                Click on any highlighted term to start exploring...
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {trail.map((item, i) => (
                  <button key={item.term} onClick={(e) => openTerm(item.term, e)} style={{
                    background: selectedTerm === item.term ? "rgba(245,158,11,0.1)" : "transparent",
                    border: `1px solid ${selectedTerm === item.term ? "rgba(245,158,11,0.3)" : "#1c2128"}`,
                    borderRadius: 8, padding: "10px 12px", cursor: "pointer", textAlign: "left",
                    transition: "all 0.2s", animation: "slideIn 0.3s",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#f59e0b", fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
                        {i + 1}
                      </div>
                      <div style={{ fontFamily: "'Lato', sans-serif", fontSize: 12, color: selectedTerm === item.term ? "#f59e0b" : "#8b949e", fontWeight: 600, lineHeight: 1.3 }}>{item.term}</div>
                    </div>
                    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#30363d", marginTop: 4, marginLeft: 28 }}>{item.time}</div>
                  </button>
                ))}
              </div>
            )}

            {connections.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <div style={{ fontFamily: "'Lato', sans-serif", fontSize: 10, fontWeight: 700, color: "#30363d", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>
                  Connections Found
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {connections.slice(-5).map((c, i) => (
                    <div key={i} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "#4b5563", lineHeight: 1.6 }}>
                      <span style={{ color: "#f59e0b" }}>{c.a.split(" ")[0]}</span>
                      <span style={{ color: "#30363d" }}> → </span>
                      <span style={{ color: "#60a5fa" }}>{c.b.split(" ")[0]}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {trail.length >= 3 && (
              <div style={{ marginTop: 24, background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontFamily: "'Lato', sans-serif", fontSize: 11, fontWeight: 700, color: "#f59e0b", marginBottom: 4 }}>🔥 On a Roll!</div>
                <div style={{ fontFamily: "'Lato', sans-serif", fontSize: 11, color: "#6b7280", lineHeight: 1.6 }}>You've explored {trail.length} concepts. Keep discovering connections!</div>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* ── AI Nudge Toast ── */}
      {nudge && (
        <div style={{
          position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
          background: "#161b22", border: "1px solid rgba(245,158,11,0.4)",
          borderRadius: 12, padding: "14px 20px", maxWidth: 500,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(245,158,11,0.1)",
          animation: "nudgeIn 0.5s", zIndex: 100, display: "flex", alignItems: "center", gap: 14,
        }}>
          <div style={{ flex: 1, fontFamily: "'Lato', sans-serif", fontSize: 13, color: "#c9d1d9", lineHeight: 1.6 }}>
            {nudge.message}
          </div>
          <button onClick={(e) => { openTerm(nudge.suggestTerm, e); setNudge(null); }} style={{
            background: "#f59e0b", border: "none", borderRadius: 8,
            color: "#0d1117", fontFamily: "'Lato', sans-serif", fontSize: 12, fontWeight: 700,
            padding: "8px 14px", cursor: "pointer", whiteSpace: "nowrap",
          }}>Explore →</button>
          <button onClick={() => setNudge(null)} style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: 16 }}>×</button>
        </div>
      )}
    </div>
  );
}

// ─── Render Sentences Helper ──────────────────────────────────────────────────
function renderSentences(section, mode, selectedTerm, selectedSentence, translatedSentence, openTerm, setSelectedSentence, setTranslatedSentence, depthLevel) {
  // Group by sentence for sentence mode
  const sentenceGroups = {};
  section.text.forEach(token => {
    if (token.sentence === -1) return;
    if (!sentenceGroups[token.sentence]) sentenceGroups[token.sentence] = [];
    sentenceGroups[token.sentence].push(token);
  });

  if (mode === "sentence") {
    return Object.entries(sentenceGroups).map(([sentId, tokens]) => {
      const sid = parseInt(sentId);
      const isSelected = selectedSentence === sid;
      return (
        <span key={sid}>
          <span
            className="sentence-hover"
            onClick={() => {
              if (selectedSentence === sid) { setSelectedSentence(null); setTranslatedSentence(null); }
              else { setSelectedSentence(sid); setTranslatedSentence(TRANSLATIONS[sid]); }
            }}
            style={{ padding: "2px 0", background: isSelected ? "rgba(52,211,153,0.12)" : "transparent", borderRadius: 4, cursor: "pointer", transition: "background 0.2s" }}
          >
            {tokens.map(t => t.word).join("")}
          </span>
          {isSelected && translatedSentence && (
            <span style={{ display: "block", margin: "8px 0 12px 0", background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)", borderRadius: 8, padding: "10px 14px", fontFamily: "'Lato', sans-serif", fontSize: 13, color: "#34d399", lineHeight: 1.7, fontStyle: "italic" }}>
              💬 {translatedSentence}
            </span>
          )}
          {" "}
        </span>
      );
    });
  }

  // Word / Explore / Summary mode: render token by token
  return section.text.map(token => {
    if (token.word === "\n\n") return <><br key={token.id} /><br /></>;

    const isDomainMode = mode === "word" || mode === "explore" || mode === "summary";
    const isActive = selectedTerm === token.word;

    if (token.isDomain && isDomainMode) {
      return (
        <span
          key={token.id}
          className="explore-term"
          onClick={(e) => openTerm(token.word, e)}
          style={{
            color: mode === "word" ? "#60a5fa" : isActive ? "#fbbf24" : "#f59e0b",
            fontWeight: 600,
            cursor: "pointer",
            padding: "0 2px",
            borderRadius: 3,
            background: isActive ? "rgba(245,158,11,0.12)" : "transparent",
            transition: "all 0.15s",
            animation: isActive ? "pulse 1.5s infinite" : "none",
            textDecoration: mode === "explore" ? "underline" : "none",
            textDecorationColor: "rgba(245,158,11,0.3)",
            textUnderlineOffset: 3,
          }}
        >
          {token.word}
        </span>
      );
    }

    return <span key={token.id}>{token.word}</span>;
  });
}
