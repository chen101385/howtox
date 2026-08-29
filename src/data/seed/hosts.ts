/**
 * Seeded hosts.
 *
 * Every host is pseudonymous: first name, first name + last initial, nickname, or
 * stage name. No seeded host publishes a legal surname.
 *
 * `SEED_USERS_PRIVATE` exists to exercise the private/public identity split —
 * the public profiles below are produced by `toPublicProfile()`, never by
 * spreading the private record. Tests assert that no private field escapes.
 */

import { hostId, tenantId, userId } from "@/domain/ids";
import {
  toPublicProfile,
  type HostProfile,
  type UserPrivate,
} from "@/domain/identity";

export const DEMO_TENANT = tenantId("experience-demo");

/** RESTRICTED seed data. Never rendered; used to prove the boundary holds. */
export const SEED_USERS_PRIVATE: UserPrivate[] = [
  {
    id: userId("usr_host_lamplighter"),
    tenantId: DEMO_TENANT,
    legalFirstName: "Tobias",
    legalLastName: "Ferreira",
    email: "tobias.private@example.invalid",
    phone: "+1 555 0100",
    payoutAccountRef: "pm_demo_0001",
    verification: { identity: "verified", provider: "demo-illustrative" },
    display: {
      displayName: "The Lamplighter",
      style: "stage_name",
      handle: "the-lamplighter",
    },
    createdAt: "2024-03-04T00:00:00.000Z",
  },
  {
    id: userId("usr_host_marisol"),
    tenantId: DEMO_TENANT,
    legalFirstName: "Marisol",
    legalLastName: "Iglesias",
    email: "marisol.private@example.invalid",
    verification: { identity: "verified", provider: "demo-illustrative" },
    display: { displayName: "Marisol", style: "first_name", handle: "marisol" },
    createdAt: "2024-05-19T00:00:00.000Z",
  },
  {
    id: userId("usr_host_dev"),
    tenantId: DEMO_TENANT,
    legalFirstName: "Dev",
    legalLastName: "Kulkarni",
    email: "dev.private@example.invalid",
    verification: { identity: "verified", provider: "demo-illustrative" },
    display: {
      displayName: "Dev K.",
      style: "first_name_last_initial",
      handle: "dev-k",
    },
    createdAt: "2023-11-02T00:00:00.000Z",
  },
  {
    id: userId("usr_host_cordelia"),
    tenantId: DEMO_TENANT,
    legalFirstName: "Cordelia",
    legalLastName: "Nwosu",
    email: "cordelia.private@example.invalid",
    verification: { identity: "pending" },
    display: {
      displayName: "Cordelia the Unlikely",
      style: "stage_name",
      handle: "cordelia-the-unlikely",
    },
    createdAt: "2024-08-11T00:00:00.000Z",
  },
  {
    id: userId("usr_host_ripley"),
    tenantId: DEMO_TENANT,
    legalFirstName: "Imogen",
    legalLastName: "Bartlett",
    email: "ripley.private@example.invalid",
    verification: { identity: "verified", provider: "demo-illustrative" },
    display: { displayName: "Ripley", style: "nickname", handle: "ripley" },
    createdAt: "2024-01-22T00:00:00.000Z",
  },
  {
    id: userId("usr_host_halcyon"),
    tenantId: DEMO_TENANT,
    legalFirstName: "Amara",
    legalLastName: "Osei",
    email: "halcyon.private@example.invalid",
    verification: { identity: "unverified" },
    display: {
      displayName: "DJ Halcyon",
      style: "stage_name",
      handle: "dj-halcyon",
    },
    createdAt: "2025-02-14T00:00:00.000Z",
  },
  {
    id: userId("usr_host_pep"),
    tenantId: DEMO_TENANT,
    legalFirstName: "Giuseppina",
    legalLastName: "Rossi",
    email: "pep.private@example.invalid",
    verification: { identity: "verified", provider: "demo-illustrative" },
    display: { displayName: "Nonna Pep", style: "nickname", handle: "nonna-pep" },
    createdAt: "2023-09-30T00:00:00.000Z",
  },
  {
    id: userId("usr_host_bex"),
    tenantId: DEMO_TENANT,
    legalFirstName: "Bex",
    legalLastName: "Aldridge",
    email: "bex.private@example.invalid",
    verification: { identity: "verified", provider: "demo-illustrative" },
    display: { displayName: "Bex", style: "first_name", handle: "bex" },
    createdAt: "2024-06-07T00:00:00.000Z",
  },
  {
    id: userId("usr_host_ono"),
    tenantId: DEMO_TENANT,
    legalFirstName: "Ono",
    legalLastName: "Takahashi",
    email: "ono.private@example.invalid",
    verification: { identity: "verified", provider: "demo-illustrative" },
    display: {
      displayName: "Quizmaster Ono",
      style: "stage_name",
      handle: "quizmaster-ono",
    },
    createdAt: "2024-04-18T00:00:00.000Z",
  },
];

const byUserId = (id: string) => {
  const user = SEED_USERS_PRIVATE.find((u) => u.id === id);
  if (!user) throw new Error(`Seed user "${id}" not found`);
  return user;
};

type HostSeed = {
  hostKey: string;
  userKey: string;
  headline: string;
  bio: string;
  languages: string[];
  categories: string[];
  region: string;
  trust: HostProfile["trust"];
};

