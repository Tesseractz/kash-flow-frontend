import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { ArrowLeft, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Terms() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link to="/auth">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>

        <Card>
          <CardContent className="p-8 prose dark:prose-invert max-w-none">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold m-0">Terms of Service</h1>
            </div>
            
            <p className="text-sm text-gray-500">
              Last updated: January 1, 2026 | Version 1.0
            </p>

            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing and using Kash-Flow ("the Service"), you accept and agree to be bound by 
              the terms and conditions outlined in this agreement. If you do not agree to these terms, 
              please do not use our Service.
            </p>

            <h2>2. Description of Service</h2>
            <p>
              Kash-Flow is a point-of-sale (POS) software solution that enables businesses to manage 
              sales, inventory, employees, and reporting. The Service may include various features 
              based on your subscription plan.
            </p>

            <h2>3. User Accounts</h2>
            <ul>
              <li>You must provide accurate and complete registration information</li>
              <li>You are responsible for maintaining the security of your account credentials</li>
              <li>You must notify us immediately of any unauthorized access</li>
              <li>You are responsible for all activities under your account</li>
            </ul>

            <h2>4. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul>
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to any systems</li>
              <li>Interfere with or disrupt the Service or servers</li>
              <li>Upload malicious code or content</li>
              <li>Resell or redistribute the Service without permission</li>
            </ul>

            <h2>5. Payment Terms</h2>
            <ul>
              <li>Subscription fees are billed in advance on a monthly basis</li>
              <li>All payments are non-refundable unless otherwise specified</li>
              <li>We reserve the right to modify pricing with 30 days notice</li>
              <li>Failure to pay may result in suspension of services</li>
            </ul>

            <h2>6. Data Ownership</h2>
            <ul>
              <li>You retain ownership of all data you upload to the Service</li>
              <li>We do not claim ownership of your business data</li>
              <li>You grant us a license to process your data to provide the Service</li>
              <li>You can export or delete your data at any time</li>
            </ul>

            <h2>7. Service Availability</h2>
            <p>
              We strive for 99.9% uptime but do not guarantee uninterrupted access. We may perform 
              scheduled maintenance with advance notice. We are not liable for any downtime or 
              service interruptions.
            </p>

            <h2>8. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by law, Kash-Flow shall not be liable for any indirect, 
              incidental, special, consequential, or punitive damages, including loss of profits, 
              data, or business opportunities.
            </p>

            <h2>9. Termination</h2>
            <ul>
              <li>You may terminate your account at any time</li>
              <li>We may terminate or suspend accounts for violations of these terms</li>
              <li>Upon termination, you may request export of your data within 30 days</li>
            </ul>

            <h2>10. Changes to Terms</h2>
            <p>
              We may update these terms from time to time. We will notify you of significant changes 
              via email or through the Service. Continued use after changes constitutes acceptance.
            </p>

            <h2>11. Governing Law</h2>
            <p>
              These terms are governed by the laws of South Africa. Any disputes shall be resolved 
              in the courts of South Africa.
            </p>

            <h2>12. Contact</h2>
            <p>
              For questions about these Terms, please contact us at:
              <br />
              <strong>Email:</strong> legal@kash-flow.com
              <br />
              <strong>Address:</strong> [Your Business Address]
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
