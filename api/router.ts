import { localAuthRouter } from "./local-auth-router";
import { movieRouter } from "./movie-router";
import { interactionRouter } from "./interaction-router";
import { listRouter } from "./list-router";
import { userRouter } from "./user-router";
import { activityRouter } from "./activity-router";
import { gameRouter } from "./game-router";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  localAuth: localAuthRouter,
  movie: movieRouter,
  game: gameRouter,
  interaction: interactionRouter,
  list: listRouter,
  user: userRouter,
  activity: activityRouter,
});

export type AppRouter = typeof appRouter;
