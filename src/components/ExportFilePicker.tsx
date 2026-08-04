import { useRef } from 'react'

interface ExportFilePickerProps {
  disabled: boolean
  label: string
  onSelectFile: (file: File) => void
}

export function ExportFilePicker({ disabled, label, onSelectFile }: ExportFilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <>
      <button
        className={'secondary-action-button export-file-button'}
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
      >
        {label}
      </button>

      <input
        ref={inputRef}
        hidden
        accept=".json,application/json"
        type="file"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0]

          event.currentTarget.value = ''

          if (file) {
            onSelectFile(file)
          }
        }}
      />
    </>
  )
}
