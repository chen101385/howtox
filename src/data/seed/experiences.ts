/**
 * Seeded experiences.
 *
 * These are runtime business records, deliberately kept OUT of client config.
 * All ten are remote-only. Cover art and sample posters are locally generated
 * SVGs under /public/clients/experience-demo/assets — no third-party media.
 */

import { experienceId, hostId } from "@/domain/ids";
import { money } from "@/domain/money";
import type { Experience } from "@/domain/experience";
import { DEMO_TENANT } from "./hosts";

const asset = (name: string) => `/clients/experience-demo/assets/${name}`;

type Seed = Omit<Experience, "id" | "tenantId" | "createdAt"> & { key: string };

const SEEDS: Seed[] = [
  {
    key: "exp_ghost_stories",
    hostId: hostId("hst_lamplighter"),
    slug: "ghost-stories-by-lamplight",
    title: "Ghost Stories by Lamplight",
    tagline: "Regional folklore, told live — you choose which story gets told",
    description:
      "An hour of folklore and ghost stories drawn from real regional traditions. The audience votes on which thread to follow, asks questions mid-story, and decides how far into the dark we go. Nothing is pre-recorded and no two nights run the same way.",
    category: "storytelling",
    secondaryCategories: ["improv"],
    bookingModes: ["crowdshared", "private_group", "one_to_one"],
    deliveryModes: ["remote"],
    durationMinutes: 60,
    pricing: {
      perSeat: money(1800),
      privateGroup: money(12000),
      oneToOne: money(7500),
    },
    samples: [
      {
        id: "smp_ghost_1",
        kind: "image",
        title: "How a night usually opens",
        src: asset("sample-ghost.svg"),
        posterSrc: asset("sample-ghost.svg"),
        alt: "Illustrated lantern glowing in fog, the opening image of the storytelling session",
      },
    ],
    cover: {
      src: asset("cover-ghost.svg"),
      alt: "A lantern casting light through fog",
    },
    whatToExpect: [
      "You vote on which story is told",
      "Questions and interruptions are encouraged",
      "Camera optional — plenty of guests listen in the dark",
    ],
    minimumAge: 16,
    languages: ["English", "Portuguese"],
    intents: [
      "live_tonight",
      "interactive_performance",
      "join_a_small_crowd",
      "great_with_friends",
    ],
    status: "published",
  },

  {
    key: "exp_audience_stories",
    hostId: hostId("hst_marisol"),
    slug: "you-steer-the-story",
    title: "You Steer the Story",
    tagline: "A branching story built live from the audience's choices",
    description:
      "A story with no fixed script. At every fork the group decides what happens next, and the ending depends entirely on the choices made in the room. Expect arguments, bad decisions, and at least one moment where everyone regrets voting the way they did.",
    category: "storytelling",
    secondaryCategories: ["improv", "games"],
    bookingModes: ["crowdshared", "private_group"],
    deliveryModes: ["remote"],
    durationMinutes: 75,
    pricing: { perSeat: money(2200), privateGroup: money(14000) },
    samples: [
      {
        id: "smp_steer_1",
        kind: "image",
        title: "A branching map from a past session",
        src: asset("sample-steer.svg"),
        alt: "Illustration of a branching path diagram",
      },
    ],
    cover: {
      src: asset("cover-steer.svg"),
      alt: "A branching path splitting into many directions",
    },
    whatToExpect: [
      "Group votes decide every turn",
      "No two sessions end the same way",
      "Works well with people who like to argue",
    ],
    languages: ["English", "Spanish"],
    intents: ["great_with_friends", "join_a_small_crowd", "interactive_performance"],
    status: "published",
  },

  {
    key: "exp_crowdwork",
    hostId: hostId("hst_dev"),
    slug: "crowdwork-hour",
    title: "Crowdwork Hour",
    tagline: "Live comedy with no set — the room is the material",
    description:
      "No prepared bits. The whole hour is built out of conversation with whoever turns up: your job, your terrible commute, the thing you argued about this morning. Participation is invited but never forced.",
    category: "comedy",
    bookingModes: ["crowdshared", "private_group"],
    deliveryModes: ["remote"],
    durationMinutes: 60,
    pricing: { perSeat: money(1500), privateGroup: money(11000) },
    samples: [
      {
        id: "smp_crowd_1",
        kind: "image",
        title: "Clip: a typical opening exchange",
        src: asset("sample-crowdwork.svg"),
        alt: "Illustration of a microphone in front of an audience grid",
      },
    ],
    cover: {
      src: asset("cover-crowdwork.svg"),
      alt: "A microphone lit against a dark stage",
    },
    whatToExpect: [
      "You can stay muted and still enjoy it",
      "Volunteers get most of the attention",
      "Nothing is scripted",
    ],
    minimumAge: 18,
    languages: ["English"],
    intents: ["live_tonight", "interactive_performance", "join_a_small_crowd"],
    status: "published",
  },

  {
    key: "exp_magic_show",
    hostId: hostId("hst_cordelia"),
    slug: "impossible-things-up-close",
    title: "Impossible Things, Up Close",
    tagline: "Close-up magic designed for a camera, not a stage",
    description:
      "Card work and mentalism built specifically for video, where the camera is closer than any theatre seat. You'll be asked to shuffle, choose, and hold things up — the tricks depend on you.",
    category: "magic",
    bookingModes: ["one_to_one", "private_group", "crowdshared"],
    deliveryModes: ["remote"],
    durationMinutes: 45,
    pricing: {
      oneToOne: money(6500),
      privateGroup: money(13000),
      perSeat: money(2000),
    },
    samples: [
      {
        id: "smp_magic_1",
        kind: "image",
        title: "A trick that only works on camera",
        src: asset("sample-magic.svg"),
        alt: "Illustration of playing cards fanned out",
      },
    ],
    cover: {
      src: asset("cover-magic.svg"),
      alt: "Playing cards fanned against a dark background",
    },
    whatToExpect: [
      "Have a deck of cards nearby if you have one",
      "You participate directly in most effects",
      "Works on a phone screen",
    ],
    languages: ["English"],
    intents: ["interactive_performance", "one_to_one", "live_tonight"],
    status: "published",
  },

  {
    key: "exp_learn_magic",
    hostId: hostId("hst_cordelia"),
    slug: "learn-three-magic-tricks",
    title: "Learn Three Magic Tricks",
    tagline: "Leave able to actually fool someone",
    description:
      "A teaching session, not a performance. You'll learn three self-working tricks that need nothing but a normal deck, and practise each one on camera until it's clean. Suitable for complete beginners and for adults who want to impress a child.",
    category: "magic",
    secondaryCategories: ["craft"],
    bookingModes: ["one_to_one", "private_group"],
    deliveryModes: ["remote"],
    durationMinutes: 60,
    pricing: { oneToOne: money(7000), privateGroup: money(15000) },
    samples: [
      {
        id: "smp_learn_1",
        kind: "image",
        title: "The first trick you'll learn",
        src: asset("sample-learnmagic.svg"),
        alt: "Illustration of hands holding a deck of cards",
      },
    ],
    cover: {
      src: asset("cover-learnmagic.svg"),
      alt: "A single card held up in a spotlight",
    },
    whatToExpect: [
      "Bring a standard deck of cards",
      "You practise on camera and get corrections",
      "No prior sleight of hand needed",
    ],
    languages: ["English"],
    intents: ["learn_something_new", "one_to_one"],
    status: "published",
  },

  {
    key: "exp_song_requests",
    hostId: hostId("hst_ripley"),
    slug: "acoustic-and-song-requests",
    title: "Acoustic & Song Requests",
    tagline: "Tell me the song that means something to you",
    description:
      "An acoustic set shaped entirely by requests. Bring the song you played on repeat at seventeen, or the one from your wedding. If I don't know it, I'll work it out live and probably get the second verse wrong.",
    category: "music",
    bookingModes: ["one_to_one", "private_group", "crowdshared"],
    deliveryModes: ["remote"],
    durationMinutes: 50,
    pricing: {
      oneToOne: money(6000),
      privateGroup: money(12500),
      perSeat: money(1600),
    },
    samples: [
      {
        id: "smp_music_1",
        kind: "image",
        title: "A request from last week",
        src: asset("sample-music.svg"),
        alt: "Illustration of an acoustic guitar and a request list",
      },
    ],
    cover: {
      src: asset("cover-music.svg"),
      alt: "An acoustic guitar resting against a warm-lit wall",
    },
    whatToExpect: [
      "Send requests in advance or in the chat",
      "Stories behind the songs welcome",
      "Good background for a quiet evening",
    ],
    languages: ["English"],
    intents: ["live_tonight", "one_to_one", "interactive_performance"],
    status: "published",
  },

  {
    key: "exp_dj_basics",
    hostId: hostId("hst_halcyon"),
    slug: "your-first-hour-on-the-decks",
    title: "Your First Hour on the Decks",
    tagline: "Beatmatch two tracks by the end of the session",
    description:
      "A hands-on beginner DJ session. We'll cover tempo, phrasing and the mechanics of a transition, then you'll actually mix two tracks together. Works with free software — no equipment required.",
    category: "dj",
    secondaryCategories: ["music"],
    bookingModes: ["one_to_one", "private_group"],
    deliveryModes: ["remote"],
    durationMinutes: 75,
    pricing: { oneToOne: money(8000), privateGroup: money(16000) },
    samples: [
      {
        id: "smp_dj_1",
        kind: "image",
        title: "What your screen will look like",
        src: asset("sample-dj.svg"),
        alt: "Illustration of two waveforms being aligned",
      },
    ],
    cover: {
      src: asset("cover-dj.svg"),
      alt: "Two audio waveforms aligned above a mixer",
    },
    whatToExpect: [
      "Free software — no hardware needed",
      "You mix live and get real-time feedback",
      "Headphones strongly recommended",
    ],
    languages: ["English"],
    intents: ["learn_something_new", "one_to_one"],
    status: "published",
  },

  {
    key: "exp_cooking",
    hostId: hostId("hst_pep"),
    slug: "one-very-good-dish",
    title: "One Very Good Dish",
    tagline: "Cook it in your kitchen, eat it at the end",
    description:
      "We pick one dish and you actually cook it, start to finish, in your own kitchen while I talk you through every step. The ingredient list goes out ahead of time and is deliberately short.",
    category: "cooking",
    bookingModes: ["one_to_one", "private_group", "crowdshared"],
    deliveryModes: ["remote"],
    durationMinutes: 90,
    pricing: {
      oneToOne: money(7500),
      privateGroup: money(15500),
      perSeat: money(2400),
    },
    samples: [
      {
        id: "smp_cook_1",
        kind: "image",
        title: "Last month's dish",
        src: asset("sample-cooking.svg"),
        alt: "Illustration of a pan and fresh ingredients",
      },
    ],
    cover: {
      src: asset("cover-cooking.svg"),
      alt: "A pan and fresh ingredients on a wooden board",
    },
    whatToExpect: [
      "Ingredient list sent 48 hours ahead",
      "You cook along in real time",
      "Substitutions handled live",
    ],
    languages: ["English", "Italian"],
    intents: ["learn_something_new", "great_with_friends"],
    status: "published",
  },

  {
    key: "exp_improv",
    hostId: hostId("hst_bex"),
    slug: "improv-with-your-friends",
    title: "Improv With Your Friends",
    tagline: "Low stakes, high silliness — nobody has to be good at this",
    description:
      "Improv games designed for people who find improv terrifying. Everything is short, nothing requires a monologue, and the whole point is watching your friends make bad choices under mild pressure.",
    category: "improv",
    secondaryCategories: ["games", "comedy"],
    bookingModes: ["private_group", "crowdshared"],
    deliveryModes: ["remote"],
    durationMinutes: 60,
    pricing: { privateGroup: money(13500), perSeat: money(1900) },
    samples: [
      {
        id: "smp_improv_1",
        kind: "image",
        title: "One of the warm-up games",
        src: asset("sample-improv.svg"),
        alt: "Illustration of overlapping speech bubbles",
      },
    ],
    cover: {
      src: asset("cover-improv.svg"),
      alt: "Overlapping speech bubbles in bright colors",
    },
    whatToExpect: [
      "No experience required, genuinely",
      "Short games, nothing longer than a few minutes",
      "Best with 4–8 people who know each other",
    ],
    languages: ["English"],
    intents: ["great_with_friends", "join_a_small_crowd", "learn_something_new"],
    status: "published",
  },

  {
    key: "exp_trivia",
    hostId: hostId("hst_ono"),
    slug: "lateral-trivia-night",
    title: "Lateral Trivia Night",
    tagline: "Rounds you can win without knowing any facts",
    description:
      "Trivia built on lateral thinking rather than recall: connections, deductions, and questions where the answer is arguable. Teams form on the night, and arguing with your teammates is most of the fun.",
    category: "games",
    bookingModes: ["crowdshared", "private_group"],
    deliveryModes: ["remote"],
    durationMinutes: 60,
    pricing: { perSeat: money(1200), privateGroup: money(10000) },
    samples: [
      {
        id: "smp_trivia_1",
        kind: "image",
        title: "A sample connections round",
        src: asset("sample-trivia.svg"),
        alt: "Illustration of a grid of connected clues",
      },
    ],
    cover: {
      src: asset("cover-trivia.svg"),
      alt: "A grid of clues connected by lines",
    },
    whatToExpect: [
      "Teams are formed on the night",
      "Knowing lots of facts is not required",
      "Expect to argue about at least one answer",
    ],
    languages: ["English", "Japanese"],
    intents: [
      "live_tonight",
      "great_with_friends",
      "join_a_small_crowd",
      "under_price",
    ],
    status: "published",
  },
];

export const SEED_EXPERIENCES: Experience[] = SEEDS.map((seed, index) => {
  const { key, ...rest } = seed;
  return {
    ...rest,
    id: experienceId(key),
    tenantId: DEMO_TENANT,
    // Fixed timestamps keep seeds deterministic across builds.
    createdAt: new Date(Date.UTC(2025, 0, 1 + index)).toISOString(),
  };
});
