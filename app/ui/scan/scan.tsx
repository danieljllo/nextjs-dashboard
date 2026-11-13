"use client";

import Image from 'next/image';
import { lusitana } from '@/app/ui/fonts';
import Search from '@/app/ui/search';
import {
  FormattedCustomersTable,
} from '@/app/lib/definitions';

import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/browser";
import { Result } from "@zxing/library";
import { Button } from '@/app/ui/button';
import { createBarrel } from '@/app/lib/actions';

// Aspect ratio and crop size factor
const DESIRED_CROP_ASPECT_RATIO = 1;
const CROP_SIZE_FACTOR = 0.4;

export default function CameraView() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const displayCroppedCanvasRef = useRef<HTMLCanvasElement>(null);
  const cropOverlayRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeResult, setQrCodeResult] = useState<string | null>(null);
  const codeReader = useRef(new BrowserQRCodeReader());

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play();
            intervalId = setInterval(captureFrameAndCrop, 100);
          };
        }
      } catch (err) {
        console.error("Camera error:", err);
        setError("Unable to access the camera. Please check permissions.");
      }
    };

    const captureFrameAndCrop = () => {
      if (!videoRef.current || !displayCroppedCanvasRef.current || !cropOverlayRef.current) return;

      const video = videoRef.current;
      const displayCanvas = displayCroppedCanvasRef.current;
      const displayContext = displayCanvas.getContext("2d");
      const overlayDiv = cropOverlayRef.current;

      if (!displayContext) return;

      const tempCanvas = document.createElement("canvas");
      const tempContext = tempCanvas.getContext("2d");
      if (!tempContext) return;

      tempCanvas.width = video.videoWidth;
      tempCanvas.height = video.videoHeight;
      tempContext.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);

      let cropWidth, cropHeight;
      const videoRatio = video.videoWidth / video.videoHeight;

      if (videoRatio / DESIRED_CROP_ASPECT_RATIO > 1) {
        cropHeight = video.videoHeight * CROP_SIZE_FACTOR;
        cropWidth = cropHeight * DESIRED_CROP_ASPECT_RATIO;
      } else {
        cropWidth = video.videoWidth * CROP_SIZE_FACTOR;
        cropHeight = cropWidth / DESIRED_CROP_ASPECT_RATIO;
      }

      cropWidth = Math.min(cropWidth, video.videoWidth);
      cropHeight = Math.min(cropHeight, video.videoHeight);

      const MIN_CROP_WIDTH = 240;
      const MAX_CROP_WIDTH = 600;
      const MIN_CROP_HEIGHT = 80;
      const MAX_CROP_HEIGHT = 400;

      cropWidth = Math.max(MIN_CROP_WIDTH, Math.min(MAX_CROP_WIDTH, cropWidth));
      cropHeight = Math.max(MIN_CROP_HEIGHT, Math.min(MAX_CROP_HEIGHT, cropHeight));



      const cropX = (video.videoWidth - cropWidth) / 2;
      const cropY = (video.videoHeight - cropHeight) / 2;

      displayCanvas.width = cropWidth;
      displayCanvas.height = cropHeight;

      displayContext.drawImage(
        tempCanvas,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight
      );

      overlayDiv.style.position = 'absolute';
      overlayDiv.style.left = `${(cropX / video.videoWidth) * 100}%`;
      overlayDiv.style.top = `${(cropY / video.videoHeight) * 100}%`;
      overlayDiv.style.width = `${(cropWidth / video.videoWidth) * 100}%`;
      overlayDiv.style.height = `${(cropHeight / video.videoHeight) * 100}%`;
      overlayDiv.style.border = '2px solid white';
      overlayDiv.style.borderRadius = '0.5rem';
      overlayDiv.style.pointerEvents = 'none';
      overlayDiv.style.boxSizing = 'border-box';

      const decodeCanvas = async () => {
        try {
          const result: Result = await codeReader.current.decodeFromCanvas(displayCanvas);
          console.log("Decoded QR code:", result.getText());
          setQrCodeResult(result.getText());
        } catch (err: unknown) {
           if (err instanceof Error && err.name !== "NotFoundException") {
                console.error("Decoding error:", err);
              }
        }
      };

      decodeCanvas(); // Call the async function
    };

    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      fontFamily: 'sans-serif'
    }}>
      <h1 className={`${lusitana.className} mb-8 text-xl md:text-2xl`}>
        Scan QR Code
      </h1>
{/*       <h2 style={{
        fontSize: '1.5rem',
        fontWeight: 'bold',
        color: '#1f2937'
      }}>
        Camera View for QR Code Scanning
      </h2> */}

      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: '400px',
        overflow: 'hidden',
      }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover'
          }}
        />
        <div
          ref={cropOverlayRef}
        ></div>
      </div>

      {error && <p style={{ color: '#ef4444', marginTop: '1rem', fontSize: '0.875rem' }}>{error}</p>}

      <p style={{
        color: '#4b5563',
        fontSize: '0.875rem',
        textAlign: 'center'
      }}>
        Camera active. The white border indicates the QR code scanning area.
      </p>

      <h3 style={{
        fontSize: '1.25rem',
        fontWeight: 'semibold',
        color: '#1f2937'
      }}>
        Cropped QR Code Scan Area:
      </h3>

      <canvas
        ref={displayCroppedCanvasRef}
        style={{
          border: '2px solid #3b82f6',
          borderRadius: '0.5rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
          maxWidth: '100%',
          height: 'auto',
          display: 'block',
          minWidth: '240px',
          minHeight: '80px'
        }}
      >
        Your browser does not support the canvas element.
      </canvas>

      <p style={{
        color: '#9ca3af',
        fontSize: '0.75rem',
      }}>
        This canvas updates every 0.1 seconds with the focused area.
      </p>
        <div style={{
          padding: '1rem',
          border: '2px dashed #10b981',
          borderRadius: '0.5rem',
          backgroundColor: '#ecfdf5',
          color: '#065f46',
          fontSize: '1rem',
          fontWeight: '500',
          textAlign: 'center'
        }}>
          ✅ QR Code: {qrCodeResult}
        </div>
        <div>
          <Button
                onClick={(event) => {
                  event.stopPropagation();
                  if (qrCodeResult != null) {
                    createBarrel(qrCodeResult);
                  }
                }}
          >
            Add Barrel from QR
          </Button>
        </div>
    </div>
  );
}

