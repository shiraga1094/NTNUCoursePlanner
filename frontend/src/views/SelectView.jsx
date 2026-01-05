import CourseList from '../ui/CourseList'
import SelectedBar from '../ui/SelectedBar'
import useCourses from '../hooks/useCourses'

export default function SelectView({ app }) {
  const courses = useCourses()

  return (
    <div>
      <h1>選課</h1>

      <CourseList
        courses={courses}
        selectedIds={app.selectedIds}
        onToggle={app.toggleCourse}
      />

      <SelectedBar
        count={app.selectedIds.length}
        onNext={app.toTimetable}
      />
    </div>
  )
}
