'use client';

import { TiInfo } from "react-icons/ti";
import './css/MetaData.css'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import { Button } from "@/components/ui/button"

const defaultAttributes = [
    "long_name",
    "description",
    "units",
    "_ARRAY_DIMENSIONS"
]

const Metadata = ({ data }: { data: Record<string, any> }) => {
    return (
        <div className="metadata-container">
            <Dialog>
                <DialogTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-10 cursor-pointer"
                        tabIndex={0}
                        aria-label="Metadata information"
                        title="Metadata information"
                        >
                        <TiInfo className="size-8" />
                    </Button>
                </DialogTrigger>
                <DialogContent className="metadata-dialog">
                    <DialogHeader>
                        <DialogTitle>Variable Metadata</DialogTitle>
                        <DialogDescription>
                            Detailed information about the selected variable
                        </DialogDescription>
                    </DialogHeader>
                    <div className="metadata-content">
                        {/* Show default attributes first */}
                        {defaultAttributes.map((value) => (
                            data[value] && (
                                <p key={value}>
                                    <strong>{value}: </strong>{String(data[value])}
                                </p>
                            )
                        ))}
                        
                        {/* Show all other attributes */}
                        {Object.entries(data).map(([key, value]) => (
                            !defaultAttributes.includes(key) && (
                                <p key={key}>
                                    <strong>{key}:</strong> {String(value)}
                                </p>
                            )
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Metadata;