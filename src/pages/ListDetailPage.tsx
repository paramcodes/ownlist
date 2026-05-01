import { useParams, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import Layout from "@/components/Layout";
import MovieCard from "@/components/MovieCard";
import { motion } from "framer-motion";
import { ArrowLeft, Film, Globe, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function ListDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const listId = Number(id);

  const { data, isLoading } = trpc.list.getList.useQuery({ id: listId });

  if (isLoading) {
    return (
      <Layout>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
          <Skeleton className="h-32 w-full rounded-xl mb-6" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 text-center">
          <Film className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
          <h2 className="text-xl font-bold mb-2">List not found</h2>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </Layout>
    );
  }

  const { list, items } = data;

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-4 -ml-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold">{list.name}</h1>
            {list.isPublic ? (
              <Globe className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Lock className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          {list.description && <p className="text-muted-foreground">{list.description}</p>}
          <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
            <span className="capitalize">{list.type}</span>
            <span>·</span>
            <span>{items.length} {items.length === 1 ? "item" : "items"}</span>
          </div>
        </motion.div>

        {items.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {items.map((item: any, index: number) => (
              <MovieCard
                key={item.item.id}
                movie={item.movie}
                index={index}
                showActions={false}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Film className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-medium">This list is empty</h3>
            <p className="text-muted-foreground">Add movies from the search page.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
