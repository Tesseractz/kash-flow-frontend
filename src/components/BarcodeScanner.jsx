import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Card, CardContent } from './ui/Card'
import { Camera, X, Keyboard, QrCode, Barcode as BarcodeIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { BarcodeAPI } from '../api/client'

// Camera decoding uses the browser's built-in BarcodeDetector (Chrome/Edge/
// Android WebView). Where it's unavailable (Firefox/older Safari) the camera
// tab is hidden and manual/USB-scanner entry remains.
const CAN_DETECT = typeof window !== 'undefined' && 'BarcodeDetector' in window
const DETECT_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code']

export default function BarcodeScanner({ onProductFound, onClose }) {
  const [mode, setMode] = useState('keyboard') // 'keyboard' | 'camera'
  const [manualCode, setManualCode] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const inputRef = useRef(null)
  const detectorRef = useRef(null)
  const scanningRef = useRef(false)
  const lastScanRef = useRef({ code: '', at: 0 })

  // Focus input on mount
  useEffect(() => {
    if (mode === 'keyboard' && inputRef.current) {
      inputRef.current.focus()
    }
  }, [mode])

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      scanningRef.current = false
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const lookupBarcode = useCallback(async (code) => {
    if (!code || isSearching) return
    // Ignore a re-read of the same code within 2.5s (camera loops re-detect fast)
    const now = Date.now()
    if (lastScanRef.current.code === code && now - lastScanRef.current.at < 2500) return
    lastScanRef.current = { code, at: now }

    setIsSearching(true)
    try {
      const product = await BarcodeAPI.lookup(code)
      onProductFound(product)
      toast.success(`Found: ${product.name}`)
      setManualCode('')
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error('Product not found for this barcode')
      } else {
        toast.error('Failed to lookup barcode')
      }
    } finally {
      setIsSearching(false)
    }
  }, [isSearching, onProductFound])

  const handleManualSubmit = (e) => {
    e.preventDefault()
    if (manualCode.trim()) {
      lookupBarcode(manualCode.trim())
    }
  }

  const stopCamera = useCallback(() => {
    scanningRef.current = false
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setMode('keyboard')
  }, [])

  const startCamera = async () => {
    setCameraError(null)
    if (!CAN_DETECT) {
      setMode('camera')
      setCameraError('Camera scanning is not supported in this browser. Use manual entry or a USB scanner.')
      return
    }
    try {
      detectorRef.current =
        detectorRef.current || new window.BarcodeDetector({ formats: DETECT_FORMATS })
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setMode('camera')
      scanningRef.current = true
      scanLoop()
    } catch (error) {
      console.error('Camera error:', error)
      setMode('camera')
      setCameraError('Could not access camera. Please check permissions.')
    }
  }

  // Poll the video stream ~5x/sec; on a hit, look the code up.
  const scanLoop = useCallback(async () => {
    while (scanningRef.current) {
      const video = videoRef.current
      if (video && video.readyState === video.HAVE_ENOUGH_DATA && detectorRef.current) {
        try {
          const codes = await detectorRef.current.detect(video)
          if (codes.length > 0 && codes[0].rawValue) {
            lookupBarcode(codes[0].rawValue)
          }
        } catch {
          /* detection can throw transiently while the stream warms up */
        }
      }
      await new Promise((r) => setTimeout(r, 200))
    }
  }, [lookupBarcode])

  // USB/bluetooth scanner guns type the code rapidly and press Enter.
  useEffect(() => {
    let barcodeBuffer = ''
    let lastKeyTime = 0

    const handleKeyPress = (e) => {
      const currentTime = Date.now()
      if (currentTime - lastKeyTime > 100) {
        barcodeBuffer = ''
      }
      lastKeyTime = currentTime

      if (e.key === 'Enter' && barcodeBuffer.length > 3) {
        e.preventDefault()
        lookupBarcode(barcodeBuffer)
        barcodeBuffer = ''
      } else if (e.key.length === 1) {
        barcodeBuffer += e.key
      }
    }

    window.addEventListener('keypress', handleKeyPress)
    return () => window.removeEventListener('keypress', handleKeyPress)
  }, [lookupBarcode])

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-slate-800 dark:text-white">
            <QrCode className="w-5 h-5" />
            Barcode Scanner
          </h3>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close scanner">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Mode Toggle — camera tab only where the browser can actually decode */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={mode === 'keyboard' ? 'primary' : 'outline'}
            size="sm"
            onClick={stopCamera}
            className="flex-1"
          >
            <Keyboard className="w-4 h-4 mr-2" />
            Manual / Scanner
          </Button>
          {CAN_DETECT && (
            <Button
              variant={mode === 'camera' ? 'primary' : 'outline'}
              size="sm"
              onClick={startCamera}
              className="flex-1"
            >
              <Camera className="w-4 h-4 mr-2" />
              Camera
            </Button>
          )}
        </div>

        {mode === 'keyboard' ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Scan a barcode with your USB scanner, or enter manually:
            </p>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <Input
                ref={inputRef}
                placeholder="Enter barcode..."
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="flex-1"
                autoFocus
              />
              <Button type="submit" disabled={isSearching || !manualCode.trim()}>
                {isSearching ? 'Searching...' : 'Find'}
              </Button>
            </form>
            <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 text-center">
              <BarcodeIcon className="w-16 h-16 mx-auto text-slate-400 mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                USB barcode scanners will automatically input
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {cameraError ? (
              <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-4 rounded-xl text-center">
                <p>{cameraError}</p>
                <Button variant="outline" size="sm" onClick={stopCamera} className="mt-2">
                  Use Manual Entry
                </Button>
              </div>
            ) : (
              <>
                <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Scan area overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-64 h-32 border-2 border-white/50 rounded-lg overflow-hidden">
                      <div className="w-full h-0.5 bg-red-500 animate-scanline" />
                    </div>
                  </div>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
                  Position the barcode within the frame
                </p>
                <Button variant="outline" onClick={stopCamera} className="w-full">
                  Stop Camera
                </Button>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
