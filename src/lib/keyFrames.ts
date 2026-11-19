import * as THREE from 'three'
import { lerp } from 'three/src/math/MathUtils.js';
import { deg2rad } from '@/lib/helpers';
import { usePlotStore } from '@/stores/PlotStore';
import { useGlobalStore } from '@/stores/GlobalStore';
import { useImageExportStore } from '@/stores/ImageExportStore';

type KeyFrameMap = Map<number, any>

export interface AnimationPlan {
    frames: number
    keyFrames: KeyFrameMap | undefined
    keyFrameList: number[]
    orbit: boolean
    orbitDeg: number
    orbitDir: boolean
    useTime: boolean
    timeRatio: number
    timeFrames: number
    loopTime: boolean
    baseAnimProg: number
    orbitOrigin: { radius: number, angle: number, y: number }
}

// Keyframes loaded from JSON hold plain objects instead of Vector3/Euler instances
const toVector3 = (v: any) => new THREE.Vector3(v?.x ?? 0, v?.y ?? 0, v?.z ?? 0)
const toEuler = (e: any) => e instanceof THREE.Euler
    ? e.clone()
    : new THREE.Euler(e?._x ?? e?.x ?? 0, e?._y ?? e?.y ?? 0, e?._z ?? e?.z ?? 0, e?._order ?? e?.order ?? 'XYZ')

export function getSortedKeyFrames(keyFrames?: KeyFrameMap): number[] {
    return keyFrames ? Array.from(keyFrames.keys()).sort((a, b) => a - b) : []
}

export function lerpValue(source: any, target: any, alpha: number): any {
    if (typeof source === 'number' && typeof target === 'number') {
        return lerp(source, target, alpha)
    }
    if (Array.isArray(source) && Array.isArray(target) && source.length === target.length) {
        return source.map((s, i) => lerpValue(s, target[i], alpha))
    }
    // Vector3, Color, or other lerpable objects
    if (typeof source?.lerp === 'function' && target != null) {
        return source.clone().lerp(target, alpha)
    }
    // Non-lerpable values (strings, booleans, null) switch once the target keyframe is reached
    return alpha < 1 ? source : target
}

export function interpolateKeyFrames(keyFrames: KeyFrameMap, keyFrameList: number[], frame: number) {
    if (keyFrameList.length === 0) return null
    const idx = Math.max(keyFrameList.findLastIndex(n => n <= frame), 0)
    const startFrame = keyFrameList[idx]
    const isLast = idx + 1 >= keyFrameList.length
    const endFrame = isLast ? startFrame : keyFrameList[idx + 1]
    const startState = keyFrames.get(startFrame)
    const endState = keyFrames.get(endFrame)
    // Before the first keyframe / after the last one, hold that keyframe's state
    const alpha = isLast ? 0 : Math.min(Math.max(frame - startFrame, 0) / (endFrame - startFrame), 1)

    const visual: Record<string, any> = {}
    const startViz = startState?.visual ?? {}
    const endViz = endState?.visual ?? {}
    Object.keys(startViz).forEach(key => {
        visual[key] = lerpValue(startViz[key], endViz[key], alpha)
    })

    const time = typeof startState?.time === 'number' && typeof endState?.time === 'number'
        ? lerp(startState.time, endState.time, alpha)
        : undefined

    let position: THREE.Vector3 | undefined
    let rotation: THREE.Euler | undefined
    if (startState?.camera?.position && endState?.camera?.position) {
        position = toVector3(startState.camera.position).lerp(toVector3(endState.camera.position), alpha)
    }
    if (startState?.camera?.rotation && endState?.camera?.rotation) {
        const startQuat = new THREE.Quaternion().setFromEuler(toEuler(startState.camera.rotation))
        const endQuat = new THREE.Quaternion().setFromEuler(toEuler(endState.camera.rotation))
        rotation = new THREE.Euler().setFromQuaternion(startQuat.slerp(endQuat, alpha))
    }
    return { visual, time, position, rotation }
}

export function getTimeProgress(frame: number, baseProg: number, timeRatio: number, timeFrames: number, loopTime: boolean) {
    const dt = 1 / Math.max(timeFrames || 1, 1)
    const prog = baseProg + dt * Math.floor((frame - 1) * timeRatio)
    return loopTime ? prog - Math.floor(prog) : Math.min(prog, 1)
}

export function getOrbitOrigin(position: { x: number, y: number, z: number }) {
    return {
        radius: Math.sqrt(position.x ** 2 + position.z ** 2),
        angle: Math.atan2(position.x, position.z),
        y: position.y,
    }
}

export function applyOrbit(camera: THREE.Camera, plan: AnimationPlan, frame: number) {
    const { orbitOrigin, frames, orbitDeg, orbitDir } = plan
    // Last frame stops one step short so a 360° orbit loops seamlessly
    const angle = ((frame - 1) / frames) * deg2rad(orbitDeg)
    const newAngle = orbitOrigin.angle + (orbitDir ? -angle : angle)
    camera.position.set(
        orbitOrigin.radius * Math.sin(newAngle),
        orbitOrigin.y,
        orbitOrigin.radius * Math.cos(newAngle)
    )
    camera.lookAt(0, 0, 0)
}

// Snapshot all animation settings. If keyframes exist, the first keyframe defines the starting
// time and orbit origin; otherwise the current time and camera position are used.
export function createAnimationPlan(camera: THREE.Camera): AnimationPlan {
    const { keyFrames, frames, orbit, orbitDeg, orbitDir, useTime, timeRate, frameRate, loopTime } = useImageExportStore.getState()
    const { dataShape } = useGlobalStore.getState()
    const keyFrameList = getSortedKeyFrames(keyFrames)
    const firstState = keyFrameList.length ? keyFrames?.get(keyFrameList[0]) : undefined
    const baseAnimProg = typeof firstState?.time === 'number' ? firstState.time : usePlotStore.getState().animProg
    const originPos = firstState?.camera?.position ? toVector3(firstState.camera.position) : camera.position
    return {
        frames,
        keyFrames,
        keyFrameList,
        orbit,
        orbitDeg,
        orbitDir,
        useTime,
        timeRatio: timeRate / frameRate,
        timeFrames: dataShape[dataShape.length - 3],
        loopTime,
        baseAnimProg,
        orbitOrigin: getOrbitOrigin(originPos),
    }
}

// Apply keyframes, time and orbit for one frame. The caller is responsible for rendering.
export function applyAnimationFrame(plan: AnimationPlan, frame: number, camera: THREE.Camera) {
    const { setAnimProg } = usePlotStore.getState()
    const state = plan.keyFrames ? interpolateKeyFrames(plan.keyFrames, plan.keyFrameList, frame) : null
    if (state) {
        usePlotStore.setState(state.visual)
        if (!plan.useTime && state.time !== undefined) setAnimProg(state.time) // Animate Time overrides keyframed time
        if (!plan.orbit) { // Orbit overrides keyframed camera
            if (state.position) camera.position.copy(state.position)
            if (state.rotation) camera.rotation.copy(state.rotation)
        }
    }
    if (plan.useTime) {
        setAnimProg(getTimeProgress(frame, plan.baseAnimProg, plan.timeRatio, plan.timeFrames, plan.loopTime))
    }
    if (plan.orbit) {
        applyOrbit(camera, plan, frame)
    }
}
