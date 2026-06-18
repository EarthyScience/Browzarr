import { useShallow } from "zustand/shallow"
import { Field, FieldLabel } from "@/components/ui/field"
import { Progress } from "@/components/ui/progress"
import { useGlobalStore } from "@/GlobalStates/GlobalStore"

export function Loading() {
  const { progress, status } = useGlobalStore(useShallow(state => ({
    progress: state.progress,
    status: state.status
  })))

  if (!status) return null

  return (
    <div className="fixed top-32 sm:top-12 right-4 z-50 w-48 sm:w-72">
      <Field className="w-full">
        <FieldLabel htmlFor="progress-loading">
          <span>{status}</span>
          <span className="ml-auto">{progress}%</span>
        </FieldLabel>
        <Progress value={progress} id="progress-loading" />
      </Field>
    </div>
  )
}