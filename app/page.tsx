import { Suspense } from 'react';
import ChatShell from './ChatShell';

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ChatShell />
    </Suspense>
  );
}