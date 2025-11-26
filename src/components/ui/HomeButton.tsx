"use client";

import { HiHomeModern } from "react-icons/hi2";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function HomeButton() {
  return (
    <Tooltip delayDuration={500}>
      <TooltipTrigger asChild>
        <Link href="/" aria-label="Home">
          <Button variant="ghost" size="icon" className="fixed top-4 left-4 z-50 cursor-pointer hover:scale-90 transition-transform duration-100 ease-out">
            <HiHomeModern className="size-6"/>
          </Button>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="start">
        <span>Home</span>
      </TooltipContent>
    </Tooltip>
  );
}