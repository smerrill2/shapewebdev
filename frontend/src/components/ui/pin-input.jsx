import * as React from "react"
import { cn } from "../../lib/utils"

const PinInput = React.forwardRef(({ length = 4, onComplete, className, ...props }, ref) => {
  const [values, setValues] = React.useState(new Array(length).fill(""))
  const inputRefs = React.useRef([])

  React.useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length)
  }, [length])

  const focusInput = (index) => {
    if (inputRefs.current[index]) {
      inputRefs.current[index].focus()
    }
  }

  const handleChange = (index, e) => {
    const value = e.target.value
    if (isNaN(value)) return

    setValues((prevValues) => {
      const newValues = [...prevValues]
      newValues[index] = value.slice(-1)

      if (value && index < length - 1) {
        focusInput(index + 1)
      }

      if (newValues.every(val => val !== "") && onComplete) {
        onComplete(newValues.join(""))
      }

      return newValues
    })
  }

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !values[index] && index > 0) {
      focusInput(index - 1)
    } else if (e.key === "ArrowLeft" && index > 0) {
      focusInput(index - 1)
    } else if (e.key === "ArrowRight" && index < length - 1) {
      focusInput(index + 1)
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text/plain").slice(0, length)
    if (!/^\d+$/.test(pastedData)) return

    const newValues = [...values]
    pastedData.split("").forEach((value, i) => {
      newValues[i] = value
    })
    setValues(newValues)

    if (newValues.every(val => val !== "") && onComplete) {
      onComplete(newValues.join(""))
    }

    if (inputRefs.current[pastedData.length]) {
      focusInput(pastedData.length)
    }
  }

  return (
    <div className={cn("flex gap-2", className)} {...props}>
      {values.map((value, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={value}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className={cn(
            "h-10 w-10 rounded-md border border-input bg-background px-3 py-2 text-center text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        />
      ))}
    </div>
  )
})
PinInput.displayName = "PinInput"

export { PinInput } 