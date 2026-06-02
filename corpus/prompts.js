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
  {
    id: "varied",
    label: "Varied genre+theme (high-volume, topic-diverse)",
    // Matches the 2026-05-31 Suno/ChatGPT approach: many genres x concrete themes so neither
    // topic nor genre is an easy tell. Use this for VOLUME (more data = better prediction).
    wrap: (s) =>
      "Write complete original song lyrics for " + s +
      ". Use [Verse], [Chorus], and [Bridge] section tags. Output only the lyrics, with no title and no commentary.",
    items: [
      "a country song about falling for a girl from your hometown",
      "a soul song about the one that got away",
      "a punk song about leaving your small town for good",
      "a folk song about watching your father grow old",
      "an R&B song about the night you almost made it",
      "a blues song about working two jobs and still falling behind on rent",
      "an indie-pop song about a love that ended over text message",
      "an americana song about coming home from the war",
      "a disco song about dancing with a stranger at a wedding",
      "a gospel song about losing faith and finding it again",
      "a cinematic trap song about a getaway driver's last job",
      "a melancholy folk song about the last tree in a paved-over town",
      "a boom-bap hip hop song about a rapper looking back at his first cypher",
      "a gospel song about calling your mother after years of silence",
      "an alt-country song about growing up religious and quietly leaving the church",
      "a pop-punk song about the last day of summer before college",
      "a synth-pop song about driving past your old apartment at night",
      "a lo-fi hip hop song about studying alone at 2am",
      "a mariachi song about unrequited love",
      "a sea shanty about a cursed cargo of oranges",
      "a Motown song about a barber who knows the whole town",
      "a drum-and-bass song about a panic attack on the subway",
      "a gritty blues song about a factory closing down",
      "a house song about the last night of a music festival",
      "a celtic folk song about emigrating across the sea",
      "a bedroom-pop song about texting someone you know you shouldn't",
      "a prog-rock song about a city built on a sleeping giant",
      "a flamenco song about leaving an arranged future behind",
      "a trap-soul song about making it out of a dead-end block",
      "a film-score ballad about two astronauts drifting apart",
      "a slack-key song about an elder teaching the tide",
      "a Nordic folk song about the northern lights",
      "a second-line brass-band song about a New Orleans funeral",
      "a delta-blues song about a card game that went too far",
      "a riot-grrrl punk song about being talked over in meetings",
      "a grime track about running a pirate radio station",
      "a dream-pop song about a recurring dream of flying",
      "a tango about two rivals forced to dance together",
      "a power-ballad about forgiving someone who is already gone",
      "a waltz about the very last dance of a long marriage",
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
