'use client';

import {useState, useRef, useEffect } from "react";
import { TiInfo } from "react-icons/ti";
import './css/MetaData.css'

const defaultAttributes = [
    "long_name",
    "description",
    "units",
    "_ARRAY_DIMENSIONS"
]

const Metadata = ({ data }: { data: Record<string, any> }) => {
    const [showAll, setShowAll] = useState<boolean>(false)
    const [isVisible, setIsVisible] = useState<boolean>(false)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsVisible(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    const handleIconClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        setIsVisible(!isVisible)
    }

    return (
        <div className="metadata-container" ref={containerRef}>
            <div 
                className="metadata-icon"
                onMouseEnter={() => setIsVisible(true)}
                onClick={handleIconClick}
            >
                <TiInfo size={32} />
            </div>
            {isVisible && (
                <div 
                    className="metadata"
                    onMouseEnter={() => setIsVisible(true)}
                    onMouseLeave={() => setIsVisible(false)}
                >
                    {defaultAttributes.map((value)=>(
                        data[value] && (
                        <p key={value}>
                            <strong>{value}: </strong>{String(data[value])}
                        </p>)
                    ))}
                    {showAll && <>
                    {Object.entries(data).map(([key, value]) => (
                        !defaultAttributes.includes(key) && (<p key={key}>
                        <strong>{key}:</strong> {String(value)}
                        </p>)
                    ))}</>}
                    <button className="button" onClick={()=>setShowAll(x=>!x)}>{showAll ? "Hide" : "Show"} Extra </button>
                </div>
            )}
        </div>
    );
};

export default Metadata;