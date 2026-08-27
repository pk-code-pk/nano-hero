import { lazy, Suspense } from 'react';
import Site from './Site';
import { CAPTURE } from './renderClock';

// only the offline frame grabber loads this, and it drags in three.js
const CaptureStage = lazy(() => import('./CaptureStage'));

export default function App() {
  if (CAPTURE) {
    return (
      <Suspense fallback={null}>
        <CaptureStage />
      </Suspense>
    );
  }
  return <Site />;
}
