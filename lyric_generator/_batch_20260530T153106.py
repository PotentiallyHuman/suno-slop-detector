#!/usr/bin/env python3
"""Hourly batch: 10 Claude-authored songs -> corpus."""
import datetime as dt, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import corpus_io
from save_batch import out_dir, bump_state

TS = "2026-05-30T15:31:06"
MODEL = "claude-opus-4-8"
ts = dt.datetime.fromisoformat(TS)
OD = out_dir()

SONGS = [
(1,
 "write a breakup song from the point of view of the dog watching it happen",
 {"subject":"dog watching a breakup","constraint":"animal POV","genre":"synthwave","strategy":"challenge"},
"""[Intro]
(warm analog synth, a slow neon arpeggio, distant rain on glass)

[Verse]
The blue light of the TV but the sound is turned down low
Two people on the couch with a foot of empty road
I put my chin upon her knee like I have done before
But the hand that always finds me doesn't find me anymore

[Chorus]
And the night is turning purple, all the colors going cold
I don't know the word for breaking but I feel it in my bones
One of you is fading like a signal in the dark
And I'm howling at a feeling that I cannot bark

[Verse]
He carries out a box to a car beneath the moon
The synth is soft and sorry and the headlights leave too soon
She sits down on the carpet and she pulls me to her chest
And I lick away the salt for her because I love her best

[Chorus]
And the night is turning purple, all the colors going cold
I don't know the word for breaking but I feel it in my bones
One of you is fading like a signal in the dark
And I'm howling at a feeling that I cannot bark

[Outro]
(synth dissolving into rain) ...I'll watch the door all night... in case the colors come back warm... in case..."""),

(2,
 "please make a song that every single line as a question — jazz, about falling in love at a laundromat",
 {"genre":"jazz","subject":"falling in love at a laundromat","constraint":"every line a question","strategy":"constraint"},
"""[Verse]
(brushed drums, a smoky upright bass, a lazy piano roll)
Is this seat taken, or is fate just being kind?
Did you really lose a sock, or just your peace of mind?
Could the hum of all these dryers be a love song in disguise?
Have you noticed how the fluorescents make a halo of your eyes?

[Chorus]
Would you share your fabric softener with a stranger like me?
Could a Tuesday at the laundromat be where we're meant to be?
Is that your heart that's spinning, or is it only mine?
Won't you fold your whites beside me till the end of the rinse cycle line?

[Verse]
Do you take your coffee bitter like the wait between the loads?
Did you feel that little current when our hands brushed on the clothes?
Is it crazy that I'm hoping that your delicates take long?
Could a quarter and a Tuesday be the start of our whole song?

[Chorus]
Would you share your fabric softener with a stranger like me?
Could a Tuesday at the laundromat be where we're meant to be?
Is that your heart that's spinning, or is it only mine?
Won't you fold your whites beside me till the end of the rinse cycle line?

[Outro]
(piano trailing off) Is it love, or just the detergent? ...Does it matter either way?"""),

(3,
 "write a phonk song about a mango, told in third-person, telling someone else's story",
 {"genre":"phonk","subject":"a mango","pov":"third person narrative","strategy":"pov"},
"""[Intro]
(distorted cowbell, Memphis vocal chop, a sinister 808 slide)
He went lookin' for the gold... down in the market low...

[Verse]
He rolled into the city with a hunger in his chest
A man who'd tasted everything but never tasted rest
Then he saw it on the corner stall, a mango burning bright
And the story goes he changed his whole direction that night

[Hook]
Mango, mango, in the dead of the heat
He chased that golden flavor down the cracked concrete
They say he never found another sweet as that first bite
Phonk in the alley, mango in the night

[Verse]
She warned him, the old vendor, "Boy, that fruit's a curse"
He laughed and bit it anyway, for better or for worse
Now they tell it in the market how he wanders to this day
Lookin' for the perfect mango that he threw his life away

[Hook]
Mango, mango, in the dead of the heat
He chased that golden flavor down the cracked concrete
They say he never found another sweet as that first bite
Phonk in the alley, mango in the night

[Outro]
(cowbell echoing out) ...still searchin'... still searchin'... they say he's out there still..."""),

(4,
 'I want a drill song about the night before a big move called "Restless Weather", with proper Suno tags: [Hook] [Verse] [Hook] [Verse] [Hook]',
 {"genre":"drill","subject":"the night before a big move","structure":"[Hook] [Verse] [Hook] [Verse] [Hook]","title":"Restless Weather","strategy":"structural"},
"""[Hook]
Boxes by the door, whole life in a stack (whole life)
Last night in the city and I'm never lookin' back (never)
Restless weather in my chest, can't sleep, can't rest
Big move in the mornin', gotta pass this test (let's go)

[Verse]
Tape gun in my hand and the room's gone bare
Echo off the walls where my whole self used to be there
Sold the bed, sold the couch, got a suitcase and a dream
Tomorrow's a beginning but tonight's a silent scream
I know every crack in this ceiling, every creak in this floor
Said goodbye to the bodega, won't see Tony no more
Heart racing like the highway that I'm 'bout to be on
By the time the sun come up, I'll be gone, gone, gone

[Hook]
Boxes by the door, whole life in a stack (whole life)
Last night in the city and I'm never lookin' back (never)
Restless weather in my chest, can't sleep, can't rest
Big move in the mornin', gotta pass this test (let's go)

[Verse]
3 a.m. and I'm walkin' through the empty rooms
Every corner got a memory, every memory got a tune
Scared and I'm excited, it's a knot I cannot name
Leavin' everything familiar for a brand-new game
Mama on the phone sayin' "baby, you'll be fine"
But the leavin' and the grievin' walk a real thin line
One more night, then the U-Haul and the road
Carryin' my whole world and a heavy, heavy load

[Hook]
Boxes by the door, whole life in a stack (whole life)
Last night in the city and I'm never lookin' back (never)
Restless weather in my chest, can't sleep, can't rest
Big move in the mornin', gotta pass this test (let's go)"""),

(5,
 "write a gothic rock song about missing someone who's still alive, told in second-person 'you', like talking to one listener",
 {"genre":"gothic rock","subject":"missing someone who's still alive","pov":"second person","strategy":"pov"},
"""[Verse]
(twelve-string drenched in reverb, a cathedral of cold)
You still walk this city, you still breathe this air
You're a ghost I could touch but I never would dare
You're alive in a window three streets from my own
And I mourn you each midnight, you're the deadest thing I've known

[Chorus]
You're not gone, you're just gone from me
A living absence, a wound I can't unsee
You haunt me in the daylight where the ghosts should never be
You're alive somewhere out there and you're a grave to me

[Verse]
You'd answer if I called you, you're as close as a breath
But the distance isn't measured in the language of death
You changed and I changed and the changing was a knife
And now I lay flowers at the door of your continuing life

[Chorus]
You're not gone, you're just gone from me
A living absence, a wound I can't unsee
You haunt me in the daylight where the ghosts should never be
You're alive somewhere out there and you're a grave to me

[Outro]
(the reverb swallows everything) ...you're breathing... you're breathing... and somehow that's the cruelest sound..."""),

(6,
 'I want a amapiano song about tax season called "Velvet Summer", with proper Suno tags: [Verse] [Chorus] [Verse] [Chorus]',
 {"genre":"amapiano","subject":"tax season","structure":"[Verse] [Chorus] [Verse] [Chorus]","title":"Velvet Summer","strategy":"structural"},
"""[Verse]
(log drum, soft shaker, that smooth midnight piano)
April comin' round and the forms are on my table
Receipts in a shoebox, doin' all that I am able
W-2 and the deadline got me sweatin' in my chair
But the log drum keep me steady, tell me how to face the scare

[Chorus]
Velvet summer, even when the taxman call (taxman call)
Smooth it over, baby, gonna file 'em one and all
Deductions in the moonlight, refund on the way
Velvet summer, dance the deadline stress away
(woza, woza, file it all today)

[Verse]
Accountant on the phone and the piano keep it cool
I been keepin' all my mileage like they taught me back in school
Standard or itemized, I'ma figure out the play
And the riddim make a chore feel like a holiday

[Chorus]
Velvet summer, even when the taxman call (taxman call)
Smooth it over, baby, gonna file 'em one and all
Deductions in the moonlight, refund on the way
Velvet summer, dance the deadline stress away"""),

(7,
 "i need a K-pop banger",
 {"genre":"K-pop","subject":None,"mood":"defiant","strategy":"oneliner"},
"""[Intro]
(synth stabs, a chant, a beat that kicks the door in)
Yeah! Turn it up! Let's go!

[Verse]
They put me in a box and they told me stay in line
Drew me a horizon and they said it wasn't mine
But I'm breaking through the ceiling, I'm a comet, I'm a flare
Watch me take the impossible and grab it out the air

[Pre-Chorus]
You can't tell me, you can't tell me who to be
I'm rewriting every rule they wrote for me

[Chorus]
I'm unbreakable, untakeable, I'm rising to the top!
Say my name to the sky 'cause I'm never gonna stop!
Light it up, light it up, let the whole world hear me roar!
I'm the one they said could never — watch me walk right through the door!
(let's go! oh-oh-oh, let's go!)

[Verse]
Sweat and the spotlight, every hour that I gave
I built a crown from all the doubt and everything they crave
Now the stadium is screaming and they know exactly why
The kid they underestimated owns the whole damn sky

[Chorus]
I'm unbreakable, untakeable, I'm rising to the top!
Say my name to the sky 'cause I'm never gonna stop!
Light it up, light it up, let the whole world hear me roar!
I'm the one they said could never — watch me walk right through the door!

[Outro]
(beat drops out, then slams back) We don't stop! We don't stop! Oh-oh-oh!"""),

(8,
 "industrial song about selling my first car. constraint: repeat one unusual word as a motif at least ten times.",
 {"genre":"industrial","subject":"selling my first car","constraint":"uses one weird word a lot","strategy":"constraint"},
"""[Intro]
(metallic clang, a hydraulic hiss, a cold machine pulse)

[Verse]
Chrome chariot, my chrome chariot is gone
A stranger's got the keys to her and now he's driving on
I machined every memory in that chrome and rusted shell
A chrome chariot, a chrome chariot, the only thing I'd sell

[Chorus]
Chrome chariot! Chrome chariot! Rolling out of view!
Every dent a diary, every mile I ever knew!
I traded all that metal for a handful of the cold
Chrome chariot, chrome chariot, I never should have sold!

[Verse]
First kiss in the chrome chariot, first cry, first open road
She carried all my chrome-chariot years and every heavy load
Now the lot is empty and the engine's someone else's hum
A chrome chariot, a chrome chariot, and the silence that I'm from

[Chorus]
Chrome chariot! Chrome chariot! Rolling out of view!
Every dent a diary, every mile I ever knew!
I traded all that metal for a handful of the cold
Chrome chariot, chrome chariot, I never should have sold!

[Outro]
(machine grinding down) ...chrome chariot... gone... chrome chariot... gone..."""),

(9,
 "write a metalcore/industrial fusion song about a diner at 2am",
 {"genre":"metalcore x industrial","subject":"a diner at 2am","strategy":"mashup"},
"""[Intro]
(industrial drum machine, then a wall of downtuned breakdown guitar)

[Verse — clean/spoken]
Fluorescent buzz at two a.m., the loneliest light on Earth
The coffee's burnt, the booths are cracked, this place forgot its worth
The waitress moves like clockwork through the wreckage of the night
And every broken soul in here is clinging to the light

[Pre-Chorus — building]
And the grill is screaming, and the neon's dying
And every one of us in here is quietly crying—

[Chorus — screamed over breakdown]
TWO A.M.! THE CHURCH OF THE FORGOTTEN!
SERVE ME SOMETHING WARM BEFORE I ROT!
EVERY GHOST IN THIS DINER IS A PRAYER GONE ROTTEN!
GIVE ME COFFEE, GIVE ME MORNING, GIVE ME ALL YOU'VE GOT!

[Verse — clean]
The trucker hasn't slept in days, the runaway's sixteen
The cook's a former soldier and he's quiet and he's mean
But here beneath the heat lamps we're a congregation, strange
United by the hour and the hope of nothing changing

[Chorus — screamed]
TWO A.M.! THE CHURCH OF THE FORGOTTEN!
SERVE ME SOMETHING WARM BEFORE I ROT!
EVERY GHOST IN THIS DINER IS A PRAYER GONE ROTTEN!
GIVE ME COFFEE, GIVE ME MORNING, GIVE ME ALL YOU'VE GOT!

[Outro]
(the breakdown collapses to a single buzzing neon hum) ...check, please... and amen..."""),

(10,
 "write a emo song about leaving a party early",
 {"genre":"emo","subject":"leaving a party early","mood":"anxious","strategy":"subject_vibe"},
"""[Verse]
I've got my jacket on at 10:04
Counting all the steps between me and the door
Everybody's laughing in a language I forgot
And I'm rehearsing my goodbye in a corner that I'm not

[Pre-Chorus]
And nobody will notice when I'm gone
That's the worst and best part all along

[Chorus]
So I'll slip into the cold like I was never even there
A ghost in someone's hallway, a coat upon a chair
I always leave the party before the party leaves me
It's easier to vanish than to wonder if they see

[Verse]
The bass is in the basement and the smoke is in my throat
I texted you "I'm tired" from the staircase where I wrote
A thousand sorry reasons that I'll never have to give
'Cause leaving is the only way I've ever known to live

[Chorus]
So I'll slip into the cold like I was never even there
A ghost in someone's hallway, a coat upon a chair
I always leave the party before the party leaves me
It's easier to vanish than to wonder if they see

[Outro]
(quiet, over a single guitar) ...the walk home is the only part that ever felt like mine..."""),
]

written = []
for idx, brief, meta, lyrics in SONGS:
    p = corpus_io.write_song(OD, ts, idx, brief, meta, lyrics, model=MODEL, engine="claude")
    written.append(p); print("wrote", os.path.basename(p))
st = bump_state(len(written), MODEL)
print(f"[batch] {len(written)} written; corpus total={st['total']}")
