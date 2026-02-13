import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

interface QRScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export function QRScanner({ onScan, onClose }: QRScannerProps) {
  const scannerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerIdRef = useRef(`qr-reader-${Math.random().toString(36).substr(2, 9)}`);
  const onScanRef = useRef(onScan);

  // Update the ref when onScan changes
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const stopScanning = useCallback(async () => {
    if (html5QrCodeRef.current) {
      try {
        const isScanning = html5QrCodeRef.current.getState() === 2; // 2 = SCANNING
        if (isScanning) {
          await html5QrCodeRef.current.stop();
          await html5QrCodeRef.current.clear();
        }
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
      html5QrCodeRef.current = null;
      setScanning(false);
    }
  }, []);

  useEffect(() => {
    if (!scannerRef.current) return;

    let isMounted = true;
    let scannerInstance: Html5Qrcode | null = null;

    const initializeScanner = async () => {
      // First, stop any existing scanner
      if (html5QrCodeRef.current) {
        try {
          const state = html5QrCodeRef.current.getState();
          if (state === 2) { // SCANNING
            await html5QrCodeRef.current.stop();
            await html5QrCodeRef.current.clear();
          }
        } catch (err) {
          console.error("Error stopping existing scanner:", err);
        }
        html5QrCodeRef.current = null;
      }

      if (!isMounted || !scannerRef.current) return;

      // Clear the container completely
      const container = scannerRef.current;
      container.innerHTML = '';
      container.id = scannerIdRef.current;

      // Create new scanner instance
      scannerInstance = new Html5Qrcode(scannerIdRef.current);
      html5QrCodeRef.current = scannerInstance;

      try {
        await scannerInstance.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            disableFlip: false,
            // Support QR code format (can contain URLs, codes, or any text)
            // QR_CODE format supports full URLs without any prefixes
            formatsToSupport: [
              Html5QrcodeSupportedFormats.QR_CODE,
            ],
          },
          (decodedText) => {
            if (isMounted) {
              // Pass the complete scanned text without any modifications
              onScanRef.current(decodedText);
              // Stop scanning after successful scan
              if (scannerInstance) {
                scannerInstance.stop().catch(console.error);
                scannerInstance.clear();
              }
            }
          },
          (errorMessage) => {
            // Ignore scanning errors, just keep scanning
            // Only log if it's a significant error
            if (errorMessage && !errorMessage.includes('NotFoundException')) {
              console.debug("QR Scanner:", errorMessage);
            }
          }
        );
        
        if (isMounted) {
          setScanning(true);
          setError(null);
          
          // Hide duplicate video/canvas elements that html5-qrcode might create
          const hideDuplicates = () => {
            if (!isMounted) return;
            const container = document.getElementById(scannerIdRef.current);
            if (container) {
              // Hide all but the first video element
              const videos = container.querySelectorAll('video');
              videos.forEach((video, index) => {
                if (index > 0) {
                  (video as HTMLElement).style.display = 'none';
                }
              });
              
              // Hide all but the first canvas element
              const canvases = container.querySelectorAll('canvas');
              canvases.forEach((canvas, index) => {
                if (index > 0) {
                  (canvas as HTMLElement).style.display = 'none';
                }
              });
            }
          };
          
          // Run immediately and also after delays to catch any late-rendered elements
          setTimeout(hideDuplicates, 100);
          setTimeout(hideDuplicates, 500);
        }
      } catch (err: any) {
        console.error("QR Scanner error:", err);
        if (isMounted) {
          setError(err.message || "Failed to start camera. Please check camera permissions.");
          setScanning(false);
        }
      }
    };

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      initializeScanner();
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      if (scannerInstance) {
        scannerInstance.stop().catch(console.error);
        scannerInstance.clear();
      }
      if (html5QrCodeRef.current) {
        html5QrCodeRef.current.stop().catch(console.error);
        html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
      }
    };
  }, []); // Empty dependency array - only run once when component mounts

  return (
    <>
      <style>{`
        #${scannerIdRef.current} video:nth-of-type(n+2),
        #${scannerIdRef.current} canvas:nth-of-type(n+2) {
          display: none !important;
        }
        #${scannerIdRef.current} > div:nth-of-type(n+2) {
          display: none !important;
        }
      `}</style>
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-6 max-w-md w-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-heading text-textDark">Scan QR Code</h2>
            <button
              onClick={() => {
                stopScanning();
                onClose();
              }}
              className="text-textLight hover:text-textDark text-2xl"
            >
              ×
            </button>
          </div>
          
          {error ? (
            <div className="text-center py-8">
              <p className="text-body text-textMedium mb-4">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  window.location.reload();
                }}
                className="px-4 py-2 bg-gold text-white rounded-lg"
              >
                Retry
              </button>
            </div>
          ) : (
            <div 
              ref={scannerRef} 
              className="w-full" 
              style={{ 
                minHeight: "300px",
                position: "relative",
                overflow: "hidden"
              }}
            />
          )}
          
          <p className="text-sm text-textLight text-center mt-4">
            Point your camera at a QR code to scan
          </p>
        </div>
      </div>
    </>
  );
}
