#!/usr/bin/env python3
"""Hourly batch: 10 Claude-authored songs -> corpus."""
import datetime as dt, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import corpus_io
from save_batch import out_dir, bump_state

TS = "2026-05-30T08:31:06"
MODEL = "claude-opus-4-8"
ts = dt.datetime.fromisoformat(TS)
OD = out_dir()

SONGS = [
(1,
 "write a hyperpop song about a retired boxer, told in narrated by an object or animal",
 {"genre":"hyperpop","subject":"a retired boxer","pov":"unusual narrator","strategy":"pov"},
"""[Intro]
(pitched-up vocal chop, blown-out 808s)
I'm the gloves! I'm the gloves! Hangin' on the wall!

[Verse]
I'm the gloves on the hook and I'm gathering dust
Used to taste the canvas, used to swing on trust
He laced me up at midnight, he laced me up at dawn
Now I'm leather and a memory and the crowd is gone (gone! gone!)

[Pre-Chorus]
But I felt every punch, I felt every fall
I'm the only one who knows he gave it all (all! all!)

[Chorus]
Champion! Champion! Even when you lost!
I held your hands together at any cost!
Hang me up, hang me high, let the young ones climb!
I'm the gloves and I remember every fight in double-time!
(go! go! go! go!)

[Verse]
Now he visits on a Sunday and he holds me soft
Hands all swollen-knuckled from the years he coughed
He don't need the ring no more, he don't need the roar
But he keeps me on the hook 'cause I'm what he fought for

[Chorus]
Champion! Champion! Even when you lost!
I held your hands together at any cost!
Hang me up, hang me high, let the young ones climb!
I'm the gloves and I remember every fight in double-time!

[Outro]
(glitching out) Cham-cham-champion... still... still..."""),

(2,
 "EDM song about growing up too fast — use collective 'we', like a whole town singing",
 {"genre":"EDM","subject":"growing up too fast","pov":"we / collective","strategy":"pov"},
"""[Intro]
(supersaw swell, a crowd of voices rising)
We were young, we were young...

[Verse]
We traded all our summers for a paycheck and a key
We grew up in a hurry 'cause they told us that's the deal
We blinked and we were twenty, blinked again and we were old
We spent the gold of morning to buy a little cold

[Build]
And we, and we, and we — we want it back, we want it back...

[Drop / Chorus]
So put your hands up if you grew up way too fast!
If your childhood was a station that the train went screaming past!
We are the town that traded play for the weight of the world
Light it up, light it up, give us back the kids we were!

[Verse]
We see them on the playground and we ache down to the bone
We'd give back every dollar just to be that age and home
But the bassline's like a time machine for everyone tonight
So we dance like we were nine years old beneath the strobe light

[Drop / Chorus]
So put your hands up if you grew up way too fast!
If your childhood was a station that the train went screaming past!
We are the town that traded play for the weight of the world
Light it up, light it up, give us back the kids we were!

[Outro]
(filtered, fading) We were young... we were young... we still are, somewhere..."""),

(3,
 "can you do a R&B song about my cat who hates everyone but me? make it triumphant",
 {"genre":"R&B","subject":"my cat who hates everyone but me","mood":"triumphant","strategy":"subject_vibe"},
"""[Verse]
Everybody wants you but you turn your nose away
My friends all try to pet you and you make 'em rue the day
You hiss at the mailman, you ghost the whole dang block
But you melt into my lap at six o'clock

[Pre-Chorus]
And baby that's a love you gotta earn
That's a slow and sacred kind of burn

[Chorus]
'Cause out of all the world you chose me
Little tyrant of the windowsill, you chose me
They can keep their friendly dogs and their easy affection
I got the one cat in the city with discrimination
And she chose me, oh she chose me

[Verse]
You'll scratch a vet, you'll judge a guest, you rule with iron paws
But you knead my chest at midnight and you purr without a pause
It ain't for everybody and that's exactly why
When you headbutt my chin I feel ten feet high

[Chorus]
'Cause out of all the world you chose me
Little tyrant of the windowsill, you chose me
They can keep their friendly dogs and their easy affection
I got the one cat in the city with discrimination
And she chose me, oh she chose me

[Outro]
(ad-libs) Mm, you chose me... most exclusive love in town... yeah"""),

(4,
 "neo-soul song about two strangers on a delayed train. constraint: extend ONE central metaphor through the whole song.",
 {"genre":"neo-soul","subject":"two strangers on a delayed train","constraint":"a single metaphor extended","strategy":"constraint"},
"""[Verse]
(warm Rhodes, brushed drums)
We're both just books left open on a shelf
Pages dog-eared, reading to ourselves
The train won't move and neither will our eyes
Two unfinished stories under fluorescent skies

[Chorus]
And maybe we're the same chapter, baby
Stuck on the platform of a sentence half-said
You're a paragraph I'd love to read slowly
If the world would just stop turning the page ahead

[Verse]
You've got a spine that's cracked from being held
A foreword full of things you never tell
I'd underline the line where your hand meets mine
If the delay would only last us all the time

[Chorus]
And maybe we're the same chapter, baby
Stuck on the platform of a sentence half-said
You're a paragraph I'd love to read slowly
If the world would just stop turning the page ahead

[Bridge]
"Service resuming," says the speaker overhead
And just like that the story ends unread
You close, I close, we shelve ourselves apart
Two books that almost met, two unmarked hearts

[Outro]
(Rhodes fading) ...the end... that was never even the beginning..."""),

(5,
 "give me a really ominous neo-soul track",
 {"genre":"neo-soul","subject":None,"mood":"ominous","strategy":"oneliner"},
"""[Intro]
(low Rhodes chord, a bass that creeps, fingersnaps in the dark)

[Verse]
You smile like you mean it but I counted all your teeth
There's a colder kind of water running somewhere underneath
You say my name so sweetly that it sets my nerves alight
'Cause honey only ever flows this slow before a bite

[Chorus]
And I should go, and I should go
But the room is warm and the exit's slow
You're a beautiful thing with a shadow underneath
And I keep dancing closer to the teeth, to the teeth

[Verse]
The candle's burning lower and your eyes have gone obsidian
You laugh and it's a velvet thing, a trap I'm sittin' in
I know the way this story goes, I've read it on your skin
But the bassline keeps me here and I let the danger in

[Chorus]
And I should go, and I should go
But the room is warm and the exit's slow
You're a beautiful thing with a shadow underneath
And I keep dancing closer to the teeth, to the teeth

[Outro]
(whispered over the bass) ...too late now... the door just locked itself..."""),

(6,
 "give me a 1990s grunge song about a mango",
 {"genre":"1990s grunge","subject":"a mango","strategy":"era"},
"""[Verse]
(detuned guitar, sludgy, bored and aching)
Bought a mango at the corner just to feel a thing
Sat on my apartment floor and let the silence sing
It's too ripe, it's too sweet, it's bleeding on my hand
Like every good thing rots before I understand

[Chorus]
And I don't wanna grow up if it tastes like this
A perfect golden nothing I was born to miss
Yeah the mango's on the counter going soft and brown
Just like everything, just like everything around

[Verse]
My roommate's gone, my band broke up, my shoes are full of rain
I eat the mango anyway, it's sweet against the pain
Juice down to my elbow and I'm laughing at the mess
Some kind of dumb communion with my own uselessness

[Chorus]
And I don't wanna grow up if it tastes like this
A perfect golden nothing I was born to miss
Yeah the mango's on the counter going soft and brown
Just like everything, just like everything around

[Outro]
(feedback swelling) Whatever... it was sweet... whatever, man..."""),

(7,
 'spoken word song about a soldier writing home. Title it "Lonely Static". Lay it out as: [Verse] [Verse] [Chorus] [Verse] [Outro] and label each section.',
 {"genre":"spoken word","subject":"a soldier writing home","structure":"[Verse] [Verse] [Chorus] [Verse] [Outro]","title":"Lonely Static","strategy":"structural"},
"""[Verse]
Dear Mom. The food is fine. Don't worry.
I learned to write that lie so smooth it almost feels like truth.
The desert here is honest, at least — it doesn't pretend to be anything but vast.
I think about the kitchen. The yellow light. The way you'd hum.

[Verse]
Tell Dad I'm keeping my head down like he said.
There's a kid here from Ohio who plays harmonica at night,
badly, and it's the most beautiful thing I've ever heard,
because it means somebody's still alive enough to try.

[Chorus]
And it's lonely static on the line, Mom,
a thousand miles of nothing in between.
Lonely static, but I'm pressing my ear to it,
to hear the small blue planet where you've been.

[Verse]
I don't know when I'm coming home. I stopped doing the math.
But I keep your photo folded in the pocket near my heart —
not for protection, I don't believe in that —
just so something soft is closest to the most important part.

[Outro]
Write back. Or don't. Just know the letter found you.
Love — your son. Over and out. ...Over and out."""),

(8,
 'techno song about a clock that runs backwards. Title it "Neon Telephone". Lay it out as: [Intro] [Verse] [Pre-Chorus] [Chorus] [Verse] [Pre-Chorus] [Chorus] [Outro] and label each section.',
 {"genre":"techno","subject":"a clock that runs backwards","structure":"[Intro] [Verse] [Pre-Chorus] [Chorus] [Verse] [Pre-Chorus] [Chorus] [Outro]","title":"Neon Telephone","strategy":"structural"},
"""[Intro]
(132 bpm, a ticking that goes the wrong way, reversed cymbals)

[Verse]
There's a clock on my wall and it's spinning in reverse
Every second that it steals it puts another in my purse
Midnight folds to evening folds to afternoon to noon
I am getting younger, baby, and I'm getting there too soon

[Pre-Chorus]
Don't pick up, don't pick up the neon telephone
It's the future calling, asking when I'm coming home

[Chorus]
Backwards, backwards, the hands are running backwards
Take me to the moment just before it all went wrong
Backwards, backwards, unwind me to the start
Press rewind on the neon, play me my old heart

[Verse]
I watched the candle un-burn, watched the smoke go back inside
Watched the goodbye un-happen, watched you turn back to my side
But a clock that runs in reverse never lets you really stay
It just shows you all you'd lose and then it spins it all away

[Pre-Chorus]
Don't pick up, don't pick up the neon telephone
It's the future calling, asking when I'm coming home

[Chorus]
Backwards, backwards, the hands are running backwards
Take me to the moment just before it all went wrong
Backwards, backwards, unwind me to the start
Press rewind on the neon, play me my old heart

[Outro]
(the ticking slows, reverses one final time, stops) ...tick... kcit..."""),

(9,
 "So here's the situation. There's an arcade closing for good, right, and it just won't leave my head. Write me the lyrics — show tune, and don't hold back.",
 {"genre":"show tune","subject":"an arcade closing for good","strategy":"story"},
"""[Verse]
(a lone piano, a single spotlight on a dusty machine)
They're closing down the palace where I learned to be alive
The quarters and the cabinets, the dream of staying five
The carpet knew my sneakers, the high score knew my name
And tomorrow it's a parking lot — and nothing stays the same

[Chorus]
So let the lights go up one final time!
Let the pinball ring its last and perfect chime!
I gave you all my allowance and my afternoons and youth
Goodbye, my glowing kingdom — you were the realest truth!

[Verse]
The owner's name was Sal and he'd slip me extra plays
He's selling off the skee-ball for a fraction of its days
I'll take a single token and I'll keep it like a ring
A wedding to a place that taught a lonely kid to sing

[Chorus]
So let the lights go up one final time!
Let the pinball ring its last and perfect chime!
I gave you all my allowance and my afternoons and youth
Goodbye, my glowing kingdom — you were the realest truth!

[Outro]
(the spotlight fades on the dark machine)
Game over. Insert coin. ...There are no more coins to insert."""),

(10,
 'write a sea shanty song titled "Saltwater Highway" about a group project gone wrong. Use this structure with section tags: [Hook] [Verse] [Hook] [Verse] [Hook]',
 {"genre":"sea shanty","subject":"a group project gone wrong","structure":"[Hook] [Verse] [Hook] [Verse] [Hook]","title":"Saltwater Highway","strategy":"structural"},
"""[Hook]
Heave ho! On the saltwater highway we go!
Four signed the manifest but only one would row!
Heave ho! And the deadline's a gale!
Pullin' the whole damn ship by a single torn sail!

[Verse]
Oh Jakey said he'd plot the course and then he disappeared
And Danny brought a barrel that was nothin' but stale beer
Miss Caroline she bailed the boat from dusk until the dawn
And I manned the wheel and the cannon and the song

[Hook]
Heave ho! On the saltwater highway we go!
Four signed the manifest but only one would row!
Heave ho! And the deadline's a gale!
Pullin' the whole damn ship by a single torn sail!

[Verse]
We made the port at sunrise with our colors flyin' high
And the captain gave us all an A — I watched 'em take the prize
But me and quiet Caroline, we know who pulled the load
And we'll sail again together down a kinder, fairer road

[Hook]
Heave ho! On the saltwater highway we go!
Four signed the manifest but only two would row!
Heave ho! And we made it through the gale!
Just me and Caroline and a single torn sail!"""),
]

written = []
for idx, brief, meta, lyrics in SONGS:
    p = corpus_io.write_song(OD, ts, idx, brief, meta, lyrics, model=MODEL, engine="claude")
    written.append(p); print("wrote", os.path.basename(p))
st = bump_state(len(written), MODEL)
print(f"[batch] {len(written)} written; corpus total={st['total']}")
