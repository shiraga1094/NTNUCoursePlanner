import { useAppState } from './state'
import SelectView from './views/SelectView'
import TimetableView from './views/TimetableView'

export default function App() {
  const app = useAppState()

  return app.mode === 'select'
    ? <SelectView app={app} />
    : <TimetableView app={app} />
}
