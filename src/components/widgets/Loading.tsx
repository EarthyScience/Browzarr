import { useShallow } from "zustand/shallow"
import { Field, FieldLabel } from "@/components/ui/field"
import { Progress } from "@/components/ui/progress"
import { useGlobalStore } from "@/stores/GlobalStore"
import { Loader2 } from "lucide-react"
export function Loading() {
  const { progress, status } = useGlobalStore(useShallow(s => ({
    progress: s.progress, status: s.status
  })))
  const showProgress = progress != undefined;
  if (status)return (
    <div className="fixed top-32 sm:top-12 right-4 z-50 w-48 sm:w-72">
      <Field className="w-full">
        <FieldLabel htmlFor="progress-loading">
          <span>{status}</span>
          <span className={`ml-auto ${showProgress ? '' : 'hidden'}`}>{progress}%</span>
          <Loader2 className={`w-4 h-4 animate-spin mr-2  ${showProgress ? 'hidden' : ''}`} />
        </FieldLabel>
        {showProgress && <Progress value={progress} id="progress-loading" />}
        
      </Field>
    </div>
  )
}