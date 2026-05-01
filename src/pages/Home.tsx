import { Link } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import Layout from "@/components/Layout";
import MovieCard from "@/components/MovieCard";
import { motion } from "framer-motion";
import { TrendingUp, Heart, Eye, Sparkles, ChevronRight, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function SectionHeader({ icon: Icon, title, href }: { icon: any; title: string; href?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
      </div>
      {href && (
        <Link to={href} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
          See all <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function MovieRow({
  movies,
  isLoading,
  emptyMessage,
  interactions,
  onLike,
  onWatch,
  onWant,
}: {
  movies: any[];
  isLoading: boolean;
  emptyMessage: string;
  interactions?: Record<number, any>;
  onLike?: (id: number) => void;
  onWatch?: (id: number) => void;
  onWant?: (id: number) => void;
}) {
  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-48 flex-shrink-0 rounded-xl" />
        ))}
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Film className="h-12 w-12 mb-3 opacity-30" />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
      {movies.map((item, index) => {
        const movie = item.movie || item;
        const interaction = interactions?.[movie.id];
        return (
          <MovieCard
            key={movie.id}
            movie={movie}
            index={index}
            liked={interaction?.liked}
            watched={interaction?.watched}
            wantToWatch={interaction?.wantToWatch}
            rating={interaction?.rating}
            onLikeToggle={onLike}
            onWatchToggle={onWatch}
            onWantToggle={onWant}
          />
        );
      })}
    </div>
  );
}

export default function Home() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const { data: trending, isLoading: trendingLoading } = trpc.movie.trending.useQuery({ type: "movie", page: 1 });
  const { data: mostLiked, isLoading: likedLoading } = trpc.interaction.getMostLiked.useQuery({ limit: 10 });
  const { data: mostWatched, isLoading: watchedLoading } = trpc.interaction.getMostWatched.useQuery({ limit: 10 });
  const { data: recommended, isLoading: recLoading } = trpc.interaction.getRecommended.useQuery(
    { limit: 10 },
    { enabled: isAuthenticated }
  );

  const toggleLike = trpc.interaction.toggleLike.useMutation({
    onSuccess: () => utils.invalidate(),
  });
  const toggleWatch = trpc.interaction.toggleWatched.useMutation({
    onSuccess: () => utils.invalidate(),
  });
  const toggleWant = trpc.interaction.toggleWantToWatch.useMutation({
    onSuccess: () => utils.invalidate(),
  });

  const { data: myMovies } = trpc.interaction.getMyMovies.useQuery(
    { type: "liked" },
    { enabled: isAuthenticated }
  );

  const interactions = myMovies?.reduce((acc, item) => {
    acc[item.movie.id] = item.userMovie;
    return acc;
  }, {} as Record<number, any>);

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 space-y-10">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-background p-8 sm:p-12">
            <div className="relative z-10">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
                Track what you watch.
              </h1>
              <p className="text-muted-foreground max-w-lg mb-6">
                Discover movies, series, and anime. Create lists, share your favorites, and see what others are watching.
              </p>
              <div className="flex gap-3">
                <Button asChild className="bg-primary hover:bg-primary/90">
                  <Link to="/search">Start Exploring</Link>
                </Button>
                {!isAuthenticated && (
                  <Button variant="outline" asChild>
                    <Link to="/login">Sign In</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.section>

        <section>
          <SectionHeader icon={TrendingUp} title="Trending Now" href="/trending" />
          <MovieRow
            movies={trending || []}
            isLoading={trendingLoading}
            emptyMessage="No trending movies found"
            interactions={interactions}
            onLike={(id) => toggleLike.mutate({ movieId: id })}
            onWatch={(id) => toggleWatch.mutate({ movieId: id })}
            onWant={(id) => toggleWant.mutate({ movieId: id })}
          />
        </section>

        <section>
          <SectionHeader icon={Heart} title="Most Liked" href="/trending" />
          <MovieRow
            movies={mostLiked || []}
            isLoading={likedLoading}
            emptyMessage="No liked movies yet"
            interactions={interactions}
            onLike={(id) => toggleLike.mutate({ movieId: id })}
            onWatch={(id) => toggleWatch.mutate({ movieId: id })}
            onWant={(id) => toggleWant.mutate({ movieId: id })}
          />
        </section>

        <section>
          <SectionHeader icon={Eye} title="Most Watched" href="/trending" />
          <MovieRow
            movies={mostWatched || []}
            isLoading={watchedLoading}
            emptyMessage="No watched movies yet"
            interactions={interactions}
            onLike={(id) => toggleLike.mutate({ movieId: id })}
            onWatch={(id) => toggleWatch.mutate({ movieId: id })}
            onWant={(id) => toggleWant.mutate({ movieId: id })}
          />
        </section>

        {isAuthenticated && (
          <section>
            <SectionHeader icon={Sparkles} title="Recommended For You" />
            <MovieRow
              movies={recommended || []}
              isLoading={recLoading}
              emptyMessage="Watch more movies to get recommendations"
              interactions={interactions}
              onLike={(id) => toggleLike.mutate({ movieId: id })}
              onWatch={(id) => toggleWatch.mutate({ movieId: id })}
              onWant={(id) => toggleWant.mutate({ movieId: id })}
            />
          </section>
        )}

        <section>
          <SectionHeader icon={Eye} title="Activity Feed" />
          <ActivityFeed />
        </section>
      </div>
    </Layout>
  );
}

function ActivityFeed() {
  const { data: activities, isLoading } = trpc.activity.getFeed.useQuery({ limit: 10 });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No activity yet. Start liking and watching movies!
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity, index) => (
        <motion.div
          key={activity.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className="flex items-center gap-4 rounded-xl bg-card p-4 border border-border"
        >
          {activity.userAvatar ? (
            <img src={activity.userAvatar} alt="" className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary">
              <span className="text-sm font-medium">{activity.userName?.[0] || "?"}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              <span className="font-medium">{activity.userName || "Someone"}</span>{" "}
              <span className="text-muted-foreground">
                {activity.action === "liked" && "liked"}
                {activity.action === "watched" && "watched"}
                {activity.action === "want_to_watch" && "wants to watch"}
                {activity.action === "rated" && `rated ${activity.rating} stars`}
                {activity.action === "followed" && "started following"}
              </span>{" "}
              {activity.movie ? (
                <Link to={`/movie/${activity.movie.id}`} className="font-medium text-primary hover:underline">
                  {activity.movie.title}
                </Link>
              ) : activity.targetUserName ? (
                <span className="font-medium">{activity.targetUserName}</span>
              ) : null}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date(activity.createdAt).toLocaleDateString()}
            </p>
          </div>
          {activity.movie?.posterPath && (
            <img src={activity.movie.posterPath} alt="" className="h-14 w-10 rounded object-cover flex-shrink-0" />
          )}
        </motion.div>
      ))}
    </div>
  );
}
