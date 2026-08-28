import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { ArrowLeft, RotateCcw } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6 sm:py-12 px-4">
      <div className="max-w-3xl mx-auto w-full min-w-0">
        <div className="mb-8">
          <Link to="/auth">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>

        <Card>
          <CardContent className="p-4 sm:p-8 prose dark:prose-invert max-w-none">
            <div className="flex items-center gap-3 mb-6">
              <RotateCcw className="w-8 h-8 text-emerald-600 flex-shrink-0" />
              <h1 className="text-2xl sm:text-3xl font-bold m-0 break-words">
                Refund &amp; Cancellation Policy
              </h1>
            </div>

            <p className="text-sm text-gray-500">Last updated: August 28, 2026 | Version 1.0</p>

            <h2>1. Our pricing, in short</h2>
            <p>
              KashPoint is a monthly subscription of <strong>R150 per store</strong>. Every new
              store starts with a <strong>30-day free trial</strong> with full access — no card
              details are required to start the trial, so you can evaluate everything before
              paying anything.
            </p>

            <h2>2. Cancelling your subscription</h2>
            <ul>
              <li>You can cancel at any time from <strong>Billing</strong> inside the app, or by
                contacting us — no notice period, no cancellation fee.</li>
              <li>When you cancel, your subscription stays active until the end of the period you
                have already paid for, and you will not be charged again.</li>
              <li>Your data remains yours. After cancellation you can still export your sales and
                product data, and you may request full deletion at any time under our Privacy
                Policy.</li>
            </ul>

            <h2>3. Refunds</h2>
            <ul>
              <li><strong>Billing errors:</strong> if you were charged in error — a duplicate
                charge, a charge after cancellation, or an incorrect amount — we refund it in
                full, no questions asked.</li>
              <li><strong>Not satisfied:</strong> if you are unhappy with the Service, contact us
                within <strong>7 days</strong> of a monthly charge and we will refund that
                month's payment in full.</li>
              <li><strong>Service failure:</strong> if a fault on our side made the Service
                materially unusable for a sustained period, we will refund or credit the affected
                period.</li>
            </ul>
            <p>
              Approved refunds are processed through Paystack, our payment provider, back to your
              original payment method, normally within <strong>5–10 business days</strong>.
            </p>

            <h2>4. How to request a refund or raise a dispute</h2>
            <ol>
              <li>Contact us by email at <strong>support@kashpoint.co.za</strong> or on WhatsApp
                at <strong>061&nbsp;412&nbsp;1089</strong>, with the email address of your
                KashPoint account.</li>
              <li>We acknowledge every request within <strong>2 business days</strong>.</li>
              <li>If we cannot resolve the matter directly, you retain every right you have under
                the South African Consumer Protection Act and through your card issuer's dispute
                process.</li>
            </ol>

            <h2>5. Free trial</h2>
            <p>
              The 30-day trial is free and does not convert into a paid subscription by itself —
              you are only ever charged after you explicitly subscribe through our payment page.
              Because of this, trial periods themselves are not refundable (there is nothing to
              refund).
            </p>

            <h2>6. Contact</h2>
            <p>
              <strong>Email:</strong> support@kashpoint.co.za
              <br />
              <strong>WhatsApp:</strong> 061 412 1089
              <br />
              <strong>Website:</strong> https://kashpoint.co.za
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
