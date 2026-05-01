import { z } from "zod";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { collections, getNextId, nowIso } from "./queries/connection";

async function upsertUserMovie(userId: number, userType: "oauth" | "local", movieId: number) {
  const userMovies = await collections.userMovies();
  const existing = await userMovies.findOne({ userId, userType, movieId });
  if (existing) return existing;

  const id = await getNextId("user_movies");
  const doc = {
    id,
    userId,
    userType,
    movieId,
    liked: false,
    watched: false,
    wantToWatch: false,
    rating: 0,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await userMovies.insertOne(doc);
  return doc;
}

async function createActivity(params: {
  userId: number;
  userType: "oauth" | "local";
  userName: string;
  userAvatar?: string | null;
  action: string;
  movieId?: number;
  rating?: number;
}) {
  const activities = await collections.activities();
  const id = await getNextId("activities");
  await activities.insertOne({
    id,
    userId: params.userId,
    userType: params.userType,
    userName: params.userName,
    userAvatar: params.userAvatar || null,
    action: params.action,
    movieId: params.movieId,
    rating: params.rating,
    createdAt: nowIso(),
  });
}

export const interactionRouter = createRouter({
  getUserMovie: authedQuery
    .input(z.object({ movieId: z.number() }))
    .query(async ({ input, ctx }) => {
      return await (await collections.userMovies()).findOne({
        userId: ctx.user.id,
        userType: ctx.user.authType,
        movieId: input.movieId,
      });
    }),

  toggleLike: authedQuery
    .input(z.object({ movieId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const userMovies = await collections.userMovies();
      const row = await upsertUserMovie(ctx.user.id, ctx.user.authType, input.movieId);
      const liked = !Boolean(row.liked);

      await userMovies.updateOne({ id: row.id }, { $set: { liked, updatedAt: nowIso() } });
      if (liked) {
        await createActivity({
          userId: ctx.user.id,
          userType: ctx.user.authType,
          userName: ctx.user.name || "Anonymous",
          userAvatar: ctx.user.avatar,
          action: "liked",
          movieId: input.movieId,
        });
      }

      return { liked };
    }),

  toggleWatched: authedQuery
    .input(z.object({ movieId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const userMovies = await collections.userMovies();
      const row = await upsertUserMovie(ctx.user.id, ctx.user.authType, input.movieId);
      const watched = !Boolean(row.watched);

      await userMovies.updateOne({ id: row.id }, { $set: { watched, updatedAt: nowIso() } });
      if (watched) {
        await createActivity({
          userId: ctx.user.id,
          userType: ctx.user.authType,
          userName: ctx.user.name || "Anonymous",
          userAvatar: ctx.user.avatar,
          action: "watched",
          movieId: input.movieId,
        });
      }

      return { watched };
    }),

  toggleWantToWatch: authedQuery
    .input(z.object({ movieId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const userMovies = await collections.userMovies();
      const row = await upsertUserMovie(ctx.user.id, ctx.user.authType, input.movieId);
      const wantToWatch = !Boolean(row.wantToWatch);

      await userMovies.updateOne({ id: row.id }, { $set: { wantToWatch, updatedAt: nowIso() } });
      if (wantToWatch) {
        await createActivity({
          userId: ctx.user.id,
          userType: ctx.user.authType,
          userName: ctx.user.name || "Anonymous",
          userAvatar: ctx.user.avatar,
          action: "want_to_watch",
          movieId: input.movieId,
        });
      }

      return { wantToWatch };
    }),

  rate: authedQuery
    .input(z.object({ movieId: z.number(), rating: z.number().min(1).max(5) }))
    .mutation(async ({ input, ctx }) => {
      const userMovies = await collections.userMovies();
      const row = await upsertUserMovie(ctx.user.id, ctx.user.authType, input.movieId);
      await userMovies.updateOne(
        { id: row.id },
        { $set: { rating: input.rating, updatedAt: nowIso() } },
      );

      await createActivity({
        userId: ctx.user.id,
        userType: ctx.user.authType,
        userName: ctx.user.name || "Anonymous",
        userAvatar: ctx.user.avatar,
        action: "rated",
        movieId: input.movieId,
        rating: input.rating,
      });

      return { rating: input.rating };
    }),

  getMyMovies: authedQuery
    .input(z.object({ type: z.enum(["liked", "watched", "wantToWatch", "rated"]).default("liked") }))
    .query(async ({ input, ctx }) => {
      const userMovies = await collections.userMovies();
      const movies = await collections.movies();

      const filter: Record<string, unknown> = {
        userId: ctx.user.id,
        userType: ctx.user.authType,
      };
      if (input.type === "liked") filter.liked = true;
      if (input.type === "watched") filter.watched = true;
      if (input.type === "wantToWatch") filter.wantToWatch = true;
      if (input.type === "rated") filter.rating = { $gt: 0 };

      const rows = await userMovies.find(filter).sort({ updatedAt: -1 }).toArray();
      const movieIds = rows.map((row) => row.movieId as number);
      const movieDocs = movieIds.length ? await movies.find({ id: { $in: movieIds } }).toArray() : [];
      const movieMap = new Map(movieDocs.map((movie) => [movie.id, movie]));

      return rows.map((userMovie) => ({
        userMovie,
        movie: movieMap.get(userMovie.movieId as number) || null,
      }));
    }),

  getStats: publicQuery
    .input(z.object({ movieId: z.number() }))
    .query(async ({ input }) => {
      const userMovies = await collections.userMovies();
      const likes = await userMovies.countDocuments({ movieId: input.movieId, liked: true });
      const watches = await userMovies.countDocuments({ movieId: input.movieId, watched: true });
      const wants = await userMovies.countDocuments({ movieId: input.movieId, wantToWatch: true });

      const ratings = await userMovies
        .find({ movieId: input.movieId, rating: { $gt: 0 } })
        .project({ rating: 1, _id: 0 })
        .toArray();
      const avg = ratings.length
        ? ratings.reduce((sum, item) => sum + Number(item.rating || 0), 0) / ratings.length
        : 0;

      return {
        likes,
        watches,
        wantToWatch: wants,
        avgRating: avg.toFixed(1),
      };
    }),

  getMostLiked: publicQuery
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ input }) => {
      const userMovies = await collections.userMovies();
      const movies = await collections.movies();

      const grouped = await userMovies
        .aggregate<{ _id: number; count: number }>([
          { $match: { liked: true } },
          { $group: { _id: "$movieId", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: input.limit },
        ])
        .toArray();

      const ids = grouped.map((row) => row._id);
      const movieDocs = ids.length ? await movies.find({ id: { $in: ids } }).toArray() : [];
      const movieMap = new Map(movieDocs.map((movie) => [movie.id, movie]));

      return grouped.map((row) => ({
        movie: movieMap.get(row._id) || null,
        count: row.count,
      }));
    }),

  getMostWatched: publicQuery
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ input }) => {
      const userMovies = await collections.userMovies();
      const movies = await collections.movies();

      const grouped = await userMovies
        .aggregate<{ _id: number; count: number }>([
          { $match: { watched: true } },
          { $group: { _id: "$movieId", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: input.limit },
        ])
        .toArray();

      const ids = grouped.map((row) => row._id);
      const movieDocs = ids.length ? await movies.find({ id: { $in: ids } }).toArray() : [];
      const movieMap = new Map(movieDocs.map((movie) => [movie.id, movie]));

      return grouped.map((row) => ({
        movie: movieMap.get(row._id) || null,
        count: row.count,
      }));
    }),

  getRecommended: authedQuery
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ input, ctx }) => {
      const userMovies = await collections.userMovies();
      const movies = await collections.movies();

      const watched = await userMovies
        .find({ userId: ctx.user.id, userType: ctx.user.authType, watched: true })
        .project({ movieId: 1, _id: 0 })
        .toArray();
      const watchedIds = watched.map((row) => row.movieId as number);

      const filter: Record<string, unknown> = {};
      if (watchedIds.length > 0) {
        filter.id = { $nin: watchedIds };
      }

      const all = await movies.find(filter).toArray();
      return all
        .sort((a, b) => Number(b.popularity || 0) - Number(a.popularity || 0))
        .slice(0, input.limit);
    }),
});