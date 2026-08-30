import React from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;

};

export const KeyFramesHelper = ({open, onOpenChange} : Props) => {

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>
                    Keyframe Editor Guide
                </DialogTitle>
            </DialogHeader>
            <p>
                Browzarr's keyframe system works a little differently than tools like Blender — there's no right-click-to-insert-keyframe on individual properties. 
                Instead, <b>Add Keyframe</b> captures the <i>entire current state</i> (camera, visuals, and any other animatable settings) as a single snapshot.
            </p>
            <h1><u>The Basics</u></h1>
            <ul>
                <li><b>Add Keyframe</b> — Records a snapshot of everything at its current state. Any change you've made since the last keyframe gets baked in.</li>
                <li><b>Click a keyframe</b> — Jumps the scene to that keyframe's state.</li>
                <li><b>Double-click a keyframe</b> — Deletes it.</li>
                <li><b>Add Keyframe on existing keyframe</b> — Overwrites that keyframe with the current state.</li>
            </ul>
            <h1><u>Recommended Workflow</u></h1>
            Because every keyframe captures the full state at once, it helps to work in passes rather than tweaking everything at once:
            <ol>
                <li><b>Camera first</b>. Set up and keyframe all your camera movements before touching visuals. This locks in the "path" of the animation.</li>
                <li><b>Then visuals</b>. Once the larger camera motion is baked in, change the color, slicing, opacity where desired. </li>
            </ol>
            <span className='text-gray-500'>This system will be reworked in the future</span>
        </DialogContent>
    </Dialog>
  )
}
