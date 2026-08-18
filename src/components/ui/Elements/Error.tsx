import React from 'react'
import '../css/Error.css'
import { useErrorStore } from '@/GlobalStates/ErrorStore'
import { ErrorList } from './ErrorList'
import { useShallow } from 'zustand/shallow'
import { Button } from '@/components/ui'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

export const Error = () => {
    const {error, customError, setError, setCustomError} = useErrorStore(useShallow(s => s))
  return (
    <>
    {error && <Dialog open={true} onOpenChange={e=>setError(null)}>
        <DialogContent aria-describedby='Error Message' >
            <DialogTitle className="text-center text-lg font-semibold">
                Error: {ErrorList[error as keyof typeof ErrorList].title}
            </DialogTitle>
            <div className='error-message'>
                {ErrorList[error as keyof typeof ErrorList].description}
                {customError &&
                <div className='bg-red-50 p-2 mt-2 rounded-md border-solid border-1'>
                    {customError}
                </div>
                }
            </div>
            <div className='flex justify-center mt-[10px]'>
                <Button
                variant='pink'
                    className='cursor-pointer hover:scale-[1.1]'
                    onClick={e=>{setError(null); setCustomError(null)}}
                >
                Okay
                </Button>
            </div>
      </DialogContent>
    </Dialog>}
    </>
  )
}
