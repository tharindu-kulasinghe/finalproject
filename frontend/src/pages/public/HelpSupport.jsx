import { useState } from 'react';
import { HelpCircle, MessageSquare, Phone, Mail, MapPin, Clock, ChevronRight, FileText, Shield, AlertTriangle } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

const faqData = [
{
  category: 'General',
  questions: [
  { q: 'What is IECMS?', a: 'IECMS (Integrated Excise Control Management System) is a comprehensive platform for managing excise tax stamps, licenses, and compliance for alcohol and tobacco products.' },
  { q: 'How do I verify a stamp?', a: 'Visit the Verify Stamp page and either scan the QR code using your camera or manually enter the stamp code.' },
  { q: 'What is an excise stamp?', a: 'An excise stamp is a government-mandated marker applied to alcohol and tobacco products to indicate that applicable taxes have been paid.' }]

},
{
  category: 'Licensing',
  questions: [
  { q: 'How do I apply for a manufacturing license?', a: 'Click on "Apply for License" from the home page, select Manufacturing, and fill out the application form with your business details.' },
  { q: 'How long does license approval take?', a: 'License applications are typically reviewed within 30 days. You can check your application status using the License Status page.' },
  { q: 'What documents are required?', a: 'Required documents include business registration, tax identification, premises layout, and relevant industry certifications.' }]

},
{
  category: 'Payments',
  questions: [
  { q: 'How do I pay excise taxes?', a: 'Navigate to Tax Payments from the home page, declare your production, and make the payment through the secure online portal.' },
  { q: 'What payment methods are accepted?', a: 'We accept bank transfers, credit/debit cards, and online banking through secure payment gateways.' }]

},
{
  category: 'Compliance',
  questions: [
  { q: 'What are the penalties for non-compliance?', a: 'Penalties vary based on the violation and may include fines, license suspension, or criminal prosecution.' },
  { q: 'How do I report a violation?', a: 'Contact the Excise Department directly or use the Compliance page to report suspicious activities.' }]

}];


const HelpSupport = () => {
  const [openFaq, setOpenFaq] = useState(null);
  const [activeCategory, setActiveCategory] = useState('General');

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Help & Support"
        description="Frequently asked questions and support information" />
      

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {}
        <div className="lg:col-span-1">
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h3>
            <div className="space-y-2">
              <a href="#faq" className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 text-gray-700">
                <HelpCircle className="h-4 w-4" />
                <span>FAQs</span>
              </a>
              <a href="#contact" className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 text-gray-700">
                <Phone className="h-4 w-4" />
                <span>Contact Us</span>
              </a>
              <a href="#feedback" className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 text-gray-700">
                <MessageSquare className="h-4 w-4" />
                <span>Send Feedback</span>
              </a>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mt-6 mb-4">Contact Information</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Phone className="h-4 w-4 text-gray-500 mt-0.5" />
                <div>
                  <p className="font-medium">Hotline</p>
                  <p className="text-gray-500">+94 11 2 123 456</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-gray-500 mt-0.5" />
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-gray-500">support@excise.gov.lk</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 text-gray-500 mt-0.5" />
                <div>
                  <p className="font-medium">Working Hours</p>
                  <p className="text-gray-500">Mon-Fri: 8:30 AM - 4:30 PM</p>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {}
        <div className="lg:col-span-2">
          <Card id="faq">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Frequently Asked Questions</h3>
            
            {}
            <div className="flex flex-wrap gap-2 mb-4">
              {faqData.map((cat) =>
              <button
                key={cat.category}
                onClick={() => setActiveCategory(cat.category)}
                className={`px-3 py-1.5 text-sm rounded-full border ${
                activeCategory === cat.category ?
                'bg-gray-900 text-white border-gray-900' :
                'bg-white text-gray-700 border-gray-300 hover:border-gray-400'}`
                }>
                
                  {cat.category}
                </button>
              )}
            </div>

            {}
            <div className="space-y-3">
              {faqData.
              filter((cat) => cat.category === activeCategory).
              flatMap((cat) => cat.questions).
              map((item, index) =>
              <div key={index} className="border border-gray-200">
                    <button
                  onClick={() => toggleFaq(index)}
                  className="w-full flex items-center justify-between p-4 text-left">
                  
                      <span className="font-medium text-gray-900">{item.q}</span>
                      <ChevronRight className={`h-5 w-5 text-gray-400 transition-transform ${openFaq === index ? 'rotate-90' : ''}`} />
                    </button>
                    {openFaq === index &&
                <div className="px-4 pb-4 text-sm text-gray-600">
                        {item.a}
                      </div>
                }
                  </div>
              )}
            </div>
          </Card>

          {}
          <Card id="feedback" className="mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Send Us Your Feedback</h3>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Email</label>
                <input type="email" className="w-full px-3 py-2 border border-gray-300" placeholder="your@email.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                <textarea className="w-full px-3 py-2 border border-gray-300" rows={4} placeholder="How can we help you?"></textarea>
              </div>
              <Button>Submit Feedback</Button>
            </form>
          </Card>
        </div>
      </div>
    </div>);

};

export default HelpSupport;