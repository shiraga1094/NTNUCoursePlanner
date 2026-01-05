import CourseCard from './CourseCard'

export default function CourseList({ courses, selectedIds, onToggle }) {
  return (
    <div>
      {courses.map(c => (
        <CourseCard
          key={c.id}
          course={c}
          selected={selectedIds.includes(c.id)}
          onToggle={() => onToggle(c.id)}
        />
      ))}
    </div>
  )
}
