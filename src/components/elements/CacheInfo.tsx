"use client";
import { Button } from "@/components/ui/button-enhanced";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { useCacheStore } from "@/stores/CacheStore";
import { useCallback, useEffect, useState } from "react";
import { TbDatabase, TbTrash } from "react-icons/tb";
import { formatBytes } from "@/data/zarr/utils";

const CacheInfo = () => {
    const cache = useCacheStore(s => s.cache);
    const maxSize = useCacheStore(s => s.maxSize);
    const clearCache = useCacheStore(s => s.clearCache);
    const [open, setOpen] = useState(false);
    const [stats, setStats] = useState({ items: 0, used: 0 });

    const refresh = useCallback(() => {
        setStats({ items: cache.size, used: cache.volume });
    }, [cache]);

    useEffect(() => {
        if (!open) return;
        refresh();
        const id = setInterval(refresh, 1000);
        return () => clearInterval(id);
    }, [open, refresh]);

    const percent = maxSize > 0 ? Math.min(100, (stats.used / maxSize) * 100) : 0;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="cursor-pointer w-full justify-start gap-2 text-xs text-muted-foreground"
                >
                    <TbDatabase className="size-4" />
                    Cache
                </Button>
            </PopoverTrigger>
            <PopoverContent data-meta-popover className="w-56 p-3">
                <div className="flex flex-col gap-2 text-sm">
                    <div className="font-medium">Cache</div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Items</span>
                        <span>{stats.items}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Used</span>
                        <span>{formatBytes(stats.used)} / {formatBytes(maxSize)}</span>
                    </div>
                    <Progress value={percent} />
                    <Button
                        variant="outline"
                        size="sm"
                        className="cursor-pointer mt-1 gap-2"
                        disabled={stats.items === 0}
                        onClick={() => {
                            clearCache();
                            refresh();
                        }}
                    >
                        <TbTrash className="size-4" />
                        Clear cache
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default CacheInfo;
