"""
briefs.py — simulate a REAL HUMAN typing a song request into Suno.

Each call to make_brief() returns (brief_text, meta) where:
  - brief_text  : the prompt a human would actually type / paste
  - meta        : structured, labeled fields (the data-point's features)

The goal is breadth: lazy one-liners, rambling story dumps, oddly-specific
craft constraints, genre mashups, persona requests, structural specs, and
quirky challenges. Each fired hour pulls 10 of these across random strategies
so the resulting corpus covers the whole space of how people prompt for lyrics.

Pure stdlib. No model here — this only builds the *request*.
"""
import random

# --------------------------------------------------------------------------
# POOLS
# --------------------------------------------------------------------------
GENRES = [
    "pop", "hip hop", "trap", "drill", "boom bap rap", "R&B", "neo-soul",
    "country", "outlaw country", "bluegrass", "folk", "indie folk", "americana",
    "rock", "classic rock", "punk", "pop punk", "emo", "post-rock", "grunge",
    "metal", "metalcore", "doom metal", "black metal", "synthwave", "vaporwave",
    "house", "deep house", "techno", "drum and bass", "dubstep", "EDM",
    "lo-fi hip hop", "jazz", "smooth jazz", "swing", "blues", "delta blues",
    "soul", "funk", "disco", "reggae", "dancehall", "afrobeats", "amapiano",
    "K-pop", "J-pop", "city pop", "bedroom pop", "dream pop", "shoegaze",
    "gospel", "worship", "musical theatre", "show tune", "opera", "classical",
    "ambient", "industrial", "gothic rock", "ska", "polka", "sea shanty",
    "nursery rhyme", "lullaby", "Christmas carol", "national anthem style",
    "spoken word", "phonk", "hyperpop", "math rock", "western swing",
]

SUBJECTS = [
    "my cat who hates everyone but me", "the last bus home", "a lighthouse keeper",
    "running out of coffee on a Monday", "an astronaut who misses gravity",
    "my grandmother's kitchen", "a vending machine that only takes exact change",
    "falling in love at a laundromat", "the friend who never texts back",
    "a small town that's slowly disappearing", "growing up too fast",
    "a haunted GPS that gives bad directions", "the night before a big move",
    "two strangers on a delayed train", "a retired boxer", "leaving a party early",
    "a robot learning to taste rain", "the ghost in my childhood home",
    "selling my first car", "an old dog at the end of summer",
    "a barista who memorizes everyone's order", "the ocean at 3am",
    "a long-distance relationship over voice memos", "winning and feeling nothing",
    "a houseplant I keep forgetting to water", "the smell of a thunderstorm coming",
    "my hometown ten years later", "a knight who's tired of being brave",
    "missing someone who's still alive", "the quiet after everyone leaves",
    "a moth in love with a streetlight", "learning to drive stick from my dad",
    "a city that never sleeps but I'm exhausted", "the day the factory closed",
    "a wedding I wasn't invited to", "an arcade closing for good",
    "the version of me that almost happened", "a sailor's wife waiting at the dock",
    "winning the lottery and telling no one", "a snow day when you're an adult",
    "the bartender who knows too much", "growing apart from a best friend",
    "a fox raiding the bins at midnight", "the last text I never sent",
    "a soldier writing home", "becoming my parents", "a diner at 2am",
    "the dog waiting by the door", "a clock that runs backwards",
    "moving to a city where I know no one", "a mango", "the wifi password",
    "tax season", "a group project gone wrong", "my noisy upstairs neighbor",
]

MOODS = [
    "melancholic", "euphoric", "bittersweet", "angry", "hopeful", "nostalgic",
    "playful", "ominous", "tender", "defiant", "lonely", "triumphant", "anxious",
    "dreamy", "menacing", "cathartic", "sarcastic", "yearning", "peaceful",
    "manic", "resigned", "flirtatious", "haunted", "celebratory",
]

POVS = [
    ("first person", "first-person 'I'"),
    ("second person", "second-person 'you', like talking to one listener"),
    ("third person narrative", "third-person, telling someone else's story"),
    ("we / collective", "collective 'we', like a whole town singing"),
    ("unusual narrator", "narrated by an object or animal"),
]

ERAS = [
    "1950s doo-wop", "1960s Motown", "1970s singer-songwriter", "1980s synth-pop",
    "1990s grunge", "early 2000s emo", "2010s streaming-era pop", "Y2K club",
    "Great Depression folk", "Victorian parlor", "future year 2099",
]

OCCASIONS = [
    "a wedding first dance", "a funeral", "a graduation", "a road trip playlist",
    "a workout pump-up", "a breakup at 2am", "a child's bedtime", "a protest march",
    "a sports stadium chant", "a campfire singalong", "a quiet rainy Sunday",
    "a New Year's countdown", "a long night shift", "a victory lap",
]

