import { useState } from 'react'

export function useAppState() {
  const [mode, setMode] = useState('select') // 'select' | 'timetable'
  const [selectedIds, setSelectedIds] = useState([])

  function toggleCourse(id) {
    setSelectedIds(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    )
  }

  return {
    mode,
    selectedIds,
    toSelect: () => setMode('select'),
    toTimetable: () => setMode('timetable'),
    toggleCourse,
    setSelectedIds
  }
}
