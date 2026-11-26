import React from 'react'

interface changedProps{
    visual: string[],
    camera: string[]
}
const KeyFrameTracks = ({changedStates, show}: {changedStates: Record<string, any>, show: boolean}) => {
    return (
        <div>KeyFrameTracks</div>
    )
}

export default KeyFrameTracks