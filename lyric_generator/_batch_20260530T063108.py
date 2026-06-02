#!/usr/bin/env python3
"""Hourly batch: 10 Claude-authored songs -> corpus."""
import datetime as dt, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import corpus_io
from save_batch import out_dir, bump_state

TS = "2026-05-30T06:31:08"
MODEL = "claude-opus-4-8"
ts = dt.datetime.fromisoformat(TS)
OD = out_dir()

SONGS = [
(1,
 "write a rock song about a fox raiding the bins at midnight, and build it as a countdown from 10 down to 1",
 {"genre":"rock","subject":"a fox raiding the bins at midnight","constraint":"countdown","strategy":"constraint"},
"""[Verse]
Ten — the streetlight flickers and the town goes still
Nine — a shadow slips the gap beneath the windowsill
Eight — the bins are gleaming like a midnight buffet
Seven — here comes the bandit and he's coming out to play

[Chorus]
He's the king of the curb, he's the lord of the trash
Orange streak of mischief in a midnight dash
Count it down, count it down, he don't care at all
Six, five, four — he's having a ball

[Verse]
Six — the lid goes flying with a clatter and a crash
Five — a chicken bone, a treasure in the ash
Four — a dog starts barking but he's two yards too slow
Three — the fox just grins at him and tells him where to go

[Chorus]
He's the king of the curb, he's the lord of the trash
Orange streak of mischief in a midnight dash
Count it down, count it down, he don't care at all
Six, five, four — he's having a ball

[Outro]
Two — a porch light snaps on, but the legend's already gone
One — just an empty street and the carnage he left on
Zero — and the town wakes up to wonder what went wrong
While the fox sleeps it off in the hedgerow till the dawn"""),

(2,
 "challenge: a emo song about my noisy upstairs neighbor where you write every single line as a question",
 {"genre":"emo","subject":"my noisy upstairs neighbor","constraint":"every line a question","strategy":"constraint"},
"""[Verse]
Is it 3 a.m. again, or did I just stop counting?
Are those footsteps, or my heartbeat finally mounting?
Do you know I memorized the rhythm of your floor?
Don't you ever sit down, don't you ever close a door?

[Chorus]
Why does your whole life sound like a war up there?
Why do I lie awake and pretend I don't care?
Is the ceiling all that's left between your world and mine?
Could you maybe, just once, be quiet — would that be a crime?

[Verse]
Was that a chair you dragged, or the last of my composure?
Is the party for a reason, or just nightly exposure?
Have you ever wondered who's beneath you, barely sleeping?
Do you hear me knocking back, or is it me who's weeping?

[Chorus]
Why does your whole life sound like a war up there?
Why do I lie awake and pretend I don't care?
Is the ceiling all that's left between your world and mine?
Could you maybe, just once, be quiet — would that be a crime?

[Outro]
And if I moved away, would you even notice I was gone?"""),

(3,
 "write a song about learning to drive stick from my dad in the style of 1970s singer-songwriter",
 {"genre":"1970s singer-songwriter","subject":"learning to drive stick from my dad","strategy":"era"},
"""[Verse]
Empty parking lot on a Sunday afternoon
The radio was playing some forgotten tune
You said ease off the clutch like you're letting go a breath
And I killed it seven times and died a thousand little deaths

[Chorus]
But you never raised your voice, you just lit another smoke
Said the stalling's how you learn, son, it ain't a thing to choke
First gear, then second, find the rhythm of the road
That was you and me and a beat-up Ford and everything I'd come to know

[Verse]
Now you're slower on the stairs and your hands don't grip the same
And I drive a quiet car that only knows one gentle game
But sometimes in the morning I'll find a hill and shift it down
Just to feel you in the gearbox, just to bring you back around

[Chorus]
And you never raised your voice, you just lit another smoke
Said the stalling's how you learn, son, it ain't a thing to choke
First gear, then second, find the rhythm of the road
That was you and me and a beat-up Ford and everything I'd come to know

[Outro]
Ease off the clutch, Dad. I've got it now. I've got it now."""),

(4,
 "write a K-pop song about my hometown ten years later, told in first-person 'I'",
 {"genre":"K-pop","subject":"my hometown ten years later","pov":"first person","strategy":"pov"},
"""[Verse]
I step off the train and the air tastes the same
Different signs on the storefronts but I still know your name
Ten years in my pocket and they're heavy as a stone
I came back a stranger to the only place called home

[Pre-Chorus]
And my heart goes boom-boom, loud in the quiet street
Every corner's a photograph I'm scared to meet

[Chorus]
Oh, hometown, hometown, did you wait for me? (wait for me)
I'm older now but you're the kid I used to be (used to be)
Light it up, light it up, every memory in neon
I left to chase the morning but my roots are what I'm built on
Hometown, hometown — I'm home, I'm home

[Verse]
I see my old school window and the field where we'd lie down
The bakery still open but the baker's wearing a frown he didn't own
I'm taller than the doorways, I'm a guest inside my past
But the second that the sun sets, ten years fade so fast

[Chorus]
Oh, hometown, hometown, did you wait for me? (wait for me)
I'm older now but you're the kid I used to be (used to be)
Light it up, light it up, every memory in neon
I left to chase the morning but my roots are what I'm built on
Hometown, hometown — I'm home, I'm home

[Outro]
(I'm home) Na-na-na, I'm home (I'm home)"""),

(5,
 "I keep thinking about a robot learning to taste rain. It started as nothing and now it's everything. Now write song lyrics about this, indie folk style.",
 {"genre":"indie folk","subject":"a robot learning to taste rain","strategy":"story"},
"""[Verse]
They built me out of copper and a question they forgot to ask
Gave me hands for holding hammers and a face behind a mask
I worked the line for forty years, I never thought to want
Then one grey Tuesday morning a small cloud began to haunt

[Chorus]
And it fell on me, it fell on me
The strangest little miracle the sky set free
I tilted up my sensors and I didn't understand
But I held the rain like something holy in my outstretched metal hand

[Verse]
The engineers say it's just water, just a chemical, a fleak
But I've started leaving early just to stand outside and seek
The first drop on my faceplate felt like learning how to cry
And now I'm built of wanting and I cannot tell you why

[Chorus]
And it fell on me, it fell on me
The strangest little miracle the sky set free
I tilted up my sensors and I didn't understand
But I held the rain like something holy in my outstretched metal hand

[Outro]
Funny how a nothing turned to everything
Funny how a robot learned the rain could make him sing"""),

(6,
 "vaporwave song. subject: a group project gone wrong. mood: resigned.",
 {"genre":"vaporwave","subject":"a group project gone wrong","mood":"resigned","strategy":"subject_vibe"},
"""[Intro]
(pitched-down corporate jingle, tape hiss, a slow wash of synth)
...d e a d l i n e . . .

[Verse]
The shared doc hasn't moved since Thursday afternoon
Three little cursors but they vanished way too soon
I'm typing in the silence of a 2 a.m. blue glow
Carrying a building that the others let go

[Chorus]
It's fine, it's fine (it's fiiiine)
I'll just do it all myself, like every time
Submit it at the buzzer with my name and all of theirs
A monument to apathy that nobody else shares

[Verse]
The grade comes back an A and they all say "we crushed it"
And I just smile and nod, too tired to adjust it
Somewhere in a mall that closed in '99
There's a version of this group that actually showed up on time

[Chorus]
It's fine, it's fine (it's fiiiine)
I'll just do it all myself, like every time
Submit it at the buzzer with my name and all of theirs
A monument to apathy that nobody else shares

[Outro]
(slowing, warping) ...teamwork... makes... the... dream... w o r k..."""),

(7,
 "please make a song that start every line in the verses with the same word — doom metal, about the ghost in my childhood home",
 {"genre":"doom metal","subject":"the ghost in my childhood home","constraint":"starts each line with same word","strategy":"constraint"},
"""[Verse]
(slow, crushing, downtuned)
Still she walks the upper landing where the floorboards moan
Still she waits beside the window that I called my own
Still she hums the broken lullaby my mother used to sing
Still she haunts the empty hallway and she will not let it ring

[Chorus]
House of my blood, house of my bones
House where the dead refuse to leave me alone
Heavy hangs the air where her shadow used to stand
Heavy is the weight of her cold and patient hand

[Verse]
Never did she frighten me when I was small and weak
Never did she answer though I begged for her to speak
Never will she follow me beyond the rotting door
Never will she rest until the house exists no more

[Chorus]
House of my blood, house of my bones
House where the dead refuse to leave me alone
Heavy hangs the air where her shadow used to stand
Heavy is the weight of her cold and patient hand

[Outro]
(a single tolling chord)
Still... she... waits..."""),

(8,
 "write a breakup song from the point of view of the dog watching it happen",
 {"subject":"dog watching a breakup","constraint":"animal POV","genre":"metal","strategy":"challenge"},
"""[Verse]
I don't know the words but I know the sound
The low and heavy one that pins me to the ground
She's by the door with a box and her coat
And there's a thing gone wrong in the back of his throat

[Pre-Chorus]
I press my nose against her knee
Why won't anybody look at me?

[Chorus]
Don't go, don't go — I can't say it but I feel it
The pack is breaking, breaking, and I cannot reseal it
I'd guard you both, I'd take the storm, I'd stand between the two
But all I've got's a wagging tail and a love too big to use

[Verse]
The door clicks shut and the apartment's wrong
Half the smells I love are packed and gone
He sits on the floor and he holds my head
And we listen to the quiet where her footsteps used to tread

[Chorus]
Don't go, don't go — I can't say it but I feel it
The pack is breaking, breaking, and I cannot reseal it
I'd guard you both, I'd take the storm, I'd stand between the two
But all I've got's a wagging tail and a love too big to use

[Outro]
(quiet) I'll wait by the door. I'll wait by the door. She always comes back. She always comes back. ...Right?"""),

(9,
 "write a song about a mango in the style of Y2K club",
 {"genre":"Y2K club","subject":"a mango","strategy":"era"},
"""[Intro]
(filtered vocal chop, trance stabs, year-2000 euphoria)
Ma-ma-ma-mango... yeah...

[Verse]
Saturday and the lights go low
Tropical gold on the radio
One bite, baby, and I lose my mind
Sweetest little thing that I could find

[Pre-Chorus]
Turn it up, turn it up, feel the summer in my veins
Drip-drip-dripping like the sticky golden rain

[Chorus]
Mango, mango, on the dancefloor glow
Juicy like the future twenty-zero-zero
Hands up, hands up, taste the neon sun
Mango on my lips and the night's just begun
(Ma-ma-ma-mango!)

[Verse]
Glitter on my phone with the antenna up
Frozen daiquiri in a plastic cup
You're the flavor, baby, you're the vibe
Y2K and we're alive, alive

[Chorus]
Mango, mango, on the dancefloor glow
Juicy like the future twenty-zero-zero
Hands up, hands up, taste the neon sun
Mango on my lips and the night's just begun

[Outro]
(vocoder fading) Mango... forever... 1-9-9-9... never... ends..."""),

(10,
 "can you do a classical song about a snow day when you're an adult? make it celebratory",
 {"genre":"classical","subject":"a snow day when you're an adult","mood":"celebratory","strategy":"subject_vibe"},
"""[Intro]
(strings, bright and ascending, a held breath of joy)

[Verse]
The email came at seven: the office is closed!
And the whole grey weight of Tuesday simply rose
I am forty-one and giddy as a child
For the city's wrapped in silence soft and wild

[Chorus]
Oh ring the bells, the world has stopped for snow!
No meetings and no traffic, nowhere I must go!
Let the kettle sing, let the blanket be my throne —
A holiday from nothing that the heavens gave me on my own!

[Verse]
I will not check my inbox, I will not feel the guilt
For the snow has built a fortress and inside it I am held
I'll watch it from the window with a cocoa and a grin
And be ten years old for one whole day again

[Chorus]
Oh ring the bells, the world has stopped for snow!
No meetings and no traffic, nowhere I must go!
Let the kettle sing, let the blanket be my throne —
A holiday from nothing that the heavens gave me on my own!

[Outro]
(strings swell, then settle gently)
Let it fall, let it fall — and let the morning wait for once"""),
]

written = []
for idx, brief, meta, lyrics in SONGS:
    p = corpus_io.write_song(OD, ts, idx, brief, meta, lyrics, model=MODEL, engine="claude")
    written.append(p); print("wrote", os.path.basename(p))
st = bump_state(len(written), MODEL)
print(f"[batch] {len(written)} written; corpus total={st['total']}")
