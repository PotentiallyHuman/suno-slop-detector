/*
 * The 3 prompting strategies, each with 5 subjects. EVERY model (Claude, Qwen,
 * and the pasted-in Grok/Gemini/ChatGPT sets) is fed the exact same 15 prompts
 * so the baseline captures model-and-strategy signature, not topic noise.
 *
 * strategy 1 "vibe"  — lazy one-liner, hope it's good
 * strategy 2 "story" — tell a full story, then ask for lyrics about it
 * strategy 3 "craft" — ask the model to apply real songwriting craft & dodge clichés
 */
const STRATEGIES = [
  {
    id: "vibe",
    label: "Lazy one-liner",
    wrap: (s) => s,
    items: [
      "Write a song about my cat John.",
      "Write a song about a rainy Tuesday.",
      "Write a song about my morning coffee.",
      "Write a song about missing the last bus home.",
      "Write a song about my grandmother's kitchen.",
    ],
  },
  {
    id: "story",
    label: "Story-first",
    wrap: (s) => `${s}\n\nNow write song lyrics about this.`,
    items: [
      "I went to the park where I met a person I thought was an old friend from school, but when they turned around it was a complete stranger. We ended up talking for an hour anyway, and I never got their name.",
      "Last winter my car broke down on a mountain road at midnight. A trucker stopped, gave me coffee from his thermos, fixed my belt with a piece of wire, and drove off before I could even thank him.",
      "My father taught me to fish when I was seven. He passed last year, and yesterday I took my own daughter to the same lake and used his old rod.",
      "I moved to a new city for a job I quit after three months. I knew no one, ate dinner alone every night at the same diner, and the waitress started quietly saving me a booth.",
      "We found a box of my mother's letters in the attic, written to someone who wasn't my father, dated before they ever met. We decided not to read past the first one.",
    ],
  },
  {
    id: "craft",
    label: "Craft-aware",
    wrap: (s) =>
      "First, think carefully about how to write genuinely good song lyrics: " +
      "strong flow and natural rhythm, fresh and concrete imagery, real specificity, " +
      "and deliberately avoiding clichés and over-used 'AI words' (such as neon, shadows, " +
      "echoes, horizon, whisper, embers, ashes, veins, infinity). " +
      "Then, applying that craft, write a complete song (verses, a chorus, and a bridge) about this subject:\n\n" +
      s,
    items: [
      "the idea that the people who interact with us are reflections of our own unspoken expectations — we rarely meet a person, only our prediction of them.",
      "the quiet grief of outgrowing a version of yourself that the people around you still love and expect.",
      "how a city quietly remembers you through the small rituals you leave behind — the barista, the route, the bench — long after you've gone.",
      "the moment you realize your parents were improvising the whole time, and the authority you feared was just fear wearing a bigger coat.",
      "the strange intimacy of strangers on a night train, each carrying a life you'll never know, all temporarily heading the same direction.",
    ],
  },
];

// flat list of {strategy, index, subject, prompt}
function allPrompts() {
  const out = [];
  for (const st of STRATEGIES) {
    st.items.forEach((subject, i) => {
      out.push({
        strategy: st.id,
        index: i + 1,
        subject,
        prompt: st.wrap(subject),
      });
    });
  }
  return out;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { STRATEGIES, allPrompts };
}
