#!/usr/bin/env python3
"""Hourly batch: 10 Claude-authored songs -> corpus."""
import datetime as dt, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import corpus_io
from save_batch import out_dir, bump_state

TS = "2026-05-30T09:31:05"
MODEL = "claude-opus-4-8"
ts = dt.datetime.fromisoformat(TS)
OD = out_dir()

SONGS = [
(1,
 "write a swing song where the chorus is just one word repeated",
 {"genre":"swing","constraint":"one-word chorus","strategy":"challenge"},
"""[Intro]
(big band hits, walking bass, a wink of brass)

[Verse]
Well I put on my good shoes and I shined up my hat
Got a girl on my arm and there's nothing wrong with that
The trumpet's gettin' frisky and the snare's gonna swing
So I open up my mouth and there's just one thing to sing—

[Chorus]
Baby!
Baby!
Baby!
Baby!

[Verse]
Now the clarinet is climbin' and the floor's gettin' hot
I forgot all my troubles 'cause I clean forgot
Every word I ever knew, every worry, every name
There's a single syllable and it's the only one I claim—

[Chorus]
Baby!
Baby!
Baby!
Baby!

[Bridge]
(scat) Shoo-bee-doo, badda-bap, the band don't need a sentence!
Doo-wah, doo-wah, love don't need repentance!

[Outro]
(brass swells, one last shout) Ba-by! Yeah!"""),

(2,
 "please make a song that repeat one unusual word as a motif at least ten times — classic rock, about a fox raiding the bins at midnight",
 {"genre":"classic rock","subject":"a fox raiding the bins at midnight","constraint":"uses one weird word a lot","strategy":"constraint"},
"""[Verse]
He comes like a vagabond, slinkin' down the lane
A vagabond of garbage in the sodium rain
Tippin' over kingdoms made of plastic and of bone
A vagabond, a vagabond, a thief without a throne

[Chorus]
Vagabond! Vagabond! Lord of the bin!
Vagabond! Vagabond! Let the midnight in!
He don't pay no rent and he don't know shame
A vagabond, a vagabond, and the night's his domain

[Verse]
The dogs all know his vagabond grin
The way he tips his vagabond chin
He'll raid your kitchen scraps and your forgotten ham
A vagabond who doesn't give a vagabond damn

[Chorus]
Vagabond! Vagabond! Lord of the bin!
Vagabond! Vagabond! Let the midnight in!
He don't pay no rent and he don't know shame
A vagabond, a vagabond, and the night's his domain

[Outro]
(guitar solo fading) One more vagabond... gone by dawn... vagabond... gone"""),

(3,
 "challenge: a opera song about a diner at 2am where you keep it entirely in present tense",
 {"genre":"opera","subject":"a diner at 2am","constraint":"present tense only","strategy":"constraint"},
"""[Recitative]
(a lone soprano, the clatter of a kitchen behind)
The clock strikes two. The coffee steams.
The waitress moves between the empty chairs like a ghost who is paid by the hour.

[Aria]
I sit! I wait! The neon hums above me!
The eggs are cooking, the grill is singing low!
A trucker weeps into his pie and no one asks him why he's weeping!
And the rain, the rain, the rain comes down on the window's holy glow!

[Verse]
The fry cook flips, the fry cook turns, the fry cook is an artist of the night!
The jukebox plays a song that no one chooses!
Two lovers fight in whispers in the corner by the light!
And I am here! I am alive! I order toast and lose my losing blues-es!

[Aria]
The dawn is coming! The dawn is coming! But it is not here yet!
And in this hour all the broken people gather and are blessed!
The plates are warm! The booth is mine! I do not weep, I do not fret!
I am awake at 2 a.m.! I am a guest! I am a guest!

[Outro]
(the soprano holds the final note as the sun rises) ...I am... here..."""),

(4,
 "So here's the situation. There's the friend who never texts back, right, and it just won't leave my head. Now write song lyrics about this, spoken word style.",
 {"genre":"spoken word","subject":"the friend who never texts back","strategy":"story"},
"""[Verse]
Here's the thing about you.
You exist mostly as a typing bubble that appears and then thinks better of it.
Three gray dots, blinking, like a lighthouse for a ship that never comes.

[Verse]
I have written you paragraphs.
I have edited them down to "hey."
I have watched "delivered" turn into nothing, which is a verb now, apparently —
to nothing someone. You nothing me beautifully.

[Chorus]
And I'm not mad. I'm a little mad.
I'm the specific kind of mad that still leaves the porch light on.
Because I know if I were drowning you'd swim the whole ocean.
You just won't text me back about lunch.

[Verse]
So this is my message into the void, with no little checkmark to confirm it.
I miss you, you absolute black hole of a human being.
Read receipt: off. Heart: on. Always, infuriatingly, on.

[Outro]
...You'd better come to my funeral.
And you'd better be on time."""),

(5,
 "write a breakup song from the point of view of the dog watching it happen",
 {"subject":"dog watching a breakup","constraint":"animal POV","genre":"doom metal","strategy":"challenge"},
"""[Intro]
(funeral-slow, downtuned to the floor, a single tolling chord)

[Verse]
The two who feed me stand like stones tonight
One by the window, one beneath the light
The air is thick, the kind before a storm
I press against a leg to keep it warm

[Chorus]
And I do not have the words, I only have the dread
The slow and certain knowing of a thing that can't be said
One of them is leaving and I cannot make them stay
I am the only witness to the love that breaks today

[Verse]
The suitcase opens like an open grave
I bring my favorite toy, the one I always gave
I drop it at her feet — please, this always works
But she just strokes my head and something deep inside me hurts

[Chorus]
And I do not have the words, I only have the dread
The slow and certain knowing of a thing that can't be said
One of them is leaving and I cannot make them stay
I am the only witness to the love that breaks today

[Outro]
(the chord rings out into silence)
She is gone. He is on the floor. I lie down beside him.
I will hold the vigil. That is what I am for."""),

(6,
 "gospel song about moving to a city where I know no one — use collective 'we', like a whole town singing",
 {"genre":"gospel","subject":"moving to a city where I know no one","pov":"we / collective","strategy":"pov"},
"""[Verse]
(organ, a choir gathering)
We stepped off the bus with a suitcase and a prayer
Into a city full of strangers and the cold, indifferent air
We knew not a single soul and the buildings touched the sky
And we asked the Lord above us, "Will somebody hear our cry?"

[Chorus]
But we are not alone! No, we are never alone!
For every lonely traveler is walking toward a home!
Lift your voice, you strangers, in the subway and the street
We are a congregation of the lost who haven't met!

[Verse]
We found a face that smiled at us inside the corner store
We found a neighbor's music bleeding gently through the door
A city is a wilderness until you learn its song
And then ten thousand strangers are the place where you belong

[Chorus]
'Cause we are not alone! No, we are never alone!
For every lonely traveler is walking toward a home!
Lift your voice, you strangers, in the subway and the street
We are a congregation of the lost who haven't met!

[Outro]
(choir soaring, hands clapping) Somebody's gonna know your name! Just keep walking! Somebody's gonna know your name!"""),

(7,
 "write a rock song about the bartender who knows too much",
 {"genre":"rock","subject":"the bartender who knows too much","mood":"haunted","strategy":"subject_vibe"},
"""[Verse]
She's been polishing that same glass since 1989
She's heard every sorry story and she's heard a lot of mine
She don't judge and she don't gossip, she just pours and lets you talk
But there's a weight behind those eyes from every secret in the dark

[Chorus]
She knows too much, she knows too much
The whole town's confession in a single rye and rocks
She knows too much, she knows too much
And she carries all our shadows when she's turning out the locks

[Verse]
The mayor cried here Tuesday, the preacher slipped on Thursday night
She remembers every falling and she never tells it right
'Cause to tell it would be cruel and she's a kinder kind of saint
She just holds the whole town's ugliness and never lets it taint

[Chorus]
She knows too much, she knows too much
The whole town's confession in a single rye and rocks
She knows too much, she knows too much
And she carries all our shadows when she's turning out the locks

[Outro]
(guitar ringing out) Who pours a drink for her? ...Who pours a drink for her?"""),

(8,
 "I'm a college student pulling an all-nighter. Write me a vaporwave song about a lighthouse keeper.",
 {"genre":"vaporwave","subject":"a lighthouse keeper","persona":"a college student pulling an all-nighter","occasion":"a long night shift","strategy":"persona"},
"""[Intro]
(slowed sample, oceanic synth wash, fluorescent hum)
3 . . . 4 . . . 5 a.m. . . .

[Verse]
I am the keeper of a light that no one sees
A textbook ocean and a lamp that's mine to please
The whole world's asleep and I'm the last one on the shore
Turning, turning, turning, like the keepers did before

[Chorus]
And I shine, and I shine, into nothing into night
Nobody sailing but I keep the light
A lighthouse for a coastline of caffeine and dread
Highlighter ocean, page-glow overhead

[Verse]
The coffee's gone cold like a tide that won't come in
My reflection in the window is a ghost beneath my skin
But somewhere out there maybe one lost ship can see
The lonely little beacon that is keeping company with me

[Chorus]
And I shine, and I shine, into nothing into night
Nobody sailing but I keep the light
A lighthouse for a coastline of caffeine and dread
Highlighter ocean, page-glow overhead

[Outro]
(synths warping into dawn) ...sunrise... I made it... the ships were never coming... that's okay..."""),

(9,
 "write a reggae song about the bartender who knows too much, told in narrated by an object or animal",
 {"genre":"reggae","subject":"the bartender who knows too much","pov":"unusual narrator","strategy":"pov"},
"""[Intro]
(offbeat skank, warm bass, a slow easy groove)
Mi a the bottle on the shelf, yeah, mi see everyt'ing...

[Verse]
Mi sit up on the top shelf, watchin' every night
Mi see the bartender hold the whole town tight
Dem come with dem troubles and dem pour out dem soul
And she listen, and she pour, and she never let it go

[Chorus]
She know too much, oh, she know too much
The secrets of the island in a gentle Dutch
But mi the only one who see how she carry the load
A bottle and a bartender on a lonely road

[Verse]
Mi watch her wipe a tear when the last man gone
Mi watch her lock the door as she hummin' a song
All the weight she tek, but who tek weh fi her?
Just mi, the silent witness, and the night so pure

[Chorus]
She know too much, oh, she know too much
The secrets of the island in a gentle Dutch
But mi the only one who see how she carry the load
A bottle and a bartender on a lonely road

[Outro]
(groove fading) Pour one for yuhself tonight, sister... mi nah tell... mi nah tell..."""),

(10,
 "can you do a musical theatre song about selling my first car? make it celebratory",
 {"genre":"musical theatre","subject":"selling my first car","mood":"celebratory","strategy":"subject_vibe"},
"""[Verse]
(bright, building, a grin in every note)
There she is in the driveway with a FOR SALE sign
Two hundred thousand miles and she was mine, all mine
The check-engine light's been on since the day I drove her home
But oh, the places that we went, the roads that we have known!

[Chorus]
So goodbye, old faithful! Hello, brand-new day!
I'm cashing in the memories and driving them away!
You taught me how to merge and how to cry and how to grow
Take a bow, my rusty chariot — it's time to let you go!

[Verse]
A kid is gonna buy her with a fistful of his savings
And his eyes are doing all the things that mine were doing, craving
The freedom of a first car, the whole horizon wide
So I hand him the keys like I'm passing him the tide!

[Chorus]
So goodbye, old faithful! Hello, brand-new day!
I'm cashing in the memories and driving them away!
You taught me how to merge and how to cry and how to grow
Take a bow, my rusty chariot — it's time to let you go!

[Outro]
(full company, key change!) Drive on, kid! She's all yours now! DRIVE OOOON!"""),
]

written = []
for idx, brief, meta, lyrics in SONGS:
    p = corpus_io.write_song(OD, ts, idx, brief, meta, lyrics, model=MODEL, engine="claude")
    written.append(p); print("wrote", os.path.basename(p))
st = bump_state(len(written), MODEL)
print(f"[batch] {len(written)} written; corpus total={st['total']}")
