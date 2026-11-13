import { Metadata } from 'next';
import CameraView from '@/app/ui/scan/scan';

export const metadata: Metadata = {
  title: 'Scan',
};

export default async function Page() {
  return (
    <div>
      <CameraView />
    </div>
  );
}