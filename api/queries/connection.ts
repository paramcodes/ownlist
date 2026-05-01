import { MongoClient, Db } from "mongodb";
import { env } from "../lib/env";
import * as schema from "@db/schema";

let mongoClient: MongoClient;
let dbInstance: Db;

export async function getDb() {
  if (!dbInstance) {
    mongoClient = new MongoClient(env.databaseUrl);
    await mongoClient.connect();
    dbInstance = mongoClient.db("ownlist");
  }
  return dbInstance;
}

export async function getNextId(key: string): Promise<number> {
  const db = await getDb();
  const counters = db.collection<{ _id: string; seq: number }>("counters");
  const result = await counters.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" },
  );
  return result?.seq ?? 1;
}

export function nowIso() {
  return new Date().toISOString();
}

// Collection accessors for convenient access
export const collections = {
  async localUsers() {
    return (await getDb()).collection<schema.LocalUser>(schema.COLLECTIONS.localUsers);
  },
  async users() {
    return (await getDb()).collection<schema.User>(schema.COLLECTIONS.users);
  },
  async movies() {
    return (await getDb()).collection<schema.Movie>(schema.COLLECTIONS.movies);
  },
  async userMovies() {
    return (await getDb()).collection<schema.UserMovie>(schema.COLLECTIONS.userMovies);
  },
  async lists() {
    return (await getDb()).collection<schema.List>(schema.COLLECTIONS.lists);
  },
  async listItems() {
    return (await getDb()).collection<schema.ListItem>(schema.COLLECTIONS.listItems);
  },
  async follows() {
    return (await getDb()).collection<schema.Follow>(schema.COLLECTIONS.follows);
  },
  async activities() {
    return (await getDb()).collection<schema.Activity>(schema.COLLECTIONS.activities);
  },
};
