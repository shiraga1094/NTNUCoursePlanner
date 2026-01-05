export default function Timetable({ result }) {
  return (
    <pre>
      {JSON.stringify(result, null, 2)}
    </pre>
  )
}
