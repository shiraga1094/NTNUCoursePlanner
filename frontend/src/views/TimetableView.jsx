import { useMemo } from 'react'
import Timetable from '../ui/Timetable'
import { buildSchedule } from '../core/courseManager'
import useCourses from '../hooks/useCourses'

export default function TimetableView({ app }) {
  const courses = useCourses()

  const selectedCourses = useMemo(
    () => courses.filter(c => app.selectedIds.includes(c.id)),
    [courses, app.selectedIds]
  )

  const result = useMemo(
    () => buildSchedule(selectedCourses),
    [selectedCourses]
  )

  return (
    <div>
      <button onClick={app.toSelect}>← 返回選課</button>
      <Timetable result={result} />
    </div>
  )
}