const HOST_SEEDS: HostSeed[] = [
  {
    hostKey: "hst_lamplighter",
    userKey: "usr_host_lamplighter",
    headline: "Folklore and ghost stories, told live in the dark",
    bio: "Twelve years of telling stories to rooms that go very quiet. I work from regional folklore and let the audience decide which path the night takes.",
    languages: ["English", "Portuguese"],
    categories: ["storytelling"],
    region: "Pacific Time",
    trust: {
      identityVerified: true,
      sessionsHosted: 412,
      averageRating: 4.9,
      reviewCount: 268,
      onTimeRate: 99,
      respondsWithin: "under an hour",
    },
  },
  {
    hostKey: "hst_marisol",
    userKey: "usr_host_marisol",
    headline: "Choose-your-own stories where the audience steers",
    bio: "I build branching stories on the fly. You vote, argue, and occasionally sabotage each other; I keep the thread from snapping.",
    languages: ["English", "Spanish"],
    categories: ["storytelling", "improv"],
    region: "Eastern Time",
    trust: {
      identityVerified: true,
      sessionsHosted: 156,
      averageRating: 4.8,
      reviewCount: 97,
      onTimeRate: 97,
      respondsWithin: "a few hours",
    },
  },
  {
    hostKey: "hst_dev",
    userKey: "usr_host_dev",
    headline: "Crowdwork comedy — no set, just the room",
    bio: "I don't do bits. I talk to whoever turns up and find the funny in it. Best with a small crowd that's willing to answer a question.",
    languages: ["English"],
    categories: ["comedy"],
    region: "Central Time",
    trust: {
      identityVerified: true,
      sessionsHosted: 289,
      averageRating: 4.7,
      reviewCount: 203,
      onTimeRate: 96,
      respondsWithin: "under an hour",
    },
  },
  {
    hostKey: "hst_cordelia",
    userKey: "usr_host_cordelia",
    headline: "Close-up magic that works through a camera",
    bio: "Card work, mentalism, and a few things I still can't explain. Everything is built for a screen, so nothing depends on you sitting in the front row.",
    languages: ["English"],
    categories: ["magic"],
    region: "Mountain Time",
    trust: {
      identityVerified: false,
      sessionsHosted: 64,
      averageRating: 4.9,
      reviewCount: 41,
      onTimeRate: 98,
      respondsWithin: "a few hours",
    },
  },
  {
    hostKey: "hst_ripley",
    userKey: "usr_host_ripley",
    headline: "Acoustic sets and whatever you want to hear",
    bio: "Guitar, a small stack of covers, and an open request list. Tell me the song that means something to you and I'll figure it out live.",
    languages: ["English"],
    categories: ["music"],
    region: "Pacific Time",
    trust: {
      identityVerified: true,
      sessionsHosted: 331,
      averageRating: 4.9,
      reviewCount: 245,
      onTimeRate: 99,
      respondsWithin: "under an hour",
    },
  },
  {
    hostKey: "hst_halcyon",
    userKey: "usr_host_halcyon",
    headline: "Your first hour behind the decks",
    bio: "I teach beatmatching to people who have never touched a mixer. You'll leave having actually mixed two tracks together.",
    languages: ["English"],
    categories: ["dj"],
    region: "Eastern Time",
    trust: {
      identityVerified: false,
      sessionsHosted: 28,
      averageRating: 4.6,
      reviewCount: 19,
      onTimeRate: 93,
      respondsWithin: "a day",
    },
  },
  {
    hostKey: "hst_pep",
    userKey: "usr_host_pep",
    headline: "Cook one very good thing, start to finish",
    bio: "No sixteen-ingredient recipes. We pick one dish, you cook it in your own kitchen while I talk you through it, and you eat it at the end.",
    languages: ["English", "Italian"],
    categories: ["cooking"],
    region: "Eastern Time",
    trust: {
      identityVerified: true,
      sessionsHosted: 502,
      averageRating: 4.9,
      reviewCount: 388,
      onTimeRate: 98,
      respondsWithin: "a few hours",
    },
  },
  {
    hostKey: "hst_bex",
    userKey: "usr_host_bex",
    headline: "Improv games for people who are scared of improv",
    bio: "Low stakes, high silliness. Designed for a group of friends who want to laugh at each other for an hour without anyone having to be good at it.",
    languages: ["English"],
    categories: ["improv", "games"],
    region: "Pacific Time",
    trust: {
      identityVerified: true,
      sessionsHosted: 187,
      averageRating: 4.8,
      reviewCount: 134,
      onTimeRate: 97,
      respondsWithin: "under an hour",
    },
  },
  {
    hostKey: "hst_ono",
    userKey: "usr_host_ono",
    headline: "Trivia that isn't just recall",
    bio: "Rounds built on lateral thinking and arguing with your teammates. Works whether you know a lot of facts or none at all.",
    languages: ["English", "Japanese"],
    categories: ["games"],
    region: "Pacific Time",
    trust: {
      identityVerified: true,
      sessionsHosted: 221,
      averageRating: 4.8,
      reviewCount: 171,
      onTimeRate: 99,
      respondsWithin: "a few hours",
    },
  },
];

export const SEED_HOSTS: HostProfile[] = HOST_SEEDS.map((seed) => {
  const user = byUserId(seed.userKey);
  return {
    id: hostId(seed.hostKey),
    userId: user.id,
    tenantId: DEMO_TENANT,
    // Built through the sanctioned serializer — never by spreading `user`.
    public: toPublicProfile(user),
    headline: seed.headline,
    bio: seed.bio,
    approximateRegion: seed.region,
    languages: seed.languages,
    trust: seed.trust,
    categories: seed.categories,
  };
});

export function seedHostByKey(key: string): HostProfile {
  const host = SEED_HOSTS.find((h) => h.id === key);
  if (!host) throw new Error(`Seed host "${key}" not found`);
  return host;
}
