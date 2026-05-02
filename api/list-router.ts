import { z } from "zod";
import { createRouter, authedQuery, publicQuery } from "./middleware";
import { collections, getNextId, nowIso } from "./queries/connection";

const listType = z.enum(["movie", "anime", "series", "game"]);

export const listRouter = createRouter({
  create: authedQuery
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        type: listType.default("movie"),
        isPublic: z.boolean().default(false),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const lists = await collections.lists();
      const id = await getNextId("lists");
      const doc = {
        id,
        userId: ctx.user.id,
        userType: ctx.user.authType,
        name: input.name,
        description: input.description || "",
        type: input.type,
        isPublic: input.isPublic,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      await lists.insertOne(doc);
      return doc;
    }),

  getMyLists: authedQuery
    .input(z.object({ type: listType.optional() }))
    .query(async ({ input, ctx }) => {
      const lists = await collections.lists();
      const filter: Record<string, unknown> = {
        userId: ctx.user.id,
        userType: ctx.user.authType,
      };
      if (input.type) filter.type = input.type;
      return await lists.find(filter).sort({ createdAt: -1 }).toArray();
    }),

  getPublicLists: publicQuery
    .input(z.object({ type: listType.optional() }))
    .query(async ({ input }) => {
      const lists = await collections.lists();
      const filter: Record<string, unknown> = { isPublic: true };
      if (input.type) filter.type = input.type;
      return await lists.find(filter).sort({ createdAt: -1 }).toArray();
    }),

  getList: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const lists = await collections.lists();
      const list = await lists.findOne({ id: input.id });
      if (!list) return null;

      if (!list.isPublic) {
        if (!ctx.user || ctx.user.id !== list.userId || ctx.user.authType !== list.userType) {
          return null;
        }
      }

      const listItems = await collections.listItems();
      const movies = await collections.movies();
      const items = await listItems.find({ listId: input.id }).sort({ createdAt: -1 }).toArray();
      const movieIds = items.map((item) => item.movieId);
      const movieDocs = movieIds.length
        ? await movies.find({ id: { $in: movieIds as number[] } }).toArray()
        : [];
      const movieMap = new Map(movieDocs.map((movie) => [movie.id, movie]));

      return {
        list,
        items: items.map((item) => ({
          item,
          movie: movieMap.get(item.movieId as number) || null,
        })),
      };
    }),

  addItem: authedQuery
    .input(z.object({ listId: z.number(), movieId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const lists = await collections.lists();
      const list = await lists.findOne({ id: input.listId });
      if (!list) throw new Error("List not found");
      if (list.userId !== ctx.user.id || list.userType !== ctx.user.authType) {
        throw new Error("Unauthorized");
      }

      const listItems = await collections.listItems();
      const existing = await listItems.findOne({ listId: input.listId, movieId: input.movieId });
      if (existing) throw new Error("Movie already in list");

      const id = await getNextId("list_items");
      await listItems.insertOne({
        id,
        listId: input.listId,
        movieId: input.movieId,
        createdAt: nowIso(),
      });
      return { success: true };
    }),

  removeItem: authedQuery
    .input(z.object({ listId: z.number(), movieId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const lists = await collections.lists();
      const list = await lists.findOne({ id: input.listId });
      if (!list) throw new Error("List not found");
      if (list.userId !== ctx.user.id || list.userType !== ctx.user.authType) {
        throw new Error("Unauthorized");
      }

      const listItems = await collections.listItems();
      await listItems.deleteOne({ listId: input.listId, movieId: input.movieId });
      return { success: true };
    }),

  deleteList: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const lists = await collections.lists();
      const list = await lists.findOne({ id: input.id });
      if (!list) throw new Error("List not found");
      if (list.userId !== ctx.user.id || list.userType !== ctx.user.authType) {
        throw new Error("Unauthorized");
      }

      await (await collections.listItems()).deleteMany({ listId: input.id });
      await lists.deleteOne({ id: input.id });
      return { success: true };
    }),

  updateList: authedQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        isPublic: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const lists = await collections.lists();
      const list = await lists.findOne({ id: input.id });
      if (!list) throw new Error("List not found");
      if (list.userId !== ctx.user.id || list.userType !== ctx.user.authType) {
        throw new Error("Unauthorized");
      }

      const update: Record<string, unknown> = { updatedAt: nowIso() };
      if (input.name !== undefined) update.name = input.name;
      if (input.description !== undefined) update.description = input.description;
      if (input.isPublic !== undefined) update.isPublic = input.isPublic;

      await lists.updateOne({ id: input.id }, { $set: update });
      return await lists.findOne({ id: input.id });
    }),
});