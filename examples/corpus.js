/*
 * Calibration corpus. `expect` is a rough target band, not a hard label —
 * used to sanity-check that the heuristic ranks slop above craft.
 *
 * NOTE: classic lyrics here are short public excerpts used purely as test
 * fixtures for scoring calibration (not redistributed as a product).
 */
module.exports = [
  {
    name: "Suno-typical 'Neon Horizon' (synthetic slop)",
    kind: "ai",
    expect: [70, 100],
    text: `[Verse 1]
Neon shadows on the wall, I'm chasing the horizon
Whispers in the wind, my heart is on fire
Burning like a wildfire, rising from the ashes
City lights and broken glass, electric in my veins

[Chorus]
We won't back down, we are the ones tonight
Dancing in the rain beneath the starlight
Shadows and echoes, fading into the night
Fire and desire, we're reaching for the light

[Verse 2]
Crimson velvet midnight, demons in my head
Shattered pieces of my soul, the things I never said
Frozen in time, a phantom in the cold
Whispering surrender as the story's told

[Bridge]
Echoes, echoes, calling out my name
Burning like a flame, nothing stays the same

[Chorus]
We won't back down, we are the ones tonight
Dancing in the rain beneath the starlight`,
  },
  {
    name: "Suno-typical 'Concrete Paradise' (synthetic slop)",
    kind: "ai",
    expect: [70, 100],
    text: `[Intro]
Ooh, ooh

[Verse 1]
Concrete jungle, neon paradise
Silhouette of midnight in your eyes
Cascading shadows, ethereal and cold
A tapestry of stories left untold

[Pre-Chorus]
And I rise, and I rise, from the ashes I will rise

[Chorus]
Like a phoenix in the storm, I'm burning bright
Chasing the horizon through the endless night
Whispers of forever, echoes of the light
We are infinite, we'll never lose this fight

[Outro]
Forever, forever, into the night`,
  },
  {
    name: "Plain human indie verse (low-cliché)",
    kind: "human",
    expect: [0, 35],
    text: `I left my coffee on the counter again
The radio's still playing that dumb commercial
You texted me a photo of your sister's dog
And I laughed so hard I forgot to be sad

We drove past the gas station where you worked in school
You said the slushie machine was always broken
I never told you that I kept the receipt
From the first time we got lunch and you paid`,
  },
  {
    name: "Classic craft lyric — specific imagery (Dylan-ish, synthetic)",
    kind: "human",
    expect: [0, 40],
    text: `The carnival packed up and left before the rain
A clown was counting nickels by the broken Ferris wheel
She wore her mother's coat two sizes much too big
And argued with the ticket man about a dollar bill

The preacher on the corner sold umbrellas in the sun
He said the flood was coming but his shoes were always dry
The kids threw rocks at pigeons on the courthouse lawn
And nobody remembered why the bank had closed`,
  },
  {
    name: "Real-ish pop with some staples (mixed)",
    kind: "mixed",
    expect: [25, 65],
    text: `Late night, driving with the windows down
Your hand on the radio, that old hometown sound
I don't know where we're going but I like it here
Your laugh and the streetlights making everything clear

We're not lost, we're just taking the long way
Tomorrow can wait, let's stay out till the day
I'll remember this summer, the smell of the rain
The way that you sang every word out of tune`,
  },
];
