import * as React from "react"
import { GripVertical } from "lucide-react"
import { cn } from "../../lib/utils"

const SplitPane = React.forwardRef(({ className, children, ...props }, ref) => {
  const [isDragging, setIsDragging] = React.useState(false)
  const [sizes, setSizes] = React.useState([])
  const splitPaneRef = React.useRef(null)
  const resizerRefs = React.useRef([])

  React.useEffect(() => {
    const childCount = React.Children.count(children)
    setSizes(new Array(childCount).fill(100 / childCount))
  }, [children])

  const startDragging = (index, e) => {
    e.preventDefault()
    setIsDragging(true)
    const startX = e.pageX
    const startSizes = [...sizes]
    const totalWidth = splitPaneRef.current?.offsetWidth || 0

    const handleMouseMove = (e) => {
      if (!isDragging) return

      const delta = e.pageX - startX
      const newSizes = [...startSizes]
      const deltaPercentage = (delta / totalWidth) * 100

      newSizes[index] = startSizes[index] + deltaPercentage
      newSizes[index + 1] = startSizes[index + 1] - deltaPercentage

      // Ensure minimum size of 10%
      if (newSizes[index] >= 10 && newSizes[index + 1] >= 10) {
        setSizes(newSizes)
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  return (
    <div
      ref={(el) => {
        splitPaneRef.current = el
        if (typeof ref === "function") ref(el)
        else if (ref) ref.current = el
      }}
      className={cn("flex h-full w-full", className)}
      {...props}
    >
      {React.Children.map(children, (child, index) => (
        <React.Fragment key={index}>
          <div
            className="relative"
            style={{ width: `${sizes[index]}%` }}
          >
            {child}
          </div>
          {index < React.Children.count(children) - 1 && (
            <div
              ref={(el) => (resizerRefs.current[index] = el)}
              className={cn(
                "relative z-10 w-2 cursor-col-resize select-none bg-border hover:bg-ring",
                isDragging && "bg-ring"
              )}
              onMouseDown={(e) => startDragging(index, e)}
            >
              <GripVertical className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  )
})
SplitPane.displayName = "SplitPane"

const SplitPanePanel = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("h-full w-full overflow-auto", className)}
    {...props}
  >
    {children}
  </div>
))
SplitPanePanel.displayName = "SplitPanePanel"

export { SplitPane, SplitPanePanel } 