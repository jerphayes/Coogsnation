import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { usePopper } from 'react-popper'

interface PopperDropdownProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: React.ReactNode
  children: React.ReactNode
}

export function PopperDropdown({ open, onOpenChange, trigger, children }: PopperDropdownProps) {
  const [referenceElement, setReferenceElement] = useState<HTMLDivElement | null>(null)
  const [popperElement, setPopperElement] = useState<HTMLDivElement | null>(null)
  
  const { styles, attributes } = usePopper(referenceElement, popperElement, {
    placement: 'bottom-start',
    modifiers: [
      {
        name: 'preventOverflow',
        options: {
          rootBoundary: 'viewport',
          padding: 8,
          altAxis: true,
          mainAxis: true,
        },
      },
      {
        name: 'flip',
        options: {
          fallbackPlacements: ['bottom-end', 'top-start', 'top-end'],
        },
      },
      {
        name: 'offset',
        options: {
          offset: [0, 8],
        },
      },
    ],
  })

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return

    const handleClickOutside = (event: MouseEvent) => {
      if (
        referenceElement &&
        popperElement &&
        !referenceElement.contains(event.target as Node) &&
        !popperElement.contains(event.target as Node)
      ) {
        onOpenChange(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, referenceElement, popperElement, onOpenChange])

  // Handle hover behavior with delays to prevent flickering
  const hoverTimeoutRef = useRef<NodeJS.Timeout>()
  
  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    onOpenChange(true)
  }

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      onOpenChange(false)
    }, 150)
  }

  return (
    <>
      <div
        ref={setReferenceElement}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative"
        style={{ overflow: 'visible' }}
      >
        {trigger}
      </div>

      {open && createPortal(
        <div
          ref={setPopperElement}
          style={{ 
            ...styles.popper,
            zIndex: 9999,
          }}
          {...attributes.popper}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="w-[280px] bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          {children}
        </div>,
        document.body
      )}
    </>
  )
}