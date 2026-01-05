import clsx from 'clsx'

export default function CourseCard({ course, selected, onToggle }) {
  return (
    <div
      className={clsx('course-card', { selected })}
      onClick={onToggle}
    >
      <div>{course.name}</div>
      <div>{course.teacher}</div>
      <div>{course.timeRaw}</div>
    </div>
  )
}
