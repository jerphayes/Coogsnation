import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, FileText, Shield, Users, AlertTriangle, Scale, Gavel, Eye, Database, Globe, Mail } from 'lucide-react';

export default function TermsOfUsePage() {
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="button-back">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2" data-testid="text-page-title">
                <FileText className="w-6 h-6" />
                Terms & Privacy
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                Please read our terms of service and privacy policy before using CoogsNation
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="terms" className="w-full">
          <TabsList className="grid w-full grid-cols-2" data-testid="tabs-navigation">
            <TabsTrigger value="terms" data-testid="tab-terms">Terms of Use</TabsTrigger>
            <TabsTrigger value="privacy" data-testid="tab-privacy">Privacy Policy</TabsTrigger>
          </TabsList>
          
          {/* Terms of Use Tab */}
          <TabsContent value="terms">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-uh-red">Terms of Use</CardTitle>
                <p className="text-sm text-gray-500 mb-4">
                  <strong>Last Updated:</strong> {currentDate}
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  Welcome to CoogsNation.com ("CoogsNation," "we," "our," or "us"). These Terms of Use ("Terms") govern your use of our website, mobile applications, and related features or services (collectively, the "Site"). By accessing or using the Site, you agree to these Terms and to our Privacy Policy. If you do not agree, you must not use the Site.
                </p>
              </CardHeader>
              <CardContent className="space-y-8">
                
                {/* Section 1 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                    <Shield className="w-5 h-5" />
                    1. Acceptance of Terms
                  </h3>
                  <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
                    <li>You must be at least 18 years old (or the age of majority in your jurisdiction) to use the Site. If you are under 13, you may not use the Site.</li>
                    <li>By using the Site, you represent that you have the legal capacity to agree to these Terms.</li>
                  </ul>
                </div>

                {/* Section 2 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    2. Changes to Terms
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    We may update or change these Terms at any time. Changes will be posted on this page. Your continued use of the Site after changes take effect constitutes acceptance of the revised Terms.
                  </p>
                </div>

                {/* Section 3 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                    <Users className="w-5 h-5" />
                    3. Accounts
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 mb-3">
                    Some features may require account creation. You agree to:
                  </p>
                  <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
                    <li>Provide accurate, current information.</li>
                    <li>Maintain the security of your login credentials.</li>
                    <li>Accept responsibility for all activity under your account.</li>
                    <li>Notify us immediately of unauthorized use.</li>
                  </ul>
                  <p className="text-gray-700 dark:text-gray-300 mt-3">
                    We reserve the right to suspend or terminate accounts that violate these Terms.
                  </p>
                </div>

                {/* Section 4 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    4. Permitted Use
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 mb-3">
                    You may use the Site for <strong>personal, educational, and community purposes</strong>. You agree not to:
                  </p>
                  <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
                    <li>Copy, distribute, or modify Site content without authorization.</li>
                    <li>Upload unlawful, defamatory, obscene, infringing, or otherwise objectionable content.</li>
                    <li>Harass, threaten, or mislead others.</li>
                    <li>Interfere with Site operation or attempt unauthorized access.</li>
                    <li>Use the Site for commercial solicitation without our express written approval.</li>
                  </ul>
                </div>

                {/* Section 5 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    5. User Submissions
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 mb-3">
                    By posting or submitting content (e.g., comments, posts, media):
                  </p>
                  <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
                    <li><strong>Ownership:</strong> You retain ownership of your content.</li>
                    <li><strong>License:</strong> You grant CoogsNation a perpetual, non-exclusive, royalty-free, worldwide license to display, store, publish, and distribute your content for Site operations.</li>
                    <li><strong>Representations:</strong> You represent that your content does not violate third-party rights (copyright, trademark, privacy, publicity, etc.) or applicable law.</li>
                    <li><strong>Moderation:</strong> We reserve the right to remove, edit, or restrict content at our sole discretion.</li>
                  </ul>
                </div>

                {/* Section 6 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    6. Intellectual Property
                  </h3>
                  <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
                    <li>Except for user submissions, all Site content (logos, graphics, designs, text, software) is owned by or licensed to CoogsNation and protected under copyright and trademark law.</li>
                    <li>You may not use our trademarks or proprietary content without prior written permission.</li>
                  </ul>
                </div>

                {/* Section 7 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    7. Third-Party Links
                  </h3>
                  <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
                    <li>The Site may link to third-party websites for convenience. These are provided <strong>as a courtesy</strong>.</li>
                    <li>We are <strong>not affiliated with and do not control</strong> these sites. We disclaim responsibility for their content, policies, or practices.</li>
                    <li>Your dealings with third parties are solely between you and them.</li>
                  </ul>
                </div>

                {/* Section 8 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5" />
                    8. Disclaimer of Warranties
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 mb-3">
                    The Site is provided <strong>"as is" and "as available"</strong> without warranties of any kind, whether express or implied. We do not warrant that:
                  </p>
                  <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
                    <li>The Site will be error-free or uninterrupted.</li>
                    <li>Defects will be corrected.</li>
                    <li>The Site is free of viruses or harmful components.</li>
                  </ul>
                </div>

                {/* Section 9 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    9. Limitation of Liability
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 mb-3">
                    To the fullest extent permitted by law, CoogsNation, its owners, affiliates, and staff are not liable for:
                  </p>
                  <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
                    <li>Indirect, incidental, or consequential damages.</li>
                    <li>Loss of data, profits, or business opportunities.</li>
                    <li>Content posted by users or third parties.</li>
                  </ul>
                </div>

                {/* Section 10 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    10. Indemnification
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 mb-3">
                    You agree to indemnify and hold harmless CoogsNation, its affiliates, staff, and partners from any claims, damages, liabilities, or expenses arising from:
                  </p>
                  <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
                    <li>Your use of the Site.</li>
                    <li>Your violation of these Terms.</li>
                    <li>Your violation of third-party rights.</li>
                  </ul>
                </div>

                {/* Section 11 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                    <Gavel className="w-5 h-5" />
                    11. Dispute Resolution
                  </h3>
                  <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
                    <li><strong>Informal Resolution First:</strong> Before filing any lawsuit, you must notify us in writing of your dispute and allow at least <strong>60 days</strong> for informal resolution.</li>
                    <li><strong>No Class Actions:</strong> You agree that disputes will be resolved individually and not as part of a class, collective, or representative action.</li>
                    <li><strong>Jury Trial Waiver:</strong> You knowingly waive the right to a jury trial to the fullest extent permitted by law.</li>
                  </ul>
                </div>

                {/* Section 12 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    12. Termination
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    We may suspend or terminate your access to the Site at any time, with or without notice, if we believe your conduct violates these Terms or harms the community. You may terminate your account by contacting us.
                  </p>
                </div>

                {/* Section 13 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                    <Scale className="w-5 h-5" />
                    13. Governing Law
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    These Terms are governed by the laws of the State of Texas, USA. All disputes shall be resolved exclusively in the state or federal courts located in <strong>Harris County, Texas</strong>.
                  </p>
                </div>

                {/* Section 14 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    14. Disclaimer of Affiliation
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    CoogsNation.com is an <strong>independent fan community</strong> and is <strong>not affiliated with the University of Houston, SIDEARM Sports, Learfield, or any third-party sites linked from this Site</strong>. All trademarks, logos, and content are the property of their respective owners.
                  </p>
                </div>

              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Policy Tab */}
          <TabsContent value="privacy">
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold text-uh-red">Privacy Policy</CardTitle>
                <p className="text-sm text-gray-500 mb-4">
                  <strong>Last Updated:</strong> {currentDate}
                </p>
                <p className="text-gray-600 dark:text-gray-400">
                  CoogsNation.com ("CoogsNation," "we," "our," or "us") respects your privacy. This Privacy Policy explains how we collect, use, and protect your information when you use our website, mobile applications, and related services (collectively, the "Site").
                </p>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                  By using the Site, you agree to this Privacy Policy. If you do not agree, please discontinue use of the Site.
                </p>
              </CardHeader>
              <CardContent className="space-y-8">
                
                {/* Section 1 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                    <Database className="w-5 h-5" />
                    1. Information We Collect
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 mb-3">
                    We may collect the following information when you use the Site:
                  </p>
                  <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
                    <li><strong>Personal Information:</strong> Information you provide directly, such as name, email address, or account login details.</li>
                    <li><strong>User Content:</strong> Posts, comments, or other materials you submit.</li>
                    <li><strong>Technical Data:</strong> IP address, browser type, device information, and cookies to improve performance and security.</li>
                    <li><strong>Usage Data:</strong> Pages visited, features used, and interaction with the Site.</li>
                  </ul>
                </div>

                {/* Section 2 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    2. How We Use Information
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 mb-3">
                    We use collected information to:
                  </p>
                  <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
                    <li>Provide and operate the Site.</li>
                    <li>Improve content, features, and user experience.</li>
                    <li>Communicate with you (e.g., updates, support, community notices).</li>
                    <li>Protect against fraud, abuse, or violations of our Terms of Use.</li>
                    <li>Comply with legal obligations.</li>
                  </ul>
                </div>

                {/* Section 3 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                    <Eye className="w-5 h-5" />
                    3. Cookies & Tracking
                  </h3>
                  <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
                    <li>We use cookies and similar technologies to enhance functionality, remember preferences, and analyze traffic.</li>
                    <li>You can disable cookies through your browser, but some features may not function properly.</li>
                  </ul>
                </div>

                {/* Section 4 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    4. Sharing of Information
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 mb-3">
                    We <strong>do not sell or rent</strong> your personal information. We may share information:
                  </p>
                  <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
                    <li>With trusted service providers (e.g., hosting, analytics) under confidentiality agreements.</li>
                    <li>To comply with legal requirements or protect rights, property, or safety.</li>
                    <li>In connection with a merger, acquisition, or transfer of assets.</li>
                  </ul>
                </div>

                {/* Section 5 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                    <Globe className="w-5 h-5" />
                    5. Third-Party Links
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    Our Site may contain links to third-party websites. We are not responsible for their content, policies, or practices. Please review their privacy policies separately.
                  </p>
                </div>

                {/* Section 6 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                    <Users className="w-5 h-5" />
                    6. User Content
                  </h3>
                  <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
                    <li>Content you post publicly (forums, comments, uploads) is visible to others and may be indexed by search engines.</li>
                    <li>We cannot control how third parties use information you voluntarily share publicly.</li>
                  </ul>
                </div>

                {/* Section 7 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                    <Shield className="w-5 h-5" />
                    7. Data Security
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    We use reasonable safeguards to protect your information. However, no system is 100% secure, and we cannot guarantee absolute security.
                  </p>
                </div>

                {/* Section 8 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5" />
                    8. Children's Privacy
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    Our Site is not directed to children under 13. We do not knowingly collect information from children. If you believe we have collected data from a child, please contact us and we will delete it.
                  </p>
                </div>

                {/* Section 9 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                    <Scale className="w-5 h-5" />
                    9. Your Rights
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 mb-3">
                    Depending on your jurisdiction (e.g., GDPR, CCPA):
                  </p>
                  <ul className="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">
                    <li>You may request access to, correction of, or deletion of your personal information.</li>
                    <li>You may opt out of certain communications.</li>
                    <li>To exercise these rights, contact us at: <strong>privacy@coogsnation.com</strong></li>
                  </ul>
                </div>

                {/* Section 10 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    10. Changes to This Policy
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    We may update this Privacy Policy from time to time. Updates will be posted on this page with a new "Last Updated" date. Continued use of the Site after updates means you accept the revised Policy.
                  </p>
                </div>

                {/* Section 11 */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                    <Mail className="w-5 h-5" />
                    11. Contact Us
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300">
                    If you have questions about this Privacy Policy, please contact us at:
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 mt-2">
                    📧 <strong>privacy@coogsnation.com</strong>
                  </p>
                </div>

              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}