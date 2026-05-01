import { useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import Layout from "@/components/Layout";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Film, Tv, Globe, Lock, Trash2, Edit2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

type ListType = "movie" | "anime" | "series";

export default function ListsPage() {
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<ListType>("movie");
  const [view, setView] = useState<"my" | "public">("my");
  const [createOpen, setCreateOpen] = useState(false);
  const [editingList, setEditingList] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPublic, setEditPublic] = useState(false);

  const utils = trpc.useUtils();

  const { data: myLists, isLoading: myLoading } = trpc.list.getMyLists.useQuery(
    { type: activeTab },
    { enabled: isAuthenticated && view === "my" }
  );
  const { data: publicLists, isLoading: publicLoading } = trpc.list.getPublicLists.useQuery(
    { type: activeTab },
    { enabled: view === "public" }
  );

  const createList = trpc.list.create.useMutation({
    onSuccess: () => {
      utils.invalidate();
      setCreateOpen(false);
    },
  });

  const deleteList = trpc.list.deleteList.useMutation({
    onSuccess: () => utils.invalidate(),
  });

  const updateList = trpc.list.updateList.useMutation({
    onSuccess: () => {
      utils.invalidate();
      setEditingList(null);
    },
  });

  const lists = view === "my" ? myLists : publicLists;
  const isLoading = view === "my" ? myLoading : publicLoading;

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    createList.mutate({
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      type: activeTab,
      isPublic: formData.get("isPublic") === "on",
    });
  };

  const startEdit = (list: any) => {
    setEditingList(list.id);
    setEditName(list.name);
    setEditDesc(list.description || "");
    setEditPublic(list.isPublic);
  };

  const saveEdit = (id: number) => {
    updateList.mutate({
      id,
      name: editName,
      description: editDesc,
      isPublic: editPublic,
    });
  };

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">Lists</h1>
            <p className="text-muted-foreground">Organize your watchlist into collections</p>
          </div>
          <div className="flex gap-2">
            <div className="flex rounded-lg bg-secondary p-1">
              <button
                onClick={() => setView("my")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  view === "my" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                My Lists
              </button>
              <button
                onClick={() => setView("public")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  view === "public" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Public
              </button>
            </div>
            {isAuthenticated && view === "my" && (
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary hover:bg-primary/90">
                    <Plus className="mr-2 h-4 w-4" />
                    New List
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New List</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreate} className="space-y-4 mt-2">
                    <Input name="name" placeholder="List name" required />
                    <Textarea name="description" placeholder="Description (optional)" />
                    <div className="flex items-center gap-2">
                      <Switch name="isPublic" id="isPublic" />
                      <label htmlFor="isPublic" className="text-sm">Make public</label>
                    </div>
                    <Button type="submit" className="w-full" disabled={createList.isPending}>
                      {createList.isPending ? "Creating..." : "Create List"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ListType)} className="mb-6">
          <TabsList className="bg-secondary">
            <TabsTrigger value="movie" className="flex items-center gap-1.5">
              <Film className="h-3.5 w-3.5" />
              Movies
            </TabsTrigger>
            <TabsTrigger value="anime" className="flex items-center gap-1.5">
              <Tv className="h-3.5 w-3.5" />
              Anime
            </TabsTrigger>
            <TabsTrigger value="series" className="flex items-center gap-1.5">
              <Tv className="h-3.5 w-3.5" />
              Web Series
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-xl" />
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {!isLoading && lists && (
            <motion.div
              key={`${view}-${activeTab}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {lists.map((list, index) => (
                <motion.div
                  key={list.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative rounded-xl bg-card border border-border p-5 hover:border-primary/30 transition-colors"
                >
                  {editingList === list.id ? (
                    <div className="space-y-3">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="text-base font-semibold"
                      />
                      <Textarea
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        rows={2}
                      />
                      <div className="flex items-center gap-2">
                        <Switch checked={editPublic} onCheckedChange={setEditPublic} id={`edit-public-${list.id}`} />
                        <label htmlFor={`edit-public-${list.id}`} className="text-sm">Public</label>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveEdit(list.id)}>
                          <Check className="mr-1 h-3.5 w-3.5" />
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingList(null)}>
                          <X className="mr-1 h-3.5 w-3.5" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between mb-2">
                        <Link to={`/list/${list.id}`} className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold truncate group-hover:text-primary transition-colors">
                            {list.name}
                          </h3>
                        </Link>
                        <div className="flex items-center gap-1 ml-2">
                          {list.isPublic ? (
                            <Globe className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Lock className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      {list.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{list.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground capitalize">{list.type}</span>
                        {view === "my" && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => startEdit(list)}
                              className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm("Delete this list?")) {
                                  deleteList.mutate({ id: list.id });
                                }
                              }}
                              className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {!isLoading && (!lists || lists.length === 0) && (
          <div className="text-center py-16">
            <Film className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-medium mb-2">
              {view === "my" ? "No lists yet" : "No public lists"}
            </h3>
            <p className="text-muted-foreground">
              {view === "my"
                ? "Create your first list to organize your watchlist."
                : "No public lists available for this category."}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