PERSONAS = [
    "a 16-year-old who just got their heart broken",
    "a tired dad of three", "a 70-year-old looking back on their life",
    "a college student pulling an all-nighter", "a touring musician missing home",
    "a barista who writes songs between shifts", "a new mom running on no sleep",
    "a guy trying to win his ex back (badly)", "an over-caffeinated optimist",
    "someone who just quit their corporate job", "a small-town kid in a big city",
]

# Craft / structural constraints — the "oddly specific" requests
CONSTRAINTS = [
    ("six end-rhymes in a row", "make six lines in a row all end on the same rhyme"),
    ("AABB couplets only", "use strict AABB rhyming couplets the whole way"),
    ("ABAB throughout", "use an ABAB rhyme scheme in every verse"),
    ("internal rhyme heavy", "pack each line with internal rhymes, not just end rhymes"),
    ("no chorus", "write it with verses only — no chorus, no repeated hook"),
    ("one repeated hook", "build the whole song around one extremely catchy repeated hook"),
    ("acrostic", "make the first letters of each line spell out the title"),
    ("every line a question", "write every single line as a question"),
    ("each line same syllable count", "make every line exactly the same number of syllables (around 8)"),
    ("one long sentence", "write the entire song as one long run-on sentence"),
    ("list song", "structure it as a list — each line names one more thing"),
    ("call and response", "write it as call-and-response between two voices"),
    ("starts each line with same word", "start every line in the verses with the same word"),
    ("no rhyme at all", "write it with no rhyming at all, like free-verse poetry set to music"),
    ("a single metaphor extended", "extend ONE central metaphor through the whole song"),
    ("countdown", "build it as a countdown from 10 down to 1"),
    ("repeats a number", "work a specific number into the song at least eight times"),
    ("uses one weird word a lot", "repeat one unusual word as a motif at least ten times"),
    ("two-line bridge twist", "end with a two-line bridge that flips the whole meaning"),
    ("present tense only", "keep it entirely in present tense"),
    ("color motif", "anchor each verse to a different color"),
    ("seasons structure", "move through all four seasons, one per section"),
    ("growing repetition", "repeat the last line of each verse one more time than the verse before"),
]

# Suno-style structure tag templates
STRUCTURES = [
    "[Verse] [Chorus] [Verse] [Chorus] [Bridge] [Chorus]",
    "[Intro] [Verse] [Pre-Chorus] [Chorus] [Verse] [Pre-Chorus] [Chorus] [Outro]",
    "[Verse] [Verse] [Chorus] [Verse] [Outro]",
    "[Hook] [Verse] [Hook] [Verse] [Hook]",
    "[Intro] [Verse] [Chorus] [Bridge] [Chorus] [Outro]",
    "[Verse] [Chorus] [Verse] [Chorus]",
]

TITLE_WORDS_A = ["Neon", "Paper", "Ghost", "Velvet", "Broken", "Golden", "Quiet",
                 "Midnight", "Lonely", "Burning", "Hollow", "Electric", "Saltwater",
                 "Static", "Crimson", "Concrete", "Plastic", "Silver", "Restless"]
TITLE_WORDS_B = ["Hearts", "Highway", "Summer", "Telephone", "Daylight", "Ghosts",
                 "Promises", "Engines", "Letters", "Static", "Avenue", "Weather",
                 "Machine", "Goodbye", "Orbit", "Wildfire", "Lullaby", "Static"]


def _g():        return random.choice(GENRES)
def _s():        return random.choice(SUBJECTS)
def _m():        return random.choice(MOODS)
def _title():    return f"{random.choice(TITLE_WORDS_A)} {random.choice(TITLE_WORDS_B)}"


# --------------------------------------------------------------------------
# STRATEGIES — each returns (brief_text, partial_meta)
# Mirrors how different humans actually prompt.
# --------------------------------------------------------------------------
def s_oneliner():
    g, m = _g(), _m()
    templates = [
        f"write a {g} song",
        f"make a {m} {g} song",
        f"{g}, {m}, go",
        f"i need a {g} banger",
        f"give me a really {m} {g} track",
    ]
    return random.choice(templates), {"genre": g, "mood": m}


def s_subject_vibe():
    g, s, m = _g(), _s(), _m()
    templates = [
        f"write a {g} song about {s}",
        f"a {m} {g} song about {s}",
        f"can you do a {g} song about {s}? make it {m}",
        f"{g} song. subject: {s}. mood: {m}.",
    ]
    return random.choice(templates), {"genre": g, "subject": s, "mood": m}


def s_story():
    s, g = _s(), _g()
    openers = [
        f"So here's the situation. There's {s}, right, and it just won't leave my head. ",
        f"Okay long story but: {s}. It's been on my mind for weeks. ",
        f"I keep thinking about {s}. It started as nothing and now it's everything. ",
        f"Picture this — {s}. That's the whole feeling I want to capture. ",
    ]
    closers = [
        f"Turn all of that into a {g} song.",
        f"Now write song lyrics about this, {g} style.",
        f"Make it a {g} song please, full lyrics.",
        f"Write me the lyrics — {g}, and don't hold back.",
    ]
    return random.choice(openers) + random.choice(closers), {"genre": g, "subject": s}


