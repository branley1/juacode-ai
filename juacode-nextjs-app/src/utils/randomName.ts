// src/utils/randomName.ts

const adjectives = [
    "Swift", "Curious", "Brave", "Silent", "Clever",
    "Witty", "Sly", "Nimble", "Fierce", "Zany",
    "Loyal", "Jolly", "Feisty", "Daring", "Snappy",
    "Gentle", "Bold", "Quirky", "Peppy", "Stealthy",
    "Grumpy", "Lucky", "Chatty", "Wacky", "Zesty",
    "Cosmic", "Rusty", "Chirpy", "Mellow", "Zippy",
    "Silly", "Crazy", "Dizzy", "Fuzzy", "Wacky",
    "Kooky", "Whimsical", "Zany", "Wacky", "Zesty",
  ];

const animals = [
    "Fox", "Eagle", "Panther", "Otter", "Penguin",
    "Tiger", "Lion", "Bear", "Wolf", "Rabbit",
    "Giraffe", "Elephant", "Zebra", "Kangaroo", "Panda",
    "Koala", "Penguin", "Dolphin", "Shark", "Whale",
    "Duck", "Goose", "Chicken", "Turkey", "Dove",
    "Raven", "Badger", "Hawk", "Cobra", "Chinchilla",
    "Lynx", "Ferret", "Beetle", "Wolf", "Turtle",
    "Cheetah", "Meerkat", "Walrus", "Sloth", "Mole",
    "Llama", "Parrot", "Shrimp", "Yak", "Frog",
    "Jackal", "Moose", "Weasel", "Crab", "Koala",
    "Pig", "Sheep", "Horse", "Cow", "Goat",
    "Duck", "Goose", "Chicken", "Turkey", "Dove",
    "Raven", "Badger", "Hawk", "Cobra", "Chinchilla",
    "Lynx", "Ferret", "Beetle", "Wolf", "Turtle",
    "Cheetah", "Meerkat", "Walrus", "Sloth", "Mole",
    "Llama", "Parrot", "Shrimp", "Yak", "Frog",
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (str.charCodeAt(i) + (hash << 5) - hash) | 0;
  }
  return Math.abs(hash);
}

export function getRandomUsername(userId: string): string {
  const h = hashString(userId);
  const adj = adjectives[h % adjectives.length];
  const noun = animals[Math.floor(h / adjectives.length) % animals.length];
  return `${adj}${noun}`;
}
