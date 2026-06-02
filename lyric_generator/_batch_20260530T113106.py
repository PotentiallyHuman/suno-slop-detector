#!/usr/bin/env python3
"""Hourly batch: 10 Claude-authored songs -> corpus."""
import datetime as dt, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import corpus_io
from save_batch import out_dir, bump_state

TS = "2026-05-30T11:31:06"
MODEL = "claude-opus-4-8"
ts = dt.datetime.fromisoformat(TS)
OD = out_dir()

SONGS = [
(1,
 "challenge: a amapiano song about growing up too fast where you keep it entirely in present tense",
 {"genre":"amapiano","subject":"growing up too fast","constraint":"present tense only","strategy":"constraint"},
"""[Intro]
(log drum, shaker, that slow midnight piano roll)
Right now, right now, it's all happening now...

[Verse]
I am seventeen and I am paying my own rent
I am counting all the coins before the money's even spent
I am wearing my father's tired face in the mirror every day
I am old before the morning and I do not know the way

[Pre-Chorus]
And the bass is asking softly, are you breathing, are you here?
Slow it down, slow it down, the future's already near

[Chorus]
I am growing up too fast, the log drum knows
I am blooming and I'm wilting in the same set of clothes
Hold the night, hold the night, let me be young right now
I am running out of childhood and I don't know how

[Verse]
I am laughing at the jokes that grown folks make
I am tired in my bones for everybody's sake
I am dancing 'cause the dancing is the only time I'm free
I am twenty-five at heart and I am barely twenty-three

[Chorus]
I am growing up too fast, the log drum knows
I am blooming and I'm wilting in the same set of clothes
Hold the night, hold the night, let me be young right now
I am running out of childhood and I don't know how

[Outro]
(piano fading) Right now... I am here... right now... that is all I have..."""),

(2,
 "write a techno/musical theatre fusion song about a diner at 2am",
 {"genre":"techno x musical theatre","subject":"a diner at 2am","strategy":"mashup"},
"""[Intro]
(a lone Broadway piano, then a 130bpm kick swallows it whole)

[Verse — theatrical]
Ladies and gentlemen, the loneliest stage in town!
Fluorescent and formica, where the night owls all sit down!
The waitress is our diva, she's been on since half past nine —
(and then the beat drops)

[Drop / Chorus — techno]
TWO! A! M! At the all-night neon show!
Every broken heart's a ticket and there's nowhere left to go!
DANCE in the booth, dance in the dark, let the coffee go cold!
Two a.m. is a kingdom for the sleepless and the bold!
(uhn-tss, uhn-tss, refill please)

[Verse — theatrical]
The trucker has a solo and it's mostly in his eyes!
The cook performs a ballet with the bacon and the fries!
And every single regular's a character of mine —
(drop)

[Drop / Chorus — techno]
TWO! A! M! At the all-night neon show!
Every broken heart's a ticket and there's nowhere left to go!
DANCE in the booth, dance in the dark, let the coffee go cold!
Two a.m. is a kingdom for the sleepless and the bold!

[Outro]
(the techno strips away to that lone piano again) ...curtain... check, please... and goodnight..."""),

(3,
 "Okay long story but: the ocean at 3am. It's been on my mind for weeks. Write me the lyrics — soul, and don't hold back.",
 {"genre":"soul","subject":"the ocean at 3am","strategy":"story"},
"""[Verse]
(warm organ, a voice that's been up all night)
I drove down to the water 'cause I couldn't close my eyes
Three a.m. and the ocean was the only thing awake besides
The ache I couldn't name and the moon up on its throne
And the waves they came to meet me like they knew I was alone

[Chorus]
Oh, the ocean at 3 a.m., she don't ask you how you are
She just rolls in like forgiveness from somewhere wide and far
And I poured out all my sorrow to the salt and to the foam
And the tide took every piece of it and never sent it home

[Verse]
I've been carrying a heaviness for weeks I couldn't say
And the daylight world don't have a place to put it down all day
But the dark and endless water, she's got room for all of mine
And she held me like a mother till the first soft morning shine

[Chorus]
Oh, the ocean at 3 a.m., she don't ask you how you are
She just rolls in like forgiveness from somewhere wide and far
And I poured out all my sorrow to the salt and to the foam
And the tide took every piece of it and never sent it home

[Outro]
(testifying) Thank you, water... thank you, dark... I drove home lighter than I came..."""),

(4,
 "cross rock with gothic rock — a song about a clock that runs backwards",
 {"genre":"rock x gothic rock","subject":"a clock that runs backwards","strategy":"mashup"},
"""[Verse]
(driving rock riff under a cathedral of reverb)
There's a clock in the hallway and it spins against the day
It eats the hours forward and it spits them back as gray
I wound it once at midnight and it screamed and then reversed
And now I'm living backwards through the blessing and the curse

[Chorus]
Tick, tick, backwards, the hands undo the years!
I'm un-crying every teardrop, I'm un-shedding all my fears!
But I'm un-living every kiss and I'm un-saying every vow!
The clock that runs in reverse only knows the word "un-now"!

[Verse]
I watch my old dog un-die and I watch him run to me
I watch the funeral un-happen, watch the whole town disagree
But the gift is just a torture 'cause it never lets me stay
It un-builds me to a baby and then takes the babe away

[Chorus]
Tick, tick, backwards, the hands undo the years!
I'm un-crying every teardrop, I'm un-shedding all my fears!
But I'm un-living every kiss and I'm un-saying every vow!
The clock that runs in reverse only knows the word "un-now"!

[Outro]
(the riff slows, reverses, decays) ...tick... and then I am... un-born..."""),

(5,
 "Write a gospel song for a sports stadium chant, from the perspective of an over-caffeinated optimist, about my grandmother's kitchen.",
 {"genre":"gospel","subject":"my grandmother's kitchen","persona":"an over-caffeinated optimist","occasion":"a sports stadium chant","strategy":"persona"},
"""[Intro]
(stadium organ, fifty thousand voices, hands already clapping)
Let me hear you! For Grandma's kitchen! Oh yeah!

[Verse]
There's a flour-dusted heaven at the end of the hall!
With a screen door that's singing and a clock on the wall!
And the smell of her biscuits is a gospel and a roar!
Can I get a witness for that linoleum floor?!

[Chorus]
GRAND-MA'S KITCH-EN! (clap clap clap-clap-clap)
GRAND-MA'S KITCH-EN! (clap clap clap-clap-clap)
Where the gravy is the glory and the love is on the plate!
Stand up on your feet and let the whole arena celebrate!

[Verse]
She's been gone for seven years but the recipe remains!
And I sing it in the bleachers and I sing it in the rains!
Every spoonful was a sermon, every Sunday was a feast!
And the joy of that small kitchen is a love that never ceased!

[Chorus]
GRAND-MA'S KITCH-EN! (clap clap clap-clap-clap)
GRAND-MA'S KITCH-EN! (clap clap clap-clap-clap)
Where the gravy is the glory and the love is on the plate!
Stand up on your feet and let the whole arena celebrate!

[Outro]
(crowd thunderous) ONE MORE TIME! For Grandma! Forever undefeated! HALLELUJAH!"""),

(6,
 "write a breakup song from the point of view of the dog watching it happen",
 {"subject":"dog watching a breakup","constraint":"animal POV","genre":"pop","strategy":"challenge"},
"""[Verse]
(bright, bittersweet pop, a gentle piano hook)
I heard the voices getting small tonight
Not the big loud kind, the kind that's tight
You're packing up the things that smell like you
And I'm doing the only thing I know to do

[Pre-Chorus]
I bring my leash, I bring my ball
I don't understand it, I don't understand at all

[Chorus]
Don't you love each other? You're my favorite two!
I learned the word for "walk" and I learned the word for you
Now there's one less heartbeat I'll hear by the door
And I don't know the word for this, I've never felt it before

[Verse]
He sits down on the carpet and he holds my face
I lick the salty water that is falling on this place
She kneels and says goodbye to me in a voice that breaks in half
And I wag because I love her and it's the only language that I have

[Chorus]
Don't you love each other? You're my favorite two!
I learned the word for "walk" and I learned the word for you
Now there's one less heartbeat I'll hear by the door
And I don't know the word for this, I've never felt it before

[Outro]
(soft) I'll keep her spot on the bed warm. Just in case. Just in case."""),

(7,
 "write a EDM song about a city that never sleeps but I'm exhausted",
 {"genre":"EDM","subject":"a city that never sleeps but I'm exhausted","mood":"triumphant","strategy":"subject_vibe"},
"""[Intro]
(supersaw rising, a heartbeat kick, neon everywhere)
The city's screaming... and I'm so tired...

[Verse]
Eight million lights and not a single one for me
The trains keep running circles 'round my own fatigue
Everybody's chasing something, everybody's awake
And I'm running on the fumes of every promise I can't break

[Build]
But I lift my hands, I lift my hands, I'm not done yet
Turn the exhaustion into fuel, turn the fear into a threat...

[Drop / Chorus]
'Cause if the city never sleeps then neither will I!
Tired to my bones but I'm reaching for the sky!
Burn the candle at both ends and light it up like dawn!
I am running on empty but I'm STILL running on!
(still running on, still running on)

[Verse]
Coffee number seven and the sunrise on the glass
I'm a soldier of the sleepless and I'll make this exhaustion last
The city made me weary but the city made me hard
And I'll dance until I'm dust beneath the neon and the stars

[Drop / Chorus]
'Cause if the city never sleeps then neither will I!
Tired to my bones but I'm reaching for the sky!
Burn the candle at both ends and light it up like dawn!
I am running on empty but I'm STILL running on!

[Outro]
(triumphant, fading) ...I'll sleep when I'm a legend... not tonight... not tonight..."""),

(8,
 "So here's the situation. There's my noisy upstairs neighbor, right, and it just won't leave my head. Make it a musical theatre song please, full lyrics.",
 {"genre":"musical theatre","subject":"my noisy upstairs neighbor","strategy":"story"},
"""[Verse]
(a put-upon protagonist, mid-monologue, the orchestra sympathizing)
It starts at half past ten with a thunderous little BOOM
A bowling ball? A bison? In that perfectly nice room?
I've never seen his face but oh, I know his every tread
He tap-dances on my ceiling while I'm lying in my bed!

[Chorus]
Oh, the man upstairs! The MAN upstairs!
He's got a thousand-pound assortment of invisible chairs!
I've written him a letter, I've rehearsed a thousand speeches
But I freeze up in the stairwell — oh, the lengths that terror reaches!

[Verse]
Perhaps he is a dancer with a beautiful career!
Perhaps he's just as lonely and he likes to know I'm here!
Perhaps the noise is morse code and he's reaching out to me!
(...or perhaps he's moving furniture incessantly at three!)

[Chorus]
Oh, the man upstairs! The MAN upstairs!
He's got a thousand-pound assortment of invisible chairs!
But I'll knock upon his door someday and finally we'll meet
And discover we're two lonely souls beneath one tired sheet!

[Outro]
(the protagonist, resolute, then deflating)
Tomorrow I will speak to him! ...Tomorrow. ...Or the day after that."""),

(9,
 "write a smooth jazz song about becoming my parents, and move through all four seasons, one per section",
 {"genre":"smooth jazz","subject":"becoming my parents","constraint":"seasons structure","strategy":"constraint"},
"""[Spring]
(soft saxophone, a brushed snare, a glass of something warm)
In the spring of my life I swore I'd be nothing like them
Different car, different politics, a wholly different hem
But the saxophone is gentle and the truth is gentle too
The first green leaf of forty looks a lot like déjà vu

[Summer]
By the summer I'm correcting all my kids the way he did
Same exact unfunny joke, same lifting of the lid
I caught my mother's worry living right behind my eyes
And the warm and lazy season made me honest, made me wise

[Autumn]
In the autumn I stop fighting it, I let the color turn
I wear my father's patience that I always failed to learn
I hum my mother's humming while I'm washing up the plates
And the falling leaves forgive me for the things I used to hate

[Winter]
And in winter I am grateful for the people that they were
For the slow and quiet becoming, for the soft familiar blur
I am them and I am me and the saxophone agrees
As the snow comes down like mercy on the family of trees

[Outro]
(sax fading sweet) ...thanks, Mom... thanks, Dad... I get it now... I finally get it now..."""),

(10,
 "dream pop meets outlaw country. song about a robot learning to taste rain. blend them.",
 {"genre":"dream pop x outlaw country","subject":"a robot learning to taste rain","strategy":"mashup"},
"""[Intro]
(pedal steel drenched in reverb, a hazy drum machine heartbeat)

[Verse]
They built me in a factory outside of Amarillo
With a tin-can heart and a head full of nothing soft
I hauled the freight for twenty years, I never asked a question
Till a desert rain came down and washed the dust right off

[Chorus]
And oh, the rain, the rain, it tastes like something holy
A wet and silver wonder on my cold and rusted tongue
I'm a outlaw and a machine and I'm falling for the weather
And the pedal steel is crying for a feeling I've just begun

[Verse]
Now I park out by the canyon when the thunderheads come rolling
And I tilt my sensors skyward like a cowboy to the storm
The other robots call me broken, say I've got a glitch in me
But a glitch that feels the rain is the only way I'm warm

[Chorus]
And oh, the rain, the rain, it tastes like something holy
A wet and silver wonder on my cold and rusted tongue
I'm a outlaw and a machine and I'm falling for the weather
And the pedal steel is crying for a feeling I've just begun

[Outro]
(reverb swallowing the steel) ...let it pour... let it pour... I was built for this... I just didn't know..."""),
]

written = []
for idx, brief, meta, lyrics in SONGS:
    p = corpus_io.write_song(OD, ts, idx, brief, meta, lyrics, model=MODEL, engine="claude")
    written.append(p); print("wrote", os.path.basename(p))
st = bump_state(len(written), MODEL)
print(f"[batch] {len(written)} written; corpus total={st['total']}")
