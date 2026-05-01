import { z } from "zod";
import { createRouter, authedQuery, publicQuery } from "./middleware";
import { collections, getNextId, nowIso } from "./queries/connection";

const userTypeSchema = z.enum(["oauth", "local"]);

export const userRouter = createRouter({
  getProfile: publicQuery
    .input(z.object({ userId: z.number(), userType: userTypeSchema.default("oauth") }))
    .query(async ({ input }) => {
      const user = input.userType === "oauth"
        ? await (await collections.users()).findOne({ id: input.userId })
        : await (await collections.localUsers()).findOne({ id: input.userId });

      if (!user) return null;

      const userMovies = await collections.userMovies();
      const lists = await collections.lists();
      const follows = await collections.follows();

      const liked = await userMovies.countDocuments({
        userId: input.userId,
        userType: input.userType,
        liked: true,
      });
      const watched = await userMovies.countDocuments({
        userId: input.userId,
        userType: input.userType,
        watched: true,
      });
      const wantToWatch = await userMovies.countDocuments({
        userId: input.userId,
        userType: input.userType,
        wantToWatch: true,
      });
      const rated = await userMovies.countDocuments({
        userId: input.userId,
        userType: input.userType,
        rating: { $gt: 0 },
      });
      const listCount = await lists.countDocuments({ userId: input.userId, userType: input.userType });
      const followers = await follows.countDocuments({ followingId: input.userId, followingType: input.userType });
      const following = await follows.countDocuments({ followerId: input.userId, followerType: input.userType });

      return {
        user,
        stats: {
          liked,
          watched,
          wantToWatch,
          rated,
          lists: listCount,
          followers,
          following,
        },
      };
    }),

  updateProfile: authedQuery
    .input(
      z.object({
        name: z.string().min(1).max(255).optional(),
        bio: z.string().max(500).optional(),
        avatar: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const update: Record<string, unknown> = { updatedAt: nowIso() };
      if (input.name !== undefined) update.name = input.name;
      if (input.bio !== undefined) update.bio = input.bio;
      if (input.avatar !== undefined) update.avatar = input.avatar;

      if (ctx.user.authType === "oauth") {
        const users = await collections.users();
        await users.updateOne({ id: ctx.user.id }, { $set: update });
        return await users.findOne({ id: ctx.user.id });
      }

      const localUsers = await collections.localUsers();
      await localUsers.updateOne({ id: ctx.user.id }, { $set: update });
      return await localUsers.findOne({ id: ctx.user.id });
    }),

  follow: authedQuery
    .input(z.object({ targetUserId: z.number(), targetUserType: userTypeSchema.default("oauth") }))
    .mutation(async ({ input, ctx }) => {
      const follows = await collections.follows();
      const existing = await follows.findOne({
        followerId: ctx.user.id,
        followerType: ctx.user.authType,
        followingId: input.targetUserId,
        followingType: input.targetUserType,
      });

      if (existing) {
        await follows.deleteOne({ id: existing.id });
        return { following: false };
      }

      const followId = await getNextId("follows");
      await follows.insertOne({
        id: followId,
        followerId: ctx.user.id,
        followerType: ctx.user.authType,
        followingId: input.targetUserId,
        followingType: input.targetUserType,
        createdAt: nowIso(),
      });

      const target = input.targetUserType === "oauth"
        ? await (await collections.users()).findOne({ id: input.targetUserId })
        : await (await collections.localUsers()).findOne({ id: input.targetUserId });

      const activityId = await getNextId("activities");
      await (await collections.activities()).insertOne({
        id: activityId,
        userId: ctx.user.id,
        userType: ctx.user.authType,
        userName: ctx.user.name || "Anonymous",
        userAvatar: ctx.user.avatar,
        action: "followed",
        targetUserId: input.targetUserId,
        targetUserName: target?.name || "Someone",
        createdAt: nowIso(),
      });

      return { following: true };
    }),

  isFollowing: authedQuery
    .input(z.object({ targetUserId: z.number(), targetUserType: userTypeSchema.default("oauth") }))
    .query(async ({ input, ctx }) => {
      const existing = await (await collections.follows()).findOne({
        followerId: ctx.user.id,
        followerType: ctx.user.authType,
        followingId: input.targetUserId,
        followingType: input.targetUserType,
      });
      return Boolean(existing);
    }),

  searchUsers: publicQuery
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input }) => {
      const nameRegex = new RegExp(input.query, "i");
      const [oauthUsers, localUsers] = await Promise.all([
        (await collections.users()).find({ name: { $regex: nameRegex } }).limit(10).toArray(),
        (await collections.localUsers()).find({ name: { $regex: nameRegex } }).limit(10).toArray(),
      ]);
      return {
        oauth: oauthUsers,
        local: localUsers,
      };
    }),
});