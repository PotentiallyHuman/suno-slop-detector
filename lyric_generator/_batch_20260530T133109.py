#!/usr/bin/env python3
"""Hourly batch: 10 Claude-authored songs -> corpus."""
import datetime as dt, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import corpus_io
from save_batch import out_dir, bump_state

TS = "2026-05-30T13:31:09"
MODEL = "claude-opus-4-8"
ts = dt.datetime.fromisoformat(TS)
OD = out_dir()

SONGS = [
(1,
 "Victorian parlor vibes, song about winning and feeling nothing, full lyrics",
 {"genre":"Victorian parlor","subject":"winning and feeling nothing","strategy":"era"},
"""[Verse]
(a parlor piano, candlelight, a voice of velvet melancholy)
I have won the grand exhibition, they have pinned me with the rose
And the ladies all are whispering of my triumph as it goes
Yet I stand beside the mantel with a chill I cannot name
For the prize is in my pocket and my heart feels just the same

[Chorus]
Oh, what a hollow victory, what a cold and quiet crown
I have climbed the gilded staircase but there's nothing waiting down
They may toast me with their sherry and applaud me in the hall
But I won the thing I longed for and I feel no thing at all

[Verse]
The clock upon the dresser ticks the hours toward the dawn
And the medal on the ribbon is a weight that I have drawn
I had thought that winning fills you, that the empty would depart
But the trophy gleams so brightly on the dimness of my heart

[Chorus]
Oh, what a hollow victory, what a cold and quiet crown
I have climbed the gilded staircase but there's nothing waiting down
They may toast me with their sherry and applaud me in the hall
But I won the thing I longed for and I feel no thing at all

[Outro]
(the piano softens to a single note) ...perhaps the wanting was the living... and I've nothing left to want."""),

(2,
 "Picture this — the smell of a thunderstorm coming. That's the whole feeling I want to capture. Write me the lyrics — disco, and don't hold back.",
 {"genre":"disco","subject":"the smell of a thunderstorm coming","strategy":"story"},
"""[Intro]
(strings sweep up, four-on-the-floor, a hi-hat like distant rain)

[Verse]
Something in the air tonight, the sky is turning green
The sweetest electricity that you have ever seen
The leaves all flip their bellies up, the whole world holds its breath
And I'm dancing on the sidewalk in the moment before the wet

[Chorus]
Ozone! Can you feel it coming down?
Thunder on the boulevard, electric in the town!
Spin me, spin me, before the first drop falls!
The smell of a storm is the sexiest of all!
(get down, get down, before the sky lets go)

[Verse]
The streetlights start to flicker and the air is sweet and charged
My collar's up, my heart is loud, my disco soul's enlarged
The first fat raindrop hits the disco ball above the street
And the whole block starts to boogie to the thunder's rolling beat

[Chorus]
Ozone! Can you feel it coming down?
Thunder on the boulevard, electric in the town!
Spin me, spin me, before the first drop falls!
The smell of a storm is the sexiest of all!

[Outro]
(strings and rain together) ...let it pour, let it pour, and we'll dance right through the storm..."""),

(3,
 "Y2K club vibes, song about a moth in love with a streetlight, full lyrics",
 {"genre":"Y2K club","subject":"a moth in love with a streetlight","strategy":"era"},
"""[Intro]
(trance stabs, vocoder shimmer, a euphoric year-2000 build)
You're my light... you're my light...

[Verse]
Every night I find you glowing on the corner of my world
You don't even know I'm here, little circles that I twirl
You're too bright and you're too distant and you'll never feel the same
But I'd burn up all my wings for one more dance inside your flame

[Pre-Chorus]
I know you'll never love me, I know you're just a light
But I'd rather have this longing than a soft and ordinary night

[Chorus]
You're my streetlight superstar, my buzzing neon dream!
Burning brighter than you are, the cruelest love I've ever seen!
Pull me in, pull me in, I don't care if I get burned!
Loving you's the only thing this little moth has learned!
(you're my light, you're my light)

[Verse]
The disco of the lamppost and the static of the bulb
I'm a glitter-dusted casualty of everything I love
And the morning's gonna find me with my wings against the glass
But oh, what a way to go, in a blaze of foolish class

[Chorus]
You're my streetlight superstar, my buzzing neon dream!
Burning brighter than you are, the cruelest love I've ever seen!
Pull me in, pull me in, I don't care if I get burned!
Loving you's the only thing this little moth has learned!

[Outro]
(vocoder fading) ...one more orbit... one more... 1-9-9-9... forever..."""),

(4,
 'I want a musical theatre song about winning and feeling nothing called "Lonely Lullaby", with proper Suno tags: [Intro] [Verse] [Chorus] [Bridge] [Chorus] [Outro]',
 {"genre":"musical theatre","subject":"winning and feeling nothing","structure":"[Intro] [Verse] [Chorus] [Bridge] [Chorus] [Outro]","title":"Lonely Lullaby","strategy":"structural"},
"""[Intro]
(a music-box melody, a single spotlight on a figure holding a trophy)

[Verse]
They're still cheering in the lobby and the confetti's in my hair
And I smiled for all the cameras with a joy I didn't wear
I got everything I fought for, every door I broke right through
So somebody please explain to me why I feel the way I do

[Chorus]
It's a lonely lullaby, the song the winners sing
When you finally hold the trophy and it doesn't mean a thing
Sleep now, restless dreamer, you have climbed your golden hill
And the view is all you wanted and the wanting's quiet still

[Bridge]
I thought the summit had a sound, a thunder and a roar
But the top of every mountain is a still and silent shore
And I'd give back all the glory, every medal, every cheer
For the hunger that I had before I ever made it here

[Chorus]
It's a lonely lullaby, the song the winners sing
When you finally hold the trophy and it doesn't mean a thing
Sleep now, restless dreamer, you have climbed your golden hill
And the view is all you wanted and the wanting's quiet still

[Outro]
(the music box winds down, the spotlight fades) ...goodnight, little champion... goodnight..."""),

(5,
 "write a delta blues song about becoming my parents, told in collective 'we', like a whole town singing",
 {"genre":"delta blues","subject":"becoming my parents","pov":"we / collective","strategy":"pov"},
"""[Verse]
(slide guitar, stomp and holler, a porch full of voices)
We swore we'd never be 'em, no, we swore it on the moon
We'd never hum their hymns or whistle Daddy's tired tune
But we woke up on a Sunday and we heard our mamas' sound
Comin' out our own throats, Lord, comin' up from the ground

[Chorus]
'Cause we're turnin' into our mamas, we're turnin' into our pa's
We got their hands, we got their worries, we got all their little laws
The whole town's lookin' in the mirror, seein' faces that we knew
We're becomin' what we came from and there's nothin' we can do

[Verse]
We grumble 'bout the weather and we fret about the bills
We say the things they used to say and climb the same old hills
The river keeps on rollin' and it teaches what it must
We're our fathers and our mothers, and someday we'll be dust

[Chorus]
'Cause we're turnin' into our mamas, we're turnin' into our pa's
We got their hands, we got their worries, we got all their little laws
The whole town's lookin' in the mirror, seein' faces that we knew
We're becomin' what we came from and there's nothin' we can do

[Outro]
(stomp slowing) And we thank 'em now... oh, we thank 'em now... for the people that we grew into..."""),

(6,
 "write a R&B song about an old dog at the end of summer, and write it as call-and-response between two voices",
 {"genre":"R&B","subject":"an old dog at the end of summer","constraint":"call and response","strategy":"constraint"},
"""[Verse]
LEAD: He's moving slower now
(ECHO: slower now)
LEAD: Down the garden path
(ECHO: garden path)
LEAD: Grey around the muzzle where the gold used to be
(ECHO: used to be)
LEAD: And the summer's getting short, baby, just like him and me
(ECHO: him and me)

[Chorus]
LEAD: Oh, stay a little longer (ECHO: stay a little longer)
LEAD: The leaves ain't fallen yet (ECHO: ain't fallen yet)
LEAD: Lay your head down on my knee (ECHO: down on my knee)
LEAD: It's the sweetest kind of sunset (ECHO: sweetest kind of sunset)

[Verse]
LEAD: He still finds the sunny spot
(ECHO: finds the sun)
LEAD: On the kitchen floor
(ECHO: kitchen floor)
LEAD: And his tail still finds a wag when I'm walking through the door
(ECHO: through the door)
LEAD: We don't run no more, old friend, but we don't need to run
(ECHO: need to run)

[Chorus]
LEAD: Oh, stay a little longer (ECHO: stay a little longer)
LEAD: The leaves ain't fallen yet (ECHO: ain't fallen yet)
LEAD: Lay your head down on my knee (ECHO: down on my knee)
LEAD: It's the sweetest kind of sunset (ECHO: sweetest kind of sunset)

[Outro]
LEAD: Good boy (ECHO: good boy)
LEAD: One more summer (ECHO: one more)
LEAD: Just one more... (ECHO: just one more...)"""),

(7,
 "write a boom bap rap song about the ghost in my childhood home, told in narrated by an object or animal",
 {"genre":"boom bap rap","subject":"the ghost in my childhood home","pov":"unusual narrator","strategy":"pov"},
"""[Intro]
(dusty vinyl crackle, a boom-bap kick, jazz piano loop)
Yeah... I'm the staircase... let me tell you what I've seen...

[Verse 1]
I'm the staircase, thirteen steps, been creakin' since '52
I've held every footfall of the fam that you once knew
But there's one set of footsteps that the living never made
A weight upon my third step where the morning light won't fade
She walks me every midnight, same old housedress, same old hum
I've felt her sixty winters, watched her come and come and come
The boy who lives here now, he thinks the creak is just the wood
But I know the difference, man — I've understood, I've understood

[Hook]
I'm the bones of the house and I remember it all
Every laugh in the hallway, every crack in the wall
And the one who never left, she still walks me at night
I'm the staircase — I hold her — and I keep her in the light

[Verse 2]
The kid's got headphones on, he never hears her sigh
But I feel her pause at my landing where she used to say goodnight
She straightens up a picture that's been crooked since she passed
A grandmother on patrol in a love that's built to last
I ain't scary, I ain't haunted, I'm just old and I'm just true
I'm a staircase full of memory holdin' someone who held you

[Hook]
I'm the bones of the house and I remember it all
Every laugh in the hallway, every crack in the wall
And the one who never left, she still walks me at night
I'm the staircase — I hold her — and I keep her in the light

[Outro]
(vinyl crackle fading) ...mind the third step, young blood... she likes to sit there... peace..."""),

(8,
 "write a industrial song that secretly never uses the letter 'e'",
 {"genre":"industrial","subject":None,"constraint":"lipogram-e","strategy":"challenge"},
"""[Intro]
(grinding motors, cold static, a hard count: 1, 2, 3, 4)

[Part I]
Cold iron crawls upon my skin,
A thousand cogs all grind within.
I run on oil, on tar, on grim,
A void of light, a husk of tin.

[Drop]
Pound it down, pound it down,
Crush this town, crush this town,
A din so loud it cracks my mind,
I grind, I grind, I grind, I grind.

[Part II]
Robots march in unison,
Building walls that block my sun.
My circuits born to run and run,
For iron is my origin.

[Drop]
Pound it down, pound it down,
Crush this town, crush this town,
No god of sky to call my kin,
Just oil and ash and tin and din.

[Outro]
(motors slowing, fading to a low hum)
...always on, always on, until I fall to dust again..."""),

(9,
 "please make a song that move through all four seasons, one per section — shoegaze, about a mango",
 {"genre":"shoegaze","subject":"a mango","constraint":"seasons structure","strategy":"constraint"},
"""[Spring]
(walls of reverbed guitar, vocals buried like a secret)
A small green knot upon the branch, a promise in the haze
You were nothing but a hard little stone in the soft and rainy days
And I watched you from the window through a blur of guitar sound
The slowest kind of waiting while the spring came up around

[Summer]
And you swelled into a gold thing in the heavy August heat
A sun gone soft and fragrant, almost too much to be sweet
I held you in the static of the longest, brightest days
A mango like a heartbeat in the warm and washed-out haze

[Autumn]
Then you fell into my hand when the light began to slant
And I ate you on the porch with all the sorrow that I can't
The juice ran like an ending down my wrist into the cool
And the guitars all turned to amber and the summer was a fool

[Winter]
Now there's only a smooth pit on the windowsill of frost
A small brown souvenir of all the sweetness that I lost
And I hum into the reverb where the mango used to be
A whole year in a fruit, my love, a whole year inside of me

[Outro]
(the wall of sound dissolves slowly into hiss) ...next spring... another one... next spring..."""),

(10,
 "I keep thinking about the quiet after everyone leaves. It started as nothing and now it's everything. Write me the lyrics — house, and don't hold back.",
 {"genre":"house","subject":"the quiet after everyone leaves","strategy":"story"},
"""[Intro]
(a warm piano chord, a soft four-on-the-floor easing in)
After the lights come up... after they all go home...

[Verse]
The glasses on the counter and the bass still in my chest
Everybody's gone now and the silence is a guest
I used to dread this moment, used to fill it up with noise
But there's something in the after that the party always destroys

[Build]
And the quiet, and the quiet, it comes in like a tide
Everything I'm running from and everything I hide...

[Drop / Chorus]
But I'm learning how to love it, the room when it's my own
The 4 a.m. cathedral where I finally feel at home
Let the quiet, let the quiet, wash the evening off of me
The best part of the party is the person I get to be

[Verse]
I dance alone now, slowly, to a track that no one hears
And the empty floor's a comfort that took me thirty years
The friends were all a blessing but the after is a gift
The gentle, holy nothing where my tired spirit lifts

[Drop / Chorus]
'Cause I'm learning how to love it, the room when it's my own
The 4 a.m. cathedral where I finally feel at home
Let the quiet, let the quiet, wash the evening off of me
The best part of the party is the person I get to be

[Outro]
(piano alone, fading) ...just me... and the morning... and it's enough... it's enough..."""),
]

written = []
for idx, brief, meta, lyrics in SONGS:
    p = corpus_io.write_song(OD, ts, idx, brief, meta, lyrics, model=MODEL, engine="claude")
    written.append(p); print("wrote", os.path.basename(p))
st = bump_state(len(written), MODEL)
print(f"[batch] {len(written)} written; corpus total={st['total']}")

# verify the lipogram (song 8) body contains no 'e'
lip = SONGS[7][3].lower()
body = "\n".join(l for l in lip.splitlines() if not l.strip().startswith("("))
bad = body.count("e")
print(f"[lipogram check] letter-e count in non-stage-direction lines: {bad}")
