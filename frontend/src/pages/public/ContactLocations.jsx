import { useState } from 'react';
import { MapPin, Phone, Mail, Clock, ChevronRight, Building2, FileText } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

const offices = [
{
  region: 'Western Province',
  name: 'Head Office - Colombo',
  address: 'No. 123, Ministry Lane, Colombo 01',
  phone: '+94 11 2 123 456',
  fax: '+94 11 2 123 457',
  email: 'colombo@excise.gov.lk',
  hours: 'Mon-Fri: 8:30 AM - 4:30 PM',
  services: ['License Processing', 'Stamp Issuance', 'Payment Collection', 'Complaint Handling']
},
{
  region: 'Western Province',
  name: 'Regional Office - Kalutara',
  address: 'No. 45, Galle Road, Kalutara',
  phone: '+94 34 2 222 345',
  fax: '+94 34 2 222 346',
  email: 'kalutara@excise.gov.lk',
  hours: 'Mon-Fri: 8:30 AM - 4:30 PM',
  services: ['License Processing', 'Stamp Issuance', 'Payment Collection']
},
{
  region: 'Southern Province',
  name: 'Regional Office - Galle',
  address: 'No. 78, Matara Road, Galle',
  phone: '+94 91 2 234 567',
  fax: '+94 91 2 234 568',
  email: 'galle@excise.gov.lk',
  hours: 'Mon-Fri: 8:30 AM - 4:30 PM',
  services: ['License Processing', 'Stamp Issuance', 'Payment Collection']
},
{
  region: 'Central Province',
  name: 'Regional Office - Kandy',
  address: 'No. 12, Dalada Veediya, Kandy',
  phone: '+94 81 2 345 678',
  fax: '+94 81 2 345 679',
  email: 'kandy@excise.gov.lk',
  hours: 'Mon-Fri: 8:30 AM - 4:30 PM',
  services: ['License Processing', 'Stamp Issuance', 'Payment Collection']
},
{
  region: 'Northern Province',
  name: 'Regional Office - Jaffna',
  address: 'No. 56, Hospital Road, Jaffna',
  phone: '+94 21 2 456 789',
  fax: '+94 21 2 456 780',
  email: 'jaffna@excise.gov.lk',
  hours: 'Mon-Fri: 8:30 AM - 4:30 PM',
  services: ['License Processing', 'Stamp Issuance']
},
{
  region: 'Eastern Province',
  name: 'Regional Office - Trincomalee',
  address: 'No. 34, Main Street, Trincomalee',
  phone: '+94 26 2 567 890',
  fax: '+94 26 2 567 891',
  email: 'trincomalee@excise.gov.lk',
  hours: 'Mon-Fri: 8:30 AM - 4:30 PM',
  services: ['License Processing', 'Stamp Issuance']
},
{
  region: 'North Central Province',
  name: 'Regional Office - Anuradhapura',
  address: 'No. 89, Mihintale Road, Anuradhapura',
  phone: '+94 25 2 678 901',
  fax: '+94 25 2 678 902',
  email: 'anuradhapura@excise.gov.lk',
  hours: 'Mon-Fri: 8:30 AM - 4:30 PM',
  services: ['License Processing', 'Stamp Issuance']
},
{
  region: 'Sabaragamuwa Province',
  name: 'Regional Office - Ratnapura',
  address: 'No. 67, Mathara Road, Ratnapura',
  phone: '+94 45 2 789 012',
  fax: '+94 45 2 789 013',
  email: 'ratnapura@excise.gov.lk',
  hours: 'Mon-Fri: 8:30 AM - 4:30 PM',
  services: ['License Processing', 'Stamp Issuance']
}];


const ContactLocations = () => {
  const [selectedOffice, setSelectedOffice] = useState(null);
  const [filter, setFilter] = useState('all');

  const groupedOffices = offices.reduce((acc, office) => {
    if (!acc[office.region]) {
      acc[office.region] = [];
    }
    acc[office.region].push(office);
    return acc;
  }, {});

  const regions = ['all', ...Object.keys(groupedOffices)];

  const filteredGrouped = filter === 'all' ?
  groupedOffices :
  { [filter]: groupedOffices[filter] };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <PageHeader
        title="Contact & Office Locations"
        description="Find excise offices across Sri Lanka" />
      

      {}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center">
              <Phone className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Hotline</p>
              <p className="font-semibold text-gray-900">+94 11 2 123 456</p>
            </div>
          </div>
        </div>
        <div className="border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center">
              <Mail className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="font-semibold text-gray-900">info@excise.gov.lk</p>
            </div>
          </div>
        </div>
        <div className="border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Working Hours</p>
              <p className="font-semibold text-gray-900">Mon-Fri: 8:30 AM - 4:30 PM</p>
            </div>
          </div>
        </div>
      </div>

      {}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {regions.map((region) =>
          <button
            key={region}
            onClick={() => setFilter(region)}
            className={`px-3 py-1.5 text-sm rounded border ${
            filter === region ?
            'bg-gray-900 text-white border-gray-900' :
            'bg-white text-gray-700 border-gray-300 hover:border-gray-400'}`
            }>
            
              {region === 'all' ? 'All Regions' : region}
            </button>
          )}
        </div>
      </div>

      {}
      {Object.entries(filteredGrouped).map(([region, regionOffices]) =>
      <div key={region} className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {region}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {regionOffices.map((office, index) =>
          <div
            key={index}
            className="border border-gray-200 bg-white p-4 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelectedOffice(office)}>
            
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 className="h-4 w-4 text-gray-400" />
                      <h3 className="font-semibold text-gray-900">{office.name}</h3>
                    </div>
                    <p className="text-sm text-gray-500">{office.address}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span>{office.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="truncate">{office.email}</span>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {office.services.map((service, i) =>
              <span key={i} className="px-2 py-0.5 bg-gray-100 text-xs text-gray-600">
                      {service}
                    </span>
              )}
                </div>
              </div>
          )}
          </div>
        </div>
      )}

      {}
      {selectedOffice &&
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-gray-600" />
                  <h2 className="text-lg font-bold text-gray-900">{selectedOffice.name}</h2>
                </div>
                <button
                onClick={() => setSelectedOffice(null)}
                className="text-gray-400 hover:text-gray-600 text-xl">
                
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="text-gray-900">{selectedOffice.address}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="text-gray-900">{selectedOffice.phone}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Fax</p>
                    <p className="text-gray-900">{selectedOffice.fax}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="text-gray-900">{selectedOffice.email}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Working Hours</p>
                    <p className="text-gray-900">{selectedOffice.hours}</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-gray-500 mb-2">Services Available:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedOffice.services.map((service, i) =>
                  <span key={i} className="px-3 py-1 bg-gray-100 text-sm text-gray-700">
                        {service}
                      </span>
                  )}
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
                <Button onClick={() => setSelectedOffice(null)}>Close</Button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>);

};

export default ContactLocations;