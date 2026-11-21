import React from 'react'
import {ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger} from "@/components/ui/context-menu";
import {TbKeyframeFilled} from "react-icons/tb";
import { useImageExportStore } from '@/stores/ImageExportStore';
export const KeyFrameMarker = ({ frame, frames, currentFrame }: { frame: number; frames: number; currentFrame: number }) => {
    const setCurrentFrame = useImageExportStore(state => state.setCurrentFrame);
    const removeKeyFrame = useImageExportStore(state => state.removeKeyFrame);
    const percent = ((frame - 1 )/(frames - 1)) * 100; 
    const selected = frame === currentFrame;
    const thumbRadius = (8 + 8) //Thumbradius plus padding
    return (
        <ContextMenu>
            <ContextMenuTrigger>
                <TbKeyframeFilled
                    className={`kf-marker ${selected ? 'kf-marker-selected' : ''}`}
                    key={frame}
                    style={{
                        position: "absolute",
                        left: `calc(${percent}% + ${thumbRadius}px - ${thumbRadius * 2 * percent / 100}px)`,
                        top:0,
                        transform:`translate(-50%, -50%) scale(${selected ? 1.33 : 1})`,
                        zIndex: 0, 
                        cursor:"pointer",
                        visibility:percent <= 100 ? "visible" : "hidden"
                    }}
                    color='orangered'
                    size={18}
                    onClick={()=>setCurrentFrame(frame)}
                />
            </ContextMenuTrigger>
            <ContextMenuContent>
                <ContextMenuItem>Edit</ContextMenuItem>
                <ContextMenuItem
                    variant="destructive"
                    onClick={() => removeKeyFrame(frame)}
                >Delete</ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    )
}
