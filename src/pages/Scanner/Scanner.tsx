import React, { useEffect } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';
import './Scanner.css'; // Import your CSS file

interface ContainerProps {
  name: string;
}

const Scanner: React.FC<ContainerProps> = ({ name }) => {
  const myWebSite = 'https://sabotage-e6488.web.app/'

  useEffect(() => {
    const onScanSuccess = (decodedText: string, decodedResult: any) => {
      window.location.href = `${myWebSite}${decodedText}`;
    };

    const onScanError = (errorMessage: string) => {
      console.error(`QR Code scan error: ${errorMessage}`);
    };

    const config = {
      fps: 10,
      qrbox: 250,
      scanType: Html5QrcodeScanType.SCAN_TYPE_CAMERA,
    };

    const scanner = new Html5QrcodeScanner('qr-reader', config, false);
    scanner.render(onScanSuccess, onScanError);

    return () => {
      scanner.clear();
    };
  }, []);

  return (
    <div id="container">
      <div id="qr-reader"></div>
    </div>
  );
};

export default Scanner;
