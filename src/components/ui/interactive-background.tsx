import { useState, useEffect, useRef, useCallback } from 'react'
import { FlickeringGrid } from '@/components/magicui/flickering-grid'

interface InteractiveBackgroundProps {
  children: React.ReactNode
}

export function InteractiveBackground({ children }: InteractiveBackgroundProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)
  const lastUpdateRef = useRef<number>(0)

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const now = Date.now()
    // Throttle to 60fps max (16ms)
    if (now - lastUpdateRef.current < 16) return
    
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100
      
      setMousePosition({ x, y })
      lastUpdateRef.current = now
    }
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (container) {
      container.addEventListener('mousemove', handleMouseMove, { passive: true })
      return () => {
        container.removeEventListener('mousemove', handleMouseMove)
      }
    }
  }, [handleMouseMove])

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-background relative overflow-hidden"
    >
      <FlickeringGrid 
        squareSize={4}
        gridGap={6}
        flickerChance={mousePosition.x > 0 || mousePosition.y > 0 ? 0.3 : 0.15} // Slightly reduced flickering
        color="rgb(148, 163, 184)" // slate-400
        maxOpacity={0.12} // Much less opaque
        className="absolute inset-0"
      />
      
      {/* Interactive glow effect */}
      <div 
        className="absolute pointer-events-none transition-all duration-400 ease-out"
        style={{
          left: `${mousePosition.x}%`,
          top: `${mousePosition.y}%`,
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(148, 163, 184, 0.025) 0%, transparent 70%)', // Much less opaque glow
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          opacity: mousePosition.x > 0 || mousePosition.y > 0 ? 1 : 0,
        }}
      />
      
      {children}
    </div>
  )
}