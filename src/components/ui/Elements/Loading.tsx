import { useGlobalStore } from "@/GlobalStates"
import '../css/Loading.css'
import { useShallow } from "zustand/shallow"


export function Loading(){
  const {progress, status} = useGlobalStore(useShallow(state => ({
    progress: state.progress,
    status: state.status
  })))

    return (
      status && 
      <div className="loading-container">
      <div className='loading'>
        {status}
        </div>
      <div className="progress-bar"
        style={{
          width:`${progress}%`
        }}
      />
      </div>
    )
  }