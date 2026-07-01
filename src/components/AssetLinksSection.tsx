"use client";

import { useState, useTransition } from "react";
import { addAssetLink, removeAssetLink } from "@/lib/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExternalLink, Trash2, Plus } from "lucide-react";
import type { AssetLink } from "@/lib/supabase/types";

export function AssetLinksSection({ projectId, links }: { projectId: string; links: AssetLink[] }) {
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      <ul className="space-y-1">
        {links.map((link, i) => (
          <li key={i} className="flex items-center justify-between gap-2 text-sm">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <ExternalLink className="size-3.5" />
              {link.label}
            </a>
            <Button
              variant="ghost"
              size="icon"
              disabled={isPending}
              onClick={() => startTransition(() => removeAssetLink(projectId, i, links))}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </li>
        ))}
        {links.length === 0 && <p className="text-sm text-muted-foreground">No linked files yet.</p>}
      </ul>
      <div className="flex gap-2">
        <Input placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} className="w-32" />
        <Input placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} className="flex-1" />
        <Button
          size="icon"
          variant="outline"
          disabled={!label || !url || isPending}
          onClick={() =>
            startTransition(async () => {
              await addAssetLink(projectId, { label, url }, links);
              setLabel("");
              setUrl("");
            })
          }
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  );
}
