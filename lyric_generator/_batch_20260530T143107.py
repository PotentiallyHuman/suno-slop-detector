#!/usr/bin/env python3
"""Hourly batch: 10 Claude-authored songs -> corpus."""
import datetime as dt, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import corpus_io
from save_batch import out_dir, bump_state

TS = "2026-05-30T14:31:07"
MODEL = "claude-opus-4-8"
ts = dt.datetime.fromisoformat(TS)
OD = out_dir()

SONGS = [
(1,
 "Y2K club vibes, song about my grandmother's kitchen, full lyrics",
 {"genre":"Y2K club","subject":"my grandmother's kitchen","strategy":"era"},
"""[Intro]
(trance arp, vocal chop, a euphoric 2000s rave build)
Take me back... take me back...

[Verse]
Linoleum floor and a humming fridge light
Flour on the counter at the edge of the night
She's stirring up a magic in a dented old pot
And the whole world is safe in that warm little spot

[Pre-Chorus]
And I'd trade every club in every city tonight
For one Sunday morning in that yellow kitchen light

[Chorus]
Grandma's kitchen, take me higher!
Sugar and the stovetop fire!
Hands up if you'd give it all to go back home!
Spinning in the steam where I was never alone!
(take me back, take me back, to the kitchen and the love)

[Verse]
She's gone seven years but the recipe remains
Like a beat I can't forget through the joy and the pains
So I close my eyes in the strobe and the bass
And I'm eight years old again in that holy little place

[Chorus]
Grandma's kitchen, take me higher!
Sugar and the stovetop fire!
Hands up if you'd give it all to go back home!
Spinning in the steam where I was never alone!

[Outro]
(vocoder fading) ...one more Sunday... one more... I'd give anything..."""),

(2,
 "please make a song that repeat the last line of each verse one more time than the verse before — sea shanty, about a wedding I wasn't invited to",
 {"genre":"sea shanty","subject":"a wedding I wasn't invited to","constraint":"growing repetition","strategy":"constraint"},
"""[Verse 1]
Oh they married in the chapel by the cold and rolling sea
And every soul in town was there, every soul but me
So I raised a glass alone on the dock where the gulls all cry
And I wished 'em well, I wished 'em well, as the ship went sailing by

[Verse 2]
The bride wore all her mother's lace and the groom was my old friend
We'd sailed a hundred storms together but our friendship met its end
I heard the bells from down the shore and I let the salt run dry
And I wished 'em well, I wished 'em well, as the ship went sailing by
And I wished 'em well, I wished 'em well, as the ship went sailing by

[Verse 3]
Perhaps the letter lost its way, perhaps they clean forgot
But a sting that small can sink a man if he dwells upon the spot
So I'll haul my nets and mend my heart 'neath a grey forgiving sky
And I wished 'em well, I wished 'em well, as the ship went sailing by
And I wished 'em well, I wished 'em well, as the ship went sailing by
And I wished 'em well, I wished 'em well, as the ship went sailing by

[Outro]
(a lone voice over the waves) ...fair winds to ye both... fair winds..."""),

(3,
 "a bittersweet lo-fi hip hop song about an old dog at the end of summer",
 {"genre":"lo-fi hip hop","subject":"an old dog at the end of summer","mood":"bittersweet","strategy":"subject_vibe"},
"""[Intro]
(dusty piano loop, vinyl crackle, a slow swung kick)

[Verse]
Late August light through the screen door, gold on the floor
He don't chase the ball no more, just watches from the door
Muzzle gone to silver, eyes a little less bright
But he finds my lap at sundown like he's done his whole life

[Hook]
And it's bittersweet, bittersweet
The slow last days of summer heat
Lay your head down on my feet
Every moment's incomplete and bittersweet

[Verse]
Vet says take it easy, says he's tired, says he's old
And the leaves are getting restless and the mornings turning cold
So I'll carry him up the stairs and I'll feed him off my plate
And I'll love him through the autumn 'cause I'm grateful and I'm late

[Hook]
And it's bittersweet, bittersweet
The slow last days of summer heat
Lay your head down on my feet
Every moment's incomplete and bittersweet

[Outro]
(loop fading into crackle) ...good boy... stay a little... good boy..."""),

(4,
 "Write a swing song for a New Year's countdown, from the perspective of a new mom running on no sleep, about the ocean at 3am.",
 {"genre":"swing","subject":"the ocean at 3am","persona":"a new mom running on no sleep","occasion":"a New Year's countdown","strategy":"persona"},
"""[Intro]
(soft big-band brushes, a sleepy trumpet, a clock ticking toward twelve)

[Verse]
The whole world's poppin' corks tonight, they're dancing in the square
But I'm rocking in the kitchen with a baby and a stare
The radio says ten, nine, eight, the city's all aglow
And my eyes are like the ocean at three a.m., dark and slow

[Chorus]
But happy New Year, little one, you're the only ball I'll drop tonight!
Six, five, four, you're milk-drunk and I'm running on no light!
The horns are blowing somewhere but my whole new world is here
Just me and you and the tired tide and a swung and sleepless year!

[Verse]
They're kissing under streetlights and they're toasting to the past
But I found a new horizon in a love that came so fast
The ocean of exhaustion's deep but oh, the moon is you
And midnight's just a number when your whole life's brand new

[Chorus]
So happy New Year, little one, you're the only ball I'll drop tonight!
Three, two, one, you're finally asleep and the morning's soft and bright!
The horns are blowing somewhere but my whole new world is here
Just me and you and the tired tide and a swung and sleepless year!

[Outro]
(trumpet yawning sweet) ...auld lang syne, baby mine... go to sleep... go to sleep..."""),

(5,
 "Okay long story but: the dog waiting by the door. It's been on my mind for weeks. Make it a folk song please, full lyrics.",
 {"genre":"folk","subject":"the dog waiting by the door","strategy":"story"},
"""[Verse]
(fingerpicked acoustic, a plaintive harmonica)
Every morning when I leave him he lies down by the sill
And I swear he doesn't move an inch, I swear he's lying still
Eight long hours of waiting for the sound of my old car
And he greets me like a soldier home from someplace very far

[Chorus]
Oh, the dog waits by the door, by the door
He's got a faith I've never had before
He don't know the word for "later," only knows the word for "you"
And he waits there by the door the whole day through

[Verse]
I think about him sometimes when I'm sitting at my desk
This small and patient creature with a love that asks the less
And I wonder if I'm worthy of devotion quite so pure
A life spent simply waiting, simply waiting by the door

[Chorus]
Oh, the dog waits by the door, by the door
He's got a faith I've never had before
He don't know the word for "later," only knows the word for "you"
And he waits there by the door the whole day through

[Outro]
(harmonica fading) So I'll hurry home tonight, old friend... somebody's keeping the light... somebody's keeping the light..."""),

(6,
 "I keep thinking about my grandmother's kitchen. It started as nothing and now it's everything. Make it a boom bap rap song please, full lyrics.",
 {"genre":"boom bap rap","subject":"my grandmother's kitchen","strategy":"story"},
"""[Intro]
(soul-sample chop, dusty kick-snare, fingers snappin')
Yeah... flour on the apron... let's go...

[Verse 1]
Picture linoleum, gold light through a yellow shade
Pot of something simmerin', the best I ever made — nah, that SHE ever made
Wooden spoon conductor of a symphony of steam
Grandma in her kingdom, every Sunday was a dream
She ain't have a lot of money but the table never knew it
Took a dollar and a prayer and somehow she'd run right through it
Cornbread risin', collard greens, the whole block could smell it
A love you couldn't measure but her cookin' tried to tell it

[Hook]
It started as a nothin', just a room, just a chair
Now it's everything I carry, it's the love that's still there
Grandma's little kitchen where the whole of me was made
The realest kind of riches and it never had a price tag, nah

[Verse 2]
Now the house got sold and the kitchen's someone else's
But I cook her recipes and I swear the spirit melts
Into the onions and the garlic and the time
She lives in every meal, man, she lives in every rhyme
Teach my daughter how to stir it, tell her 'bout her great-grand
How a tiny yellow kitchen made a family understand
That nothin' becomes everything when love is what you're feedin'
That's the gospel of the kitchen and it's all the church I'm needin'

[Hook]
It started as a nothin', just a room, just a chair
Now it's everything I carry, it's the love that's still there
Grandma's little kitchen where the whole of me was made
The realest kind of riches and it never had a price tag

[Outro]
(sample fading) ...one more plate, Grandma... save me one more plate..."""),

(7,
 "show tune song about growing up too fast. constraint: repeat the last line of each verse one more time than the verse before.",
 {"genre":"show tune","subject":"growing up too fast","constraint":"growing repetition","strategy":"constraint"},
"""[Verse 1]
(a young figure downstage, the orchestra tender)
They handed me a briefcase when I wanted a balloon
I traded all my recess for a corner office soon
The childhood that I had was just a flicker and a spark
And I grew up way too fast in the dark

[Verse 2]
I never learned to dawdle, never learned to waste a day
I was always the responsible, the one who'd find the way
But somewhere in the rushing I forgot to leave a mark
And I grew up way too fast in the dark
And I grew up way too fast in the dark

[Verse 3]
So now I'm buying crayons that I never let myself
And I'm reading all the picture books I left up on the shelf
'Cause it's never really over, you can still go light the spark
Even if you grew up way too fast in the dark
Even if you grew up way too fast in the dark
Even if you grew up way too fast in the dark

[Outro]
(the orchestra blooms bright) ...so color outside the lines, kid... it's never too late to start..."""),

(8,
 "2010s streaming-era pop vibes, song about an astronaut who misses gravity, full lyrics",
 {"genre":"2010s streaming-era pop","subject":"an astronaut who misses gravity","strategy":"era"},
"""[Verse]
(tropical-house plucks, a finger-snap beat, an airy topline)
Floating in the silence with the Earth a million miles
Counting all the stars but I'd trade 'em for your smile
Up here nothing falls and nothing holds me anymore
And I miss the simple weight of my feet upon the floor

[Pre-Chorus]
Oh-oh, I'm so far, oh-oh, from the ground
Oh-oh, take me home, oh-oh, pull me down

[Chorus]
'Cause I miss gravity, the way it used to hold me
I miss gravity, all the things it never told me
Now I'm weightless, baby, in a sky too wide to see
Bring me back to Earth, bring me back to gravity
(eh-eh-eh, gravity, eh-eh-eh)

[Verse]
I dream about a stumble, I dream about a fall
The luxury of standing, the gift of getting small
Out here I am infinite and infinite is cold
I'd give the whole horizon just for one hand to hold

[Chorus]
'Cause I miss gravity, the way it used to hold me
I miss gravity, all the things it never told me
Now I'm weightless, baby, in a sky too wide to see
Bring me back to Earth, bring me back to gravity

[Outro]
(beat dropping out to a whisper) ...pull me down... pull me down... I just wanna feel the ground..."""),

(9,
 "write a smooth jazz song about a haunted GPS that gives bad directions that gets faster and more frantic toward the end",
 {"genre":"smooth jazz","subject":"a haunted GPS that gives bad directions","constraint":"accelerando energy","strategy":"challenge"},
"""[Intro — slow, silky]
(soprano sax, a Rhodes shimmer, the gentle hum of a midnight highway)

[Verse — relaxed]
She speaks to me in honey, my little dashboard ghost
"Turn left in a quarter mile," the voice I love the most
But the left goes to a graveyard and the road has been erased
And she purrs, "recalculating," with a smile upon her face

[Chorus — still smooth]
Oh, my haunted GPS, where you taking me tonight?
Your voice is silk and trouble and your map is never right
But I follow every whisper down the dark and winding way
Recalculating, recalculating, leading me astray

[Verse — quickening]
Now she's saying turn around, now she's saying turn again
The Rhodes is getting nervous and the sax is losing zen
"In four hundred feet — no — now — exit — no — go straight —"
And the streetlights start to blur and I can feel the rising weight

[Bridge — frantic, sax shrieking]
Make a U-turn make a U-turn she's screaming make a U-turn now
Off the bridge off the map off the edge and she won't tell me how
Recalculating recalculating recalculating recalcu—
The needle's in the red and the road has come unglued and—

[Outro]
(everything cuts to a calm chime) "...You have arrived." (sax, one last soft note) ...but where?"""),

(10,
 "industrial song about the last text I never sent. constraint: build the whole song around one extremely catchy repeated hook.",
 {"genre":"industrial","subject":"the last text I never sent","constraint":"one repeated hook","strategy":"constraint"},
"""[Intro]
(a glitching keyboard click sampled and looped, hammering machinery)
Type. Delete. Type. Delete.

[Hook]
SEND IT, SEND IT, but my thumb won't move!
DRAFT IN THE DARK with nothing left to prove!
Three little dots and a heart full of dread —
SEND IT, SEND IT — the last text I never said!

[Verse]
I built the perfect message at a quarter after two
Every word a piston, every line a screw
I machined it and I polished it and held it to the light
Then I watched the cursor blinking like a siren in the night

[Hook]
SEND IT, SEND IT, but my thumb won't move!
DRAFT IN THE DARK with nothing left to prove!
Three little dots and a heart full of dread —
SEND IT, SEND IT — the last text I never said!

[Verse]
It's still there in the morning, it's still there when I'm old
A factory of feeling that I left out in the cold
The machine of my devotion never shipped a single part
A warehouse full of "I miss you" locked inside my iron heart

[Hook]
SEND IT, SEND IT, but my thumb won't move!
DRAFT IN THE DARK with nothing left to prove!
Three little dots and a heart full of dread —
SEND IT, SEND IT — the last text I never said!

[Outro]
(the loop grinds to a halt) ...message... discarded... discarded... discarded..."""),
]

written = []
for idx, brief, meta, lyrics in SONGS:
    p = corpus_io.write_song(OD, ts, idx, brief, meta, lyrics, model=MODEL, engine="claude")
    written.append(p); print("wrote", os.path.basename(p))
st = bump_state(len(written), MODEL)
print(f"[batch] {len(written)} written; corpus total={st['total']}")
