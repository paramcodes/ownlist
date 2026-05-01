import { useState } from "react";
import { trpc } from "@/providers/trpc";
import Layout from "@/components/Layout";
import MovieCard from "@/components/MovieCard";
import { TrendingUp, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type TrendingType = "movie" | "series" | "anime";

export default function TrendingPage() {
  const [type, setType] = useState<TrendingType>("movie");

  const { data: trending, isLoading } = trpc.movie.trending.useQuery({ type, page: 1 });
  const { data: mostLiked, isLoading: likedLoading } = trpc.interaction.getMostLiked.useQuery({ limit: 10 });
  const { data: mostWatched, isLoading: watchedLoading } = trpc.interaction.getMostWatched.useQuery({ limit: 10 });

  const utils = trpc.useUtils();
  const toggleLike = trpc.interaction.toggleLike.useMutation({
    onSuccess: () => utils.invalidate(),
  });
  const toggleWatch = trpc.interaction.toggleWatched.useMutation({
    onSuccess: () => utils.invalidate(),
  });
  const toggleWant = trpc.interaction.toggleWantToWatch.useMutation({
    onSuccess: () => utils.invalidate(),
  });

  const typeButtons: { value: TrendingType; label: string }[] = [
    { value: "movie", label: "Movies" },
    { value: "series", label: "TV Series" },
    { value: "anime", label: "Anime" },
  ];

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Trending</h1>
          </div>
          <p className="text-muted-foreground">Discover what's popular right now</p>
        </div>

        <div className="flex gap-2 mb-6">
          {typeButtons.map((btn) => (
            <Button
              key={btn.value}
              variant={type === btn.value ? "default" : "outline"}
              size="sm"
              onClick={() => setType(btn.value)}
              className={type === btn.value ? "bg-primary" : ""}
            >
              {btn.label}
            </Button>
          ))}
        </div>

        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-4">Trending {type === "movie" ? "Movies" : type === "series" ? "TV Series" : "Anime"}</h2>
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-72 w-full rounded-xl" />
              ))}
            </div>
          ) : trending && trending.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {trending.map((movie: any, index: number) => (
                <MovieCard
                  key={movie.id || index}
                  movie={movie}
                  index={index}
                  onLikeToggle={() => toggleLike.mutate({ movieId: movie.id })}
                  onWatchToggle={() => toggleWatch.mutate({ movieId: movie.id })}
                  onWantToggle={() => toggleWant.mutate({ movieId: movie.id })}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Film className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground">No trending content found.</p>
            </div>
          )}
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-4">Most Liked</h2>
          {likedLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-72 w-full rounded-xl" />
              ))}
            </div>
          ) : mostLiked && mostLiked.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {mostLiked.map((item: any, index: number) => (
                <MovieCard
                  key={item.movie.id}
                  movie={item.movie}
                  index={index}
                  onLikeToggle={() => toggleLike.mutate({ movieId: item.movie.id })}
                  onWatchToggle={() => toggleWatch.mutate({ movieId: item.movie.id })}
                  onWantToggle={() => toggleWant.mutate({ movieId: item.movie.id })}
                />
              ))}
            </div>
          ) : null}
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-4">Most Watched</h2>
          {watchedLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-72 w-full rounded-xl" />
              ))}
            </div>
          ) : mostWatched && mostWatched.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {mostWatched.map((item: any, index: number) => (
                <MovieCard
                  key={item.movie.id}
                  movie={item.movie}
                  index={index}
                  onLikeToggle={() => toggleLike.mutate({ movieId: item.movie.id })}
                  onWatchToggle={() => toggleWatch.mutate({ movieId: item.movie.id })}
                  onWantToggle={() => toggleWant.mutate({ movieId: item.movie.id })}
                />
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </Layout>
  );
}
