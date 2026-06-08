import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button-enhanced"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import Image from "next/image"
import { logoBGC_MPI } from "@/assets/index"
import { FaStar, FaGithub } from "react-icons/fa"

export function BrowZarrPopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="cursor-pointer font-medium text-muted-foreground hover:text-foreground transition"
        >
          browzarr.io
        </Button>
      </PopoverTrigger>

    <PopoverContent className="w-full max-w-sm md:max-w-md max-h-[80vh] p-6 rounded-2xl shadow-lg overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-semibold">Browzarr</h2>
          <span className="text-xs text-muted-foreground shrink-0">
            Ⓒ Apache License, Version 2.0
          </span>
        </div>

        <Separator className="my-1" />

       <div className="grid grid-cols-1 gap-6 my-3">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Browzarr is a powerful, browser-native framework for visualizing, exploring and analyzing <a className="font-bold text-orange-600">Zarr</a> stores and <a className="font-bold text-teal-600">NetCDF</a> datasets.
            </p>
          </div>

          <div className="space-y-4">
            <Link
              href="https://github.com/EarthyScience/Browzarr"
              target="_blank"
              className="w-full"
            >
              <Button className="w-full cursor-pointer" variant={"pink"}>
                <span className="flex items-center justify-center gap-2">
                  <FaGithub className="h-4 w-4" />
                  <FaStar className="h-4 w-4" /> 
                  Star us!
                </span>
              </Button>
            </Link>
          </div>
        </div>

        <Separator className="my-2" />
        <div className="text-xs text-muted-foreground space-y-3">
          <p>
            <span className="font-bold">Contact:</span>{" "}
            <a
              href="https://www.bgc-jena.mpg.de/person/jpoehls/2206"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              Jeran Poehls
            </a>{" "}
            &{" "}
            <a
              href="https://lazarusa.github.io/"
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
            >
              Lazaro Alonso
            </a>
          </p>

          <div className="space-y-2">
            <div>
              <div className="font-medium text-sm">
                Max-Planck Institute for Biogeochemistry
              </div>
              <div className="text-sm">Hans-Knöll Str. 10</div>
              <div className="text-sm">07745 Jena</div>
            </div>
            <a
              href="https://www.bgc-jena.mpg.de/en/bgi/mdi"
              target="_blank"
              rel="noreferrer"
              className="block"
            >
              <Image
                src={logoBGC_MPI}
                alt="MPI / BGC logo"
                width={180}
                className="object-contain filter invert-[0.5] dark:invert-0"
              />
            </a>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}