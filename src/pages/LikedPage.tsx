import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import Layout from "@/components/Layout";
import MovieCard from "@/components/MovieCard";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router";
import { useEffect } from "react";

export default function LikedPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  const { data: likedMovies, isLoading } = trpc.interaction.getMyMovies.useQuery(
    { type: "liked" },
    { enabled: isAuthenticated }
  );

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

  if (!isAuthenticated) return null;

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Liked Movies</h1>
          </div>
          <p className="text-muted-foreground">All the movies you've liked</p>
        </div>

        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-72 w-full rounded-xl" />
            ))}
          </div>
        )}

        {!isLoading && likedMovies && likedMovies.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
          >
            {likedMovies.map((item: any, index: number) => (
              <MovieCard
                key={item.movie.id}
                movie={item.movie}
                index={index}
                liked={item.userMovie.liked}
                watched={item.userMovie.watched}
                wantToWatch={item.userMovie.wantToWatch}
                rating={item.userMovie.rating}
                onLikeToggle={() => toggleLike.mutate({ movieId: item.movie.id })}
                onWatchToggle={() => toggleWatch.mutate({ movieId: item.movie.id })}
                onWantToggle={() => toggleWant.mutate({ movieId: item.movie.id })}
              />
            ))}
          </motion.div>
        )}

        {!isLoading && (!likedMovies || likedMovies.length === 0) && (
          <div className="text-center py-16">
            <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-medium mb-2">No liked movies yet</h3>
            <p className="text-muted-foreground">Start exploring and like movies you enjoy.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
