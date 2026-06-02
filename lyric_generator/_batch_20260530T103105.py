#!/usr/bin/env python3
"""Hourly batch: 10 Claude-authored songs -> corpus."""
import datetime as dt, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import corpus_io
from save_batch import out_dir, bump_state

TS = "2026-05-30T10:31:05"
MODEL = "claude-opus-4-8"
ts = dt.datetime.fromisoformat(TS)
OD = out_dir()

SONGS = [
(1,
 "write a worship/EDM fusion song about winning and feeling nothing",
 {"genre":"worship x EDM","subject":"winning and feeling nothing","strategy":"mashup"},
"""[Intro]
(soft pads, a worship-leader's hush over a building four-on-the-floor)
I lift it up... but my hands are empty...

[Verse]
I stand on the mountain that I climbed for years
The summit's all glory and the valley's all tears
But I reached the top and I felt the wind go cold
I won the whole kingdom and I cannot feel the gold

[Build]
Fill me, fill me, the trophy's hollow in my chest
Fill the silence where the triumph should have blessed...

[Drop / Chorus]
'Cause I won, I won, and the win is a void!
Hands in the air for a joy I can't avoid the lack of!
Lift it higher, lift it higher, but it falls right through!
I conquered everything and I am asking, God, are You?
(are You there, are You there, in the empty of the new)

[Verse]
The crowd is a worship and the lights are a prayer
But the hole in the winning is a hole in the air
So I'll dance in the question 'cause it's all that I've got
The win is the wound and the joy is the rot

[Drop / Chorus]
'Cause I won, I won, and the win is a void!
Lift it higher, lift it higher, but it falls right through!
I conquered everything and I am asking, God, are You?

[Outro]
(everything strips to a single voice) ...maybe the wanting was the worship all along..."""),

(2,
 "deep house song. subject: an astronaut who misses gravity. mood: euphoric.",
 {"genre":"deep house","subject":"an astronaut who misses gravity","mood":"euphoric","strategy":"subject_vibe"},
"""[Intro]
(warm sub bass, a filtered vocal loop, slow euphoric build)
Pull me down... pull me down...

[Verse]
Up here everything is floating, even my heart won't stay still
I miss the honest weight of standing, I miss the pull of the hill
The Earth is a marble of blue down below me
And I'd trade every star just to feel the ground hold me

[Pre-Chorus]
And the bass drops low like the gravity I crave
Take me home, take me home, to the weight that made me brave

[Chorus]
Gravity! Bring me back to the ground!
I never knew I loved you till I floated around!
The most beautiful prison is a planet that holds you tight!
Pull me down, pull me down, into ordinary light!

[Verse]
I used to dream of weightless and now weightless is my cage
I'd give the whole cosmos for the steps of a stage
For the simple act of falling, for the grass and the rain
For the gorgeous heavy gift of being held again

[Chorus]
Gravity! Bring me back to the ground!
I never knew I loved you till I floated around!
The most beautiful prison is a planet that holds you tight!
Pull me down, pull me down, into ordinary light!

[Outro]
(euphoric, vocal soaring) ...and the reentry burns like joy... like joy... like joy..."""),

(3,
 "write a dream pop song about winning the lottery and telling no one, and write the entire song as one long run-on sentence",
 {"genre":"dream pop","subject":"winning the lottery and telling no one","constraint":"one long sentence","strategy":"constraint"},
"""[Verse]
(hazy, reverbed, breathless and unbroken)
So I checked the numbers twice and then a third time in the bathroom with the door
locked like a secret learning how to be a secret and the digits all lined up like little
soldiers saying yes, yes, yes, and I did not scream, I did not call a soul, I just sat down

[Verse]
on the cold tile floor and watched my whole life quietly become a different life while the
faucet dripped and the neighbor's TV murmured through the wall and I thought of everyone
I could tell and then thought of how the telling would dissolve it, would turn the magic into

[Chorus]
numbers, into questions, into hands held out, so I folded the ticket into the book I never
finished reading and I made my coffee like a person who has nothing, who wants for nothing,
who is nothing special, and I smiled at the absolute and enormous and weightless privacy of it,

[Verse]
the way a held breath is the loudest thing in a quiet room, the way a door that's never opened
keeps the whole house warm, and so I carry it, this golden unspoken impossible thing, to work,
to bed, to the grocery store where I still count my coins out of habit and a kind of love, and

[Outro]
nobody knows, nobody knows, nobody will ever know, and that, somehow, is the part that makes me rich."""),

(4,
 "make a peaceful swing song",
 {"genre":"swing","subject":None,"mood":"peaceful","strategy":"oneliner"},
"""[Intro]
(brushed drums, muted trumpet, a slow easy sway)

[Verse]
The afternoon is golden and the world is movin' slow
There's a breeze across the table where the coffee cups still glow
No place that I gotta be, no hurry in my shoes
Just a lazy little melody and nothin' left to lose

[Chorus]
So sway with me, easy, easy
Let the worries drift away
The horns are soft as Sunday
And there's nothin' but today

[Verse]
A cat is on the windowsill, the curtains breathe the light
And the bassline walks so gently like it's tucking in the night
We don't need a single thing, we got the time to spare
Just the rhythm and the quiet and the warm and dusty air

[Chorus]
So sway with me, easy, easy
Let the worries drift away
The horns are soft as Sunday
And there's nothin' but today

[Outro]
(trumpet fading sweet) ...mm, easy now... easy..."""),

(5,
 "give me a future year 2099 song about the smell of a thunderstorm coming",
 {"genre":"future year 2099","subject":"the smell of a thunderstorm coming","strategy":"era"},
"""[Intro]
(holographic choir, synthetic rain modeled in a dome, distant simulated thunder)

[Verse]
In the sealed glass city where the weather's on a screen
They sell you bottled petrichor, a scent of what has been
But Grandmother remembers when the sky was wild and free
And the air would change its mind and tell you something's on its way to be

[Chorus]
Can you smell it? Can you smell the storm?
The oldest signal, the body keeps it warm
A million years of knowing in a single breath of green
The thunder that is coming for a sky we've never seen
(ozone and memory, ozone and memory)

[Verse]
They engineered the clouds away in twenty-eighty-one
No more floods, no more drought, no more burning in the sun
But we lost the holy warning, the electric in the nose
The way the whole world holds its breath right before it goes

[Chorus]
Can you smell it? Can you smell the storm?
The oldest signal, the body keeps it warm
A million years of knowing in a single breath of green
The thunder that is coming for a sky we've never seen

[Outro]
(the dome flickers, and for one second, real rain) ...grandmother weeps... it's real... it's real..."""),

(6,
 "K-pop meets metal. song about a soldier writing home. blend them.",
 {"genre":"K-pop x metal","subject":"a soldier writing home","strategy":"mashup"},
"""[Intro]
(clean K-pop synth hook, then a wall of metal guitar crashes in)

[Verse — clean]
Dear my family, I'm writing by the light
Counting all the stars to make it through the night
The photo of your faces is the armor on my chest
A melody of home is what I'm holding to my breath

[Pre-Chorus — building]
And every mile between us is a string about to break
Hold on, hold on, for everybody's sake!

[Chorus — metal, screamed and sung]
I WILL COME HOME! (come home!) Through the fire and the cold!
I'm SCREAMING through the silence every story that I'm told!
Save my seat at the table, keep the porchlight burning bright!
I'm a soldier and a son and I am SINGING through the night!
(saranghae, saranghae — I'm coming home tonight)

[Verse — clean]
Tell my little brother that I'll teach him how to drive
Tell my mother that her son is still alive
Fold this letter gently, put it where the warmth still stays
I'm a heartbeat in a war zone counting down the days

[Chorus — metal]
I WILL COME HOME! (come home!) Through the fire and the cold!
Save my seat at the table, keep the porchlight burning bright!
I'm a soldier and a son and I am SINGING through the night!

[Outro]
(clean again, fragile) ...keep the light on... I'm almost... home..."""),

(7,
 "a manic city pop song about a mango",
 {"genre":"city pop","subject":"a mango","mood":"manic","strategy":"subject_vibe"},
"""[Intro]
(glittering 80s Tokyo synth, slap bass going absolutely feral)

[Verse]
It's 3 a.m. and I bought a mango and I CANNOT calm down!
Neon on the highway and there's juice all over town!
I peeled it with my teeth in the convenience-store glow!
And the city's spinning faster and I never wanna slow!

[Pre-Chorus]
Sticky fingers on the steering wheel, sugar in my brain!
Tropical explosion in the middle of the rain!

[Chorus]
MANGO! In the city lights!
MANGO! I'm awake for seven nights!
Drippin' gold all over my designer coat!
I am unstoppable, I am a tropical boat!
(mango, mango, MANGO!)

[Verse]
The salaryman is staring 'cause I'm dancing on the curb!
One fruit and I'm a maniac, I'm absolutely perturbed!
The flavor hit my bloodstream like a lightning-bolt of YES!
I will never sleep again and I could not care less!

[Chorus]
MANGO! In the city lights!
MANGO! I'm awake for seven nights!
Drippin' gold all over my designer coat!
I am unstoppable, I am a tropical boat!

[Outro]
(synths shrieking, then a sudden hard cut) ...I need another one. RIGHT NOW."""),

(8,
 "lullaby song about the last text I never sent — use third-person, telling someone else's story",
 {"genre":"lullaby","subject":"the last text I never sent","pov":"third person narrative","strategy":"pov"},
"""[Verse]
(soft, a music box, barely above a whisper)
She typed it out at midnight, every word she'd never say
"I miss you" in the darkness, then she watched it fade away
Her thumb above the arrow, but she couldn't press it through
So she set the phone beside her and she let the moment go on through the blue

[Chorus]
Sleep now, sleep now, little unsent word
The kindest thing she almost said, the song that's never heard
Rest in the drafts where the brave things lie
Sleep now, sleep now, little goodbye

[Verse]
He'll never know she wrote it on a cold November night
He'll never know she loved him in the soft and unsent light
But somewhere in the silence there's a tenderness that stayed
A message in a bottle that the ocean never made

[Chorus]
Sleep now, sleep now, little unsent word
The kindest thing she almost said, the song that's never heard
Rest in the drafts where the brave things lie
Sleep now, sleep now, little goodbye

[Outro]
(music box winding down) ...and the morning came... and she let it sleep... let it sleep..."""),

(9,
 "Write a vaporwave song for a victory lap, from the perspective of someone who just quit their corporate job, about a lighthouse keeper.",
 {"genre":"vaporwave","subject":"a lighthouse keeper","persona":"someone who just quit their corporate job","occasion":"a victory lap","strategy":"persona"},
"""[Intro]
(slowed sample, a triumphant smeared synth, tape warble)
I . . . q u i t . . . today . . .

[Verse]
For fifteen years I kept a light for ships that didn't care
Spreadsheet beacon, cubicle horizon, recycled air
But this morning I climbed down the tower and I walked out the door
And the ocean's still there, baby, like it always was before

[Chorus]
And I'm free, I'm free, on a victory lap through the haze
No more keeping the light for somebody else's days
I was the lighthouse keeper and the lighthouse was a lie
Now I'm sailing my own ship beneath a pink and endless sky

[Verse]
Let somebody else turn the lamp and watch the empty sea
Let the corporate fog roll in on someone who isn't me
I'm a wave now, I'm a sunset, I'm a slowed-down happy song
The keeper finally left the light and nothing's going wrong

[Chorus]
And I'm free, I'm free, on a victory lap through the haze
No more keeping the light for somebody else's days
I was the lighthouse keeper and the lighthouse was a lie
Now I'm sailing my own ship beneath a pink and endless sky

[Outro]
(warping into bliss) ...the light's still spinning... without me... and that's beautiful..."""),

(10,
 "classic rock song about the friend who never texts back. constraint: make six lines in a row all end on the same rhyme.",
 {"genre":"classic rock","subject":"the friend who never texts back","constraint":"six end-rhymes in a row","strategy":"constraint"},
"""[Verse]
(swaggering guitar, Hammond organ underneath)
You leave me on read every single day (-ay)
You got a thousand little things to say (-ay)
But never to me, never my way (-ay)
I'm the gray little bubble you let decay (-ay)
The friend that you forgot to repay (-ay)
And still here I am, and still I stay (-ay)

[Chorus]
Oh, won't you text me back, won't you throw me a line?
I've been staring at this phone like it's a holy sign
We were thick as thieves once, now you're a ghost on the wire
But I'd still drop everything if you ever required

[Verse]
You'll surface in a month like nothing's wrong (-ong)
"Hey stranger, it's been long" (-ong)
And I'll forgive you for a song (-ong)
'Cause loving you's where I belong (-ong)
Even when the silence is strong (-ong)
And the wait for a word is so long (-ong)

[Chorus]
Oh, won't you text me back, won't you throw me a line?
I've been staring at this phone like it's a holy sign
We were thick as thieves once, now you're a ghost on the wire
But I'd still drop everything if you ever required

[Outro]
(guitar wailing) Three dots... and then nothing... story of my life..."""),
]

written = []
for idx, brief, meta, lyrics in SONGS:
    p = corpus_io.write_song(OD, ts, idx, brief, meta, lyrics, model=MODEL, engine="claude")
    written.append(p); print("wrote", os.path.basename(p))
st = bump_state(len(written), MODEL)
print(f"[batch] {len(written)} written; corpus total={st['total']}")
