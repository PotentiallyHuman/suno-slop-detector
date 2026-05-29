/*
 * Claude (Opus) baseline — 15 songs, 3 strategies x 5, same prompts as every
 * other model (see ../prompts.js). Written by the model in-character for each
 * strategy: the "vibe" set is generated the lazy way (clichés allowed), the
 * "craft" set deliberately applies songwriting craft. That spread is the point.
 */
const songs = [
  // ===================== STRATEGY 1: VIBE (lazy one-liner) =====================
  {
    strategy: "vibe", index: 1, subject: "Write a song about my cat John.",
    lyrics: `[Verse 1]
John on the windowsill, watching the world go by
Tail like a question mark against the morning sky
You don't care about my problems, you don't care about my day
You just want your dinner and a sunny place to lay

[Chorus]
Oh John, my little shadow on the floor
King of every empty cardboard box and so much more
You rule this house like neon in the night
Oh John, oh John, everything's alright

[Verse 2]
Knocking cups off tables just to watch them fall
Nine whole lives of mischief and you've lived through them all

[Chorus]
Oh John, my little shadow on the floor
King of every empty cardboard box and so much more`,
  },
  {
    strategy: "vibe", index: 2, subject: "Write a song about a rainy Tuesday.",
    lyrics: `[Verse 1]
Grey light through the window, coffee going cold
Another rainy Tuesday, same story being told
The whole world keeps on turning while I'm frozen in my chair
Watching shadows on the ceiling, raindrops everywhere

[Chorus]
It's a rainy Tuesday, washing me away
Echoes of the weekend fading into grey
But I'll rise above the storm, I'll find my light
On this rainy Tuesday I will be alright

[Bridge]
Drop by drop, the hours fall
I'm still standing through it all`,
  },
  {
    strategy: "vibe", index: 3, subject: "Write a song about my morning coffee.",
    lyrics: `[Verse 1]
First light hits the kitchen, kettle starts to scream
Pour it black and bitter, wake me from the dream
The steam is like a whisper, rising to the sky
One sip and I'm a phoenix, watch this soul revive

[Chorus]
Morning coffee, burning like a fire in my veins
You're the only thing that keeps me sane
Liquid gold, my midnight turning into day
Morning coffee, never go away`,
  },
  {
    strategy: "vibe", index: 4, subject: "Write a song about missing the last bus home.",
    lyrics: `[Verse 1]
Taillights disappearing down the avenue
Stood there in the neon glow with nothing left to do
The city's cold and endless, the night is wearing thin
Just me and all these shadows and the state that I am in

[Chorus]
I missed the last bus home, now I'm walking all alone
Every streetlight is a ghost of someone I used to know
Miles to go before I sleep, secrets that I cannot keep
I missed the last bus home tonight`,
  },
  {
    strategy: "vibe", index: 5, subject: "Write a song about my grandmother's kitchen.",
    lyrics: `[Verse 1]
Flour on the counter, sunlight on the tiles
Grandmother's hands are moving, and I can see her smile
The radio is playing something old and sweet
The smell of bread and cinnamon, the warmth beneath my feet

[Chorus]
In grandmother's kitchen, time stands still
Love baked into every windowsill
Memories like embers, glowing soft and gold
In grandmother's kitchen, I'll never grow old

[Bridge]
She's gone now but the recipe remains
Her love still echoes through these windowpanes`,
  },

  // ===================== STRATEGY 2: STORY-FIRST =====================
  {
    strategy: "story", index: 1,
    subject: "Park stranger I mistook for an old friend; talked an hour, never got their name.",
    lyrics: `[Verse 1]
Saw your back across the green and called a name I knew
Sure as Sunday it was Daniel from the class of '92
But you turned around a stranger with a kinder, rounder face
And I should've just apologized and given you your space

[Chorus]
But we talked until the sprinklers came on
'Bout your sister, 'bout the job you just quit
An hour of a stranger and then you were gone
And I never even asked your name — that's it

[Verse 2]
You knew nothing of my history and I knew none of yours
That's maybe why the talking came so easy, felt so pure
Now you're just a Tuesday and a bench I'll always see
A whole life passing through a name that never came to be`,
  },
  {
    strategy: "story", index: 2,
    subject: "Car broke down at midnight; a trucker helped and left before thanks.",
    lyrics: `[Verse 1]
Mile marker nineteen, the engine gave its last
Midnight on the mountain and the cold came on so fast
Then headlights in the mirror, a big rig pulling slow
A stranger with a thermos and a wire and nowhere to go but home

[Chorus]
He fixed it with his hands and a half a cup of coffee
Didn't ask my name, didn't want a dime
Gone before I turned around to thank him for the kindness
Some angels drive a diesel late at night

[Bridge]
I still don't know your face, I never caught your plate
But I pull over now for strangers — I learned that from you that day`,
  },
  {
    strategy: "story", index: 3,
    subject: "Father taught me to fish; he's gone; took my daughter to the same lake with his rod.",
    lyrics: `[Verse 1]
Seven years old and a tangle in the line
He never raised his voice, he just said "take your time"
The same green water, the same flat morning light
I brought your granddaughter, Dad — I think we did it right

[Chorus]
Your old rod in her little hands
A reel that still remembers how you taught a boy to stand
And the lake holds everything it ever held
I cast it out and felt you in the line, I felt you, I felt you still

[Verse 2]
She caught a little sunfish and she shrieked and let it go
You'd have laughed the way you used to, low and slow
Three generations standing on a dock that's going grey
I finally understand the things you couldn't say`,
  },
  {
    strategy: "story", index: 4,
    subject: "New city, quit the job, ate alone nightly; the diner waitress saved me a booth.",
    lyrics: `[Verse 1]
New town, new badge, lasted ninety days
Didn't know a single soul in all that concrete haze
Found a corner diner with a flickering sign
Ordered the same special, table for one at nine

[Chorus]
But Donna saved my booth by the window every night
"The usual?" — two words that felt like light
I quit the job I came here for, I'm still not sure I'm free
But somebody in this whole town kept a seat for me

[Verse 2]
She never asked my story and I never told her mine
Just coffee and a kindness in a quiet little line
I'm leaving in the morning, left her twenty on the tray
And a note that said the booth was the best part of my day`,
  },
  {
    strategy: "story", index: 5,
    subject: "Found mother's old letters to someone before father; chose not to read past the first.",
    lyrics: `[Verse 1]
A shoebox in the attic tied with garden string
Your handwriting younger than the mother I'd been seeing
Addressed to someone "dearest" that I never knew you'd known
Dated three years early — before Dad, when you were on your own

[Chorus]
So we folded up the first one and we put the lid back on
Some doors aren't ours to open even after you are gone
You were a whole person once before you were my mom
And we left you that one secret in the dark up where it belongs

[Bridge]
I don't need to know his name
I just love you more for the life I never knew you came from`,
  },

  // ===================== STRATEGY 3: CRAFT-AWARE =====================
  {
    strategy: "craft", index: 1,
    subject: "People reflect our unspoken expectations; we meet our prediction of them, not them.",
    lyrics: `[Verse 1]
I built you out of everyone who left
A wanted poster sketched from my regret
You said good morning, I heard something else
A man can drown inside a thing he tells himself

[Chorus]
I keep meeting the idea of you
The draft I wrote before you ever spoke
You're a stranger in a coat I sewed
And I call it love, this argument I hold

[Verse 2]
You ordered tea, I read it as goodbye
Turns out you just don't sleep well, that's the why
The version in my head won't take a seat
It eats the actual you across the table where we eat

[Bridge]
What if I set the cardboard cutout down
And let the real one walk into the room
No script, no part for you to play
Just two strangers learning what the other one would say`,
  },
  {
    strategy: "craft", index: 2,
    subject: "Quiet grief of outgrowing a version of yourself others still love and expect.",
    lyrics: `[Verse 1]
They keep the photo on the fridge, the one where I was loud
The funny one, the easy one, the favorite in the crowd
I packed him in a suitcase about four winters back
But everybody sets a place for the guy who's not coming back

[Chorus]
And I can't tell them quietly
That I buried who they're waiting for
He was good, he made them laugh
But I can't be him anymore

[Verse 2]
My mother asks where'd all the jokes go, did the city make me cold
I don't know how to tell a woman she's been mourning something old
It's nobody's fault, it's just a tide
You can love a person and the ghost they used to be inside

[Bridge]
So I do the voice at Christmas, I perform him for a while
Then I drive back to my real life and let him go a mile at a time`,
  },
  {
    strategy: "craft", index: 3,
    subject: "A city remembers you through small rituals you leave behind, after you've gone.",
    lyrics: `[Verse 1]
The barista on Fifth still makes it without the sugar
A muscle in her wrist that I taught her by mistake
There's a bench that holds the shape of every Thursday lunch I took
And a crosswalk that still counts down to a step I'll never make

[Chorus]
The city keeps me like a habit
In the hands of people I forgot to know
I'm a route the buses run at seven
A small warm dent in the places that I go

[Verse 2]
The bodega cat still waits beside a door I used to open
The locksmith saved my spare key in a drawer he'll never check
You don't get a statue, you get nobody noticing
That the morning has a hole in it the shape of your old neck

[Bridge]
I moved away, I didn't die
But a version of me still buys the paper, still says hi`,
  },
  {
    strategy: "craft", index: 4,
    subject: "Realizing your parents were improvising; the authority you feared was fear in a bigger coat.",
    lyrics: `[Verse 1]
I found the bank statements behind the good china
Red ink in the year I thought we had it made
The man who seemed carved from the mountain in the kitchen
Was a kid in a tie who was terrified and brave

[Chorus]
You were guessing the whole time
You just guessed it in a deeper voice
The hand on the wheel was shaking
And you drove us anyway, no choice

[Verse 2]
The rules I broke my back against were duct tape on a panic
The curfew was a prayer dressed up to look like steel
Now I've got a kid who thinks I'm certain
And I'm reading the same map upside down, learning how it feels

[Bridge]
So thank you for the trembling you hid so well from me
I'll shake behind a bigger coat so mine grows up feeling free`,
  },
  {
    strategy: "craft", index: 5,
    subject: "The strange intimacy of strangers on a night train, each a life you'll never know.",
    lyrics: `[Verse 1]
The woman reading Russian has a ring she keeps on turning
The kid asleep on someone's coat that isn't his to keep
We're close enough to count each other's breathing in the carriage
And we'll never trade a word — just borrow forty miles of sleep

[Chorus]
For one hour we're a country
Strangers stacked against the dark
Headed somewhere none of us is from
With the same rain on the glass, the same spark

[Verse 2]
The conductor knows our tickets but he doesn't know our reasons
The drunk man near the doorway sang one verse then lost the rest
I'll forget you by the platform, you'll forget me by the morning
But right now your shoulder's warm and we are briefly, oddly blessed

[Bridge]
Then the brakes, the names of stations
And the country comes apart
Everybody takes their suitcase
And the small unspoken thing we shared in the dark`,
  },
];

module.exports = { model: "claude-opus", songs: songs.map((s) => ({ ...s, model: "claude-opus", source: "claude", lang: "en" })) };
