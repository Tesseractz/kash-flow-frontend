import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from './ui/Button'
import { Input } from './ui/Input'
import { Card, CardContent } from './ui/Card'
import { Camera, X, Keyboard, QrCode, Barcode as BarcodeIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { BarcodeAPI } from '../api/client'

export default function BarcodeScanner({ onProductFound, onClose }) {
  const [mode, setMode] = useState('keyboard') // 'keyboard' | 'camera'
  const [manualCode, setManualCode] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const inputRef = useRef(null)

  // Focus input on mount
  useEffect(() => {
    if (mode === 'keyboard' && inputRef.current) {
      inputRef.current.focus()
    }
  }, [mode])

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  const lookupBarcode = useCallback(async (code) => {
    if (!code || isSearching) return
    
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

  const startCamera = async () => {
    setCameraError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setMode('camera')
      
      // Start scanning loop
      requestAnimationFrame(scanFrame)
    } catch (error) {
      console.error('Camera error:', error)
      setCameraError('Could not access camera. Please check permissions.')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setMode('keyboard')
  }

  const scanFrame = useCallback(() => {
    if (mode !== 'camera' || !videoRef.current || !canvasRef.current) return
    
    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0)
      
      // Note: In a real implementation, you would use a barcode detection library
      // like @nicolo-ribaudo/chokidar-cli or quagga2
      // For now, this is a placeholder for the camera UI
    }
    
    if (mode === 'camera') {
      requestAnimationFrame(scanFrame)
    }
  }, [mode])

  // Handle barcode scanner input (USB scanners typically send keystrokes followed by Enter)
  useEffect(() => {
    let barcodeBuffer = ''
    let lastKeyTime = 0
    
    const handleKeyPress = (e) => {
      const currentTime = Date.now()
      
      // If more than 100ms since last keystroke, reset buffer
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
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            Barcode Scanner
          </h3>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-4">
          <Button
            variant={mode === 'keyboard' ? 'default' : 'outline'}
            size="sm"
            onClick={() => {
              stopCamera()
              setMode('keyboard')
            }}
            className="flex-1"
          >
            <Keyboard className="w-4 h-4 mr-2" />
            Manual / Scanner
          </Button>
          <Button
            variant={mode === 'camera' ? 'default' : 'outline'}
            size="sm"
            onClick={startCamera}
            className="flex-1"
          >
            <Camera className="w-4 h-4 mr-2" />
            Camera
          </Button>
        </div>

        {mode === 'keyboard' ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
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
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-center">
              <BarcodeIcon className="w-16 h-16 mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-500">
                USB barcode scanners will automatically input
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {cameraError ? (
              <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-4 rounded-lg text-center">
                <p>{cameraError}</p>
                <Button variant="outline" size="sm" onClick={() => setMode('keyboard')} className="mt-2">
                  Use Manual Entry
                </Button>
              </div>
            ) : (
              <>
                <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  {/* Scan area overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-64 h-32 border-2 border-white/50 rounded-lg">
                      <div className="w-full h-0.5 bg-red-500 animate-scan" />
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-500 text-center">
                  Position barcode within the frame
                </p>
                <Button variant="outline" onClick={stopCamera} className="w-full">
                  Stop Camera
                </Button>
              </>
            )}
          </div>
        )}

        <style jsx>{`
          @keyframes scan {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(120px); }
          }
          .animate-scan {
            animation: scan 2s ease-in-out infinite;
          }
        `}</style>
      </CardContent>
    </Card>
  )
}
