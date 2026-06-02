#!/usr/bin/env python3
"""Hourly batch: 10 Claude-authored songs -> corpus."""
import datetime as dt, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import corpus_io
from save_batch import out_dir, bump_state

TS = "2026-05-30T05:31:08"
MODEL = "claude-opus-4-8"
ts = dt.datetime.fromisoformat(TS)
OD = out_dir()

SONGS = [
(1,
 "give me a 1950s doo-wop song about the ghost in my childhood home",
 {"genre":"1950s doo-wop","subject":"the ghost in my childhood home","strategy":"era"},
"""[Intro]
(Ooh, sha-la-la, ooh-ooh)

[Verse]
There's a shadow on the staircase where I used to play
Bum-ba-dum, she never went away
My mama said it's nothing but the settling of the wood
But I know my old friend's standing where she always stood

[Chorus]
Ghost of mine, oh ghost of mine (ooh-ooh)
You kept the porch light burning all this time
While the world outside went modern and the old town rearranged
You stayed the same, my ghost, you never changed

[Verse]
I came back with my suitcase and the keys felt strange and small
Bum-ba-dum, she met me in the hall
Not a chill, not a fright, just a hand upon my cheek
Like she'd waited fifty Sundays for the words I couldn't speak

[Chorus]
Ghost of mine, oh ghost of mine (ooh-ooh)
You kept the porch light burning all this time
So I'll dance you 'round the kitchen like my daddy danced my mom
Stay a little longer, then I'll let you carry on

[Outro]
(Sha-la-la, goodnight, my ghost, goodnight)"""),

(2,
 "country song. subject: a group project gone wrong. mood: bittersweet.",
 {"genre":"country","subject":"a group project gone wrong","mood":"bittersweet","strategy":"subject_vibe"},
"""[Verse]
Four names on a title page and only two who tried
Me and quiet Caroline up burnin' midnight oil
Jake just sent a thumbs-up and a promise made of smoke
And Danny never answered, so we carried all the load

[Chorus]
And we got the A they didn't earn
But I'd do it all again to learn
That the ones who show up in the rain
Are worth more than the grade you put your name to in the end

[Verse]
Caroline's a nurse now and Jake sells used cars downtown
Funny how a slideshow tells you who'll be there around
We laughed until 2 a.m. over gas-station coffee cups
That's the part I kept — the project's gone, but not the us

[Chorus]
And we got the A they didn't earn
But I'd do it all again to learn
That the ones who show up in the rain
Are worth more than the grade you put your name to in the end

[Outro]
So here's to Caroline, wherever you are tonight"""),

(3,
 "western swing song about an arcade closing for good. constraint: use strict AABB rhyming couplets the whole way.",
 {"genre":"western swing","subject":"an arcade closing for good","constraint":"AABB couplets only","strategy":"constraint"},
"""[Verse]
The neon's goin' dark on Avenue B
The pinball's played its final melody
The skee-ball lanes are sleepin' in a row
And every quarter's packed and set to go

[Chorus]
So swing it slow, boys, swing it sweet and low
For every joystick we are 'bout to let go
The high-score screen still flashes out my name
But come tomorrow there ain't gonna be a game

[Verse]
The carpet's worn a path from door to crane
Where dollar dreams went chasin' down the drain
The owner counts the tokens one last time
And pockets up a memory and a dime

[Chorus]
So swing it slow, boys, swing it sweet and low
For every joystick we are 'bout to let go
The high-score screen still flashes out my name
But come tomorrow there ain't gonna be a game

[Outro]
Now fiddle me a waltz for the games we used to play
And kill the lights, old arcade, fade away"""),

(4,
 "i need a gothic rock banger",
 {"genre":"gothic rock","subject":None,"mood":"angry","strategy":"oneliner"},
"""[Verse]
I painted all my windows with the color of the night
Tore the clocks down off the wall so time can't win the fight
You called me your cathedral then you set the thing aflame
Now I wear the smoke like velvet and I'll never say your name

[Pre-Chorus]
Beat it, beat it, like a funeral drum
Here it comes, here it comes

[Chorus]
So bury me in roses I can't stand
Black lace and a candle in my hand
I am the church that you let rot
I am the love that you forgot — burn it down, burn it down!

[Verse]
The organ's playing backwards in a chapel made of rust
You wanted my devotion, now you'll choke on all my dust
Every shadow on the ceiling spells the things I never said
A cathedral full of echoes and a congregation of the dead

[Chorus]
So bury me in roses I can't stand
Black lace and a candle in my hand
I am the church that you let rot
I am the love that you forgot — burn it down, burn it down!

[Outro]
(whispered) Ash to ash... and I am free"""),

(5,
 'spoken word song about a city that never sleeps but I\'m exhausted. Title it "Concrete Promises". Lay it out as: [Intro] [Verse] [Chorus] [Bridge] [Chorus] [Outro] and label each section.',
 {"genre":"spoken word","subject":"a city that never sleeps but I'm exhausted","structure":"[Intro] [Verse] [Chorus] [Bridge] [Chorus] [Outro]","title":"Concrete Promises","strategy":"structural"},
"""[Intro]
They told me this city never sleeps.
Nobody warned me it would expect the same of me.

[Verse]
3 a.m. and the bodega hums like a held breath.
The subway grate exhales a warmth that isn't kindness, just leftover heat.
I have walked these forty blocks so many times
the sidewalk knows my weight better than my own bed does.
Everybody here is becoming something.
I am becoming tired.

[Chorus]
Concrete promises, concrete promises —
you pour them while they're soft and they set hard as a no.
The lights stay on, the lights stay on,
but nobody said the lights were on for me.

[Bridge]
And maybe rest is a place
and I just haven't been able to afford the rent there yet.
And maybe I'll sleep when the city does,
which is to say: not tonight, not tonight.

[Chorus]
Concrete promises, concrete promises —
you pour them while they're soft and they set hard as a no.
The lights stay on, the lights stay on,
but nobody said the lights were on for me.

[Outro]
So I'll keep walking.
The city and I, two insomniacs,
pretending the dawn is something we chose."""),

(6,
 "a ominous show tune song about missing someone who's still alive",
 {"genre":"show tune","subject":"missing someone who's still alive","mood":"ominous","strategy":"subject_vibe"},
"""[Verse]
(slow, theatrical, a single spotlight)
You're not dead — oh no, that would be tidy
You're across this very town tonight
Breathing in a room I'll never enter
Laughing at a joke that isn't mine

[Pre-Chorus]
And isn't it a curious kind of grave
To mourn a thing that's wonderfully, terribly alive?

[Chorus]
So I haunt the spaces where you used to be
A ghost of someone who is still on the guest list
You walk the earth, you simply walk past me
And that, my dear, is the cruelest little twist

[Verse]
(building, the orchestra swells)
I could call — the number hasn't changed
I could knock — I know which door is yours
But missing you is safer than the answer
So I'll keep the wound and lock away the cure

[Chorus]
So I haunt the spaces where you used to be
A ghost of someone who is still on the guest list
You walk the earth, you simply walk past me
And that, my dear, is the cruelest little twist

[Outro]
(spotlight narrows to black)
Curtain... but no ending. You go on. You go on."""),

(7,
 "house song about the bartender who knows too much — use collective 'we', like a whole town singing",
 {"genre":"house","subject":"the bartender who knows too much","pov":"we / collective","strategy":"pov"},
"""[Intro]
(four-on-the-floor kick, a swell of voices)
We come in, we come in, we leave it all with you...

[Verse]
We tell her everything past midnight
Every secret that we swore we'd keep
She just nods and slides another over
She's the only one in town who doesn't sleep

[Build]
And we, and we, and we
spill it all across the bar...

[Drop / Chorus]
She knows, she knows, she knows our names
She knows who cried and who's to blame
Pour it out, pour it out, let the rhythm take the weight
She knows the whole town's heart and she keeps it all so safe
(She knows, she knows, she knows)

[Verse]
We dance like she's not keeping ledgers
Of who came in with someone not their own
But she'd never, no she'd never tell it
The safest secret's one the bartender holds alone

[Drop / Chorus]
She knows, she knows, she knows our names
She knows who cried and who's to blame
Pour it out, pour it out, let the rhythm take the weight
She knows the whole town's heart and she keeps it all so safe

[Outro]
(filtered, fading) Last call... we'll be back tomorrow... she knows, she knows..."""),

(8,
 "write a techno love song that's actually about my hometown ten years later the whole time",
 {"genre":"techno","subject":"my hometown ten years later","constraint":"extended metaphor","strategy":"challenge"},
"""[Intro]
(low pulse, 128 bpm, a single synth opening like a door)

[Verse]
I came back to you, baby, after all these years
Your streets feel like a lover that I almost don't recognize
You changed your hair, your corner store, the color of your eyes
But somewhere underneath the new you, the old you still survives

[Build]
And I, and I, and I — I'm reaching through the static for your face...

[Drop]
Oh you, my first and only — you, the place that made me
You, the love I left to grow, you, the one who stayed
I press my hand against your skyline like a heartbeat
And the bassline says you missed me, says you missed me anyway

[Verse]
They paved the field where I first fell, now it's condos and a chain
But baby when the streetlight hums I feel the same old flame
You're not the girl I left behind, you're someone new instead
And loving who you've become is the hardest thing I've said

[Drop]
Oh you, my first and only — you, the place that made me
You, the love I left to grow, you, the one who stayed
I press my hand against your skyline like a heartbeat
And the bassline says you missed me, says you missed me anyway

[Outro]
(the pulse fades into traffic noise) Home... home... home..."""),

(9,
 "write a ambient song about the ocean at 3am that gets faster and more frantic toward the end",
 {"genre":"ambient","subject":"the ocean at 3am","constraint":"accelerando energy","strategy":"challenge"},
"""[Intro — very slow, breathing]
Black water.
Black water and no horizon.
The tide comes in like a thought you can't finish.

[Verse — calm]
Three a.m. and the sand is cold as a coin
The waves arrive, the waves withdraw, the waves arrive
I am very small and the dark is very kind
And nothing wants me here and that is fine, that is fine

[Verse — quickening]
But the water's getting louder now, the water's climbing fast
The foam is at my ankles and the moon has slipped behind
And the tide that felt like breathing feels like running, feels like running
And the dark that felt like kindness has a current and a mind

[Outro — frantic]
Go go go the water's at my knees the water's at my chest
the horizon's gone the shoreline's gone there's nowhere left to stand
faster faster pull of the deep the cold the cold the cold —
and then —
(silence)
(one wave. then nothing.)"""),

(10,
 "cross house with vaporwave — a song about the dog waiting by the door",
 {"genre":"house x vaporwave","subject":"the dog waiting by the door","strategy":"mashup"},
"""[Intro]
(pitched-down sample, warm tape hiss, a slow four-on-the-floor fading in)
...w a i t i n g . . . w a i t i n g . . .

[Verse]
You don't know the word for "later"
Every leaving is forever in your eyes
So you fold down by the doorway
Where my shadow disappeared into the light

[Build]
And the clock goes round, and the clock goes round
and you don't count the hours, you just wait...

[Drop / Chorus]
By the door, by the door (by the door)
You're a love that asks for nothing but the sound of my return
By the door, by the door (by the door)
And I swear I'll always come back, I'll always come back, little one

[Verse]
Vaporwave sunset through the window
A mall that closed in 1999
But you'd wait in that pink light forever
Faithful little ghost of mine

[Drop / Chorus]
By the door, by the door (by the door)
You're a love that asks for nothing but the sound of my return
By the door, by the door (by the door)
And I swear I'll always come back, I'll always come back, little one

[Outro]
(slowing, tape warping) ...good boy... I'm... home..."""),
]

written = []
for idx, brief, meta, lyrics in SONGS:
    p = corpus_io.write_song(OD, ts, idx, brief, meta, lyrics, model=MODEL, engine="claude")
    written.append(p); print("wrote", os.path.basename(p))
st = bump_state(len(written), MODEL)
print(f"[batch] {len(written)} written; corpus total={st['total']}")
