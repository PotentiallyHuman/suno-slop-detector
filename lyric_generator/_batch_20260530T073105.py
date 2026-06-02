#!/usr/bin/env python3
"""Hourly batch: 10 Claude-authored songs -> corpus."""
import datetime as dt, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import corpus_io
from save_batch import out_dir, bump_state

TS = "2026-05-30T07:31:05"
MODEL = "claude-opus-4-8"
ts = dt.datetime.fromisoformat(TS)
OD = out_dir()

SONGS = [
(1,
 "write a post-rock song where the chorus is just one word repeated",
 {"genre":"post-rock","constraint":"one-word chorus","strategy":"challenge"},
"""[Intro]
(clean guitar, a single delayed note repeating, building slow)

[Verse]
We drove until the road forgot its name
Until the radio was static and the fuel light came
You didn't say a word, you didn't have to speak
We'd been running on the same low hum for weeks

[Build]
(drums enter, the wall begins to rise)

[Chorus]
Stay.
Stay.
Stay.
Stay.

[Verse]
The dawn came up like something breaking open soft
A field of frost, a sky we'd never thought to want
And everything we couldn't fit inside a sentence
Just hung there in the cold like our own breath, like penance

[Build]
(everything swells — guitars stacking, cymbals washing)

[Chorus]
Stay.
Stay.
Stay.
Stay.

[Outro]
(the wall collapses into a single ringing note, then silence)"""),

(2,
 "can you do a national anthem style song about an old dog at the end of summer? make it manic",
 {"genre":"national anthem style","subject":"an old dog at the end of summer","mood":"manic","strategy":"subject_vibe"},
"""[Verse]
Arise! Arise! O grizzled hound of gold!
The summer's bleeding out and you are old, you're old!
But look — you're tearing 'cross the yard like you were three!
A glorious, deranged, undignified decree!

[Chorus]
Sing! For the dog who will not quit!
Sing! For the tail that's lost its wit!
He's chasing down the final fly of August in the sun
A nation rising, falling, panting — run, old soldier, run!

[Verse]
The leaves! They turn! He does not care a whit!
He's found a stick! It is the finest stick of it!
He brings it back, he drops it, he forgets it on the lawn
Then barks at his own shadow till the very break of dawn!

[Chorus]
Sing! For the dog who will not quit!
Sing! For the tail that's lost its wit!
He's chasing down the final fly of August in the sun
A nation rising, falling, panting — run, old soldier, run!

[Outro]
(triumphant, breathless) And he sleeps! At last he sleeps! Hail the king of summer's end!"""),

(3,
 "write a dream pop love song that's actually about the ocean at 3am the whole time",
 {"genre":"dream pop","subject":"the ocean at 3am","constraint":"extended metaphor","strategy":"challenge"},
"""[Verse]
(reverb-drenched, hazy, far away)
You only show me your true face in the dark
When the crowds have gone and the boardwalk's bare
You pull me close and you pull me under
And I don't even mind, I don't even care

[Chorus]
Oh my love, my endless blue
Three a.m. and it's only you
You take everything and you give it back as foam
You're the only arms that ever feel like home

[Verse]
You whisper things in a language made of salt
You leave little gifts of shell along my skin
And every time I think I've finally left you
The tide of you comes reaching for me again

[Chorus]
Oh my love, my endless blue
Three a.m. and it's only you
You take everything and you give it back as foam
You're the only arms that ever feel like home

[Outro]
(fading into wave sounds) ...come back... come back... come back..."""),

(4,
 "please make a song that build the whole song around one extremely catchy repeated hook — amapiano, about my hometown ten years later",
 {"genre":"amapiano","subject":"my hometown ten years later","constraint":"one repeated hook","strategy":"constraint"},
"""[Intro]
(log drum, soft piano, that signature amapiano shuffle)
Ten years, ten years, the streets still call my name...

[Hook]
I'm back, I'm back, but it's not the same, not the same
I'm back, I'm back, and it knows my name, knows my name
Ten years gone but the rhythm stayed
Ten years gone but the rhythm stayed

[Verse]
New paint on the wall where I carved my initials
Same auntie at the corner sellin' the same vetkoek
The taxi rank is louder and the church got bigger
But the dust on the road still settles where I look

[Hook]
I'm back, I'm back, but it's not the same, not the same
I'm back, I'm back, and it knows my name, knows my name
Ten years gone but the rhythm stayed
Ten years gone but the rhythm stayed

[Verse]
My friends got children, my heroes got grey
The field where we played is a mall now they say
But the second that log drum start to play
I'm seventeen again on a Saturday

[Hook]
I'm back, I'm back, but it's not the same, not the same
I'm back, I'm back, and it knows my name, knows my name
Ten years gone but the rhythm stayed
Ten years gone but the rhythm stayed

[Outro]
(piano fading) ...the rhythm stayed... the rhythm stayed..."""),

(5,
 "can you do a gospel song about learning to drive stick from my dad? make it celebratory",
 {"genre":"gospel","subject":"learning to drive stick from my dad","mood":"celebratory","strategy":"subject_vibe"},
"""[Verse]
(organ swells, a choir hums behind)
My daddy put me in that driver's seat
Said the clutch and the gas gotta learn to meet
I stalled it and I shook and I wanted to cry
But he laid his hand on my shoulder, said try, child, try

[Chorus]
Oh, glory! I found the bitin' point!
Glory! The whole car's rejoice!
First gear lurchin' but the spirit's movin' free
My daddy taught me faith with a manual transmission, hallelujah, can't you see!

[Verse]
Now the hill don't scare me and the stop sign's a friend
I can roll it and I catch it and I start again
Every time I shift I hear his gentle voice
Said the fallin' and the risin', child, that's the whole rejoice!

[Chorus]
Oh, glory! I found the bitin' point!
Glory! The whole car's rejoice!
First gear lurchin' but the spirit's movin' free
My daddy taught me faith with a manual transmission, hallelujah, can't you see!

[Outro]
(choir builds, clapping) Drive on! Drive on! He's ridin' right beside me, drive on!"""),

(6,
 'I want a pop punk song about winning and feeling nothing called "Midnight Weather", with proper Suno tags: [Verse] [Verse] [Chorus] [Verse] [Outro]',
 {"genre":"pop punk","subject":"winning and feeling nothing","structure":"[Verse] [Verse] [Chorus] [Verse] [Outro]","title":"Midnight Weather","strategy":"structural"},
"""[Verse]
Got the trophy in my hands and the crowd was going wild
Confetti in my hair and a manufactured smile
Everybody screaming like it's everything I need
But the second that I got it I just watched the moment bleed

[Verse]
Drove home with the window down and the radio up loud
Tried to feel the thing they feel when they're standing in a crowd
But the prize is in the backseat and it might as well be air
I won the whole damn everything and I just don't care

[Chorus]
It's midnight weather in my chest, gray and going nowhere
Won the race but lost the reason, screaming into thin air
Tell me why the top of the mountain feels exactly like the ground
I got everything I wanted and I can't be found

[Verse]
Maybe wanting was the engine, maybe chasing was the point
And the catching's just a cold room with a dislocated joint
So I'll find another finish line and run it just to run
'Cause the winning isn't living — it's the only thing I've done

[Outro]
(palm-muted, fading) Midnight weather... and the trophy gathers dust... midnight weather..."""),

(7,
 "a angry math rock song about the quiet after everyone leaves",
 {"genre":"math rock","subject":"the quiet after everyone leaves","mood":"angry","strategy":"subject_vibe"},
"""[Intro]
(angular tapped guitar in 7/8, stop-start, jittery)

[Verse]
Door slams — count the seconds till the silence floods in
Cups stacked, half-drunk, lipstick on the rim
You all came and ate my light and laughed and took the air
Now it's 1 a.m. and the quiet's a glare

[Chorus]
And I HATE how loud the nothing gets
I HATE the ticking clock, the cigarette
The party was a fever and the quiet is the ache
Every empty chair's a fault line, every silence is a quake

[Verse]
(time signature lurches, guitars stab)
Pick up — put down — there's nothing left to do
The echo of your goodbye is a screw turning through
I wanted you all gone and now I want you all back
The quiet isn't peace, it's the start of the attack

[Chorus]
And I HATE how loud the nothing gets
I HATE the ticking clock, the cigarette
The party was a fever and the quiet is the ache
Every empty chair's a fault line, every silence is a quake

[Outro]
(everything cuts to a single dry click track, then stops)"""),

(8,
 "i need a amapiano banger",
 {"genre":"amapiano","subject":None,"mood":"cathartic","strategy":"oneliner"},
"""[Intro]
(log drum drops, shaker, that midnight piano roll)
Wooo! Let it go tonight...

[Verse]
Been carryin' the week like a stone on my back
Phone full of nothing I wanted to unpack
But the bass just found the hole in my chest
And it's pourin' out the worst and it's pourin' in the best

[Pre-Chorus]
Hands to the sky, let the log drum decide
Everything I held too tight, I let it slide

[Chorus]
Phakama, phakama, rise up off the floor
Dance it till the heavy don't live here no more
Sweat and the bassline washin' me clean
Best kind of empty I ever been
(Wooo!)

[Verse]
Strangers become family on a crowded floor
Nobody's askin' what you came here for
The piano keep talkin' what my mouth couldn't say
And the night take the weight of the week away

[Chorus]
Phakama, phakama, rise up off the floor
Dance it till the heavy don't live here no more
Sweat and the bassline washin' me clean
Best kind of empty I ever been

[Outro]
(log drum echoing out) ...clean... clean... lighter than I came..."""),

(9,
 "write a black metal song where the verses are happy but the chorus is devastating",
 {"genre":"black metal","constraint":"tonal whiplash","strategy":"challenge"},
"""[Verse]
(bright, almost major-key tremolo, oddly cheerful)
What a lovely morning in the frostbitten pines!
The sun on the snow and the world feels fine!
A little fox is playing where the cold stream bends
And I think today might be the best of all my friends!

[Chorus]
(everything collapses — blastbeats, shrieking, total despair)
BUT THERE IS NOTHING. THERE WAS NEVER ANYTHING.
THE LIGHT IS A LIE THE DYING SUN IS SCREAMING.
EVERY ONE I LOVED IS ASH BENEATH THE SNOW.
AND I AM ALONE. I AM ALONE. I AM ALONE.

[Verse]
(brightness returns, cruelly)
Oh the icicles are sparkling like a chandelier!
I'll make a cup of something warm and hold it near!
The birds are coming back and they're singing in the cold!
What a beautiful day to be alive and growing old!

[Chorus]
BUT THERE IS NOTHING. THERE WAS NEVER ANYTHING.
THE LIGHT IS A LIE THE DYING SUN IS SCREAMING.
EVERY ONE I LOVED IS ASH BENEATH THE SNOW.
AND I AM ALONE. I AM ALONE. I AM ALONE.

[Outro]
(the bright guitar plays alone, then a single whispered) ...lovely... morning..."""),

(10,
 "1980s synth-pop vibes, song about a diner at 2am, full lyrics",
 {"genre":"1980s synth-pop","subject":"a diner at 2am","strategy":"era"},
"""[Verse]
(gated drums, neon bassline, glassy synth pads)
Two a.m. and the neon's buzzing pink
Coffee going cold while I sit here and I think
You're across the booth with your eyeliner run
Two lonely satellites and the night's not done

[Pre-Chorus]
And the jukebox plays a song we used to know
The waitress wipes the counter, got nowhere to go

[Chorus]
At the diner, at the diner at 2 a.m.
Where the broken-hearted gather and we start again
Under fluorescent angels and a sky of chrome
The all-night light is on, you're never quite alone
(At the diner... at 2 a.m.)

[Verse]
You light a cigarette that you swore you'd quit
And the smoke curls up like the ghost of it
We don't say forever, we don't say goodbye
Just the hum of the freezer and the orange-soda sky

[Chorus]
At the diner, at the diner at 2 a.m.
Where the broken-hearted gather and we start again
Under fluorescent angels and a sky of chrome
The all-night light is on, you're never quite alone

[Outro]
(synths fading into a long reverb) ...two a.m.... and the light stays on..."""),
]

written = []
for idx, brief, meta, lyrics in SONGS:
    p = corpus_io.write_song(OD, ts, idx, brief, meta, lyrics, model=MODEL, engine="claude")
    written.append(p); print("wrote", os.path.basename(p))
st = bump_state(len(written), MODEL)
print(f"[batch] {len(written)} written; corpus total={st['total']}")