//export default async function ScanTable({
export async function ScanTable({
  customers,
}: {
  customers: FormattedCustomersTable[];
}) {
  return (
    <div className="w-full">
      <h1 className={`${lusitana.className} mb-8 text-xl md:text-2xl`}>
        Scan QR Code
      </h1>
      <Search placeholder="Search customers..." />
      <div className="mt-6 flow-root">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden rounded-md bg-gray-50 p-2 md:pt-0">
              <div className="md:hidden">
                {customers?.map((customer) => (
                  <div
                    key={customer.id}
                    className="mb-2 w-full rounded-md bg-white p-4"
                  >
                    <div className="flex items-center justify-between border-b pb-4">
                      <div>
                        <div className="mb-2 flex items-center">
                          <div className="flex items-center gap-3">
                            <Image
                              src={customer.image_url}
                              className="rounded-full"
                              alt={`${customer.name}'s profile picture`}
                              width={28}
                              height={28}
                            />
                            <p>{customer.name}</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-500">
                          {customer.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex w-full items-center justify-between border-b py-5">
                      <div className="flex w-1/2 flex-col">
                        <p className="text-xs">Pending</p>
                        <p className="font-medium">{customer.total_pending}</p>
                      </div>
                      <div className="flex w-1/2 flex-col">
                        <p className="text-xs">Paid</p>
                        <p className="font-medium">{customer.total_paid}</p>
                      </div>
                    </div>
                    <div className="pt-4 text-sm">
                      <p>{customer.total_invoices} invoices</p>
                    </div>
                  </div>
                ))}
              </div>
              <table className="hidden min-w-full rounded-md text-gray-900 md:table">
                <thead className="rounded-md bg-gray-50 text-left text-sm font-normal">
                  <tr>
                    <th scope="col" className="px-4 py-5 font-medium sm:pl-6">
                      Name
                    </th>
                    <th scope="col" className="px-3 py-5 font-medium">
                      Email
                    </th>
                    <th scope="col" className="px-3 py-5 font-medium">
                      Total Invoices
                    </th>
                    <th scope="col" className="px-3 py-5 font-medium">
                      Total Pending
                    </th>
                    <th scope="col" className="px-4 py-5 font-medium">
                      Total Paid
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 text-gray-900">
                  {customers.map((customer) => (
                    <tr key={customer.id} className="group">
                      <td className="whitespace-nowrap bg-white py-5 pl-4 pr-3 text-sm text-black group-first-of-type:rounded-md group-last-of-type:rounded-md sm:pl-6">
                        <div className="flex items-center gap-3">
                          <Image
                            src={customer.image_url}
                            className="rounded-full"
                            alt={`${customer.name}'s profile picture`}
                            width={28}
                            height={28}
                          />
                          <p><b>{customer.name}</b></p>
                        </div>
                      </td>
                      <td className="whitespace-nowrap bg-white px-4 py-5 text-sm">
                        {customer.email}
                      </td>
                      <td className="whitespace-nowrap bg-white px-4 py-5 text-sm">
                        {customer.total_invoices}
                      </td>
                      <td className="whitespace-nowrap bg-white px-4 py-5 text-sm">
                        {customer.total_pending}
                      </td>
                      <td className="whitespace-nowrap bg-white px-4 py-5 text-sm group-first-of-type:rounded-md group-last-of-type:rounded-md">
                        {customer.total_paid}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
