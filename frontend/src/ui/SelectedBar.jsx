export default function SelectedBar({ count, onNext }) {
  if (count === 0) return null

  return (
    <button onClick={onNext}>
      查看課表（{count}）
    </button>
  )
}
