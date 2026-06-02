#!/usr/bin/env python3
"""One-off: writes the first Claude-authored batch (10 songs) to the corpus."""
import datetime as dt, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import corpus_io
from save_batch import out_dir, bump_state

TS = "2026-05-30T04:22:33"
MODEL = "claude-opus-4-8"
ts = dt.datetime.fromisoformat(TS)
OD = out_dir()

SONGS = [
(1,
 "Write a grunge song for a funeral, from the perspective of someone who just quit their corporate job, about a houseplant I keep forgetting to water.",
 {"genre":"grunge","subject":"a houseplant I keep forgetting to water","persona":"someone who just quit their corporate job","occasion":"a funeral","strategy":"persona"},
"""[Verse]
I gave you a windowsill and not much else
A coffee-cup of tap and my apologies
I was busy selling hours I would never get back
While your green went grey behind the blinds

[Chorus]
And I'm sorry, little fern, I let you go
I was drowning at a desk I'll never miss
Now I'm free and you are not, and that's the joke
I kept the wrong thing breathing, I confess

[Verse]
They gave me a clock and called it a career
You gave me nothing and I loved you more
Two weeks' notice for the both of us
You went first, I followed out the door

[Chorus]
And I'm sorry, little fern, I let you go
I was drowning at a desk I'll never miss
Now I'm free and you are not, and that's the joke
I kept the wrong thing breathing, I confess

[Bridge]
Pour the water now, pour it on the soil
Pour it like it matters, like it's not too late
[Outro]
Too late, too late — the only honest word I made"""),

(2,
 "Write a classical song for a protest march, from the perspective of a 16-year-old who just got their heart broken, about missing someone who's still alive.",
 {"genre":"classical","subject":"missing someone who's still alive","persona":"a 16-year-old who just got their heart broken","occasion":"a protest march","strategy":"persona"},
"""[Intro]
(soft choir, rising)

[Verse]
You are not gone and still I grieve you
Across a hallway, half a town
You breathe the same grey morning with me
And still I cannot put you down

[Chorus]
So I will march for something larger
Than the small ache in my chest
If I can't have you, let me have a reason
Let the marching give me rest

[Verse]
They sing of countries, I sing of you
A flag I folded up in June
Sixteen and certain it was forever
Forever ended much too soon

[Chorus]
So I will march for something larger
Than the small ache in my chest
If I can't have you, let me have a reason
Let the marching give me rest

[Outro]
Alive, alive — the cruelest word
The one I'll never let you hear"""),

(3,
 "write a folk song about a small town that's slowly disappearing",
 {"genre":"folk","subject":"a small town that's slowly disappearing","mood":"peaceful","strategy":"subject_vibe"},
"""[Verse]
The hardware store went dark in '99
The school bus runs half empty down the line
The diner keeps one waitress and a clock
That's been ten minutes slow since I was nine

[Chorus]
And we're fading like a photograph
Left too long out in the sun
Not with a crash, not with a fight
Just one porch light, then none

[Verse]
The young ones drive to cities for the work
And send back money, never send back time
The church still rings but fewer come to hear
The same old bell, the same forgiving chime

[Chorus]
And we're fading like a photograph
Left too long out in the sun
Not with a crash, not with a fight
Just one porch light, then none

[Outro]
But I'll stay 'til the very last is gone
Somebody ought to turn the last one off"""),

(4,
 "write a national anthem style song about a houseplant I keep forgetting to water",
 {"genre":"national anthem style","subject":"a houseplant I keep forgetting to water","mood":"peaceful","strategy":"subject_vibe"},
"""[Verse]
Arise, o noble fern upon the sill
Through drought and dust you hold your tattered green
A nation of one pot, a stubborn will
The bravest little kingdom I have seen

[Chorus]
O hail the leaf that would not fall!
O hail the root that held the line!
Forgive the hand that fed you nothing
Stand, my country, one last time

[Verse]
No rain has come from this neglectful sky
Yet still you raise your banner to the light
Let history record you did not die
Though every reason told you that you might

[Chorus]
O hail the leaf that would not fall!
O hail the root that held the line!
Forgive the hand that fed you nothing
Stand, my country, one last time

[Outro]
(swelling) One last time — I'll fill the cup tonight"""),

(5,
 "I'm a guy trying to win his ex back (badly). Write me a outlaw country song about a mango.",
 {"genre":"outlaw country","subject":"a mango","persona":"a guy trying to win his ex back (badly)","occasion":"a protest march","strategy":"persona"},
"""[Verse]
I drove four hundred miles with a mango on the seat
'Cause you said once in Texas it was sweet
I know I shoulda brought you back your heart instead
But the grocery store was closer, so I grabbed this thing instead

[Chorus]
Baby take the mango, take it as a sign
I'm a fool in a pickup with a fruit and a line
I ain't got the words and I ain't got the cash
But I got this here mango and a full tank of gas

[Verse]
Your mama met me at the door and laughed
Said son, a mango ain't a way to win her back
But I peeled it on the porch and I made my little speech
And you watched me from the window, just barely out of reach

[Chorus]
Baby take the mango, take it as a sign
I'm a fool in a pickup with a fruit and a line
I ain't got the words and I ain't got the cash
But I got this here mango and a full tank of gas

[Outro]
It's bruised now, like my pride — but it's still kinda sweet"""),

(6,
 "a anxious reggae song about leaving a party early",
 {"genre":"reggae","subject":"leaving a party early","mood":"anxious","strategy":"subject_vibe"},
"""[Verse]
Ten o'clock and the room gettin' louder
I'm countin' every exit in my head
Everybody laughin' like it's easy
And I'm rehearsin' all the things I never said

[Chorus]
So I'm slippin' out the back, out the back
Before the panic catch me, I'm gone
Tell them I was tired, tell them I'll be fine
Walkin' home alone to my own song

[Verse]
They'll say did you see him? He just vanished
Like the smoke off the candle on the cake
But the quiet street is kinder than the kitchen
And my heart can finally slow down for my sake

[Chorus]
So I'm slippin' out the back, out the back
Before the panic catch me, I'm gone
Tell them I was tired, tell them I'll be fine
Walkin' home alone to my own song

[Outro]
Cool night air, irie now — I made it out alright"""),

(7,
 "As a 70-year-old looking back on their life, I want to sing a dancehall song about an old dog at the end of summer. Write it for me.",
 {"genre":"dancehall","subject":"an old dog at the end of summer","persona":"a 70-year-old looking back on their life","occasion":"a workout pump-up","strategy":"persona"},
"""[Intro]
Big up every dog that walk the long road with me!

[Verse]
Him grey 'round the muzzle now, slow on the stair
But him tail still a wave like him ain't got a care
Seventy summers I done count and spend
And the best ones him was there 'til the end

[Chorus]
So we move slow, we move sweet
Old dog, old man, same two feet
Sun goin' down but we nah done yet
Dance one more in the gold, no regret

[Verse]
Pickney all grown and the house gone quiet
But him meet me at the door like a riot
We don't run no more, we just sway
And that's plenty — that's plenty for a day

[Chorus]
So we move slow, we move sweet
Old dog, old man, same two feet
Sun goin' down but we nah done yet
Dance one more in the gold, no regret

[Outro]
One more, one more — good boy, good life"""),

(8,
 "write a J-pop song about running out of coffee on a Monday, told in first-person 'I'",
 {"genre":"J-pop","subject":"running out of coffee on a Monday","pov":"first person","strategy":"pov"},
"""[Verse]
I open up the jar and it's a desert in my hand
Empty Monday morning, this was never in the plan
The kettle's getting hot but I've got nothing left to brew
The whole week's at the door and I'm already coming through

[Pre-Chorus]
But maybe, maybe, it's a sign
To wake up on my own this time

[Chorus]
No coffee, no problem, I'll be bright!
Spinning through the gray into the light
My heart's the only thing I need to pour
Monday, here I come, I'm out the door!

[Verse]
The convenience store is glowing like a little paper star
I'll grab a can of something sweet, it isn't very far
The city's still half-sleeping but I'm humming as I go
Caffeine in my smile and not a single one to know

[Chorus]
No coffee, no problem, I'll be bright!
Spinning through the gray into the light
My heart's the only thing I need to pour
Monday, here I come, I'm out the door!

[Outro]
Ra-ta-ta, Monday — I forgive you after all"""),

(9,
 "give me a really anxious sea shanty track",
 {"genre":"sea shanty","mood":"anxious","strategy":"oneliner"},
"""[Verse]
Oh the glass is fallin' faster than my courage can hold
And the captain's gone quiet and the mate's gone cold
There's a green in the water that I never want to see
Heave away, boys, but the sea's heavin' me

[Chorus]
So pull, pull, pull though my hands are shakin' raw
Pull, pull, pull 'fore we meet the maw
I never signed for weather like the end of all days
Heave away, heave away, through the haze

[Verse]
The compass spins a circle like a thought I can't hold still
And the bell rings out for no one on the swell
I count the men at midnight and I count one less
Heave away, boys, into the mess

[Chorus]
So pull, pull, pull though my hands are shakin' raw
Pull, pull, pull 'fore we meet the maw
I never signed for weather like the end of all days
Heave away, heave away, through the haze

[Outro]
And if we make the harbor I will never sail again — heave away!"""),

(10,
 "a peaceful city pop song about a vending machine that only takes exact change",
 {"genre":"city pop","subject":"a vending machine that only takes exact change","mood":"peaceful","strategy":"subject_vibe"},
"""[Verse]
Underneath the overpass it hums a soft pink light
Faithful little robot keeping company with the night
It won't take my crumpled bills, it only wants it true
Exact change, exact heart, it asks the same of you

[Chorus]
So I count my coins beneath the neon glow
Nothing more and nothing less, that's all it needs to know
The city's wide and careless but this corner's keeping time
A perfect little kindness for a hundred yen and a dime

[Verse]
Salaryman at midnight gets his can of lukewarm tea
The machine just glows and gives it, asks no apology
There's a peace in something honest that just wants the proper sum
No interest and no judgment, only warm light when you come

[Chorus]
So I count my coins beneath the neon glow
Nothing more and nothing less, that's all it needs to know
The city's wide and careless but this corner's keeping time
A perfect little kindness for a hundred yen and a dime

[Outro]
Clink, clink, thank you — drive safe, says the light"""),
]

written = []
for idx, brief, meta, lyrics in SONGS:
    p = corpus_io.write_song(OD, ts, idx, brief, meta, lyrics, model=MODEL, engine="claude")
    written.append(p); print("wrote", os.path.basename(p))
st = bump_state(len(written), MODEL)
print(f"[seed] {len(written)} songs written; corpus total={st['total']}")
print("dir:", os.path.join(OD, ts.strftime('%Y-%m-%d')))
