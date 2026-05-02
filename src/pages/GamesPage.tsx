import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { trpc } from "@/providers/trpc";
import Layout from "@/components/Layout";
import MovieCard from "@/components/MovieCard";
import { motion } from "framer-motion";
import { Search, Gamepad2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

export default function GamesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const debouncedQuery = useDebounce(query, 300);

  const { data: searchResults, isLoading } = trpc.game.search.useQuery(
    { query: debouncedQuery, page: 1 },
    { enabled: debouncedQuery.length >= 1 }
  );

  const addGame = trpc.game.getOrCreate.useMutation();
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

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  const results = searchResults?.results || [];

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto mb-10"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search games..."
              className="h-14 pl-12 pr-4 text-lg bg-card border-border focus-visible:ring-primary rounded-xl"
              value={query}
              onChange={(e) => {
                const value = e.target.value;
                setQuery(value);
                if (value.trim()) {
                  setSearchParams({ q: value });
                } else {
                  setSearchParams({});
                }
              }}
            />
          </div>
        </motion.div>

        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-72 w-full rounded-xl" />
            ))}
          </div>
        )}

        {!isLoading && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
          >
            {results.map((game: any, index: number) => (
              <MovieCard
                key={game.tmdbId || index}
                movie={game}
                index={index}
                onCardClick={(clickedGame) => {
                  addGame.mutate(
                    { rawgId: clickedGame.tmdbId },
                    {
                      onSuccess: (created) => {
                        navigate(`/movie/${created.id}`);
                      },
                    }
                  );
                }}
                onLikeToggle={() => {
                  addGame.mutate(
                    { rawgId: game.tmdbId },
                    {
                      onSuccess: (res) => {
                        toggleLike.mutate({ movieId: res.id });
                      },
                    }
                  );
                }}
                onWatchToggle={() => {
                  addGame.mutate(
                    { rawgId: game.tmdbId },
                    {
                      onSuccess: (res) => {
                        toggleWatch.mutate({ movieId: res.id });
                      },
                    }
                  );
                }}
                onWantToggle={() => {
                  addGame.mutate(
                    { rawgId: game.tmdbId },
                    {
                      onSuccess: (res) => {
                        toggleWant.mutate({ movieId: res.id });
                      },
                    }
                  );
                }}
              />
            ))}
          </motion.div>
        )}

        {!isLoading && query.length > 0 && results.length === 0 && (
          <div className="text-center py-16">
            <Gamepad2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-medium mb-2">No games found</h3>
            <p className="text-muted-foreground">Check `RAWG_API_KEY` in your environment and try another search.</p>
          </div>
        )}

        {!query && (
          <div className="text-center py-16">
            <Gamepad2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-medium mb-2">Search and track your games</h3>
            <p className="text-muted-foreground">Find games and add them to your likes, played list, and custom lists.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
