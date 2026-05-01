import { useState } from "react";
import { useParams } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import Layout from "@/components/Layout";
import MovieCard from "@/components/MovieCard";
import { motion } from "framer-motion";
import { User, Heart, Eye, Bookmark, Star, List, Users, Edit2, Check, X, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ProfilePage() {
  const { userId, userType } = useParams<{ userId?: string; userType?: string }>();
  const { user: currentUser, isAuthenticated } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");

  const targetUserId = userId ? Number(userId) : currentUser?.id;
  const targetUserType = (userType as "oauth" | "local") || currentUser?.authType || "oauth";
  const isOwnProfile = isAuthenticated && currentUser?.id === targetUserId && currentUser?.authType === targetUserType;

  const { data: profile, isLoading } = trpc.user.getProfile.useQuery(
    { userId: targetUserId!, userType: targetUserType },
    { enabled: !!targetUserId }
  );

  const { data: isFollowing } = trpc.user.isFollowing.useQuery(
    { targetUserId: targetUserId!, targetUserType },
    { enabled: isAuthenticated && !isOwnProfile && !!targetUserId }
  );

  const { data: likedMovies } = trpc.interaction.getMyMovies.useQuery(
    { type: "liked" },
    { enabled: isOwnProfile }
  );
  const { data: watchedMovies } = trpc.interaction.getMyMovies.useQuery(
    { type: "watched" },
    { enabled: isOwnProfile }
  );
  const { data: wantMovies } = trpc.interaction.getMyMovies.useQuery(
    { type: "wantToWatch" },
    { enabled: isOwnProfile }
  );

  const utils = trpc.useUtils();
  const updateProfile = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      utils.invalidate();
      setIsEditing(false);
    },
  });
  const follow = trpc.user.follow.useMutation({
    onSuccess: () => utils.invalidate(),
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
          <Skeleton className="h-48 w-full rounded-xl mb-8" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (!profile) {
    return (
      <Layout>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 text-center">
          <User className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
          <h2 className="text-xl font-bold mb-2">Profile not found</h2>
        </div>
      </Layout>
    );
  }

  const profileUser = profile.user;
  const stats = profile.stats;

  const startEdit = () => {
    setEditName(profileUser.name || "");
    setEditBio(profileUser.bio || "");
    setIsEditing(true);
  };

  const saveEdit = () => {
    updateProfile.mutate({ name: editName, bio: editBio });
  };

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="relative">
              {profileUser.avatar ? (
                <img
                  src={profileUser.avatar}
                  alt={profileUser.name || "User"}
                  className="h-24 w-24 rounded-full object-cover ring-4 ring-primary/20"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/20 text-primary ring-4 ring-primary/20">
                  <User className="h-10 w-10" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              {isEditing ? (
                <div className="space-y-3 max-w-md">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Name"
                  />
                  <Textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Bio"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEdit}>
                      <Check className="mr-1 h-4 w-4" />
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                      <X className="mr-1 h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-1">
                    <h1 className="text-2xl font-bold">{profileUser.name || "Anonymous"}</h1>
                    {isOwnProfile && (
                      <button
                        onClick={startEdit}
                        className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {profileUser.bio && <p className="text-muted-foreground mb-3">{profileUser.bio}</p>}
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <Heart className="h-4 w-4 text-primary" />
                      <span className="font-medium">{stats.liked}</span>
                      <span className="text-muted-foreground">liked</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4 text-green-500" />
                      <span className="font-medium">{stats.watched}</span>
                      <span className="text-muted-foreground">watched</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Bookmark className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">{stats.wantToWatch}</span>
                      <span className="text-muted-foreground">want to watch</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-400" />
                      <span className="font-medium">{stats.rated}</span>
                      <span className="text-muted-foreground">rated</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <List className="h-4 w-4 text-purple-500" />
                      <span className="font-medium">{stats.lists}</span>
                      <span className="text-muted-foreground">lists</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-orange-500" />
                      <span className="font-medium">{stats.followers}</span>
                      <span className="text-muted-foreground">followers</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-pink-500" />
                      <span className="font-medium">{stats.following}</span>
                      <span className="text-muted-foreground">following</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {!isOwnProfile && isAuthenticated && (
              <Button
                variant={isFollowing ? "outline" : "default"}
                onClick={() => follow.mutate({ targetUserId: targetUserId!, targetUserType })}
                className={isFollowing ? "" : "bg-primary hover:bg-primary/90"}
              >
                {isFollowing ? "Unfollow" : "Follow"}
              </Button>
            )}
          </div>
        </motion.div>

        {isOwnProfile ? (
          <Tabs defaultValue="liked" className="space-y-6">
            <TabsList className="bg-secondary">
              <TabsTrigger value="liked" className="flex items-center gap-1.5">
                <Heart className="h-3.5 w-3.5" />
                Liked
              </TabsTrigger>
              <TabsTrigger value="watched" className="flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" />
                Watched
              </TabsTrigger>
              <TabsTrigger value="want" className="flex items-center gap-1.5">
                <Bookmark className="h-3.5 w-3.5" />
                Want to Watch
              </TabsTrigger>
            </TabsList>

            <TabsContent value="liked">
              <MovieGrid movies={likedMovies?.map((m: any) => ({ ...m.movie, userMovie: m.userMovie })) || []} />
            </TabsContent>
            <TabsContent value="watched">
              <MovieGrid movies={watchedMovies?.map((m: any) => ({ ...m.movie, userMovie: m.userMovie })) || []} />
            </TabsContent>
            <TabsContent value="want">
              <MovieGrid movies={wantMovies?.map((m: any) => ({ ...m.movie, userMovie: m.userMovie })) || []} />
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <p>View this user's public lists from the Lists page.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

function MovieGrid({ movies }: { movies: any[] }) {
  if (movies.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Film className="h-12 w-12 mx-auto mb-3 opacity-30" />
        <p>No movies in this category yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {movies.map((item: any, index: number) => (
        <MovieCard
          key={item.id}
          movie={item}
          index={index}
          liked={item.userMovie?.liked}
          watched={item.userMovie?.watched}
          wantToWatch={item.userMovie?.wantToWatch}
          rating={item.userMovie?.rating}
          showActions={false}
        />
      ))}
    </div>
  );
}
