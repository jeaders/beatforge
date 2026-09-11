import Dexie, { type Table } from "dexie";
import type { Project, AudioAsset, UserSettings } from "../types";

export class BeatForgeDB extends Dexie {
  projects!: Table<Project, string>;
  audioAssets!: Table<AudioAsset, string>;
  userSettings!: Table<UserSettings, string>;

  constructor() {
    super("BeatForgeDB");
    this.version(1).stores({
      projects: "id, name, updatedAt, createdAt",
      audioAssets: "id, name, createdAt",
      userSettings: "id",
    });
  }
}

export const db = new BeatForgeDB();
