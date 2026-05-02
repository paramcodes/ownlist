import { useParams, useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import Layout from "@/components/Layout";
import { motion } from "framer-motion";
import { Heart, Eye, Bookmark, Star, ArrowLeft, Plus, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function MovieDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const movieId = Number(id);
  const [showListsDialog, setShowListsDialog] = useState(false);

  const { data: movie, isLoading } = trpc.movie.getById.useQuery({ id: movieId });
  const { data: stats } = trpc.interaction.getStats.useQuery({ movieId });
  const { data: userMovie } = trpc.interaction.getUserMovie.useQuery(
    { movieId },
    { enabled: isAuthenticated }
  );
  const { data: myLists } = trpc.list.getMyLists.useQuery({}, {
    enabled: isAuthenticated && showListsDialog,
  });

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
  const rateMovie = trpc.interaction.rate.useMutation({
    onSuccess: () => utils.invalidate(),
  });
  const addToList = trpc.list.addItem.useMutation({
    onSuccess: () => {
      utils.invalidate();
      setShowListsDialog(false);
    },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </Layout>
    );
  }

  if (!movie) {
    return (
      <Layout>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 text-center">
          <Film className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
          <h2 className="text-xl font-bold mb-2">Movie not found</h2>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </Layout>
    );
  }

  const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "";
  const typeLabel = movie.type === "series" ? "TV Series" : movie.type === "anime" ? "Anime" : movie.type === "game" ? "Game" : "Movie";

  return (
    <Layout>
      <div className="relative">
        {movie.backdropPath && (
          <div className="absolute inset-0 h-80 sm:h-96 overflow-hidden">
            <img
              src={movie.backdropPath}
              alt=""
              className="h-full w-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          </div>
        )}

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-shrink-0 mx-auto sm:mx-0"
            >
              {movie.posterPath ? (
                <img
                  src={movie.posterPath}
                  alt={movie.title}
                  className="w-48 sm:w-64 rounded-xl shadow-2xl"
                />
              ) : (
                <div className="flex h-72 w-48 sm:w-64 items-center justify-center rounded-xl bg-card">
                  <Film className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex-1 min-w-0"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="rounded-md bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                  {typeLabel}
                </span>
                {year && <span className="text-sm text-muted-foreground">{year}</span>}
                {movie.voteAverage && Number(movie.voteAverage) > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-medium">{Number(movie.voteAverage).toFixed(1)}</span>
                  </div>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold mb-3">{movie.title}</h1>
              <p className="text-muted-foreground leading-relaxed mb-6">{movie.overview || "No overview available."}</p>

              {stats && (
                <div className="flex gap-6 mb-6 text-sm">
                  <div>
                    <span className="font-bold text-foreground">{stats.likes}</span>{" "}
                    <span className="text-muted-foreground">likes</span>
                  </div>
                  <div>
                    <span className="font-bold text-foreground">{stats.watches}</span>{" "}
                    <span className="text-muted-foreground">watched</span>
                  </div>
                  <div>
                    <span className="font-bold text-foreground">{stats.wantToWatch}</span>{" "}
                    <span className="text-muted-foreground">want to watch</span>
                  </div>
                  {Number(stats.avgRating) > 0 && (
                    <div>
                      <span className="font-bold text-foreground">{stats.avgRating}</span>{" "}
                      <span className="text-muted-foreground">avg rating</span>
                    </div>
                  )}
                </div>
              )}

              {isAuthenticated && (
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant={userMovie?.liked ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleLike.mutate({ movieId })}
                    className={userMovie?.liked ? "bg-primary" : ""}
                  >
                    <Heart className={`mr-2 h-4 w-4 ${userMovie?.liked ? "fill-current" : ""}`} />
                    {userMovie?.liked ? "Liked" : "Like"}
                  </Button>

                  <Button
                    variant={userMovie?.watched ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleWatch.mutate({ movieId })}
                    className={userMovie?.watched ? "bg-green-600 hover:bg-green-700" : ""}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    {userMovie?.watched ? "Watched" : "Mark Watched"}
                  </Button>

                  <Button
                    variant={userMovie?.wantToWatch ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleWant.mutate({ movieId })}
                    className={userMovie?.wantToWatch ? "bg-blue-600 hover:bg-blue-700" : ""}
                  >
                    <Bookmark className={`mr-2 h-4 w-4 ${userMovie?.wantToWatch ? "fill-current" : ""}`} />
                    {userMovie?.wantToWatch ? "Saved" : "Want to Watch"}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowListsDialog(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add to List
                  </Button>
                </div>
              )}

              {isAuthenticated && (
                <div className="mt-6">
                  <p className="text-sm font-medium mb-2">Your Rating</p>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => rateMovie.mutate({ movieId, rating: star })}
                        className="p-1 transition-colors"
                      >
                        <Star
                          className={`h-6 w-6 ${
                            (userMovie?.rating || 0) >= star
                              ? "fill-yellow-400 text-yellow-400"
                              : "text-muted-foreground hover:text-yellow-400"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      <Dialog open={showListsDialog} onOpenChange={setShowListsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to List</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            {myLists && myLists.length > 0 ? (
              myLists.map((list) => (
                <button
                  key={list.id}
                  onClick={() => addToList.mutate({ listId: list.id, movieId })}
                  className="flex items-center justify-between w-full p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors text-left"
                >
                  <div>
                    <p className="font-medium">{list.name}</p>
                    <p className="text-xs text-muted-foreground">{list.type}</p>
                  </div>
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </button>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">
                You don't have any lists yet. Create one from the Lists page.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
