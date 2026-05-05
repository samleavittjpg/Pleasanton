export type HairStyle = "short" | "spiky" | "bob" | "buzz";

export type SavedCharacter = {
  skinTone: string;
  shirtColor: string;
  hairColor: string;
  eyeColor: string;
  hairStyle: HairStyle;
  displayName: string;
};

export type UserRecord = {
  id: string;
  username: string;
  salt: string;
  hash: string;
  profile: SavedCharacter | null;
};

export type SessionRecord = {
  userId: string;
  expiresAt: number;
};
