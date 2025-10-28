import React from 'react'
import { Input } from '../input'


const LocalNetCDF = () => {

  return (
    <div>
        <Input type="file" id="filepicker"
          className='hover:drop-shadow-md hover:scale-[110%]'
          style={{width:'200px', cursor:'pointer'}}
          // @ts-expect-error `webkitdirectory` is non-standard attribute. TS doesn't know about it. It's used for cross-browser compatibility.
          directory=''
          webkitdirectory='true'
          onChange={handleFileSelect}
        />
    </div>
  )
}

export default LocalNetCDF