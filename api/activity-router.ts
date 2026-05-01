import { z } from "zod";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { collections } from "./queries/connection";

async function withMovie(activityRows: Array<Record<string, unknown>>) {
  const movies = await collections.movies();
  const movieIds = activityRows
    .map((activity) => activity.movieId)
    .filter((movieId): movieId is number => typeof movieId === "number");
  const movieDocs = movieIds.length ? await movies.find({ id: { $in: movieIds } }).toArray() : [];
  const movieMap = new Map(movieDocs.map((movie) => [movie.id, movie]));

  return activityRows.map((activity) => ({
    ...activity,
    movie: typeof activity.movieId === "number" ? movieMap.get(activity.movieId) || null : null,
  }));
}

export const activityRouter = createRouter({
  getFeed: publicQuery
    .input(z.object({ limit: z.number().default(20), offset: z.number().default(0) }))
    .query(async ({ input }) => {
      const rows = await (await collections.activities())
        .find({})
        .sort({ createdAt: -1 })
        .skip(input.offset)
        .limit(input.limit)
        .toArray();

      return await withMovie(rows as Array<Record<string, unknown>>);
    }),

  getFollowingFeed: authedQuery
    .input(z.object({ limit: z.number().default(20), offset: z.number().default(0) }))
    .query(async ({ input, ctx }) => {
      const follows = await (await collections.follows())
        .find({ followerId: ctx.user.id, followerType: ctx.user.authType })
        .toArray();

      if (follows.length === 0) return [];

      const activityFilter = {
        $or: follows.map((follow) => ({
          userId: follow.followingId,
          userType: follow.followingType,
        })),
      };

      const rows = await (await collections.activities())
        .find(activityFilter)
        .sort({ createdAt: -1 })
        .skip(input.offset)
        .limit(input.limit)
        .toArray();

      return await withMovie(rows as Array<Record<string, unknown>>);
    }),

  getMyActivities: authedQuery
    .input(z.object({ limit: z.number().default(20), offset: z.number().default(0) }))
    .query(async ({ input, ctx }) => {
      const rows = await (await collections.activities())
        .find({ userId: ctx.user.id, userType: ctx.user.authType })
        .sort({ createdAt: -1 })
        .skip(input.offset)
        .limit(input.limit)
        .toArray();

      return await withMovie(rows as Array<Record<string, unknown>>);
    }),
});