import { Directory } from './features/businesses/Directory.tsx';

// The main landmark lives in Directory, since the sticky header sits outside it (spec 003 AC-1.4).
export function App() {
  return <Directory />;
}
