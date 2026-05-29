/*
 * Human negative-class anchors for the baseline classifier.
 * SEED set — deliberately concrete, irregular, idiosyncratic lyrics (the
 * opposite of AI texture). Grow this with REAL human lyrics for a sharper
 * boundary; the classifier improves automatically when you rebuild.
 * (Synthetic stand-ins written to be stylistically human, not AI.)
 */
module.exports = [
  {
    name: "human: laundromat",
    text: `The dryer on the end eats quarters and won't spin
There's a kid asleep in a cart of someone's whites
I'm folding work shirts I'll be sweating through by Monday
Reading the same flyer for a band that broke up in July

The woman by the window does the crossword in pen
Seven across is "regret" and she fills it in like she's sure
We don't talk, we just wait for the cycles to finish
Two strangers and the smell of somebody else's clean`,
  },
  {
    name: "human: brother's truck",
    text: `You still owe me forty bucks from the move in 2009
I bring it up at every wedding just to watch you roll your eyes
Dad's truck is in your driveway with the dent we never fixed
The one from when you taught me stick and I took out the mailbox

We don't say the heavy stuff, we talk about the Chargers
We let the silences do most of the talking on the porch
You're a worse cook than our mother and you know it
But I'd drive eleven hours for that terrible pot roast`,
  },
  {
    name: "human: night shift nurse",
    text: `Room 412 keeps asking for a man who passed in spring
I tell him Walt's just parking, he'll be up in a bit
It's a lie but it's a kind one and it settles him to sleep
The monitors are the only choir in the hall tonight

I eat my lunch at 3 a.m. from a vending machine
There's a baby being born two floors above this grief
I'll go home when the city's making coffee
And I won't remember half the names I held this week`,
  },
  {
    name: "human: failed garden",
    text: `Killed the basil, killed the mint, the tomatoes never came
The squirrels took the one strawberry like they paid for it
My neighbor's got a jungle and she waters it with nothing
Just spite and a watering can and a hat that's seen some years

I bought the little gloves, I bought the book, I bought the dream
Of a man who grows his dinner in a ten-foot square of dirt
Now I've got a graveyard and a very smug raccoon
And a standing reservation at the corner store for greens`,
  },
  {
    name: "human: high school reunion",
    text: `Brad still thinks he's quarterback, he brought the old yearbook
Stacy married money, lost the money, kept the laugh
There's a table for the ones who didn't make it
And it's bigger than the table where we sat at seventeen

I drove four hours to a gym that smells the same
To find out I'm a stranger in the town that made me me
We don't fit the lockers anymore, we never did
I'm leaving before midnight and I'm taking the back streets home`,
  },
  {
    name: "human: dad's voicemail",
    text: `I haven't deleted the voicemail where you tell me about the storm
"Bring a coat, they're saying snow" — that's the whole entire thing
I play it when the carrier threatens to erase it
Just to keep your worry living somewhere I can reach

You weren't a poet, you were a man who checked the weather
And called your grown son like he couldn't dress himself
Now I check the forecast every morning out of habit
And I bring a coat I don't need just to feel you give a damn`,
  },
  {
    name: "human: diner 2am",
    text: `The cook's got a transistor radio taped to the hood
Playing a game that ended hours ago in extra innings
My eggs come with a side of "honey, you alright?"
From a waitress whose feet have walked to Tulsa and back tonight

There's a cop and a drunk in the same booth somehow laughing
The pie is yesterday's but the coffee never quits
I'm not hungry, I'm just not ready to go home yet
And this counter doesn't ask me to explain it`,
  },
  {
    name: "human: moving out",
    text: `Found a sock behind the radiator, found a rent check from a year ago
Found the height marks on the doorframe where the kids grew up in pencil
The new people seem nice, they don't know about the leak
Or which stair to skip or how the back door sticks in summer

I'm leaving the swing set, it never really moved
I'm taking the doorframe, no — I'm taking a photo of the doorframe
A house is just a box until it isn't
And then it's the only box that ever held you right`,
  },
];
