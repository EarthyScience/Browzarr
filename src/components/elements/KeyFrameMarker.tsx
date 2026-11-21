import React from 'react'
import {ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger} from "@/components/ui/context-menu";
import {TbKeyframeFilled} from "react-icons/tb";
import { useImageExportStore } from '@/stores/ImageExportStore';
export const KeyFrameMarker = ({ frame, frames, currentFrame }: { frame: number; frames: number; currentFrame: number }) => {
    const setCurrentFrame = useImageExportStore(state => state.setCurrentFrame);
    const removeKeyFrame = useImageExportStore(state => state.removeKeyFrame);
    const thumbRadius = 8 + 8; //Thumbradius plus padding
    const percent = ((frame - 1 )/(frames - 1)) * 100; 
    const selected = frame === currentFrame;
    return (
        <ContextMenu>
            <ContextMenuTrigger>
                <TbKeyframeFilled
                    key={frame}
                    style={{
                        position: "absolute",
                        left: `calc(${percent}% + ${thumbRadius}px - ${thumbRadius * 2 * percent / 100}px)`,
                        top:0,
                        transform:"translate(-50%, -50%)",
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
                    onClick={() => removeKeyFrame(frame)}
                >Delete</ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    )
}