def s_constraint():
    g, s = _g(), _s()
    cname, cdesc = random.choice(CONSTRAINTS)
    templates = [
        f"write a {g} song about {s}, and {cdesc}",
        f"please make a song that {cdesc.replace('make ', '').replace('write ', '')} — {g}, about {s}",
        f"challenge: a {g} song about {s} where you {cdesc}",
        f"{g} song about {s}. constraint: {cdesc}.",
    ]
    return random.choice(templates), {"genre": g, "subject": s, "constraint": cname}


def s_structural():
    g, s = _g(), _s()
    struct = random.choice(STRUCTURES)
    title = _title()
    templates = [
        f'write a {g} song titled "{title}" about {s}. Use this structure with section tags: {struct}',
        f'{g} song about {s}. Title it "{title}". Lay it out as: {struct} and label each section.',
        f'I want a {g} song about {s} called "{title}", with proper Suno tags: {struct}',
    ]
    return random.choice(templates), {"genre": g, "subject": s,
                                      "structure": struct, "title": title}


def s_persona():
    p, g, s = random.choice(PERSONAS), _g(), _s()
    occ = random.choice(OCCASIONS)
    templates = [
        f"I'm {p}. Write me a {g} song about {s}.",
        f"Write a {g} song for {occ}, from the perspective of {p}, about {s}.",
        f"As {p}, I want to sing a {g} song about {s}. Write it for me.",
    ]
    return random.choice(templates), {"genre": g, "subject": s, "persona": p,
                                      "occasion": occ}


def s_mashup():
    g1, g2 = random.sample(GENRES, 2)
    s = _s()
    templates = [
        f"cross {g1} with {g2} — a song about {s}",
        f"{g1} meets {g2}. song about {s}. blend them.",
        f"write a {g1}/{g2} fusion song about {s}",
    ]
    return random.choice(templates), {"genre": f"{g1} x {g2}", "subject": s}


def s_era():
    era, s = random.choice(ERAS), _s()
    templates = [
        f"write a song about {s} in the style of {era}",
        f"give me a {era} song about {s}",
        f"{era} vibes, song about {s}, full lyrics",
    ]
    return random.choice(templates), {"genre": era, "subject": s}


def s_pov():
    g, s = _g(), _s()
    pov_key, pov_desc = random.choice(POVS)
    templates = [
        f"write a {g} song about {s}, told in {pov_desc}",
        f"{g} song about {s} — use {pov_desc}",
    ]
    return random.choice(templates), {"genre": g, "subject": s, "pov": pov_key}


def s_challenge():
    """The quirky / specific human asks."""
    s = _s()
    g = _g()
    challenges = [
        (f"write a {g} song that secretly never uses the letter 'e'", {"constraint": "lipogram-e"}),
        (f"write a breakup song from the point of view of the dog watching it happen", {"subject": "dog watching a breakup", "constraint": "animal POV"}),
        (f"write a {g} song where the verses are happy but the chorus is devastating", {"genre": g, "constraint": "tonal whiplash"}),
        (f"write a {g} love song that's actually about {s} the whole time", {"genre": g, "subject": s, "constraint": "extended metaphor"}),
        (f"write a {g} song about {s} but make every line sound like a fortune cookie", {"genre": g, "subject": s, "constraint": "aphoristic"}),
        (f"write a {g} song about {s} that gets faster and more frantic toward the end", {"genre": g, "subject": s, "constraint": "accelerando energy"}),
        (f"write a duet — two people arguing about {s} — {g} style", {"genre": g, "subject": s, "constraint": "duet argument"}),
        (f"write a {g} song about {s} that ends mid-sentence", {"genre": g, "subject": s, "constraint": "abrupt ending"}),
        (f"write a {g} song where the chorus is just one word repeated", {"genre": g, "constraint": "one-word chorus"}),
    ]
    text, meta = random.choice(challenges)
    meta.setdefault("genre", g)
    return text, meta


STRATEGIES = [
    ("oneliner",     s_oneliner,     6),
    ("subject_vibe", s_subject_vibe, 10),
    ("story",        s_story,        7),
    ("constraint",   s_constraint,   8),
    ("structural",   s_structural,   6),
    ("persona",      s_persona,      6),
    ("mashup",       s_mashup,       5),
    ("era",          s_era,          4),
    ("pov",          s_pov,          5),
    ("challenge",    s_challenge,    7),
]
_POOL = [(n, f) for (n, f, w) in STRATEGIES for _ in range(w)]


def make_brief():
    """Return (brief_text, meta) simulating one human's Suno request."""
    name, fn = random.choice(_POOL)
    text, meta = fn()
    meta = dict(meta)
    meta["strategy"] = name
    return text.strip(), meta


if __name__ == "__main__":
    # Smoke: print a spread of sample briefs
    for _ in range(12):
        t, m = make_brief()
        print(f"[{m['strategy']:13s}] {t}")
