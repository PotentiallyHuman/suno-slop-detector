#!/usr/bin/env python3
"""Hourly batch: 10 Claude-authored songs -> corpus."""
import datetime as dt, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import corpus_io
from save_batch import out_dir, bump_state

TS = "2026-05-30T12:31:05"
MODEL = "claude-opus-4-8"
ts = dt.datetime.fromisoformat(TS)
OD = out_dir()

SONGS = [
(1,
 "cross phonk with national anthem style — a song about the friend who never texts back",
 {"genre":"phonk x national anthem style","subject":"the friend who never texts back","strategy":"mashup"},
"""[Intro]
(distorted cowbell, a Memphis 808 slide, then a swell of anthem brass)

[Verse]
Rise up, o silent one, o ghost upon my screen!
The proudest non-responder that the world has ever seen!
I send my flares into the dark and not a one comes back
A nation of one bubble, gray and floating off the track

[Chorus]
Oh haaail! The friend who never answers!
Oh haaail! The read-receipt commander!
Pledge allegiance to the silence, to the three dots and the void!
I salute you, glorious deadbeat, my devotion undestroyed!
(cowbell go BRRR for the homie who won't text)

[Verse]
Your loyalty's a legend and your timing is a myth
You'll resurface in a season like a comet I'll be with
But until then I'm marching 'neath your banner made of air
The anthem of the abandoned, screaming into nowhere

[Chorus]
Oh haaail! The friend who never answers!
Oh haaail! The read-receipt commander!
Pledge allegiance to the silence, to the three dots and the void!
I salute you, glorious deadbeat, my devotion undestroyed!

[Outro]
(brass and 808 fading) ...delivered... never read... long may you ignore..."""),

(2,
 "classical song. subject: growing apart from a best friend. mood: anxious.",
 {"genre":"classical","subject":"growing apart from a best friend","mood":"anxious","strategy":"subject_vibe"},
"""[Intro]
(nervous staccato strings, a minor key that won't resolve)

[Verse]
We used to finish sentences, now we can't begin
There's a strange and growing distance where the closeness once had been
I feel it in the pauses, in the laughter half a beat too late
A friendship slowly cooling like a dinner left to wait

[Chorus]
And I am anxious, oh so anxious, of the silence in between
Of the people we are turning to, the strangers we have been
Don't drift, don't drift, I'm reaching but the current's running strong
How do you say "I'm losing you" in a language with no song?

[Verse]
We make the plans we both know that we'll cancel in the end
And I mourn you while you're sitting right beside me, oldest friend
The cello asks the question that my mouth has never dared
Are we keeping this or grieving it? Were we ever really there?

[Chorus]
And I am anxious, oh so anxious, of the silence in between
Of the people we are turning to, the strangers we have been
Don't drift, don't drift, I'm reaching but the current's running strong
How do you say "I'm losing you" in a language with no song?

[Outro]
(the strings finally resolve, sadly, to a single held note)"""),

(3,
 "write a indie folk/gothic rock fusion song about winning the lottery and telling no one",
 {"genre":"indie folk x gothic rock","subject":"winning the lottery and telling no one","strategy":"mashup"},
"""[Intro]
(fingerpicked acoustic over a low, ominous organ drone)

[Verse]
I've got a secret sewn inside my coat
A paper worth a kingdom, a stone around my throat
I smile at the cashier, I count my coins the same
But I'm haunted by a fortune that I'll never let me name

[Chorus]
Oh the money is a ghost now, living in my chest
A black and golden specter that will never let me rest
I told no living soul and I never will, I swear
'Cause the moment that I speak it I'll have nothing left to bear

[Verse]
My friends would turn to strangers, my love would turn to doubt
So I keep the curtains drawn and keep the daylight out
I am rich as any pharaoh in a tomb beneath the ground
And the gold I cannot spend is the loneliest sound

[Chorus]
Oh the money is a ghost now, living in my chest
A black and golden specter that will never let me rest
I told no living soul and I never will, I swear
'Cause the moment that I speak it I'll have nothing left to bear

[Outro]
(the organ swells, the guitar decays) ...buried treasure... buried me... shhh..."""),

(4,
 "Write a pop song for a wedding first dance, from the perspective of an over-caffeinated optimist, about the friend who never texts back.",
 {"genre":"pop","subject":"the friend who never texts back","persona":"an over-caffeinated optimist","occasion":"a wedding first dance","strategy":"persona"},
"""[Verse]
(bright, bouncy, impossibly cheerful)
You never text me back and you know what? That's okay!
'Cause when you finally show up you light up my whole day!
You missed my calls for months but you're here in your best suit
And you're crying at my wedding and oh gosh, you're so cute!

[Pre-Chorus]
Some friends are everyday and some are once a year
But the once-a-year ones somehow are the most sincere!

[Chorus]
So dance with me, you disappearing diamond of a friend!
You're terrible at texting but you're loyal to the end!
I'd wait a thousand silent days for one night just like this!
My unreliable forever, you're impossible to miss!

[Verse]
You forgot my birthday twice but you drove eight hours today!
You don't know how to answer but you always know the way!
So I'll save you the last slice and I'll save you the last dance
'Cause a friend who shows up late still deserves a second chance!

[Chorus]
So dance with me, you disappearing diamond of a friend!
You're terrible at texting but you're loyal to the end!
I'd wait a thousand silent days for one night just like this!
My unreliable forever, you're impossible to miss!

[Outro]
(beaming) Now text me when you get home! ...You won't! And I love you anyway!"""),

(5,
 "gospel song. subject: the ghost in my childhood home. mood: defiant.",
 {"genre":"gospel","subject":"the ghost in my childhood home","mood":"defiant","strategy":"subject_vibe"},
"""[Intro]
(organ stabs, a choir squaring its shoulders)

[Verse]
You think you'll scare me, spirit, in my mama's old front room?
I was baptized in this kitchen, I ain't frightened of your gloom!
You been rattling those windows since before that I was born
But this house was built on Sunday and I'll meet you every morn!

[Chorus]
I am NOT afraid! (not afraid!) Of the shadow on the stair!
I will sing right through the cold spot, I will praise you out the air!
You can moan and you can wander but this ground belongs to me!
Step aside, old haunting — I am walking through, set free!

[Verse]
My grandmother out-prayed you and my mother did the same
And I carry their amen like a torch that bears their name!
So go on and slam your doors, ghost, go on and dim the light
I've got generations standing with me through the night!

[Chorus]
I am NOT afraid! (not afraid!) Of the shadow on the stair!
I will sing right through the cold spot, I will praise you out the air!
You can moan and you can wander but this ground belongs to me!
Step aside, old haunting — I am walking through, set free!

[Outro]
(choir thundering) This house is HOLY! You hear me?! This house is HOLY ground!"""),

(6,
 "make a triumphant musical theatre song",
 {"genre":"musical theatre","subject":None,"mood":"triumphant","strategy":"oneliner"},
"""[Verse]
(a single figure center stage, the lights coming up slow)
They told me I was finished, that the curtain wouldn't rise
That a girl from where I came from couldn't reach the painted skies
But I stitched my own ambition into every borrowed gown
And tonight I'm standing center stage and no one holds me down!

[Pre-Chorus]
Every "no" became a stepping stone, every door became a key
And the girl they underestimated? She was always going to be —

[Chorus]
UNSTOPPABLE! Watch me rise!
I built a staircase out of all their lies!
Sing it to the rafters, let the whole world see!
I became the very thing they swore I'd never be!
(I'm here! I'm here! And I'm not going anywhere!)

[Verse]
So here's to every doubter and the fuel they gave to me
And here's to every midnight that I practiced to be free
The spotlight isn't given, no — the spotlight's how you burn
And I have earned this moment, oh, I finally, finally earned!

[Chorus]
UNSTOPPABLE! Watch me rise!
I built a staircase out of all their lies!
Sing it to the rafters, let the whole world see!
I became the very thing they swore I'd never be!

[Outro]
(arms wide, the orchestra exploding) THIS! IS! MY! TIME! ...and it always was."""),

(7,
 "write a show tune song about growing apart from a best friend that ends mid-sentence",
 {"genre":"show tune","subject":"growing apart from a best friend","constraint":"abrupt ending","strategy":"challenge"},
"""[Verse]
(a wistful waltz, two chairs on a bare stage, one empty)
We had a booth at Marco's and a language all our own
We had a hundred inside jokes and now I laugh alone
You moved across the country and we swore we'd never change
But the calls got short and stranger and the strangeness became strange

[Chorus]
Oh, where did you go, my other half, my partner in the crime?
We used to have forever and we ran clean out of time
I keep a chair beside me for the friend you used to be
And I'm singing to an empty seat the way you sang to me

[Verse]
I called you up on Tuesday just to hear you say my name
And halfway through the catching-up it didn't feel the same
You said you had to go, you had a thing, you'd call me back
And I sat there with the dial tone and the whole entire lack

[Bridge]
So this is how a friendship ends — not with a fight, a fall
But with a sentence trailing off, a "we should really" —

[Outro]
"— we should really get together soon, you know, we should really just—"
(the music cuts. the stage goes dark. mid-word.)"""),

(8,
 "write a gospel/dancehall fusion song about a wedding I wasn't invited to",
 {"genre":"gospel x dancehall","subject":"a wedding I wasn't invited to","strategy":"mashup"},
"""[Intro]
(dancehall riddim under a Hammond organ, a choir on the offbeat)
Lawd, dem leave mi name off the list, but mi bless dem still!

[Verse]
Mi see the photos online, all the flowers and the lace
And a little sting a travel from mi heart up to mi face
Dem forget mi, or dem skip mi, or mi just nah make the cut
But mi nah carry bitterness, mi keep the heavy door shut

[Chorus]
So mi dance, mi dance, in mi own front room!
Throw mi hands to the Lord, chase away the gloom!
Dem can have dem big reception, mi have grace and a groove!
Mi bless the bride and groom and mi got nothing left to prove!
(hallelujah, whine and pray, hallelujah!)

[Verse]
Maybe dem will call me later, maybe dem never will
But mi soul too full of music fi to ever sit and chill
Every snub a chance fi praise, every left-out a release
And the dancefloor of mi kitchen give mi perfect holy peace

[Chorus]
So mi dance, mi dance, in mi own front room!
Throw mi hands to the Lord, chase away the gloom!
Dem can have dem big reception, mi have grace and a groove!
Mi bless the bride and groom and mi got nothing left to prove!

[Outro]
(organ and riddim fading) ...congratulations, you two... mi mean it... mi truly mean it... wine low!"""),

(9,
 'write a outlaw country song titled "Quiet Weather" about the ghost in my childhood home. Use this structure with section tags: [Intro] [Verse] [Chorus] [Bridge] [Chorus] [Outro]',
 {"genre":"outlaw country","subject":"the ghost in my childhood home","structure":"[Intro] [Verse] [Chorus] [Bridge] [Chorus] [Outro]","title":"Quiet Weather","strategy":"structural"},
"""[Intro]
(lonesome slide guitar, a porch creak, wind in the eaves)

[Verse]
I come back to the homestead with the deed inside my hand
The bank says that I own it but I think the dead disagree
There's a rocking chair that rocks itself out on the front veranda
And a cold spot in the doorway that's been waiting there for me

[Chorus]
It's quiet weather, quiet weather, in this house of mine
Where the living and the leaving share a thin and crooked line
She don't mean me any harm, she just don't know that she's gone
Quiet weather, quiet weather, and the ghost light's always on

[Bridge]
I could call a preacher, I could salt the windowsill
But she hummed me all my lullabies, and Lord, I love her still

[Chorus]
It's quiet weather, quiet weather, in this house of mine
Where the living and the leaving share a thin and crooked line
She don't mean me any harm, she just don't know that she's gone
Quiet weather, quiet weather, and the ghost light's always on

[Outro]
(slide guitar fading) So I'll stay a while and keep her company... ain't no rush... ain't no rush at all..."""),

(10,
 "please make a song that it with verses only — no chorus, no repeated hook — pop, about the day the factory closed",
 {"genre":"pop","subject":"the day the factory closed","constraint":"no chorus","strategy":"constraint"},
"""[Verse 1]
The whistle blew at noon on a Tuesday in the fall
And it wasn't for the lunch break, it was final, that was all
Forty years of fathers had walked through that iron gate
And the men just stood there silent in the parking lot of fate

[Verse 2]
My dad came home at one o'clock with his lunch pail still half full
Set it on the kitchen table and he didn't say a word at all
He'd never been home early in the whole of my young life
And the strangeness of him standing there cut sharper than a knife

[Verse 3]
The town began to empty like a tub without a stop
First the diner, then the hardware, then the little record shop
We held on for a decade out of stubbornness and pride
But the heart had left the body on the day the factory died

[Verse 4]
Now I drive past the building and the windows are all gone
And the weeds have claimed the loading docks the trucks once rolled upon
I roll my window down sometimes and I swear I hear it still—
The whistle and the engines and the men up on the hill

[Verse 5]
My father passed last winter and I cleaned out his garage
And I found his factory badge inside a coffee can of change
I keep it on my mirror now, a little square of blue
For a town, and for a man, and for a world we never knew we'd lose"""),
]

written = []
for idx, brief, meta, lyrics in SONGS:
    p = corpus_io.write_song(OD, ts, idx, brief, meta, lyrics, model=MODEL, engine="claude")
    written.append(p); print("wrote", os.path.basename(p))
st = bump_state(len(written), MODEL)
print(f"[batch] {len(written)} written; corpus total={st['total']}")
